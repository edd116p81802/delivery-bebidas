import { prisma } from '@/lib/db';
import { ProductCard } from '@/components/product/product-card';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MiniCart } from '@/components/cart/mini-cart';
import { CartDrawer } from '@/components/cart/cart-drawer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const products = await prisma.product.findMany({
    where: { 
      featuredOffer: true,
      hidden: false,
      category: { hidden: false }
    },
    include: { category: true },
    orderBy: { featuredOfferOrder: 'asc' },
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      {/* Botão Voltar + Título (igual às outras categorias) */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-amber-500 transition-colors mb-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">🔥 Ofertas</h1>
          <p className="text-gray-600 text-sm mt-1">{products?.length || 0} produtos em oferta</p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6">
        {products?.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map((product: { id: string; name: string; imageUrl: string; price: number; discount: number; finalPrice: number; category: { name: string } | null }) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                imageUrl={product.imageUrl}
                categoryName={product.category?.name || 'Ofertas'}
                price={product.price}
                discount={product.discount}
                finalPrice={product.finalPrice}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Nenhuma oferta disponível no momento</p>
          </div>
        )}
      </main>

      <Footer />
      <MiniCart />
      <CartDrawer />
    </div>
  );
}
