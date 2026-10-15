"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beer, ShoppingBag, Zap, Wine, Snowflake, Flame, CupSoda, Cigarette, ShoppingCart, ShoppingBasket, GlassWater, type LucideProps } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductCard } from "./product-card";
import { DeliveryHeader } from "./delivery-header";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

const ICON_MAP: Record<string, LucideIcon> = {
  Beer, Wine, Zap, Snowflake, Flame, CupSoda, Cigarette, ShoppingCart, ShoppingBasket, GlassWater, ShoppingBag,
  Martini: Wine,
  Cake: ShoppingBag,
};

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  _count?: { products: number };
}

interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  price: number;
  finalPrice: number;
  discount: number;
  brand?: string;
  volume?: string;
  alcoholContent?: string;
  stock: number;
  featured: boolean;
  category: { id: string; name: string; slug: string };
}

export function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchText, 300);

  const LIMIT = 48;

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (selectedCat) params.set("category", selectedCat);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data?.products ?? []);
      setTotal(data?.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedCat, debouncedSearch, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedCat, debouncedSearch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function handleCatSelect(slug: string | null) {
    setSelectedCat(slug === selectedCat ? null : slug);
  }

  const currentCat = categories.find((c) => c.slug === selectedCat);
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Novo Header Preto com Endereço e Pesquisa */}
      <DeliveryHeader 
        searchText={searchText}
        onSearchChange={setSearchText}
      />

      {/* Category Pills */}
      <div className="bg-white border-b border-gray-100 sticky top-[108px] z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => handleCatSelect(null)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !selectedCat
                  ? "bg-amber-400 text-gray-900 shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => {
              const IconComp = ICON_MAP[cat.icon ?? ""] ?? Beer;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCatSelect(cat.slug)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCat === cat.slug
                      ? "bg-amber-400 text-gray-900 shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <IconComp size={13} />
                  {cat.name}
                  {cat._count?.products ? (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      selectedCat === cat.slug ? "bg-white/40 text-gray-900" : "bg-gray-200 text-gray-500"
                    }`}>
                      {cat._count.products}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {currentCat ? currentCat.name : debouncedSearch ? `Resultados para "${debouncedSearch}"` : "Catálogo"}
            </h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {total} produto{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Products Grid - estilo Zé: 2 produtos + 80% do próximo em mobile */}
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:overflow-visible">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[42%] sm:w-auto bg-white rounded-xl h-52 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Beer size={48} className="mb-3 opacity-30" />
            <p className="text-lg font-medium">Nenhum produto encontrado</p>
            <p className="text-sm">Tente outro filtro ou busca</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedCat}-${debouncedSearch}-${page}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:overflow-visible"
            >
              {products.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-[42%] sm:w-auto">
                  <ProductCard product={product} />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
