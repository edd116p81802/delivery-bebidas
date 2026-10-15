import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/product/product-card';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MiniCart } from '@/components/cart/mini-cart';
import { CartDrawer } from '@/components/cart/cart-drawer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug, hidden: false },
    include: {
      products: {
        where: { hidden: false },
        orderBy: [
          { featuredCategory: 'desc' },
          { featuredCategoryOrder: 'asc' },
          { starOrder: 'asc' },
          { createdAt: 'desc' },
        ],
      },
    },
  });

  if (!category) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header preto padrão (igual ao da home) */}
      <Header />
      
      {/* Botão Voltar + Título da Categoria (fora do header) */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-amber-500 transition-colors mb-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <p className="text-gray-600 text-sm mt-1">{category.products?.length || 0} produtos encontrados</p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6">
        {category.products?.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {category.products.map((product: { id: string; name: string; imageUrl: string; price: number; discount: number; finalPrice: number }) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                imageUrl={product.imageUrl}
                categoryName={category.name}
                price={product.price}
                discount={product.discount}
                finalPrice={product.finalPrice}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Nenhum produto encontrado nesta categoria</p>
          </div>
        )}
      </main>

      <Footer />
      <MiniCart />
      <CartDrawer />
    </div>
  );
}
