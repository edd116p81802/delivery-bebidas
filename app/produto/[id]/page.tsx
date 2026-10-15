import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import ProductPageClient from './product-page-client';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true },
  });

  if (!product) {
    notFound();
  }

  return <ProductPageClient product={JSON.parse(JSON.stringify(product))} />;
}
