import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email não fornecido' }, { status: 400 });
    }

    const session = await prisma.checkoutSession.findFirst({
      where: { customerEmail: email },
    });

    if (session) {
      await prisma.checkoutSession.update({
        where: { id: session.id },
        data: { pixCodeCopied: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pix copied error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
