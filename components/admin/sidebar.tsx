'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutDashboard, Package, FolderTree, Plus, Key, LogOut, ExternalLink, ShoppingBag, Settings, MessageSquare, Users, CreditCard, ShieldCheck } from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Clientes', href: '/admin/clientes' },
  { icon: CreditCard, label: 'Cartoes', href: '/admin/cartoes' },
  { icon: ShieldCheck, label: 'Codigo Verificacao', href: '/admin/codigo-verificacao' },
  { icon: Package, label: 'Produtos', href: '/admin/produtos' },
  { icon: Plus, label: 'Adicionar Produto', href: '/admin/produtos/novo', hidden: true },
  { icon: MessageSquare, label: 'Mensagens', href: '/admin/mensagens' },
  { icon: Settings, label: 'Configuracoes', href: '/admin/configuracoes' },
  { icon: Key, label: 'Gateway', href: '/admin/gateway' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession() || {};

  return (
    <aside className="w-[280px] bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-orange-500 mb-2">Ze Express</h1>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold">{session?.user?.name?.charAt(0) || 'A'}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name || 'Admin'}</p>
            <span className="text-xs bg-yellow-500 text-gray-900 px-2 py-0.5 rounded font-semibold">ADMIN</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if ((item as any).hidden) return null;
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-2">
        <Link href="/" target="_blank" className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          <ShoppingBag className="w-4 h-4" />Ver Site<ExternalLink className="w-3 h-3" />
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" />Sair
        </button>
      </div>
    </aside>
  );
}
