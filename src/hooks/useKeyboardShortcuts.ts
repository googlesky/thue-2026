'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard Shortcut Definition
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  category: string;
  action: () => void;
}

/**
 * Shortcut registration options
 */
interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/**
 * Check if an element is an input field
 */
function isInputField(element: EventTarget | null): boolean {
  if (!element) return false;

  const tagName = (element as HTMLElement).tagName?.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isContentEditable = (element as HTMLElement).isContentEditable;

  return isInput || isContentEditable;
}

/**
 * Generate a unique key for a shortcut
 */
export function getShortcutKey(shortcut: Pick<KeyboardShortcut, 'key' | 'ctrl' | 'alt' | 'shift' | 'meta'>): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.meta) parts.push('⌘');

  // Format the key for display
  let keyDisplay = shortcut.key;
  if (keyDisplay === ' ') keyDisplay = 'Space';
  if (keyDisplay === 'Escape') keyDisplay = 'Esc';
  if (keyDisplay.length === 1) keyDisplay = keyDisplay.toUpperCase();

  parts.push(keyDisplay);

  return parts.join(' + ');
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
  } = options;

  // Use ref to avoid recreating handler on every shortcut change
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if disabled
      if (!enabled) return;

      // Skip if typing in an input field (except for specific shortcuts)
      const isInput = isInputField(event.target);

      for (const shortcut of shortcutsRef.current) {
        // Check modifier keys
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        // Handle meta key separately for Mac
        const metaMatch = shortcut.meta ? event.metaKey : true;

        // Check if key matches
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          // Skip non-modifier shortcuts when in input field
          // But allow Escape and Ctrl+S
          if (isInput && !shortcut.ctrl && !shortcut.alt && shortcut.key !== 'Escape') {
            continue;
          }

          // Execute action
          if (preventDefault) {
            event.preventDefault();
          }

          if (stopPropagation) {
            event.stopPropagation();
          }

          shortcut.action();
          return;
        }
      }
    },
    [enabled, preventDefault, stopPropagation]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Shortcut categories
 */
export const SHORTCUT_CATEGORIES = {
  NAVIGATION: 'Điều hướng',
  ACTIONS: 'Hành động',
  GENERAL: 'Chung',
} as const;

/**
 * Format shortcut for display
 */
export function formatShortcutForDisplay(shortcut: KeyboardShortcut): string {
  return getShortcutKey(shortcut);
}

/**
 * Group shortcuts by category
 */
export function groupShortcutsByCategory(
  shortcuts: KeyboardShortcut[]
): Map<string, KeyboardShortcut[]> {
  const grouped = new Map<string, KeyboardShortcut[]>();

  for (const shortcut of shortcuts) {
    const category = shortcut.category;
    const existing = grouped.get(category) || [];
    existing.push(shortcut);
    grouped.set(category, existing);
  }

  return grouped;
}

export default useKeyboardShortcuts;
