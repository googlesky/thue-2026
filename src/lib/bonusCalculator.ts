/**
 * Bonus Calculator - Tính thuế lương tháng 13 và thưởng Tết
 *
 * Thưởng là thu nhập từ tiền lương, tiền công (NĐ 253/2026/NĐ-CP Điều 8.2): cộng vào lương
 * tháng chi trả để TẠM khấu trừ; nghĩa vụ cuối cùng xác định khi quyết toán năm theo biểu năm
 * (Luật Thuế TNCN 109/2025/QH15 Điều 8, 9). Thưởng nhận năm nào tính vào quyết toán năm đó
 * (Điều 8.3: thời điểm xác định thu nhập là thời điểm trả). Thưởng không đóng BH bắt buộc.
 */

import {
  calculateOldTax,
  calculateNewTax,
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  AllowancesState,
  InsuranceOptions,
  TaxInputWithDate,
} from './taxCalculator';
import { calculateAnnualSalaryTax as calculateAnnualTax } from './taxCalculator';

export interface BonusInput {
  monthlySalary: number;
  thirteenthMonthSalary: number;
  tetBonus: number;
  otherBonuses: number;
  dependents: number;
  region: 1 | 2 | 3 | 4;
  hasInsurance: boolean;
  // Như tab Tính thuế (tùy chọn) để lương nền tính giống tab chính
  insuranceOptions?: InsuranceOptions;
  declaredSalary?: number; // Lương đóng BH (mặc định = lương tháng)
  otherDeductions?: number;
  pensionContribution?: number;
  allowances?: AllowancesState;
}

export interface BonusScenario {
  id: string;
  name: string;
  description: string;
  taxLaw: 'old' | 'new';
  taxYear: number; // Kỳ quyết toán chứa khoản thưởng
  payMonth: number; // Tháng chi trả (1-12) để tính tạm khấu trừ
}

export interface BonusScenarioResult {
  scenario: BonusScenario;
  totalBonus: number;
  withholdingTax: number; // Tạm khấu trừ thêm trong tháng nhận thưởng
  finalTax: number; // Thuế thực trên thưởng sau quyết toán năm
  netBonus: number; // Thưởng thực nhận sau quyết toán
  effectiveTaxRate: number;
}

export interface BonusComparisonResult {
  input: BonusInput;
  scenarios: BonusScenarioResult[];
  maxSavings: number; // Chênh thuế sau quyết toán giữa phương án cao nhất và thấp nhất
  savingsDetails: string;
}

// Kỳ hiện hành: cuối năm 2026 hay đầu năm 2027 (cùng biểu 5 bậc); T12/2025 chỉ để tham khảo luật cũ.
export const BONUS_SCENARIOS: BonusScenario[] = [
  {
    id: 'h2-2026',
    name: 'Cuối năm 2026',
    description: 'Trả trong T10–T12/2026, quyết toán cùng thu nhập năm 2026',
    taxLaw: 'new',
    taxYear: 2026,
    payMonth: 12,
  },
  {
    id: 'jan-2027',
    name: 'Đầu năm 2027',
    description: 'Trả T1–T2/2027 (trước Tết), quyết toán vào năm 2027',
    taxLaw: 'new',
    taxYear: 2027,
    payMonth: 1,
  },
  {
    id: 'dec-2025',
    name: 'T12/2025 (luật cũ)',
    description: 'Tham khảo: nếu đã trả trong 12/2025 (7 bậc, giảm trừ 11tr/4,4tr)',
    taxLaw: 'old',
    taxYear: 2025,
    payMonth: 12,
  },
];

const money = (v: number | undefined) => (Number.isFinite(v) && (v as number) > 0 ? (v as number) : 0);

function calculateScenarioTax(input: BonusInput, scenario: BonusScenario): BonusScenarioResult {
  const salary = money(input.monthlySalary);
  const totalBonus = money(input.thirteenthMonthSalary) + money(input.tetBonus) + money(input.otherBonuses);
  const calc = scenario.taxLaw === 'old' ? calculateOldTax : calculateNewTax;

  const salaryInput = (month: number): TaxInputWithDate => ({
    grossIncome: salary,
    declaredSalary: input.declaredSalary ?? salary, // BH chỉ trên lương, không trên thưởng
    dependents: Math.max(0, Math.floor(input.dependents || 0)),
    otherDeductions: input.otherDeductions,
    pensionContribution: input.pensionContribution,
    hasInsurance: input.hasInsurance,
    insuranceOptions: input.insuranceOptions,
    region: input.region,
    allowances: input.allowances,
    calculationDate: new Date(scenario.taxYear, month - 1, 1),
  });

  // Tạm khấu trừ: thưởng cộng vào lương tháng chi trả
  const payMonth = salaryInput(scenario.payMonth);
  const withholdingTax =
    calc({ ...payMonth, grossIncome: salary + totalBonus }).taxAmount - calc(payMonth).taxAmount;

  // Quyết toán năm: 12 tháng lương (trần BH, mức phụ cấp theo từng tháng) + thưởng
  let annualTaxable = 0; // chưa chặn 0: tháng lương thấp bù cho thưởng
  for (let month = 1; month <= 12; month++) {
    const r = calc(salaryInput(month));
    annualTaxable += r.grossIncome + (r.allowancesBreakdown?.taxable ?? 0) - r.totalDeductions;
  }
  const brackets = scenario.taxLaw === 'old' ? OLD_TAX_BRACKETS : NEW_TAX_BRACKETS;
  const finalTax =
    calculateAnnualTax(annualTaxable + totalBonus, brackets) - calculateAnnualTax(annualTaxable, brackets);

  return {
    scenario,
    totalBonus,
    withholdingTax,
    finalTax,
    netBonus: totalBonus - finalTax,
    effectiveTaxRate: totalBonus > 0 ? (finalTax / totalBonus) * 100 : 0,
  };
}

/**
 * Calculate and compare all bonus payment scenarios
 */
export function calculateBonusComparison(input: BonusInput): BonusComparisonResult {
  const scenarios = BONUS_SCENARIOS.map(scenario => calculateScenarioTax(input, scenario));

  const taxes = scenarios.map(s => s.finalTax);
  const worst = scenarios[taxes.indexOf(Math.max(...taxes))];
  const maxSavings = worst.finalTax - Math.min(...taxes);

  const savingsDetails = maxSavings > 0
    ? `Thuế sau quyết toán thấp hơn tối đa ${formatMoney(maxSavings)} so với ${worst.scenario.name}`
    : 'Các phương án có mức thuế sau quyết toán tương đương';

  return {
    input,
    scenarios,
    maxSavings,
    savingsDetails,
  };
}

/**
 * Format money for display
 */
function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}
