'use client';

import { useState, useEffect } from 'react';
import { onServiceWorkerUpdate, skipWaiting } from '@/lib/pwaUtils';

/**
 * PWAUpdatePrompt Component
 * Hiển thị thông báo khi có phiên bản mới
 */
export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onServiceWorkerUpdate((reg) => {
      setRegistration(reg);
      setShowPrompt(true);
    });

    return unsubscribe;
  }, []);

  const handleUpdate = () => {
    if (!registration) return;

    setIsUpdating(true);
    skipWaiting(registration);

    // Page will reload automatically via controllerchange event
    // But add fallback reload after 3 seconds
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9998] p-4 rounded-lg shadow-xl bg-white border border-gray-200"
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-desc"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3
            id="pwa-update-title"
            className="font-semibold text-gray-900"
          >
            Có phiên bản mới
          </h3>
          <p
            id="pwa-update-desc"
            className="mt-1 text-sm text-gray-600"
          >
            Một phiên bản mới của ứng dụng đã sẵn sàng. Cập nhật ngay để có trải nghiệm tốt nhất.
          </p>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang cập nhật...
                </span>
              ) : (
                'Cập nhật ngay'
              )}
            </button>
            <button
              onClick={handleDismiss}
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Để sau
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          disabled={isUpdating}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label="Đóng"
        >
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default PWAUpdatePrompt;
