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

// ===== PHỤ CẤP (ALLOWANCES) =====

// Phụ cấp miễn thuế và chịu thuế
export interface AllowancesState {
  // Miễn thuế hoàn toàn
  meal: number;           // Tiền ăn trưa/ăn ca
  phone: number;          // Phụ cấp điện thoại
  transport: number;      // Xăng xe, đi lại
  hazardous: number;      // Phụ cấp độc hại (nếu đủ điều kiện)

  // Miễn thuế có giới hạn
  clothing: number;       // Trang phục (max 5tr/năm miễn thuế)

  // Chịu thuế hoàn toàn
  housing: number;        // Tiền thuê nhà
  position: number;       // Phụ cấp chức vụ/trách nhiệm
}

export const DEFAULT_ALLOWANCES: AllowancesState = {
  meal: 0,
  phone: 0,
  transport: 0,
  hazardous: 0,
  clothing: 0,
  housing: 0,
  position: 0,
};

// Giới hạn phụ cấp miễn thuế
export const ALLOWANCE_LIMITS = {
  clothingYearlyMax: 5_000_000,   // 5tr/năm (Thông tư 111/2013)
  clothingMonthlyMax: 416_667,    // ~417k/tháng
};

// Tính toán phụ cấp miễn thuế và chịu thuế
export interface AllowancesBreakdown {
  taxExempt: number;      // Tổng miễn thuế
  taxable: number;        // Tổng chịu thuế
  total: number;          // Tổng cộng
  clothingExempt: number; // Phần trang phục miễn thuế
  clothingTaxable: number; // Phần trang phục chịu thuế (vượt mức)
}

export function calculateAllowancesBreakdown(allowances?: AllowancesState): AllowancesBreakdown {
  if (!allowances) {
    return {
      taxExempt: 0,
      taxable: 0,
      total: 0,
      clothingExempt: 0,
      clothingTaxable: 0,
    };
  }

  // Validate and default all fields to 0 if undefined/null (prevent NaN)
  const meal = allowances.meal ?? 0;
  const phone = allowances.phone ?? 0;
  const transport = allowances.transport ?? 0;
  const hazardous = allowances.hazardous ?? 0;
  const clothing = allowances.clothing ?? 0;
  const housing = allowances.housing ?? 0;
  const position = allowances.position ?? 0;

  // Phần trang phục miễn thuế (tối đa 417k/tháng)
  const clothingExempt = Math.min(clothing, ALLOWANCE_LIMITS.clothingMonthlyMax);
  // Phần trang phục vượt mức → chịu thuế
  const clothingTaxable = Math.max(0, clothing - ALLOWANCE_LIMITS.clothingMonthlyMax);

  // Tổng miễn thuế
  const taxExempt = meal + phone + transport + hazardous + clothingExempt;

  // Tổng chịu thuế
  const taxable = housing + position + clothingTaxable;

  return {
    taxExempt,
    taxable,
    total: taxExempt + taxable,
    clothingExempt,
    clothingTaxable,
  };
}

// Shared state interface for all tabs
export interface SharedTaxState {
  grossIncome: number;
  declaredSalary?: number;
  dependents: number;
  otherDeductions: number;
  hasInsurance: boolean;
  insuranceOptions: InsuranceOptions;
  region: RegionType;
  pensionContribution: number;
  // Multiple income sources
  otherIncome?: OtherIncomeState;
  // Phụ cấp
  allowances?: AllowancesState;
}

// Other income sources
export interface OtherIncomeState {
  freelance: number;         // Thu nhập tự do / dịch vụ
  rental: number;            // Cho thuê tài sản
  investment: number;        // Đầu tư (cổ tức, lãi tiền gửi)
  transfer: number;          // Chuyển nhượng vốn
  lottery: number;           // Trúng thưởng
}

export const DEFAULT_OTHER_INCOME: OtherIncomeState = {
  freelance: 0,
  rental: 0,
  investment: 0,
  transfer: 0,
  lottery: 0,
};

// Tax rates for other income types
export const OTHER_INCOME_TAX_RATES = {
  freelance: 0.10,      // 10% trên doanh thu (cá nhân không đăng ký kinh doanh)
  rental: 0.05,         // 5% thuế TNCN + 5% VAT = 10% tổng
  rentalVAT: 0.05,      // VAT cho thuê tài sản
  investment: 0.05,     // 5% cổ tức, lãi
  transfer: 0.001,      // 0.1% giá chuyển nhượng (chứng khoán)
  lottery: 0.10,        // 10% phần vượt 10 triệu
};

