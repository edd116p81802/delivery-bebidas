'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { GeolocationProvider } from '@/lib/geolocation-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always wrap in SessionProvider to avoid useSession errors
  return (
    <SessionProvider>
      {mounted ? (
        <GeolocationProvider>{children}</GeolocationProvider>
      ) : (
        children
      )}
    </SessionProvider>
  );
}
