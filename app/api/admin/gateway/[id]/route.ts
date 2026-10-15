import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Buscar gateway específico
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const { id } = await params;

  try {
    const gateway = await prisma.gateway.findUnique({ where: { id } });

    if (!gateway) {
      return NextResponse.json({ error: 'Gateway não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      gateway: {
        ...gateway,
        publicKey: undefined,
        privateKey: undefined,
        hasPublicKey: !!gateway.publicKey,
        hasPrivateKey: !!gateway.privateKey,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar gateway:', error);
    return NextResponse.json({ error: 'Erro ao buscar gateway' }, { status: 500 });
  }
}

// PUT - Atualizar gateway específico
export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      name,
      publicKey,
      privateKey,
      apiUrl,
      productName,
      endpoint,
      authHeaderName,
      authHeaderPrefix,
      valueFormat,
      responseQrCodePath,
      responsePixCodePath,
      responseTransactionId,
      payloadTemplate,
    } = body;

    // Verificar se gateway existe
    const existing = await prisma.gateway.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Gateway não encontrado' }, { status: 404 });
    }

    // Construir dados de atualização (apenas campos fornecidos)
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (publicKey !== undefined) updateData.publicKey = publicKey;
    if (privateKey !== undefined) updateData.privateKey = privateKey;
    if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
    if (productName !== undefined) updateData.productName = productName;
    if (endpoint !== undefined) updateData.endpoint = endpoint;
    if (authHeaderName !== undefined) updateData.authHeaderName = authHeaderName;
    if (authHeaderPrefix !== undefined) updateData.authHeaderPrefix = authHeaderPrefix;
    if (valueFormat !== undefined) updateData.valueFormat = valueFormat;
    if (responseQrCodePath !== undefined) updateData.responseQrCodePath = responseQrCodePath;
    if (responsePixCodePath !== undefined) updateData.responsePixCodePath = responsePixCodePath;
    if (responseTransactionId !== undefined) updateData.responseTransactionId = responseTransactionId;
    if (payloadTemplate !== undefined) updateData.payloadTemplate = payloadTemplate;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const gateway = await prisma.gateway.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      gateway: {
        ...gateway,
        publicKey: undefined,
        privateKey: undefined,
        hasPublicKey: !!gateway.publicKey,
        hasPrivateKey: !!gateway.privateKey,
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar gateway:', error);
    return NextResponse.json({ error: 'Erro ao atualizar gateway' }, { status: 500 });
  }
}

// DELETE - Excluir gateway específico
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const { id } = await params;

  try {
    const existing = await prisma.gateway.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Gateway não encontrado' }, { status: 404 });
    }

    await prisma.gateway.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir gateway:', error);
    return NextResponse.json({ error: 'Erro ao excluir gateway' }, { status: 500 });
  }
}
