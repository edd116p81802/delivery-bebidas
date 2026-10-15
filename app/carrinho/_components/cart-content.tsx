"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Package } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";

export function CartContent() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state?.items ?? []);
  const updateQuantity = useCartStore((state) => state?.updateQuantity);
  const removeItem = useCartStore((state) => state?.removeItem);
  const getSubtotal = useCartStore((state) => state?.getSubtotal);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal?.() ?? 0;
  const deliveryFee = subtotal >= 29.90 ? 0 : 5.0;
  const total = subtotal + deliveryFee;

  if ((items ?? []).length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Package className="w-20 h-20 text-gray-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-700 mb-4">Seu carrinho está vazio</h1>
        <p className="text-gray-500 mb-8">Adicione produtos para continuar comprando</p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          Explorar Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Carrinho de Compras</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-4">
          {(items ?? []).map((item, index) => (
            <motion.div
              key={item?.id ?? index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center space-x-4">
                {/* Image */}
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item?.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item?.name ?? ''}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{item?.name ?? 'Produto'}</h3>
                  <p className="text-green-600 font-medium">R$ {(item?.finalPrice ?? 0).toFixed(2)}</p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity?.(item?.id ?? '', (item?.quantity ?? 1) - 1)}
                    className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item?.quantity ?? 1}</span>
                  <button
                    onClick={() => updateQuantity?.(item?.id ?? '', (item?.quantity ?? 1) + 1)}
                    className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    R$ {((item?.finalPrice ?? 0) * (item?.quantity ?? 1)).toFixed(2)}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeItem?.(item?.id ?? '')}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm sticky top-24"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Resumo do Pedido</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Entrega</span>
                <span className={deliveryFee === 0 ? "text-green-600 font-medium" : ""}>
                  {deliveryFee === 0 ? "Grátis" : `R$ ${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              {subtotal < 29.90 && (
                <p className="text-sm text-amber-600">
                  Falta R$ {(29.90 - subtotal).toFixed(2)} para frete grátis!
                </p>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout"
              className="flex items-center justify-center w-full py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
            >
              Finalizar Compra
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>

            <Link
              href="/"
              className="block text-center mt-4 text-gray-600 hover:text-green-600 transition-colors"
            >
              Continuar Comprando
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
