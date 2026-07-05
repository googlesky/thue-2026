/**
 * Law Timeline - Lương ròng của người lao động qua các mốc thay đổi luật
 *
 * Ba mốc mà người làm công ăn lương cần biết:
 *   1. Năm 2025 - luật cũ (7 bậc, giảm trừ 11tr/4,4tr)
 *   2. 01/01-30/06/2026 - Luật 109/2025/QH15 (5 bậc, giảm trừ 15,5tr/6,2tr)
 *   3. Từ 01/07/2026 - lương cơ sở 2,53tr => trần đóng BHXH/BHYT 50,6tr
 *
 * Mỗi mốc tính trên cùng một mức lương gộp để thấy chênh lệch thực nhận.
 * Tái dùng toàn bộ hằng số/hàm date-aware từ taxCalculator (một nguồn sự thật).
 */

import {
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  INSURANCE_RATES,
  getMaxSocialInsuranceSalary,
  getMaxUnemploymentInsuranceSalary,
  RegionType,
} from './taxCalculator';

export type MilestoneKey = 'y2025' | 'h1-2026' | 'h2-2026';

export interface TimelineInput {
  grossMonthly: number; // Lương gộp/tháng
  dependents: number; // Số người phụ thuộc
  region?: RegionType; // Vùng lương tối thiểu (mặc định I)
}

export interface TimelinePoint {
  key: MilestoneKey;
  label: string; // Nhãn hiển thị
  lawNote: string; // Căn cứ pháp lý ngắn
  insurance: number; // BHXH + BHYT + BHTN người lao động đóng
  taxable: number; // Thu nhập tính thuế
  tax: number; // Thuế TNCN/tháng
  net: number; // Thực nhận/tháng
}

export interface TimelineResult {
  points: TimelinePoint[]; // Theo thứ tự thời gian
  deltaVs2025: number; // Net hiện hành (h2-2026) - net 2025
  deltaVsH1: number; // Net h2-2026 - net h1-2026
}

type Bracket = { min: number; max: number; rate: number; deduction: number };

// Ngày đại diện giữa từng giai đoạn (local time - xem effective-dates convention)
const MILESTONE_DATES: Record<MilestoneKey, Date> = {
  y2025: new Date(2025, 5, 15),
  'h1-2026': new Date(2026, 2, 15),
  'h2-2026': new Date(2026, 8, 15),
};

const MILESTONE_META: Record<MilestoneKey, { label: string; lawNote: string }> = {
  y2025: {
    label: 'Năm 2025',
    lawNote: 'Luật cũ · 7 bậc · giảm trừ 11tr',
  },
  'h1-2026': {
    label: '01/01 – 30/06/2026',
    lawNote: 'Luật 109/2025 · 5 bậc · giảm trừ 15,5tr',
  },
  'h2-2026': {
    label: 'Từ 01/07/2026',
    lawNote: 'Trần BHXH tăng lên 50,6tr (lương cơ sở 2,53tr)',
  },
};

/** Thuế lũy tiến theo công thức rút gọn: thuế = TNTT x thuế suất - số trừ */
function progressiveTax(taxable: number, brackets: readonly Bracket[]): number {
  if (taxable <= 0) return 0;
  for (const b of brackets) {
    if (taxable > b.min && taxable <= b.max) {
      return Math.round(taxable * b.rate - b.deduction);
    }
  }
  const top = brackets[brackets.length - 1];
  return Math.round(taxable * top.rate - top.deduction);
}

function computePoint(key: MilestoneKey, input: TimelineInput): TimelinePoint {
  const { grossMonthly, dependents } = input;
  const region: RegionType = input.region ?? 1;
  const date = MILESTONE_DATES[key];
  const isNewLaw = key !== 'y2025';

  // Bảo hiểm bắt buộc người lao động đóng (trần date-aware)
  const socialBase = Math.min(grossMonthly, getMaxSocialInsuranceSalary(date));
  const bhtnBase = Math.min(
    grossMonthly,
    getMaxUnemploymentInsuranceSalary(date)[region],
  );
  const insurance = Math.round(
    socialBase * (INSURANCE_RATES.socialInsurance + INSURANCE_RATES.healthInsurance) +
      bhtnBase * INSURANCE_RATES.unemploymentInsurance,
  );

  // Giảm trừ gia cảnh theo luật của giai đoạn
  const deductions = isNewLaw ? NEW_DEDUCTIONS : OLD_DEDUCTIONS;
  const familyDeduction = deductions.personal + dependents * deductions.dependent;

  const taxable = Math.max(0, grossMonthly - insurance - familyDeduction);
  const brackets = (isNewLaw ? NEW_TAX_BRACKETS : OLD_TAX_BRACKETS) as readonly Bracket[];
  const tax = progressiveTax(taxable, brackets);

  return {
    key,
    ...MILESTONE_META[key],
    insurance,
    taxable,
    tax,
    net: grossMonthly - insurance - tax,
  };
}

/** Tính lương ròng qua 3 mốc luật cho cùng một mức lương gộp */
export function computeLawTimeline(input: TimelineInput): TimelineResult {
  const keys: MilestoneKey[] = ['y2025', 'h1-2026', 'h2-2026'];
  const points = keys.map((k) => computePoint(k, input));
  const [y2025, h1, h2] = points;
  return {
    points,
    deltaVs2025: h2.net - y2025.net,
    deltaVsH1: h2.net - h1.net,
  };
}
