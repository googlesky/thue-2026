/**
 * Overtime Pay Calculator
 * Based on Vietnam Labor Code 2019 and Decree 145/2020/ND-CP
 *
 * Overtime rates (Article 98, Labor Code 2019):
 * - Weekday: 150%
 * - Weekend: 200%
 * - Holiday/Tet: 300% (+ base pay if normally a paid day off)
 *
 * Night shift (22:00 - 06:00, Article 106):
 * - Normal night work: +30% of day rate
 * - Night overtime: +20% of base overtime rate
 *
 * Tax exemption (Circular 111/2013/TT-BTC):
 * - The difference between overtime pay and regular pay is tax-exempt
 */

import {
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
  calculateNewTax,
  calculateOldTax,
  getInsuranceDetailed,
  InsuranceDetail,
} from './taxCalculator';

// ===== TYPES =====

export type OvertimeType = 'weekday' | 'weekend' | 'holiday';
export type ShiftType = 'day' | 'night';

export interface OvertimeEntry {
  id: string;
  type: OvertimeType;
  shift: ShiftType;
  hours: number;
}

// ===== CONSTANTS =====

/**
 * Overtime rate multipliers by type and shift
 * Calculated based on Labor Code 2019:
 *
 * Weekday day:   150%
 * Weekday night: 150% + 30% (night premium) + 20%*150% (night OT) = 210%
 *
 * Weekend day:   200%
 * Weekend night: 200% + 30% + 20%*200% = 270%
 *
 * Holiday day:   300%
 * Holiday night: 300% + 30% + 20%*300% = 390%
 */
export const OVERTIME_RATES: Record<OvertimeType, Record<ShiftType, number>> = {
  weekday: { day: 1.5, night: 2.1 },
  weekend: { day: 2.0, night: 2.7 },
  holiday: { day: 3.0, night: 3.9 },
};

// Night shift premium (30% of regular hourly rate)
export const NIGHT_PREMIUM = 0.3;

// Additional premium for night overtime (20% of base overtime rate)
export const NIGHT_OVERTIME_PREMIUM = 0.2;

// Maximum overtime limits
export const OVERTIME_LIMITS = {
  maxPerDay: 4,           // Max 4 hours/day (50% of 8 hours)
  maxTotalPerDay: 12,     // Max 12 hours total work per day
  maxPerMonth: 40,        // Max 40 hours/month
  maxPerYear: 200,        // Max 200 hours/year (300 for special industries)
};

// Default working parameters
export const DEFAULT_WORKING_DAYS = 26;
export const DEFAULT_HOURS_PER_DAY = 8;

// ===== INTERFACES =====

export interface OvertimeCalculationInput {
  monthlySalary: number;
  workingDaysPerMonth: number;
  hoursPerDay: number;
  entries: OvertimeEntry[];
  includeHolidayBasePay: boolean;
  // For tax calculation
  dependents: number;
  otherDeductions: number;
  hasInsurance: boolean;
  insuranceOptions: InsuranceOptions;
  region: RegionType;
  useNewLaw: boolean;
}

export interface OvertimeBreakdown {
  id: string;
  type: OvertimeType;
  shift: ShiftType;
  hours: number;
  rate: number;
  hourlyRate: number;
  grossAmount: number;
  taxableAmount: number;      // Portion subject to tax (= regular hourly rate × hours)
  taxExemptAmount: number;    // Tax-exempt portion (= difference from regular pay)
}

export interface OvertimeResult {
  // Base calculations
  hourlyRate: number;                    // Regular hourly rate
  regularMonthlyPay: number;             // Base monthly salary

  // Breakdown by entry
  breakdowns: OvertimeBreakdown[];

  // Overtime totals
  totalOvertimeHours: number;
  totalOvertimeGross: number;
  totalTaxableOvertime: number;
  totalTaxExemptOvertime: number;

  // Holiday base pay (if applicable)
  holidayBasePay: number;
  holidayHours: number;

  // Combined income
  totalGrossIncome: number;
  totalTaxableIncome: number;

