import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma, withRetry } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const codes = await withRetry(() => prisma.verificationCode.findMany({
      orderBy: { createdAt: 'desc' },
    }));

    const setting = await withRetry(() => prisma.settings.findUnique({
      where: { key: 'verification_code_enabled' },
    }));

    return NextResponse.json({
      codes,
      enabled: setting?.value === 'true',
    });
  } catch (error) {
    console.error('Error fetching verification codes:', error);
    return NextResponse.json({ codes: [], enabled: false });
  }
}

// Toggle the verification code feature
export async function PUT() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const current = await withRetry(() => prisma.settings.findUnique({
      where: { key: 'verification_code_enabled' },
    }));

    const newValue = current?.value === 'true' ? 'false' : 'true';

    await withRetry(() => prisma.settings.upsert({
      where: { key: 'verification_code_enabled' },
      update: { value: newValue },
      create: { key: 'verification_code_enabled', value: newValue },
    }));

    return NextResponse.json({ enabled: newValue === 'true' });
  } catch (error) {
    console.error('Error toggling verification:', error);
    return NextResponse.json({ error: 'Erro ao alternar verificação' }, { status: 500 });
  }
}

// Clear all verification codes
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await withRetry(() => prisma.verificationCode.deleteMany());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing verification codes:', error);
    return NextResponse.json({ error: 'Erro ao limpar códigos' }, { status: 500 });
  }
}
