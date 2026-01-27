'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme } from '@/contexts/ThemeContext';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ReactNode;
}

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SystemIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Sáng', icon: <SunIcon /> },
  { value: 'dark', label: 'Tối', icon: <MoonIcon /> },
  { value: 'system', label: 'Hệ thống', icon: <SystemIcon /> },
];

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'segmented';
  className?: string;
}

export function ThemeToggle({
  variant = 'dropdown',
  className = '',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // All hooks must be called before any conditional returns
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!mounted) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mounted]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!mounted) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mounted]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        className={`w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 animate-pulse ${className}`}
        aria-hidden="true"
      />
    );
  }

  const currentIcon = resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />;

  // Simple icon toggle
  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          p-2 rounded-lg transition-all duration-200
          text-gray-600 hover:text-gray-900 hover:bg-gray-100
          dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          dark:focus:ring-offset-slate-800
          ${className}
        `}
        aria-label={`Chuyển sang chế độ ${resolvedTheme === 'dark' ? 'sáng' : 'tối'}`}
        title={`Chuyển sang chế độ ${resolvedTheme === 'dark' ? 'sáng' : 'tối'}`}
      >
        <div className="relative w-5 h-5">
          <span
            className={`absolute inset-0 transition-all duration-300 ${
              resolvedTheme === 'dark'
                ? 'opacity-0 rotate-90 scale-0'
                : 'opacity-100 rotate-0 scale-100'
            }`}
          >
            <SunIcon />
          </span>
          <span
            className={`absolute inset-0 transition-all duration-300 ${
              resolvedTheme === 'dark'
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 -rotate-90 scale-0'
            }`}
          >
            <MoonIcon />
          </span>
        </div>
      </button>
    );
  }

  // Segmented control
  if (variant === 'segmented') {
    return (
      <div
        className={`
          inline-flex items-center p-1 rounded-lg
          bg-gray-100 dark:bg-slate-800
          ${className}
        `}
        role="radiogroup"
        aria-label="Chọn giao diện"
      >
        {themeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
              transition-all duration-200
              ${
                theme === option.value
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }
            `}
            role="radio"
            aria-checked={theme === option.value}
            aria-label={option.label}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // Dropdown (default)
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          text-gray-600 hover:text-gray-900 hover:bg-gray-100
          dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          dark:focus:ring-offset-slate-800
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Chọn giao diện"
      >
        {currentIcon}
        <span className="text-sm font-medium hidden sm:inline">
          {themeOptions.find((o) => o.value === theme)?.label}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
      </button>

      {isOpen && (
        <div
          className={`
            absolute right-0 mt-2 py-1 w-40 rounded-lg shadow-lg
            bg-white dark:bg-slate-800
            border border-gray-200 dark:border-slate-700
            animate-scale-in origin-top-right z-50
          `}
          role="listbox"
          aria-label="Chọn giao diện"
        >
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-2 text-sm
                transition-colors duration-150
                ${
                  theme === option.value
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }
              `}
              role="option"
              aria-selected={theme === option.value}
            >
              {option.icon}
              <span>{option.label}</span>
              {theme === option.value && (
                <svg
                  className="w-4 h-4 ml-auto text-primary-600 dark:text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;
