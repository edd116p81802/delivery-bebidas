import { prisma } from "@/lib/db";
import { BrandKnowledgeClient } from "@/components/admin/brand-knowledge-client";

export const dynamic = "force-dynamic";

export default async function AdminMarcasPage() {
  const brands = await prisma.brandKnowledge.findMany({ orderBy: { usageCount: "desc" } });
  return <BrandKnowledgeClient brands={JSON.parse(JSON.stringify(brands))} />;
}
