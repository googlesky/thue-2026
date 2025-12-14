/**
 * ESOP/Stock Options Calculator
 * Calculate tax on employee stock options and compare periods
 */

import {
  calculateOldTax,
  calculateNewTax,
  TaxResult,
  SharedTaxState,
  DEFAULT_INSURANCE_OPTIONS,
} from './taxCalculator';

export interface ESOPInput {
  grantPrice: number; // Price at which options were granted
  exercisePrice: number; // Current market price when exercising
  numberOfShares: number; // Number of shares to exercise
  dependents: number;
  region: 1 | 2 | 3 | 4;
  hasInsurance: boolean;
  monthlySalary: number; // For combined income calculation
}

export interface ESOPPeriod {
  id: string;
  name: string;
  description: string;
  year: string;
  taxLaw: 'old' | 'new';
}

export interface ESOPPeriodResult {
  period: ESOPPeriod;
  taxableGain: number;
  tax: number;
  netGain: number;
  effectiveTaxRate: number;
  totalValue: number;
  combinedWithSalary: {
    monthlyTaxWithESOP: number;
    monthlyTaxWithoutESOP: number;
    additionalTax: number;
  };
}

export interface ESOPComparisonResult {
  input: ESOPInput;
  periods: ESOPPeriodResult[];
  recommendation: ESOPPeriod;
  maxSavings: number;
  taxableGain: number;
  totalValue: number;
}

// Available periods for ESOP exercise
export const ESOP_PERIODS: ESOPPeriod[] = [
  {
    id: '2025',
    name: 'Năm 2025',
    description: 'Thực hiện trong năm 2025 (luật cũ)',
    year: '2025',
    taxLaw: 'old',
  },
  {
    id: 'h1-2026',
    name: 'T1-6/2026',
    description: 'Thực hiện nửa đầu năm 2026 (luật cũ)',
    year: '2026 H1',
    taxLaw: 'old',
  },
  {
    id: 'h2-2026',
    name: 'T7-12/2026',
    description: 'Thực hiện khi luật mới có hiệu lực',
    year: '2026 H2',
    taxLaw: 'new',
  },
];

/**
 * Calculate ESOP taxable gain
 * Gain = (Exercise Price - Grant Price) × Number of Shares
 */
export function calculateESOPGain(input: ESOPInput): number {
  const gain = (input.exercisePrice - input.grantPrice) * input.numberOfShares;
  return Math.max(0, gain); // Cannot be negative
}

/**
 * Calculate total value of ESOP exercise
 * Total Value = Exercise Price × Number of Shares
 */
export function calculateESOPTotalValue(input: ESOPInput): number {
  return input.exercisePrice * input.numberOfShares;
}

/**
 * Calculate tax for ESOP gain in a specific period
 * ESOP gains are taxed as employment income (progressive brackets)
 */
function calculatePeriodTax(input: ESOPInput, period: ESOPPeriod): ESOPPeriodResult {
  const taxableGain = calculateESOPGain(input);
  const totalValue = calculateESOPTotalValue(input);

  // ESOP gain is added to monthly income for that month
  const monthlyIncomeWithESOP = input.monthlySalary + taxableGain;

  // Build tax inputs
  const taxInputWithESOP: SharedTaxState = {
    grossIncome: monthlyIncomeWithESOP,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };

  const taxInputWithoutESOP: SharedTaxState = {
    grossIncome: input.monthlySalary,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };

  // Calculate tax based on applicable law
  let resultWithESOP: TaxResult;
  let resultWithoutESOP: TaxResult;

  if (period.taxLaw === 'old') {
    resultWithESOP = calculateOldTax(taxInputWithESOP);
    resultWithoutESOP = calculateOldTax(taxInputWithoutESOP);
  } else {
    resultWithESOP = calculateNewTax(taxInputWithESOP);
    resultWithoutESOP = calculateNewTax(taxInputWithoutESOP);
  }

  const monthlyTaxWithESOP = resultWithESOP.taxAmount;
  const monthlyTaxWithoutESOP = resultWithoutESOP.taxAmount;
  const additionalTax = monthlyTaxWithESOP - monthlyTaxWithoutESOP;

  // The additional tax is the tax on ESOP gain
  const tax = additionalTax;
  const netGain = taxableGain - tax;
  const effectiveTaxRate = taxableGain > 0 ? (tax / taxableGain) * 100 : 0;

  return {
    period,
    taxableGain,
    tax,
    netGain,
    effectiveTaxRate,
    totalValue,
    combinedWithSalary: {
      monthlyTaxWithESOP,
      monthlyTaxWithoutESOP,
      additionalTax,
    },
  };
}

