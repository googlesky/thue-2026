/**
 * Ước tính lương hưu BHXH bắt buộc
 *
 * Căn cứ: Luật BHXH 41/2024/QH15 (hiệu lực 01/7/2025) Điều 5.6, 64–68, 70, 72;
 * NĐ 158/2025/NĐ-CP Điều 13; Bộ luật Lao động 2019 Điều 169; NĐ 135/2020/NĐ-CP (lộ trình tuổi nghỉ hưu).
 */
import { getBaseSalary, getMaxSocialInsuranceSalary } from './taxCalculator';

export type Gender = 'male' | 'female';

export interface PensionInput {
  gender: Gender;
  birthYear: number;
  birthMonth: number;
  contributionStartYear: number;
  contributionYears: number;   // Tổng thời gian đóng BHXH đến khi nghỉ hưu
  contributionMonths: number;
  currentMonthlySalary: number; // Mức bình quân tiền lương đóng BHXH (ước tính)
  earlyRetirementYears: number; // Số năm nghỉ trước tuổi nghỉ hưu thông thường
  isHazardousWork: boolean;     // Đủ 15 năm nghề nặng nhọc, độc hại, nguy hiểm
}

export interface PensionResult {
  retirementAge: { years: number; months: number };
  retirementYear: number;   // Tháng, năm đủ tuổi nghỉ hưu
  retirementMonth: number;
  totalContributionYears: number;
  totalContributionMonths: number;
  rateYears: number;        // Số năm tính tỷ lệ (tháng lẻ đã làm tròn)
  baseRate: number;
  deductionRate: number;
  finalRate: number;
  averageSalary: number;    // Đã chặn trần 20 lần mức tham chiếu
  isSalaryCapped: boolean;
  monthlyPension: number;
  isMinimumApplied: boolean; // Được nâng lên bằng mức tham chiếu
  yearlyPension: number;
  oneTimeAllowance: number;
  doubledAllowanceYears: number; // Số năm đóng sau tuổi nghỉ hưu hưởng mức 2 lần
  totalContributed: number;
  yearsToBreakeven: number;
}

// Tuổi nghỉ hưu tối thiểu có đủ 15 năm đóng (Luật BHXH Điều 64)
export const MIN_CONTRIBUTION_YEARS = 15;

// Nghỉ hưu trước tuổi có giảm tỷ lệ: đủ 20 năm đóng + suy giảm khả năng lao động từ 61% (Điều 65)
export const MIN_YEARS_FOR_REDUCED_EARLY_RETIREMENT = 20;

// Quỹ hưu trí - tử tuất: người lao động 8% + người sử dụng lao động 14%
const PENSION_FUND_RATE = 0.22;

// Trợ cấp một lần khi nghỉ hưu: số năm đóng vượt ngưỡng (Điều 68)
const ONE_TIME_ALLOWANCE_THRESHOLD: Record<Gender, number> = { male: 35, female: 30 };

/**
 * Tuổi nghỉ hưu trong điều kiện lao động bình thường (tháng) áp dụng cho năm nghỉ hưu (BLLĐ Điều 169.2):
 * trước 2021 nam 60, nữ 55; từ 2021 nam 60 tuổi 3 tháng (+3 tháng/năm đến 62), nữ 55 tuổi 4 tháng (+4 tháng/năm đến 60).
 */
function requiredAgeMonths(year: number, gender: Gender): number {
  if (gender === 'male') return year < 2021 ? 720 : Math.min(723 + 3 * (year - 2021), 744);
  return year < 2021 ? 660 : Math.min(664 + 4 * (year - 2021), 720);
}

/**
 * Tuổi nghỉ hưu theo tháng, năm sinh (khớp Phụ lục NĐ 135/2020). yearsEarly: số năm thấp hơn tuổi quy định
 * TẠI THỜI ĐIỂM nghỉ hưu (BLLĐ Điều 169.3; Luật BHXH Điều 64.1.b, 65).
 */
