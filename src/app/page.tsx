'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Type definitions
interface FeatureItem {
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bgColor: string;
  highlight?: boolean;
  badge?: string;
}

interface FeatureCategory {
  category: string;
  description: string;
  items: FeatureItem[];
}

// Animated counter component
function AnimatedCounter({
  end,
  duration = 2000,
  suffix = '',
  prefix = '',
}: {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Handle SSR - only run on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3, rootMargin: '50px' }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [isMounted, hasStarted]);

  useEffect(() => {
    if (!hasStarted || !isMounted) return;

    let startTime: number | null = null;
    let animationId: number;
    const startValue = 0;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const newCount = Math.floor(easeOutQuart * (end - startValue) + startValue);
      setCount(newCount);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [hasStarted, isMounted, end, duration]);

  // Show final value during SSR and before animation starts
  if (!isMounted) {
    return (
      <div className="counter">
        {prefix}
        {end}
        {suffix}
      </div>
    );
  }

  return (
    <div ref={ref} className="counter">
      {prefix}
      {count}
      {suffix}
    </div>
  );
}

// Feature categories with enhanced styling
const features: FeatureCategory[] = [
  {
    category: 'Tính toán',
    description: 'Công cụ tính thuế chính xác theo luật mới nhất',
    items: [
      {
        name: 'Tính thuế TNCN',
        description:
          'So sánh thuế thu nhập cá nhân giữa luật cũ (7 bậc) và luật mới 2026 (5 bậc)',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        ),
        href: '/tinh-thue#calculator',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 group-hover:bg-blue-100',
        highlight: true,
      },
      {
        name: 'GROSS - NET',
        description:
          'Quy đổi nhanh giữa lương GROSS và lương NET thực nhận',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        ),
        href: '/tinh-thue#gross-net',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 group-hover:bg-emerald-100',
      },
      {
        name: 'Tính lương tăng ca',
        description: 'Tính tiền lương làm thêm giờ theo quy định pháp luật',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        href: '/tinh-thue#overtime',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 group-hover:bg-orange-100',
      },
      {
        name: 'Quyết toán thuế năm',
        description:
          'Tính thuế phải nộp hoặc hoàn lại khi quyết toán cuối năm',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
        ),
        href: '/tinh-thue#annual-settlement',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 group-hover:bg-purple-100',
      },
      {
        name: 'Thuế thưởng Tết',
        description:
          'Tính thuế thưởng Tết, lương tháng 13 và các khoản thưởng khác',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        href: '/tinh-thue#bonus-calculator',
        color: 'text-red-600',
        bgColor: 'bg-red-50 group-hover:bg-red-100',
      },
      {
        name: 'Thuế ESOP/Cổ phiếu',
        description:
          'Tính thuế khi nhận cổ phiếu ưu đãi từ công ty (ESOP)',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        ),
        href: '/tinh-thue#esop-calculator',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 group-hover:bg-indigo-100',
      },
      {
        name: 'Lương hưu',
        description: 'Ước tính lương hưu dựa trên thời gian đóng BHXH',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
        href: '/tinh-thue#pension',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50 group-hover:bg-cyan-100',
      },
    ],
  },
  {
    category: 'So sánh',
    description: 'Phân tích và so sánh thu nhập giữa các phương án',
    items: [
      {
        name: 'Chi phí nhà tuyển dụng',
        description:
          'Tính tổng chi phí mà doanh nghiệp phải trả cho một nhân viên',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        ),
        href: '/tinh-thue#employer-cost',
        color: 'text-slate-600',
        bgColor: 'bg-slate-50 group-hover:bg-slate-100',
      },
      {
        name: 'Freelancer vs Hợp đồng',
        description:
          'So sánh thu nhập giữa làm việc tự do và ký hợp đồng lao động',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        ),
        href: '/tinh-thue#freelancer',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50 group-hover:bg-teal-100',
      },
      {
        name: 'So sánh offer lương',
        description:
          'So sánh thu nhập thực tế giữa nhiều công ty và offers',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
        href: '/tinh-thue#salary-compare',
        color: 'text-pink-600',
        bgColor: 'bg-pink-50 group-hover:bg-pink-100',
      },
      {
        name: 'So sánh theo năm',
        description: 'Xem biến động thuế và thu nhập qua các năm',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
        ),
        href: '/tinh-thue#yearly',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 group-hover:bg-amber-100',
      },
    ],
  },
  {
    category: 'Tham khảo',
    description: 'Tra cứu thông tin và biểu thuế chi tiết',
    items: [
      {
        name: 'Biểu thuế lũy tiến',
        description: 'Tra cứu bảng thuế suất theo từng bậc thu nhập',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        ),
        href: '/tinh-thue#table',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 group-hover:bg-gray-100',
      },
      {
        name: 'Chi tiết bảo hiểm',
        description:
          'Xem chi tiết các khoản BHXH, BHYT, BHTN phải đóng',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        ),
        href: '/tinh-thue#insurance',
        color: 'text-green-600',
        bgColor: 'bg-green-50 group-hover:bg-green-100',
      },
      {
        name: 'Thu nhập khác',
        description:
          'Tính thuế cho thu nhập ngoài lương (đầu tư, cho thuê...)',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
        href: '/tinh-thue#other-income',
        color: 'text-violet-600',
        bgColor: 'bg-violet-50 group-hover:bg-violet-100',
      },
      {
        name: 'Lịch sử Luật thuế',
        description: 'Xem các mốc thay đổi của Luật thuế TNCN qua các năm',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        ),
        href: '/tinh-thue#tax-history',
        color: 'text-stone-600',
        bgColor: 'bg-stone-50 group-hover:bg-stone-100',
      },
    ],
  },
  {
    category: 'Công cụ mới',
    description: 'Tính năng mới được cập nhật gần đây',
    items: [
      {
        name: 'Mẹo tối ưu thuế',
        description:
          'Gợi ý cách giảm thuế hợp pháp dựa trên thu nhập của bạn',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        ),
        href: '/tinh-thue#calculator',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 group-hover:bg-yellow-100',
        badge: 'Mới',
      },
      {
        name: 'Phiếu lương',
        description:
          'Tạo phiếu lương chi tiết với đầy đủ các khoản thu và khấu trừ',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
        href: '/tinh-thue#salary-slip',
        color: 'text-rose-600',
        bgColor: 'bg-rose-50 group-hover:bg-rose-100',
        badge: 'Mới',
      },
      {
        name: 'Lịch thuế',
        description:
          'Theo dõi các mốc thời gian nộp thuế quan trọng trong năm',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
        href: '/tinh-thue#tax-calendar',
        color: 'text-sky-600',
        bgColor: 'bg-sky-50 group-hover:bg-sky-100',
        badge: 'Mới',
      },
      {
        name: 'Xuất PDF',
        description:
          'Xuất báo cáo tính thuế chi tiết ra file PDF để lưu trữ',
        icon: (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
        href: '/tinh-thue#calculator',
        color: 'text-fuchsia-600',
        bgColor: 'bg-fuchsia-50 group-hover:bg-fuchsia-100',
        badge: 'Mới',
      },
    ],
  },
];

