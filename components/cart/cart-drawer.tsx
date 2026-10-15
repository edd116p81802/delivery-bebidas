'use client';

import { X, Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import { FREE_DELIVERY_THRESHOLD } from '@/lib/constants';
import { useEffect, useState } from 'react';

export function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const { items, isOpen, closeCart, updateQuantity, removeItem, clearCart, getSubtotal, getDeliveryFee, getTotal } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const subtotalOriginal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalDiscount = subtotalOriginal - subtotal;

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={closeCart} aria-hidden="true" />}

      <div className={`md:hidden fixed bottom-0 left-0 right-0 h-[75vh] bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out rounded-t-3xl ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-white">Seu Carrinho</h2>
            <button onClick={closeCart} className="text-gray-400 hover:text-white" aria-label="Fechar carrinho"><X className="w-6 h-6" /></button>
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400"><p>Seu carrinho está vazio</p></div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base truncate text-white">{item.name}</h3>
                        <p className="text-amber-400 font-bold text-base">R$ {(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white" aria-label="Diminuir quantidade"><Minus className="w-4 h-4" /></button>
                          <span className="font-semibold text-base w-8 text-center text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white" aria-label="Aumentar quantidade"><Plus className="w-4 h-4" /></button>
                          <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300 text-sm ml-auto font-medium">Remover</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-700 p-4 space-y-3 flex-shrink-0">
                {remainingForFreeDelivery > 0 ? (
                  <div className="text-xs text-center text-amber-400">
                    Adicione + R$ {remainingForFreeDelivery.toFixed(2).replace('.', ',')} para ganhar Entrega Grátis
                  </div>
                ) : (
                  <div className="text-xs text-center text-green-400">
                    ✓ Você ganhou Entrega Grátis!
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="font-semibold text-white">R$ {subtotalOriginal.toFixed(2).replace('.', ',')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Entrega</span>{deliveryFee === 0 ? <span className="font-semibold text-green-400">GRÁTIS</span> : <span className="font-semibold text-white">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>}</div>
                  {totalDiscount > 0 && <div className="flex justify-between"><span className="text-amber-400 font-semibold">Promoção</span><span className="text-amber-400 font-semibold">-R$ {totalDiscount.toFixed(2).replace('.', ',')}</span></div>}
                  <div className="flex justify-between pt-2 border-t border-gray-700"><span className="font-bold text-white">Total</span><span className="font-bold text-amber-400 text-lg">R$ {total.toFixed(2).replace('.', ',')}</span></div>
                </div>

                <Link href="/checkout" onClick={closeCart} className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold py-3 px-6 rounded-full transition-colors flex items-center justify-center">Finalizar Pedido</Link>
                <button onClick={clearCart} className="w-full text-gray-500 hover:text-gray-400 text-sm">Limpar Carrinho</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`hidden md:block fixed top-0 right-0 h-full w-full md:w-[400px] bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-bold text-white">Seu Carrinho</h2>
            <button onClick={closeCart} className="text-gray-400 hover:text-white" aria-label="Fechar carrinho"><X className="w-6 h-6" /></button>
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400"><p>Seu carrinho está vazio</p></div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate text-white">{item.name}</h3>
                      <p className="text-xs text-gray-400">{item.categoryName}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white" aria-label="Diminuir quantidade"><Minus className="w-4 h-4" /></button>
                          <span className="font-semibold text-sm w-8 text-center text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white" aria-label="Aumentar quantidade"><Plus className="w-4 h-4" /></button>
                        </div>
                        <p className="font-bold text-amber-400 text-sm">R$ {(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300 text-xs mt-1 flex items-center gap-1"><Trash2 className="w-3 h-3" />Remover</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 p-6 space-y-4 flex-shrink-0">
                {remainingForFreeDelivery > 0 ? (
                  <div className="text-xs text-center text-amber-400">
                    Adicione + R$ {remainingForFreeDelivery.toFixed(2).replace('.', ',')} para ganhar Entrega Grátis
                  </div>
                ) : (
                  <div className="text-xs text-center text-green-400">
                    ✓ Você ganhou Entrega Grátis!
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="font-semibold text-white">R$ {subtotalOriginal.toFixed(2).replace('.', ',')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Entrega</span>{deliveryFee === 0 ? <span className="font-semibold text-green-400">GRÁTIS</span> : <span className="font-semibold text-white">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>}</div>
                  {totalDiscount > 0 && <div className="flex justify-between"><span className="text-amber-400 font-semibold">Promoção</span><span className="text-amber-400 font-semibold">-R$ {totalDiscount.toFixed(2).replace('.', ',')}</span></div>}
                  <div className="flex justify-between pt-2 border-t border-gray-700"><span className="font-bold text-white">Total</span><span className="font-bold text-amber-400 text-lg">R$ {total.toFixed(2).replace('.', ',')}</span></div>
                </div>

                <Link href="/checkout" onClick={closeCart} className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center">Finalizar Pedido</Link>
                <button onClick={clearCart} className="w-full text-gray-500 hover:text-gray-400 text-sm">Limpar Carrinho</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