export function calculateRetirementAge(
  birthYear: number,
  birthMonth: number,
  gender: Gender,
  yearsEarly: number = 0
): { years: number; months: number } {
  const born = birthYear * 12 + (birthMonth - 1);
  for (let year = 2020; ; year++) {
    const age = requiredAgeMonths(year, gender) - Math.round(12 * yearsEarly);
    if (Math.floor((born + age) / 12) <= year) {
      return { years: Math.floor(age / 12), months: age % 12 };
    }
  }
}

/**
 * Số năm đóng để tính mức hưởng: tháng lẻ 1–6 tính nửa năm, 7–11 tính một năm (Luật BHXH Điều 5.6)
 */
export function roundContributionYears(years: number, months: number): number {
  const total = years * 12 + months;
  const oddMonths = total % 12;
  return Math.floor(total / 12) + (oddMonths === 0 ? 0 : oddMonths <= 6 ? 0.5 : 1);
}

/**
 * Tỷ lệ hưởng lương hưu (Luật BHXH Điều 66.1) theo số năm đóng đã làm tròn.
 * Nữ: 45% cho 15 năm; nam: 45% cho 20 năm (15 đến dưới 20 năm: 40% + 1%/năm); mỗi năm thêm 2%; tối đa 75%.
 */
export function calculateBaseRate(contributionYears: number, gender: Gender): number {
  if (contributionYears < MIN_CONTRIBUTION_YEARS) return 0;
  if (gender === 'female') return Math.min(0.45 + 0.02 * (contributionYears - 15), 0.75);
  if (contributionYears < 20) return 0.40 + 0.01 * (contributionYears - 15);
  return Math.min(0.45 + 0.02 * (contributionYears - 20), 0.75);
}

/**
 * Mức giảm khi nghỉ hưu trước tuổi (Điều 66.3): 2% mỗi năm; phần lẻ dưới 6 tháng không giảm, từ 6 tháng giảm 1%
 */
export function calculateEarlyRetirementDeduction(earlyRetirementYears: number): number {
  if (earlyRetirementYears <= 0) return 0;
  const fullYears = Math.floor(earlyRetirementYears);
  return fullYears * 0.02 + (earlyRetirementYears - fullYears >= 0.5 ? 0.01 : 0);
}

/**
 * Trợ cấp một lần khi nghỉ hưu (Điều 68): 0,5 tháng bình quân cho mỗi năm đóng vượt 35 năm (nam) / 30 năm (nữ);
 * 2 tháng cho mỗi năm vượt đóng sau thời điểm đủ tuổi nghỉ hưu.
 */
