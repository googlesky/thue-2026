/**
 * Snapshot encoding/decoding for URL sharing
 * Uses lz-string for compression and compact key mapping to minimize URL length
 */
import * as LZString from 'lz-string';
import { CalculatorSnapshot, isValidSnapshot, mergeSnapshotWithDefaults } from './snapshotTypes';

/**
 * Compact key mapping to minimize URL size
 * Short keys are used in the encoded data, then mapped back to full keys on decode
 */
const KEY_MAP: Record<string, string> = {
  // Top level
  version: 'v',
  sharedState: 's',
  activeTab: 't',
  tabs: 'tb',
  meta: 'm',

  // SharedTaxState
  grossIncome: 'g',
  declaredSalary: 'd',
  dependents: 'dp',
  otherDeductions: 'od',
  hasInsurance: 'hi',
  insuranceOptions: 'io',
  region: 'r',
  pensionContribution: 'pc',
  otherIncome: 'oi',

  // InsuranceOptions
  bhxh: 'x',
  bhyt: 'y',
  bhtn: 'n',

  // OtherIncome
  freelance: 'f',
  rental: 'rt',
  investment: 'iv',
  transfer: 'tr',
  lottery: 'lt',

  // Tabs
  employerCost: 'ec',
  freelancer: 'fl',
  salaryComparison: 'sc',
  yearlyComparison: 'yc',

  // EmployerCostTabState
  includeUnionFee: 'uf',
  useNewLaw: 'nl',

  // FreelancerTabState
  frequency: 'fq',

  // SalaryComparisonTabState
  companies: 'co',

  // CompanyOffer
  id: 'i',
  name: 'nm',
  grossSalary: 'gs',
  bonusMonths: 'bm',
  otherBenefits: 'ob',

  // YearlyComparisonTabState
  selectedPresetId: 'sp',
  bonusAmount: 'ba',

  // Meta
  createdAt: 'c',
  label: 'l',
  description: 'ds',
};

// Reverse mapping for decoding
const REVERSE_KEY_MAP: Record<string, string> = Object.entries(KEY_MAP).reduce(
  (acc, [key, value]) => {
    acc[value] = key;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Recursively replace keys with compact versions
 */
function compactKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(compactKeys);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const compactKey = KEY_MAP[key] || key;
    result[compactKey] = compactKeys(value);
  }
  return result;
}

/**
 * Recursively restore keys from compact versions
 */
function expandKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(expandKeys);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = REVERSE_KEY_MAP[key] || key;
    result[fullKey] = expandKeys(value);
  }
  return result;
}

/**
 * Remove default values to reduce size
 * Only keep values that differ from defaults
 */
function removeDefaults(snapshot: CalculatorSnapshot): Record<string, unknown> {
  const result: Record<string, unknown> = {
    version: snapshot.version,
  };

  // Remove default shared state values
  const s = snapshot.sharedState;
  const shared: Record<string, unknown> = {};
  if (s.grossIncome !== 0) shared.grossIncome = s.grossIncome;
  if (s.declaredSalary !== undefined) shared.declaredSalary = s.declaredSalary;
  if (s.dependents !== 0) shared.dependents = s.dependents;
  if (s.otherDeductions !== 0) shared.otherDeductions = s.otherDeductions;
  if (s.hasInsurance !== true) shared.hasInsurance = s.hasInsurance;
  if (s.region !== 1) shared.region = s.region;
  if (s.pensionContribution !== 0) shared.pensionContribution = s.pensionContribution;

  // Insurance options (only if different from default)
  if (!s.insuranceOptions.bhxh || !s.insuranceOptions.bhyt || !s.insuranceOptions.bhtn) {
    shared.insuranceOptions = s.insuranceOptions;
  }

  // Other income (only if any value is non-zero)
  if (s.otherIncome) {
    const hasOtherIncome = Object.values(s.otherIncome).some((v) => v !== 0);
    if (hasOtherIncome) {
      shared.otherIncome = s.otherIncome;
    }
  }

  if (Object.keys(shared).length > 0) {
    result.sharedState = shared;
  }

  // Active tab (only if not default)
  if (snapshot.activeTab !== 'calculator') {
    result.activeTab = snapshot.activeTab;
  }

  // Remove default tab states
  const tabs: Record<string, unknown> = {};

  if (snapshot.tabs.employerCost.includeUnionFee !== false || snapshot.tabs.employerCost.useNewLaw !== true) {
    tabs.employerCost = snapshot.tabs.employerCost;
  }

  if (snapshot.tabs.freelancer.frequency !== 'monthly' || snapshot.tabs.freelancer.useNewLaw !== true) {
    tabs.freelancer = snapshot.tabs.freelancer;
  }

  if (snapshot.tabs.salaryComparison.companies.length > 0 || snapshot.tabs.salaryComparison.useNewLaw !== true) {
    tabs.salaryComparison = snapshot.tabs.salaryComparison;
  }

  if (snapshot.tabs.yearlyComparison.selectedPresetId !== null || snapshot.tabs.yearlyComparison.bonusAmount !== 0) {
    tabs.yearlyComparison = snapshot.tabs.yearlyComparison;
  }

  if (Object.keys(tabs).length > 0) {
    result.tabs = tabs;
  }

  // Meta (only include label and description if present)
  const meta: Record<string, unknown> = {};
  if (snapshot.meta.label) meta.label = snapshot.meta.label;
  if (snapshot.meta.description) meta.description = snapshot.meta.description;

  if (Object.keys(meta).length > 0) {
    result.meta = meta;
  }

  return result;
}

