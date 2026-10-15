import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { OrdersAdmin } from './orders-admin';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session?.user as any)?.role !== 'ADMIN') {
    redirect('/login');
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <OrdersAdmin
      orders={(orders ?? [])?.map?.((o) => ({
        id: o?.id ?? '',
        customerName: o?.customerName ?? '',
        customerEmail: o?.customerEmail ?? '',
        customerPhone: o?.customerPhone ?? '',
        address: o?.address ?? '',
        total: o?.total ?? 0,
        status: o?.status ?? 'PENDING',
        paymentMethod: o?.paymentMethod ?? '',
        createdAt: o?.createdAt?.toISOString?.() ?? '',
      }))}
    />
  );
}
