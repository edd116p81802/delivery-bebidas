"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Tag, Plus, Pencil, Trash2, Save, X, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  orderIndex: number;
  hidden: boolean;
  _count?: { products: number };
}

export function AdminCategoriasClient({ categories: initial }: { categories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initial);
  const [editing, setEditing] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!editing) return;
    setLoading(true);
    try {
      const url = editing.id === "new" ? "/api/categories" : `/api/categories/${editing.id}`;
      const method = editing.id === "new" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      const saved = await res.json();
      if (editing.id === "new") {
        setCategories((prev) => [...prev, saved]);
      } else {
        setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      }
      toast.success("Categoria salva!");
      setEditing(null);
    } catch {
      toast.error("Erro ao salvar categoria");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deletar esta categoria?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Categoria deletada");
    } catch {
      toast.error("Erro ao deletar");
    }
  }

  async function handleToggleHidden(cat: Category) {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !cat.hidden }),
      });
      if (!res.ok) throw new Error();
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, hidden: !c.hidden } : c));
      toast.success(cat.hidden ? "Categoria exibida" : "Categoria ocultada");
    } catch {
      toast.error("Erro");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-500 text-sm">{categories.length} categorias</p>
        </div>
        <button
          onClick={() => setEditing({ id: "new", name: "", slug: "", orderIndex: 999, hidden: false })}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editing.id === "new" ? "Nova Categoria" : "Editar Categoria"}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                <input
                  type="text"
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ícone (lucide-react)</label>
                <input
                  type="text"
                  value={editing.icon ?? ""}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                  placeholder="Ex: Beer, Wine, Zap"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ordem</label>
                <input
                  type="number"
                  value={editing.orderIndex}
                  onChange={(e) => setEditing({ ...editing, orderIndex: parseInt(e.target.value) || 999 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Salvar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoria</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Slug</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Ícone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Ordem</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map((cat) => (
              <tr key={cat.id} className={`hover:bg-gray-50/50 ${cat.hidden ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-orange-500" />
                    <span className="font-medium text-sm text-gray-900">{cat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs font-mono text-gray-500">{cat.slug}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs text-gray-500">{cat.icon ?? "-"}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs text-gray-500">{cat.orderIndex}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleToggleHidden(cat)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                      {cat.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button onClick={() => setEditing(cat)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
