// Mức lương tối thiểu vùng (2024)
export const REGIONAL_MINIMUM_WAGES = {
  1: { name: 'Vùng I', wage: 4_960_000, description: 'Hà Nội, TP.HCM, Hải Phòng, Đà Nẵng...' },
  2: { name: 'Vùng II', wage: 4_410_000, description: 'Các thành phố thuộc tỉnh, huyện ngoại thành...' },
  3: { name: 'Vùng III', wage: 3_860_000, description: 'Thị xã, các huyện thuộc các tỉnh...' },
  4: { name: 'Vùng IV', wage: 3_450_000, description: 'Các huyện miền núi, vùng sâu vùng xa...' },
};

export type RegionType = 1 | 2 | 3 | 4;

// Lương cơ sở (dùng để tính mức đóng BHXH tối đa)
export const BASE_SALARY = 2_340_000; // Lương cơ sở 2024

// Biểu thuế HIỆN HÀNH (7 bậc)
export const OLD_TAX_BRACKETS = [
  { min: 0, max: 5_000_000, rate: 0.05, deduction: 0 },
  { min: 5_000_000, max: 10_000_000, rate: 0.10, deduction: 250_000 },
  { min: 10_000_000, max: 18_000_000, rate: 0.15, deduction: 750_000 },
  { min: 18_000_000, max: 32_000_000, rate: 0.20, deduction: 1_650_000 },
  { min: 32_000_000, max: 52_000_000, rate: 0.25, deduction: 3_250_000 },
  { min: 52_000_000, max: 80_000_000, rate: 0.30, deduction: 5_850_000 },
  { min: 80_000_000, max: Infinity, rate: 0.35, deduction: 9_850_000 },
];

// Biểu thuế MỚI 2026 (5 bậc)
export const NEW_TAX_BRACKETS = [
  { min: 0, max: 10_000_000, rate: 0.05, deduction: 0 },
  { min: 10_000_000, max: 30_000_000, rate: 0.10, deduction: 500_000 },
  { min: 30_000_000, max: 60_000_000, rate: 0.20, deduction: 3_500_000 },
  { min: 60_000_000, max: 100_000_000, rate: 0.30, deduction: 9_500_000 },
  { min: 100_000_000, max: Infinity, rate: 0.35, deduction: 14_500_000 },
];

// Mức giảm trừ gia cảnh
export const OLD_DEDUCTIONS = {
  personal: 11_000_000, // Bản thân
  dependent: 4_400_000, // Mỗi người phụ thuộc
};

export const NEW_DEDUCTIONS = {
  personal: 15_500_000, // Bản thân
  dependent: 6_200_000, // Mỗi người phụ thuộc
};

// Tỷ lệ bảo hiểm bắt buộc (người lao động đóng)
export const INSURANCE_RATES = {
  socialInsurance: 0.08, // BHXH 8%
  healthInsurance: 0.015, // BHYT 1.5%
  unemploymentInsurance: 0.01, // BHTN 1%
  unionFee: 0.01, // Công đoàn 1% (người lao động, nếu có)
};

// Tổng tỷ lệ bảo hiểm (không bao gồm công đoàn) = 10.5%
export const TOTAL_INSURANCE_RATE = INSURANCE_RATES.socialInsurance + INSURANCE_RATES.healthInsurance + INSURANCE_RATES.unemploymentInsurance;

// Tỷ lệ công ty đóng
export const EMPLOYER_INSURANCE_RATES = {
  socialInsurance: 0.175, // BHXH 17.5%
  healthInsurance: 0.03, // BHYT 3%
  unemploymentInsurance: 0.01, // BHTN 1%
  unionFee: 0.02, // Công đoàn 2%
};

// Mức lương tối đa đóng BHXH, BHYT (20 lần lương cơ sở)
export const MAX_SOCIAL_INSURANCE_SALARY = 46_800_000; // 20 * 2.340.000 (lương cơ sở 2024)

// Mức lương tối đa đóng BHTN (20 lần lương tối thiểu vùng)
export const MAX_UNEMPLOYMENT_INSURANCE_SALARY = {
  1: 99_200_000, // Vùng I: 20 * 4.960.000
  2: 88_200_000, // Vùng II: 20 * 4.410.000
  3: 77_200_000, // Vùng III: 20 * 3.860.000
  4: 69_000_000, // Vùng IV: 20 * 3.450.000
};

