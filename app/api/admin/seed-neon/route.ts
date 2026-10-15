import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GeolocationMode } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (key !== 'felipe123') {
      return NextResponse.json({ error: 'Unauthorized key parameter' }, { status: 401 });
    }

    const dataPath = path.join(process.cwd(), 'scripts', 'seed-data.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'seed-data.json not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // 1. Criar admin
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

    // 2. Criar categorias
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

    // 3. Criar produtos
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
        // ignore individual product errors
      }
    }

    // 4. Settings
    if (data.settings) {
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
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully on Neon!',
      admin: 'ze@abacusai.app / 121416',
      categoriesCount: data.categories.length,
      productsCount: productCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
