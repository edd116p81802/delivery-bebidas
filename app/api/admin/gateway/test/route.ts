import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { executeGatewayPix, generateValidCPF, GatewayExecutionParams } from '@/lib/gateway-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  try {
    const body = await request.json();
    const {
      name,
      apiUrl,
      endpoint,
      productName,
      authHeaderName,
      authHeaderPrefix,
      publicKey,
      privateKey,
      valueFormat,
      responseQrCodePath,
      responsePixCodePath,
      responseTransactionId,
      payloadTemplate,
      amount,
    } = body;

    if (!apiUrl) {
      return NextResponse.json({ error: 'URL da API é obrigatória' }, { status: 400 });
    }
    if (!privateKey) {
      return NextResponse.json({ error: 'Chave Privada / Secret é obrigatória' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'bebidasexpress-oficial.vercel.app';
    const siteUrl = host.includes('localhost')
      ? 'https://bebidasexpress-oficial.vercel.app'
      : `https://${host}`;

    const gatewayParams: GatewayExecutionParams = {
      name: name || 'Gateway Teste',
      apiUrl,
      endpoint: endpoint || '/cash-in',
      productName: productName || 'produto x10',
      authHeaderName,
      authHeaderPrefix,
      publicKey,
      privateKey,
      valueFormat: valueFormat || 'reais',
      responseQrCodePath,
      responsePixCodePath,
      responseTransactionId,
      payloadTemplate,
    };

    const testAmount = amount && Number(amount) > 0 ? Number(amount) : 25.0;

    const testOrder = {
      orderId: `TEST_MODAL_${Date.now()}`,
      customerName: 'Cliente Teste Painel',
      customerCpf: generateValidCPF(),
      customerEmail: 'cliente.teste@gmail.com',
      customerPhone: '11987654321',
      amount: testAmount,
    };

    const result = await executeGatewayPix(gatewayParams, testOrder, siteUrl);

    return NextResponse.json({
      success: result.success,
      gatewayName: gatewayParams.name,
      amount: testAmount,
      httpStatus: result.httpStatus,
      qrCode: result.qrCode,
      qrCodeImage: result.qrCodeImage,
      transactionId: result.transactionId,
      error: result.error,
      details: result.details,
      rawResponse: result.rawResponse,
    });
  } catch (error: any) {
    console.error('[GATEWAY-TEST-ARBITRARY] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao testar configuração' },
      { status: 500 }
    );
  }
}
