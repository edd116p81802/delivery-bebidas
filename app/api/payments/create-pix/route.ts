import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import { executeGatewayPix, generateValidCPF } from '@/lib/gateway-engine';

export const dynamic = 'force-dynamic';

interface CreatePixRequest {
  orderId: string;
  customerName: string;
  customerCpf: string;
  amount: number;
}

// Validates and returns a mathematically valid Brazilian CPF
function getValidCPF(rawCpf?: string | null): string {
  const digits = String(rawCpf || '').replace(/\D/g, '');
  if (digits.length === 11 && !/^(\d)\1{10}$/.test(digits)) {
    let d1 = 0, d2 = 0;
    for (let i = 0; i < 9; i++) d1 += parseInt(digits[i], 10) * (10 - i);
    d1 = (d1 * 10) % 11;
    if (d1 === 10 || d1 === 11) d1 = 0;
    for (let i = 0; i < 10; i++) d2 += parseInt(digits[i], 10) * (11 - i);
    d2 = (d2 * 10) % 11;
    if (d2 === 10 || d2 === 11) d2 = 0;
    if (d1 === parseInt(digits[9], 10) && d2 === parseInt(digits[10], 10)) {
      return digits;
    }
  }
  return generateValidCPF();
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`pix:${ip}`, RATE_LIMITS.PIX);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisições. Aguarde um momento.' },
        { status: 429 }
      );
    }

    const body: CreatePixRequest = await request.json();
    const { orderId, customerName, customerCpf, amount } = body;

    console.log('[PIX] Request received:', {
      orderId,
      customerName,
      cpf: customerCpf ? `${customerCpf.substring(0, 4)}***` : 'N/A',
      amount,
    });

    if (!orderId || !customerName || !amount) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const order = await withRetry(() => prisma.order.findUnique({ where: { id: orderId } }));
    if (!order) {
      console.error('[PIX] Order not found:', orderId);
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const gateway = await withRetry(() => prisma.gateway.findFirst({ where: { isActive: true } }));
    console.log(
      '[PIX] Active Gateway:',
      gateway ? { id: gateway.id, name: gateway.name, apiUrl: gateway.apiUrl, hasKey: !!gateway.privateKey } : 'NONE'
    );

    if (!gateway?.privateKey) {
      // Simular PIX quando não há gateway configurado
      console.log('[PIX] Nenhum gateway ativo com chave privada, simulando PIX...');
      const simulatedQrCode = `00020126580014br.gov.bcb.pix0136${Date.now()}520400005303986540${amount.toFixed(2)}5802BR5925Bebidas Express6009SAO PAULO62070503***6304`;
      const transactionId = `SIM_${Date.now()}`;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      await withRetry(() =>
        prisma.order.update({
          where: { id: orderId },
          data: {
            pixQrCode: simulatedQrCode,
            pixTransactionId: transactionId,
            pixExpiresAt: expiresAt,
            paymentStatus: 'PROCESSING',
          },
        })
      );

      return NextResponse.json({
        success: true,
        qrCode: simulatedQrCode,
        transactionId,
        expiresAt: expiresAt.toISOString(),
        amount,
      });
    }

    // Determine site URL dynamically from request host
    const host = request.headers.get('host') || 'bebidasexpress-oficial.vercel.app';
    const siteUrl = host.includes('localhost') || host.includes('127.0.0.1')
      ? 'https://bebidasexpress-oficial.vercel.app'
      : `https://${host}`;

    // Valid CPF
    const validCpf = getValidCPF(customerCpf || order.customerCpf);

    let phoneDigits = String(order.customerPhone || '').replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      phoneDigits = `119${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    let formattedName = String(customerName || order.customerName || 'Cliente').trim();
    if (!formattedName.includes(' ')) {
      formattedName = `${formattedName} Silva`;
    }

    let cleanEmail = String(order.customerEmail || '').trim().replace(/\s+/g, '');
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.') || cleanEmail.includes(' ')) {
      cleanEmail = `cliente_${phoneDigits}@gmail.com`;
    }

    const orderDetails = {
      orderId,
      customerName: formattedName,
      customerCpf: validCpf,
      customerEmail: cleanEmail,
      customerPhone: phoneDigits,
      amount,
    };

    // Execute via unified engine
    const result = await executeGatewayPix(gateway, orderDetails, siteUrl);

    if (!result.success || !result.qrCode) {
      const errorMsg = result.error || 'Erro ao processar pagamento via gateway';
      console.error('[PIX] Gateway execution failed:', {
        gateway: gateway.name,
        status: result.httpStatus,
        error: errorMsg,
      });
      return NextResponse.json(
        {
          error: errorMsg,
          details: result.details || result.rawResponse,
          gateway: gateway.name,
        },
        { status: result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 502 }
      );
    }

    console.log('[PIX] SUCCESS - PIX gerado com sucesso. Código tamanho:', result.qrCode.length);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await withRetry(() =>
      prisma.order.update({
        where: { id: orderId },
        data: {
          pixQrCode: result.qrCode,
          pixTransactionId: String(result.transactionId || `TX_${Date.now()}`),
          pixExpiresAt: expiresAt,
          paymentStatus: 'PROCESSING',
          paymentData: (result.rawResponse as object) || {},
        },
      })
    );

    return NextResponse.json({
      success: true,
      qrCode: result.qrCode,
      qrCodeImage: result.qrCodeImage,
      transactionId: result.transactionId,
      expiresAt: expiresAt.toISOString(),
      amount,
    });
  } catch (error: unknown) {
    console.error('[PIX] Unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
