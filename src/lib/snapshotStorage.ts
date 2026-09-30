/**
 * localStorage management for named calculator saves
 * Provides CRUD operations and import/export functionality
 */
import {
  NamedSave,
  CalculatorSnapshot,
  SaveExportData,
  DEFAULT_TAB_STATES,
  isValidSnapshot,
  mergeSnapshotWithDefaults,
} from './snapshotTypes';
import { SharedTaxState, DEFAULT_INSURANCE_OPTIONS, DEFAULT_OTHER_INCOME } from './taxCalculator';

const STORAGE_KEY = 'tax-calculator-saves';
const OLD_HISTORY_KEY = 'tax-calculator-history';
const MIGRATION_FLAG_KEY = 'tax-calculator-migrated-v2';
const STORAGE_VERSION = 1;
export const MAX_SAVES = 50;

/**
 * Old history item format (for migration)
 */
interface OldHistoryItem {
  id: string;
  timestamp: number;
  state: SharedTaxState;
  label?: string;
  oldTax: number;
  newTax: number;
  netIncome: number;
}

// ===== Truy cập localStorage an toàn =====
// Trình duyệt chặn lưu trữ (chế độ riêng tư, tắt cookie) có thể ném SecurityError ngay khi
// truy cập `localStorage`, không chỉ khi gọi getItem/setItem.

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Ghi; lỗi được đổi thành thông báo tiếng Việt để hiển thị cho người dùng */
function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    throw new Error(
      name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
        ? 'Bộ nhớ trình duyệt đầy. Hãy xóa bớt bản lưu cũ hoặc xuất file để sao lưu.'
        : 'Trình duyệt đang chặn lưu dữ liệu (chế độ riêng tư hoặc đã tắt lưu trữ).'
    );
  }
}

function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Bộ nhớ bị chặn: không có gì để xóa
  }
}

/** Bản lưu dùng được: id/nhãn là chuỗi, snapshot đủ cấu trúc (tránh làm hỏng danh sách/tìm kiếm) */
function isValidSave(value: unknown): value is NamedSave {
  const save = value as Partial<NamedSave> | null;
  return (
    !!save &&
    typeof save === 'object' &&
    typeof save.id === 'string' &&
    typeof save.label === 'string' &&
    isValidSnapshot(save.snapshot)
  );
}

