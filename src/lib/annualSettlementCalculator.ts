/**
 * Annual Tax Settlement Calculator (Quyết toán thuế TNCN năm)
 *
 * - Năm 2025: biểu 7 bậc, giảm trừ 11 triệu/4,4 triệu, hưu trí tự nguyện tối đa 1 triệu/tháng.
 * - Năm 2026 (kỳ tính thuế 2026, NĐ 253/2026/NĐ-CP Điều 69.1.a): biểu 5 bậc, giảm trừ 15,5 triệu/6,2 triệu
 *   cho cả 12 tháng; hưu trí bổ sung + hưu trí tự nguyện + bảo hiểm nhân thọ tối đa 3 triệu/tháng;
 *   giảm trừ chi y tế tối đa 23 triệu/năm, giáo dục - đào tạo tối đa 24 triệu/năm (NĐ 253/2026 Điều 49.2).
 * - Biểu thuế năm = biểu tháng × 12 (Luật Thuế TNCN 109/2025/QH15 Điều 9); giảm trừ bản thân đủ 12 tháng.
 * - Thủ tục quyết toán: NĐ 253/2026/NĐ-CP Điều 51, TT 87/2026/TT-BTC, TT 89/2026/TT-BTC; hạn: NĐ 252/2026/NĐ-CP Điều 10.5.
 * - Chênh lệch từ 50.000đ trở xuống: phải nộp thêm thì được miễn (NĐ 252/2026 Điều 32.2.a);
 *   nộp thừa thì không hoàn mà bù trừ kỳ sau (NĐ 252/2026 Điều 29.4.a).
 */

import {
  RegionType,
  InsuranceOptions,
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  getInsuranceDetailed,
  getVoluntaryPensionCap,
  InsuranceDetail,
  MEDICAL_DEDUCTION_CAP,
  EDUCATION_DEDUCTION_CAP,
  calculateAnnualSalaryTax,
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
  voluntaryPension: number; // Hưu trí bổ sung, tự nguyện + BH nhân thọ (VNĐ/năm, trần theo getAnnualPensionCap)
  medicalExpenses?: number; // Chi khám chữa bệnh (VNĐ/năm, từ năm 2026, tối đa 23 triệu)
  educationExpenses?: number; // Học phí, đào tạo (VNĐ/năm, từ năm 2026, tối đa 24 triệu)

  // Insurance
  insuranceOptions: InsuranceOptions;
  region: RegionType;

  // Optional: Manual override for tax paid
  manualTaxPaid?: number;
}

/**
 * Monthly breakdown for display
 */
export interface MonthlyBreakdown {
  month: number;
  monthName: string;
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
  otherDeductionDetail: {
    charity: number;
    pension: number; // đã chặn trần
    medical: number; // đã chặn trần, 0 nếu năm 2025
    education: number; // đã chặn trần, 0 nếu năm 2025
  };
  totalDeductions: number;

  // Tax calculation
  totalAssessableIncome: number;
  annualTaxDue: number;
  totalTaxPaid: number;

