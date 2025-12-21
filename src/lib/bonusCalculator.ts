/**
 * Bonus Calculator - Tính thuế lương tháng 13 và thưởng Tết
 * So sánh các phương án thời điểm trả để tối ưu thuế
 */

import {
  calculateOldTax,
  calculateNewTax,
  TaxResult,
  SharedTaxState,
  DEFAULT_INSURANCE_OPTIONS,
} from './taxCalculator';

export interface BonusInput {
  monthlySalary: number;
  thirteenthMonthSalary: number;
  tetBonus: number;
  otherBonuses: number;
  dependents: number;
  region: 1 | 2 | 3 | 4;
  hasInsurance: boolean;
}

export interface BonusScenario {
  id: string;
  name: string;
  description: string;
  period: string;
  taxLaw: 'old' | 'new';
  timing: 'dec-2025' | 'h1-2026' | 'h2-2026';
}

export interface BonusScenarioResult {
  scenario: BonusScenario;
  totalBonus: number;
  monthlyTaxWithBonus: number;
  monthlyTaxWithoutBonus: number;
  additionalTax: number;
  netBonus: number;
  effectiveTaxRate: number;
  annualIncome: number;
  annualTax: number;
}

export interface BonusComparisonResult {
  input: BonusInput;
  scenarios: BonusScenarioResult[];
  recommendation: BonusScenario;
  maxSavings: number;
  savingsDetails: string;
}

// Available scenarios for bonus payment
// Note: Luật mới (5 bậc) áp dụng từ 01/01/2026 cho thu nhập từ tiền lương, tiền công
export const BONUS_SCENARIOS: BonusScenario[] = [
  {
    id: 'dec-2025',
    name: 'Tháng 12/2025',
    description: 'Trả thưởng trong tháng 12/2025 (luật cũ 7 bậc)',
    period: '12/2025',
    taxLaw: 'old',
    timing: 'dec-2025',
  },
  {
    id: 'h1-2026',
    name: 'Nửa đầu 2026',
    description: 'Trả thưởng tháng 1-6/2026 (luật mới 5 bậc)',
    period: '01-06/2026',
    taxLaw: 'new',
    timing: 'h1-2026',
  },
  {
    id: 'h2-2026',
    name: 'Nửa cuối 2026',
    description: 'Trả thưởng tháng 7-12/2026 (luật mới 5 bậc)',
    period: '07-12/2026',
    taxLaw: 'new',
    timing: 'h2-2026',
  },
];

/**
 * Calculate tax for a scenario with bonus included
 */
function calculateScenarioTax(
  input: BonusInput,
  scenario: BonusScenario
): BonusScenarioResult {
  const totalBonus = input.thirteenthMonthSalary + input.tetBonus + input.otherBonuses;

  // Calculate monthly income with bonus added to that month
  const monthlyIncomeWithBonus = input.monthlySalary + totalBonus;

  // Build tax input
  const taxInputWithBonus: SharedTaxState = {
    grossIncome: monthlyIncomeWithBonus,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };

  const taxInputWithoutBonus: SharedTaxState = {
    grossIncome: input.monthlySalary,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };

  // Calculate tax based on which law applies
  let resultWithBonus: TaxResult;
  let resultWithoutBonus: TaxResult;

  if (scenario.taxLaw === 'old') {
    resultWithBonus = calculateOldTax(taxInputWithBonus);
    resultWithoutBonus = calculateOldTax(taxInputWithoutBonus);
  } else {
    resultWithBonus = calculateNewTax(taxInputWithBonus);
    resultWithoutBonus = calculateNewTax(taxInputWithoutBonus);
  }

  const monthlyTaxWithBonus = resultWithBonus.taxAmount;
  const monthlyTaxWithoutBonus = resultWithoutBonus.taxAmount;
  const additionalTax = monthlyTaxWithBonus - monthlyTaxWithoutBonus;
  const netBonus = totalBonus - additionalTax;
  const effectiveTaxRate = totalBonus > 0 ? (additionalTax / totalBonus) * 100 : 0;

  // Calculate approximate annual figures
  // 11 months normal + 1 month with bonus
  const annualTaxNormalMonths = monthlyTaxWithoutBonus * 11;
  const annualTax = annualTaxNormalMonths + monthlyTaxWithBonus;
  const annualIncome = input.monthlySalary * 12 + totalBonus;

  return {
    scenario,
    totalBonus,
    monthlyTaxWithBonus,
    monthlyTaxWithoutBonus,
    additionalTax,
    netBonus,
    effectiveTaxRate,
    annualIncome,
    annualTax,
  };
}

