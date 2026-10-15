import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { transactionId, status, externalRef } = body;

    if (!transactionId && !externalRef) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    let order;
    if (externalRef) {
      order = await prisma.order.findUnique({ where: { id: externalRef } });
    } else if (transactionId) {
      order = await prisma.order.findFirst({ where: { pixTransactionId: transactionId.toString() } });
    }

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    let paymentStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED' = 'PROCESSING';
    
    if (status === 'approved' || status === 'paid' || status === 'completed') {
      paymentStatus = 'PAID';
    } else if (status === 'expired') {
      paymentStatus = 'EXPIRED';
    } else if (status === 'cancelled' || status === 'refunded') {
      paymentStatus = 'CANCELLED';
    } else if (status === 'failed') {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}
