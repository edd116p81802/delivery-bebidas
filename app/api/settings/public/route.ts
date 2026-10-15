import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst({
      where: { key: 'general' },
    });

    return NextResponse.json({
      geolocationMode: settings?.geolocationMode || 'DISABLED',
    });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ geolocationMode: 'DISABLED' });
  }
}
