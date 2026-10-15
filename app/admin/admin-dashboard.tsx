'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Beer, Package, ShoppingCart, DollarSign, Users, Settings, LogOut, Menu, X, Home, LayoutGrid, Plus
} from 'lucide-react';

interface AdminDashboardProps {
  stats: {
    products: number;
    categories: number;
    orders: number;
    revenue: number;
  };
  recentOrders: {
    id: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
}

export function AdminDashboard({ stats, recentOrders }: AdminDashboardProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const statCards = [
    { label: 'Produtos', value: stats?.products ?? 0, icon: Package, color: 'bg-blue-500' },
    { label: 'Categorias', value: stats?.categories ?? 0, icon: LayoutGrid, color: 'bg-purple-500' },
    { label: 'Pedidos', value: stats?.orders ?? 0, icon: ShoppingCart, color: 'bg-green-500' },
    { label: 'Receita', value: `R$ ${(stats?.revenue ?? 0)?.toFixed?.(2)?.replace?.('.', ',')}`, icon: DollarSign, color: 'bg-amber-500' },
  ];

  const menuItems = [
    { label: 'Dashboard', href: '/admin', icon: Home },
    { label: 'Produtos', href: '/admin/produtos', icon: Package },
    { label: 'Categorias', href: '/admin/categorias', icon: LayoutGrid },
    { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#1a1a1a] z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center">
              <Beer className="w-5 h-5 text-gray-900" />
            </div>
            <span className="font-bold text-white">Zé Express</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems?.map?.((item) => (
            <Link
              key={item?.href}
              href={item?.href ?? ''}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <item.icon className="w-5 h-5" />
              {item?.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-4 py-4 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <Link href="/" className="text-amber-500 hover:text-amber-600 text-sm font-medium">
              Ver Loja →
            </Link>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards?.map?.((stat, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className={`w-12 h-12 ${stat?.color} rounded-xl flex items-center justify-center mb-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-gray-500 text-sm">{stat?.label}</p>
                <p className="text-2xl font-bold">{stat?.value}</p>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Pedidos Recentes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(recentOrders ?? [])?.map?.((order) => (
                    <tr key={order?.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{order?.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 font-bold">R$ {(order?.total ?? 0)?.toFixed?.(2)?.replace?.('.', ',')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order?.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                          order?.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {order?.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order?.createdAt ?? '')?.toLocaleDateString?.('pt-BR')}
                      </td>
                    </tr>
                  ))}
                  {(recentOrders?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        Nenhum pedido ainda
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
