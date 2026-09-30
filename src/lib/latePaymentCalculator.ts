/**
 * Tính tiền chậm nộp thuế
 *
 * Căn cứ pháp lý:
 * - Luật Quản lý thuế số 108/2025/QH15 (Điều 16: tiền chậm nộp 0,03%/ngày; Điều 48: cưỡng chế)
 * - Nghị định 252/2026/NĐ-CP (Điều 26.1.a: thời gian tính tiền chậm nộp; Điều 3.7: hạn trùng ngày nghỉ)
 * - Nghị định 125/2020/NĐ-CP (sửa đổi bởi NĐ 102/2021/NĐ-CP, NĐ 310/2025/NĐ-CP): xử phạt vi phạm hành chính về thuế
 *
 * Chậm nộp TIỀN thuế không bị phạt tiền, chỉ phải nộp tiền chậm nộp.
 */

import {
  annualDeadline,
  daysBetween,
  daysLate as countLateDays,
  quarterDeadline,
  toWorkingDay,
} from './taxDeadlines';

/**
 * Loại thuế - dùng để hiển thị hạn nộp theo quy định
 */
export type TaxType =
  | 'annual_pit'           // Quyết toán TNCN năm - cá nhân tự quyết toán: cuối tháng 4 năm sau
  | 'quarterly_pit'        // TNCN khai quý - cuối tháng đầu quý sau
  | 'monthly_vat'          // GTGT khai tháng - ngày 20 tháng sau
  | 'quarterly_vat'        // GTGT khai quý - cuối tháng đầu quý sau
  | 'property_transfer'    // Chuyển nhượng BĐS - hạn đăng ký biến động / ngày thứ 10
  | 'rental_income'        // Cho thuê tài sản - 31/7 và 31/01 năm sau (hoặc 1 lần 31/01)
  | 'household_business'   // Hộ, cá nhân kinh doanh doanh thu trên 1 tỷ - khai quý/tháng
  | 'other';               // Khác

/**
 * Thông tin loại thuế
 */
export interface TaxTypeInfo {
  id: TaxType;
  name: string;
  description: string;
  defaultDeadlineDescription: string;
}

/**
 * Danh sách các loại thuế hỗ trợ (hạn nộp theo NĐ 252/2026/NĐ-CP Điều 10, NĐ 68/2026/NĐ-CP Điều 8.3)
 */
export const TAX_TYPES: TaxTypeInfo[] = [
  {
    id: 'annual_pit',
    name: 'Quyết toán TNCN năm',
    description: 'Số thuế TNCN còn phải nộp khi quyết toán năm',
    defaultDeadlineDescription: 'Cá nhân tự quyết toán: ngày cuối cùng của tháng 4 năm sau (tổ chức quyết toán thay: 31/3)',
  },
  {
    id: 'quarterly_pit',
    name: 'TNCN khai quý',
    description: 'Thuế TNCN khai theo quý (tổ chức khấu trừ từ tiền lương, cá nhân nhận lương từ nước ngoài)',
    defaultDeadlineDescription: 'Ngày cuối cùng của tháng đầu quý sau',
  },
  {
    id: 'monthly_vat',
    name: 'GTGT khai tháng',
    description: 'Thuế giá trị gia tăng khai theo tháng',
    defaultDeadlineDescription: 'Ngày 20 của tháng sau',
  },
  {
    id: 'quarterly_vat',
    name: 'GTGT khai quý',
    description: 'Thuế giá trị gia tăng khai theo quý',
    defaultDeadlineDescription: 'Ngày cuối cùng của tháng đầu quý sau',
  },
  {
    id: 'property_transfer',
    name: 'Chuyển nhượng BĐS',
    description: 'Thuế TNCN từ chuyển nhượng bất động sản',
    defaultDeadlineDescription: 'Đã có Giấy chứng nhận: cùng hạn đăng ký biến động (30 ngày); nhà hình thành trong tương lai: ngày thứ 10 kể từ ngày hợp đồng có hiệu lực',
  },
  {
    id: 'rental_income',
    name: 'Cho thuê tài sản',
    description: 'Thuế từ hoạt động cho thuê bất động sản, tài sản',
    defaultDeadlineDescription: 'Khai 2 lần/năm: 31/7 và 31/01 năm sau; hoặc khai 1 lần: 31/01 năm sau',
  },
  {
    id: 'household_business',
    name: 'Hộ kinh doanh',
    description: 'Hộ, cá nhân kinh doanh doanh thu trên 1 tỷ đồng/năm',
    defaultDeadlineDescription: 'Khai quý: cuối tháng đầu quý sau; khai tháng (doanh thu trên 50 tỷ): ngày 20 tháng sau',
  },
  {
    id: 'other',
    name: 'Loại thuế khác',
    description: 'Các loại thuế khác',
    defaultDeadlineDescription: 'Theo quy định cụ thể',
  },
];