  // Settlement result
  difference: number; // Positive = pay more, Negative = refund
  settlementType: 'pay' | 'refund' | 'even';
  isSmallDifference: boolean; // |chênh lệch| ≤ 50.000đ: miễn nộp thêm / không hoàn, bù trừ kỳ sau

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

/** Giảm trừ chi y tế, giáo dục - đào tạo tối đa/năm, từ kỳ tính thuế 2026 (NĐ 253/2026/NĐ-CP Điều 49.2) */
export { MEDICAL_DEDUCTION_CAP, EDUCATION_DEDUCTION_CAP };

/** Chênh lệch quyết toán từ mức này trở xuống: miễn nộp thêm / không hoàn (NĐ 252/2026/NĐ-CP Điều 32.2.a, 29.4.a) */
export const SMALL_SETTLEMENT_AMOUNT = 50_000;

// ===== HELPER FUNCTIONS =====

/**
 * Trần hưu trí bổ sung + tự nguyện + BH nhân thọ cả năm: 12 triệu (2025), 36 triệu (2026)
 */
export function getAnnualPensionCap(year: SettlementYear): number {
  return getVoluntaryPensionCap(new Date(year, 0, 1)) * 12;
}

/**
 * Generate unique ID for dependent
 */
export function generateDependentId(): string {
  return `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Luật áp dụng cho thu nhập tiền lương của năm: 2025 luật cũ; 2026 luật mới cho cả 12 tháng
 * (kỳ tính thuế 2026 — Luật Thuế TNCN 109/2025/QH15 Điều 29, NĐ 253/2026/NĐ-CP Điều 69.1.a)
 */
export function getLawForMonth(year: SettlementYear, _month: number): 'old' | 'new' {
  return year >= 2026 ? 'new' : 'old';
}

/**
 * Thuế theo biểu lũy tiến từng phần cho kỳ `months` tháng (ngưỡng bậc = biểu tháng × months)
 */
function progressiveTax(assessableIncome: number, law: 'old' | 'new', months: number): number {
  let tax = 0;
  for (const bracket of law === 'old' ? OLD_TAX_BRACKETS : NEW_TAX_BRACKETS) {
    const min = bracket.min * months;
    if (assessableIncome <= min) break;
    tax += (Math.min(assessableIncome, bracket.max * months) - min) * bracket.rate;
  }
  return tax;
}

/**
 * Thuế TNCN năm theo biểu năm (= biểu tháng × 12, Luật Thuế TNCN Điều 9), làm tròn đồng
 */
export function calculateAnnualTax(assessableIncome: number, law: 'old' | 'new'): number {
  return Math.round(calculateAnnualSalaryTax(assessableIncome, law === 'old' ? OLD_TAX_BRACKETS : NEW_TAX_BRACKETS));
}

/**
 * Calculate total months a dependent is registered
 */
function calculateDependentMonths(dep: DependentInfo): number {
  return Math.max(0, dep.toMonth - dep.fromMonth + 1);
}

/**
 * Calculate dependent count for a specific month
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
  const deductions = law === 'old' ? OLD_DEDUCTIONS : NEW_DEDUCTIONS;
  const totalDeductions =
    insuranceDeduction +
    deductions.personal +
    dependents * deductions.dependent;

  return progressiveTax(Math.max(0, grossSalary - totalDeductions), law, 1);
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
  const law = getLawForMonth(year, 12);
  const deductions = law === 'new' ? NEW_DEDUCTIONS : OLD_DEDUCTIONS;

  // Insurance per month (date-aware caps)
  const insuranceByMonth = monthlyIncome.map((entry) =>
    getInsuranceDetailed(entry.grossSalary, region, insuranceOptions, new Date(year, entry.month - 1, 1))
  );

  // Monthly breakdown
  const monthlyBreakdown: MonthlyBreakdown[] = monthlyIncome.map((entry, i) => ({
    month: entry.month,
    monthName: MONTH_NAMES[entry.month - 1],
    gross: entry.grossSalary,
    bonus: entry.bonus,
    taxExempt: entry.taxExempt,
    taxableIncome: entry.grossSalary + entry.bonus - entry.taxExempt,
    insurance: insuranceByMonth[i].total,
    personalDeduction: deductions.personal,
    dependentDeduction: deductions.dependent * getDependentCountForMonth(dependents, entry.month),
    taxPaid: entry.taxPaid,
  }));

  // Totals
  const sum = (pick: (entry: MonthlyIncomeEntry) => number) =>
    monthlyIncome.reduce((total, entry) => total + pick(entry), 0);
  const totalGrossIncome = sum((m) => m.grossSalary);
  const totalBonusIncome = sum((m) => m.bonus);
  const totalTaxExemptIncome = sum((m) => m.taxExempt);
  const totalTaxableIncome = totalGrossIncome + totalBonusIncome - totalTaxExemptIncome;
  const totalTaxPaid = manualTaxPaid ?? sum((m) => m.taxPaid);

  // Deductions: giảm trừ bản thân đủ 12 tháng khi quyết toán
  const totalPersonalDeduction = 12 * deductions.personal;
  const totalDependentMonths = dependents.reduce(
    (total, dep) => total + calculateDependentMonths(dep),
    0
  );
  const totalDependentDeduction = totalDependentMonths * deductions.dependent;

  const totalInsuranceDetail = insuranceByMonth.reduce(
    (total, detail) => ({
      bhxh: total.bhxh + detail.bhxh,
      bhyt: total.bhyt + detail.bhyt,
      bhtn: total.bhtn + detail.bhtn,
      total: total.total + detail.total,
    }),
    { bhxh: 0, bhyt: 0, bhtn: 0, total: 0 }
  );
  const totalInsuranceDeduction = totalInsuranceDetail.total;

  const otherDeductionDetail = {
    charity: charitableContributions,
    pension: Math.min(voluntaryPension, getAnnualPensionCap(year)),
    medical: law === 'new' ? Math.min(input.medicalExpenses ?? 0, MEDICAL_DEDUCTION_CAP) : 0,
    education: law === 'new' ? Math.min(input.educationExpenses ?? 0, EDUCATION_DEDUCTION_CAP) : 0,
  };
  const totalOtherDeduction =
    otherDeductionDetail.charity +
    otherDeductionDetail.pension +
    otherDeductionDetail.medical +
    otherDeductionDetail.education;
  const totalDeductions =
    totalPersonalDeduction +
    totalDependentDeduction +
    totalInsuranceDeduction +
    totalOtherDeduction;

  const totalAssessableIncome = Math.max(0, totalTaxableIncome - totalDeductions);
  const annualTaxDue = calculateAnnualTax(totalAssessableIncome, law);

  // Settlement difference (làm tròn đồng: thuế tháng ước tính có phần lẻ dưới 1 đồng)
  const difference = Math.round(annualTaxDue - totalTaxPaid);
  const settlementType: 'pay' | 'refund' | 'even' =
    difference > 0 ? 'pay' : difference < 0 ? 'refund' : 'even';

  const monthsCount = monthlyIncome.length || 12;

  return {
    year,

    totalGrossIncome,
    totalBonusIncome,
    totalTaxExemptIncome,
    totalTaxableIncome,

    totalPersonalDeduction,
    totalDependentDeduction,
    totalInsuranceDeduction,
    totalOtherDeduction,
    otherDeductionDetail,
    totalDeductions,

    totalAssessableIncome,
    annualTaxDue,
    totalTaxPaid,

    difference,
    settlementType,
    isSmallDifference: difference !== 0 && Math.abs(difference) <= SMALL_SETTLEMENT_AMOUNT,

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
