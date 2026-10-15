import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  // Buscar pelo key 'general' para garantir consistência
  const settings = await prisma.settings.findUnique({
    where: { key: 'general' },
  });
  
  return NextResponse.json({
    geolocationMode: settings?.geolocationMode || 'DISABLED',
    postimgApiKey: settings?.postimgApiKey || '',
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  
  // Usar upsert com o campo único 'key' para garantir consistência
  const settings = await prisma.settings.upsert({
    where: { key: 'general' },
    update: {
      geolocationMode: body.geolocationMode,
      postimgApiKey: body.postimgApiKey || undefined,
    },
    create: {
      key: 'general',
      value: '',
      geolocationMode: body.geolocationMode || 'DISABLED',
      postimgApiKey: body.postimgApiKey || null,
    },
  });
  
  return NextResponse.json({
    geolocationMode: settings.geolocationMode,
    postimgApiKey: settings.postimgApiKey || '',
  });
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
