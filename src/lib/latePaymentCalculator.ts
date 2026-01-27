/**
 * Late Payment Interest Calculator
 * Tính lãi chậm nộp thuế theo quy định pháp luật Việt Nam
 *
 * Căn cứ pháp lý:
 * - Luật Quản lý thuế số 38/2019/QH14
 * - Nghị định 125/2020/NĐ-CP về xử phạt vi phạm hành chính về thuế
 * - Thông tư 80/2021/TT-BTC hướng dẫn thi hành Luật Quản lý thuế
 *
 * Lãi suất chậm nộp: 0.03%/ngày (tương đương ~10.95%/năm)
 */

/**
 * Loại thuế - dùng để xác định deadline mặc định
 */
export type TaxType =
  | 'annual_pit'           // Quyết toán TNCN năm - 31/3 năm sau
  | 'quarterly_pit'        // TNCN hàng quý - 30 tháng đầu quý sau
  | 'monthly_vat'          // VAT hàng tháng - 20 tháng sau
  | 'quarterly_vat'        // VAT hàng quý - 30 tháng đầu quý sau
  | 'property_transfer'    // Chuyển nhượng BĐS - 10 ngày từ ngày ký HĐ
  | 'rental_income'        // Thu nhập cho thuê - theo kỳ kê khai
  | 'household_business'   // Hộ kinh doanh - 30 tháng đầu quý sau
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
 * Danh sách các loại thuế hỗ trợ
 */
export const TAX_TYPES: TaxTypeInfo[] = [
  {
    id: 'annual_pit',
    name: 'Quyết toán TNCN năm',
    description: 'Thuế thu nhập cá nhân quyết toán cuối năm',
    defaultDeadlineDescription: 'Ngày 31/3 năm sau năm tính thuế',
  },
  {
    id: 'quarterly_pit',
    name: 'TNCN hàng quý',
    description: 'Thuế TNCN tạm nộp hàng quý',
    defaultDeadlineDescription: 'Ngày 30 của tháng đầu quý sau',
  },
  {
    id: 'monthly_vat',
    name: 'VAT hàng tháng',
    description: 'Thuế giá trị gia tăng kê khai tháng',
    defaultDeadlineDescription: 'Ngày 20 của tháng sau',
  },
  {
    id: 'quarterly_vat',
    name: 'VAT hàng quý',
    description: 'Thuế giá trị gia tăng kê khai quý',
    defaultDeadlineDescription: 'Ngày 30 của tháng đầu quý sau',
  },
  {
    id: 'property_transfer',
    name: 'Chuyển nhượng BĐS',
    description: 'Thuế từ chuyển nhượng bất động sản',
    defaultDeadlineDescription: '10 ngày từ ngày ký hợp đồng',
  },
  {
    id: 'rental_income',
    name: 'Thu nhập cho thuê',
    description: 'Thuế từ hoạt động cho thuê tài sản',
    defaultDeadlineDescription: 'Theo kỳ kê khai đã đăng ký',
  },
  {
    id: 'household_business',
    name: 'Hộ kinh doanh',
    description: 'Thuế hộ kinh doanh nộp theo quý',
    defaultDeadlineDescription: 'Ngày 30 của tháng đầu quý sau',
  },
  {
    id: 'other',
    name: 'Loại thuế khác',
    description: 'Các loại thuế khác',
    defaultDeadlineDescription: 'Theo quy định cụ thể',
  },
];

/**
 * Lãi suất chậm nộp theo ngày
 * Quy định: 0.03%/ngày
 */
export const INTEREST_RATE_PER_DAY = 0.0003; // 0.03%

/**
 * Lãi suất quy đổi theo năm (để hiển thị)
 */
export const INTEREST_RATE_PER_YEAR = INTEREST_RATE_PER_DAY * 365; // ~10.95%

/**
 * Input để tính lãi chậm nộp
 */
export interface LatePaymentInput {
  taxType: TaxType;
  taxAmount: number;      // Số tiền thuế phải nộp (VNĐ)
  dueDate: Date;          // Ngày hết hạn nộp
  paymentDate: Date;      // Ngày dự kiến nộp (hoặc ngày thực nộp)
}

/**
 * Kết quả tính lãi chậm nộp
 */
export interface LatePaymentResult {
  isLate: boolean;              // Có chậm nộp không
  daysLate: number;             // Số ngày chậm
  interestRatePerDay: number;   // Lãi suất/ngày (0.0003)
  interestRatePerYear: number;  // Lãi suất/năm (~10.95%)
  interestAmount: number;       // Tiền lãi phải trả (VNĐ)
  totalAmount: number;          // Tổng tiền phải nộp (thuế + lãi)
  taxAmount: number;            // Số tiền thuế gốc
  dailyInterest: number;        // Lãi mỗi ngày (VNĐ)
  warning?: string;             // Cảnh báo nếu có
  legalNote?: string;           // Ghi chú pháp lý
}

/**
 * Tính số ngày giữa 2 ngày (không tính ngày đầu, tính ngày cuối)
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Reset về 00:00:00 để tính chính xác số ngày
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Tính lãi chậm nộp thuế
 *
 * Công thức: Tiền lãi = Số thuế × 0.03% × Số ngày chậm
 */
