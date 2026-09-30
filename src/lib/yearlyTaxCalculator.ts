// Tính thuế TNCN theo năm - So sánh các kịch bản
// Thuế tiền lương của cá nhân cư trú xác định theo kỳ NĂM và quyết toán
// (Luật Thuế TNCN 109/2025/QH15 Điều 8, 9; NĐ 253/2026/NĐ-CP Điều 51):
// thưởng cộng vào thu nhập năm, giảm trừ gia cảnh tính đủ 12 tháng.
import {
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  DEFAULT_INSURANCE_OPTIONS,
  getInsuranceDetailed,
  calculateAnnualSalaryTax,
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
  insurance: number;           // Dòng thưởng = 0: thưởng không thuộc tiền lương đóng BHXH
  insuranceDetail: InsuranceDetail;
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
  taxableIncome: number;       // Thu nhập tính thuế cả năm
  totalTax: number;            // Thuế phải nộp cả năm (sau quyết toán)
  totalNet: number;
  effectiveRate: number;       // Thuế suất thực tế
  monthlyBreakdown: MonthlyResult[];
  oldLawMonths: number;        // Số tháng lương áp dụng luật cũ
  newLawMonths: number;        // Số tháng lương áp dụng luật mới
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

/**
 * Luật áp dụng cho thu nhập tiền lương theo kỳ tính thuế:
 * - 2025: Luật cũ (7 bậc, 11tr/4,4tr)
 * - 2026: Luật mới (5 bậc, 15,5tr/6,2tr) cho cả năm (Luật 109/2025 Điều 29; NĐ 253/2026 Điều 69)
 */
function getLawForYear(year: 2025 | 2026): 'old' | 'new' {
  return year === 2025 ? 'old' : 'new';
}

const NO_INSURANCE = { bhxh: false, bhyt: false, bhtn: false };

/**
 * Bảo hiểm bắt buộc của 1 tháng lương (trần theo ngày của tháng đó).
 * Dòng thưởng: không đóng BH (thưởng không thuộc tiền lương đóng BHXH).
 */
function calculateMonthRow(
  entry: MonthlyEntry,
  year: 2025 | 2026,
  hasInsurance: boolean,
  region: RegionType = 1,
  declaredSalary?: number
): MonthlyResult {
  const { month, isBonus, label } = entry;
  const grossIncome = Math.max(0, entry.grossIncome || 0);
  const insuranceBase = isBonus ? 0 : Math.max(0, declaredSalary ?? grossIncome);
  const insuranceDetail = getInsuranceDetailed(
    insuranceBase,
    region,
    hasInsurance ? DEFAULT_INSURANCE_OPTIONS : NO_INSURANCE,
    new Date(year, Math.min(Math.max(month, 1), 12) - 1, 1)
  );

  return {
    month,
    grossIncome,
    insurance: insuranceDetail.total,
    insuranceDetail,
    usedLaw: getLawForYear(year),
    isBonus,
    label,
  };
}

/**
 * Tính thuế cả năm cho 1 scenario theo quyết toán:
 * TNTT năm = Σ thu nhập (lương + thưởng) − Σ BH (chỉ trên lương) − 12 × (giảm trừ bản thân + NPT)
 */
export function calculateYearlyTax(scenario: YearScenario): YearlyResult {
  const { id, name, year, months, bonusMonths, hasInsurance, region, declaredSalary } = scenario;
  const dependents = Math.max(0, Math.floor(scenario.dependents || 0));
  const law = getLawForYear(year);
  const deductions = law === 'old' ? OLD_DEDUCTIONS : NEW_DEDUCTIONS;

  const monthlyBreakdown = [...months, ...bonusMonths].map(entry =>
    calculateMonthRow(entry, year, hasInsurance, region, declaredSalary)
  );

  const totalGross = monthlyBreakdown.reduce((sum, m) => sum + m.grossIncome, 0);
  const totalInsurance = monthlyBreakdown.reduce((sum, m) => sum + m.insurance, 0);
  const annualDeductions = 12 * (deductions.personal + dependents * deductions.dependent);
  const taxableIncome = Math.max(0, totalGross - totalInsurance - annualDeductions);
  const totalTax = calculateAnnualSalaryTax(taxableIncome, law === 'old' ? OLD_TAX_BRACKETS : NEW_TAX_BRACKETS);
  const totalNet = totalGross - totalInsurance - totalTax;

  const effectiveRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;
  const salaryMonths = months.length;

  return {
    scenarioId: id,
    scenarioName: name,
    year,
    totalGross,
    totalInsurance,
    taxableIncome,
    totalTax,
    totalNet,
    effectiveRate,
    monthlyBreakdown,
    oldLawMonths: law === 'old' ? salaryMonths : 0,
    newLawMonths: law === 'new' ? salaryMonths : 0,
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
 * Hai chiến lược chỉ so sánh thuế được khi tổng thu nhập 2 năm bằng nhau
 * (thu nhập nhiều hơn thì thuế cao hơn là đương nhiên, không phải "tốn thêm").
 */
export function isSameIncome(a: TwoYearResult, b: TwoYearResult): boolean {
  return Math.abs(a.combinedGross - b.combinedGross) < 1;
}

/**
 * So sánh nhiều chiến lược (cùng tổng thu nhập với chiến lược 1) và tìm chiến lược thuế thấp nhất
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

  // Tìm chiến lược có thuế thấp nhất trong các chiến lược cùng tổng thu nhập
  let bestIndex = 0;
  let minTax = strategies[0].combinedTax;

  for (let i = 1; i < strategies.length; i++) {
    if (isSameIncome(strategies[i], strategies[0]) && strategies[i].combinedTax < minTax) {
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
 * Preset 1: Bình thường - Thưởng T13 mỗi năm trả vào tháng 12 của năm đó
 * - 2025: 12 tháng lương + thưởng T13/2025 (T12/2025)
 * - 2026: 12 tháng lương + thưởng T13/2026 (T12/2026)
 */
export const PRESET_NORMAL: PresetConfig = {
  id: 'normal',
  name: 'Bình thường',
  description: 'Thưởng T13 mỗi năm trả vào tháng 12 của năm đó (T12/2025 và T12/2026).',
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
        name: '2026 (13 tháng)',
        year: 2026,
        months: createUniformMonths(monthlySalary),
        bonusMonths: [createBonusMonth(13, bonus, 'Thưởng T13/2026 (T12/2026)')],
        dependents,
        hasInsurance,
        region,
      },
    };
  },
};