/** Đọc danh sách bản lưu, bỏ qua mục hỏng */
function readSaves(): NamedSave[] {
  try {
    const data: unknown = JSON.parse(storageGet(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data.filter(isValidSave) : [];
  } catch {
    return [];
  }
}

function writeSaves(saves: NamedSave[]): void {
  storageSet(STORAGE_KEY, JSON.stringify(saves));
}

/**
 * Generate unique ID for saves
 * Uses timestamp + random for uniqueness
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Migrate old history format to new named saves format
 * This runs once and sets a flag to prevent re-migration
 */
function migrateOldHistory(): void {
  if (storageGet(MIGRATION_FLAG_KEY)) return;

  try {
    const oldHistory: unknown = JSON.parse(storageGet(OLD_HISTORY_KEY) || '[]');

    if (Array.isArray(oldHistory) && oldHistory.length > 0) {
      const existingSaves = readSaves();
      const existingIds = new Set(existingSaves.map((s) => s.id));

      // Convert old items to new format
      const migratedSaves: NamedSave[] = (oldHistory as OldHistoryItem[])
        .filter((item) => item && typeof item.id === 'string' && item.state && !existingIds.has(item.id))
        .map((item) => ({
          id: item.id,
          label: item.label || `Lưu ${new Date(item.timestamp).toLocaleDateString('vi-VN')}`,
          description: undefined,
          snapshot: {
            version: 1,
            sharedState: {
              ...item.state,
              insuranceOptions: item.state.insuranceOptions || { ...DEFAULT_INSURANCE_OPTIONS },
              otherIncome: item.state.otherIncome || { ...DEFAULT_OTHER_INCOME },
            },
            activeTab: 'calculator',
            tabs: { ...DEFAULT_TAB_STATES },
            meta: {
              createdAt: item.timestamp,
            },
          },
          createdAt: item.timestamp,
          updatedAt: item.timestamp,
        }));

      // Gộp với bản lưu hiện có, không cắt bớt (không âm thầm mất dữ liệu)
      writeSaves([...existingSaves, ...migratedSaves]);
      storageRemove(OLD_HISTORY_KEY);
      console.log(`Migrated ${migratedSaves.length} items from old history format`);
    }
  } catch (error) {
    // Lỗi ghi (bộ nhớ đầy/bị chặn): giữ nguyên lịch sử cũ, không thử lại vô hạn
    console.error('Failed to migrate old history:', error);
  }

  try {
    storageSet(MIGRATION_FLAG_KEY, 'true');
  } catch {
    // Bộ nhớ bị chặn
  }
}

/**
 * Get all named saves from localStorage
 * Returns empty array if storage unavailable or corrupted
 */
export function getNamedSaves(): NamedSave[] {
  if (typeof window === 'undefined') return [];

  // Run migration on first access
  migrateOldHistory();

  // Sort by updatedAt descending (most recent first)
  return readSaves().sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
}

/**
 * Get a single save by ID
 */
export function getNamedSave(id: string): NamedSave | null {
  const saves = getNamedSaves();
  return saves.find(save => save.id === id) || null;
}

/**
 * Save a new named snapshot
 * Ném lỗi (tiếng Việt) khi đã đủ MAX_SAVES hoặc bộ nhớ đầy — không tự xóa bản lưu cũ
 */
export function saveNamedSave(
  snapshot: CalculatorSnapshot,
  label: string,
  description?: string
): NamedSave {
  const saves = getNamedSaves();
  if (saves.length >= MAX_SAVES) {
    throw new Error(`Đã đủ ${MAX_SAVES} bản lưu. Hãy xóa bớt bản cũ (hoặc xuất file để sao lưu) rồi lưu lại.`);
  }

  const now = Date.now();
  // Bản sao sâu (dữ liệu thuần JSON) để không dính tham chiếu với state đang dùng
  const copy = JSON.parse(JSON.stringify(snapshot)) as CalculatorSnapshot;
  const newSave: NamedSave = {
    id: generateId(),
    label,
    description,
    snapshot: {
      ...copy,
      meta: {
        ...copy.meta,
        createdAt: copy.meta?.createdAt || now,
      },
    },
    createdAt: now,
    updatedAt: now,
  };

  writeSaves([newSave, ...saves]);
  return newSave;
}

/**
 * Update an existing named save
 * Can update label, description, or the snapshot itself
 */
export function updateNamedSave(
  id: string,
  updates: Partial<Pick<NamedSave, 'label' | 'description' | 'snapshot'>>
): void {
  const saves = getNamedSaves();
  writeSaves(
    saves.map(save =>
      save.id === id
        ? { ...save, ...updates, updatedAt: Date.now() }
        : save
    )
  );
}

/**
 * Delete a named save by ID
 */
export function deleteNamedSave(id: string): void {
  try {
    writeSaves(getNamedSaves().filter(save => save.id !== id));
  } catch (error) {
    console.error('Failed to delete save:', error);
  }
}

/**
 * Delete multiple saves by IDs
 */
export function deleteMultipleSaves(ids: string[]): void {
  const idsSet = new Set(ids);
  try {
    writeSaves(getNamedSaves().filter(save => !idsSet.has(save.id)));
  } catch (error) {
    console.error('Failed to delete saves:', error);
  }
}

/**
 * Clear all named saves
 */
export function clearAllSaves(): void {
  storageRemove(STORAGE_KEY);
}

/**
 * Export saves to JSON string
 * Can export all saves or a subset by IDs
 */
export function exportToJSON(saveIds?: string[]): string {
  const allSaves = getNamedSaves();

  const saves = saveIds
    ? allSaves.filter(save => saveIds.includes(save.id))
    : allSaves;

  const exportData: SaveExportData = {
    version: STORAGE_VERSION,
    exportedAt: Date.now(),
    saves,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import saves from JSON string
 * Lọc từng bản lưu hợp lệ; trùng id thì giữ bản cục bộ; chỉ thêm trong giới hạn MAX_SAVES.
 * count = số bản thực sự được thêm; skipped = số bản bỏ qua (hỏng, trùng hoặc vượt giới hạn).
 */
export function importFromJSON(jsonString: string): {
  success: boolean;
  count: number;
  skipped?: number;
  error?: string;
} {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return { success: false, count: 0, error: 'File không phải JSON hợp lệ.' };
  }

  const imported = (data as Partial<SaveExportData> | null)?.saves;
  if (!Array.isArray(imported)) {
    return { success: false, count: 0, error: 'File không đúng định dạng bản lưu (thiếu danh sách "saves").' };
  }

  const now = Date.now();
  const validSaves: NamedSave[] = imported.filter(isValidSave).map((save) => ({
    id: save.id,
    label: save.label,
    description: typeof save.description === 'string' ? save.description : undefined,
    snapshot: mergeSnapshotWithDefaults(save.snapshot),
    createdAt: Number(save.createdAt) || now,
    updatedAt: Number(save.updatedAt) || now,
  }));
  if (validSaves.length === 0) {
    return { success: false, count: 0, error: 'Không có bản lưu hợp lệ nào trong file.' };
  }

  const currentSaves = getNamedSaves();
  const knownIds = new Set(currentSaves.map((s) => s.id));
  const added: NamedSave[] = [];
  let full = false;
  for (const save of validSaves) {
    if (knownIds.has(save.id)) continue; // Trùng: giữ bản cục bộ
    if (currentSaves.length + added.length >= MAX_SAVES) {
      full = true;
      break;
    }
    knownIds.add(save.id);
    added.push(save);
  }

  if (added.length === 0 && full) {
    return {
      success: false,
      count: 0,
      error: `Đã đủ ${MAX_SAVES} bản lưu trên thiết bị. Hãy xóa bớt bản cũ rồi nhập lại.`,
    };
  }

  if (added.length > 0) {
    try {
      writeSaves([...currentSaves, ...added]);
    } catch (error) {
      return { success: false, count: 0, error: error instanceof Error ? error.message : 'Không thể nhập file.' };
    }
  }

  return { success: true, count: added.length, skipped: imported.length - added.length };
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  count: number;
  maxSaves: number;
  estimatedSize: number;
} {
  return {
    count: getNamedSaves().length,
    maxSaves: MAX_SAVES,
    estimatedSize: (storageGet(STORAGE_KEY) || '').length, // Size in characters
  };
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Duplicate an existing save with a new label
 */
export function duplicateNamedSave(id: string, newLabel?: string): NamedSave | null {
  const original = getNamedSave(id);
  if (!original) return null;

  const label = newLabel || `${original.label} (bản sao)`;
  return saveNamedSave(original.snapshot, label, original.description);
}

/**
 * Search saves by label or description
 */
export function searchSaves(query: string): NamedSave[] {
  const saves = getNamedSaves();
  const lowerQuery = query.toLowerCase();

  return saves.filter(save =>
    save.label.toLowerCase().includes(lowerQuery) ||
    save.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Format timestamp for display
 */
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
