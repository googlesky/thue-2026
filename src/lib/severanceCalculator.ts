/**
 * Severance/Retirement Pay Tax Calculator
 * Tính thuế TNCN cho trợ cấp thôi việc, nghỉ hưu, BHXH một lần
 *
 * Căn cứ pháp lý:
 * - Điều 8 Thông tư 111/2013/TT-BTC
 * - Điều 14 Luật Thuế TNCN sửa đổi 2024
 */

import { formatNumber } from './taxCalculator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Loại trợ cấp
 */
export type SeveranceType =
  | 'severance'     // Trợ cấp thôi việc (Điều 46 BLLĐ)
  | 'job_loss'      // Trợ cấp mất việc làm (Điều 47 BLLĐ)
  | 'early_retire'  // Trợ cấp nghỉ hưu sớm
  | 'social_insurance_lump_sum'  // BHXH một lần
  | 'voluntary_pension_lump_sum'; // Quỹ hưu trí tự nguyện rút một lần

/**
 * Thông tin về loại trợ cấp
 */
export const SEVERANCE_TYPE_INFO: Record<SeveranceType, {
  label: string;
  description: string;
  taxExemptMultiplier: number; // Hệ số x lương bình quân được miễn thuế
  legalReference: string;
}> = {
  severance: {
    label: 'Trợ cấp thôi việc',
    description: 'Trợ cấp theo Điều 46 Bộ luật Lao động khi chấm dứt HĐLĐ',
    taxExemptMultiplier: 10,
    legalReference: 'Điều 8, Thông tư 111/2013/TT-BTC',
  },
  job_loss: {
    label: 'Trợ cấp mất việc làm',
    description: 'Trợ cấp theo Điều 47 BLLĐ do thay đổi cơ cấu, công nghệ',
    taxExemptMultiplier: 10,
    legalReference: 'Điều 8, Thông tư 111/2013/TT-BTC',
  },
  early_retire: {
    label: 'Trợ cấp nghỉ hưu sớm',
    description: 'Trợ cấp cho người nghỉ hưu trước tuổi quy định',
    taxExemptMultiplier: 10,
    legalReference: 'Điều 8, Thông tư 111/2013/TT-BTC',
  },
  social_insurance_lump_sum: {
    label: 'BHXH một lần',
    description: 'Nhận BHXH một lần khi không đủ điều kiện hưởng lương hưu',
    taxExemptMultiplier: 10,
    legalReference: 'Điều 8, Thông tư 111/2013/TT-BTC',
  },
  voluntary_pension_lump_sum: {
    label: 'Quỹ hưu trí tự nguyện (rút một lần)',
    description: 'Rút một lần từ quỹ hưu trí tự nguyện (không đúng quy định)',
    taxExemptMultiplier: 0, // Không được miễn giảm
    legalReference: 'Điều 14, Luật Thuế TNCN sửa đổi 2024',
  },
};

/**
 * Input cho tính thuế trợ cấp
 */
export interface SeveranceInput {
  type: SeveranceType;
  totalAmount: number;           // Tổng số tiền trợ cấp
  averageSalary: number;         // Lương bình quân 6 tháng cuối (hoặc cả quá trình)
  yearsWorked?: number;          // Số năm làm việc (tùy chọn, để hiển thị)
  contributionAmount?: number;   // Số tiền đã đóng (cho quỹ hưu trí tự nguyện)
}

/**
 * Kết quả tính thuế
 */
export interface SeveranceResult {
  type: SeveranceType;
  typeInfo: typeof SEVERANCE_TYPE_INFO[SeveranceType];
  totalAmount: number;
  taxExemptAmount: number;       // Số tiền được miễn thuế
  taxableIncome: number;         // Thu nhập chịu thuế
  taxRate: number;               // Thuế suất (10%)
  taxAmount: number;             // Số thuế phải nộp
  netAmount: number;             // Số tiền thực nhận
  effectiveRate: number;         // Thuế suất thực tế (%)

  // Chi tiết tính toán
  calculation: {
    step1: string;  // Mô tả bước 1
    step2: string;  // Mô tả bước 2
    step3: string;  // Mô tả bước 3
  };