export function calculateOneTimeAllowance(
  rateYears: number,
  gender: Gender,
  averageSalary: number,
  yearsAfterRetirementAge: number = 0
): number {
  const extraYears = Math.max(0, rateYears - ONE_TIME_ALLOWANCE_THRESHOLD[gender]);
  const doubledYears = Math.min(extraYears, yearsAfterRetirementAge);
  return ((extraYears - doubledYears) * 0.5 + doubledYears * 2) * averageSalary;
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

  // Tuổi nghỉ hưu (đã trừ số năm nghỉ trước tuổi)
  const retirementAge = calculateRetirementAge(birthYear, birthMonth, gender, earlyRetirementYears);
  const retirementIndex = birthYear * 12 + (birthMonth - 1) + retirementAge.years * 12 + retirementAge.months;

  const totalMonths = contributionYears * 12 + contributionMonths;
  const totalContributionYears = Math.floor(totalMonths / 12);
  const totalContributionMonths = totalMonths % 12;
  const rateYears = roundContributionYears(0, totalMonths);

  // Điều kiện: đủ 15 năm (tính theo năm đủ 12 tháng, Điều 5.6)
  const baseRate = totalContributionYears >= MIN_CONTRIBUTION_YEARS ? calculateBaseRate(rateYears, gender) : 0;

  // Nghề nặng nhọc, độc hại đủ 15 năm: nghỉ sớm không giảm (Điều 64.1.b); trường hợp khác giảm (Điều 65, 66.3)
  const deductionRate = isHazardousWork ? 0 : calculateEarlyRetirementDeduction(earlyRetirementYears);
  const finalRate = Math.max(0, baseRate - deductionRate);

  // Bình quân tiền lương đóng BHXH: tối đa 20 lần mức tham chiếu
  const maxSalary = getMaxSocialInsuranceSalary();
  const averageSalary = Math.min(Math.max(0, currentMonthlySalary), maxSalary);
  const isSalaryCapped = currentMonthlySalary > maxSalary;

  // Sàn: tham gia trước 01/7/2025, đủ 20 năm đóng → không thấp hơn mức tham chiếu (NĐ 158/2025 Điều 13.1)
  const rawPension = averageSalary * finalRate;
  const referenceLevel = getBaseSalary();
  const isMinimumApplied =
    finalRate > 0 &&
    contributionStartYear <= 2024 &&
    totalContributionYears >= 20 &&
    rawPension < referenceLevel;
  const monthlyPension = isMinimumApplied ? referenceLevel : rawPension;
  const yearlyPension = monthlyPension * 12;

  // ponytail: giả định đóng liên tục từ tháng 1 năm bắt đầu; phần đóng sau tuổi nghỉ hưu hưởng mức 2 lần
  const contributionEndIndex = contributionStartYear * 12 + totalMonths;
  const yearsAfterRetirementAge = roundContributionYears(0, Math.max(0, contributionEndIndex - retirementIndex));
  const oneTimeAllowance =
    finalRate > 0 ? calculateOneTimeAllowance(rateYears, gender, averageSalary, yearsAfterRetirementAge) : 0;
  const doubledAllowanceYears = Math.min(
    yearsAfterRetirementAge,
    Math.max(0, rateYears - ONE_TIME_ALLOWANCE_THRESHOLD[gender])
  );

  // Hòa vốn: tổng đóng vào quỹ hưu trí - tử tuất (22%) / lương hưu năm
  const totalContributed = averageSalary * totalMonths * PENSION_FUND_RATE;
  const yearsToBreakeven = yearlyPension > 0 ? totalContributed / yearlyPension : 0;

  return {
    retirementAge,
    retirementYear: Math.floor(retirementIndex / 12),
    retirementMonth: (retirementIndex % 12) + 1,
    totalContributionYears,
    totalContributionMonths,
    rateYears,
    baseRate,
    deductionRate,
    finalRate,
    averageSalary,
    isSalaryCapped,
    monthlyPension,
    isMinimumApplied,
    yearlyPension,
    oneTimeAllowance,
    doubledAllowanceYears,
    totalContributed,
    yearsToBreakeven,
  };
}

/**
 * Kiểm tra dữ liệu và điều kiện hưởng lương hưu
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

  const fullYears = input.contributionYears + Math.floor(input.contributionMonths / 12);

  if (fullYears < MIN_CONTRIBUTION_YEARS) {
    errors.push(
      `Chưa đủ ${MIN_CONTRIBUTION_YEARS} năm đóng BHXH nên chưa đủ điều kiện hưởng lương hưu (Luật BHXH 2024 Điều 64). ` +
      'Khi đủ tuổi nghỉ hưu có thể đóng tiếp cho đủ, bảo lưu thời gian đóng, hưởng trợ cấp hằng tháng (Điều 23) ' +
      'hoặc hưởng BHXH một lần (Điều 70).'
    );
  } else if (
    input.earlyRetirementYears > 0 &&
    !input.isHazardousWork &&
    fullYears < MIN_YEARS_FOR_REDUCED_EARLY_RETIREMENT
  ) {
    errors.push(
      'Nghỉ hưu trước tuổi (có giảm tỷ lệ) chỉ áp dụng khi đóng BHXH đủ 20 năm và suy giảm khả năng lao động từ 61% ' +
      '(Luật BHXH 2024 Điều 65). Nghề nặng nhọc, độc hại đủ 15 năm được nghỉ sớm không giảm tỷ lệ.'
    );
  }

  return errors;
}
