/**
 * Tính lương làm thêm giờ và thuế TNCN
 *
 * Hệ số (BLLĐ 2019 Điều 98; NĐ 145/2020/NĐ-CP Điều 55–57):
 * - Ngày thường ≥ 150%, ngày nghỉ hằng tuần ≥ 200%, ngày lễ, tết ≥ 300%
 *   (chưa kể tiền lương ngày lễ, tết đối với người hưởng lương ngày)
 * - Làm thêm ban đêm: hệ số ngày + 30% + 20% × tiền lương giờ ban ngày của ngày đó
 *
 * Giới hạn (BLLĐ Điều 107; NĐ 145/2020 Điều 60): ngày thường ≤ 50% số giờ làm việc bình thường;
 * ngày nghỉ hằng tuần, lễ, tết ≤ 12 giờ/ngày; ≤ 40 giờ/tháng; ≤ 200 giờ/năm (300 giờ với một số ngành, nghề).
 *
 * Thuế TNCN:
 * - Từ kỳ tính thuế 2026: miễn TOÀN BỘ tiền lương làm thêm giờ, làm đêm đúng giới hạn (Luật Thuế TNCN
 *   109/2025/QH15 Điều 4.8; NĐ 253/2026/NĐ-CP Điều 26.1); phần vượt mức quy định chịu thuế (Điều 26.3)
 * - Trước 2026: chỉ miễn phần tiền lương trả cao hơn so với làm việc trong giờ (TT 111/2013/TT-BTC)
 */

import {
  RegionType,
  InsuranceOptions,
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
  // Làm thêm ban đêm ngày thường sau khi đã làm thêm ban ngày của ngày đó (210% thay vì 200%)
  afterDayOvertime?: boolean;
}

// ===== CONSTANTS =====

// Hệ số làm thêm ban ngày (BLLĐ Điều 98.1)
export const OVERTIME_DAY_RATES: Record<OvertimeType, number> = {
  weekday: 1.5,
  weekend: 2.0,
  holiday: 3.0,
};

// Làm việc ban đêm: thêm ít nhất 30% tiền lương giờ (BLLĐ Điều 98.2)
export const NIGHT_PREMIUM = 0.3;

// Làm thêm ban đêm: thêm 20% tiền lương giờ ban ngày của ngày đó (BLLĐ Điều 98.3)
export const NIGHT_OVERTIME_PREMIUM = 0.2;

// Giới hạn làm thêm giờ
export const OVERTIME_LIMITS = {
  weekdayRatio: 0.5,   // Ngày thường: ≤ 50% số giờ làm việc bình thường/ngày
  maxPerRestDay: 12,   // Ngày nghỉ hằng tuần, lễ, tết: ≤ 12 giờ/ngày
  maxPerMonth: 40,     // ≤ 40 giờ/tháng
  maxPerYear: 200,     // ≤ 200 giờ/năm (300 giờ với một số ngành, nghề)
};

// Default working parameters
export const DEFAULT_WORKING_DAYS = 26;
export const DEFAULT_HOURS_PER_DAY = 8;

// "Trước 2026": tính theo quy định năm 2025 (biểu 7 bậc, trần bảo hiểm 2025)
const PRE_2026_DATE = new Date(2025, 11, 31);
const NO_INSURANCE: InsuranceOptions = { bhxh: false, bhyt: false, bhtn: false };

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
  useNewLaw: boolean; // true: kỳ tính thuế 2026 (hiện hành); false: trước 2026
}

export interface OvertimeBreakdown {
  id: string;
  type: OvertimeType;
  shift: ShiftType;
  hours: number;
  rate: number;
  hourlyRate: number;
  grossAmount: number;
  taxableAmount: number;      // Phần tính vào thu nhập chịu thuế
  taxExemptAmount: number;    // Phần được miễn thuế
  overLimitHours: number;     // Số giờ vượt 40 giờ/tháng (từ 2026: chịu thuế toàn bộ)
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
  overLimitHours: number;

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
 * Hệ số làm thêm (NĐ 145/2020 Điều 57): ca đêm = hệ số ngày + 30% + 20% × tiền lương giờ ban ngày của ngày đó.
 * Ngày thường: tiền lương giờ ban ngày = 100% nếu không làm thêm ban ngày (→ 200%), 150% nếu có (→ 210%).
 * Ngày nghỉ hằng tuần 270%, lễ, tết 390%.
 */
export function getOvertimeRate(
  type: OvertimeType,
  shift: ShiftType,
  afterDayOvertime: boolean = false
): number {
  const dayRate = OVERTIME_DAY_RATES[type];
  if (shift === 'day') return dayRate;
  const daytimeHourlyRate = type === 'weekday' && !afterDayOvertime ? 1 : dayRate;
  return Math.round((dayRate + NIGHT_PREMIUM + NIGHT_OVERTIME_PREMIUM * daytimeHourlyRate) * 100) / 100;
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
      return 'Ngày nghỉ hằng tuần';
    case 'holiday':
      return 'Ngày lễ, Tết';
    default:
      return 'Không xác định';
  }
}

