import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'orderId é obrigatório' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verificar se o PIX expirou
    if (order.pixExpiresAt && new Date() > new Date(order.pixExpiresAt)) {
      if (order.paymentStatus !== 'EXPIRED') {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'EXPIRED' },
        });
      }
      return NextResponse.json({ paymentStatus: 'EXPIRED' });
    }

    return NextResponse.json({ paymentStatus: order.paymentStatus });
  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 });
  }
}
