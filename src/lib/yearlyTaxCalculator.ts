// Tính thuế TNCN theo năm - So sánh các kịch bản
import {
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  INSURANCE_RATES,
  MAX_SOCIAL_INSURANCE_SALARY,
  getMaxUnemploymentInsuranceSalary,
  RegionType,
  formatCurrency,
  InsuranceDetail,
} from './taxCalculator';

// ===== INTERFACES =====

export interface MonthlyEntry {
  month: number;        // 1-12 (hoặc 13, 14 cho thưởng)
  grossIncome: number;
  isBonus?: boolean;    // Tháng thưởng
  label?: string;       // Nhãn hiển thị (VD: "Thưởng T13")
}

export interface YearScenario {
  id: string;
  name: string;
  year: 2025 | 2026;
  months: MonthlyEntry[];      // 12 tháng thường
  bonusMonths: MonthlyEntry[]; // Tháng thưởng (13, 14)
  dependents: number;
  hasInsurance: boolean;
  region: RegionType;
  declaredSalary?: number;     // Lương khai báo (nếu khác)
}

export interface MonthlyResult {
  month: number;
  grossIncome: number;
  insurance: number;
  insuranceDetail: InsuranceDetail;
  personalDeduction: number;
  dependentDeduction: number;
  taxableIncome: number;
  tax: number;
  netIncome: number;
  usedLaw: 'old' | 'new';
  isBonus?: boolean;
  label?: string;
}

export interface YearlyResult {
  scenarioId: string;
  scenarioName: string;
  year: 2025 | 2026;
  totalGross: number;
  totalInsurance: number;
  totalTax: number;
  totalNet: number;
  effectiveRate: number;       // Thuế suất thực tế
  monthlyBreakdown: MonthlyResult[];
  oldLawMonths: number;        // Số tháng áp dụng luật cũ
  newLawMonths: number;        // Số tháng áp dụng luật mới
}

export interface TwoYearResult {
  year2025: YearlyResult;
  year2026: YearlyResult;
  combinedGross: number;
  combinedTax: number;
  combinedNet: number;
  combinedEffectiveRate: number;
}

export interface StrategyComparison {
  strategies: TwoYearResult[];
  bestStrategy: number;        // Index của chiến lược tốt nhất
  maxSavings: number;          // Tiết kiệm tối đa so với chiến lược đầu tiên
  description: string;
}

// ===== CALCULATION FUNCTIONS =====

function calculateInsuranceDetailed(
  grossIncome: number,
  hasInsurance: boolean,
  region: RegionType = 1,
  year: 2025 | 2026 = 2025,
  month: number = 1
): InsuranceDetail {
  if (!hasInsurance) {
    return { bhxh: 0, bhyt: 0, bhtn: 0, total: 0 };
  }

  // BHXH và BHYT: tối đa 20 lần lương cơ sở
  const bhxhBhytBase = Math.min(grossIncome, MAX_SOCIAL_INSURANCE_SALARY);
  const bhxh = bhxhBhytBase * INSURANCE_RATES.socialInsurance;
  const bhyt = bhxhBhytBase * INSURANCE_RATES.healthInsurance;

  // BHTN: tối đa 20 lần lương tối thiểu vùng (date-aware)
  // Lương tối thiểu vùng 2026 có hiệu lực từ 01/01/2026
  const effectiveDate = new Date(year, month - 1, 1); // month is 1-indexed
  const maxBhtnByRegion = getMaxUnemploymentInsuranceSalary(effectiveDate);
  const maxBhtn = maxBhtnByRegion[region];
  const bhtnBase = Math.min(grossIncome, maxBhtn);
  const bhtn = bhtnBase * INSURANCE_RATES.unemploymentInsurance;

  return {
    bhxh,
    bhyt,
    bhtn,
    total: bhxh + bhyt + bhtn,
  };
}

function calculateTaxWithBrackets(
  taxableIncome: number,
  brackets: typeof OLD_TAX_BRACKETS
): number {
  if (taxableIncome <= 0) return 0;

  let totalTax = 0;
  let remainingIncome = taxableIncome;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    const bracketWidth = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remainingIncome, bracketWidth);
    totalTax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  return totalTax;
}

