import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PROTECTED: requires ADMIN auth - exposes sensitive store config
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const settings = await prisma.settings.findMany();
    
    const settingsObj: Record<string, string> = {};
    for (const s of settings) {
      settingsObj[s.key] = s.value;
    }

    return NextResponse.json({
      storeName: settingsObj.storeName || 'Zé Express',
      deliveryFee: parseFloat(settingsObj.deliveryFee || '8.7'),
      freeDeliveryThreshold: parseFloat(settingsObj.freeDeliveryThreshold || '29.9'),
      estimatedDeliveryTime: parseInt(settingsObj.estimatedDeliveryTime || '19'),
      storeOpen: settingsObj.storeOpen === 'true',
      whatsappNumber: settingsObj.whatsappNumber || '',
      pixKey: settingsObj.pixKey || '',
      pixKeyType: settingsObj.pixKeyType || 'cpf',
      pixReceiverName: settingsObj.pixReceiverName || 'Zé Express'
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}