/**
 * Calculate and compare all bonus payment scenarios
 */
export function calculateBonusComparison(input: BonusInput): BonusComparisonResult {
  const scenarios = BONUS_SCENARIOS.map(scenario => calculateScenarioTax(input, scenario));

  // Find the best scenario (lowest additional tax)
  const sortedByTax = [...scenarios].sort((a, b) => a.additionalTax - b.additionalTax);
  const bestScenario = sortedByTax[0];
  const worstScenario = sortedByTax[sortedByTax.length - 1];

  const maxSavings = worstScenario.additionalTax - bestScenario.additionalTax;

  // Generate savings description
  let savingsDetails = '';
  if (maxSavings > 0) {
    savingsDetails = `Tiết kiệm tối đa ${formatMoney(maxSavings)} so với ${worstScenario.scenario.name}`;
  } else {
    savingsDetails = 'Các phương án có mức thuế tương đương';
  }

  return {
    input,
    scenarios,
    recommendation: bestScenario.scenario,
    maxSavings,
    savingsDetails,
  };
}

/**
 * Calculate effective marginal tax rate on bonus
 * This shows what percentage of the bonus goes to taxes
 */
export function calculateMarginalBonusTaxRate(
  input: BonusInput,
  useNewLaw: boolean
): number {
  const totalBonus = input.thirteenthMonthSalary + input.tetBonus + input.otherBonuses;
  if (totalBonus <= 0) return 0;

  const taxInputWithBonus: SharedTaxState = {
    grossIncome: input.monthlySalary + totalBonus,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };

  const taxInputWithoutBonus: SharedTaxState = {
    grossIncome: input.monthlySalary,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };

  const resultWithBonus = useNewLaw
    ? calculateNewTax(taxInputWithBonus)
    : calculateOldTax(taxInputWithBonus);

  const resultWithoutBonus = useNewLaw
    ? calculateNewTax(taxInputWithoutBonus)
    : calculateOldTax(taxInputWithoutBonus);

  const additionalTax = resultWithBonus.taxAmount - resultWithoutBonus.taxAmount;
  return (additionalTax / totalBonus) * 100;
}

/**
 * Format money for display
 */
function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Calculate optimal bonus split between periods
 * Sometimes splitting the bonus can result in lower overall tax
 */
export function calculateOptimalBonusSplit(
  input: BonusInput,
  splitRatio: number // 0-1, portion paid in H1
): {
  h1Portion: number;
  h2Portion: number;
  h1Tax: number;
  h2Tax: number;
  totalTax: number;
  totalNetBonus: number;
} {
  const totalBonus = input.thirteenthMonthSalary + input.tetBonus + input.otherBonuses;
  const h1Portion = totalBonus * splitRatio;
  const h2Portion = totalBonus * (1 - splitRatio);

  // Calculate H1 tax (old law)
  const h1TaxInput: SharedTaxState = {
    grossIncome: input.monthlySalary + h1Portion,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };
  const h1Result = calculateOldTax(h1TaxInput);

  // Calculate H2 tax (new law)
  const h2TaxInput: SharedTaxState = {
    grossIncome: input.monthlySalary + h2Portion,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };
  const h2Result = calculateNewTax(h2TaxInput);

  // Calculate base tax (no bonus)
  const baseTaxInput: SharedTaxState = {
    grossIncome: input.monthlySalary,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };
  const baseResultOld = calculateOldTax(baseTaxInput);
  const baseResultNew = calculateNewTax(baseTaxInput);

  const h1Tax = h1Result.taxAmount - baseResultOld.taxAmount;
  const h2Tax = h2Result.taxAmount - baseResultNew.taxAmount;
  const totalTax = h1Tax + h2Tax;
  const totalNetBonus = totalBonus - totalTax;

  return {
    h1Portion,
    h2Portion,
    h1Tax,
    h2Tax,
    totalTax,
    totalNetBonus,
  };
}

/**
 * Find the optimal split ratio that minimizes total tax
 */
export function findOptimalSplitRatio(input: BonusInput): {
  optimalRatio: number;
  result: ReturnType<typeof calculateOptimalBonusSplit>;
} {
  let bestRatio = 0;
  let bestResult = calculateOptimalBonusSplit(input, 0);

  // Try different split ratios - use integer loop to avoid floating point precision issues
  for (let i = 0; i <= 10; i++) {
    const ratio = i / 10;
    const result = calculateOptimalBonusSplit(input, ratio);
    if (result.totalTax < bestResult.totalTax) {
      bestRatio = ratio;
      bestResult = result;
    }
  }

  return {
    optimalRatio: bestRatio,
    result: bestResult,
  };
}
