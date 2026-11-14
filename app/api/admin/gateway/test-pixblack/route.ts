import { NextResponse } from 'next/server';
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
    // 1. Get Pix Black configuration from DB (or fallback)
    const pixBlackGateway = await prisma.gateway.findFirst({
      where: {
        OR: [
          { name: { contains: 'Pix Black', mode: 'insensitive' } },
          { name: { contains: 'PixBlack', mode: 'insensitive' } },
          { apiUrl: { contains: 'pixxblack', mode: 'insensitive' } },
        ],
      },
    });

    const token = (
      pixBlackGateway?.privateKey ||
      process.env.PIXBLACK_TOKEN ||
      ''
    ).trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Chave de API do Pix Black não encontrada no banco de dados.' },
        { status: 400 }
      );
    }

    const apiUrl = 'https://pixxblack.com/api/v1/charges';
    const reference = `TEST_PIXB_${Date.now()}`;

    // Valid 11-digit CPF and payload conforming strictly to Pix Black API spec
    const payload = {
      amount_cents: 500, // R$ 5,00 (mínimo permitido)
      description: 'Pedido Teste Bebidas',
      external_reference: reference,
      payer: {
        name: 'Cliente Teste Pix Black',
        document: '52998224725',
        email: 'cliente.teste@gmail.com',
        phone: '11999999999',
      },
    };

    console.log('[TEST-PIXBLACK] Calling Pix Black at:', apiUrl);
    const pixRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': `${reference}`,
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
          message: 'Resposta de erro retornada pelo Pix Black',
          error: data,
          details: {
            apiUrl,
            httpStatus: pixRes.status,
            pixBlackMessage: data.message || null,
          },
        },
        { status: pixRes.status }
      );
    }

    const pixCode = data.pix?.copy_paste || null;
    const transactionId = data.id || null;
    const status = data.status || 'pending';
    const expiresAt = data.pix?.expires_at || null;

    return NextResponse.json({
      success: true,
      message: 'PIX gerado com sucesso via Pix Black!',
      gateway: 'Pix Black',
      amount_cents: data.amount_cents || 500,
      transaction_id: transactionId,
      external_reference: reference,
      pix_code: pixCode,
      status,
      expires_at: expiresAt,
      raw: data,
    });
  } catch (error: any) {
    console.error('[TEST-PIXBLACK] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
