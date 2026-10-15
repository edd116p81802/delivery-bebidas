import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const messages = await prisma.bannerMessage.findMany({
    orderBy: { order: 'asc' },
  });
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const message = await prisma.bannerMessage.create({
    data: {
      text: body.text,
      duration: body.duration || 5,
      isActive: body.isActive ?? true,
      order: body.order || 0,
    },
  });
  return NextResponse.json({ message });
}
