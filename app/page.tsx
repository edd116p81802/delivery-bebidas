import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MiniCart } from '@/components/cart/mini-cart';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { CategoryCard } from '@/components/product/category-card';
import { ProductCarousel } from '@/components/product/product-carousel';
import { HomeHeroBanner } from '@/components/home-content';
import { BannerMessages } from '@/components/banner-messages';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const featuredOffers = await prisma.product.findMany({
    where: { 
      featuredOffer: true,
      hidden: false,
      category: { hidden: false }
    },
    include: { category: true },
    orderBy: { featuredOfferOrder: 'asc' },
  });

  const categoriesWithProducts = await prisma.category.findMany({
    where: {
      slug: { not: 'ofertas' },
      hidden: false,
      products: { some: { hidden: false } },
    },
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
    orderBy: { orderIndex: 'asc' },
  });

  const categories = await prisma.category.findMany({
    where: { 
      slug: { not: 'ofertas' },
      hidden: false
    },
    orderBy: { orderIndex: 'asc' },
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <HomeHeroBanner />

      {/* Container de categorias - ajustado para não sobrepor tanto o banner */}
      <div className="bg-white rounded-t-[32px] -mt-6 relative z-10">
        <div className="container mx-auto px-4 pt-6">

          <BannerMessages />

          <div className="mb-8">
            {/* Mobile: scroll horizontal com 2 linhas, ~4.5 itens visíveis por linha */}
            <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div 
                className="grid grid-rows-2 gap-2 auto-cols-[calc((100vw-48px)/4.5)]" 
                style={{ 
                  gridAutoFlow: 'column',
                  width: 'max-content'
                }}
              >
                {categories?.map((category: { id: string; name: string; slug: string; icon: string | null; color: string | null; imageUrl: string | null }) => (
                  <CategoryCard
                    key={category.id}
                    name={category.name}
                    slug={category.slug}
                    icon={category.icon || undefined}
                    color={category.color || undefined}
                    imageUrl={category.imageUrl || undefined}
                  />
                ))}
              </div>
            </div>
            {/* Desktop: grid normal */}
            <div className="hidden md:grid md:grid-cols-8 lg:grid-cols-10 gap-3">
              {categories?.map((category: { id: string; name: string; slug: string; icon: string | null; color: string | null; imageUrl: string | null }) => (
                <CategoryCard
                  key={category.id}
                  name={category.name}
                  slug={category.slug}
                  icon={category.icon || undefined}
                  color={category.color || undefined}
                  imageUrl={category.imageUrl || undefined}
                />
              ))}
            </div>
          </div>

          {featuredOffers?.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold">Ofertas</h2>
                <Link href="/categoria/ofertas" className="text-amber-500 hover:text-amber-600 font-semibold text-sm">Ver mais ›</Link>
              </div>
              <ProductCarousel
                products={featuredOffers.map((p: { id: string; name: string; imageUrl: string; price: number; discount: number; finalPrice: number }) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price, discount: p.discount, finalPrice: p.finalPrice }))}
                categoryName="Ofertas"
                categorySlug="ofertas"
                maxProducts={8}
              />
            </div>
          )}

          {categoriesWithProducts?.map((category: { id: string; name: string; slug: string; products: { id: string; name: string; imageUrl: string; price: number; discount: number; finalPrice: number }[] }) => (
            category.products?.length > 0 && (
              <div key={category.id} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl md:text-2xl font-bold">{category.name}</h2>
                  <Link href={`/categoria/${category.slug}`} className="text-amber-500 hover:text-amber-600 font-semibold text-sm">Ver mais ›</Link>
                </div>
                <ProductCarousel
                  products={category.products.map((p: { id: string; name: string; imageUrl: string; price: number; discount: number; finalPrice: number }) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price, discount: p.discount, finalPrice: p.finalPrice }))}
                  categoryName={category.name}
                  categorySlug={category.slug}
                  maxProducts={8}
                />
              </div>
            )
          ))}
        </div>
      </div>

      <Footer />
      <MiniCart />
      <CartDrawer />
    </div>
  );
}
