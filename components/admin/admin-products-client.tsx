"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Pencil, Trash2, X, Package, Filter, Beer, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useDebounce } from "@/hooks/use-debounce";

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  finalPrice: number;
  discount: number;
  brand?: string;
  volume?: string;
  alcoholContent?: string;
  stock: number;
  hidden: boolean;
  category: { id: string; name: string; slug: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const LIMIT = 30;

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), includeHidden: "true" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (catFilter) params.set("category", catFilter);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data?.products ?? []);
      setTotal(data?.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, catFilter, page]);

  useEffect(() => { setPage(1); }, [debouncedSearch, catFilter]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deletar "${name}"?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Produto deletado");
        loadProducts();
      } else {
        toast.error("Erro ao deletar");
      }
    } catch {
      toast.error("Erro ao deletar");
    } finally {
      setDeleting(null);
    }
  }

  async function toggleHidden(id: string, hidden: boolean) {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !hidden }),
      });
      if (res.ok) {
        toast.success(hidden ? "Produto exibido" : "Produto ocultado");
        loadProducts();
      }
    } catch {
      toast.error("Erro");
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 text-sm">{total} produtos no catálogo</p>
        </div>
        <Link
          href="/admin/produtos/novo"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novo Produto
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none min-w-[160px]"
          >
            <option value="">Todas categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Preço</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Estoque</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onDelete={handleDelete}
                    onToggleHidden={toggleHidden}
                    deleting={deleting === product.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  onDelete,
  onToggleHidden,
  deleting,
}: {
  product: Product;
  onDelete: (id: string, name: string) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
  deleting: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <tr className={`hover:bg-gray-50/50 transition-colors ${product.hidden ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0">
            {product.imageUrl && !imgError ? (
              <Image src={product.imageUrl} alt={product.name} fill className="object-contain rounded-lg p-1" onError={() => setImgError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Beer size={16} className="text-gray-300" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{product.name}</p>
            {product.brand && <p className="text-xs text-gray-500">{product.brand}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{product.category?.name}</span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm font-semibold text-orange-600">
          R$ {(product.finalPrice ?? product.price)?.toFixed(2).replace(".", ",")}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          (product.stock ?? 0) > 10 ? "bg-green-100 text-green-700" :
          (product.stock ?? 0) > 0 ? "bg-yellow-100 text-yellow-700" :
          "bg-red-100 text-red-700"
        }`}>
          {product.stock ?? 0} un
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onToggleHidden(product.id, product.hidden)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={product.hidden ? "Exibir" : "Ocultar"}
          >
            {product.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <Link
            href={`/admin/produtos/${product.id}`}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Pencil size={15} />
          </Link>
          <button
            onClick={() => onDelete(product.id, product.name)}
            disabled={deleting}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

