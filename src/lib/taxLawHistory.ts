/**
 * Tax Law History - Timeline and comparison data for Vietnam PIT law changes
 */

export interface TaxLawMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'enacted' | 'effective' | 'change' | 'proposal';
  changes?: string[];
}

export interface TaxBracketHistorical {
  bracket: number;
  rate: number;
  minIncome: number;
  maxIncome: number | null;
}

export interface TaxLawPeriod {
  id: string;
  name: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  personalDeduction: number;
  dependentDeduction: number;
  brackets: TaxBracketHistorical[];
}

// Key milestones in Vietnam PIT law history
export const TAX_LAW_MILESTONES: TaxLawMilestone[] = [
  {
    id: '2007-enact',
    date: '21/11/2007',
    title: 'Luật Thuế TNCN được thông qua',
    description: 'Quốc hội thông qua Luật Thuế Thu nhập cá nhân số 04/2007/QH12',
    type: 'enacted',
    changes: [
      'Thay thế Pháp lệnh Thuế TNCN 2001',
      'Áp dụng biểu thuế lũy tiến 7 bậc',
      'Giảm trừ bản thân: 4 triệu đồng/tháng',
      'Giảm trừ người phụ thuộc: 1.6 triệu đồng/tháng',
    ],
  },
  {
    id: '2009-effective',
    date: '01/01/2009',
    title: 'Luật Thuế TNCN có hiệu lực',
    description: 'Luật Thuế TNCN 2007 chính thức có hiệu lực thi hành',
    type: 'effective',
  },
  {
    id: '2013-amendment',
    date: '22/11/2012',
    title: 'Sửa đổi Luật Thuế TNCN lần 1',
    description: 'Quốc hội thông qua Luật sửa đổi, bổ sung số 26/2012/QH13',
    type: 'enacted',
    changes: [
      'Tăng giảm trừ bản thân: 4 → 9 triệu đồng/tháng',
      'Tăng giảm trừ người phụ thuộc: 1.6 → 3.6 triệu đồng/tháng',
      'Có hiệu lực từ 01/07/2013',
    ],
  },
  {
    id: '2020-deduction',
    date: '02/06/2020',
    title: 'Điều chỉnh mức giảm trừ gia cảnh',
    description: 'Nghị quyết số 954/2020/UBTVQH14 điều chỉnh mức giảm trừ gia cảnh',
    type: 'effective',
    changes: [
      'Tăng giảm trừ bản thân: 9 → 11 triệu đồng/tháng',
      'Tăng giảm trừ người phụ thuộc: 3.6 → 4.4 triệu đồng/tháng',
      'Áp dụng từ kỳ tính thuế năm 2020',
    ],
  },
  {
    id: '2025-enact',
    date: '10/12/2025',
    title: 'Luật Thuế TNCN sửa đổi được thông qua',
    description: 'Quốc hội thông qua Luật sửa đổi, bổ sung Luật Thuế Thu nhập cá nhân',
    type: 'enacted',
    changes: [
      'Giảm từ 7 bậc thuế xuống còn 5 bậc',
      'Tăng giảm trừ bản thân: 11 → 15.5 triệu đồng/tháng',
      'Tăng giảm trừ người phụ thuộc: 4.4 → 6.2 triệu đồng/tháng',
      'Bỏ bậc thuế 15% và 25%',
      'Mở rộng các mức thu nhập chịu thuế ở mỗi bậc',
    ],
  },
  {
    id: '2026-effective-temp',
    date: '01/01/2026',
    title: 'Luật mới có hiệu lực (tạm)',
    description: 'Luật Thuế TNCN sửa đổi có hiệu lực nhưng vẫn áp dụng biểu thuế cũ đến 30/06/2026',
    type: 'effective',
    changes: [
      'Giai đoạn chuyển tiếp',
      'Vẫn sử dụng biểu thuế 7 bậc và mức giảm trừ cũ',
    ],
  },
  {
    id: '2026-effective-full',
    date: '01/07/2026',
    title: 'Áp dụng đầy đủ luật mới',
    description: 'Chính thức áp dụng biểu thuế 5 bậc và mức giảm trừ mới',
    type: 'effective',
    changes: [
      'Biểu thuế 5 bậc mới có hiệu lực',
      'Áp dụng mức giảm trừ mới: 15.5 triệu + 6.2 triệu/NPT',
      'Người nộp thuế được hưởng lợi ngay từ kỳ tính thuế tháng 7/2026',
    ],
  },
];

