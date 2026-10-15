'use client';

import { ShoppingCart, ChevronUp } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { FREE_DELIVERY_THRESHOLD } from '@/lib/constants';
import { useEffect, useState } from 'react';

export function MiniCart() {
  const [mounted, setMounted] = useState(false);
  const { getItemCount, getSubtotal, getTotal, openCart } = useCartStore();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  const total = getTotal();
  const remainingForFreeDelivery = FREE_DELIVERY_THRESHOLD - subtotal;
  const hasFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;

  if (itemCount === 0) return null;

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-gray-900">
          <button onClick={openCart} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-amber-400 rounded-full p-2 relative">
                <ShoppingCart className="w-5 h-5 text-gray-900" />
                <span className="absolute -top-1 -right-1 bg-gray-900 text-amber-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border border-amber-400">{itemCount}</span>
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm text-white">Seu Carrinho</div>
                {!hasFreeDelivery ? (
                  <div className="text-[10px] text-amber-400">+R$ {remainingForFreeDelivery.toFixed(2).replace('.', ',')} p/ entrega grátis</div>
                ) : (
                  <div className="text-[10px] text-green-400">✓ Entrega Grátis</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <div className="text-[10px] text-gray-400">Total</div>
                <div className="text-lg font-bold text-amber-400">R$ {total.toFixed(2).replace('.', ',')}</div>
              </div>
              <ChevronUp className="w-5 h-5 text-amber-400 stroke-[2.5]" />
            </div>
          </button>
        </div>
      </div>

      <button onClick={openCart} className="hidden md:flex fixed bottom-6 right-6 z-40 bg-amber-400 text-gray-900 rounded-full p-4 shadow-lg hover:bg-amber-500 transition-all duration-200 hover:scale-105" aria-label="Abrir carrinho">
        <ShoppingCart className="w-6 h-6" />
        <span className="absolute -top-2 -right-2 bg-gray-900 text-amber-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border border-amber-400">{itemCount}</span>
      </button>
    </>
  );
}
