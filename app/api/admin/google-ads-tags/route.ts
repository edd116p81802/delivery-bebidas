import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const tags = await prisma.googleAdsTag.findMany({
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const { name, awId } = body;

  if (!awId?.trim()) {
    return NextResponse.json({ error: 'ID AW é obrigatório' }, { status: 400 });
  }

  // Check limit of 3
  const count = await prisma.googleAdsTag.count();
  if (count >= 3) {
    return NextResponse.json({ error: 'Limite máximo de 3 tags atingido' }, { status: 400 });
  }

  const tag = await prisma.googleAdsTag.create({
    data: {
      name: name?.trim() || '',
      awId: awId.trim(),
      isActive: true,
      order: count,
    },
  });

  return NextResponse.json(tag);
}
