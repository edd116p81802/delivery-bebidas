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
    // 1. Get DropPay configuration from DB (or fallback)
    const dropGateway = await prisma.gateway.findFirst({
      where: {
        OR: [
          { name: { contains: 'Drop', mode: 'insensitive' } },
          { apiUrl: { contains: 'droppay', mode: 'insensitive' } },
        ],
      },
    });

    const token = (dropGateway?.privateKey || process.env.DROPPAY_TOKEN || '').trim();
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token da DropPay não configurado no banco de dados.' },
        { status: 400 }
      );
    }
    const apiUrl = 'https://droppayofc.net/api/v1/payments/pix';
    const reference = `TEST_DROP_${Date.now()}`;

    // Valid CPF for DropPay validation
    const testCpf = '52998224725';

    const payload = {
      amount: 5.0,
      payer_name: 'Cliente Teste DropPay',
      payer_email: 'cliente.teste@gmail.com',
      payer_cpf: testCpf,
      payer_phone: '11999999999',
      reference,
    };

    console.log('[TEST-DROPPAY] Calling DropPay at:', apiUrl);
    const dropRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': `${reference}-pix`,
        ...(dropGateway?.publicKey ? { 'X-Client-ID': dropGateway.publicKey.trim() } : {}),
      },
      body: JSON.stringify(payload),
    });

    const responseText = await dropRes.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawText: responseText };
    }

    if (!dropRes.ok) {
      return NextResponse.json(
        {
          success: false,
          status: dropRes.status,
          message: 'Erro retornado pela DropPay',
          error: data,
        },
        { status: dropRes.status }
      );
    }

    const pixCode = data.data?.pix_code || data.pix_code || data.data?.qr_code || null;
    const qrCodeBase64 = data.data?.qr_code_base64 || data.qr_code_base64 || null;
    const transactionUuid = data.data?.transaction_uuid || data.transaction_uuid || null;
    const status = data.data?.status || data.status || 'pending';
    const expiresAt = data.data?.expires_at || null;

    return NextResponse.json({
      success: true,
      message: 'PIX gerado com sucesso via DropPay!',
      gateway: 'DropPay',
      amount: 5.0,
      transaction_uuid: transactionUuid,
      reference,
      pix_code: pixCode,
      has_qr_code_base64: !!qrCodeBase64,
      status,
      expires_at: expiresAt,
      raw: data,
    });
  } catch (error: any) {
    console.error('[TEST-DROPPAY] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
