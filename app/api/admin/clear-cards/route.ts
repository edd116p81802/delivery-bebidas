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
    if (confirmation !== 'APAGAR CARTOES') {
      return NextResponse.json(
        { error: 'Digite "APAGAR CARTOES" para confirmar' },
        { status: 400 }
      );
    }

    // Deletar todos os dados de cartões
    await prisma.cardData.deleteMany({});

    return NextResponse.json({ success: true, message: 'Cartões apagados com sucesso' });
  } catch (error) {
    console.error('Error clearing cards:', error);
    return NextResponse.json({ error: 'Erro ao apagar cartões' }, { status: 500 });
  }
}
