import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json({ products: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        hidden: false,
        category: { hidden: false },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { category: true },
      take: 10,
    });

    const formattedProducts = products.map((p: { id: string; name: string; imageUrl: string; price: number; discount: number; finalPrice: number; category: { name: string } | null }) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      categoryName: p.category?.name || 'Sem categoria',
      finalPrice: p.finalPrice,
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ products: [] });
  }
}
