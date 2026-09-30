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

// Key milestones in Vietnam PIT law history (theo thứ tự thời gian)
export const TAX_LAW_MILESTONES: TaxLawMilestone[] = [
  {
    id: '2007-enact',
    date: '21/11/2007',
    title: 'Luật Thuế TNCN được thông qua',
    description: 'Quốc hội thông qua Luật Thuế Thu nhập cá nhân số 04/2007/QH12',
    type: 'enacted',
    changes: [
      'Thay thế Pháp lệnh Thuế thu nhập đối với người có thu nhập cao',
      'Áp dụng biểu thuế lũy tiến từng phần 7 bậc (5% – 35%)',
      'Giảm trừ bản thân: 4 triệu đồng/tháng',
      'Giảm trừ người phụ thuộc: 1,6 triệu đồng/tháng',
    ],
  },
  {
    id: '2009-effective',
    date: '01/01/2009',
    title: 'Luật Thuế TNCN có hiệu lực',
    description: 'Luật Thuế TNCN 04/2007/QH12 chính thức có hiệu lực thi hành',
    type: 'effective',
  },
  {
    id: '2013-amendment',
    date: '22/11/2012',
    title: 'Sửa đổi Luật Thuế TNCN lần 1',
    description: 'Quốc hội thông qua Luật sửa đổi, bổ sung số 26/2012/QH13, hiệu lực từ 01/7/2013',
    type: 'enacted',
    changes: [
      'Tăng giảm trừ bản thân: 4 → 9 triệu đồng/tháng',
      'Tăng giảm trừ người phụ thuộc: 1,6 → 3,6 triệu đồng/tháng',
      'Quyết toán năm 2013 tách 2 giai đoạn: 6 tháng đầu theo mức cũ, 6 tháng cuối theo mức mới',
    ],
  },
  {
    id: '2020-deduction',
    date: '02/06/2020',
    title: 'Nghị quyết 954/2020/UBTVQH14',
    description: 'Điều chỉnh mức giảm trừ gia cảnh; hiệu lực 01/7/2020, áp dụng từ kỳ tính thuế năm 2020',
    type: 'enacted',
    changes: [
      'Tăng giảm trừ bản thân: 9 → 11 triệu đồng/tháng',
      'Tăng giảm trừ người phụ thuộc: 3,6 → 4,4 triệu đồng/tháng',
      'Tính cho cả năm 2020 khi quyết toán (từ 01/01/2020)',
    ],
  },
  {
    id: '2025-deduction',
    date: '17/10/2025',
    title: 'Nghị quyết 110/2025/UBTVQH15',
    description: 'Điều chỉnh mức giảm trừ gia cảnh, áp dụng từ kỳ tính thuế năm 2026',
    type: 'enacted',
    changes: [
      'Tăng giảm trừ bản thân: 11 → 15,5 triệu đồng/tháng',
      'Tăng giảm trừ người phụ thuộc: 4,4 → 6,2 triệu đồng/tháng',
      'Áp dụng từ kỳ tính thuế năm 2026',
    ],
  },
  {
    id: '2025-enact',
    date: '10/12/2025',
    title: 'Luật Thuế TNCN số 109/2025/QH15 được thông qua',
    description: 'Quốc hội thông qua Luật Thuế thu nhập cá nhân mới thay thế Luật 04/2007/QH12; hiệu lực 01/7/2026, riêng thu nhập từ tiền lương, tiền công và kinh doanh của cá nhân cư trú áp dụng từ kỳ tính thuế 2026',
    type: 'enacted',
    changes: [
      'Biểu thuế 5 bậc: 5%, 10%, 20%, 30%, 35% (Điều 9)',
      'Bỏ bậc thuế 15% và 25%',
      'Giảm trừ gia cảnh 15,5 triệu/6,2 triệu đồng/tháng (Điều 10)',
      'Ngưỡng chịu thuế từng lần (trúng thưởng, bản quyền, thừa kế, quà tặng): 10 → 20 triệu đồng',
      'Chuyển nhượng tài sản số, vàng miếng: 0,1% giá chuyển nhượng',
    ],
  },
  {
    id: '2026-effective',
    date: '01/01/2026',
    title: 'Kỳ tính thuế 2026: áp dụng biểu thuế và giảm trừ mới',
    description: 'Biểu thuế 5 bậc và giảm trừ 15,5 triệu/6,2 triệu áp dụng cho thu nhập từ tiền lương, tiền công năm 2026 (Luật 109/2025/QH15 Điều 29.2; NQ 110/2025/UBTVQH15)',
    type: 'effective',
    changes: [
      'Biểu thuế lũy tiến 5 bậc tính cho cả năm 2026 khi quyết toán',
      'Giảm trừ 15,5 triệu đồng/tháng cho bản thân, 6,2 triệu đồng/tháng cho mỗi người phụ thuộc',
      'Lương tối thiểu vùng mới theo Nghị định 293/2025/NĐ-CP',
    ],
  },
  {
    id: '2026-law-09',
    date: '24/04/2026',
    title: 'Luật 09/2026/QH16',
    description: 'Sửa đổi Luật Thuế TNCN, GTGT, TNDN, TTĐB: ngưỡng doanh thu không phải nộp thuế của hộ, cá nhân kinh doanh do Chính phủ quy định (áp dụng từ 01/01/2026)',
    type: 'enacted',
  },
  {
    id: '2026-nd141',
    date: '29/04/2026',
    title: 'Nghị định 141/2026/NĐ-CP',
    description: 'Ngưỡng doanh thu 1 tỷ đồng/năm: hộ, cá nhân kinh doanh (kể cả cho thuê tài sản) có doanh thu từ mức này trở xuống không nộp thuế GTGT, TNCN; áp dụng kỳ tính thuế 2026',
    type: 'change',
  },
  {
    id: '2026-gold-tax',
    date: '30/06/2026',
    title: 'Vàng miếng: luật quy định 0,1% nhưng chưa thu',
    description: 'Luật 109/2025/QH15 quy định thuế 0,1% giá chuyển nhượng vàng miếng và giao Chính phủ quy định ngưỡng, thời điểm áp dụng. Bộ Tài chính (30/6/2026): chưa thu từ 01/7/2026, đang xây dựng nghị định riêng.',
    type: 'proposal',
  },
  {
    id: '2026-july-effective',
    date: '01/07/2026',
    title: 'Luật Thuế TNCN 109/2025, NĐ 253/2026 và TT 87/2026 có hiệu lực',
    description: 'Luật Thuế TNCN 109/2025/QH15 và Luật Quản lý thuế 108/2025/QH15 có hiệu lực; NĐ 253/2026/NĐ-CP thay NĐ 65/2013, TT 87/2026/TT-BTC thay TT 111/2013',
    type: 'effective',
    changes: [
      'Ngưỡng từng lần phát sinh 20 triệu đồng (trúng thưởng, bản quyền, nhượng quyền, thừa kế, quà tặng)',
      'Khấu trừ 10% thu nhập vãng lai từ 5 triệu đồng/lần (trước 2 triệu)',
      'Tiền ăn giữa ca bằng tiền: miễn đến 1,2 triệu đồng/tháng',
      'Giảm trừ chi y tế (tối đa 23 triệu/năm), giáo dục (tối đa 24 triệu/năm); hưu trí bổ sung, tự nguyện, bảo hiểm nhân thọ tối đa 3 triệu/tháng — áp dụng cho kỳ tính thuế 2026',
      'Người phụ thuộc: thu nhập bình quân tháng không quá 3 triệu đồng',
    ],
  },
];

