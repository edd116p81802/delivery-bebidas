import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  
  // Aceita atualizações parciais
  const updateData: Record<string, unknown> = {};
  
  if (body.name !== undefined) updateData.name = body.name;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
  if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
  if (body.hidden !== undefined) updateData.hidden = body.hidden;

  const category = await prisma.category.update({
    where: { id: params.id },
    data: updateData,
  });
  return NextResponse.json({ category });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
