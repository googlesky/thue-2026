import { formatCurrency } from './taxCalculator';

export type Gender = 'male' | 'female';

export interface PensionInput {
  gender: Gender;
  birthYear: number;
  birthMonth: number;
  contributionStartYear: number;
  contributionYears: number;
  contributionMonths: number;
  currentMonthlySalary: number;
  earlyRetirementYears: number;
  isHazardousWork: boolean;
}

export interface PensionResult {
  retirementAge: { years: number; months: number };
  retirementYear: number;
  retirementMonth: number;
  totalContributionYears: number;
  totalContributionMonths: number;
  baseRate: number;
  deductionRate: number;
  finalRate: number;
  averageSalary: number;
  monthlyPension: number;
  yearlyPension: number;
  oneTimeAllowance: number;
  totalContributed: number;
  yearsToBreakeven: number;
}

// Constants based on Vietnamese BHXH Law 2024 (effective 01/7/2025)

// Retirement age calculation (starting from 2025)
const RETIREMENT_AGE_2025 = {
  male: { years: 61, months: 3 },
  female: { years: 56, months: 8 },
};

// Annual increase in retirement age
const RETIREMENT_AGE_INCREASE = {
  male: 3, // months per year until 62 in 2028
  female: 4, // months per year until 60 in 2035
};

// Target retirement age
const TARGET_RETIREMENT_AGE = {
  male: 62,
  female: 60,
};

// Pension rate constants
const FEMALE_PENSION_RATES = {
  minYears: 15,
  minRate: 0.45, // 45% at 15 years
  maxRate: 0.75, // 75% max
  maxYears: 30, // 30 years for max rate
  increaseRate: 0.02, // 2% per year after 15 years
};

const MALE_PENSION_RATES = {
  minYears: 15,
  minRate: 0.40, // 40% at 15 years
  tier1End: 19, // Years 16-19
  tier1Increase: 0.01, // 1% per year for years 16-19
  tier2Rate: 0.45, // 45% at 20 years
  tier2Start: 20,
  tier2Increase: 0.02, // 2% per year after 20 years
  maxRate: 0.75, // 75% max
  maxYears: 35, // 35 years for max rate
};

// Early retirement deduction
const EARLY_RETIREMENT_DEDUCTION = {
  perYear: 0.02, // 2% per year
  perPartialYear: 0.01, // 1% for 6-12 months
};

// One-time allowance threshold
const ONE_TIME_ALLOWANCE = {
  male: 35,
  female: 30,
  ratePerYear: 0.5, // 0.5 month per extra year
};

// Insurance contribution rates (employee + employer)
const TOTAL_CONTRIBUTION_RATE = 0.255; // 8% + 17.5% = 25.5%

/**
 * Calculate retirement age based on birth year and gender
 * Follows the gradual increase schedule from 2025
 */
