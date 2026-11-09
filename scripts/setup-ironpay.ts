import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying current gateways...');
  const currentGateways = await prisma.gateway.findMany();
  console.log('Existing gateways:', currentGateways.map(g => ({ id: g.id, name: g.name, isActive: g.isActive })));

  // Deactivate all
  await prisma.gateway.updateMany({
    data: { isActive: false }
  });

  const ironData = {
    name: 'IronPay',
    publicKey: 'y3mvnis5fa', // product_hash
    privateKey: 'SU78sWfRQ4FjuWvtLkq9P38w2uwDfHB4KKWBoBfdytTqagEct9wnBhkCrF0M',
    apiUrl: 'https://api.ironpayapp.com.br/api/public/v1',
    endpoint: '/transactions',
    productName: 'Bebida',
    isActive: true,
    authHeaderName: 'none',
    authHeaderPrefix: '',
    valueFormat: 'centavos',
    responseQrCodePath: 'pix.pix_url',
    responsePixCodePath: 'pix.pix_qr_code',
    responseTransactionId: 'hash',
    payloadTemplate: 'efvbs', // offer_hash
  };

  const existingIron = await prisma.gateway.findFirst({
    where: { name: { contains: 'Iron', mode: 'insensitive' } }
  });

  if (existingIron) {
    console.log('Updating existing IronPay gateway:', existingIron.id);
    const updated = await prisma.gateway.update({
      where: { id: existingIron.id },
      data: ironData,
    });
    console.log('Updated IronPay gateway:', updated);
  } else {
    console.log('Creating new IronPay gateway...');
    const created = await prisma.gateway.create({
      data: ironData,
    });
    console.log('Created IronPay gateway:', created);
  }

  const active = await prisma.gateway.findFirst({ where: { isActive: true } });
  console.log('Active gateway now is:', active?.name, 'ID:', active?.id);
}

main()
  .catch(err => {
    console.error('Error setting up IronPay:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
