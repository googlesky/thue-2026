/**
 * Annual Tax Settlement Calculator (Quyết Toán Thuế TNCN)
 *
 * Calculates annual PIT settlement for years 2025 and 2026
 * Based on:
 * - Current law (2025): 7 brackets, 11M/4.4M deductions
 * - New law (2026 from 01/01): 5 brackets, 15.5M/6.2M deductions
 * - Circular 111/2013/TT-BTC for settlement procedures
 */

import {
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  getInsuranceDetailed,
  InsuranceDetail,
} from './taxCalculator';

// ===== TYPES =====

export type SettlementYear = 2025 | 2026;

/**
 * Monthly income entry for annual settlement
 */
export interface MonthlyIncomeEntry {
  month: number; // 1-12
  grossSalary: number;
  bonus: number;
  taxExempt: number; // Tax-exempt income (overtime premium, allowances)
  taxPaid: number; // Tax already withheld for this month
}

/**
 * Dependent information with registration period
 */
export interface DependentInfo {
  id: string;
  name: string;
  fromMonth: number; // Month started (1-12)
  toMonth: number; // Month ended (1-12), 12 if still active
}

/**
 * Input for annual settlement calculation
 */
export interface AnnualSettlementInput {
  year: SettlementYear;

  // Income data
  monthlyIncome: MonthlyIncomeEntry[];

  // Deductions
  dependents: DependentInfo[];
  charitableContributions: number; // Từ thiện, nhân đạo
  voluntaryPension: number; // Quỹ hưu trí tự nguyện (max 1M/month = 12M/year)

  // Insurance
  insuranceOptions: InsuranceOptions;
  region: RegionType;

  // Optional: Manual override for tax paid
  manualTaxPaid?: number;
}

/**
 * Result for a single period (used for 2026 transition)
 */
export interface PeriodResult {
  periodName: string; // "T1-T6" or "T7-T12"
  law: 'old' | 'new';
  months: number[];

  // Income
  totalGross: number;
  totalBonus: number;
  totalTaxExempt: number;
  totalTaxableIncome: number;

  // Deductions
  personalDeduction: number;
  dependentDeduction: number;
  insuranceDeduction: number;
  otherDeduction: number;
  totalDeductions: number;

  // Tax calculation
  assessableIncome: number; // Thu nhập tính thuế
  taxDue: number; // Thuế phải nộp
  taxPaid: number; // Thuế đã tạm nộp
}

/**
 * Monthly breakdown for display
 */
export interface MonthlyBreakdown {
  month: number;
  monthName: string;
  law: 'old' | 'new';
  gross: number;
  bonus: number;
  taxExempt: number;
  taxableIncome: number;
  insurance: number;
  personalDeduction: number;
  dependentDeduction: number;
  taxPaid: number;
}

/**
 * Complete annual settlement result
 */
export interface AnnualSettlementResult {
  year: SettlementYear;
  isTransitionYear: boolean; // true for 2026

  // Summary totals
  totalGrossIncome: number;
  totalBonusIncome: number;
  totalTaxExemptIncome: number;
  totalTaxableIncome: number;

  // Total deductions
  totalPersonalDeduction: number;
  totalDependentDeduction: number;
  totalInsuranceDeduction: number;
  totalOtherDeduction: number;
  totalDeductions: number;

  // Tax calculation
  totalAssessableIncome: number;
  annualTaxDue: number;
  totalTaxPaid: number;

  // Settlement result
  difference: number; // Positive = pay more, Negative = refund
  settlementType: 'pay' | 'refund' | 'even';

  // Period breakdown (for transition year)
  periods?: PeriodResult[];

  // Monthly breakdown
  monthlyBreakdown: MonthlyBreakdown[];

  // Insurance detail
  insuranceDetail: {
    monthly: InsuranceDetail;
    annual: InsuranceDetail;
  };

  // Dependent summary
  dependentSummary: {
    count: number;
    totalMonths: number;
    deductionPerMonth: number;
    totalDeduction: number;
  };
}

