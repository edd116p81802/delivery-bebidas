'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { MiniCart } from '@/components/cart/mini-cart';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { useCartStore } from '@/lib/cart-store';
import AddToCartSection from './add-to-cart-section';
import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  price: number;
  finalPrice: number;
  discount: number;
  volume?: string;
  alcoholContent?: string;
  brand?: string;
  category: { id: string; name: string; slug: string } | null;
}

export default function ProductPageClient({ product }: { product: Product }) {
  const [mounted, setMounted] = useState(false);
  const { getItemCount } = useCartStore();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const hasItemsInCart = mounted && getItemCount() > 0;
  const displayDiscount = Math.floor(product.discount);
  const showDiscount = displayDiscount >= 1;

  // Helper: verifica se o valor é válido
  const isValidValue = (val: string | null | undefined): boolean => {
    if (!val) return false;
    const cleaned = val.trim().toLowerCase();
    if (cleaned === '' || cleaned === '0' || cleaned === '0ml' || cleaned === '0l' || cleaned === '0%') return false;
    const numericOnly = cleaned.replace(/[^0-9.,]/g, '');
    if (numericOnly && parseFloat(numericOnly.replace(',', '.')) === 0) return false;
    return true;
  };
  
  const hasVolume = isValidValue(product.volume);
  const hasAlcohol = isValidValue(product.alcoholContent);
  const hasBrand = !!product.brand?.trim();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Preto padrão (igual ao da home) */}
      <Header />

      {/* Breadcrumb + Voltar */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-amber-500">Página Inicial</Link>
            <span>▸</span>
            {product.category && (
              <>
                <Link href={`/categoria/${product.category.slug}`} className="hover:text-amber-500">{product.category.name}</Link>
                <span>▸</span>
              </>
            )}
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 text-gray-700 hover:text-amber-500 transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" />
            VOLTAR
          </Link>
        </div>
      </div>

      {/* Produto */}
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        {/* Imagem */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="relative aspect-square max-h-[400px] flex items-center justify-center p-4">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-4"
              priority
            />
            {showDiscount && (
              <div className="absolute top-3 left-3 bg-amber-500 text-gray-900 px-3 py-1.5 rounded-full text-sm font-bold shadow-lg z-10">
                -{displayDiscount}%
              </div>
            )}
          </div>
        </div>

        {/* Info do Produto */}
        <div className="mt-4 space-y-4">
          <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
          
          {/* Preço */}
          <div className="flex items-baseline gap-2">
            {showDiscount && (
              <span className="text-base text-gray-400 line-through">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
            )}
            <span className="text-2xl font-bold text-gray-900">
              R$ {product.finalPrice.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {/* Detalhes */}
          {(hasVolume || hasAlcohol || hasBrand) && (
            <div className="flex gap-3 text-sm">
              {hasVolume && (
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-center">
                  <p className="text-gray-400 text-xs">Volume</p>
                  <p className="font-semibold text-gray-700">{product.volume}</p>
                </div>
              )}
              {hasAlcohol && (
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-center">
                  <p className="text-gray-400 text-xs">Teor</p>
                  <p className="font-semibold text-gray-700">{product.alcoholContent}</p>
                </div>
              )}
              {hasBrand && (
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-center">
                  <p className="text-gray-400 text-xs">Marca</p>
                  <p className="font-semibold text-gray-700">{product.brand}</p>
                </div>
              )}
            </div>
          )}

          {product.description && (
            <p className="text-gray-600 text-sm">{product.description}</p>
          )}

          {/* Adicionar ao Carrinho */}
          <AddToCartSection
            product={{
              id: product.id,
              name: product.name,
              imageUrl: product.imageUrl,
              categoryName: product.category?.name || 'Sem categoria',
              price: product.price,
              finalPrice: product.finalPrice,
            }}
          />
        </div>
        
        {/* Espaço extra quando tem carrinho flutuante (evita sobreposição no mobile) */}
        {hasItemsInCart && <div className="h-20 md:h-0" />}
      </div>

      {/* Carrinho flutuante */}
      <MiniCart />
      <CartDrawer />
    </div>
  );
}
