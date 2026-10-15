"use client";

import { motion } from "framer-motion";
import { Package, Tag, TrendingUp, Plus, Beer } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  finalPrice: number;
  brand?: string;
  category: { name: string };
}

export function AdminDashboard({
  totalProducts,
  totalCategories,
  recentProducts,
}: {
  totalProducts: number;
  totalCategories: number;
  recentProducts: Product[];
}) {
  const stats = [
    { label: "Total de Produtos", value: totalProducts, icon: Package, color: "bg-blue-500" },
    { label: "Categorias", value: totalCategories, icon: Tag, color: "bg-green-500" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Visão geral do catálogo</p>
        </div>
        <Link
          href="/admin/produtos/novo"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novo Produto
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="text-white" size={22} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Produtos Recentes</h2>
          <Link href="/admin/produtos" className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1">
            Ver todos <TrendingUp size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {recentProducts.map((p) => (
            <RecentProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentProductCard({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  return (
    <Link
      href={`/admin/produtos/${product.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <div className="relative w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0">
        {product.imageUrl && !imgError ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain rounded-lg p-1"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Beer size={20} className="text-gray-300" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
        <p className="text-xs text-gray-500">{product.category?.name}</p>
        <p className="text-xs font-semibold text-orange-600">
          R$ {(product.finalPrice ?? product.price)?.toFixed(2).replace(".", ",")}
        </p>
      </div>
    </Link>
  );
}
