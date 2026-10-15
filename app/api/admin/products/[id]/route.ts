import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true },
  });
  if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  
  // Aceita atualizações parciais
  const updateData: Record<string, unknown> = {};
  
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.price !== undefined) updateData.price = body.price;
  if (body.discount !== undefined) updateData.discount = body.discount;
  if (body.finalPrice !== undefined) updateData.finalPrice = body.finalPrice;
  if (body.volume !== undefined) updateData.volume = body.volume;
  if (body.alcoholContent !== undefined) updateData.alcoholContent = body.alcoholContent;
  if (body.brand !== undefined) updateData.brand = body.brand;
  if (body.featuredOffer !== undefined) updateData.featuredOffer = body.featuredOffer;
  if (body.featuredOfferOrder !== undefined) updateData.featuredOfferOrder = body.featuredOfferOrder;
  if (body.featuredCategory !== undefined) updateData.featuredCategory = body.featuredCategory;
  if (body.featuredCategoryOrder !== undefined) updateData.featuredCategoryOrder = body.featuredCategoryOrder;
  if (body.starOrder !== undefined) updateData.starOrder = body.starOrder;
  if (body.hidden !== undefined) updateData.hidden = body.hidden;

  const product = await prisma.product.update({
    where: { id: params.id },
    data: updateData,
  });
  return NextResponse.json({ product });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
