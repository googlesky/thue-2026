import { SharedTaxState } from './taxCalculator';

export interface CalculationHistoryItem {
  id: string;
  timestamp: number;
  state: SharedTaxState;
  label?: string;
  oldTax: number;
  newTax: number;
  netIncome: number;
}

const STORAGE_KEY = 'tax-calculator-history';
const MAX_HISTORY_ITEMS = 20;

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// Get all history items from localStorage
export function getHistory(): CalculationHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as CalculationHistoryItem[];
  } catch {
    return [];
  }
}

// Save a calculation to history
export function saveToHistory(
  state: SharedTaxState,
  oldTax: number,
  newTax: number,
  netIncome: number,
  label?: string
): CalculationHistoryItem {
  const history = getHistory();

  const newItem: CalculationHistoryItem = {
    id: generateId(),
    timestamp: Date.now(),
    state: {
      ...state,
      insuranceOptions: { ...state.insuranceOptions },
      otherIncome: state.otherIncome ? { ...state.otherIncome } : undefined,
    },
    label,
    oldTax,
    newTax,
    netIncome,
  };

  // Add to beginning, limit to MAX_HISTORY_ITEMS
  const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch {
    // Storage full, remove old items
    const trimmedHistory = updatedHistory.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
  }

  return newItem;
}

// Delete a history item
export function deleteFromHistory(id: string): void {
  const history = getHistory();
  const updatedHistory = history.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
}

// Clear all history
export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Update label of a history item
export function updateHistoryLabel(id: string, label: string): void {
  const history = getHistory();
  const updatedHistory = history.map(item =>
    item.id === id ? { ...item, label } : item
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
}

// Format timestamp for display
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return 'Hôm qua ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
