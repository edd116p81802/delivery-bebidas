import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      price: true,
      discount: true,
      finalPrice: true,
      featuredOffer: true,
      featuredOfferOrder: true,
      featuredCategory: true,
      featuredCategoryOrder: true,
      starOrder: true,
      hidden: true,
      brand: true,
      volume: true,
      category: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const product = await prisma.product.create({
    data: {
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl,
      categoryId: body.categoryId,
      price: body.price,
      discount: body.discount || 0,
      finalPrice: body.finalPrice,
      volume: body.volume,
      alcoholContent: body.alcoholContent,
      brand: body.brand,
      featuredOffer: body.featuredOffer || false,
      featuredOfferOrder: body.featuredOfferOrder || null,
      featuredCategory: body.featuredCategory || false,
      featuredCategoryOrder: body.featuredCategoryOrder || null,
    },
  });
  return NextResponse.json({ product });
}
