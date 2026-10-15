'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Beer, Package, ShoppingCart, LogOut, Menu, X, Home, LayoutGrid, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface OrdersAdminProps {
  orders: {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    address: string;
    total: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
  }[];
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  CONFIRMED: 'Confirmado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export function OrdersAdmin({ orders }: OrdersAdminProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response?.ok) {
        toast.success('Status atualizado');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const menuItems = [
    { label: 'Dashboard', href: '/admin', icon: Home },
    { label: 'Produtos', href: '/admin/produtos', icon: Package },
    { label: 'Categorias', href: '/admin/categorias', icon: LayoutGrid },
    { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors w-full">
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-4 py-4 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Pedidos</h1>
            <div></div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(orders ?? [])?.map?.((order) => (
                    <tr key={order?.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm">{order?.customerName}</p>
                          <p className="text-xs text-gray-500">{order?.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-amber-600">R$ {(order?.total ?? 0)?.toFixed?.(2)?.replace?.('.', ',')}</td>
                      <td className="px-6 py-4 text-sm">{order?.paymentMethod?.toUpperCase?.()}</td>
                      <td className="px-6 py-4">
                        <select
                          value={order?.status}
                          onChange={(e) => updateStatus(order?.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors?.[order?.status] ?? 'bg-gray-100'}`}
                        >
                          {Object.entries(statusLabels)?.map?.(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(order?.createdAt ?? '')?.toLocaleDateString?.('pt-BR')}
                      </td>
                    </tr>
                  ))}
                  {(orders?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
