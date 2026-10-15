import { Sidebar } from '@/components/admin/sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  // Check if user is admin
  if ((session.user as any)?.role !== 'ADMIN') {
    redirect('/');
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <main className="ml-[280px] p-8">{children}</main>
    </div>
  );
}
