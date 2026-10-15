'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Beer, Package, ShoppingCart, LogOut, Menu, X, Home, LayoutGrid, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface CategoriesAdminProps {
  categories: {
    id: string;
    name: string;
    slug: string;
    orderIndex: number;
    hidden: boolean;
    productCount: number;
  }[];
}

export function CategoriesAdmin({ categories }: CategoriesAdminProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const toggleVisibility = async (categoryId: string, currentHidden: boolean) => {
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !currentHidden }),
      });
      if (response?.ok) {
        toast.success(currentHidden ? 'Categoria ativada' : 'Categoria ocultada');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao atualizar categoria');
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
            <h1 className="text-xl font-bold">Categorias</h1>
            <div></div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produtos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(categories ?? [])?.map?.((category) => (
                    <tr key={category?.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{category?.orderIndex}</td>
                      <td className="px-6 py-4 font-medium text-sm">{category?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{category?.slug}</td>
                      <td className="px-6 py-4 text-sm">{category?.productCount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${category?.hidden ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {category?.hidden ? 'Oculta' : 'Ativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleVisibility(category?.id, category?.hidden)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                        >
                          {category?.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
