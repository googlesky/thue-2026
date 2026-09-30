/**
 * PWA Utilities for Thue-2026
 * Handles service worker registration, update detection, and offline status
 */

// Chỉ tải lại trang khi người dùng chủ động bấm "Cập nhật ngay" (không tự reload làm mất dữ liệu đang nhập)
let reloadOnControllerChange = false;

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
 * Kích hoạt service worker mới đang chờ (người dùng đã đồng ý cập nhật) → trang tải lại khi SW mới nắm quyền
 */
export function skipWaiting(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) {
    reloadOnControllerChange = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

// ===== UPDATE DETECTION =====

/**
 * Báo khi có service worker mới đã cài xong và đang chờ kích hoạt.
 * Dựa trên sự kiện updatefound (không thăm dò định kỳ) nên "Để sau" không bị hiện lại liên tục;
 * chỉ báo lại khi có phiên bản mới hơn nữa.
 * @param callback Called when an update is available
 */
export function onServiceWorkerUpdate(
  callback: (registration: ServiceWorkerRegistration) => void
): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  let active = true;
  let registration: ServiceWorkerRegistration | null = null;

  // Có controller = đây là bản cập nhật, không phải lần cài đầu tiên
  const notifyIfWaiting = () => {
    if (active && registration?.waiting && navigator.serviceWorker.controller) {
      callback(registration);
    }
  };

  const handleUpdateFound = () => {
    const installing = registration?.installing;
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed') notifyIfWaiting();
    });
  };

  // ready: đăng ký có thể chưa tồn tại lúc component mount (PWAProvider đăng ký sau)
  navigator.serviceWorker.ready.then((reg) => {
    if (!active) return;
    registration = reg;
    reg.addEventListener('updatefound', handleUpdateFound);
    if (reg.installing) handleUpdateFound();
    notifyIfWaiting(); // Bản mới đã chờ sẵn từ lần truy cập trước
  });

  // Lần cài đầu, clients.claim() cũng phát controllerchange → chỉ reload khi người dùng đã bấm cập nhật
  const handleControllerChange = () => {
    if (reloadOnControllerChange) window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

  // Return cleanup function
  return () => {
    active = false;
    registration?.removeEventListener('updatefound', handleUpdateFound);
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
