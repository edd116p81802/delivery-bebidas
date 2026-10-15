import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  try {
    // Buscar configuracao de metricsResetAt
    const settings = await prisma.settings.findUnique({
      where: { key: 'app_settings' },
      select: { metricsResetAt: true }
    });
    const metricsResetAt = settings?.metricsResetAt;

    // Buscar TODAS as CheckoutSessions (para DB total)
    const allSessions = await prisma.checkoutSession.findMany({
      select: { items: true, createdAt: true }
    });

    // Calcular vendas por produto
    const sales: Record<string, { metricsQty: number; dbQty: number }> = {};

    for (const session of allSessions) {
      const items = session.items as any[];
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const name = (item.name || 'Produto').toLowerCase();
        const qty = item.quantity || 1;

        if (!sales[name]) {
          sales[name] = { metricsQty: 0, dbQty: 0 };
        }

        // DB total (sempre soma)
        sales[name].dbQty += qty;

        // Metricas (apenas se apos metricsResetAt ou se nao ha reset)
        if (!metricsResetAt || session.createdAt > metricsResetAt) {
          sales[name].metricsQty += qty;
        }
      }
    }

    return NextResponse.json({ sales });

  } catch (error) {
    console.error('Sales data error:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados de vendas' }, { status: 500 });
  }
}