/**
 * Mức tính tiền chậm nộp theo ngày: 0,03%/ngày (Luật Quản lý thuế 108/2025 Điều 16.2.a)
 */
export const INTEREST_RATE_PER_DAY = 0.0003;

/**
 * Quy đổi theo năm (để hiển thị)
 */
export const INTEREST_RATE_PER_YEAR = INTEREST_RATE_PER_DAY * 365; // ~10,95%

/**
 * Input để tính tiền chậm nộp
 */
export interface LatePaymentInput {
  taxType: TaxType;
  taxAmount: number;      // Số tiền thuế phải nộp (VNĐ)
  dueDate: Date;          // Hạn nộp theo quy định (chưa dời ngày nghỉ)
  paymentDate: Date;      // Ngày dự kiến nộp (hoặc ngày thực nộp)
}

/**
 * Kết quả tính tiền chậm nộp
 */
export interface LatePaymentResult {
  isLate: boolean;              // Có phát sinh tiền chậm nộp không
  daysLate: number;             // Số ngày tính tiền chậm nộp
  effectiveDueDate: Date;       // Hạn thực tế (đã dời nếu trùng ngày nghỉ)
  interestRatePerDay: number;   // 0,0003
  interestRatePerYear: number;  // ~10,95%
  interestAmount: number;       // Tiền chậm nộp (VNĐ)
  totalAmount: number;          // Tổng phải nộp (thuế + tiền chậm nộp)
  taxAmount: number;            // Số tiền thuế gốc
  dailyInterest: number;        // Tiền chậm nộp mỗi ngày (VNĐ)
  warning?: string;             // Cảnh báo nếu có
  legalNote?: string;           // Ghi chú pháp lý
}

/**
 * Tính tiền chậm nộp thuế
 *
 * Công thức: Tiền chậm nộp = Số thuế × 0,03% × Số ngày tính tiền chậm nộp
 */
export function calculateLatePayment(input: LatePaymentInput): LatePaymentResult {
  const { taxAmount, dueDate, paymentDate } = input;
  const effectiveDueDate = toWorkingDay(dueDate);
  const daysLate = countLateDays(dueDate, paymentDate);
  const base = {
    daysLate,
    effectiveDueDate,
    interestRatePerDay: INTEREST_RATE_PER_DAY,
    interestRatePerYear: INTEREST_RATE_PER_YEAR,
    taxAmount,
  };

  if (daysLate === 0) {
    return {
      ...base,
      isLate: false,
      interestAmount: 0,
      totalAmount: taxAmount,
      dailyInterest: 0,
      legalNote: daysBetween(effectiveDueDate, paymentDate) > 0
        ? 'Nộp ngày liền sau hạn: số ngày tính tiền chậm nộp bằng 0 (tính từ ngày tiếp theo hạn nộp đến ngày liền trước ngày nộp tiền).'
        : 'Nộp trong hạn, không phát sinh tiền chậm nộp.',
    };
  }

  const interestAmount = Math.round(taxAmount * INTEREST_RATE_PER_DAY * daysLate);
  const dailyInterest = Math.round(taxAmount * INTEREST_RATE_PER_DAY);
  const daysOverdue = daysBetween(effectiveDueDate, paymentDate);

  let warning: string | undefined;
  let legalNote: string;
  if (daysOverdue > 90) {
    warning = 'Nợ thuế quá 90 ngày kể từ hết hạn nộp: bị cưỡng chế (Luật Quản lý thuế 108/2025 Điều 48) và có thể bị công khai thông tin (NĐ 252/2026/NĐ-CP Điều 4).';
    legalNote = 'Chậm nộp tiền thuế không bị phạt tiền, chỉ phải nộp tiền chậm nộp. Phạt từ 1 đến 3 lần số thuế chỉ áp dụng khi có hành vi trốn thuế (Luật Quản lý thuế 108/2025 Điều 44, Điều 45).';
  } else if (daysOverdue > 30) {
    warning = 'Quá 30 ngày chưa nộp: cơ quan thuế thông báo số tiền thuế nợ và số ngày chậm nộp (Luật Quản lý thuế 108/2025 Điều 16.4). Nên nộp sớm vì tiền chậm nộp tính liên tục.';
    legalNote = 'Tiền chậm nộp tính liên tục đến ngày liền trước ngày nộp tiền vào ngân sách nhà nước.';
  } else {
    legalNote = 'Tiền chậm nộp 0,03%/ngày (Luật Quản lý thuế 108/2025 Điều 16.2.a); số ngày tính từ ngày tiếp theo hạn nộp đến ngày liền trước ngày nộp tiền (NĐ 252/2026/NĐ-CP Điều 26.1.a).';
  }

  return {
    ...base,
    isLate: true,
    interestAmount,
    totalAmount: taxAmount + interestAmount,
    dailyInterest,
    warning,
    legalNote,
  };
}