/**
 * Xác định luật áp dụng cho từng tháng
 * - 2025: Luật cũ (7 bậc)
 * - 2026 T1-T6: Luật cũ (7 bậc)
 * - 2026 T7-T12: Luật mới (5 bậc)
 */
function getLawForMonth(year: 2025 | 2026, month: number): 'old' | 'new' {
  if (year === 2025) return 'old';
  if (year === 2026 && month <= 6) return 'old';
  return 'new';
}

function getDeductionsForLaw(law: 'old' | 'new') {
  return law === 'old' ? OLD_DEDUCTIONS : NEW_DEDUCTIONS;
}

function getBracketsForLaw(law: 'old' | 'new') {
  return law === 'old' ? OLD_TAX_BRACKETS : NEW_TAX_BRACKETS;
}

/**
 * Tính thuế cho 1 tháng cụ thể
 */
export function calculateMonthlyTax(
  entry: MonthlyEntry,
  year: 2025 | 2026,
  dependents: number,
  hasInsurance: boolean,
  region: RegionType = 1,
  declaredSalary?: number
): MonthlyResult {
  const { month, grossIncome, isBonus, label } = entry;
  const law = getLawForMonth(year, month);
  const deductions = getDeductionsForLaw(law);
  const brackets = getBracketsForLaw(law);

  // Tính bảo hiểm (dựa trên lương khai báo nếu có, date-aware cho BHTN cap)
  const insuranceBase = declaredSalary ?? grossIncome;
  // Với tháng thưởng (month > 12), sử dụng tháng 12 để xác định date
  const effectiveMonth = Math.min(month, 12);
  const insuranceDetail = calculateInsuranceDetailed(insuranceBase, hasInsurance, region, year, effectiveMonth);
  const insurance = insuranceDetail.total;

  // Các khoản giảm trừ
  const personalDeduction = deductions.personal;
  const dependentDeduction = dependents * deductions.dependent;

  // Thu nhập tính thuế
  const taxableIncome = Math.max(0, grossIncome - insurance - personalDeduction - dependentDeduction);

  // Tính thuế
  const tax = calculateTaxWithBrackets(taxableIncome, brackets);

  // Thu nhập thực nhận
  const netIncome = grossIncome - insurance - tax;

  return {
    month,
    grossIncome,
    insurance,
    insuranceDetail,
    personalDeduction,
    dependentDeduction,
    taxableIncome,
    tax,
    netIncome,
    usedLaw: law,
    isBonus,
    label,
  };
}

/**
 * Tính thuế cả năm cho 1 scenario
 */
export function calculateYearlyTax(scenario: YearScenario): YearlyResult {
  const { id, name, year, months, bonusMonths, dependents, hasInsurance, region, declaredSalary } = scenario;

  // Gộp tất cả các tháng (thường + thưởng)
  const allMonths = [...months, ...bonusMonths];

  // Tính thuế từng tháng
  const monthlyBreakdown = allMonths.map(entry =>
    calculateMonthlyTax(entry, year, dependents, hasInsurance, region, declaredSalary)
  );

  // Tổng kết
  const totalGross = monthlyBreakdown.reduce((sum, m) => sum + m.grossIncome, 0);
  const totalInsurance = monthlyBreakdown.reduce((sum, m) => sum + m.insurance, 0);
  const totalTax = monthlyBreakdown.reduce((sum, m) => sum + m.tax, 0);
  const totalNet = monthlyBreakdown.reduce((sum, m) => sum + m.netIncome, 0);

  const effectiveRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;

  // Đếm số tháng theo luật
  const oldLawMonths = monthlyBreakdown.filter(m => m.usedLaw === 'old').length;
  const newLawMonths = monthlyBreakdown.filter(m => m.usedLaw === 'new').length;

  return {
    scenarioId: id,
    scenarioName: name,
    year,
    totalGross,
    totalInsurance,
    totalTax,
    totalNet,
    effectiveRate,
    monthlyBreakdown,
    oldLawMonths,
    newLawMonths,
  };
}

