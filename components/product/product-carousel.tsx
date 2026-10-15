'use client';

import { ProductCard } from './product-card';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  discount: number;
  finalPrice: number;
}

interface ProductCarouselProps {
  products: Product[];
  categoryName: string;
  categorySlug: string;
  maxProducts?: number;
}

export function ProductCarousel({ products, categoryName, categorySlug, maxProducts = 8 }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayProducts = products?.slice(0, maxProducts) ?? [];
  const hasMore = (products?.length ?? 0) > maxProducts;

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-4" style={{ scrollSnapType: 'x mandatory' }}>
        {displayProducts.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-[calc((100%-12px)/2.25)] md:w-[200px]" style={{ scrollSnapAlign: 'start' }}>
            <ProductCard id={product.id} name={product.name} imageUrl={product.imageUrl} categoryName={categoryName} price={product.price} discount={product.discount} finalPrice={product.finalPrice} />
          </div>
        ))}
        
        {hasMore && (
          <Link href={`/categoria/${categorySlug}`} className="flex-shrink-0 w-[calc((100%-12px)/2.25)] md:w-[200px]" style={{ scrollSnapAlign: 'start' }}>
            <div className="h-full min-h-[250px] md:min-h-[280px] flex flex-col items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer group">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/90 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
              </div>
              <p className="text-white font-bold text-sm md:text-lg">Ver todos</p>
              <p className="text-white/90 text-xs md:text-sm mt-1">{products?.length ?? 0} produtos</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
