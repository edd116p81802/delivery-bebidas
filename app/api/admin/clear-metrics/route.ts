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
    if (confirmation !== 'ZERAR METRICAS') {
      return NextResponse.json(
        { error: 'Digite "ZERAR METRICAS" para confirmar' },
        { status: 400 }
      );
    }

    // Salvar timestamp de reset em vez de deletar dados
    // Isso permite que /admin/clientes e /admin/cartoes continuem mostrando TODOS os dados
    // Enquanto o Dashboard só mostra dados APÓS este timestamp
    const now = new Date();
    
    await prisma.settings.upsert({
      where: { key: 'app_settings' },
      update: { metricsResetAt: now },
      create: { key: 'app_settings', value: '{}', metricsResetAt: now }
    });

    return NextResponse.json({ success: true, message: 'Métricas zeradas com sucesso' });
  } catch (error) {
    console.error('Error clearing metrics:', error);
    return NextResponse.json({ error: 'Erro ao zerar métricas' }, { status: 500 });
  }
}
