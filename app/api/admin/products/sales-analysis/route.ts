import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') || 'metrics'; // metrics ou db
  const order = searchParams.get('order') || 'desc'; // desc = mais vendidos, asc = menos vendidos
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;

  try {
    // Buscar TODOS os produtos do catalogo
    const allProducts = await prisma.product.findMany({
      select: { id: true, name: true, imageUrl: true, finalPrice: true }
    });

    // Inicializar todos os produtos com 0 vendas
    const productSales: Record<string, { name: string; imageUrl: string; quantity: number; revenue: number }> = {};
    for (const p of allProducts) {
      productSales[p.name.toLowerCase()] = {
        name: p.name,
        imageUrl: p.imageUrl,
        quantity: 0,
        revenue: 0
      };
    }

    if (source === 'metrics') {
      // Buscar de CheckoutSession.items (metricas temporarias - pode ser zerado)
      const settings = await prisma.settings.findUnique({
        where: { key: 'app_settings' },
        select: { metricsResetAt: true }
      });
      const metricsResetAt = settings?.metricsResetAt;
      const dateFilter = metricsResetAt ? { createdAt: { gt: metricsResetAt } } : {};

      const sessions = await prisma.checkoutSession.findMany({
        where: dateFilter,
        select: { items: true }
      });

      for (const session of sessions) {
        const items = session.items as any[];
        if (Array.isArray(items)) {
          for (const item of items) {
            const name = item.name || 'Produto';
            const nameKey = name.toLowerCase();
            const qty = item.quantity || 1;
            const price = item.finalPrice || item.price || 0;
            
            if (productSales[nameKey]) {
              productSales[nameKey].quantity += qty;
              productSales[nameKey].revenue += price * qty;
            } else {
              // Produto vendido mas nao existe mais no catalogo
              productSales[nameKey] = {
                name,
                imageUrl: '/placeholder.png',
                quantity: qty,
                revenue: price * qty
              };
            }
          }
        }
      }

    } else {
      // Buscar de CheckoutSession.items (DB completo - dados permanentes)
      const sessions = await prisma.checkoutSession.findMany({
        select: { items: true }
      });

      for (const session of sessions) {
        const items = session.items as any[];
        if (Array.isArray(items)) {
          for (const item of items) {
            const name = item.name || 'Produto';
            const nameKey = name.toLowerCase();
            const qty = item.quantity || 1;
            const price = item.finalPrice || item.price || 0;
            
            if (productSales[nameKey]) {
              productSales[nameKey].quantity += qty;
              productSales[nameKey].revenue += price * qty;
            } else {
              productSales[nameKey] = {
                name,
                imageUrl: '/placeholder.png',
                quantity: qty,
                revenue: price * qty
              };
            }
          }
        }
      }
    }

    // Converter para array
    let salesData = Object.values(productSales);

    // Ordenar
    if (order === 'desc') {
      salesData.sort((a, b) => b.quantity - a.quantity);
    } else {
      // Menos vendidos primeiro (0 vendas no topo)
      salesData.sort((a, b) => a.quantity - b.quantity);
    }

    // Paginar
    const total = salesData.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedData = salesData.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      products: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Sales analysis error:', error);
    return NextResponse.json({ error: 'Erro ao carregar analise' }, { status: 500 });
  }
}
