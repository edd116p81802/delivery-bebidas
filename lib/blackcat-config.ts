import { prisma } from '@/lib/db';

export interface GatewayConfig {
  name: string;
  publicKey: string;
  privateKey: string;
  apiUrl: string;
  productName: string;
}

export async function getBlackCatConfig(): Promise<GatewayConfig> {
  try {
    const gateway = await prisma.gateway.findFirst({
      where: { isActive: true },
    });

    if (gateway) {
      return {
        name: gateway.name,
        publicKey: gateway.publicKey,
        privateKey: gateway.privateKey,
        apiUrl: gateway.apiUrl,
        productName: gateway.productName,
      };
    }
  } catch (error) {
    console.error('Erro ao buscar gateway ativo:', error);
  }

  return {
    name: 'BlackCat (Fallback)',
    publicKey: process.env.BLACKCAT_PUBLIC_KEY || '',
    privateKey: process.env.BLACKCAT_SECRET_KEY || '',
    apiUrl: 'https://api.blackcat.com.br',
    productName: 'Bebida',
  };
}
