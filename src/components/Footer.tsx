'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// Constants
const FOOTER_LINKS = {
  quickLinks: [
    { href: '/', label: 'Trang chủ' },
    { href: '/tinh-thue', label: 'Tính thuế TNCN' },
    { href: '/tinh-thue?tab=gross-net', label: 'Quy đổi GROSS-NET' },
    { href: '/tinh-thue?tab=annual-settlement', label: 'Quyết toán thuế' },
  ],
  tools: [
    { href: '/tinh-thue?tab=bonus-calculator', label: 'Thuế thưởng Tết' },
    { href: '/tinh-thue?tab=esop-calculator', label: 'Thuế ESOP' },
    { href: '/tinh-thue?tab=overtime', label: 'Lương tăng ca' },
    { href: '/tinh-thue?tab=table', label: 'Biểu thuế suất' },
  ],
  resources: [
    { href: '/tinh-thue?tab=tax-history', label: 'Hướng dẫn sử dụng', external: false },
    { href: 'https://github.com/googlesky/thue-2026', label: 'Mã nguồn GitHub', external: true },
    { href: 'mailto:support@1devops.io', label: 'Liên hệ hỗ trợ', external: true },
  ],
} as const;

// GitHub Icon SVG Component
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

// Arrow Up Icon SVG Component
function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 10l7-7m0 0l7 7m-7-7v18"
      />
    </svg>
  );
}

// Calculator Icon SVG Component (for logo)
function CalculatorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

// Vietnam Flag Component
function VietnamFlag({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 30 20"
      aria-hidden="true"
    >
      <rect width="30" height="20" fill="#DA251D" />
      <polygon
        points="15,4 16.76,9.41 22.5,9.41 17.87,12.88 19.63,18.29 15,14.82 10.37,18.29 12.13,12.88 7.5,9.41 13.24,9.41"
        fill="#FFFF00"
      />
    </svg>
  );
}

// External Link Icon SVG Component
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

// Footer Link Component
interface FooterLinkProps {
  href: string;
  label: string;
  external?: boolean;
}

function FooterLink({ href, label, external }: FooterLinkProps) {
  const baseClasses = "group flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors duration-200 py-1";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
      >
        <span className="group-hover:underline underline-offset-2">{label}</span>
        <ExternalLinkIcon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  return (
    <Link href={href} className={baseClasses}>
      <span className="group-hover:underline underline-offset-2">{label}</span>
    </Link>
  );
}

// Footer Section Title Component
function FooterSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
      {children}
    </h3>
  );
}

export default function Footer() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Handle scroll to show/hide back to top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowBackToTop(scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    setIsScrolling(true);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

    // Reset scrolling state after animation completes
    setTimeout(() => {
      setIsScrolling(false);
    }, 500);
  }, []);

  // Handle keyboard navigation for back to top button
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      scrollToTop();
    }
  }, [scrollToTop]);

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-300"
      role="contentinfo"
      aria-label="Chân trang website"
    >
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            {/* Logo */}
            <Link
              href="/"
              className="inline-flex items-center gap-3 group mb-4"
              aria-label="Trang chủ Thue2026"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-primary-500/20 transition-transform group-hover:scale-105">
                <CalculatorIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-white">
                  Thue<span className="text-primary-400">2026</span>
                </span>
              </div>
            </Link>

            {/* Description */}
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
              Công cụ tính thuế TNCN trực tuyến miễn phí, hỗ trợ tính lương GROSS-NET và quyết toán thuế năm.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/googlesky/thue-2026"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors duration-200 group"
                aria-label="Xem mã nguồn trên GitHub"
              >
                <GitHubIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <FooterSectionTitle>Liên kết nhanh</FooterSectionTitle>
            <nav aria-label="Liên kết nhanh">
              <ul className="space-y-2">
                {FOOTER_LINKS.quickLinks.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Tools */}
          <div>
            <FooterSectionTitle>Công cụ</FooterSectionTitle>
            <nav aria-label="Danh sách công cụ">
              <ul className="space-y-2">
                {FOOTER_LINKS.tools.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Resources */}
          <div>
            <FooterSectionTitle>Tài nguyên</FooterSectionTitle>
            <nav aria-label="Danh sách tài nguyên">
              <ul className="space-y-2">
                {FOOTER_LINKS.resources.map((link) => (
                  <li key={link.href}>
                    <FooterLink
                      href={link.href}
                      label={link.label}
                      external={link.external}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>&copy; 2024-{currentYear} Thue2026</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline">Tất cả quyền được bảo lưu</span>
            </div>

            {/* Center - Made in Vietnam Badge */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Made with</span>
              <span className="text-red-500" aria-label="tình yêu">&#10084;</span>
              <span>in</span>
              <span className="inline-flex items-center gap-1.5">
                <VietnamFlag className="w-5 h-3.5 rounded-sm" />
                <span className="font-medium text-slate-300">Vietnam</span>
              </span>
            </div>

            {/* Version */}
            <div className="text-sm text-slate-500">
              <span className="px-2 py-1 bg-slate-800/50 rounded text-xs font-mono">
                v1.1.0
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        onKeyDown={handleKeyDown}
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        } ${isScrolling ? 'animate-pulse' : ''}`}
        aria-label="Quay lại đầu trang"
        tabIndex={showBackToTop ? 0 : -1}
      >
        <ArrowUpIcon className="w-5 h-5" />
      </button>
    </footer>
  );
}
