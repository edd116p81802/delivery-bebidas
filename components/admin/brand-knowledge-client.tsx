"use client";

import { useState } from "react";
import { Brain, Search, Droplets, Tag, TrendingUp, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface Brand {
  id: string;
  brandName: string;
  displayName: string;
  alcoholContent?: string;
  category?: string;
  volume?: string;
  source: string;
  usageCount: number;
  confidence: number;
}

export function BrandKnowledgeClient({ brands: initial }: { brands: Brand[] }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const filtered = initial.filter((b) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      (b.displayName ?? "").toLowerCase().includes(q) ||
      (b.category ?? "").toLowerCase().includes(q)
    );
  });

  const sourceColors: Record<string, string> = {
    catalog: "bg-blue-100 text-blue-700",
    learned: "bg-green-100 text-green-700",
    manual: "bg-purple-100 text-purple-700",
    hardcoded: "bg-gray-100 text-gray-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base de Marcas</h1>
          <p className="text-gray-500 text-sm">{initial.length} marcas na base de conhecimento do OCR</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex items-start gap-3">
        <Brain className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-medium text-blue-800">Base de Conhecimento OCR</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Estas marcas são usadas pelo sistema de OCR para complementar automaticamente
            informações de teor alcoólico e categorias quando uma imagem é analisada.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Buscar marcas..."
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Marca</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Teor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Fonte</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Usos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((brand) => (
                <tr key={brand.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Brain size={14} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{brand.displayName}</p>
                        <p className="text-xs text-gray-400 font-mono">{brand.brandName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {brand.category ? (
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        <Tag size={12} />{brand.category}
                      </span>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {brand.alcoholContent ? (
                      <span className="flex items-center gap-1 text-xs text-blue-600">
                        <Droplets size={12} />{brand.alcoholContent}
                      </span>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceColors[brand.source] ?? "bg-gray-100 text-gray-600"}` }>
                      {brand.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <TrendingUp size={12} />{brand.usageCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-gray-400">
            <Brain size={36} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma marca encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