  // Tax and deductions
  insuranceAmount: number;
  insuranceDetail: InsuranceDetail;
  taxAmount: number;
  netIncome: number;

  // Summary
  effectiveOvertimeRate: number;         // Average overtime rate
  taxExemptPercentage: number;           // % of overtime that's tax-exempt

  // Warnings
  warnings: string[];
}

// ===== HELPER FUNCTIONS =====

/**
 * Get overtime rate for a given type and shift
 */
export function getOvertimeRate(type: OvertimeType, shift: ShiftType): number {
  return OVERTIME_RATES[type][shift];
}

/**
 * Calculate hourly rate from monthly salary
 */
export function calculateHourlyRate(
  monthlySalary: number,
  workingDays: number = DEFAULT_WORKING_DAYS,
  hoursPerDay: number = DEFAULT_HOURS_PER_DAY
): number {
  const totalHours = workingDays * hoursPerDay;
  return totalHours > 0 ? monthlySalary / totalHours : 0;
}

/**
 * Get Vietnamese label for overtime type
 */
export function getOvertimeTypeLabel(type: OvertimeType): string {
  switch (type) {
    case 'weekday':
      return 'Ngày thường';
    case 'weekend':
      return 'Ngày nghỉ tuần';
    case 'holiday':
      return 'Ngày lễ, Tết';
  }
}

/**
 * Get Vietnamese label for shift type
 */
export function getShiftTypeLabel(shift: ShiftType): string {
  return shift === 'day' ? 'Ca ngày' : 'Ca đêm (22h-6h)';
}

/**
 * Check overtime limits and return warnings
 */
export function checkOvertimeLimits(
  entries: OvertimeEntry[],
  hoursPerDay: number = DEFAULT_HOURS_PER_DAY
): string[] {
  const warnings: string[] = [];
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  // Check monthly limit
  if (totalHours > OVERTIME_LIMITS.maxPerMonth) {
    warnings.push(
      `Vượt quá ${OVERTIME_LIMITS.maxPerMonth} giờ tăng ca/tháng (đang có ${totalHours} giờ)`
    );
  }

  // Check daily limit for any single entry
  const hasExcessiveDaily = entries.some((e) => e.hours > OVERTIME_LIMITS.maxPerDay);
  if (hasExcessiveDaily) {
    warnings.push(
      `Một số mục vượt quá ${OVERTIME_LIMITS.maxPerDay} giờ tăng ca/ngày`
    );
  }

  // Check total work hours per day
  const maxEntryHours = Math.max(...entries.map((e) => e.hours), 0);
  if (hoursPerDay + maxEntryHours > OVERTIME_LIMITS.maxTotalPerDay) {
    warnings.push(
      `Tổng giờ làm việc có thể vượt ${OVERTIME_LIMITS.maxTotalPerDay} giờ/ngày`
    );
  }

  return warnings;
}

/**
 * Generate unique ID for overtime entry
 */
