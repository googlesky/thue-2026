/**
 * localStorage management for named calculator saves
 * Provides CRUD operations and import/export functionality
 */
import { NamedSave, CalculatorSnapshot, SaveExportData } from './snapshotTypes';

const STORAGE_KEY = 'tax-calculator-saves';
const STORAGE_VERSION = 1;
const MAX_SAVES = 50;

/**
 * Generate unique ID for saves
 * Uses timestamp + random for uniqueness
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Get all named saves from localStorage
 * Returns empty array if storage unavailable or corrupted
 */
export function getNamedSaves(): NamedSave[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const saves = JSON.parse(data) as NamedSave[];

    // Sort by updatedAt descending (most recent first)
    return saves.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to load saves:', error);
    return [];
  }
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
 * Automatically limits to MAX_SAVES
 */
export function saveNamedSave(
  snapshot: CalculatorSnapshot,
  label: string,
  description?: string
): NamedSave {
  const saves = getNamedSaves();
  const now = Date.now();

  // Deep clone snapshot to avoid mutations
  const newSave: NamedSave = {
    id: generateId(),
    label,
    description,
    snapshot: {
      ...snapshot,
      sharedState: {
        ...snapshot.sharedState,
        insuranceOptions: { ...snapshot.sharedState.insuranceOptions },
        otherIncome: snapshot.sharedState.otherIncome
          ? { ...snapshot.sharedState.otherIncome }
          : undefined,
      },
      tabs: {
        employerCost: { ...snapshot.tabs.employerCost },
        freelancer: { ...snapshot.tabs.freelancer },
        salaryComparison: {
          ...snapshot.tabs.salaryComparison,
          companies: snapshot.tabs.salaryComparison.companies.map(c => ({ ...c })),
        },
        yearlyComparison: { ...snapshot.tabs.yearlyComparison },
      },
      meta: {
        ...snapshot.meta,
        createdAt: snapshot.meta.createdAt || now,
      },
    },
    createdAt: now,
    updatedAt: now,
  };

  // Add to beginning, limit to MAX_SAVES
  const updatedSaves = [newSave, ...saves].slice(0, MAX_SAVES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSaves));
    return newSave;
  } catch (error) {
    console.error('Failed to save:', error);

    // Storage full - try to save with fewer items
    try {
      const trimmedSaves = updatedSaves.slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedSaves));
      return newSave;
    } catch (innerError) {
      console.error('Failed to save even after trimming:', innerError);
      throw new Error('Bộ nhớ đầy, không thể lưu');
    }
  }
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
  const updatedSaves = saves.map(save =>
    save.id === id
      ? { ...save, ...updates, updatedAt: Date.now() }
      : save
  );

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSaves));
  } catch (error) {
    console.error('Failed to update save:', error);
    throw new Error('Không thể cập nhật');
  }
}

/**
 * Delete a named save by ID
 */
export function deleteNamedSave(id: string): void {
  const saves = getNamedSaves();
  const updatedSaves = saves.filter(save => save.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSaves));
  } catch (error) {
    console.error('Failed to delete save:', error);
  }
}

/**
 * Delete multiple saves by IDs
 */
export function deleteMultipleSaves(ids: string[]): void {
  const saves = getNamedSaves();
  const idsSet = new Set(ids);
  const updatedSaves = saves.filter(save => !idsSet.has(save.id));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSaves));
  } catch (error) {
    console.error('Failed to delete saves:', error);
  }
}

/**
 * Clear all named saves
 */
export function clearAllSaves(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear saves:', error);
  }
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
 * Merges with existing saves, avoiding duplicates
 */
export function importFromJSON(jsonString: string): {
  success: boolean;
  count: number;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString) as SaveExportData;

    // Validate structure
    if (!data.saves || !Array.isArray(data.saves)) {
      return {
        success: false,
        count: 0,
        error: 'Định dạng file không hợp lệ'
      };
    }

    // Validate version
    if (data.version !== STORAGE_VERSION) {
      console.warn(`Import version mismatch: ${data.version} vs ${STORAGE_VERSION}`);
      // Continue anyway - we'll try to import
    }

    const currentSaves = getNamedSaves();
    const importedSaves = data.saves;

    // Create a map of current saves by ID
    const currentSavesMap = new Map(currentSaves.map(s => [s.id, s]));

    // Merge: imported saves take precedence over existing ones with same ID
    const mergedSaves: NamedSave[] = [];
    const importedIds = new Set<string>();

    // Add all imported saves
    for (const save of importedSaves) {
      mergedSaves.push(save);
      importedIds.add(save.id);
    }

    // Add current saves that weren't imported
    for (const save of currentSaves) {
      if (!importedIds.has(save.id)) {
        mergedSaves.push(save);
      }
    }

    // Limit to MAX_SAVES
    const finalSaves = mergedSaves.slice(0, MAX_SAVES);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalSaves));
      return {
        success: true,
        count: importedSaves.length
      };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: 'Bộ nhớ đầy, không thể import',
      };
    }
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Lỗi không xác định',
    };
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  count: number;
  maxSaves: number;
  estimatedSize: number;
} {
  const saves = getNamedSaves();
  const data = localStorage.getItem(STORAGE_KEY) || '';

  return {
    count: saves.length,
    maxSaves: MAX_SAVES,
    estimatedSize: data.length, // Size in characters
  };
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
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

  const label = newLabel || `${original.label} (copy)`;
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
