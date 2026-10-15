import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Ativar gateway específico (desativa todos os outros)
export async function PUT(_request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const { id } = await params;

  try {
    // Verificar se gateway existe
    const gateway = await prisma.gateway.findUnique({ where: { id } });
    if (!gateway) {
      return NextResponse.json({ error: 'Gateway não encontrado' }, { status: 404 });
    }

    // Desativar todos os gateways
    await prisma.gateway.updateMany({
      data: { isActive: false },
    });

    // Ativar apenas o gateway selecionado
    const updatedGateway = await prisma.gateway.update({
      where: { id },
      data: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      gateway: {
        ...updatedGateway,
        publicKey: undefined,
        privateKey: undefined,
        hasPublicKey: !!updatedGateway.publicKey,
        hasPrivateKey: !!updatedGateway.privateKey,
      },
    });
  } catch (error) {
    console.error('Erro ao ativar gateway:', error);
    return NextResponse.json({ error: 'Erro ao ativar gateway' }, { status: 500 });
  }
}