const formatHours = (hours: number) => hours.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

/**
 * Kiểm tra giới hạn làm thêm (mỗi dòng là một ngày làm thêm)
 */
export function checkOvertimeLimits(
  entries: OvertimeEntry[],
  hoursPerDay: number = DEFAULT_HOURS_PER_DAY
): string[] {
  const warnings: string[] = [];
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  if (totalHours > OVERTIME_LIMITS.maxPerMonth) {
    warnings.push(
      `Vượt ${OVERTIME_LIMITS.maxPerMonth} giờ làm thêm/tháng (đang có ${formatHours(totalHours)} giờ)`
    );
  }

  const weekdayCap = hoursPerDay * OVERTIME_LIMITS.weekdayRatio;
  if (entries.some((e) => e.type === 'weekday' && e.hours > weekdayCap)) {
    warnings.push(
      `Có ngày thường làm thêm quá ${formatHours(weekdayCap)} giờ (50% số giờ làm việc bình thường/ngày)`
    );
  }

  if (entries.some((e) => e.type !== 'weekday' && e.hours > OVERTIME_LIMITS.maxPerRestDay)) {
    warnings.push(`Có ngày nghỉ, lễ tết làm thêm quá ${OVERTIME_LIMITS.maxPerRestDay} giờ/ngày`);
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

  // ponytail: giờ vượt 40 giờ/tháng tính theo thứ tự nhập (không có ngày cụ thể); giới hạn ngày chỉ cảnh báo
  let legalHoursLeft = OVERTIME_LIMITS.maxPerMonth;

  const breakdowns: OvertimeBreakdown[] = entries.map((entry) => {
    const rate = getOvertimeRate(entry.type, entry.shift, entry.afterDayOvertime);
    const grossAmount = hourlyRate * rate * entry.hours;

    let taxableAmount: number;
    let overLimitHours = 0;
    if (useNewLaw) {
      // Từ 2026: miễn toàn bộ trong giới hạn, phần vượt giới hạn chịu thuế toàn bộ
      const legalHours = Math.min(entry.hours, legalHoursLeft);
      legalHoursLeft -= legalHours;
      overLimitHours = entry.hours - legalHours;
      taxableAmount = hourlyRate * rate * overLimitHours;
    } else {
      // Trước 2026: chịu thuế phần tiền lương giờ bình thường, miễn phần chênh
      taxableAmount = hourlyRate * entry.hours;
    }

    return {
      id: entry.id,
      type: entry.type,
      shift: entry.shift,
      hours: entry.hours,
      rate,
      hourlyRate,
      grossAmount,
      taxableAmount,
      taxExemptAmount: grossAmount - taxableAmount,
      overLimitHours,
    };
  });

  // Calculate totals
  const totalOvertimeHours = breakdowns.reduce((sum, b) => sum + b.hours, 0);
  const totalOvertimeGross = breakdowns.reduce((sum, b) => sum + b.grossAmount, 0);
  const totalTaxableOvertime = breakdowns.reduce((sum, b) => sum + b.taxableAmount, 0);
  const totalTaxExemptOvertime = breakdowns.reduce((sum, b) => sum + b.taxExemptAmount, 0);
  const overLimitHours = breakdowns.reduce((sum, b) => sum + b.overLimitHours, 0);

  // Tiền lương ngày lễ, tết (chỉ người hưởng lương ngày) - thu nhập chịu thuế bình thường
  const holidayHours = entries
    .filter((e) => e.type === 'holiday')
    .reduce((sum, e) => sum + e.hours, 0);
  const holidayBasePay = includeHolidayBasePay ? hourlyRate * holidayHours : 0;

  // Total gross income
  const totalGrossIncome = monthlySalary + totalOvertimeGross + holidayBasePay;

  // Thu nhập chịu thuế = lương + tiền lương ngày lễ + phần làm thêm chịu thuế
  const totalTaxableIncome = monthlySalary + totalTaxableOvertime + holidayBasePay;

  // Bảo hiểm chỉ tính trên lương cơ bản (không tính trên tiền làm thêm)
  const calculationDate = useNewLaw ? undefined : PRE_2026_DATE;
  const insOptions = hasInsurance ? insuranceOptions : NO_INSURANCE;
  const insuranceDetail = getInsuranceDetailed(monthlySalary, region, insOptions, calculationDate);
  const insuranceAmount = insuranceDetail.total;

  const taxInput = {
    grossIncome: totalTaxableIncome,
    declaredSalary: monthlySalary, // nền đóng bảo hiểm = lương cơ bản
    dependents,
    otherDeductions,
    insuranceOptions: insOptions,
    region,
    calculationDate,
  };

  const taxResult = useNewLaw ? calculateNewTax(taxInput) : calculateOldTax(taxInput);
  const taxAmount = taxResult.taxAmount;

  // Net income = total gross - insurance - tax
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
    overLimitHours,

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
