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

    // Se já estiver pago, retorna imediatamente
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ paymentStatus: 'PAID' });
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

    // Se ainda está pendente/processando e possui pixTransactionId, verificar diretamente na adquirente (TiggerPay)
    if (
      order.pixTransactionId &&
      (order.paymentStatus === 'PENDING' || order.paymentStatus === 'PROCESSING')
    ) {
      try {
        const activeGateway = await prisma.gateway.findFirst({
          where: {
            OR: [
              { isActive: true },
              { name: { contains: 'Tigger', mode: 'insensitive' } },
            ],
          },
        });

        const isTigger =
          activeGateway?.name?.toLowerCase().includes('tigger') ||
          activeGateway?.apiUrl?.includes('tiggerpayments');

        const isSkala =
          activeGateway?.name?.toLowerCase().includes('skala') ||
          activeGateway?.name?.toLowerCase().includes('skale') ||
          activeGateway?.apiUrl?.includes('skala');

        if (isTigger && activeGateway?.privateKey) {
          const verifyUrl = `https://api.tiggerpayments.com/api/verificar-pix/${order.pixTransactionId}`;
          const verifyRes = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
              'x-api-key': activeGateway.privateKey.trim(),
              'Accept': 'application/json',
            },
          });

          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            const status = String(verifyData.status || '').toLowerCase();
            console.log(`[CHECK-STATUS] TiggerPay status for order ${orderId}: ${status}`);

            if (status === 'approved' || status === 'paid' || status === 'pago') {
              await prisma.order.update({
                where: { id: orderId },
                data: {
                  paymentStatus: 'PAID',
                  pixPaidAt: new Date(),
                  status: 'CONFIRMED',
                },
              });
              return NextResponse.json({ paymentStatus: 'PAID' });
            }
          }
        } else if (isSkala && activeGateway?.publicKey && activeGateway?.privateKey) {
          const verifyUrl = `https://skalapay.net/api/cash-in/${order.pixTransactionId}`;
          const verifyRes = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
              'X-Client-Id': activeGateway.publicKey.trim(),
              'X-Client-Secret': activeGateway.privateKey.trim(),
              'Accept': 'application/json',
            },
          });

          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            const status = String(verifyData.status || verifyData.data?.status || '').toLowerCase();
            const isPaid = verifyData.is_paid || verifyData.paid || status === 'paid' || status === 'approved';
            console.log(`[CHECK-STATUS] SkalaPay status for order ${orderId}: ${status}, isPaid: ${isPaid}`);

            if (isPaid) {
              await prisma.order.update({
                where: { id: orderId },
                data: {
                  paymentStatus: 'PAID',
                  pixPaidAt: new Date(),
                  status: 'CONFIRMED',
                },
              });
              return NextResponse.json({ paymentStatus: 'PAID' });
            }
          }
        }
      } catch (pollErr) {
        console.warn('[CHECK-STATUS] Erro ao consultar status da adquirente:', pollErr);
      }
    }

    return NextResponse.json({ paymentStatus: order.paymentStatus });
  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 });
  }
}
