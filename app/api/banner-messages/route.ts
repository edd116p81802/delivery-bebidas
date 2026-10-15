import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const messages = await prisma.bannerMessage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Banner messages error:', error);
    return NextResponse.json([]);
  }
}
