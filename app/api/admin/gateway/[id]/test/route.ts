import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { executeGatewayPix, generateValidCPF } from '@/lib/gateway-engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const { id } = await params;

  try {
    const gateway = await prisma.gateway.findUnique({ where: { id } });
    if (!gateway) {
      return NextResponse.json({ error: 'Gateway não encontrado' }, { status: 404 });
    }

    if (!gateway.privateKey) {
      return NextResponse.json(
        { error: 'Gateway não possui chave privada/secret configurada.' },
        { status: 400 }
      );
    }

    // Determine host
    const host = request.headers.get('host') || 'bebidasexpress-oficial.vercel.app';
    const siteUrl = host.includes('localhost')
      ? 'https://bebidasexpress-oficial.vercel.app'
      : `https://${host}`;

    // Read optional custom test amount from body
    let testAmount = 25.0; // Default R$ 25,00 to satisfy SkalaPay min R$ 20 and Pix Black min R$ 6
    try {
      const body = await request.json().catch(() => ({}));
      if (body?.amount && Number(body.amount) > 0) {
        testAmount = Number(body.amount);
      }
    } catch {
      // ignore
    }

    const testOrder = {
      orderId: `TEST_${Date.now()}`,
      customerName: 'Cliente Teste Dashboard',
      customerCpf: generateValidCPF(),
      customerEmail: 'teste.dashboard@gmail.com',
      customerPhone: '11987654321',
      amount: testAmount,
    };

    const result = await executeGatewayPix(gateway, testOrder, siteUrl);

    return NextResponse.json({
      success: result.success,
      gatewayName: gateway.name,
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
    console.error('[GATEWAY-TEST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao testar gateway' },
      { status: 500 }
    );
  }
}
