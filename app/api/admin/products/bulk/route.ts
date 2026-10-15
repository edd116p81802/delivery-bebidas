import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// Ações em lote: aplicar desconto ou excluir múltiplos produtos
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const { action, productIds, discountPercent } = body;

  if (!action || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  try {
    if (action === 'delete') {
      await prisma.product.deleteMany({
        where: { id: { in: productIds } }
      });
      return NextResponse.json({ success: true, message: `${productIds.length} produto(s) excluído(s)` });
    }

    if (action === 'discount') {
      const discount = parseFloat(discountPercent) || 0;
      if (discount < 0 || discount > 100) {
        return NextResponse.json({ error: 'Desconto deve ser entre 0 e 100%' }, { status: 400 });
      }

      // Buscar produtos para calcular novo preço final
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
      });

      // Atualizar cada produto com o novo desconto e preço final
      type ProductType = typeof products[number];
      const updates = products.map((p: ProductType) => {
        const finalPrice = p.price - (p.price * discount / 100);
        return prisma.product.update({
          where: { id: p.id },
          data: {
            discount,
            finalPrice: Math.round(finalPrice * 100) / 100
          }
        });
      });

      await Promise.all(updates);
      return NextResponse.json({ success: true, message: `Desconto de ${discount}% aplicado em ${productIds.length} produto(s)` });
    }

    if (action === 'hide') {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { hidden: true }
      });
      return NextResponse.json({ success: true, message: `${productIds.length} produto(s) escondido(s)` });
    }

    if (action === 'show') {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { hidden: false }
      });
      return NextResponse.json({ success: true, message: `${productIds.length} produto(s) visível(is)` });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json({ error: 'Erro ao processar ação' }, { status: 500 });
  }
}
