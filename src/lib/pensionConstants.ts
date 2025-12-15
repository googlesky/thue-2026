/**
 * Vietnamese Pension Calculation Constants
 * Based on Vietnam's Social Insurance regulations
 */

// Retirement Age Roadmap
export const MALE_RETIREMENT_AGE: Record<number, { years: number; months: number }> = {
  2021: { years: 60, months: 3 },
  2022: { years: 60, months: 6 },
  2023: { years: 60, months: 9 },
  2024: { years: 61, months: 0 },
  2025: { years: 61, months: 3 },
  2026: { years: 61, months: 6 },
  2027: { years: 61, months: 9 },
  2028: { years: 62, months: 0 },
};

export const FEMALE_RETIREMENT_AGE: Record<number, { years: number; months: number }> = {
  2021: { years: 55, months: 4 },
  2022: { years: 55, months: 8 },
  2023: { years: 56, months: 0 },
  2024: { years: 56, months: 4 },
  2025: { years: 56, months: 8 },
  2026: { years: 57, months: 0 },
  2027: { years: 57, months: 4 },
  2028: { years: 57, months: 8 },
  2029: { years: 58, months: 0 },
  2030: { years: 58, months: 4 },
  2031: { years: 58, months: 8 },
  2032: { years: 59, months: 0 },
  2033: { years: 59, months: 4 },
  2034: { years: 59, months: 8 },
  2035: { years: 60, months: 0 },
};

// Salary Adjustment Coefficients (hệ số trượt giá 2025)
// Used to adjust historical salaries to current value
export const SALARY_ADJUSTMENT_COEFFICIENTS: Record<number, number> = {
  1995: 5.26,
  1996: 4.97,
  1997: 4.74,
  1998: 4.57,
  1999: 4.43,
  2000: 4.31,
  2001: 4.24,
  2002: 4.15,
  2003: 4.06,
  2004: 3.92,
  2005: 3.73,
  2006: 3.50,
  2007: 3.21,
  2008: 2.86,
  2009: 2.66,
  2010: 2.46,
  2011: 2.20,
  2012: 1.99,
  2013: 1.82,
  2014: 1.70,
  2015: 1.67,
  2016: 1.62,
  2017: 1.55,
  2018: 1.47,
  2019: 1.39,
  2020: 1.32,
  2021: 1.25,
  2022: 1.17,
  2023: 1.09,
  2024: 1.03,
  2025: 1.00,
};

// BHXH (Social Insurance) Contribution Rates
export const BHXH_RATES = {
  // Employee contribution rate for pension
  EMPLOYEE_PENSION_RATE: 0.08, // 8%

  // Employer contribution rate for pension
  EMPLOYER_PENSION_RATE: 0.14, // 14%

  // Total pension contribution rate
  TOTAL_PENSION_RATE: 0.22, // 22%
};

// Pension Calculation Constants
export const PENSION_CONSTANTS = {
  // Base pension rate (45% for minimum required years)
  BASE_PENSION_RATE: 0.45, // 45%

  // Additional rate per extra year of contribution
  ADDITIONAL_RATE_PER_YEAR: 0.02, // 2%

  // Minimum contribution years for pension eligibility
  MINIMUM_CONTRIBUTION_YEARS: 20,

  // Standard contribution years (no additional rate applied)
  STANDARD_CONTRIBUTION_YEARS: 15,

  // Maximum pension rate
  MAX_PENSION_RATE: 0.75, // 75%
};

// Helper function to get retirement age based on year and gender
export function getRetirementAge(
  year: number,
  gender: 'male' | 'female'
): { years: number; months: number } | null {
  const ageMap = gender === 'male' ? MALE_RETIREMENT_AGE : FEMALE_RETIREMENT_AGE;

  // Find the applicable retirement age for the given year
  const years = Object.keys(ageMap)
    .map(Number)
    .sort((a, b) => b - a);

  for (const y of years) {
    if (year >= y) {
      return ageMap[y];
    }
  }

  return null;
}

// Helper function to get salary adjustment coefficient for a specific year
export function getAdjustmentCoefficient(year: number): number {
  // If year is in our coefficient table, return it
  if (year in SALARY_ADJUSTMENT_COEFFICIENTS) {
    return SALARY_ADJUSTMENT_COEFFICIENTS[year];
  }

  // For years before 1995, use 1995's coefficient
  if (year < 1995) {
    return SALARY_ADJUSTMENT_COEFFICIENTS[1995];
  }

  // For years after 2025, assume coefficient of 1.00
  if (year > 2025) {
    return 1.00;
  }

  return 1.00;
}

// Calculate adjusted salary based on contribution year
export function calculateAdjustedSalary(
  originalSalary: number,
  contributionYear: number
): number {
  const coefficient = getAdjustmentCoefficient(contributionYear);
  return originalSalary * coefficient;
}

// Calculate pension rate based on contribution years
export function calculatePensionRate(contributionYears: number): number {
  if (contributionYears < PENSION_CONSTANTS.MINIMUM_CONTRIBUTION_YEARS) {
    return 0; // Not eligible for pension
  }

  // Base rate for first 15 years
  let rate = PENSION_CONSTANTS.BASE_PENSION_RATE;

  // Additional rate for years beyond 15
  const extraYears = contributionYears - PENSION_CONSTANTS.STANDARD_CONTRIBUTION_YEARS;
  if (extraYears > 0) {
    rate += extraYears * PENSION_CONSTANTS.ADDITIONAL_RATE_PER_YEAR;
  }

  // Cap at maximum rate
  return Math.min(rate, PENSION_CONSTANTS.MAX_PENSION_RATE);
}

// Calculate total retirement age in months
export function getRetirementAgeInMonths(
  year: number,
  gender: 'male' | 'female'
): number | null {
  const age = getRetirementAge(year, gender);
  if (!age) return null;

  return age.years * 12 + age.months;
}