export function calculateLatePayment(input: LatePaymentInput): LatePaymentResult {
  const { taxAmount, dueDate, paymentDate } = input;

  // Tính số ngày chậm
  const daysLate = daysBetween(dueDate, paymentDate);

  // Nếu không chậm hoặc nộp đúng hạn
  if (daysLate <= 0) {
    return {
      isLate: false,
      daysLate: 0,
      interestRatePerDay: INTEREST_RATE_PER_DAY,
      interestRatePerYear: INTEREST_RATE_PER_YEAR,
      interestAmount: 0,
      totalAmount: taxAmount,
      taxAmount,
      dailyInterest: 0,
      legalNote: 'Nộp thuế đúng hạn, không phát sinh lãi chậm nộp.',
    };
  }

  // Tính lãi chậm nộp
  const interestAmount = Math.round(taxAmount * INTEREST_RATE_PER_DAY * daysLate);
  const dailyInterest = Math.round(taxAmount * INTEREST_RATE_PER_DAY);
  const totalAmount = taxAmount + interestAmount;

  // Xác định mức độ cảnh báo
  let warning: string | undefined;
  let legalNote: string | undefined;

  if (daysLate > 90) {
    warning = 'Chậm nộp trên 90 ngày có thể bị xử phạt hành chính nặng và cưỡng chế thuế.';
    legalNote = 'Theo Nghị định 125/2020/NĐ-CP, chậm nộp thuế quá 90 ngày có thể bị phạt từ 1-3 lần số tiền thuế trốn nếu cố ý.';
  } else if (daysLate > 30) {
    warning = 'Chậm nộp trên 30 ngày, nên nộp sớm để tránh tích lũy lãi.';
    legalNote = 'Lãi chậm nộp được tính liên tục cho đến ngày thực nộp. Cơ quan thuế có thể áp dụng biện pháp cưỡng chế.';
  } else {
    legalNote = 'Lãi chậm nộp 0.03%/ngày theo Điều 59 Luật Quản lý thuế 2019.';
  }

  return {
    isLate: true,
    daysLate,
    interestRatePerDay: INTEREST_RATE_PER_DAY,
    interestRatePerYear: INTEREST_RATE_PER_YEAR,
    interestAmount,
    totalAmount,
    taxAmount,
    dailyInterest,
    warning,
    legalNote,
  };
}

/**
 * Lấy ngày hết hạn mặc định theo loại thuế
 */
export function getDefaultDueDate(taxType: TaxType, referenceYear?: number): Date {
  const year = referenceYear || new Date().getFullYear();
  const now = new Date();

  switch (taxType) {
    case 'annual_pit':
      // Quyết toán TNCN: 31/3 năm sau
      return new Date(year + 1, 2, 31); // Tháng 3 (index 2), ngày 31

    case 'quarterly_pit':
    case 'quarterly_vat':
    case 'household_business': {
      // Xác định quý hiện tại và deadline
      const currentMonth = now.getMonth();
      const currentQuarter = Math.floor(currentMonth / 3);
      // Deadline là ngày 30 của tháng đầu quý sau
      const deadlineMonth = (currentQuarter + 1) * 3;
      return new Date(year, deadlineMonth, 30);
    }

    case 'monthly_vat': {
      // VAT hàng tháng: ngày 20 tháng sau
      const nextMonth = now.getMonth() + 1;
      const deadlineYear = nextMonth > 11 ? year + 1 : year;
      const deadlineMonth = nextMonth % 12;
      return new Date(deadlineYear, deadlineMonth, 20);
    }

    case 'property_transfer':
      // Chuyển nhượng BĐS: 10 ngày từ ngày ký HĐ
      // Trả về ngày hiện tại + 10 ngày làm mặc định
      const transferDeadline = new Date(now);
      transferDeadline.setDate(transferDeadline.getDate() + 10);
      return transferDeadline;

    case 'rental_income':
    case 'other':
    default:
      // Mặc định: cuối tháng hiện tại
      const lastDayOfMonth = new Date(year, now.getMonth() + 1, 0);
      return lastDayOfMonth;
  }
}

/**
 * Format số tiền VNĐ
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format phần trăm
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format ngày tháng
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Tạo bảng lãi chậm nộp theo các mốc thời gian
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
    else if (days === 45) label = '1.5 tháng';
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
 * Thông tin về các deadline thuế quan trọng trong năm
 */
export interface TaxDeadline {
  name: string;
  description: string;
  date: Date;
  taxType: TaxType;
}

export function getUpcomingDeadlines(year?: number): TaxDeadline[] {
  const y = year || new Date().getFullYear();
  const now = new Date();

  const allDeadlines: TaxDeadline[] = [
    // Quyết toán TNCN năm trước
    {
      name: 'Quyết toán TNCN ' + (y - 1),
      description: 'Hạn nộp quyết toán thuế TNCN năm ' + (y - 1),
      date: new Date(y, 2, 31), // 31/3
      taxType: 'annual_pit',
    },
    // VAT/TNCN Quý 1
    {
      name: 'Thuế Quý 1/' + y,
      description: 'Hạn nộp thuế quý 1',
      date: new Date(y, 3, 30), // 30/4
      taxType: 'quarterly_pit',
    },
    // VAT/TNCN Quý 2
    {
      name: 'Thuế Quý 2/' + y,
      description: 'Hạn nộp thuế quý 2',
      date: new Date(y, 6, 30), // 30/7
      taxType: 'quarterly_pit',
    },
    // VAT/TNCN Quý 3
    {
      name: 'Thuế Quý 3/' + y,
      description: 'Hạn nộp thuế quý 3',
      date: new Date(y, 9, 30), // 30/10
      taxType: 'quarterly_pit',
    },
    // VAT/TNCN Quý 4
    {
      name: 'Thuế Quý 4/' + y,
      description: 'Hạn nộp thuế quý 4',
      date: new Date(y + 1, 0, 30), // 30/1 năm sau
      taxType: 'quarterly_pit',
    },
  ];

  // Lọc các deadline sắp tới (trong vòng 6 tháng)
  const sixMonthsLater = new Date(now);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  return allDeadlines.filter(d => d.date >= now && d.date <= sixMonthsLater);
}
