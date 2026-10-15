'use client';

import Script from 'next/script';

interface AdsTag {
  awId: string;
  conversionLabel: string;
}

// Server-side component that receives tags as props
export function GoogleAdsScript({ tags }: { tags: AdsTag[] }) {
  if (!tags || tags.length === 0) return null;

  const firstId = tags[0].awId;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=AW-${firstId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${tags.map(t => `gtag('config', 'AW-${t.awId}');`).join('\n          ')}
        `}
      </Script>
    </>
  );
}

// Helper to fire conversion events - fetches tags fresh to avoid stale closures
export async function fireGoogleAdsConversion({
  transactionId,
  value,
  currency = 'BRL',
}: {
  transactionId: string;
  value: number;
  currency?: string;
}) {
  if (typeof window === 'undefined') return;

  try {
    // Fetch tags fresh to avoid stale closure issues
    const res = await fetch('/api/google-ads-tags');
    const tags: AdsTag[] = await res.json();

    if (!Array.isArray(tags) || tags.length === 0) {
      console.warn('[GoogleAds] No active tags found');
      return;
    }

    // Wait for gtag to be available (may still be loading)
    const waitForGtag = (): Promise<void> => {
      return new Promise((resolve) => {
        if ((window as any).gtag) {
          resolve();
          return;
        }
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if ((window as any).gtag || attempts > 50) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    };

    await waitForGtag();

    const gtag = (window as any).gtag;
    if (!gtag) {
      console.warn('[GoogleAds] gtag not available');
      return;
    }

    tags.forEach(tag => {
      if (tag.conversionLabel) {
        console.log(`[GoogleAds] Firing conversion: AW-${tag.awId}/${tag.conversionLabel}, value=${value}, txn=${transactionId}`);
        gtag('event', 'conversion', {
          send_to: `AW-${tag.awId}/${tag.conversionLabel}`,
          value: value,
          currency: currency,
          transaction_id: transactionId,
        });
      } else {
        console.warn(`[GoogleAds] Tag AW-${tag.awId} has no conversionLabel, skipping conversion event`);
      }
    });
  } catch (err) {
    console.error('[GoogleAds] Error firing conversion:', err);
  }
}
