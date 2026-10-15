'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { toast } from 'sonner';
import { Minus, Plus } from 'lucide-react';

interface AddToCartSectionProps {
  product: {
    id: string;
    name: string;
    imageUrl: string;
    categoryName: string;
    price: number;
    finalPrice: number;
  };
}

export default function AddToCartSection({ product }: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem({
      ...product,
      quantity,
    });
    toast.success(`${quantity}x ${product.name} adicionado ao carrinho!`, { duration: 2000 });
  };

  const totalPrice = (product.finalPrice * quantity).toFixed(2).replace('.', ',');

  return (
    <div className="space-y-4">
      {/* Seletor de quantidade estilo Zé */}
      <div className="flex items-center justify-center gap-4 py-2">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <Minus className="w-5 h-5" />
        </button>
        <span className="text-xl font-bold w-10 text-center">{String(quantity).padStart(2, '0')}</span>
        <button
          onClick={() => setQuantity(quantity + 1)}
          className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Botões de quantidade rápida */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setQuantity(q => q + 6)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          + 6 un.
        </button>
        <button
          onClick={() => setQuantity(q => q + 10)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          + 10 un.
        </button>
        <button
          onClick={() => setQuantity(q => q + 15)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          + 15 un.
        </button>
      </div>

      {/* Botão Adicionar Amarelo */}
      <button
        onClick={handleAddToCart}
        className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-between text-base"
      >
        <span>ADICIONAR ({quantity})</span>
        <span>R$ {totalPrice}</span>
      </button>
    </div>
  );
}
