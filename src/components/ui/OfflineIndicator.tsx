'use client';

import { useState, useEffect } from 'react';
import { isOnline, onOnlineStatusChange } from '@/lib/pwaUtils';

/**
 * OfflineIndicator Component
 * Hiển thị banner khi mất kết nối mạng (kể cả khi mở trang lúc đang offline)
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const handleStatus = (status: boolean) => {
      clearTimeout(hideTimer);
      setOnline(status);
      setShowBanner(true);
      // Có mạng lại (sự kiện 'online' chỉ phát sau khi đã offline): báo ngắn rồi ẩn
      if (status) hideTimer = setTimeout(() => setShowBanner(false), 3000);
    };

    // Mở trang khi đang offline — đọc navigator.onLine trong effect để không lệch khi hydrate
    if (!isOnline()) handleStatus(false);
    const unsubscribe = onOnlineStatusChange(handleStatus);

    return () => {
      clearTimeout(hideTimer);
      unsubscribe();
    };
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-3 text-center text-sm font-medium text-white ${
        online ? 'bg-rise' : 'bg-amber-700'
      }`}
      role="alert"
    >
      <div className="flex items-center justify-center gap-2">
        {online ? (
          <>
            <svg
              className="w-5 h-5 flex-shrink-0"
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
              className="w-5 h-5 flex-shrink-0"
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
            <span>Không có kết nối mạng – đang dùng dữ liệu đã lưu</span>
          </>
        )}
        {!online && (
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="ml-2 sm:ml-4 p-1 rounded hover:bg-white/20 transition-colors flex-shrink-0"
            aria-label="Đóng thông báo"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