export interface InsuranceOptions {
  bhxh: boolean; // BHXH 8%
  bhyt: boolean; // BHYT 1.5%
  bhtn: boolean; // BHTN 1%
}

export interface TaxInput {
  grossIncome: number; // Thu nhập gộp (lương thực tế)
  declaredSalary?: number; // Lương khai báo với nhà nước (nếu khác lương thực)
  dependents: number; // Số người phụ thuộc
  otherDeductions?: number; // Các khoản giảm trừ khác (từ thiện, quỹ hưu trí...)
  hasInsurance?: boolean; // Có đóng BHXH không (deprecated, dùng insuranceOptions)
  insuranceOptions?: InsuranceOptions; // Tùy chọn từng loại bảo hiểm
  region?: RegionType; // Vùng lương tối thiểu
  pensionContribution?: number; // Quỹ hưu trí tự nguyện (tối đa 1tr/tháng)
}

export interface TaxResult {
  grossIncome: number;
  insuranceDeduction: number;
  personalDeduction: number;
  dependentDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  taxableIncome: number;
  taxAmount: number;
  netIncome: number;
  effectiveRate: number;
  taxBreakdown: TaxBreakdownItem[];
}

export interface TaxBreakdownItem {
  bracket: number;
  from: number;
  to: number;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface InsuranceDetail {
  bhxh: number;
  bhyt: number;
  bhtn: number;
  total: number;
}

// Default insurance options (all enabled)
export const DEFAULT_INSURANCE_OPTIONS: InsuranceOptions = {
  bhxh: true,
  bhyt: true,
  bhtn: true,
};

function calculateInsuranceDetailed(
  grossIncome: number,
  region: RegionType = 1,
  options: InsuranceOptions = DEFAULT_INSURANCE_OPTIONS
): InsuranceDetail {
  // BHXH và BHYT tính trên mức tối đa 20 lần lương cơ sở
  const bhxhBase = Math.min(grossIncome, MAX_SOCIAL_INSURANCE_SALARY);
  const bhxh = options.bhxh ? bhxhBase * INSURANCE_RATES.socialInsurance : 0;
  const bhyt = options.bhyt ? bhxhBase * INSURANCE_RATES.healthInsurance : 0;

  // BHTN tính trên mức tối đa 20 lần lương tối thiểu vùng
  const maxBhtn = MAX_UNEMPLOYMENT_INSURANCE_SALARY[region];
  const bhtnBase = Math.min(grossIncome, maxBhtn);
  const bhtn = options.bhtn ? bhtnBase * INSURANCE_RATES.unemploymentInsurance : 0;

  return {
    bhxh,
    bhyt,
    bhtn,
    total: bhxh + bhyt + bhtn,
  };
}

function calculateInsurance(
  grossIncome: number,
  region: RegionType = 1,
  options: InsuranceOptions = DEFAULT_INSURANCE_OPTIONS
): number {
  return calculateInsuranceDetailed(grossIncome, region, options).total;
}

// Export for use in components
export function getInsuranceDetailed(
  grossIncome: number,
  region: RegionType = 1,
  options: InsuranceOptions = DEFAULT_INSURANCE_OPTIONS
): InsuranceDetail {
  return calculateInsuranceDetailed(grossIncome, region, options);
}

function calculateTaxWithBrackets(
  taxableIncome: number,
  brackets: typeof OLD_TAX_BRACKETS
): { tax: number; breakdown: TaxBreakdownItem[] } {
  if (taxableIncome <= 0) {
    return { tax: 0, breakdown: [] };
  }

  const breakdown: TaxBreakdownItem[] = [];
  let remainingIncome = taxableIncome;
  let totalTax = 0;

  for (let i = 0; i < brackets.length && remainingIncome > 0; i++) {
    const bracket = brackets[i];
    const bracketWidth = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remainingIncome, bracketWidth);
    const taxInBracket = taxableInBracket * bracket.rate;

    breakdown.push({
      bracket: i + 1,
      from: bracket.min,
      to: bracket.max === Infinity ? bracket.min + taxableInBracket : bracket.max,
      rate: bracket.rate,
      taxableAmount: taxableInBracket,
      taxAmount: taxInBracket,
    });

    totalTax += taxInBracket;
    remainingIncome -= taxableInBracket;
  }

  return { tax: totalTax, breakdown };
}

// Phương pháp tính nhanh
function calculateTaxQuick(
  taxableIncome: number,
  brackets: typeof OLD_TAX_BRACKETS
): number {
  if (taxableIncome <= 0) return 0;

  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].min) {
      return taxableIncome * brackets[i].rate - brackets[i].deduction;
    }
  }
  return 0;
}