/**
 * Preset 2 (hồi cứu): Thưởng T13/2025 nhận vào T1/2026 - cùng tổng thu nhập 2 năm với Preset 1
 * - 2025: 12 tháng lương (không thưởng)
 * - 2026: 12 tháng lương + 2 thưởng (T13/2025 nhận T1/2026 + T13/2026)
 * Thời điểm xác định thu nhập là lúc nhận (Luật 109/2025 Điều 8.3) nên thưởng T13/2025
 * nhận trong năm 2026 được quyết toán theo luật mới; tháng nhận trong năm không đổi thuế năm.
 */
export const PRESET_DEFER_BONUS: PresetConfig = {
  id: 'defer-bonus',
  name: 'Dời thưởng sang 2026',
  description: 'Hồi cứu: thưởng T13/2025 nhận vào T1/2026 nên tính vào quyết toán năm 2026 theo luật mới.',
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

export const PRESETS: PresetConfig[] = [
  PRESET_NORMAL,
  PRESET_DEFER_BONUS,
];

/**
 * Preset theo id đã lưu (snapshot/URL). 'optimize' (bản cũ: thưởng T13/2025 vào T1/2026)
 * nay trùng 'defer-bonus' vì thuế tính theo năm; id lạ → preset mặc định.
 */
export function findPreset(id: string | null): PresetConfig | null {
  if (id === null) return null;
  const normalizedId = id === 'optimize' ? PRESET_DEFER_BONUS.id : id;
  return PRESETS.find(p => p.id === normalizedId) ?? PRESET_NORMAL;
}
