import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  try {
    const body = await request.json();
    const { confirmation } = body;

    // Exigir confirmação por texto
    if (confirmation !== 'APAGAR CLIENTES') {
      return NextResponse.json(
        { error: 'Digite "APAGAR CLIENTES" para confirmar' },
        { status: 400 }
      );
    }

    // Deletar todas as sessões de checkout
    await prisma.checkoutSession.deleteMany({});

    return NextResponse.json({ success: true, message: 'Clientes apagados com sucesso' });
  } catch (error) {
    console.error('Error clearing clients:', error);
    return NextResponse.json({ error: 'Erro ao apagar clientes' }, { status: 500 });
  }
}
