'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { toast } from 'sonner';
import { useState } from 'react';

interface ProductCardProps {
  id: string;
  name: string;
  imageUrl: string;
  categoryName: string;
  price: number;
  discount: number;
  finalPrice: number;
}

export function ProductCard({ id, name, imageUrl, categoryName, price, discount, finalPrice }: ProductCardProps) {
  const { addItem } = useCartStore();
  const [imageError, setImageError] = useState(false);

  const displayDiscount = Math.floor(discount);
  const showDiscount = displayDiscount >= 1;

  const getDiscountBadgeColor = (disc: number): string => {
    if (disc <= 5) return 'bg-amber-500';
    if (disc <= 8) return 'bg-amber-500';
    if (disc <= 15) return 'bg-amber-600';
    return 'bg-red-500';
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addItem({
      id,
      name,
      imageUrl,
      categoryName,
      price,
      finalPrice,
      quantity: 1,
    });
    
    toast.success(`${name} adicionado ao carrinho!`, { duration: 2000 });
  };

  return (
    <Link 
      href={`/produto/${id}`} 
      className="block bg-zinc-50 rounded-2xl p-2 shadow-sm hover:shadow-lg transition-all duration-300 group border border-gray-100/50"
    >
      {/* Container quadrado - perfeito para imagens 1:1, object-contain não corta */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-white mb-2 flex items-center justify-center">
        {!imageError ? (
          <Image 
            src={imageUrl} 
            alt={name} 
            fill 
            className="object-contain p-1 transition-transform duration-300 group-hover:scale-110" 
            onError={() => setImageError(true)} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs bg-gray-100">Sem imagem</div>
        )}
        {showDiscount && (
          <div className={`absolute top-1.5 left-1.5 ${getDiscountBadgeColor(displayDiscount)} text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-md z-10`}>
            {displayDiscount}% OFF
          </div>
        )}
      </div>
      
      <h3 className="font-semibold text-gray-800 text-[11px] md:text-xs leading-tight mb-1 line-clamp-2 min-h-[28px] md:min-h-[32px]">{name}</h3>
      
      <div className="mb-1.5">
        {showDiscount ? (
          <p className="text-gray-400 text-[9px] line-through leading-none">R$ {price.toFixed(2).replace('.', ',')}</p>
        ) : (
          <p className="text-[9px] invisible leading-none">-</p>
        )}
        <p className="text-amber-600 text-sm md:text-base font-bold leading-tight">R$ {finalPrice.toFixed(2).replace('.', ',')}</p>
      </div>
      
      <button onClick={handleAddToCart} className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-1.5 rounded-xl transition-colors flex items-center justify-center shadow-sm">
        <Plus className="w-4 h-4" />
      </button>
    </Link>
  );
}