// Ngưỡng miễn thuế
export const OTHER_INCOME_THRESHOLDS = {
  lottery: 10_000_000,  // Trúng thưởng miễn thuế dưới 10 triệu
  rental: 100_000_000,  // Cho thuê tài sản dưới 100 triệu/năm có thể miễn VAT
};

export interface TaxInput {
  grossIncome: number; // Thu nhập gộp (lương thực tế)
  declaredSalary?: number; // Lương khai báo với nhà nước (nếu khác lương thực)
  dependents: number; // Số người phụ thuộc
  otherDeductions?: number; // Các khoản giảm trừ khác (từ thiện, quỹ hưu trí...)
  hasInsurance?: boolean; // Có đóng BHXH không (deprecated, dùng insuranceOptions)
  insuranceOptions?: InsuranceOptions; // Tùy chọn từng loại bảo hiểm
  region?: RegionType; // Vùng lương tối thiểu
  pensionContribution?: number; // Quỹ hưu trí tự nguyện (tối đa 1tr/tháng)
  allowances?: AllowancesState; // Phụ cấp (ăn trưa, điện thoại, độc hại...)
}

export interface TaxResult {
  grossIncome: number;
  insuranceDeduction: number;
  insuranceDetail: InsuranceDetail; // Chi tiết BHXH, BHYT, BHTN
  personalDeduction: number;
  dependentDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  taxableIncome: number;
  taxAmount: number;
  netIncome: number;
  effectiveRate: number;
  taxBreakdown: TaxBreakdownItem[];
  // Phụ cấp
  allowancesBreakdown?: AllowancesBreakdown;
  totalIncome: number; // grossIncome + tổng phụ cấp
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
    allowances,
  } = input;

  // Lương đóng bảo hiểm (mặc định = lương thực nếu không khai báo riêng)
  const insuranceBaseSalary = declaredSalary ?? grossIncome;

  // Xác định các loại bảo hiểm được bật
  const insOptions: InsuranceOptions = insuranceOptions ?? {
    bhxh: hasInsurance,
    bhyt: hasInsurance,
    bhtn: hasInsurance,
  };

  // Tính phụ cấp miễn thuế và chịu thuế
  const allowancesBreakdown = calculateAllowancesBreakdown(allowances);

  // Tính bảo hiểm dựa trên lương đóng BH (có thể khác lương thực)
  const insuranceDetail = calculateInsuranceDetailed(insuranceBaseSalary, region, insOptions);
  const insuranceDeduction = insuranceDetail.total;
  const personalDeduction = OLD_DEDUCTIONS.personal;
  const dependentDeduction = dependents * OLD_DEDUCTIONS.dependent;

  const totalDeductions = insuranceDeduction + personalDeduction + dependentDeduction + otherDeductions;
  // Thu nhập tính thuế = lương thực + phụ cấp chịu thuế - các khoản giảm trừ
  const taxableIncome = Math.max(0, grossIncome + allowancesBreakdown.taxable - totalDeductions);

  const { tax, breakdown } = calculateTaxWithBrackets(taxableIncome, OLD_TAX_BRACKETS);
  // Thu nhập thực nhận = lương + tổng phụ cấp - bảo hiểm - thuế
  const totalIncome = grossIncome + allowancesBreakdown.total;
  const netIncome = totalIncome - insuranceDeduction - tax;
  const effectiveRate = totalIncome > 0 ? (tax / totalIncome) * 100 : 0;

  return {
    grossIncome,
    insuranceDeduction,
    insuranceDetail,
    personalDeduction,
    dependentDeduction,
    otherDeductions,
    totalDeductions,
    taxableIncome,
    taxAmount: tax,
    netIncome,
    effectiveRate,
    taxBreakdown: breakdown,
    allowancesBreakdown,
    totalIncome,
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
    allowances,
  } = input;

  // Lương đóng bảo hiểm (mặc định = lương thực nếu không khai báo riêng)
  const insuranceBaseSalary = declaredSalary ?? grossIncome;

  // Xác định các loại bảo hiểm được bật
  const insOptions: InsuranceOptions = insuranceOptions ?? {
    bhxh: hasInsurance,
    bhyt: hasInsurance,
    bhtn: hasInsurance,
  };

  // Tính phụ cấp miễn thuế và chịu thuế
  const allowancesBreakdown = calculateAllowancesBreakdown(allowances);

  // Tính bảo hiểm dựa trên lương đóng BH (có thể khác lương thực)
  const insuranceDetail = calculateInsuranceDetailed(insuranceBaseSalary, region, insOptions);
  const insuranceDeduction = insuranceDetail.total;
  const personalDeduction = NEW_DEDUCTIONS.personal;
  const dependentDeduction = dependents * NEW_DEDUCTIONS.dependent;

  const totalDeductions = insuranceDeduction + personalDeduction + dependentDeduction + otherDeductions;
  // Thu nhập tính thuế = lương thực + phụ cấp chịu thuế - các khoản giảm trừ
  const taxableIncome = Math.max(0, grossIncome + allowancesBreakdown.taxable - totalDeductions);

  const { tax, breakdown } = calculateTaxWithBrackets(taxableIncome, NEW_TAX_BRACKETS);
  // Thu nhập thực nhận = lương + tổng phụ cấp - bảo hiểm - thuế
  const totalIncome = grossIncome + allowancesBreakdown.total;
  const netIncome = totalIncome - insuranceDeduction - tax;
  const effectiveRate = totalIncome > 0 ? (tax / totalIncome) * 100 : 0;

  return {
    grossIncome,
    insuranceDeduction,
    insuranceDetail,
    personalDeduction,
    dependentDeduction,
    otherDeductions,
    totalDeductions,
    taxableIncome,
    taxAmount: tax,
    netIncome,
    effectiveRate,
    taxBreakdown: breakdown,
    allowancesBreakdown,
    totalIncome,
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

// ===== THUẾ THU NHẬP TỪ NGUỒN KHÁC =====

export interface OtherIncomeTaxResult {
  freelance: {
    income: number;
    tax: number;
    rate: number;
    note: string;
  };
  rental: {
    income: number;
    taxPIT: number;     // Thuế TNCN
    taxVAT: number;     // VAT
    totalTax: number;
    rate: number;
    note: string;
  };
  investment: {
    income: number;
    tax: number;
    rate: number;
    note: string;
  };
  transfer: {
    income: number;
    tax: number;
    rate: number;
    note: string;
  };
  lottery: {
    income: number;
    taxableAmount: number;
    tax: number;
    rate: number;
    note: string;
  };
  totalIncome: number;
  totalTax: number;
  totalNet: number;
}

// Tính thuế cho các nguồn thu nhập khác
export function calculateOtherIncomeTax(otherIncome: OtherIncomeState): OtherIncomeTaxResult {
  // 1. Thu nhập từ dịch vụ / Freelance
  // Cá nhân không đăng ký kinh doanh: 10% trên doanh thu
  const freelanceTax = otherIncome.freelance * OTHER_INCOME_TAX_RATES.freelance;

  // 2. Thu nhập từ cho thuê tài sản
  // Thuế TNCN: 5%, VAT: 5% (nếu > 100 triệu/năm)
  const rentalPIT = otherIncome.rental * OTHER_INCOME_TAX_RATES.rental;
  const rentalVAT = otherIncome.rental * OTHER_INCOME_TAX_RATES.rentalVAT;

  // 3. Thu nhập từ đầu tư (cổ tức, lãi tiền gửi)
  // Thuế suất: 5%
  const investmentTax = otherIncome.investment * OTHER_INCOME_TAX_RATES.investment;

  // 4. Thu nhập từ chuyển nhượng chứng khoán
  // Thuế suất: 0.1% trên giá chuyển nhượng
  const transferTax = otherIncome.transfer * OTHER_INCOME_TAX_RATES.transfer;

  // 5. Thu nhập từ trúng thưởng
  // Thuế suất: 10% phần vượt 10 triệu
  const lotteryTaxable = Math.max(0, otherIncome.lottery - OTHER_INCOME_THRESHOLDS.lottery);
  const lotteryTax = lotteryTaxable * OTHER_INCOME_TAX_RATES.lottery;

  const totalIncome = otherIncome.freelance + otherIncome.rental +
    otherIncome.investment + otherIncome.transfer + otherIncome.lottery;
  const totalTax = freelanceTax + rentalPIT + rentalVAT + investmentTax + transferTax + lotteryTax;

  return {
    freelance: {
      income: otherIncome.freelance,
      tax: freelanceTax,
      rate: OTHER_INCOME_TAX_RATES.freelance * 100,
      note: '10% trên doanh thu (không ĐKKD)',
    },
    rental: {
      income: otherIncome.rental,
      taxPIT: rentalPIT,
      taxVAT: rentalVAT,
      totalTax: rentalPIT + rentalVAT,
      rate: (OTHER_INCOME_TAX_RATES.rental + OTHER_INCOME_TAX_RATES.rentalVAT) * 100,
      note: '5% TNCN + 5% VAT',
    },
    investment: {
      income: otherIncome.investment,
      tax: investmentTax,
      rate: OTHER_INCOME_TAX_RATES.investment * 100,
      note: '5% cổ tức/lãi tiền gửi',
    },
    transfer: {
      income: otherIncome.transfer,
      tax: transferTax,
      rate: OTHER_INCOME_TAX_RATES.transfer * 100,
      note: '0.1% giá chuyển nhượng',
    },
    lottery: {
      income: otherIncome.lottery,
      taxableAmount: lotteryTaxable,
      tax: lotteryTax,
      rate: OTHER_INCOME_TAX_RATES.lottery * 100,
      note: `10% phần vượt ${formatNumber(OTHER_INCOME_THRESHOLDS.lottery)}`,
    },
    totalIncome,
    totalTax,
    totalNet: totalIncome - totalTax,
  };
}

// ===== CHI PHÍ NHÀ TUYỂN DỤNG (EMPLOYER COST) =====

export interface EmployerInsuranceDetail {
  bhxh: number;        // BHXH 17.5%
  bhyt: number;        // BHYT 3%
  bhtn: number;        // BHTN 1%
  unionFee: number;    // Công đoàn 2% (tùy chọn)
  total: number;
}

export interface EmployerCostResult {
  grossSalary: number;
  employerInsurance: EmployerInsuranceDetail;
  totalEmployerCost: number;
  yearlyEmployerCost: number;
  employeeInsurance: InsuranceDetail;
  employeeTax: number;
  employeeNetIncome: number;
  // Tỷ lệ
  insurancePercentOfGross: number;
  totalCostPercentOfGross: number;
}

export function calculateEmployerInsurance(
  grossIncome: number,
  region: RegionType = 1,
  options: InsuranceOptions = DEFAULT_INSURANCE_OPTIONS,
  includeUnionFee: boolean = false
): EmployerInsuranceDetail {
  // BHXH và BHYT giới hạn ở 20 lần lương cơ sở
  const bhxhBhytBase = Math.min(grossIncome, MAX_SOCIAL_INSURANCE_SALARY);
  const bhxh = options.bhxh ? bhxhBhytBase * EMPLOYER_INSURANCE_RATES.socialInsurance : 0;
  const bhyt = options.bhyt ? bhxhBhytBase * EMPLOYER_INSURANCE_RATES.healthInsurance : 0;

  // BHTN giới hạn ở 20 lần lương tối thiểu vùng
  const maxBhtn = MAX_UNEMPLOYMENT_INSURANCE_SALARY[region];
  const bhtnBase = Math.min(grossIncome, maxBhtn);
  const bhtn = options.bhtn ? bhtnBase * EMPLOYER_INSURANCE_RATES.unemploymentInsurance : 0;

  // Công đoàn 2% (tùy chọn) - không giới hạn
  const unionFee = includeUnionFee ? grossIncome * EMPLOYER_INSURANCE_RATES.unionFee : 0;

  return {
    bhxh,
    bhyt,
    bhtn,
    unionFee,
    total: bhxh + bhyt + bhtn + unionFee,
  };
}

export function getFullEmployerCostResult(input: {
  grossIncome: number;
  declaredSalary?: number;
  dependents: number;
  region: RegionType;
  insuranceOptions: InsuranceOptions;
  includeUnionFee?: boolean;
  useNewLaw?: boolean;
  allowances?: AllowancesState;
}): EmployerCostResult {
  const {
    grossIncome,
    declaredSalary,
    dependents,
    region,
    insuranceOptions,
    includeUnionFee = false,
    useNewLaw = true,
    allowances,
  } = input;

  // Sử dụng lương khai báo cho bảo hiểm nếu có
  const insuranceBase = declaredSalary ?? grossIncome;

  // Tính bảo hiểm phía công ty
  const employerInsurance = calculateEmployerInsurance(insuranceBase, region, insuranceOptions, includeUnionFee);

  // Tính bảo hiểm phía nhân viên
  const employeeInsurance = getInsuranceDetailed(insuranceBase, region, insuranceOptions);

  // Tính thuế
  const taxResult = useNewLaw
    ? calculateNewTax({
        grossIncome,
        declaredSalary,
        dependents,
        insuranceOptions,
        region,
        allowances,
      })
    : calculateOldTax({
        grossIncome,
        declaredSalary,
        dependents,
        insuranceOptions,
        region,
        allowances,
      });

  const totalEmployerCost = grossIncome + employerInsurance.total;

  return {
    grossSalary: grossIncome,
    employerInsurance,
    totalEmployerCost,
    yearlyEmployerCost: totalEmployerCost * 12,
    employeeInsurance,
    employeeTax: taxResult.taxAmount,
    employeeNetIncome: taxResult.netIncome,
    insurancePercentOfGross: grossIncome > 0 ? (employerInsurance.total / grossIncome) * 100 : 0,
    totalCostPercentOfGross: grossIncome > 0 ? (totalEmployerCost / grossIncome) * 100 : 0,
  };
}
