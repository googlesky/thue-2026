/**
 * Special Income Tax Calculator - Thuế thu nhập từ các loại tài sản đặc biệt
 *
 * Căn cứ pháp lý: Luật Thuế TNCN số 109/2025/QH15 (hiệu lực 01/7/2026)
 * - Điều 3, khoản 10, điểm a/b/c: thu nhập chịu thuế
 * - Điều 9: thuế suất 5% trên phần thu nhập tính thuế (phần vượt ngưỡng/lần)
 *
 * Các loại thu nhập:
 *   a) Chuyển nhượng tên miền internet quốc gia Việt Nam ".vn"
 *   b) Chuyển nhượng kết quả giảm phát thải khí nhà kính, tín chỉ các-bon
 *   c) Chuyển nhượng biển số xe trúng đấu giá
 *
 * Công thức: Thuế TNCN = (Thu nhập nhận được - Ngưỡng 20 triệu) × 5%
 * Tính theo TỪNG LẦN phát sinh (không cộng dồn trong năm).
 */

import { getPerTransactionThreshold, EFFECTIVE_DATES } from './taxCalculator';

export type SpecialIncomeType = 'domain' | 'carbon' | 'license_plate';

export const SPECIAL_INCOME_TAX_RATE = 0.05; // 5%

export const SPECIAL_INCOME_LABELS: Record<SpecialIncomeType, string> = {
  domain: 'Tên miền quốc gia ".vn"',
  carbon: 'Tín chỉ các-bon / giảm phát thải',
  license_plate: 'Biển số xe trúng đấu giá',
};

export const SPECIAL_INCOME_DESCRIPTIONS: Record<SpecialIncomeType, string> = {
  domain: 'Chuyển nhượng quyền sử dụng tên miền internet quốc gia Việt Nam ".vn"',
  carbon: 'Chuyển nhượng kết quả giảm phát thải khí nhà kính, tín chỉ các-bon',
  license_plate: 'Chuyển nhượng biển số xe ô tô, xe máy trúng đấu giá',
};

export interface SpecialIncomeInput {
  incomeType: SpecialIncomeType;
  amount: number; // Thu nhập nhận được từ một lần chuyển nhượng
  transactionDate?: Date;
}

export interface SpecialIncomeResult {
  incomeType: SpecialIncomeType;
  amount: number;
  threshold: number; // Ngưỡng miễn mỗi lần (20 triệu từ 01/7/2026)
  taxableAmount: number; // Phần thu nhập tính thuế (vượt ngưỡng)
  rate: number; // 5%
  taxAmount: number;
  netAmount: number; // Thực nhận sau thuế
  isExempt: boolean;
}

/**
 * Tính thuế TNCN cho thu nhập đặc biệt (tên miền / carbon / biển số xe)
 */
export function calculateSpecialIncomeTax(
  input: SpecialIncomeInput
): SpecialIncomeResult {
  const { incomeType, amount, transactionDate } = input;
  // Các loại thu nhập này chỉ chịu thuế từ 01/7/2026 (Luật 109/2025/QH15),
  // nên ngưỡng luôn là 20 triệu/lần (mặc định dùng mốc hiệu lực nếu không truyền ngày).
  const threshold = getPerTransactionThreshold(
    transactionDate ?? EFFECTIVE_DATES.PER_TRANSACTION_THRESHOLD_2026
  );
  const taxableAmount = Math.max(0, amount - threshold);
  const taxAmount = Math.round(taxableAmount * SPECIAL_INCOME_TAX_RATE);

  return {
    incomeType,
    amount,
    threshold,
    taxableAmount,
    rate: SPECIAL_INCOME_TAX_RATE,
    taxAmount,
    netAmount: amount - taxAmount,
    isExempt: taxableAmount === 0,
  };
}

export function getAllSpecialIncomeTypes(): SpecialIncomeType[] {
  return ['domain', 'carbon', 'license_plate'];
}
