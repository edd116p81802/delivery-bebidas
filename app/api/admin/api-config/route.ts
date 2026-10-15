import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

// Chaves permitidas
const ALLOWED_KEYS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'OPENAI_API_KEY',
  // Preferências de provedor
  'STORAGE_PROVIDER',  // 'abacus' | 'cloudinary'
  'LLM_PROVIDER',      // 'abacus' | 'openai'
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const configs = await prisma.apiConfig.findMany({
      where: { key: { in: ALLOWED_KEYS } },
    });

    // Non-secret preference keys that can return their value
    const PREFERENCE_KEYS = ['STORAGE_PROVIDER', 'LLM_PROVIDER'];
    
    const result: Record<string, { masked: string; configured: boolean; value?: string }> = {};
    
    for (const key of ALLOWED_KEYS) {
      const config = configs.find((c: { key: string; value: string }) => c.key === key);
      if (config && config.value) {
        if (PREFERENCE_KEYS.includes(key)) {
          // Preference keys are not secrets, return value
          result[key] = { masked: config.value, configured: true, value: config.value };
        } else {
          // Secret keys: only return masked version
          const masked = config.value.length > 8 
            ? config.value.slice(0, 4) + '****' + config.value.slice(-4)
            : '****';
          result[key] = { masked, configured: true };
        }
      } else {
        result[key] = { masked: '', configured: false };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar configs:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: 'Chave não permitida' }, { status: 400 });
    }

    // Upsert: cria ou atualiza
    await prisma.apiConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar config:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key || !ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: 'Chave não permitida' }, { status: 400 });
    }

    await prisma.apiConfig.deleteMany({ where: { key } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar config:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
