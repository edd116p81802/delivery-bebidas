import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (key !== 'felipe123') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash('Expressze@2026', 10);
    const user = await prisma.user.upsert({
      where: { email: 'ze@abacusai.app' },
      update: { password: hashedPassword, role: 'ADMIN' },
      create: {
        email: 'ze@abacusai.app',
        name: 'Bebidas Express Admin',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Senha atualizada com sucesso para Expressze@2026!',
      email: user.email,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
