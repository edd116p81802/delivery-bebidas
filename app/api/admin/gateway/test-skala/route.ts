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

    const clientId = (skalaGateway?.publicKey || 'xlux97_5yygfqtcmdgewm4kwz3w1nhr').trim().replace(/\s+/g, '');
    const clientSecret = (skalaGateway?.privateKey || 'OFSBQxVoOp53PRQgVJ5Su4lxJI1qcKIOkrGv9cpn7bpNiCQ6r1K2wozUrzKsUmNX').trim().replace(/\s+/g, '');
    const apiUrl = 'https://skalapay.net/api/cash-in';
    const description = skalaGateway?.productName || 'produto x10';

    const host = request.headers.get('host') || 'bebidasexpress-oficial.vercel.app';
    const siteUrl = host.includes('localhost')
      ? 'https://bebidasexpress-oficial.vercel.app'
      : `https://${host}`;

    const payload = {
      amount: 5.0,
      payment_method: 'pix',
      description,
      customer_data: {
        name: 'Cliente Teste SkalaPay',
        email: 'cliente.teste@gmail.com',
        document: '07153496057',
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
      amount: 5.0,
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
