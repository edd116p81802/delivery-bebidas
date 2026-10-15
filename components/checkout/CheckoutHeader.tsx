'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CheckoutHeaderProps {
  title: string;
  backRoute?: string;
  rightElement?: React.ReactNode;
}

export default function CheckoutHeader({ title, backRoute, rightElement }: CheckoutHeaderProps) {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-900 z-50">
      <div className="h-16 flex items-center justify-center px-4 relative">
        {/* Botão Voltar - posição absoluta à esquerda */}
        {backRoute && (
          <button
            type="button"
            onClick={() => router.push(backRoute)}
            className="absolute left-4 p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-amber-400" />
          </button>
        )}

        {/* Título centralizado */}
        <h1 className="text-sm font-bold uppercase tracking-widest text-white">
          {title}
        </h1>

        {/* Elemento à direita (opcional) - posição absoluta */}
        {rightElement && (
          <div className="absolute right-4 text-white">
            {rightElement}
          </div>
        )}
      </div>
    </header>
  );
}