/**
 * Tính tổng 2 năm cho 1 chiến lược
 */
export function calculateTwoYearStrategy(
  scenario2025: YearScenario,
  scenario2026: YearScenario
): TwoYearResult {
  const year2025 = calculateYearlyTax(scenario2025);
  const year2026 = calculateYearlyTax(scenario2026);

  const combinedGross = year2025.totalGross + year2026.totalGross;
  const combinedTax = year2025.totalTax + year2026.totalTax;
  const combinedNet = year2025.totalNet + year2026.totalNet;
  const combinedEffectiveRate = combinedGross > 0 ? (combinedTax / combinedGross) * 100 : 0;

  return {
    year2025,
    year2026,
    combinedGross,
    combinedTax,
    combinedNet,
    combinedEffectiveRate,
  };
}

/**
 * So sánh nhiều chiến lược và tìm chiến lược tốt nhất
 */
export function compareStrategies(strategies: TwoYearResult[]): StrategyComparison {
  if (strategies.length === 0) {
    return {
      strategies: [],
      bestStrategy: -1,
      maxSavings: 0,
      description: 'Không có chiến lược để so sánh',
    };
  }

  // Tìm chiến lược có thuế thấp nhất
  let bestIndex = 0;
  let minTax = strategies[0].combinedTax;

  for (let i = 1; i < strategies.length; i++) {
    if (strategies[i].combinedTax < minTax) {
      minTax = strategies[i].combinedTax;
      bestIndex = i;
    }
  }

  // Tính số tiền tiết kiệm so với chiến lược đầu tiên
  const baseTax = strategies[0].combinedTax;
  const maxSavings = baseTax - minTax;

  const description = maxSavings > 0
    ? `Chiến lược ${bestIndex + 1} tiết kiệm ${formatCurrency(maxSavings)} so với chiến lược 1`
    : 'Các chiến lược có mức thuế tương đương';

  return {
    strategies,
    bestStrategy: bestIndex,
    maxSavings,
    description,
  };
}

// ===== PRESET SCENARIOS =====

/**
 * Tạo danh sách 12 tháng với lương giống nhau
 */
export function createUniformMonths(monthlySalary: number): MonthlyEntry[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    grossIncome: monthlySalary,
    isBonus: false,
  }));
}

/**
 * Tạo tháng thưởng
 */
export function createBonusMonth(
  monthNumber: number,
  amount: number,
  label?: string
): MonthlyEntry {
  return {
    month: monthNumber,
    grossIncome: amount,
    isBonus: true,
    label: label ?? `Thưởng T${monthNumber}`,
  };
}

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  create: (
    monthlySalary: number,
    dependents: number,
    hasInsurance: boolean,
    region: RegionType,
    bonusAmount?: number
  ) => { scenario2025: YearScenario; scenario2026: YearScenario };
}

/**
 * Preset 1: Bình thường - Thưởng T13 vào T12/2025
 * - 2025: 12 tháng lương + thưởng T13 (trả vào T12)
 * - 2026: 12 tháng lương
 */
export const PRESET_NORMAL: PresetConfig = {
  id: 'normal',
  name: 'Bình thường',
  description: 'Thưởng T13 năm 2025 trả vào T12/2025',
  create: (monthlySalary, dependents, hasInsurance, region, bonusAmount) => {
    const bonus = bonusAmount ?? monthlySalary;
    return {
      scenario2025: {
        id: 'normal-2025',
        name: '2025 (13 tháng)',
        year: 2025,
        months: createUniformMonths(monthlySalary),
        bonusMonths: [createBonusMonth(13, bonus, 'Thưởng T13 (T12/2025)')],
        dependents,
        hasInsurance,
        region,
      },
      scenario2026: {
        id: 'normal-2026',
        name: '2026 (12 tháng)',
        year: 2026,
        months: createUniformMonths(monthlySalary),
        bonusMonths: [],
        dependents,
        hasInsurance,
        region,
      },
    };
  },
};