/**
 * Calculate and compare ESOP tax across different periods
 */
export function calculateESOPComparison(input: ESOPInput): ESOPComparisonResult {
  const periods = ESOP_PERIODS.map((period) => calculatePeriodTax(input, period));

  // Find the best period (lowest tax)
  const sortedByTax = [...periods].sort((a, b) => a.tax - b.tax);
  const bestPeriod = sortedByTax[0];
  const worstPeriod = sortedByTax[sortedByTax.length - 1];

  const maxSavings = worstPeriod.tax - bestPeriod.tax;
  const taxableGain = calculateESOPGain(input);
  const totalValue = calculateESOPTotalValue(input);

  return {
    input,
    periods,
    recommendation: bestPeriod.period,
    maxSavings,
    taxableGain,
    totalValue,
  };
}

/**
 * Calculate break-even price
 * The grant price at which you would break even after taxes
 */
export function calculateBreakEvenPrice(
  exercisePrice: number,
  numberOfShares: number,
  taxRate: number // effective tax rate as decimal (e.g., 0.20 for 20%)
): number {
  // If you exercise at grant price = exercise price, gain = 0, tax = 0
  // Break-even is where net gain after tax = 0
  // Actually, break-even price is always the grant price (where gain = 0)
  // This function calculates the minimum grant price to make profit after tax
  return exercisePrice; // No gain means no tax, so break-even = exercise price
}

/**
 * Calculate annual income if ESOP is spread across multiple months
 */
export function calculateAnnualESOPImpact(
  input: ESOPInput,
  exerciseMonth: number, // 1-12
  useNewLaw: boolean
): {
  monthlyTaxes: number[];
  totalAnnualTax: number;
  taxWithoutESOP: number;
  esopTaxImpact: number;
} {
  const taxableGain = calculateESOPGain(input);
  const monthlyTaxes: number[] = [];

  // Calculate tax for each month
  for (let month = 1; month <= 12; month++) {
    const isExerciseMonth = month === exerciseMonth;
    const monthlyIncome = isExerciseMonth
      ? input.monthlySalary + taxableGain
      : input.monthlySalary;

    const taxInput: SharedTaxState = {
      grossIncome: monthlyIncome,
      dependents: input.dependents,
      otherDeductions: 0,
      hasInsurance: input.hasInsurance,
      insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
      region: input.region,
      pensionContribution: 0,
    };

    const result = useNewLaw ? calculateNewTax(taxInput) : calculateOldTax(taxInput);
    monthlyTaxes.push(result.taxAmount);
  }

  // Calculate tax without ESOP for comparison
  const baseInput: SharedTaxState = {
    grossIncome: input.monthlySalary,
    dependents: input.dependents,
    otherDeductions: 0,
    hasInsurance: input.hasInsurance,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: input.region,
    pensionContribution: 0,
  };
  const baseResult = useNewLaw ? calculateNewTax(baseInput) : calculateOldTax(baseInput);
  const taxWithoutESOP = baseResult.taxAmount * 12;

  const totalAnnualTax = monthlyTaxes.reduce((sum, tax) => sum + tax, 0);
  const esopTaxImpact = totalAnnualTax - taxWithoutESOP;

  return {
    monthlyTaxes,
    totalAnnualTax,
    taxWithoutESOP,
    esopTaxImpact,
  };
}

/**
 * Format money for display
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

/**
 * Estimate tax bracket for a given income
 */
export function estimateTaxBracket(
  taxableIncome: number,
  useNewLaw: boolean
): { rate: number; bracket: string } {
  if (useNewLaw) {
    // New 5-bracket system
    if (taxableIncome <= 10_000_000) return { rate: 5, bracket: '5%' };
    if (taxableIncome <= 20_000_000) return { rate: 10, bracket: '10%' };
    if (taxableIncome <= 40_000_000) return { rate: 20, bracket: '20%' };
    if (taxableIncome <= 80_000_000) return { rate: 30, bracket: '30%' };
    return { rate: 35, bracket: '35%' };
  } else {
    // Old 7-bracket system
    if (taxableIncome <= 5_000_000) return { rate: 5, bracket: '5%' };
    if (taxableIncome <= 10_000_000) return { rate: 10, bracket: '10%' };
    if (taxableIncome <= 18_000_000) return { rate: 15, bracket: '15%' };
    if (taxableIncome <= 32_000_000) return { rate: 20, bracket: '20%' };
    if (taxableIncome <= 52_000_000) return { rate: 25, bracket: '25%' };
    if (taxableIncome <= 80_000_000) return { rate: 30, bracket: '30%' };
    return { rate: 35, bracket: '35%' };
  }
}