/**
 * Encode snapshot to URL-safe compressed string
 * Steps:
 * 1. Remove default values
 * 2. Compact keys
 * 3. JSON stringify
 * 4. LZ compress
 * 5. Base64 URL-safe encode
 */
export function encodeSnapshot(snapshot: CalculatorSnapshot): string {
  try {
    // Remove defaults and compact keys
    const minimal = removeDefaults(snapshot);
    const compacted = compactKeys(minimal);

    // Stringify and compress
    const json = JSON.stringify(compacted);
    const compressed = LZString.compressToEncodedURIComponent(json);

    return compressed;
  } catch (error) {
    console.error('Failed to encode snapshot:', error);
    return '';
  }
}

/**
 * Decode URL string back to snapshot
 * Steps:
 * 1. LZ decompress
 * 2. JSON parse
 * 3. Expand keys
 * 4. Merge with defaults
 * 5. Validate
 */
export function decodeSnapshot(encoded: string): CalculatorSnapshot | null {
  try {
    // Decompress and parse
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) {
      console.error('Failed to decompress snapshot');
      return null;
    }

    const parsed = JSON.parse(decompressed);

    // Expand keys
    const expanded = expandKeys(parsed) as Partial<CalculatorSnapshot>;

    // Merge with defaults
    const snapshot = mergeSnapshotWithDefaults(expanded);

    // Validate
    if (!isValidSnapshot(snapshot)) {
      console.error('Invalid snapshot structure after decode');
      return null;
    }

    return snapshot;
  } catch (error) {
    console.error('Failed to decode snapshot:', error);
    return null;
  }
}

/**
 * Generate full share URL with encoded snapshot
 * Format: https://example.com/#s=<encoded>
 */
export function generateShareURL(snapshot: CalculatorSnapshot): string {
  const encoded = encodeSnapshot(snapshot);
  if (!encoded) return '';

  const baseURL = typeof window !== 'undefined'
    ? window.location.origin + window.location.pathname
    : '';

  return `${baseURL}#s=${encoded}`;
}

/**
 * Parse snapshot from URL hash
 * Looks for #s=<encoded> in the URL
 */
export function parseHashSnapshot(): CalculatorSnapshot | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#s=')) return null;

  const encoded = hash.substring(3); // Remove '#s='
  return decodeSnapshot(encoded);
}

/**
 * Get size estimate of encoded snapshot (in characters)
 */
export function getEncodedSize(snapshot: CalculatorSnapshot): number {
  return encodeSnapshot(snapshot).length;
}

/**
 * Check if snapshot can be safely shared via URL
 * Most browsers support URLs up to ~2000 characters
 */
export function canShareViaURL(snapshot: CalculatorSnapshot): boolean {
  const size = getEncodedSize(snapshot);
  return size > 0 && size < 1800; // Conservative limit
}