export function generateEntryId(): string {
  return `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ===== MAIN CALCULATION =====

/**
 * Calculate overtime pay with full breakdown
 */
export function calculateOvertime(input: OvertimeCalculationInput): OvertimeResult {
  const {
    monthlySalary,
    workingDaysPerMonth,
    hoursPerDay,
    entries,
    includeHolidayBasePay,
    dependents,
    otherDeductions,
    hasInsurance,
    insuranceOptions,
    region,
    useNewLaw,
  } = input;

  // Calculate base hourly rate
  const hourlyRate = calculateHourlyRate(monthlySalary, workingDaysPerMonth, hoursPerDay);

  // Calculate breakdown for each entry
  const breakdowns: OvertimeBreakdown[] = entries.map((entry) => {
    const rate = getOvertimeRate(entry.type, entry.shift);
    const grossAmount = hourlyRate * rate * entry.hours;

    // Taxable amount = regular hourly pay for those hours
    const taxableAmount = hourlyRate * entry.hours;

    // Tax-exempt amount = the overtime premium portion
    const taxExemptAmount = grossAmount - taxableAmount;

    return {
      id: entry.id,
      type: entry.type,
      shift: entry.shift,
      hours: entry.hours,
      rate,
      hourlyRate,
      grossAmount,
      taxableAmount,
      taxExemptAmount,
    };
  });

  // Calculate totals
  const totalOvertimeHours = breakdowns.reduce((sum, b) => sum + b.hours, 0);
  const totalOvertimeGross = breakdowns.reduce((sum, b) => sum + b.grossAmount, 0);
  const totalTaxableOvertime = breakdowns.reduce((sum, b) => sum + b.taxableAmount, 0);
  const totalTaxExemptOvertime = breakdowns.reduce((sum, b) => sum + b.taxExemptAmount, 0);

  // Calculate holiday base pay (if working on a normally paid holiday)
  const holidayEntries = entries.filter((e) => e.type === 'holiday');
  const holidayHours = holidayEntries.reduce((sum, e) => sum + e.hours, 0);
  const holidayBasePay = includeHolidayBasePay ? hourlyRate * holidayHours : 0;

  // Total gross income
  const totalGrossIncome = monthlySalary + totalOvertimeGross + holidayBasePay;

  // Total taxable income (regular salary + taxable portion of overtime + holiday base pay)
  const totalTaxableIncome = monthlySalary + totalTaxableOvertime + holidayBasePay;

  // Calculate insurance on base salary only
  const insuranceDetail = getInsuranceDetailed(monthlySalary, region, insuranceOptions);
  const insuranceAmount = hasInsurance ? insuranceDetail.total : 0;

  // Calculate tax on taxable income
  const taxInput = {
    grossIncome: totalTaxableIncome,
    dependents,
    otherDeductions,
    hasInsurance,
    insuranceOptions,
    region,
  };

  const taxResult = useNewLaw ? calculateNewTax(taxInput) : calculateOldTax(taxInput);
  const taxAmount = taxResult.taxAmount;

  // Net income = total gross - insurance - tax
  // Note: Insurance is calculated on base salary, tax on taxable income
  const netIncome = totalGrossIncome - insuranceAmount - taxAmount;

  // Calculate summary stats
  const effectiveOvertimeRate =
    totalOvertimeHours > 0 ? totalOvertimeGross / (hourlyRate * totalOvertimeHours) : 0;
  const taxExemptPercentage =
    totalOvertimeGross > 0 ? (totalTaxExemptOvertime / totalOvertimeGross) * 100 : 0;

  // Check limits and generate warnings
  const warnings = checkOvertimeLimits(entries, hoursPerDay);

  return {
    hourlyRate,
    regularMonthlyPay: monthlySalary,

    breakdowns,

    totalOvertimeHours,
    totalOvertimeGross,
    totalTaxableOvertime,
    totalTaxExemptOvertime,

    holidayBasePay,
    holidayHours,

    totalGrossIncome,
    totalTaxableIncome,

    insuranceAmount,
    insuranceDetail,
    taxAmount,
    netIncome,

    effectiveOvertimeRate,
    taxExemptPercentage,

    warnings,
  };
}

// ===== QUICK CALCULATION =====

/**
 * Quick calculation for a single overtime scenario
 */
export function calculateQuickOvertime(
  monthlySalary: number,
  overtimeType: OvertimeType,
  shift: ShiftType,
  hours: number,
  workingDays: number = DEFAULT_WORKING_DAYS,
  hoursPerDay: number = DEFAULT_HOURS_PER_DAY
): {
  hourlyRate: number;
  overtimeRate: number;
  overtimePay: number;
  taxExempt: number;
} {
  const hourlyRate = calculateHourlyRate(monthlySalary, workingDays, hoursPerDay);
  const overtimeRate = getOvertimeRate(overtimeType, shift);
  const overtimePay = hourlyRate * overtimeRate * hours;
  const regularPay = hourlyRate * hours;
  const taxExempt = overtimePay - regularPay;

  return {
    hourlyRate,
    overtimeRate,
    overtimePay,
    taxExempt,
  };
}
