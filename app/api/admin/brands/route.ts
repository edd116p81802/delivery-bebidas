import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

// GET - Listar marcas que estão em uso nos produtos
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  try {
    // Buscar marcas únicas dos produtos (apenas as que estão em uso)
    const productsWithBrands = await prisma.product.findMany({
      where: {
        brand: {
          not: null
        }
      },
      select: {
        brand: true
      },
      distinct: ['brand']
    });

    // Extrair marcas únicas e ordenar
    const brandsInUse = productsWithBrands
      .map((p: { brand: string | null }) => p.brand)
      .filter((brand: string | null): brand is string => brand !== null)
      .sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'));

    // Buscar marcas cadastradas no banco
    const registeredBrands = await prisma.brand.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ 
      brandsInUse, 
      registeredBrands 
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

// POST - Criar nova marca
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome da marca é obrigatório' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Verificar se já existe
    const existing = await prisma.brand.findUnique({
      where: { name: trimmedName }
    });

    if (existing) {
      return NextResponse.json({ error: 'Marca já existe' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: { name: trimmedName }
    });

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}
