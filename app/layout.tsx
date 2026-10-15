import type { Metadata } from 'next';
import { Inter, Caveat } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';
import { GoogleAdsScript } from '@/components/google-ads-script';
import { prisma, withRetry } from '@/lib/db';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat' });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Zé Express - Delivery de Bebidas Rápido',
  description: 'Delivery de bebidas com entrega em até 10-19 minutos. Cervejas, destilados, vinhos e muito mais!',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Zé Express - Delivery de Bebidas Rápido',
    description: 'Delivery de bebidas com entrega em até 10-19 minutos',
    images: ['/og-image.png'],
  },
};

async function getActiveAdsTags() {
  try {
    const tags = await withRetry(() => prisma.googleAdsTag.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { awId: true, conversionLabel: true },
    }));
    return tags.map(t => ({ awId: t.awId, conversionLabel: t.conversionLabel || '' }));
  } catch {
    return [];
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adsTags = await getActiveAdsTags();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${inter.variable} ${caveat.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          <GoogleAdsScript tags={adsTags} />
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
