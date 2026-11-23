import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateValidCPF } from '@/lib/gateway-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleTest(request);
}

export async function POST(request: Request) {
  return handleTest(request);
}

async function handleTest(request: Request) {
  try {
    let testAmount = 20.0;
    try {
      const body = await request.json().catch(() => ({}));
      if (body?.amount && Number(body.amount) > 0) {
        testAmount = Number(body.amount);
      }
    } catch {
      // ignore
    }

    // 1. Get SkalaPay configuration from DB (or defaults)
    const skalaGateway = await prisma.gateway.findFirst({
      where: {
        OR: [
          { name: { contains: 'Skala', mode: 'insensitive' } },
          { name: { contains: 'Skale', mode: 'insensitive' } },
          { apiUrl: { contains: 'skalapay', mode: 'insensitive' } },
        ],
      },
    });

    const clientId = (skalaGateway?.publicKey || 'xlux988_mgha9xn8z7hyimmqbzf0mmim').trim().replace(/\s+/g, '');
    const clientSecret = (skalaGateway?.privateKey || 'RhMQWKGm0OJMOo6Za0MpYTh2qqLFNHfhByTNfCq8DCnUXkg3x73LID8okoXOR1I4').trim().replace(/\s+/g, '');
    const apiUrl = 'https://skalapay.net/api/cash-in';
    const description = skalaGateway?.productName || 'produto x10';

    const host = request.headers.get('host') || 'bebidasexpress-oficial.vercel.app';
    const siteUrl = host.includes('localhost')
      ? 'https://bebidasexpress-oficial.vercel.app'
      : `https://${host}`;

    const payload = {
      amount: testAmount,
      payment_method: 'pix',
      description,
      customer_data: {
        name: 'Cliente Teste SkalaPay',
        email: 'cliente.teste@gmail.com',
        document: generateValidCPF(),
        phone: '11987654321',
      },
      postback_url: `${siteUrl}/api/payments/webhook`,
      metadata: {
        order_id: `TEST_${Date.now()}`,
      },
    };

    console.log('[TEST-SKALAPAY] Calling SkalaPay at:', apiUrl);
    const skalaRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Id': clientId,
        'X-Client-Secret': clientSecret,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await skalaRes.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawText: responseText };
    }

    if (!skalaRes.ok) {
      return NextResponse.json(
        {
          success: false,
          status: skalaRes.status,
          message: 'Erro retornado pela SkalaPay',
          error: data,
        },
        { status: skalaRes.status }
      );
    }

    const qrCode =
      data.transaction?.qr_code ||
      data.transaction?.pix_copy_paste ||
      data.acquirer_response?.qr_code ||
      data.qr_code ||
      null;

    const transactionId =
      data.transaction?.id ||
      data.transaction?.order_id ||
      data.order_id ||
      data.id;

    return NextResponse.json({
      success: true,
      message: 'PIX gerado com sucesso via SkalaPay!',
      gateway: 'SkalaPay',
      description,
      amount: testAmount,
      transactionId,
      qrCode,
      status: data.transaction?.status || 'PENDING',
    });
  } catch (error: any) {
    console.error('[TEST-SKALAPAY] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
