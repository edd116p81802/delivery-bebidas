import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleTest(request);
}

export async function POST(request: Request) {
  return handleTest(request);
}

async function handleTest(request: Request) {
  try {
    // 1. Get BlackPix configuration from DB (or env)
    const blackPixGateway = await prisma.gateway.findFirst({
      where: {
        OR: [
          { apiUrl: { contains: 'blackpix.site', mode: 'insensitive' } },
          { name: { equals: 'BlackPix', mode: 'insensitive' } },
        ],
      },
    });

    const token = (
      blackPixGateway?.privateKey ||
      process.env.BLACKPIX_API_KEY ||
      ''
    ).trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Chave de API da BlackPix não encontrada no banco de dados.' },
        { status: 400 }
      );
    }

    const apiUrl = 'https://blackpix.site/api/integrations/v1/deposits';
    const idempotencyKey = crypto.randomUUID();

    // BlackPix strict payload: only amountCents and optional description
    const payload = {
      amountCents: 1000, // R$ 10,00 (mínimo exigido pela BlackPix)
      description: 'Teste Pedido Bebidas Express',
    };

    console.log('[TEST-BLACKPIX] Calling BlackPix at:', apiUrl, 'with Idempotency-Key:', idempotencyKey);
    const pixRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await pixRes.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawText: responseText };
    }

    if (!pixRes.ok) {
      return NextResponse.json(
        {
          success: false,
          status: pixRes.status,
          message: 'Resposta retornada pela BlackPix',
          error: data,
          details: {
            apiUrl,
            httpStatus: pixRes.status,
            blackPixError: data.error || null,
            blackPixCode: data.code || null,
            retryable: data.retryable || false,
          },
        },
        { status: pixRes.status }
      );
    }

    const pixCode = data.deposit?.pixCopyPasteCode || null;
    const transactionId = data.deposit?.id || null;
    const status = data.deposit?.status || 'pending';
    const expiresAt = data.deposit?.expiresAt || null;

    return NextResponse.json({
      success: true,
      message: 'PIX gerado com sucesso via BlackPix!',
      gateway: 'BlackPix',
      amount_cents: data.deposit?.amountCents || 1000,
      transaction_id: transactionId,
      idempotency_key: idempotencyKey,
      pix_code: pixCode,
      status,
      expires_at: expiresAt,
      raw: data,
    });
  } catch (error: any) {
    console.error('[TEST-BLACKPIX] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