// Historical tax law periods
export const TAX_LAW_PERIODS: TaxLawPeriod[] = [
  {
    id: '2009-2013',
    name: 'Luật 2007 (gốc)',
    effectiveFrom: '01/01/2009',
    effectiveTo: '30/06/2013',
    personalDeduction: 4_000_000,
    dependentDeduction: 1_600_000,
    brackets: [
      { bracket: 1, rate: 5, minIncome: 0, maxIncome: 5_000_000 },
      { bracket: 2, rate: 10, minIncome: 5_000_000, maxIncome: 10_000_000 },
      { bracket: 3, rate: 15, minIncome: 10_000_000, maxIncome: 18_000_000 },
      { bracket: 4, rate: 20, minIncome: 18_000_000, maxIncome: 32_000_000 },
      { bracket: 5, rate: 25, minIncome: 32_000_000, maxIncome: 52_000_000 },
      { bracket: 6, rate: 30, minIncome: 52_000_000, maxIncome: 80_000_000 },
      { bracket: 7, rate: 35, minIncome: 80_000_000, maxIncome: null },
    ],
  },
  {
    id: '2013-2020',
    name: 'Luật sửa đổi 2012',
    effectiveFrom: '01/07/2013',
    effectiveTo: '01/06/2020',
    personalDeduction: 9_000_000,
    dependentDeduction: 3_600_000,
    brackets: [
      { bracket: 1, rate: 5, minIncome: 0, maxIncome: 5_000_000 },
      { bracket: 2, rate: 10, minIncome: 5_000_000, maxIncome: 10_000_000 },
      { bracket: 3, rate: 15, minIncome: 10_000_000, maxIncome: 18_000_000 },
      { bracket: 4, rate: 20, minIncome: 18_000_000, maxIncome: 32_000_000 },
      { bracket: 5, rate: 25, minIncome: 32_000_000, maxIncome: 52_000_000 },
      { bracket: 6, rate: 30, minIncome: 52_000_000, maxIncome: 80_000_000 },
      { bracket: 7, rate: 35, minIncome: 80_000_000, maxIncome: null },
    ],
  },
  {
    id: '2020-2026',
    name: 'Điều chỉnh 2020',
    effectiveFrom: '02/06/2020',
    effectiveTo: '30/06/2026',
    personalDeduction: 11_000_000,
    dependentDeduction: 4_400_000,
    brackets: [
      { bracket: 1, rate: 5, minIncome: 0, maxIncome: 5_000_000 },
      { bracket: 2, rate: 10, minIncome: 5_000_000, maxIncome: 10_000_000 },
      { bracket: 3, rate: 15, minIncome: 10_000_000, maxIncome: 18_000_000 },
      { bracket: 4, rate: 20, minIncome: 18_000_000, maxIncome: 32_000_000 },
      { bracket: 5, rate: 25, minIncome: 32_000_000, maxIncome: 52_000_000 },
      { bracket: 6, rate: 30, minIncome: 52_000_000, maxIncome: 80_000_000 },
      { bracket: 7, rate: 35, minIncome: 80_000_000, maxIncome: null },
    ],
  },
  {
    id: '2026-new',
    name: 'Luật mới 2026',
    effectiveFrom: '01/07/2026',
    effectiveTo: null,
    personalDeduction: 15_500_000,
    dependentDeduction: 6_200_000,
    brackets: [
      { bracket: 1, rate: 5, minIncome: 0, maxIncome: 10_000_000 },
      { bracket: 2, rate: 10, minIncome: 10_000_000, maxIncome: 30_000_000 },
      { bracket: 3, rate: 20, minIncome: 30_000_000, maxIncome: 60_000_000 },
      { bracket: 4, rate: 30, minIncome: 60_000_000, maxIncome: 100_000_000 },
      { bracket: 5, rate: 35, minIncome: 100_000_000, maxIncome: null },
    ],
  },
];

