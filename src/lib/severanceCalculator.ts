/**
 * Thuế TNCN đối với trợ cấp thôi việc, mất việc làm, BHXH một lần, rút quỹ hưu trí tự nguyện
 *
 * Căn cứ pháp lý (kỳ tính thuế 2026):
 * - Luật Thuế TNCN 109/2025/QH15 Điều 3.2.c: trợ cấp thôi việc, mất việc làm, trợ cấp theo pháp luật
 *   BHXH không tính vào thu nhập chịu thuế; Điều 4.9: miễn thuế thu nhập do quỹ hưu trí tự nguyện chi trả
 * - NĐ 253/2026/NĐ-CP Điều 8.3.g, h; Điều 27.2
 * - Bộ luật Lao động 2019 Điều 46, 47; NĐ 145/2020/NĐ-CP Điều 8 (mức trợ cấp)
 * - Luật BHXH 2024 Điều 70 (BHXH một lần)
 */

import { formatNumber } from './taxCalculator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Loại khoản nhận khi nghỉ việc
 */
export type SeveranceType =
  | 'severance'     // Trợ cấp thôi việc (Điều 46 BLLĐ)
  | 'job_loss'      // Trợ cấp mất việc làm (Điều 47 BLLĐ)
  | 'early_retire'  // Khoản doanh nghiệp tự chi khi nghỉ hưu sớm
  | 'social_insurance_lump_sum'  // BHXH một lần
  | 'voluntary_pension_lump_sum'; // Quỹ hưu trí tự nguyện rút một lần

const NOT_TAXABLE_ALLOWANCE = 'Luật Thuế TNCN 109/2025/QH15 Điều 3.2.c; NĐ 253/2026/NĐ-CP Điều 8.3.h';

/**
 * Thông tin về loại khoản (taxable = tính vào thu nhập chịu thuế từ tiền lương, tiền công)
 */
export const SEVERANCE_TYPE_INFO: Record<SeveranceType, {
  label: string;
  description: string;
  taxable: boolean;
  legalReference: string;
}> = {
  severance: {
    label: 'Trợ cấp thôi việc',
    description: 'Trợ cấp theo Điều 46 Bộ luật Lao động khi chấm dứt hợp đồng lao động',
    taxable: false,
    legalReference: NOT_TAXABLE_ALLOWANCE,
  },
  job_loss: {
    label: 'Trợ cấp mất việc làm',
    description: 'Trợ cấp theo Điều 47 Bộ luật Lao động do thay đổi cơ cấu, công nghệ, lý do kinh tế, sáp nhập, chia tách',
    taxable: false,
    legalReference: NOT_TAXABLE_ALLOWANCE,
  },
  early_retire: {
    label: 'Khoản doanh nghiệp chi khi nghỉ hưu sớm',
    description: 'Khoản doanh nghiệp tự chi thêm khi người lao động nghỉ hưu trước tuổi (không phải trợ cấp theo luật)',
    taxable: true,
    legalReference: 'Luật Thuế TNCN 109/2025/QH15 Điều 3.2; NĐ 253/2026/NĐ-CP Điều 8',
  },
  social_insurance_lump_sum: {
    label: 'BHXH một lần',
    description: 'Hưởng BHXH một lần theo Điều 70 Luật BHXH 2024',
    taxable: false,
    legalReference: 'Luật Thuế TNCN 109/2025/QH15 Điều 3.2.c; NĐ 253/2026/NĐ-CP Điều 8.3.g',
  },
  voluntary_pension_lump_sum: {
    label: 'Quỹ hưu trí tự nguyện, bổ sung (rút một lần)',
    description: 'Thu nhập do quỹ hưu trí tự nguyện, quỹ bảo hiểm hưu trí bổ sung chi trả, kể cả rút một lần trước tuổi nghỉ hưu',
    taxable: false,
    legalReference: 'Luật Thuế TNCN 109/2025/QH15 Điều 4.9; NĐ 253/2026/NĐ-CP Điều 27.2',
  },
};

/**
 * Input cho tính thuế
 */
export interface SeveranceInput {
  type: SeveranceType;
  totalAmount: number; // Tổng số tiền nhận
}

/**
 * Kết quả tính thuế
 */
export interface SeveranceResult {
  type: SeveranceType;
  typeInfo: typeof SEVERANCE_TYPE_INFO[SeveranceType];
  totalAmount: number;
  taxExemptAmount: number; // Không tính vào thu nhập chịu thuế / được miễn
  taxableIncome: number;   // Tính vào thu nhập chịu thuế từ tiền lương, tiền công
  taxAmount: number;       // Thuế tính riêng cho khoản này (khoản chịu thuế được tính cùng tiền lương)
  netAmount: number;       // Số tiền nhận (trước thuế tiền lương nếu khoản chịu thuế)

  // Chi tiết tính toán
  calculation: {
    step1: string;
    step2: string;
    step3: string;
  };

