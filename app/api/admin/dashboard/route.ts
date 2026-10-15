import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user && (session.user as any).role === "ADMIN";
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, totalProducts, totalCategories, recentOrders, ordersByStatus] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.product.count({ where: { hidden: false } }),
      prisma.category.count({ where: { hidden: false } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" }
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { status: true }
      })
    ]);

    // Calculate total revenue
    const orders = await prisma.order.findMany({
      where: { paymentStatus: "PAID" },
      select: { total: true }
    });
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    // Today's revenue
    const todayOrdersData = await prisma.order.findMany({
      where: { 
        createdAt: { gte: today },
        paymentStatus: "PAID"
      },
      select: { total: true }
    });
    const todayRevenue = todayOrdersData.reduce((sum, order) => sum + order.total, 0);

    return NextResponse.json({
      totalOrders,
      todayOrders,
      totalProducts,
      totalCategories,
      totalRevenue,
      todayRevenue,
      recentOrders,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json({ error: "Erro ao buscar dashboard" }, { status: 500 });
  }
}