/**
 * Format phần trăm kiểu Việt Nam (dấu phẩy thập phân)
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Bảng tiền chậm nộp theo các mốc thời gian
 */
export interface InterestMilestone {
  days: number;
  label: string;
  interestAmount: number;
  totalAmount: number;
  interestPercent: number;
}

export function generateInterestMilestones(taxAmount: number): InterestMilestone[] {
  const milestones = [7, 15, 30, 45, 60, 90, 180, 365];

  return milestones.map(days => {
    const interestAmount = Math.round(taxAmount * INTEREST_RATE_PER_DAY * days);
    const interestPercent = INTEREST_RATE_PER_DAY * days;

    let label: string;
    if (days === 7) label = '1 tuần';
    else if (days === 15) label = '2 tuần';
    else if (days === 30) label = '1 tháng';
    else if (days === 45) label = '1,5 tháng';
    else if (days === 60) label = '2 tháng';
    else if (days === 90) label = '3 tháng';
    else if (days === 180) label = '6 tháng';
    else label = '1 năm';

    return {
      days,
      label,
      interestAmount,
      totalAmount: taxAmount + interestAmount,
      interestPercent,
    };
  });
}

/**
 * Hạn nộp thuế quan trọng
 */
export interface TaxDeadline {
  name: string;
  description: string;
  date: Date;
  taxType: TaxType;
}

/**
 * Các hạn nộp trong 6 tháng tới (kể cả hôm nay), đã dời nếu trùng ngày nghỉ
 */
export function getUpcomingDeadlines(today: Date = new Date()): TaxDeadline[] {
  const y = today.getFullYear();
  const all: TaxDeadline[] = [];

  for (const year of [y - 1, y, y + 1]) {
    all.push(
      {
        name: `Quyết toán thuế năm ${year} (tổ chức)`,
        description: 'Tổ chức trả thu nhập quyết toán TNCN (kể cả quyết toán thay), quyết toán TNDN',
        date: annualDeadline(year, 'org'),
        taxType: 'other',
      },
      {
        name: `Quyết toán TNCN năm ${year} (cá nhân)`,
        description: 'Cá nhân tự quyết toán: nộp hồ sơ và số thuế còn thiếu',
        date: annualDeadline(year, 'individual'),
        taxType: 'annual_pit',
      },
      {
        name: `Cho thuê tài sản 6 tháng đầu ${year}`,
        description: 'Khai lần 1 nếu chọn khai 2 lần/năm',
        date: toWorkingDay(new Date(year, 6, 31)),
        taxType: 'rental_income',
      },
      {
        name: `Cho thuê tài sản năm ${year}`,
        description: 'Khai lần 2, hoặc khai 1 lần cho cả năm',
        date: toWorkingDay(new Date(year + 1, 0, 31)),
        taxType: 'rental_income',
      },
    );
    for (const q of [1, 2, 3, 4] as const) {
      all.push({
        name: `Thuế quý ${q}/${year}`,
        description: 'Khai, nộp thuế quý (TNCN đã khấu trừ, GTGT, hộ kinh doanh)',
        date: quarterDeadline(year, q),
        taxType: 'quarterly_pit',
      });
    }
  }

  const end = new Date(y, today.getMonth() + 6, today.getDate());
  return all
    .filter(d => daysBetween(today, d.date) >= 0 && daysBetween(d.date, end) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
