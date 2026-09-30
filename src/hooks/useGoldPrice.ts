'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchGoldPrices,
  type GoldPrice,
  type GoldTypeCode,
  POPULAR_GOLD_TYPES,
} from '@/lib/goldPriceService';

export interface UseGoldPriceReturn {
  prices: GoldPrice[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  getPrice: (typeCode: GoldTypeCode) => GoldPrice | undefined;
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 phút

export function useGoldPrice(autoRefresh = true): UseGoldPriceReturn {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0); // Chỉ nhận kết quả của lần gọi mới nhất (chặn race khi làm mới chồng nhau)
  const lastFetchRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => isMountedRef.current && requestId === requestIdRef.current;
    lastFetchRef.current = Date.now();
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchGoldPrices();
      if (!isCurrent()) return;

      // Filter to popular types and sort
      const filtered = response.data.filter(p =>
        POPULAR_GOLD_TYPES.includes(p.typeCode)
      );
      // Keep order of POPULAR_GOLD_TYPES
      const sorted = POPULAR_GOLD_TYPES
        .map(code => filtered.find(p => p.typeCode === code))
        .filter((p): p is GoldPrice => p != null);

      // If we got fewer than expected, add any remaining
      const remaining = filtered.filter(
        p => !sorted.some(s => s.typeCode === p.typeCode)
      );

      setPrices([...sorted, ...remaining]);
      // Thời điểm cập nhật giá theo API (giây Unix), không phải lúc tải trang
      setLastUpdated(new Date(response.currentTime * 1000));
    } catch (err) {
      if (!isCurrent()) return;
      // Service đã đổi lỗi mạng/HTTP thành thông báo tiếng Việt
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể lấy giá vàng. Vui lòng thử lại.'
      );
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
      }
    }
  }, []);

  const getPrice = useCallback(
    (typeCode: GoldTypeCode): GoldPrice | undefined => {
      return prices.find(p => p.typeCode === typeCode);
    },
    [prices]
  );

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  // Auto refresh — tạm dừng khi tab ẩn, quay lại thì làm mới nếu dữ liệu đã cũ
  useEffect(() => {
    if (!autoRefresh) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(refresh, REFRESH_INTERVAL);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearInterval(timer);
        return;
      }
      if (Date.now() - lastFetchRef.current >= REFRESH_INTERVAL) refresh();
      start();
    };

    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, refresh]);

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    refresh,
    getPrice,
  };
}