// Key comparison metrics
export interface DeductionComparison {
  period: string;
  personalDeduction: number;
  dependentDeduction: number;
  personalPercentChange: number | null;
  dependentPercentChange: number | null;
}

export const DEDUCTION_COMPARISON: DeductionComparison[] = [
  {
    period: '2009-2013',
    personalDeduction: 4_000_000,
    dependentDeduction: 1_600_000,
    personalPercentChange: null,
    dependentPercentChange: null,
  },
  {
    period: '2013-2020',
    personalDeduction: 9_000_000,
    dependentDeduction: 3_600_000,
    personalPercentChange: 125,
    dependentPercentChange: 125,
  },
  {
    period: '2020-06/2026',
    personalDeduction: 11_000_000,
    dependentDeduction: 4_400_000,
    personalPercentChange: 22.2,
    dependentPercentChange: 22.2,
  },
  {
    period: '07/2026-',
    personalDeduction: 15_500_000,
    dependentDeduction: 6_200_000,
    personalPercentChange: 40.9,
    dependentPercentChange: 40.9,
  },
];

// Key highlights for 2026 reform
export const REFORM_2026_HIGHLIGHTS = {
  brackets: {
    old: 7,
    new: 5,
    removed: ['15%', '25%'],
  },
  deductions: {
    personal: {
      old: 11_000_000,
      new: 15_500_000,
      increase: 4_500_000,
      percentChange: 40.9,
    },
    dependent: {
      old: 4_400_000,
      new: 6_200_000,
      increase: 1_800_000,
      percentChange: 40.9,
    },
  },
  effectiveDates: {
    enacted: '10/12/2025',
    transitionStart: '01/01/2026',
    fullEffective: '01/07/2026',
  },
  benefits: [
    'Giảm số bậc thuế giúp đơn giản hóa tính toán',
    'Tăng mức giảm trừ theo kịp lạm phát',
    'Người có thu nhập trung bình được hưởng lợi nhiều nhất',
    'Gánh nặng thuế giảm đáng kể cho người có phụ thuộc',
  ],
};

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

// Get applicable tax period for a given date
export function getTaxPeriodForDate(date: Date): TaxLawPeriod | null {
  const dateStr = date.toISOString().slice(0, 10);

  for (const period of TAX_LAW_PERIODS) {
    const from = new Date(period.effectiveFrom.split('/').reverse().join('-'));
    const to = period.effectiveTo
      ? new Date(period.effectiveTo.split('/').reverse().join('-'))
      : new Date('2099-12-31');

    if (date >= from && date <= to) {
      return period;
    }
  }

  return null;
}

// Compare two periods
export function comparePeriods(oldPeriodId: string, newPeriodId: string) {
  const oldPeriod = TAX_LAW_PERIODS.find(p => p.id === oldPeriodId);
  const newPeriod = TAX_LAW_PERIODS.find(p => p.id === newPeriodId);

  if (!oldPeriod || !newPeriod) return null;

  return {
    personalDeductionChange: newPeriod.personalDeduction - oldPeriod.personalDeduction,
    dependentDeductionChange: newPeriod.dependentDeduction - oldPeriod.dependentDeduction,
    bracketCountChange: newPeriod.brackets.length - oldPeriod.brackets.length,
    oldPeriod,
    newPeriod,
  };
}
