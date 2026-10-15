"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Beer, Droplets, Package, Plus } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  price: number;
  finalPrice: number;
  discount: number;
  brand?: string;
  volume?: string;
  alcoholContent?: string;
  stock: number;
  category: { id: string; name: string; slug: string };
}

export function ProductCard({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const { addItem } = useCartStore();

  const hasDiscount = (product.discount ?? 0) > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      categoryName: product.category?.name || 'Sem categoria',
      price: product.price,
      finalPrice: product.finalPrice,
      quantity: 1,
    });
    toast.success(`${product.name} adicionado!`, { duration: 1500 });
  };

  return (
    <Link href={`/produto/${product.id}`}>
      <div className="product-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer relative">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50">
          {product.imageUrl && !imgError ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-2"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Beer className="text-gray-200" size={40} />
            </div>
          )}
          {hasDiscount && (
            <div className="absolute top-2 left-2 bg-amber-500 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
              -{Math.floor(product.discount)}%
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5">
          <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</p>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {product.volume && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                <Package size={10} />{product.volume}
              </span>
            )}
            {product.alcoholContent && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                <Droplets size={10} />{product.alcoholContent}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-end justify-between">
            <div>
              {hasDiscount && (
                <span className="text-xs text-gray-400 line-through block">
                  R$ {product.price?.toFixed(2).replace(".", ",")}
                </span>
              )}
              <span className="text-sm font-bold text-gray-900">
                R$ {(product.finalPrice ?? product.price)?.toFixed(2).replace(".", ",")}
              </span>
            </div>
            {/* Botão + Amarelo */}
            <button
              onClick={handleAddToCart}
              className="w-8 h-8 bg-amber-400 hover:bg-amber-500 rounded-full flex items-center justify-center transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 text-gray-900" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
