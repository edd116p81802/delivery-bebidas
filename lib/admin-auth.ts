import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return { 
      authorized: false, 
      error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    };
  }
  
  return { authorized: true, session };
}
