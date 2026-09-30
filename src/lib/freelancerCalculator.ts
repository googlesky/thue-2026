import {
  calculateNewTax,
  getBaseSalary,
  getCasualWithholdingThreshold,
  CASUAL_WITHHOLDING_RATE,
} from './taxCalculator';

// 'project' chỉ còn để đọc link/snapshot cũ (được hiểu như 'monthly')
export type IncomeFrequency = 'monthly' | 'project' | 'annual';

// Kiểu dữ liệu chế độ "Content Creator" cũ của tab Freelancer - giữ để đọc snapshot cũ.
// Thu nhập từ nền tảng số là thu nhập KINH DOANH, tính ở tab Content Creator.
export type CreatorIncomeSourceType =
  | 'youtube'
  | 'tiktok'
  | 'facebook_reels'
  | 'affiliate'
  | 'sponsorship'
  | 'donation'
  | 'digital_product'
  | 'consulting'
  | 'other';

export interface CreatorIncomeSource {
  id: string;
  type: CreatorIncomeSourceType;
  name: string;
  amount: number;
  currency: 'VND' | 'USD';
  frequency: IncomeFrequency;
  isForeign: boolean;
  withheldTax: number;
}

export const DEFAULT_USD_EXCHANGE_RATE = 25_400; // VND per USD

/** BHYT hộ gia đình tự mua, người thứ nhất: 4,5% × lương cơ sở × 12 (≈ 1,37 triệu/năm từ 01/7/2026) */
export function getSelfHealthInsuranceAnnual(date: Date = new Date()): number {
  return Math.round(0.045 * getBaseSalary(date) * 12);
}

export interface FreelancerTaxResult {
  withheld: number;   // Đã tạm khấu trừ 10% trong năm
  finalTax: number;   // Thuế cả năm theo biểu lũy tiến (quyết toán)
  settlement: number; // > 0: nộp thêm khi quyết toán; < 0: được hoàn
}

/**
 * Freelancer = cá nhân không đăng ký kinh doanh nhận thù lao dịch vụ -> thu nhập TIỀN CÔNG
 * (NĐ 253/2026 Điều 8.2.c). Tổ chức chi trả tạm khấu trừ 10% khoản từ 5 triệu đồng/lần
 * (Điều 50.2); cuối năm quyết toán theo biểu lũy tiến 5 bậc, giảm trừ gia cảnh, KHÔNG trừ chi phí.
 * annualDeductions: khoản giảm trừ khác cả năm (VD BHYT tự đóng - Điều 46.2.a).
 */
export function calculateFreelancerTax(
  annualIncome: number,
  dependents: number,
  options: { paymentsPerYear?: number; annualDeductions?: number; date?: Date } = {}
): FreelancerTaxResult {
  const { paymentsPerYear = 12, annualDeductions = 0, date = new Date() } = options;
  const income = Math.max(0, annualIncome);
  const withheld = income / paymentsPerYear >= getCasualWithholdingThreshold(date)
    ? Math.round(income * CASUAL_WITHHOLDING_RATE)
    : 0;
  const finalTax = Math.round(calculateNewTax({
    grossIncome: income / 12,
    dependents: Math.max(0, dependents),
    hasInsurance: false,
    otherDeductions: annualDeductions / 12,
    calculationDate: date,
  }).taxAmount * 12);
  return { withheld, finalTax, settlement: finalTax - withheld };
}
