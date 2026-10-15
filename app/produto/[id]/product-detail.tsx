'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { toast } from 'sonner';

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    categoryName: string;
    price: number;
    discount: number;
    finalPrice: number;
    volume: string;
    brand: string;
    alcoholContent: string;
  };
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem({
      id: product?.id ?? '',
      name: product?.name ?? '',
      imageUrl: product?.imageUrl ?? '',
      categoryName: product?.categoryName ?? '',
      price: product?.price ?? 0,
      finalPrice: product?.finalPrice ?? 0,
      quantity,
    });
    toast.success(`${quantity}x ${product?.name} adicionado ao carrinho!`);
  };

  const displayDiscount = Math.floor(product?.discount ?? 0);
  const showDiscount = displayDiscount >= 1;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
        {!imageError ? (
          <Image
            src={product?.imageUrl ?? ''}
            alt={product?.name ?? ''}
            fill
            className="object-contain p-4"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">Sem imagem</div>
        )}
        {showDiscount && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            {displayDiscount}% OFF
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product?.name}</h1>
        
        {product?.description && (
          <p className="text-gray-600">{product?.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {product?.brand && (
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">Marca: {product?.brand}</span>
          )}
          {product?.volume && (
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">{product?.volume}</span>
          )}
          {product?.alcoholContent && (
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">{product?.alcoholContent}</span>
          )}
        </div>

        <div className="pt-4">
          {showDiscount && (
            <p className="text-gray-400 line-through text-lg">
              R$ {(product?.price ?? 0)?.toFixed?.(2)?.replace?.('.', ',')}
            </p>
          )}
          <p className="text-3xl font-bold text-amber-600">
            R$ {(product?.finalPrice ?? 0)?.toFixed?.(2)?.replace?.('.', ',')}
          </p>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-lg bg-white flex items-center justify-center hover:bg-gray-50"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="font-bold text-xl w-12 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-lg bg-white flex items-center justify-center hover:bg-gray-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-4 px-6 rounded-xl transition-colors"
          >
            Adicionar ao Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}
