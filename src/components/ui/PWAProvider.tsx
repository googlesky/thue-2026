'use client';

import { useEffect, ReactNode } from 'react';
import { registerServiceWorker } from '@/lib/pwaUtils';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAUpdatePrompt } from './PWAUpdatePrompt';

interface PWAProviderProps {
  children: ReactNode;
}

/**
 * PWAProvider Component
 * Quản lý service worker registration và các PWA features
 */
export function PWAProvider({ children }: PWAProviderProps) {
  useEffect(() => {
    // Register service worker on mount
    // Only in production or when explicitly enabled
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_ENABLE_SW === 'true'
    ) {
      registerServiceWorker().then((registration) => {
        if (registration) {
          console.log('[PWA] Service Worker registered successfully');
        }
      });
    }
  }, []);

  return (
    <>
      <OfflineIndicator />
      <PWAUpdatePrompt />
      {children}
    </>
  );
}

export default PWAProvider;
