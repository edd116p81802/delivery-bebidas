"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Tags,
  TrendingUp,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface DashboardData {
  totalOrders: number;
  todayOrders: number;
  totalProducts: number;
  totalCategories: number;
  totalRevenue: number;
  todayRevenue: number;
  recentOrders: any[];
  ordersByStatus: Record<string, number>;
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/admin/dashboard");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: "Receita Total",
      value: `R$ ${(data?.totalRevenue ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: "bg-green-500",
    },
    {
      label: "Receita Hoje",
      value: `R$ ${(data?.todayRevenue ?? 0).toFixed(2)}`,
      icon: TrendingUp,
      color: "bg-blue-500",
    },
    {
      label: "Pedidos Hoje",
      value: data?.todayOrders ?? 0,
      icon: ShoppingBag,
      color: "bg-amber-500",
    },
    {
      label: "Total de Pedidos",
      value: data?.totalOrders ?? 0,
      icon: ShoppingBag,
      color: "bg-purple-500",
    },
    {
      label: "Produtos",
      value: data?.totalProducts ?? 0,
      icon: Package,
      color: "bg-pink-500",
    },
    {
      label: "Categorias",
      value: data?.totalCategories ?? 0,
      icon: Tags,
      color: "bg-indigo-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do seu negócio</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-sm"
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pedidos Recentes</h2>
          <Link
            href="/admin/pedidos"
            className="text-green-600 hover:text-green-700 font-medium flex items-center"
          >
            Ver todos <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="divide-y">
          {(data?.recentOrders ?? []).length > 0 ? (
            (data?.recentOrders ?? []).map((order: any) => (
              <div key={order?.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{order?.customerName ?? 'Cliente'}</p>
                  <p className="text-sm text-gray-500">
                    {order?.createdAt ? new Date(order.createdAt).toLocaleDateString("pt-BR") : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">R$ {(order?.total ?? 0).toFixed(2)}</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      order?.status === "DELIVERED"
                        ? "bg-green-100 text-green-700"
                        : order?.status === "PENDING"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {order?.status ?? 'PENDING'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum pedido recente</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
