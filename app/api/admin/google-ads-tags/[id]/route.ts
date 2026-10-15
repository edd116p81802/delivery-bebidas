import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const { name, awId, isActive, conversionLabel } = body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name.trim();
  if (awId !== undefined) updateData.awId = awId.trim();
  if (isActive !== undefined) updateData.isActive = isActive;
  if (conversionLabel !== undefined) updateData.conversionLabel = conversionLabel.trim();

  const tag = await prisma.googleAdsTag.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(tag);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  await prisma.googleAdsTag.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