// Comparison data for hero section
const comparisonData = {
  old: {
    brackets: 7,
    personalDeduction: 11,
    dependentDeduction: 4.4,
    maxRate: 35,
  },
  new: {
    brackets: 5,
    personalDeduction: 15.5,
    dependentDeduction: 6.2,
    maxRate: 30,
  },
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden">
      {/* Shared Header - Transparent variant for hero, no spacer needed */}
      <Header variant="transparent" showSpacer={false} />

      {/* Hero Section - Modern Gradient with Animated Blobs */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient Orbs */}
          <div
            className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-blob"
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          />
          <div
            className="absolute top-1/4 -right-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-blob animation-delay-200"
            style={{ transform: `translateY(${scrollY * 0.15}px)` }}
          />
          <div
            className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-blob animation-delay-400"
            style={{ transform: `translateY(${scrollY * -0.1}px)` }}
          />

          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

          {/* Radial Gradient Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.5)_100%)]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-20 sm:pb-28 lg:pb-32">
          <div className="text-center">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2.5 px-5 py-2.5 glass rounded-full text-sm text-white/90 mb-8 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              <span className="font-medium">
                Cập nhật Luật Thuế TNCN mới nhất - có hiệu lực từ 1/7/2026
              </span>
            </div>

            {/* Main Title */}
            <h1
              className={`text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 ${mounted ? 'animate-slide-up animation-delay-100' : 'opacity-0'}`}
            >
              <span className="text-white">Tính Thuế TNCN </span>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                2026
              </span>
            </h1>

            {/* Subtitle with Animation */}
            <p
              className={`text-xl sm:text-2xl lg:text-3xl text-blue-200/80 font-light mb-4 ${mounted ? 'animate-slide-up animation-delay-200' : 'opacity-0'}`}
            >
              Miễn phí &middot; Chính xác &middot; Dễ sử dụng
            </p>

            {/* Description */}
            <p
              className={`text-lg text-blue-100/60 max-w-2xl mx-auto mb-12 leading-relaxed ${mounted ? 'animate-slide-up animation-delay-300' : 'opacity-0'}`}
            >
              Công cụ tính thuế thu nhập cá nhân toàn diện nhất Việt Nam. So
              sánh luật cũ và luật mới 2026, quy đổi GROSS-NET, quyết toán thuế
              năm, và nhiều hơn nữa.
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 ${mounted ? 'animate-slide-up animation-delay-400' : 'opacity-0'}`}
            >
              <Link
                href="/tinh-thue"
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] min-h-[56px] overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <svg
                  className="w-5 h-5 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="relative z-10">Bắt đầu tính thuế</span>
                <svg
                  className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>

              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 glass text-white font-medium rounded-2xl hover:bg-white/10 transition-all duration-300 min-h-[56px]"
              >
                Xem tất cả tính năng
                <svg
                  className="w-5 h-5 animate-bounce-subtle"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </a>
            </div>

            {/* Comparison Cards - Glass Morphism */}
            <div
              className={`grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto ${mounted ? 'animate-slide-up animation-delay-500' : 'opacity-0'}`}
            >
              {/* Old Law Card */}
              <div className="group glass rounded-3xl p-6 text-left transition-all duration-300 hover:bg-white/[0.08] hover:scale-[1.02]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Luật hiện hành</h3>
                    <span className="text-xs text-red-300/80">7 bậc thuế</span>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-blue-100/60">Giảm trừ bản thân</span>
                    <span className="font-semibold text-white">
                      {comparisonData.old.personalDeduction} triệu
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-blue-100/60">Giảm trừ phụ thuộc</span>
                    <span className="font-semibold text-white">
                      {comparisonData.old.dependentDeduction} triệu
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-blue-100/60">Thuế suất cao nhất</span>
                    <span className="font-semibold text-white">
                      {comparisonData.old.maxRate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* New Law Card */}
              <div className="group relative glass rounded-3xl p-6 text-left transition-all duration-300 hover:bg-white/[0.08] hover:scale-[1.02] ring-1 ring-emerald-400/30">
                {/* Highlight Gradient Border */}
                <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-blue-400/20 -z-10" />

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Luật mới 2026</h3>
                    <span className="text-xs text-emerald-300/80">
                      5 bậc thuế - Có lợi hơn
                    </span>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-blue-100/60">Giảm trừ bản thân</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      {comparisonData.new.personalDeduction} triệu
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
                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-blue-100/60">Giảm trừ phụ thuộc</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      {comparisonData.new.dependentDeduction} triệu
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
                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-blue-100/60">Thuế suất cao nhất</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      {comparisonData.new.maxRate}%
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
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="#f8fafc"
            />
          </svg>
        </div>
      </section>

      {/* Stats Section - Clean and Modern */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                value: 15,
                suffix: '+',
                label: 'Công cụ tính thuế',
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
              },
              {
                value: 100,
                suffix: '%',
                label: 'Miễn phí',
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
              },
              {
                value: 2026,
                suffix: '',
                label: 'Cập nhật luật mới',
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
              },
              {
                prefix: '24/',
                value: 7,
                suffix: '',
                label: 'Truy cập mọi lúc',
                color: 'text-orange-600',
                bgColor: 'bg-orange-50',
              },
            ].map((stat, index) => (
              <div
                key={index}
                className={`text-center p-6 rounded-2xl ${stat.bgColor} transition-all duration-300 hover:scale-105`}
              >
                <div className={`text-4xl sm:text-5xl font-bold ${stat.color} mb-2`}>
                  <AnimatedCounter
                    end={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix || ''}
                    duration={1500}
                  />
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Card Grid */}
      <section id="features" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-full mb-4">
              Tính năng
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Tất cả công cụ bạn cần
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Từ tính thuế cơ bản đến các công cụ chuyên sâu cho doanh nghiệp
              và cá nhân
            </p>
          </div>

          {/* Feature Categories */}
          {features.map((category, categoryIndex) => (
            <div key={category.category} className="mb-16 last:mb-0">
              {/* Category Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {category.category}
                    </h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>
              </div>

              {/* Feature Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {category.items.map((feature, featureIndex) => (
                  <Link
                    key={feature.name}
                    href={feature.href}
                    className={`group relative bg-white rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 border border-gray-100 hover:border-gray-200 card-hover ${
                      feature.highlight
                        ? 'ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/5'
                        : ''
                    }`}
                    style={{
                      animationDelay: `${(categoryIndex * 100 + featureIndex * 50)}ms`,
                    }}
                  >
                    {/* Badge */}
                    {feature.badge && (
                      <span className="absolute top-4 right-4 text-xs font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                        {feature.badge}
                      </span>
                    )}

                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl ${feature.bgColor} ${feature.color} flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110`}
                    >
                      {feature.icon}
                    </div>

                    {/* Content */}
                    <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {feature.name}
                    </h4>
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Hover Arrow */}
                    <div className="mt-4 flex items-center gap-1.5 text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-1">
                      <span>Sử dụng ngay</span>
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
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section - Gradient with Pattern */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
          {/* Pattern Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
          {/* Gradient Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Sẵn sàng tính thuế?
          </h2>
          <p className="text-lg sm:text-xl text-blue-100/80 mb-10 max-w-2xl mx-auto">
            Chỉ cần nhập thu nhập, hệ thống sẽ tự động tính toán và so sánh thuế
            TNCN theo cả luật cũ và luật mới cho bạn.
          </p>
          <Link
            href="/tinh-thue"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-600 font-semibold rounded-2xl shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:shadow-blue-900/30 transition-all duration-300 hover:scale-[1.02]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span>Bắt đầu ngay - Miễn phí</span>
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer - Reusable Component */}
      <Footer />
    </main>
  );
}
