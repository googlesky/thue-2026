/**
 * Snapshot encoding/decoding for URL sharing
 * Uses lz-string for compression and compact key mapping to minimize URL length
 */
import * as LZString from 'lz-string';
import { CalculatorSnapshot, isValidSnapshot, mergeSnapshotWithDefaults } from './snapshotTypes';
import { SharedTaxState, RegionType } from './taxCalculator';

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

  // Allowances
  allowances: 'aw',
  meal: 'ml',
  phone: 'ph',
  transport: 'tp',
  hazardous: 'hz',
  clothing: 'cl',
  housing: 'hs',
  position: 'ps',

  // Tabs
  employerCost: 'ec',
  freelancer: 'fl',
  salaryComparison: 'sc',
  yearlyComparison: 'yc',
  overtime: 'ot',
  bonus: 'bn',
  esop: 'es',

  // BonusTabState
  thirteenthMonthSalary: 'tm',
  tetBonus: 'tt',
  otherBonuses: 'obb',
  selectedScenarioId: 'ssi',

  // ESOPTabState
  grantPrice: 'gp',
  exercisePrice: 'ep',
  numberOfShares: 'ns',
  exerciseDate: 'ed',
  selectedPeriodId: 'spi',

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

  // OvertimeTabState
  monthlySalary: 'ms',
  workingDaysPerMonth: 'wd',
  hoursPerDay: 'hd',
  entries: 'en',
  includeHolidayBasePay: 'hb',
  // OvertimeEntry (type and shift use 'tp' and 'sh' to avoid conflict with 't')
  type: 'tp',
  shift: 'sh',
  hours: 'hr',

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

  // Remove default shared state values (default grossIncome is 30_000_000)
  const s = snapshot.sharedState;
  const shared: Record<string, unknown> = {};
  if (s.grossIncome !== 30_000_000) shared.grossIncome = s.grossIncome;
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

  // Allowances (only if any value is non-zero)
  if (s.allowances) {
    const hasAllowances = Object.values(s.allowances).some((v) => v !== 0);
    if (hasAllowances) {
      shared.allowances = s.allowances;
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

  // Only include if companies have non-zero salary or useNewLaw is false
  const hasNonDefaultCompanies = snapshot.tabs.salaryComparison.companies.some(c => c.grossSalary > 0);
  if (hasNonDefaultCompanies || snapshot.tabs.salaryComparison.useNewLaw !== true) {
    tabs.salaryComparison = snapshot.tabs.salaryComparison;
  }

  // Check actual defaults: selectedPresetId='normal', bonusAmount=30_000_000
  if (snapshot.tabs.yearlyComparison.selectedPresetId !== 'normal' || snapshot.tabs.yearlyComparison.bonusAmount !== 30_000_000) {
    tabs.yearlyComparison = snapshot.tabs.yearlyComparison;
  }

  // Overtime tab state
  if (snapshot.tabs.overtime) {
    const ot = snapshot.tabs.overtime;
    if (
      ot.monthlySalary !== 0 ||
      ot.workingDaysPerMonth !== 26 ||
      ot.hoursPerDay !== 8 ||
      ot.entries.length > 0 ||
      ot.includeHolidayBasePay !== true ||
      ot.useNewLaw !== true
    ) {
      tabs.overtime = ot;
    }
  }

  // Bonus tab state
  if (snapshot.tabs.bonus) {
    const bn = snapshot.tabs.bonus;
    if (
      bn.thirteenthMonthSalary !== 0 ||
      bn.tetBonus !== 0 ||
      bn.otherBonuses !== 0 ||
      bn.selectedScenarioId !== null
    ) {
      tabs.bonus = bn;
    }
  }

  // ESOP tab state
  if (snapshot.tabs.esop) {
    const es = snapshot.tabs.esop;
    if (
      es.grantPrice !== 0 ||
      es.exercisePrice !== 0 ||
      es.numberOfShares !== 0 ||
      es.exerciseDate !== '' ||
      es.selectedPeriodId !== null
    ) {
      tabs.esop = es;
    }
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

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Decode legacy URL params to SharedTaxState (for backward compatibility)
 * Supports old format: ?gross=30000000&dependents=2&region=1
 */
export function decodeLegacyURLParams(searchParams: string): Partial<SharedTaxState> | null {
  const params = new URLSearchParams(searchParams);

  // Check if there are any relevant params
  if (!params.has('gross')) {
    return null;
  }

  const state: Partial<SharedTaxState> = {};

  const gross = parseInt(params.get('gross') || '', 10);
  if (!isNaN(gross) && gross > 0) {
    state.grossIncome = gross;
  }

  const declared = parseInt(params.get('declared') || '', 10);
  if (!isNaN(declared) && declared > 0) {
    state.declaredSalary = declared;
  }

  const dependents = parseInt(params.get('dependents') || '', 10);
  if (!isNaN(dependents) && dependents >= 0) {
    state.dependents = dependents;
  }

  const deductions = parseInt(params.get('deductions') || '', 10);
  if (!isNaN(deductions) && deductions >= 0) {
    state.otherDeductions = deductions;
  }

  const region = parseInt(params.get('region') || '', 10) as RegionType;
  if ([1, 2, 3, 4].includes(region)) {
    state.region = region;
  }

  const pension = parseInt(params.get('pension') || '', 10);
  if (!isNaN(pension) && pension >= 0) {
    state.pensionContribution = pension;
  }

  // Decode insurance flags
  const insFlags = params.get('ins');
  if (insFlags && insFlags.length === 3) {
    state.insuranceOptions = {
      bhxh: insFlags[0] === '1',
      bhyt: insFlags[1] === '1',
      bhtn: insFlags[2] === '1',
    };
    state.hasInsurance = state.insuranceOptions.bhxh || state.insuranceOptions.bhyt || state.insuranceOptions.bhtn;
  }

  return Object.keys(state).length > 0 ? state : null;
}
