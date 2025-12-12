// Chuyển đổi GROSS - NET
import {
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  INSURANCE_RATES,
  MAX_SOCIAL_INSURANCE_SALARY,
  MAX_UNEMPLOYMENT_INSURANCE_SALARY,
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  RegionType,
} from './taxCalculator';

export interface GrossNetInput {
  amount: number;
  type: 'gross' | 'net';
  dependents: number;
  hasInsurance: boolean;
  useNewLaw: boolean;
  region?: RegionType;
}

export interface GrossNetResult {
  gross: number;
  net: number;
  insurance: number;
  tax: number;
  deductions: {
    personal: number;
    dependent: number;
    insurance: number;
  };
  taxableIncome: number;
}

function calculateInsurance(gross: number, hasInsurance: boolean, region: RegionType = 1): number {
  if (!hasInsurance) return 0;

  // BHXH và BHYT: tối đa 20 lần lương cơ sở
  const bhxhBhytBase = Math.min(gross, MAX_SOCIAL_INSURANCE_SALARY);
  const bhxh = bhxhBhytBase * INSURANCE_RATES.socialInsurance;
  const bhyt = bhxhBhytBase * INSURANCE_RATES.healthInsurance;

  // BHTN: tối đa 20 lần lương tối thiểu vùng
  const maxBhtn = MAX_UNEMPLOYMENT_INSURANCE_SALARY[region];
  const bhtnBase = Math.min(gross, maxBhtn);
  const bhtn = bhtnBase * INSURANCE_RATES.unemploymentInsurance;

  return bhxh + bhyt + bhtn;
}

function calculateTax(taxableIncome: number, brackets: typeof OLD_TAX_BRACKETS): number {
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

export function grossToNet(input: GrossNetInput): GrossNetResult {
  const { amount: gross, dependents, hasInsurance, useNewLaw, region = 1 } = input;
  const deductionRates = useNewLaw ? NEW_DEDUCTIONS : OLD_DEDUCTIONS;
  const brackets = useNewLaw ? NEW_TAX_BRACKETS : OLD_TAX_BRACKETS;

  const insurance = calculateInsurance(gross, hasInsurance, region);
  const personalDeduction = deductionRates.personal;
  const dependentDeduction = dependents * deductionRates.dependent;

  const taxableIncome = Math.max(0, gross - insurance - personalDeduction - dependentDeduction);
  const tax = calculateTax(taxableIncome, brackets);
  const net = gross - insurance - tax;

  return {
    gross,
    net,
    insurance,
    tax,
    deductions: {
      personal: personalDeduction,
      dependent: dependentDeduction,
      insurance,
    },
    taxableIncome,
  };
}

export function netToGross(input: GrossNetInput): GrossNetResult {
  const { amount: targetNet, dependents, hasInsurance, useNewLaw } = input;

  // Binary search để tìm gross từ net
  let low = targetNet;
  let high = targetNet * 2; // Gross thường không quá 2 lần net
  let result: GrossNetResult | null = null;

  // Đảm bảo high đủ lớn
  while (grossToNet({ ...input, amount: high, type: 'gross' }).net < targetNet) {
    high *= 1.5;
    if (high > 1_000_000_000) break; // Safety limit
  }

  // Binary search
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const testResult = grossToNet({ ...input, amount: mid, type: 'gross' });

    if (Math.abs(testResult.net - targetNet) < 1) {
      result = testResult;
      break;
    }

    if (testResult.net < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }

  if (!result) {
    result = grossToNet({ ...input, amount: (low + high) / 2, type: 'gross' });
  }

  return result;
}

export function convertGrossNet(input: GrossNetInput): GrossNetResult {
  if (input.type === 'gross') {
    return grossToNet(input);
  } else {
    return netToGross(input);
  }
}

// Tính lương theo năm
export function calculateYearlyTax(monthlyGross: number, dependents: number, useNewLaw: boolean): {
  monthlyResult: GrossNetResult;
  yearlyGross: number;
  yearlyNet: number;
  yearlyTax: number;
  yearlyInsurance: number;
} {
  const monthlyResult = grossToNet({
    amount: monthlyGross,
    type: 'gross',
    dependents,
    hasInsurance: true,
    useNewLaw,
  });

  return {
    monthlyResult,
    yearlyGross: monthlyResult.gross * 12,
    yearlyNet: monthlyResult.net * 12,
    yearlyTax: monthlyResult.tax * 12,
    yearlyInsurance: monthlyResult.insurance * 12,
  };
}
