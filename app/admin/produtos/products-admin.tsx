'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Beer, Package, ShoppingCart, LogOut, Menu, X, Home, LayoutGrid, Plus, Search, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ProductsAdminProps {
  products: {
    id: string;
    name: string;
    imageUrl: string;
    price: number;
    finalPrice: number;
    categoryName: string;
    hidden: boolean;
  }[];
  categories: {
    id: string;
    name: string;
  }[];
}

export function ProductsAdmin({ products, categories }: ProductsAdminProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const toggleVisibility = async (productId: string, currentHidden: boolean) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !currentHidden }),
      });
      if (response?.ok) {
        toast.success(currentHidden ? 'Produto ativado' : 'Produto ocultado');
        router.refresh();
      }
    } catch (error) {
      toast.error('Erro ao atualizar produto');
    }
  };

  const filteredProducts = (products ?? [])?.filter?.((p) =>
    p?.name?.toLowerCase?.()?.includes?.(searchQuery?.toLowerCase?.() ?? '')
  );

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
            <h1 className="text-xl font-bold">Produtos</h1>
            <Link href="/admin/produtos/novo" className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold px-4 py-2 rounded-xl flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo
            </Link>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts?.map?.((product) => (
                    <tr key={product?.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image src={product?.imageUrl ?? ''} alt={product?.name ?? ''} fill className="object-contain p-1" />
                          </div>
                          <span className="font-medium text-sm">{product?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product?.categoryName}</td>
                      <td className="px-6 py-4 text-sm font-bold text-amber-600">R$ {(product?.finalPrice ?? 0)?.toFixed?.(2)?.replace?.('.', ',')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${product?.hidden ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {product?.hidden ? 'Oculto' : 'Ativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleVisibility(product?.id, product?.hidden)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title={product?.hidden ? 'Ativar' : 'Ocultar'}
                        >
                          {product?.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
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