  // Ghi chú
  notes: string[];
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Xác định thuế TNCN của khoản nhận khi nghỉ việc (kỳ tính thuế 2026)
 */
export function calculateSeveranceTax(input: SeveranceInput): SeveranceResult {
  const { type, totalAmount } = input;
  const typeInfo = SEVERANCE_TYPE_INFO[type];
  const notes: string[] = [];

  switch (type) {
    case 'severance':
    case 'job_loss':
      notes.push('Phần doanh nghiệp chi cao hơn mức luật định cũng không tính vào thu nhập chịu thuế nếu được quy định trong quy chế tài chính, quy chế nội bộ, hợp đồng lao động hoặc thỏa ước lao động (NĐ 253/2026/NĐ-CP Điều 8.3.h).');
      notes.push('Thời gian đã đóng bảo hiểm thất nghiệp không được tính trợ cấp; người đủ điều kiện hưởng lương hưu không được trợ cấp thôi việc (NĐ 145/2020/NĐ-CP Điều 8).');
      break;
    case 'social_insurance_lump_sum':
      notes.push('BHXH một lần (Luật BHXH 2024 Điều 70): đủ tuổi nghỉ hưu mà chưa đủ 15 năm đóng; ra nước ngoài định cư; mắc bệnh ung thư, bại liệt, xơ gan mất bù, lao nặng, AIDS; suy giảm khả năng lao động từ 81%; người có thời gian đóng trước 01/7/2025, sau 12 tháng không tham gia BHXH và chưa đủ 20 năm đóng.');
      notes.push('Mức hưởng: 1,5 tháng lương bình quân cho mỗi năm đóng trước 2014, 2 tháng cho mỗi năm đóng từ 2014.');
      break;
    case 'voluntary_pension_lump_sum':
      notes.push('Miễn thuế không phân biệt chi trả định kỳ hay một lần, trước hay sau tuổi nghỉ hưu (NĐ 253/2026/NĐ-CP Điều 27.2).');
      break;
    case 'early_retire':
      notes.push('Khoản doanh nghiệp tự chi (không phải trợ cấp theo luật) chịu thuế như tiền lương: tổ chức trả khấu trừ khi chi trả, thuế cuối cùng tính theo biểu lũy tiến cùng thu nhập tiền lương cả năm khi quyết toán.');
      notes.push('Trợ cấp thôi việc, mất việc làm, BHXH một lần theo luật không chịu thuế: chọn đúng loại tương ứng. Lương hưu do Quỹ BHXH chi trả được miễn thuế (Luật Thuế TNCN 109/2025/QH15 Điều 4.9).');
      break;
  }
  notes.push(`Căn cứ pháp lý: ${typeInfo.legalReference}`);

  const calculation = typeInfo.taxable
    ? {
        step1: `Loại khoản: ${typeInfo.label} (không phải trợ cấp theo luật)`,
        step2: `Tính vào thu nhập chịu thuế từ tiền lương, tiền công: ${formatNumber(totalAmount)} VNĐ`,
        step3: 'Thuế TNCN tính theo biểu lũy tiến cùng tiền lương của kỳ chi trả, quyết toán cả năm',
      }
    : {
        step1: `Loại khoản: ${typeInfo.label}`,
        step2: `${type === 'voluntary_pension_lump_sum' ? 'Miễn thuế TNCN' : 'Không tính vào thu nhập chịu thuế TNCN'}: ${formatNumber(totalAmount)} VNĐ`,
        step3: 'Thuế TNCN phải nộp = 0 VNĐ',
      };

  return {
    type,
    typeInfo,
    totalAmount,
    taxExemptAmount: typeInfo.taxable ? 0 : totalAmount,
    taxableIncome: typeInfo.taxable ? totalAmount : 0,
    taxAmount: 0,
    netAmount: totalAmount,
    calculation,
    notes,
  };
}

/**
 * Thời gian tính trợ cấp (năm) = thời gian làm việc thực tế − thời gian đóng BHTN − thời gian đã được chi trả;
 * tháng lẻ ≤ 6 tính 1/2 năm, trên 6 tháng tính 1 năm (NĐ 145/2020/NĐ-CP Điều 8.3)
 */
export function getSeveranceServiceYears(
  yearsWorked: number,
  unemploymentInsuranceYears: number = 0,
  paidYears: number = 0
): number {
  const months = Math.max(0, Math.round((yearsWorked - unemploymentInsuranceYears - paidYears) * 12));
  const oddMonths = months % 12;
  return Math.floor(months / 12) + (oddMonths === 0 ? 0 : oddMonths <= 6 ? 0.5 : 1);
}

/**
 * Trợ cấp thôi việc (BLLĐ Điều 46): mỗi năm làm việc 1/2 tháng lương bình quân 6 tháng liền kề.
 * Chỉ áp dụng khi làm việc thường xuyên từ đủ 12 tháng.
 */
export function estimateSeveranceAmount(
  yearsWorked: number,
  averageSalary: number,
  unemploymentInsuranceYears: number = 0,
  paidYears: number = 0
): number {
  if (yearsWorked < 1) return 0;
  return Math.round(getSeveranceServiceYears(yearsWorked, unemploymentInsuranceYears, paidYears) * averageSalary * 0.5);
}

/**
 * Trợ cấp mất việc làm (BLLĐ Điều 47; NĐ 145/2020 Điều 8.2): mỗi năm làm việc 1 tháng lương,
 * ít nhất 2 tháng lương. Chỉ áp dụng khi làm việc thường xuyên từ đủ 12 tháng.
 */
export function estimateJobLossAmount(
  yearsWorked: number,
  averageSalary: number,
  unemploymentInsuranceYears: number = 0,
  paidYears: number = 0
): number {
  if (yearsWorked < 1) return 0;
  const years = getSeveranceServiceYears(yearsWorked, unemploymentInsuranceYears, paidYears);
  return Math.round(Math.max(years, 2) * averageSalary);
}

/**
 * Danh sách các loại khoản để hiển thị trong dropdown
 */
export function getSeveranceTypes(): Array<{ id: SeveranceType; label: string; description: string }> {
  return Object.entries(SEVERANCE_TYPE_INFO).map(([id, info]) => ({
    id: id as SeveranceType,
    label: info.label,
    description: info.description,
  }));
}