export function calculateRetirementAge(birthYear: number, gender: Gender): { years: number; months: number } {
  const baseAge = RETIREMENT_AGE_2025[gender];
  const targetAge = TARGET_RETIREMENT_AGE[gender];
  const increasePerYear = RETIREMENT_AGE_INCREASE[gender];

  // Year when person turns the base retirement age (2025 baseline)
  const baseRetirementYear = birthYear + baseAge.years;

  // Calculate years since 2025
  const yearsSince2025 = Math.max(0, baseRetirementYear - 2025);

  // Calculate total months increase
  const monthsIncrease = Math.min(
    yearsSince2025 * increasePerYear,
    (targetAge - baseAge.years) * 12 - baseAge.months
  );

  // Calculate final retirement age
  let totalMonths = baseAge.years * 12 + baseAge.months + monthsIncrease;

  // Cap at target age
  const targetTotalMonths = targetAge * 12;
  totalMonths = Math.min(totalMonths, targetTotalMonths);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

/**
 * Calculate base pension rate based on contribution years and gender
 */
export function calculateBaseRate(contributionYears: number, gender: Gender): number {
  if (gender === 'female') {
    const rates = FEMALE_PENSION_RATES;
    if (contributionYears < rates.minYears) {
      return 0; // Not eligible for pension
    }
    // Female: 15 years = 45%, +2%/year, max 75% at 30 years
    const yearsAboveMin = Math.min(contributionYears - rates.minYears, rates.maxYears - rates.minYears);
    const rate = rates.minRate + yearsAboveMin * rates.increaseRate;
    return Math.min(rate, rates.maxRate);
  } else {
    const rates = MALE_PENSION_RATES;
    if (contributionYears < rates.minYears) {
      return 0; // Not eligible for pension
    }
    // Male: More complex calculation
    if (contributionYears <= rates.minYears) {
      return rates.minRate; // 40% at 15 years
    } else if (contributionYears < rates.tier2Start) {
      // Years 16-19: +1% per year
      const yearsInTier1 = contributionYears - rates.minYears;
      return rates.minRate + yearsInTier1 * rates.tier1Increase;
    } else {
      // 20+ years: 45% + 2% per year after 20
      const yearsAbove20 = Math.min(contributionYears - rates.tier2Start, rates.maxYears - rates.tier2Start);
      const rate = rates.tier2Rate + yearsAbove20 * rates.tier2Increase;
      return Math.min(rate, rates.maxRate);
    }
  }
}

/**
 * Calculate early retirement deduction rate
 */
export function calculateEarlyRetirementDeduction(earlyRetirementYears: number): number {
  if (earlyRetirementYears <= 0) {
    return 0;
  }

  const fullYears = Math.floor(earlyRetirementYears);
  const partialYear = earlyRetirementYears - fullYears;

  let deduction = fullYears * EARLY_RETIREMENT_DEDUCTION.perYear;

  // If there's a partial year (6-12 months), add 1% deduction
  if (partialYear >= 0.5) {
    deduction += EARLY_RETIREMENT_DEDUCTION.perPartialYear;
  }

  return deduction;
}

/**
 * Calculate one-time allowance for contributions beyond the max rate threshold
 */
export function calculateOneTimeAllowance(
  contributionYears: number,
  gender: Gender,
  averageSalary: number
): number {
  const threshold = ONE_TIME_ALLOWANCE[gender];

  if (contributionYears <= threshold) {
    return 0;
  }

  const extraYears = contributionYears - threshold;
  return extraYears * ONE_TIME_ALLOWANCE.ratePerYear * averageSalary;
}

/**
 * Calculate total contributions over the contribution period
 */
export function calculateTotalContributed(
  averageSalary: number,
  contributionYears: number,
  contributionMonths: number
): number {
  const totalMonths = contributionYears * 12 + contributionMonths;
  return averageSalary * totalMonths * TOTAL_CONTRIBUTION_RATE;
}

/**
 * Calculate years to breakeven (when total pension received equals total contributed)
 */
export function calculateYearsToBreakeven(
  totalContributed: number,
  monthlyPension: number
): number {
  if (monthlyPension <= 0) {
    return 0;
  }

  const yearlyPension = monthlyPension * 12;
  return totalContributed / yearlyPension;
}

/**
 * Main pension calculation function
 */
export function calculatePension(input: PensionInput): PensionResult {
  const {
    gender,
    birthYear,
    birthMonth,
    contributionStartYear,
    contributionYears,
    contributionMonths,
    currentMonthlySalary,
    earlyRetirementYears,
    isHazardousWork,
  } = input;

  // Calculate retirement age
  const retirementAge = calculateRetirementAge(birthYear, gender);

  // Calculate retirement date
  let retirementYear = birthYear + retirementAge.years;
  let retirementMonth = birthMonth + retirementAge.months;

  // Adjust for month overflow
  if (retirementMonth > 12) {
    retirementYear += Math.floor(retirementMonth / 12);
    retirementMonth = retirementMonth % 12;
  }
  if (retirementMonth === 0) {
    retirementMonth = 12;
    retirementYear -= 1;
  }

  // Apply early retirement if specified
  if (earlyRetirementYears > 0) {
    retirementYear -= Math.floor(earlyRetirementYears);
    const earlyMonths = Math.round((earlyRetirementYears % 1) * 12);
    retirementMonth -= earlyMonths;

    if (retirementMonth <= 0) {
      retirementYear -= 1;
      retirementMonth += 12;
    }
  }

  // Calculate total contribution period
  const totalContributionYears = contributionYears + Math.floor(contributionMonths / 12);
  const totalContributionMonths = contributionMonths % 12;

  // Calculate base pension rate
  const baseRate = calculateBaseRate(totalContributionYears, gender);

  // Calculate early retirement deduction
  const deductionRate = calculateEarlyRetirementDeduction(earlyRetirementYears);

  // Calculate final rate (base rate - early retirement deduction)
  const finalRate = Math.max(0, baseRate - deductionRate);

  // For simplicity, use current salary as average salary
  // In reality, this would be calculated from contribution history
  const averageSalary = currentMonthlySalary;

  // Calculate monthly pension
  const monthlyPension = averageSalary * finalRate;

  // Calculate yearly pension
  const yearlyPension = monthlyPension * 12;

  // Calculate one-time allowance (for contributions beyond max rate years)
  const oneTimeAllowance = calculateOneTimeAllowance(totalContributionYears, gender, averageSalary);

  // Calculate total contributed amount
  const totalContributed = calculateTotalContributed(
    averageSalary,
    contributionYears,
    contributionMonths
  );

  // Calculate years to breakeven
  const yearsToBreakeven = calculateYearsToBreakeven(totalContributed, monthlyPension);

  return {
    retirementAge,
    retirementYear,
    retirementMonth,
    totalContributionYears,
    totalContributionMonths,
    baseRate,
    deductionRate,
    finalRate,
    averageSalary,
    monthlyPension,
    yearlyPension,
    oneTimeAllowance,
    totalContributed,
    yearsToBreakeven,
  };
}

/**
 * Format pension result for display
 */
export function formatPensionResult(result: PensionResult): string {
  return `
Tuổi nghỉ hưu: ${result.retirementAge.years} năm ${result.retirementAge.months} tháng
Thời điểm nghỉ hưu: ${result.retirementMonth}/${result.retirementYear}
Tổng thời gian đóng: ${result.totalContributionYears} năm ${result.totalContributionMonths} tháng

Tỷ lệ hưởng:
- Tỷ lệ cơ bản: ${(result.baseRate * 100).toFixed(1)}%
- Giảm trừ nghỉ sớm: ${(result.deductionRate * 100).toFixed(1)}%
- Tỷ lệ cuối cùng: ${(result.finalRate * 100).toFixed(1)}%

Lương bình quân: ${formatCurrency(result.averageSalary)}
Lương hưu hàng tháng: ${formatCurrency(result.monthlyPension)}
Lương hưu hàng năm: ${formatCurrency(result.yearlyPension)}
Trợ cấp một lần: ${formatCurrency(result.oneTimeAllowance)}

Tổng đã đóng: ${formatCurrency(result.totalContributed)}
Số năm hòa vốn: ${result.yearsToBreakeven.toFixed(1)} năm
  `.trim();
}

/**
 * Validate pension input
 */
export function validatePensionInput(input: PensionInput): string[] {
  const errors: string[] = [];

  if (input.birthYear < 1900 || input.birthYear > new Date().getFullYear()) {
    errors.push('Năm sinh không hợp lệ');
  }

  if (input.birthMonth < 1 || input.birthMonth > 12) {
    errors.push('Tháng sinh không hợp lệ (1-12)');
  }

  if (input.contributionStartYear < 1900) {
    errors.push('Năm bắt đầu đóng không hợp lệ');
  }

  if (input.contributionYears < 0) {
    errors.push('Số năm đóng không thể âm');
  }

  if (input.contributionMonths < 0 || input.contributionMonths >= 12) {
    errors.push('Số tháng đóng phải từ 0-11');
  }

  if (input.currentMonthlySalary < 0) {
    errors.push('Lương không thể âm');
  }

  if (input.earlyRetirementYears < 0) {
    errors.push('Số năm nghỉ sớm không thể âm');
  }

  const totalYears = input.contributionYears + Math.floor(input.contributionMonths / 12);
  const minYears = input.gender === 'female' ? FEMALE_PENSION_RATES.minYears : MALE_PENSION_RATES.minYears;

  if (totalYears < minYears) {
    errors.push(`Chưa đủ ${minYears} năm đóng để được hưởng lương hưu`);
  }

  return errors;
}

/**
 * Calculate pension scenarios for different retirement ages
 */
export function calculatePensionScenarios(input: Omit<PensionInput, 'earlyRetirementYears'>): {
  normal: PensionResult;
  early1Year: PensionResult;
  early2Years: PensionResult;
  early3Years: PensionResult;
} {
  const baseInput = { ...input, earlyRetirementYears: 0 };

  return {
    normal: calculatePension(baseInput),
    early1Year: calculatePension({ ...input, earlyRetirementYears: 1 }),
    early2Years: calculatePension({ ...input, earlyRetirementYears: 2 }),
    early3Years: calculatePension({ ...input, earlyRetirementYears: 3 }),
  };
}