// ===== CONSTANTS =====

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

// Maximum voluntary pension deduction per month
const MAX_VOLUNTARY_PENSION_MONTHLY = 1_000_000;
const MAX_VOLUNTARY_PENSION_YEARLY = 12_000_000;

// ===== HELPER FUNCTIONS =====

/**
 * Generate unique ID for dependent
 */
export function generateDependentId(): string {
  return `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determine which law applies for a given month in a given year
 * Note: Luật mới (5 bậc) áp dụng từ 01/01/2026 cho thu nhập từ tiền lương, tiền công
 * theo điều khoản chuyển tiếp của Luật Thuế TNCN sửa đổi 2025
 */
export function getLawForMonth(year: SettlementYear, month: number): 'old' | 'new' {
  if (year === 2025) return 'old';
  // 2026: Luật mới áp dụng từ tháng 1 (không phải tháng 7)
  return 'new';
}

/**
 * Get deductions for a specific law
 */
function getDeductions(law: 'old' | 'new') {
  return law === 'old' ? OLD_DEDUCTIONS : NEW_DEDUCTIONS;
}

/**
 * Get tax brackets for a specific law
 */
function getTaxBrackets(law: 'old' | 'new') {
  return law === 'old' ? OLD_TAX_BRACKETS : NEW_TAX_BRACKETS;
}

/**
 * Calculate tax using progressive brackets
 */
function calculateTaxWithBrackets(
  assessableIncome: number,
  brackets: typeof OLD_TAX_BRACKETS
): number {
  if (assessableIncome <= 0) return 0;

  let tax = 0;
  let remaining = assessableIncome;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const bracketWidth = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
  }

  return tax;
}

/**
 * Calculate total months a dependent is registered
 */
function calculateDependentMonths(dep: DependentInfo): number {
  return Math.max(0, dep.toMonth - dep.fromMonth + 1);
}

/**
 * Calculate dependent deduction for a specific month
 */
function getDependentCountForMonth(dependents: DependentInfo[], month: number): number {
  return dependents.filter(
    (dep) => month >= dep.fromMonth && month <= dep.toMonth
  ).length;
}

/**
 * Create default monthly income entries
 */
export function createDefaultMonthlyIncome(
  averageSalary: number = 0,
  bonusMonth: number = 0,
  bonusAmount: number = 0
): MonthlyIncomeEntry[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    grossSalary: averageSalary,
    bonus: i + 1 === bonusMonth ? bonusAmount : 0,
    taxExempt: 0,
    taxPaid: 0,
  }));
}

/**
 * Calculate monthly tax (for estimating tax paid)
 */
export function estimateMonthlyTax(
  grossSalary: number,
  dependents: number,
  insuranceDeduction: number,
  law: 'old' | 'new'
): number {
  const deductions = getDeductions(law);
  const brackets = getTaxBrackets(law);

  const totalDeductions =
    insuranceDeduction +
    deductions.personal +
    dependents * deductions.dependent;

  const assessableIncome = Math.max(0, grossSalary - totalDeductions);
  return calculateTaxWithBrackets(assessableIncome, brackets);
}

// ===== MAIN CALCULATION =====

/**
 * Calculate annual tax settlement
 */
export function calculateAnnualSettlement(
  input: AnnualSettlementInput
): AnnualSettlementResult {
  const {
    year,
    monthlyIncome,
    dependents,
    charitableContributions,
    voluntaryPension,
    insuranceOptions,
    region,
    manualTaxPaid,
  } = input;

  // Note: Từ 01/01/2026, luật mới áp dụng cho cả năm 2026
  // Không còn năm chuyển tiếp - 2025 dùng luật cũ, 2026 dùng luật mới
  const isTransitionYear = false;

  // Calculate insurance per month (date-aware caps)
  const insuranceByMonth = new Map<number, InsuranceDetail>();
  monthlyIncome.forEach((entry) => {
    const insuranceDate = new Date(year, entry.month - 1, 1);
    insuranceByMonth.set(
      entry.month,
      getInsuranceDetailed(entry.grossSalary, region, insuranceOptions, insuranceDate)
    );
  });

  const getInsuranceForMonth = (month: number): InsuranceDetail =>
    insuranceByMonth.get(month) ?? { bhxh: 0, bhyt: 0, bhtn: 0, total: 0 };

  // Cap voluntary pension
  const cappedPension = Math.min(voluntaryPension, MAX_VOLUNTARY_PENSION_YEARLY);

  // Calculate monthly breakdown
  const monthlyBreakdown: MonthlyBreakdown[] = monthlyIncome.map((entry) => {
    const law = getLawForMonth(year, entry.month);
    const deductions = getDeductions(law);
    const dependentCount = getDependentCountForMonth(dependents, entry.month);
    const insuranceDetail = getInsuranceForMonth(entry.month);

    return {
      month: entry.month,
      monthName: MONTH_NAMES[entry.month - 1],
      law,
      gross: entry.grossSalary,
      bonus: entry.bonus,
      taxExempt: entry.taxExempt,
      taxableIncome: entry.grossSalary + entry.bonus - entry.taxExempt,
      insurance: insuranceDetail.total,
      personalDeduction: deductions.personal,
      dependentDeduction: deductions.dependent * dependentCount,
      taxPaid: entry.taxPaid,
    };
  });

  // Calculate totals
  const totalGrossIncome = monthlyIncome.reduce((sum, m) => sum + m.grossSalary, 0);
  const totalBonusIncome = monthlyIncome.reduce((sum, m) => sum + m.bonus, 0);
  const totalTaxExemptIncome = monthlyIncome.reduce((sum, m) => sum + m.taxExempt, 0);
  const totalTaxableIncome = totalGrossIncome + totalBonusIncome - totalTaxExemptIncome;

  // Calculate total tax paid (either manual or sum of monthly)
  const totalTaxPaid =
    manualTaxPaid ??
    monthlyIncome.reduce((sum, m) => sum + m.taxPaid, 0);

  // Calculate period results
  let periods: PeriodResult[] | undefined;
  let annualTaxDue: number;

  if (isTransitionYear) {
    // 2026: Calculate separately for each period
    const firstHalfMonths = [1, 2, 3, 4, 5, 6];
    const secondHalfMonths = [7, 8, 9, 10, 11, 12];

    const firstHalf = calculatePeriodResult(
      'T1-T6',
      'old',
      firstHalfMonths,
      monthlyIncome,
      dependents,
      insuranceByMonth,
      charitableContributions / 2,
      cappedPension / 2
    );

    const secondHalf = calculatePeriodResult(
      'T7-T12',
      'new',
      secondHalfMonths,
      monthlyIncome,
      dependents,
      insuranceByMonth,
      charitableContributions / 2,
      cappedPension / 2
    );

    periods = [firstHalf, secondHalf];
    annualTaxDue = firstHalf.taxDue + secondHalf.taxDue;
  } else {
    // 2025: Single calculation with old law
    // 2026: Single calculation with new law (từ 01/01/2026)
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const law = year === 2026 ? 'new' : 'old';
    const yearResult = calculatePeriodResult(
      'Cả năm',
      law,
      allMonths,
      monthlyIncome,
      dependents,
      insuranceByMonth,
      charitableContributions,
      cappedPension
    );

    periods = [yearResult];
    annualTaxDue = yearResult.taxDue;
  }

  // Calculate deduction totals
  // Note: 2025 = old law, 2026 = new law (từ 01/01/2026, không có năm chuyển tiếp)
  const deductions = year === 2026 ? NEW_DEDUCTIONS : OLD_DEDUCTIONS;
  const totalPersonalDeduction = 12 * deductions.personal;

  const totalDependentMonths = dependents.reduce(
    (sum, dep) => sum + calculateDependentMonths(dep),
    0
  );

  // Calculate dependent deduction based on year
  const totalDependentDeduction = totalDependentMonths * deductions.dependent;

  const totalInsuranceDetail = monthlyIncome.reduce(
    (sum, entry) => {
      const detail = getInsuranceForMonth(entry.month);
      return {
        bhxh: sum.bhxh + detail.bhxh,
        bhyt: sum.bhyt + detail.bhyt,
        bhtn: sum.bhtn + detail.bhtn,
        total: sum.total + detail.total,
      };
    },
    { bhxh: 0, bhyt: 0, bhtn: 0, total: 0 }
  );
  const totalInsuranceDeduction = totalInsuranceDetail.total;
  const totalOtherDeduction = cappedPension + charitableContributions;
  const totalDeductions =
    totalPersonalDeduction +
    totalDependentDeduction +
    totalInsuranceDeduction +
    totalOtherDeduction;

  const totalAssessableIncome = Math.max(0, totalTaxableIncome - totalDeductions);

  // Settlement difference
  const difference = annualTaxDue - totalTaxPaid;
  const settlementType: 'pay' | 'refund' | 'even' =
    difference > 0 ? 'pay' : difference < 0 ? 'refund' : 'even';

  const monthsCount = monthlyIncome.length || 12;

  return {
    year,
    isTransitionYear,

    totalGrossIncome,
    totalBonusIncome,
    totalTaxExemptIncome,
    totalTaxableIncome,

    totalPersonalDeduction,
    totalDependentDeduction,
    totalInsuranceDeduction,
    totalOtherDeduction,
    totalDeductions,

    totalAssessableIncome,
    annualTaxDue,
    totalTaxPaid,

    difference,
    settlementType,

    periods,
    monthlyBreakdown,

    insuranceDetail: {
      monthly: {
        bhxh: totalInsuranceDetail.bhxh / monthsCount,
        bhyt: totalInsuranceDetail.bhyt / monthsCount,
        bhtn: totalInsuranceDetail.bhtn / monthsCount,
        total: totalInsuranceDetail.total / monthsCount,
      },
      annual: totalInsuranceDetail,
    },

    dependentSummary: {
      count: dependents.length,
      totalMonths: totalDependentMonths,
      deductionPerMonth: deductions.dependent,
      totalDeduction: totalDependentDeduction,
    },
  };
}

/**
 * Calculate result for a specific period (for transition year)
 */
function calculatePeriodResult(
  periodName: string,
  law: 'old' | 'new',
  months: number[],
  monthlyIncome: MonthlyIncomeEntry[],
  dependents: DependentInfo[],
  insuranceByMonth: Map<number, InsuranceDetail>,
  charitableContributions: number,
  voluntaryPension: number
): PeriodResult {
  const deductions = getDeductions(law);
  const brackets = getTaxBrackets(law);

  // Filter income for this period
  const periodIncome = monthlyIncome.filter((m) => months.includes(m.month));

  // Calculate period totals
  const totalGross = periodIncome.reduce((sum, m) => sum + m.grossSalary, 0);
  const totalBonus = periodIncome.reduce((sum, m) => sum + m.bonus, 0);
  const totalTaxExempt = periodIncome.reduce((sum, m) => sum + m.taxExempt, 0);
  const totalTaxableIncome = totalGross + totalBonus - totalTaxExempt;
  const taxPaid = periodIncome.reduce((sum, m) => sum + m.taxPaid, 0);

  // Calculate deductions for this period
  const monthCount = months.length;
  const personalDeduction = monthCount * deductions.personal;
  const insuranceDeduction = months.reduce(
    (sum, month) => sum + (insuranceByMonth.get(month)?.total ?? 0),
    0
  );

  // Calculate dependent deduction for this period
  let dependentDeduction = 0;
  for (const month of months) {
    const count = getDependentCountForMonth(dependents, month);
    dependentDeduction += count * deductions.dependent;
  }

  const otherDeduction = charitableContributions + voluntaryPension;
  const totalDeductions =
    personalDeduction + dependentDeduction + insuranceDeduction + otherDeduction;

  // Calculate tax
  const assessableIncome = Math.max(0, totalTaxableIncome - totalDeductions);
  const taxDue = calculateTaxWithBrackets(assessableIncome, brackets);

  return {
    periodName,
    law,
    months,
    totalGross,
    totalBonus,
    totalTaxExempt,
    totalTaxableIncome,
    personalDeduction,
    dependentDeduction,
    insuranceDeduction,
    otherDeduction,
    totalDeductions,
    assessableIncome,
    taxDue,
    taxPaid,
  };
}

// ===== QUICK ESTIMATE =====

/**
 * Quick estimate for settlement using average monthly salary
 */
export function estimateSettlement(
  year: SettlementYear,
  averageMonthlySalary: number,
  annualBonus: number,
  dependentCount: number,
  region: RegionType = 1,
  insuranceOptions: InsuranceOptions = DEFAULT_INSURANCE_OPTIONS
): {
  estimatedTaxDue: number;
  estimatedTaxPaid: number;
  estimatedDifference: number;
} {
  const monthlyIncome = createDefaultMonthlyIncome(
    averageMonthlySalary,
    12, // Bonus in December
    annualBonus
  );

  // Create simple dependents (all year)
  const dependents: DependentInfo[] = Array.from(
    { length: dependentCount },
    (_, i) => ({
      id: `dep_${i}`,
      name: `Người phụ thuộc ${i + 1}`,
      fromMonth: 1,
      toMonth: 12,
    })
  );

  // Estimate monthly tax paid
  const monthlyInsurance = getInsuranceDetailed(
    averageMonthlySalary,
    region,
    insuranceOptions,
    new Date(year, 0, 1)
  );

  monthlyIncome.forEach((entry) => {
    const law = getLawForMonth(year, entry.month);
    const taxableForMonth = entry.grossSalary + entry.bonus;
    entry.taxPaid = estimateMonthlyTax(
      taxableForMonth,
      dependentCount,
      monthlyInsurance.total,
      law
    );
  });

  const result = calculateAnnualSettlement({
    year,
    monthlyIncome,
    dependents,
    charitableContributions: 0,
    voluntaryPension: 0,
    insuranceOptions,
    region,
  });

  return {
    estimatedTaxDue: result.annualTaxDue,
    estimatedTaxPaid: result.totalTaxPaid,
    estimatedDifference: result.difference,
  };
}

// ===== VALIDATION =====

/**
 * Validate settlement input
 */
export function validateSettlementInput(
  input: Partial<AnnualSettlementInput>
): string[] {
  const errors: string[] = [];

  if (!input.year || ![2025, 2026].includes(input.year)) {
    errors.push('Năm quyết toán phải là 2025 hoặc 2026');
  }

  if (!input.monthlyIncome || input.monthlyIncome.length !== 12) {
    errors.push('Phải có đủ dữ liệu 12 tháng');
  }

  if (input.monthlyIncome) {
    const hasNegative = input.monthlyIncome.some(
      (m) => m.grossSalary < 0 || m.bonus < 0 || m.taxExempt < 0 || m.taxPaid < 0
    );
    if (hasNegative) {
      errors.push('Các giá trị thu nhập không được âm');
    }
  }

  if (input.dependents) {
    for (const dep of input.dependents) {
      if (dep.fromMonth < 1 || dep.fromMonth > 12) {
        errors.push(`NPT "${dep.name}": Tháng bắt đầu không hợp lệ`);
      }
      if (dep.toMonth < 1 || dep.toMonth > 12) {
        errors.push(`NPT "${dep.name}": Tháng kết thúc không hợp lệ`);
      }
      if (dep.fromMonth > dep.toMonth) {
        errors.push(`NPT "${dep.name}": Tháng bắt đầu phải trước tháng kết thúc`);
      }
    }
  }

  if ((input.voluntaryPension ?? 0) > MAX_VOLUNTARY_PENSION_YEARLY) {
    errors.push(
      `Quỹ hưu trí tự nguyện tối đa ${MAX_VOLUNTARY_PENSION_YEARLY.toLocaleString()} VND/năm`
    );
  }

  return errors;
}
