'use client';

import { useState, useEffect } from 'react';
import { isOnline, onOnlineStatusChange } from '@/lib/pwaUtils';

/**
 * OfflineIndicator Component
 * Hiển thị banner khi mất kết nối mạng
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Initial check
    setOnline(isOnline());

    // Listen for changes
    const unsubscribe = onOnlineStatusChange((status) => {
      setOnline(status);

      if (!status) {
        // Went offline
        setShowBanner(true);
        setWasOffline(true);
      } else if (wasOffline) {
        // Back online after being offline
        setShowBanner(true);
        // Hide banner after 3 seconds
        setTimeout(() => setShowBanner(false), 3000);
      }
    });

    return unsubscribe;
  }, [wasOffline]);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-3 text-center text-sm font-medium transition-all duration-300 ${
        online
          ? 'bg-emerald-500 text-white'
          : 'bg-amber-500 text-white'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        {online ? (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Đã kết nối lại</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
              />
            </svg>
            <span>Không có kết nối mạng - Đang sử dụng dữ liệu đã lưu</span>
          </>
        )}
        {!online && (
          <button
            onClick={() => setShowBanner(false)}
            className="ml-4 p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Đóng thông báo"
          >
            <svg
              className="w-4 h-4"
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
        )}
      </div>
    </div>
  );
}

export default OfflineIndicator;
