import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { hidden: false },
      orderBy: { orderIndex: "asc" },
      include: { _count: { select: { products: { where: { hidden: false } } } } },
    });
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao buscar categorias" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const cat = await prisma.category.create({ data });
    return NextResponse.json(cat);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 });
  }
}
