import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const categories = await prisma.category.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      _count: {
        select: { products: true }
      }
    }
  });
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const category = await prisma.category.create({
    data: {
      name: body.name,
      slug: slug,
      icon: body.icon,
      color: body.color,
      imageUrl: body.imageUrl,
      orderIndex: body.orderIndex || 999,
    },
  });
  return NextResponse.json({ category });
}