  // Ghi chú
  notes: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Thuế suất cho thu nhập từ trợ cấp thôi việc
 */
const SEVERANCE_TAX_RATE = 0.10; // 10%

/**
 * Thuế suất cho quỹ hưu trí tự nguyện rút một lần
 */
const PENSION_LUMP_SUM_TAX_RATE = 0.10; // 10%

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Tính thuế TNCN cho trợ cấp thôi việc/nghỉ hưu
 */
export function calculateSeveranceTax(input: SeveranceInput): SeveranceResult {
  const { type, totalAmount, averageSalary, contributionAmount } = input;
  const typeInfo = SEVERANCE_TYPE_INFO[type];

  // Xử lý riêng cho quỹ hưu trí tự nguyện
  if (type === 'voluntary_pension_lump_sum') {
    return calculateVoluntaryPensionLumpSum(input);
  }

  // Tính số tiền được miễn thuế
  // Theo Thông tư 111: Miễn thuế = 10 x Lương bình quân 6 tháng cuối
  const taxExemptAmount = averageSalary * typeInfo.taxExemptMultiplier;

  // Thu nhập chịu thuế = Tổng trợ cấp - Số tiền được miễn
  const taxableIncome = Math.max(0, totalAmount - taxExemptAmount);

  // Thuế = Thu nhập chịu thuế x 10%
  const taxAmount = Math.round(taxableIncome * SEVERANCE_TAX_RATE);

  // Số tiền thực nhận
  const netAmount = totalAmount - taxAmount;

  // Thuế suất thực tế
  const effectiveRate = totalAmount > 0 ? (taxAmount / totalAmount) * 100 : 0;

  // Chi tiết tính toán
  const calculation = {
    step1: `Số tiền được miễn thuế = ${formatNumber(averageSalary)} × ${typeInfo.taxExemptMultiplier} = ${formatNumber(taxExemptAmount)} VND`,
    step2: `Thu nhập chịu thuế = ${formatNumber(totalAmount)} - ${formatNumber(taxExemptAmount)} = ${formatNumber(taxableIncome)} VND`,
    step3: taxableIncome > 0
      ? `Thuế TNCN = ${formatNumber(taxableIncome)} × 10% = ${formatNumber(taxAmount)} VND`
      : 'Thu nhập chịu thuế ≤ 0, không phải nộp thuế',
  };

  // Ghi chú
  const notes: string[] = [];

  if (taxableIncome <= 0) {
    notes.push('Bạn không phải nộp thuế TNCN vì trợ cấp nhận được không vượt quá mức miễn thuế.');
  }

  if (type === 'social_insurance_lump_sum') {
    notes.push('BHXH một lần chỉ được nhận khi không đủ điều kiện hưởng lương hưu (đóng dưới 20 năm và đủ tuổi nghỉ hưu, hoặc ra nước ngoài định cư).');
  }

  notes.push(`Căn cứ pháp lý: ${typeInfo.legalReference}`);

  return {
    type,
    typeInfo,
    totalAmount,
    taxExemptAmount,
    taxableIncome,
    taxRate: SEVERANCE_TAX_RATE,
    taxAmount,
    netAmount,
    effectiveRate,
    calculation,
    notes,
  };
}

/**
 * Tính thuế cho rút quỹ hưu trí tự nguyện một lần
 * Trường hợp rút không đúng quy định (trước tuổi nghỉ hưu)
 */
function calculateVoluntaryPensionLumpSum(input: SeveranceInput): SeveranceResult {
  const { totalAmount, contributionAmount = 0 } = input;
  const type = 'voluntary_pension_lump_sum';
  const typeInfo = SEVERANCE_TYPE_INFO[type];

  // Thu nhập chịu thuế = Tổng rút - Số đã đóng (phần lãi)
  // Nếu rút đúng quy định (đủ tuổi) thì miễn thuế
  // Nếu rút sớm thì chịu thuế 10% trên phần lãi
  const profitAmount = Math.max(0, totalAmount - contributionAmount);
  const taxableIncome = profitAmount;

  const taxAmount = Math.round(taxableIncome * PENSION_LUMP_SUM_TAX_RATE);
  const netAmount = totalAmount - taxAmount;
  const effectiveRate = totalAmount > 0 ? (taxAmount / totalAmount) * 100 : 0;

  const calculation = {
    step1: `Số tiền đã đóng góp = ${formatNumber(contributionAmount)} VND`,
    step2: `Phần lãi/lợi nhuận = ${formatNumber(totalAmount)} - ${formatNumber(contributionAmount)} = ${formatNumber(profitAmount)} VND`,
    step3: profitAmount > 0
      ? `Thuế TNCN = ${formatNumber(profitAmount)} × 10% = ${formatNumber(taxAmount)} VND`
      : 'Không có lãi, không phải nộp thuế',
  };

  const notes = [
    'Rút quỹ hưu trí tự nguyện trước tuổi nghỉ hưu phải chịu thuế 10% trên phần lãi.',
    'Nếu rút đúng quy định (đủ tuổi nghỉ hưu theo Luật BHXH) thì được miễn thuế.',
    `Căn cứ pháp lý: ${typeInfo.legalReference}`,
  ];

  return {
    type,
    typeInfo,
    totalAmount,
    taxExemptAmount: contributionAmount,
    taxableIncome,
    taxRate: PENSION_LUMP_SUM_TAX_RATE,
    taxAmount,
    netAmount,
    effectiveRate,
    calculation,
    notes,
  };
}

/**
 * Tính trợ cấp thôi việc theo Bộ luật Lao động
 * Công thức: Trợ cấp = (Số năm làm việc) × (1/2 tháng lương)
 */
export function estimateSeveranceAmount(
  yearsWorked: number,
  averageSalary: number
): number {
  // Mỗi năm làm việc được 1/2 tháng lương
  // Thời gian làm việc từ 12 tháng trở lên mới được tính trợ cấp
  if (yearsWorked < 1) return 0;

  return Math.round(yearsWorked * averageSalary * 0.5);
}

/**
 * Tính trợ cấp mất việc làm theo Bộ luật Lao động
 * Công thức: Trợ cấp = (Số năm làm việc) × (1 tháng lương)
 */
export function estimateJobLossAmount(
  yearsWorked: number,
  averageSalary: number
): number {
  // Mỗi năm làm việc được 1 tháng lương, tối thiểu 2 tháng
  if (yearsWorked < 1) return 0;

  const amount = yearsWorked * averageSalary;
  return Math.round(Math.max(amount, averageSalary * 2));
}

/**
 * Danh sách các loại trợ cấp để hiển thị trong dropdown
 */
export function getSeveranceTypes(): Array<{ id: SeveranceType; label: string; description: string }> {
  return Object.entries(SEVERANCE_TYPE_INFO).map(([id, info]) => ({
    id: id as SeveranceType,
    label: info.label,
    description: info.description,
  }));
}