// Historical tax law periods
export const TAX_LAW_PERIODS: TaxLawPeriod[] = [
  {
    id: '2009-2013',
    name: 'Luật 04/2007/QH12',
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
    name: 'Luật sửa đổi 26/2012/QH13',
    effectiveFrom: '01/07/2013',
    effectiveTo: '31/12/2019',
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
    id: '2020-2025',
    name: 'NQ 954/2020/UBTVQH14',
    effectiveFrom: '01/01/2020',
    effectiveTo: '31/12/2025',
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
    name: 'Luật Thuế TNCN 109/2025/QH15 (5 bậc)',
    effectiveFrom: '01/01/2026',
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
    period: '01/2009 – 06/2013',
    personalDeduction: 4_000_000,
    dependentDeduction: 1_600_000,
    personalPercentChange: null,
    dependentPercentChange: null,
  },
  {
    period: '07/2013 – 12/2019',
    personalDeduction: 9_000_000,
    dependentDeduction: 3_600_000,
    personalPercentChange: 125,
    dependentPercentChange: 125,
  },
  {
    period: '01/2020 – 12/2025',
    personalDeduction: 11_000_000,
    dependentDeduction: 4_400_000,
    personalPercentChange: 22.2,
    dependentPercentChange: 22.2,
  },
  {
    period: 'Từ 01/2026',
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
  legalBasis: {
    deductions: 'Nghị quyết 110/2025/UBTVQH15; Luật Thuế TNCN 109/2025/QH15 Điều 10',
    taxBrackets: 'Luật Thuế TNCN 109/2025/QH15 Điều 9; áp dụng từ kỳ tính thuế 2026 theo Điều 29.2',
  },
  benefits: [
    'Giảm số bậc thuế từ 7 xuống 5, đơn giản hóa tính toán',
    'Tăng mức giảm trừ gần 41% theo kịp lạm phát',
    'Người có thu nhập trung bình được hưởng lợi nhiều nhất',
    'Gánh nặng thuế giảm đáng kể cho người có phụ thuộc',
    'Ngưỡng chịu thuế tăng lên: không phải đóng thuế nếu lương dưới 17 triệu/tháng (không có NPT)',
  ],
};

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

// Số thập phân kiểu Việt Nam (dấu phẩy)
export const formatDecimal = (value: number, digits = 1) => value.toFixed(digits).replace('.', ',');
