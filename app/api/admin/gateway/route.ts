import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET - Retorna TODOS os gateways
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  try {
    const gateways = await prisma.gateway.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    // Ocultar chaves sensíveis, mas indicar se existem
    const safeGateways = gateways.map((g) => ({
      ...g,
      publicKey: undefined,
      privateKey: undefined,
      hasPublicKey: !!g.publicKey,
      hasPrivateKey: !!g.privateKey,
    }));

    return NextResponse.json({ gateways: safeGateways });
  } catch (error) {
    console.error('Erro ao buscar gateways:', error);
    return NextResponse.json({ error: 'Erro ao buscar gateways' }, { status: 500 });
  }
}

// POST - Criar novo gateway (NÃO desativa os outros)
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

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

    if (!name || !privateKey || !apiUrl) {
      return NextResponse.json(
        { error: 'Nome, Chave Privada e URL da API são obrigatórios' },
        { status: 400 }
      );
    }

    const gateway = await prisma.gateway.create({
      data: {
        name,
        publicKey: publicKey || '',
        privateKey,
        apiUrl,
        productName: productName || 'Bebida',
        isActive: false, // NÃO ativa automaticamente
        endpoint: endpoint || '/sales/create-sale',
        authHeaderName: authHeaderName || 'X-API-Key',
        authHeaderPrefix: authHeaderPrefix || '',
        valueFormat: valueFormat || 'centavos',
        responseQrCodePath: responseQrCodePath || 'data.paymentData.qrCodeBase64',
        responsePixCodePath: responsePixCodePath || 'data.paymentData.copyPaste',
        responseTransactionId: responseTransactionId || 'data.transactionId',
        payloadTemplate: payloadTemplate || null,
      },
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
    console.error('Erro ao criar gateway:', error);
    return NextResponse.json({ error: 'Erro ao criar gateway' }, { status: 500 });
  }
}
