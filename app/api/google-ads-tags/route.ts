import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Public endpoint - returns only active tags (no auth required)
export async function GET() {
  try {
    const tags = await prisma.googleAdsTag.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { awId: true, conversionLabel: true },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Google Ads tags error:', error);
    return NextResponse.json([]);
  }
}