/**
 * Preset 2: Dời thưởng - Thưởng T13/2025 sang T1/2026
 * - 2025: 12 tháng lương (không thưởng)
 * - 2026: 12 tháng lương + 2 thưởng (T13 từ 2025 + T13 của 2026)
 */
export const PRESET_DEFER_BONUS: PresetConfig = {
  id: 'defer-bonus',
  name: 'Dời thưởng sang 2026',
  description: 'Thưởng T13 năm 2025 dời sang T1/2026',
  create: (monthlySalary, dependents, hasInsurance, region, bonusAmount) => {
    const bonus = bonusAmount ?? monthlySalary;
    return {
      scenario2025: {
        id: 'defer-2025',
        name: '2025 (12 tháng)',
        year: 2025,
        months: createUniformMonths(monthlySalary),
        bonusMonths: [],
        dependents,
        hasInsurance,
        region,
      },
      scenario2026: {
        id: 'defer-2026',
        name: '2026 (14 tháng)',
        year: 2026,
        months: createUniformMonths(monthlySalary),
        bonusMonths: [
          createBonusMonth(13, bonus, 'Thưởng T13/2025 (T1/2026)'),
          createBonusMonth(14, bonus, 'Thưởng T13/2026 (T12/2026)'),
        ],
        dependents,
        hasInsurance,
        region,
      },
    };
  },
};

/**
 * Preset 3: Tối ưu - Dời thưởng vào T7/2026 (luật mới)
 * - 2025: 12 tháng lương (không thưởng)
 * - 2026: 12 tháng lương + thưởng T13/2025 vào T7/2026 (hưởng luật mới)
 */
export const PRESET_OPTIMIZE: PresetConfig = {
  id: 'optimize',
  name: 'Tối ưu (T7/2026)',
  description: 'Thưởng T13/2025 dời sang T7/2026 để hưởng luật mới',
  create: (monthlySalary, dependents, hasInsurance, region, bonusAmount) => {
    const bonus = bonusAmount ?? monthlySalary;
    return {
      scenario2025: {
        id: 'optimize-2025',
        name: '2025 (12 tháng)',
        year: 2025,
        months: createUniformMonths(monthlySalary),
        bonusMonths: [],
        dependents,
        hasInsurance,
        region,
      },
      scenario2026: {
        id: 'optimize-2026',
        name: '2026 (14 tháng, thưởng T7)',
        year: 2026,
        months: createUniformMonths(monthlySalary),
        bonusMonths: [
          // Thưởng T13/2025 trả vào T7/2026 (tháng 7 để hưởng luật mới)
          { month: 7, grossIncome: bonus, isBonus: true, label: 'Thưởng T13/2025 (T7/2026)' },
          // Thưởng T13/2026 trả vào T12/2026
          createBonusMonth(14, bonus, 'Thưởng T13/2026 (T12/2026)'),
        ],
        dependents,
        hasInsurance,
        region,
      },
    };
  },
};

export const PRESETS: PresetConfig[] = [
  PRESET_NORMAL,
  PRESET_DEFER_BONUS,
  PRESET_OPTIMIZE,
];

/**
 * Tạo chiến lược từ preset
 */
export function createStrategyFromPreset(
  preset: PresetConfig,
  monthlySalary: number,
  dependents: number,
  hasInsurance: boolean,
  region: RegionType,
  bonusAmount?: number
): TwoYearResult {
  const { scenario2025, scenario2026 } = preset.create(
    monthlySalary,
    dependents,
    hasInsurance,
    region,
    bonusAmount
  );
  return calculateTwoYearStrategy(scenario2025, scenario2026);
}

/**
 * So sánh tất cả preset với cùng tham số
 */
export function compareAllPresets(
  monthlySalary: number,
  dependents: number,
  hasInsurance: boolean,
  region: RegionType,
  bonusAmount?: number
): StrategyComparison {
  const strategies = PRESETS.map(preset =>
    createStrategyFromPreset(preset, monthlySalary, dependents, hasInsurance, region, bonusAmount)
  );
  return compareStrategies(strategies);
}
