import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`checkout:${ip}`, RATE_LIMITS.CHECKOUT);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    const existingSession = await withRetry(() => prisma.checkoutSession.findFirst({
      where: { customerEmail: body.customerEmail },
    }));

    if (existingSession) {
      // IMPORTANTE: Nunca resetar completedToPix ou pixCodeCopied uma vez que foram true
      // Isso evita que o cliente "volte" para abandonado após gerar/copiar PIX
      const updated = await withRetry(() => prisma.checkoutSession.update({
        where: { id: existingSession.id },
        data: {
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          address: body.address,
          complement: body.complement || '',
          items: body.items,
          subtotal: body.subtotal,
          deliveryFee: body.deliveryFee,
          total: body.total,
          // Só atualiza para true, nunca para false (mantém o valor existente se já for true)
          completedToPix: existingSession.completedToPix || body.completedToPix || false,
          pixCodeCopied: existingSession.pixCodeCopied || body.pixCodeCopied || false,
        },
      }));
      return NextResponse.json({ success: true, id: updated.id });
    }

    const session = await withRetry(() => prisma.checkoutSession.create({
      data: {
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        address: body.address,
        complement: body.complement || '',
        items: body.items,
        subtotal: body.subtotal,
        deliveryFee: body.deliveryFee,
        total: body.total,
        completedToPix: body.completedToPix || false,
      },
    }));

    return NextResponse.json({ success: true, id: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save session' }, { status: 500 });
  }
}
