import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma, withRetry } from '@/lib/db';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`orders:${ip}`, RATE_LIMITS.CHECKOUT);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    const order = await withRetry(() => prisma.order.create({
      data: {
        customerName: body.customerName,
        customerEmail: body.customerEmail || 'cliente@email.com',
        customerPhone: body.customerPhone,
        customerCpf: body.customerCpf || null,
        address: body.address,
        complement: body.complement || '',
        items: body.items,
        subtotal: body.subtotal,
        deliveryFee: body.deliveryFee,
        total: body.total,
        status: 'PENDING',
        paymentMethod: body.paymentMethod,
        paymentData: body.paymentData,
      },
    }));

    return NextResponse.json({ success: true, id: order.id });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const orders = await withRetry(() => prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
