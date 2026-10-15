const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRawUnsafe('SELECT 1 as test');
  console.log('Neon connected successfully via PrismaClient!', result);
}
main().catch(err => {
  console.error('Prisma connection error:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