export function calculateOldTax(input: TaxInput): TaxResult {
  const {
    grossIncome,
    declaredSalary,
    dependents,
    otherDeductions = 0,
    hasInsurance = true,
    insuranceOptions,
    region = 1,
  } = input;

  // Lương khai báo với nhà nước (mặc định = lương thực)
  const taxableSalary = declaredSalary ?? grossIncome;

  // Xác định các loại bảo hiểm được bật
  const insOptions: InsuranceOptions = insuranceOptions ?? {
    bhxh: hasInsurance,
    bhyt: hasInsurance,
    bhtn: hasInsurance,
  };

  // Tính bảo hiểm dựa trên lương khai báo
  const insuranceDeduction = calculateInsurance(taxableSalary, region, insOptions);
  const personalDeduction = OLD_DEDUCTIONS.personal;
  const dependentDeduction = dependents * OLD_DEDUCTIONS.dependent;

  const totalDeductions = insuranceDeduction + personalDeduction + dependentDeduction + otherDeductions;
  // Tính thuế dựa trên lương khai báo
  const taxableIncome = Math.max(0, taxableSalary - totalDeductions);

  const { tax, breakdown } = calculateTaxWithBrackets(taxableIncome, OLD_TAX_BRACKETS);
  // Thu nhập thực nhận = lương thực - bảo hiểm (theo khai báo) - thuế
  const netIncome = grossIncome - insuranceDeduction - tax;
  const effectiveRate = grossIncome > 0 ? (tax / grossIncome) * 100 : 0;

  return {
    grossIncome,
    insuranceDeduction,
    personalDeduction,
    dependentDeduction,
    otherDeductions,
    totalDeductions,
    taxableIncome,
    taxAmount: tax,
    netIncome,
    effectiveRate,
    taxBreakdown: breakdown,
  };
}

export function calculateNewTax(input: TaxInput): TaxResult {
  const {
    grossIncome,
    declaredSalary,
    dependents,
    otherDeductions = 0,
    hasInsurance = true,
    insuranceOptions,
    region = 1,
  } = input;

  // Lương khai báo với nhà nước (mặc định = lương thực)
  const taxableSalary = declaredSalary ?? grossIncome;

  // Xác định các loại bảo hiểm được bật
  const insOptions: InsuranceOptions = insuranceOptions ?? {
    bhxh: hasInsurance,
    bhyt: hasInsurance,
    bhtn: hasInsurance,
  };

  // Tính bảo hiểm dựa trên lương khai báo
  const insuranceDeduction = calculateInsurance(taxableSalary, region, insOptions);
  const personalDeduction = NEW_DEDUCTIONS.personal;
  const dependentDeduction = dependents * NEW_DEDUCTIONS.dependent;

  const totalDeductions = insuranceDeduction + personalDeduction + dependentDeduction + otherDeductions;
  // Tính thuế dựa trên lương khai báo
  const taxableIncome = Math.max(0, taxableSalary - totalDeductions);

  const { tax, breakdown } = calculateTaxWithBrackets(taxableIncome, NEW_TAX_BRACKETS);
  // Thu nhập thực nhận = lương thực - bảo hiểm (theo khai báo) - thuế
  const netIncome = grossIncome - insuranceDeduction - tax;
  const effectiveRate = grossIncome > 0 ? (tax / grossIncome) * 100 : 0;

  return {
    grossIncome,
    insuranceDeduction,
    personalDeduction,
    dependentDeduction,
    otherDeductions,
    totalDeductions,
    taxableIncome,
    taxAmount: tax,
    netIncome,
    effectiveRate,
    taxBreakdown: breakdown,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
}

export function parseCurrency(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
}

// Tính thuế cho nhiều mức thu nhập (để vẽ biểu đồ)
export function calculateTaxRange(
  minIncome: number,
  maxIncome: number,
  step: number,
  dependents: number
): { income: number; oldTax: number; newTax: number; savings: number }[] {
  const results = [];
  for (let income = minIncome; income <= maxIncome; income += step) {
    const oldResult = calculateOldTax({ grossIncome: income, dependents });
    const newResult = calculateNewTax({ grossIncome: income, dependents });
    results.push({
      income,
      oldTax: oldResult.taxAmount,
      newTax: newResult.taxAmount,
      savings: oldResult.taxAmount - newResult.taxAmount,
    });
  }
  return results;
}
