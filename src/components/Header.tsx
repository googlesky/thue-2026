'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';

interface HeaderProps {
  variant?: 'transparent' | 'solid';
  showSpacer?: boolean;
}

export default function Header({ variant = 'solid', showSpacer = true }: HeaderProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on outside click
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      isMobileMenuOpen &&
      mobileMenuRef.current &&
      menuButtonRef.current &&
      !mobileMenuRef.current.contains(event.target as Node) &&
      !menuButtonRef.current.contains(event.target as Node)
    ) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileMenuOpen]);

  // Close mobile menu on Escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const isHomePage = pathname === '/';
  const isCalculatorPage = pathname === '/tinh-thue';
  const isGuidePage = pathname === '/huong-dan';

  // Dynamic header styles based on variant and scroll state
  const headerBaseStyles = variant === 'transparent' && !isScrolled
    ? 'bg-transparent'
    : 'bg-paper/95 backdrop-blur-sm border-b border-line';

  const logoTextStyles = variant === 'transparent' && !isScrolled
    ? 'text-white'
    : 'text-primary-700';

  const navLinkBaseStyles = variant === 'transparent' && !isScrolled
    ? 'text-white/90 hover:text-white hover:bg-white/10 focus:ring-2 focus:ring-white/30 focus:outline-none'
    : 'text-primary-500 hover:text-primary-700 hover:bg-primary-50 focus:ring-2 focus:ring-primary-500/30 focus:outline-none';

  const navLinkActiveStyles = variant === 'transparent' && !isScrolled
    ? 'text-white bg-white/20 ring-1 ring-white/30'
    : 'text-primary-700 bg-primary-50';

  const mobileMenuButtonStyles = variant === 'transparent' && !isScrolled
    ? 'text-white hover:bg-white/10 focus:ring-2 focus:ring-white/30'
    : 'text-primary-500 hover:bg-primary-50 focus:ring-2 focus:ring-primary-500/30';

  return (
    <>
      {/* Skip to main content link - accessible but visually hidden */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
      >
        Chuyển đến nội dung chính
      </a>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${headerBaseStyles}`}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo and Brand */}
            <Link
              href="/"
              className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary-500/50 rounded-xl p-1 -ml-1"
              aria-label="Thue2026 - Trang chủ"
            >
              <span
                className="w-9 h-9 rounded-md bg-primary-600 text-white font-data text-[13px] font-semibold flex items-center justify-center tracking-tight"
                aria-hidden="true"
              >
                26
              </span>
              <div className="flex flex-col">
                <span className={`font-bold text-lg leading-tight transition-colors duration-300 ${logoTextStyles}`}>
                  Thuế<span className="text-primary-400">2026</span>
                </span>
                <span className={`hidden sm:block text-[11px] leading-tight transition-colors duration-300 ${variant === 'transparent' && !isScrolled ? 'text-white/70' : 'text-primary-300'}`}>
                  Thuế TNCN & lương
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5" role="navigation" aria-label="Menu chính">
              <Link
                href="/"
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isHomePage ? navLinkActiveStyles : navLinkBaseStyles
                }`}
                aria-current={isHomePage ? 'page' : undefined}
              >
                <span className="relative z-10">Trang chủ</span>
                {isHomePage && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>
              <Link
                href="/tinh-thue"
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isCalculatorPage ? navLinkActiveStyles : navLinkBaseStyles
                }`}
                aria-current={isCalculatorPage ? 'page' : undefined}
              >
                <span className="relative z-10">Tính thuế</span>
                {isCalculatorPage && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>
              <Link
                href="/#thay-doi"
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isGuidePage ? navLinkActiveStyles : navLinkBaseStyles
                }`}
              >
                <span className="relative z-10">Thay đổi 2026</span>
              </Link>
            </nav>

            {/* CTA Button (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              {!isCalculatorPage && (
                <Link
                  href="/tinh-thue"
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                >
                  Tính thuế ngay
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-1">
              <button
                ref={menuButtonRef}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2.5 rounded-xl transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none ${mobileMenuButtonStyles}`}
                aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
              <div className="relative w-6 h-6">
                {/* Hamburger to X animation */}
                <span
                  className={`absolute left-0 block w-6 h-0.5 transform transition-all duration-300 ease-out ${
                    variant === 'transparent' && !isScrolled ? 'bg-white' : 'bg-gray-600'
                  } ${isMobileMenuOpen ? 'rotate-45 top-[11px]' : 'top-1'}`}
                />
                <span
                  className={`absolute left-0 block w-6 h-0.5 top-[11px] transform transition-all duration-300 ease-out ${
                    variant === 'transparent' && !isScrolled ? 'bg-white' : 'bg-gray-600'
                  } ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}`}
                />
                <span
                  className={`absolute left-0 block w-6 h-0.5 transform transition-all duration-300 ease-out ${
                    variant === 'transparent' && !isScrolled ? 'bg-white' : 'bg-gray-600'
                  } ${isMobileMenuOpen ? '-rotate-45 top-[11px]' : 'top-[21px]'}`}
                />
              </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Navigation Menu */}
      <div
        ref={mobileMenuRef}
        id="mobile-menu"
        className={`fixed top-16 sm:top-18 left-0 right-0 z-50 md:hidden transform transition-all duration-300 ease-out ${
          isMobileMenuOpen
            ? 'translate-y-0 opacity-100 visible'
            : '-translate-y-4 opacity-0 invisible pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng di động"
      >
        <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-2xl shadow-gray-900/10">
          <nav className="px-4 py-4 space-y-1" role="navigation" aria-label="Menu di động">
            <Link
              href="/"
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                isHomePage
                  ? 'text-primary-600 bg-primary-50 ring-1 ring-primary-500/20'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 active:bg-gray-200/80'
              }`}
              aria-current={isHomePage ? 'page' : undefined}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Trang chủ
            </Link>
            <Link
              href="/tinh-thue"
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                isCalculatorPage
                  ? 'text-primary-600 bg-primary-50 ring-1 ring-primary-500/20'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 active:bg-gray-200/80'
              }`}
              aria-current={isCalculatorPage ? 'page' : undefined}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Tính thuế TNCN
            </Link>
            <Link
              href="/#thay-doi"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 active:bg-gray-200/80 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Thay đổi 2026
            </Link>

            {/* Mobile CTA */}
            {!isCalculatorPage && (
              <div className="pt-3">
                <Link
                  href="/tinh-thue"
                  className="flex items-center justify-center w-full px-4 py-3.5 bg-primary-600 text-white text-sm font-semibold rounded-lg active:scale-[0.98] transition-all duration-200"
                >
                  Tính thuế ngay
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Spacer for fixed header */}
      {showSpacer && <div className="h-16 sm:h-18" />}
    </>
  );
}
