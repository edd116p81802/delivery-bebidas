import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return false;
  }
  return true;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const brands = await prisma.brandKnowledge.findMany({
      orderBy: { usageCount: "desc" },
    });
    return NextResponse.json(brands);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const data = await req.json();
    const { brandName, displayName, alcoholContent, category, volume } = data;
    const normalized = brandName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
    const existing = await prisma.brandKnowledge.findUnique({ where: { brandName: normalized } });
    if (existing) {
      const updated = await prisma.brandKnowledge.update({
        where: { id: existing.id },
        data: { displayName, alcoholContent, category, volume, usageCount: { increment: 1 } },
      });
      return NextResponse.json(updated);
    }
    const created = await prisma.brandKnowledge.create({
      data: { brandName: normalized, displayName, alcoholContent, category, volume, source: "manual" },
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
