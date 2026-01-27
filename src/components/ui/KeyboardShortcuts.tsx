'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useKeyboardShortcuts,
  KeyboardShortcut,
  SHORTCUT_CATEGORIES,
  groupShortcutsByCategory,
  getShortcutKey,
} from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsProps {
  onTabChange?: (tabIndex: number) => void;
  onSave?: () => void;
  onToggleDarkMode?: () => void;
  totalTabs?: number;
}

/**
 * Keyboard Shortcuts Panel & Provider
 * Cung cấp phím tắt và panel hiển thị phím tắt
 */
export function KeyboardShortcuts({
  onTabChange,
  onSave,
  onToggleDarkMode,
  totalTabs = 9,
}: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Define all shortcuts
  const shortcuts: KeyboardShortcut[] = useMemo(() => {
    const list: KeyboardShortcut[] = [
      // General
      {
        key: '?',
        shift: true,
        description: 'Hiện/ẩn bảng phím tắt',
        category: SHORTCUT_CATEGORIES.GENERAL,
        action: () => setIsOpen((prev) => !prev),
      },
      {
        key: 'Escape',
        description: 'Đóng bảng phím tắt',
        category: SHORTCUT_CATEGORIES.GENERAL,
        action: () => setIsOpen(false),
      },
    ];

    // Tab navigation shortcuts (1-9)
    if (onTabChange) {
      for (let i = 1; i <= Math.min(totalTabs, 9); i++) {
        list.push({
          key: String(i),
          description: `Chuyển đến tab ${i}`,
          category: SHORTCUT_CATEGORIES.NAVIGATION,
          action: () => onTabChange(i - 1),
        });
      }
    }

    // Action shortcuts
    if (onSave) {
      list.push({
        key: 's',
        ctrl: true,
        description: 'Lưu trạng thái hiện tại',
        category: SHORTCUT_CATEGORIES.ACTIONS,
        action: onSave,
      });
    }

    if (onToggleDarkMode) {
      list.push({
        key: 'd',
        ctrl: true,
        shift: true,
        description: 'Chuyển đổi chế độ tối/sáng',
        category: SHORTCUT_CATEGORIES.ACTIONS,
        action: onToggleDarkMode,
      });
    }

    return list;
  }, [onTabChange, onSave, onToggleDarkMode, totalTabs]);

  // Register keyboard shortcuts
  useKeyboardShortcuts(shortcuts);

  // Close on click outside
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  }, []);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(
    () => groupShortcutsByCategory(shortcuts),
    [shortcuts]
  );

  // Render nothing if panel is closed
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="relative w-full max-w-lg mx-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="shortcuts-title"
            className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Phím tắt
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Đóng"
          >
            <svg
              className="w-5 h-5 text-gray-500"
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

        {/* Shortcuts grouped by category */}
        <div className="space-y-6">
          {Array.from(groupedShortcuts.entries()).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={`${shortcut.key}-${index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="ml-4 px-2 py-1 text-xs font-mono font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 shadow-sm">
                      {getShortcutKey(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Nhấn <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> hoặc <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">?</kbd> để đóng
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Shortcut hint badge component
 */
export function ShortcutHint({
  shortcut,
  className = '',
}: {
  shortcut: Pick<KeyboardShortcut, 'key' | 'ctrl' | 'alt' | 'shift' | 'meta'>;
  className?: string;
}) {
  return (
    <kbd
      className={`px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-600 ${className}`}
    >
      {getShortcutKey(shortcut)}
    </kbd>
  );
}

/**
 * "Press ? for shortcuts" hint
 */
export function ShortcutHelpHint() {
  const [isVisible, setIsVisible] = useState(true);

  // Hide after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  // Also hide on first keypress
  useEffect(() => {
    const handleKeyPress = () => {
      setIsVisible(false);
    };

    document.addEventListener('keydown', handleKeyPress, { once: true });

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 animate-fade-in">
      Nhấn{' '}
      <kbd className="px-1.5 py-0.5 font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
        ?
      </kbd>{' '}
      để xem phím tắt
    </div>
  );
}

export default KeyboardShortcuts;
