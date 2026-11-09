import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WEBHOOK] Received payload:', JSON.stringify(body));
    
    // Support IronPay (transaction_hash / hash), Monetrix (transactionId / externalRef), and Avem Pay (idTransaction / external_id)
    const transactionId =
      body.transaction_hash ||
      body.hash ||
      body.transaction ||
      body.transactionId ||
      body.idTransaction ||
      body.transaction_id ||
      body.id ||
      (body.data && (body.data.transaction_hash || body.data.hash || body.data.transaction || body.data.transactionId || body.data.id));

    const externalRef =
      body.external_id ||
      body.externalRef ||
      body.orderId ||
      body.externalReference ||
      (body.data && (body.data.external_id || body.data.externalRef || body.data.orderId));

    const rawStatus = String(
      body.status ||
      body.payment_status ||
      body.paymentStatus ||
      (body.data && (body.data.status || body.data.payment_status)) ||
      ''
    ).toLowerCase();

    if (!transactionId && !externalRef) {
      console.warn('[WEBHOOK] Missing transaction identifier in body:', body);
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    let order = null;
    if (externalRef) {
      order = await prisma.order.findUnique({ where: { id: String(externalRef) } });
    }
    if (!order && transactionId) {
      order = await prisma.order.findFirst({ where: { pixTransactionId: String(transactionId) } });
    }

    if (!order) {
      console.warn('[WEBHOOK] Order not found for:', { transactionId, externalRef });
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    let paymentStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED' = 'PROCESSING';
    
    if (rawStatus === 'approved' || rawStatus === 'paid' || rawStatus === 'completed' || rawStatus === 'success') {
      paymentStatus = 'PAID';
    } else if (rawStatus === 'expired') {
      paymentStatus = 'EXPIRED';
    } else if (rawStatus === 'cancelled' || rawStatus === 'canceled' || rawStatus === 'refunded') {
      paymentStatus = 'CANCELLED';
    } else if (rawStatus === 'failed') {
      paymentStatus = 'FAILED';
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        pixPaidAt: paymentStatus === 'PAID' ? new Date() : undefined,
        status: paymentStatus === 'PAID' ? 'CONFIRMED' : order.status,
      },
    });

    console.log(`[WEBHOOK] Order ${order.id} updated to ${paymentStatus}`);
    return NextResponse.json({ success: true, status: 'ok' });
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}
