/**
 * PWA Utilities for Thue-2026
 * Handles service worker registration, update detection, and offline status
 */

// ===== TYPES =====

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isWaiting: boolean;
  isActive: boolean;
  registration: ServiceWorkerRegistration | null;
}

export interface PWAInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ===== SERVICE WORKER REGISTRATION =====

/**
 * Register the service worker
 * @returns Promise with registration result
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Check for updates periodically (every hour)
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
    console.log('[PWA] All Service Workers unregistered');
    return true;
  } catch (error) {
    console.error('[PWA] Unregister failed:', error);
    return false;
  }
}

/**
 * Get current service worker status
 */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  const status: ServiceWorkerStatus = {
    isSupported: false,
    isRegistered: false,
    isWaiting: false,
    isActive: false,
    registration: null,
  };

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return status;
  }

  status.isSupported = true;

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {
      status.isRegistered = true;
      status.registration = registration;
      status.isWaiting = !!registration.waiting;
      status.isActive = !!registration.active;
    }
  } catch (error) {
    console.error('[PWA] Failed to get SW status:', error);
  }

  return status;
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

// ===== UPDATE DETECTION =====

/**
 * Listen for service worker updates
 * @param callback Called when an update is available
 */
export function onServiceWorkerUpdate(
  callback: (registration: ServiceWorkerRegistration) => void
): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handleUpdate = () => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        callback(registration);
      }
    });
  };

  // Listen for controller change (new SW activated)
  const handleControllerChange = () => {
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

  // Check periodically for updates
  const intervalId = setInterval(handleUpdate, 60 * 1000);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  };
}

// ===== OFFLINE DETECTION =====

/**
 * Get current online status
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

/**
 * Listen for online/offline status changes
 * @param callback Called with online status
 */
export function onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ===== PWA INSTALL PROMPT =====

let deferredPrompt: PWAInstallEvent | null = null;

/**
 * Check if PWA can be installed
 */
export function canInstallPWA(): boolean {
  return deferredPrompt !== null;
}

/**
 * Listen for install prompt
 * @param callback Called when install prompt is available
 */
export function onInstallPromptAvailable(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as PWAInstallEvent;
    callback();
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  };
}

/**
 * Trigger PWA installation prompt
 * @returns Promise with user choice
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available');
    return null;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt result:', outcome);

    deferredPrompt = null;
    return outcome;
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error);
    return null;
  }
}

/**
 * Check if app is running as installed PWA
 */
export function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check display-mode media query
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // iOS Safari specific check
  const isIOSPWA =
    'standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true;

  return isStandalone || isIOSPWA;
}

// ===== CACHE MANAGEMENT =====

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[PWA] All caches cleared');
    return true;
  } catch (error) {
    console.error('[PWA] Failed to clear caches:', error);
    return false;
  }
}

/**
 * Get cache storage estimate
 */
export async function getCacheStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
} | null> {
  if (typeof window === 'undefined' || !('storage' in navigator) || !('estimate' in navigator.storage)) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, percentUsed };
  } catch (error) {
    console.error('[PWA] Failed to get storage estimate:', error);
    return null;
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get service worker version
 */
export async function getServiceWorkerVersion(): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  if (!registration.active) {
    return null;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data?.version || null);
    };

    if (registration.active) {
      registration.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
    } else {
      resolve(null);
      return;
    }

    // Timeout after 2 seconds
    setTimeout(() => resolve(null), 2000);
  });
}
