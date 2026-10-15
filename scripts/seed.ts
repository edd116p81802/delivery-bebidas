import { PrismaClient, GeolocationMode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Importar dados do arquivo JSON
const dataPath = path.join(__dirname, 'seed-data.json');

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');
  
  // Verificar se existe o arquivo de dados
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Arquivo seed-data.json não encontrado em scripts/');
    console.log('Por favor, certifique-se que o arquivo seed-data.json está em scripts/');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // 1. Criar admin user
  console.log('👤 Criando usuário admin...');
  const hashedPassword = await bcrypt.hash('121416', 10);
  await prisma.user.upsert({
    where: { email: 'ze@abacusai.app' },
    update: { password: hashedPassword, role: 'ADMIN' },
    create: {
      email: 'ze@abacusai.app',
      name: 'Zé Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin: ze@abacusai.app / 121416');
  
  // 2. Criar categorias
  console.log('📁 Criando categorias...');
  for (const cat of data.categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        imageUrl: cat.imageUrl,
        orderIndex: cat.orderIndex,
        hidden: cat.hidden,
      },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        imageUrl: cat.imageUrl,
        orderIndex: cat.orderIndex,
        hidden: cat.hidden,
      },
    });
  }
  console.log(`✅ ${data.categories.length} categorias criadas`);
  
  // 3. Criar produtos
  console.log('📦 Criando produtos...');
  let productCount = 0;
  for (const prod of data.products) {
    try {
      await prisma.product.upsert({
        where: { id: prod.id },
        update: {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          discount: prod.discount,
          finalPrice: prod.finalPrice,
          imageUrl: prod.imageUrl,
          categoryId: prod.categoryId,
          brand: prod.brand,
          volume: prod.volume,
          alcoholContent: prod.alcoholContent,
          stock: prod.stock,
          hidden: prod.hidden,
          starOrder: prod.starOrder,
          featuredCategory: prod.featuredCategory,
          featuredCategoryOrder: prod.featuredCategoryOrder,
          featuredOffer: prod.featuredOffer,
          featuredOfferOrder: prod.featuredOfferOrder,
        },
        create: {
          id: prod.id,
          name: prod.name,
          description: prod.description,
          price: prod.price,
          discount: prod.discount,
          finalPrice: prod.finalPrice,
          imageUrl: prod.imageUrl,
          categoryId: prod.categoryId,
          brand: prod.brand,
          volume: prod.volume,
          alcoholContent: prod.alcoholContent,
          stock: prod.stock,
          hidden: prod.hidden,
          starOrder: prod.starOrder,
          featuredCategory: prod.featuredCategory,
          featuredCategoryOrder: prod.featuredCategoryOrder,
          featuredOffer: prod.featuredOffer,
          featuredOfferOrder: prod.featuredOfferOrder,
        },
      });
      productCount++;
    } catch (e) {
      console.error(`Erro ao criar produto ${prod.name}:`, e);
    }
  }
  console.log(`✅ ${productCount} produtos criados`);
  
  // 4. Criar settings
  console.log('⚙️ Criando configurações...');
  for (const setting of data.settings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        geolocationMode: setting.geolocationMode as GeolocationMode,
      },
      create: {
        key: setting.key,
        value: setting.value,
        geolocationMode: setting.geolocationMode as GeolocationMode,
      },
    });
  }
  console.log(`✅ ${data.settings.length} configurações criadas`);
  
  // 5. Criar brand knowledge
  console.log('🧠 Criando conhecimento de marcas...');
  for (const brand of data.brandKnowledge) {
    await prisma.brandKnowledge.upsert({
      where: { id: brand.id },
      update: {
        brandName: brand.brandName,
        displayName: brand.displayName,
        alcoholContent: brand.alcoholContent,
        category: brand.category,
        volume: brand.volume,
        source: brand.source,
        confidence: brand.confidence,
      },
      create: {
        id: brand.id,
        brandName: brand.brandName,
        displayName: brand.displayName,
        alcoholContent: brand.alcoholContent,
        category: brand.category,
        volume: brand.volume,
        source: brand.source,
        confidence: brand.confidence,
      },
    });
  }
  console.log(`✅ ${data.brandKnowledge.length} marcas criadas`);
  
  console.log('');
  console.log('🎉 Seed concluído com sucesso!');
  console.log('');
  console.log('📋 Resumo:');
  console.log(`   - Admin: ze@abacusai.app / 121416`);
  console.log(`   - Categorias: ${data.categories.length}`);
  console.log(`   - Produtos: ${productCount}`);
  console.log(`   - Configurações: ${data.settings.length}`);
  console.log(`   - Marcas: ${data.brandKnowledge.length}`);
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
