/**
 * Special Income Tax Calculator - Thu nhập khác: tên miền ".vn", tín chỉ các-bon, biển số xe trúng đấu giá
 *
 * Căn cứ pháp lý (hiệu lực 01/7/2026):
 * - Luật Thuế TNCN số 109/2025/QH15: Điều 3 khoản 10 điểm a, b, c (thu nhập chịu thuế); Điều 19 khoản 1
 *   (cá nhân cư trú), Điều 27 khoản 1 (không cư trú): 5% × phần thu nhập vượt 20 triệu đồng/lần.
 * - NĐ 253/2026/NĐ-CP: Điều 16 khoản 1–3, Điều 62 khoản 1; Điều 34 khoản 1 (miễn thuế tín chỉ các-bon).
 *
 * - Biển số xe: thu nhập tính thuế = giá chuyển nhượng (kể cả xe gắn biển số) − giá trị còn lại của xe
 *   theo giá tính lệ phí trước bạ tại thời điểm chuyển nhượng − 20 triệu (NĐ 253 Điều 62 khoản 1).
 * - Tín chỉ các-bon / kết quả giảm phát thải: chuyển nhượng LẦN ĐẦU bởi cá nhân được cấp, công nhận -> miễn
 *   (Luật Điều 4 khoản 16; NĐ 253 Điều 34 khoản 1).
 * Tính theo TỪNG LẦN phát sinh (không cộng dồn trong năm).
 */

import { PER_TRANSACTION_THRESHOLD_2026 } from './taxCalculator';

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
  license_plate: 'Chuyển nhượng biển số xe ô tô, xe máy trúng đấu giá (cùng xe gắn biển số)',
};

export interface SpecialIncomeInput {
  incomeType: SpecialIncomeType;
  amount: number; // Thu nhập / giá chuyển nhượng nhận được từ một lần chuyển nhượng
  vehicleResidualValue?: number; // Biển số: giá trị còn lại của xe theo giá tính lệ phí trước bạ
  carbonFirstTransfer?: boolean; // Các-bon: chuyển nhượng lần đầu bởi cá nhân được cấp, công nhận
}

export interface SpecialIncomeResult {
  incomeType: SpecialIncomeType;
  amount: number;
  deduction: number; // Giá trị còn lại của xe được trừ (biển số)
  threshold: number; // Ngưỡng 20 triệu/lần
  taxableAmount: number; // Phần thu nhập tính thuế (vượt ngưỡng)
  rate: number; // 5%
  taxAmount: number;
  netAmount: number; // Thực nhận sau thuế
  isExempt: boolean; // Không phải nộp thuế (không vượt ngưỡng hoặc được miễn)
  exemptReason?: string;
}

/**
 * Tính thuế TNCN cho thu nhập đặc biệt (tên miền / carbon / biển số xe)
 */
export function calculateSpecialIncomeTax(
  input: SpecialIncomeInput
): SpecialIncomeResult {
  const { incomeType } = input;
  const amount = Math.max(0, input.amount);
  const deduction = incomeType === 'license_plate'
    ? Math.min(Math.max(0, input.vehicleResidualValue ?? 0), amount)
    : 0;
  // Các loại thu nhập này chỉ chịu thuế từ 01/7/2026 nên ngưỡng luôn là 20 triệu/lần
  const threshold = PER_TRANSACTION_THRESHOLD_2026;
  const carbonExempt = incomeType === 'carbon' && input.carbonFirstTransfer === true;
  const taxableAmount = carbonExempt ? 0 : Math.max(0, amount - deduction - threshold);
  const taxAmount = Math.round(taxableAmount * SPECIAL_INCOME_TAX_RATE);

  return {
    incomeType,
    amount,
    deduction,
    threshold,
    taxableAmount,
    rate: SPECIAL_INCOME_TAX_RATE,
    taxAmount,
    netAmount: amount - taxAmount,
    isExempt: taxableAmount === 0,
    exemptReason: carbonExempt
      ? 'Miễn thuế: chuyển nhượng lần đầu tín chỉ các-bon, kết quả giảm phát thải của cá nhân được cấp, công nhận (Luật 109/2025/QH15 Điều 4 khoản 16; NĐ 253/2026/NĐ-CP Điều 34 khoản 1)'
      : undefined,
  };
}

export function getAllSpecialIncomeTypes(): SpecialIncomeType[] {
  return ['domain', 'carbon', 'license_plate'];
}
