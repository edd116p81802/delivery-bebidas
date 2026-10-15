import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma, withRetry } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Delete individual verification code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await withRetry(() => prisma.verificationCode.delete({
      where: { id: params.id },
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting verification code:', error);
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}

// Update status (REJECTED, INCORRECT_CODE)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!['REJECTED', 'INCORRECT_CODE'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const updated = await withRetry(() => prisma.verificationCode.update({
      where: { id: params.id },
      data: { status },
    }));

    return NextResponse.json({ success: true, status: updated.status });
  } catch (error) {
    console.error('Error updating verification code status:', error);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}
