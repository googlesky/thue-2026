/**
 * Tax Deadline Manager
 * Quản lý và nhắc nhở các hạn nộp thuế
 *
 * Căn cứ pháp lý:
 * - Luật Quản lý thuế 108/2025/QH15 (hiệu lực 01/7/2026)
 * - Nghị định 252/2026/NĐ-CP (Điều 10: thời hạn nộp hồ sơ khai thuế; Điều 3.7: hạn trùng ngày nghỉ)
 * - Thông tư 89/2026/TT-BTC (Điều 22: tổ chức trả thu nhập khai TNCN đã khấu trừ theo quý)
 * - Nghị định 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP): hộ, cá nhân kinh doanh, cho thuê tài sản
 *
 * Ngày hạn lấy từ taxDeadlines (đã dời sang ngày làm việc nếu trùng ngày nghỉ).
 */

import { annualDeadline, daysBetween, quarterDeadline, toWorkingDay } from './taxDeadlines';

// Deadline types
export type DeadlineType =
  | 'pit_annual'           // Cá nhân tự quyết toán TNCN năm
  | 'pit_quarterly'        // Cá nhân tự khai TNCN quý
  | 'vat_monthly'          // Khai thuế GTGT tháng
  | 'vat_quarterly'        // Khai thuế GTGT quý + TNCN đã khấu trừ quý
  | 'cit_quarterly'        // Tạm nộp thuế TNDN quý
  | 'cit_annual'           // Quyết toán TNDN, TNCN của tổ chức
  | 'household_quarterly'  // Khai thuế hộ kinh doanh (doanh thu > 1 tỷ)
  | 'property_transfer'    // Thuế chuyển nhượng BĐS
  | 'rental_quarterly'     // Khai thuế cho thuê tài sản (2 lần/năm)
  | 'dependent_registration' // Đăng ký người phụ thuộc
  | 'custom';              // Deadline tùy chỉnh

// Deadline status
export type DeadlineStatus = 'upcoming' | 'due_soon' | 'overdue' | 'completed';

// Deadline configuration
export interface DeadlineConfig {
  name: string;
  description: string;
  legalBasis: string;
  penalty: string;
}

const LATE_FILING = 'nộp hồ sơ trễ bị phạt theo NĐ 125/2020/NĐ-CP Điều 13';

// Predefined deadline configurations
export const DEADLINE_CONFIGS: Record<DeadlineType, DeadlineConfig> = {
  pit_annual: {
    name: 'Quyết toán thuế TNCN năm (cá nhân)',
    description: 'Cá nhân tự quyết toán: nộp tờ khai 02/QTT-TNCN và số thuế còn thiếu',
    legalBasis: 'NĐ 252/2026/NĐ-CP Điều 10.5.c',
    penalty: `tiền chậm nộp 0,03%/ngày; ${LATE_FILING} (cá nhân bằng 1/2 mức tổ chức), không phạt nếu quyết toán được hoàn thuế`,
  },
  pit_quarterly: {
    name: 'Khai thuế TNCN quý (cá nhân tự khai)',
    description: 'Cá nhân nhận lương từ nước ngoài, tổ chức quốc tế chưa khấu trừ thuế tự khai theo quý',
    legalBasis: 'TT 89/2026/TT-BTC Điều 22; NĐ 252/2026/NĐ-CP Điều 10.3',
    penalty: `tiền chậm nộp 0,03%/ngày; ${LATE_FILING}`,
  },
  vat_monthly: {
    name: 'Khai thuế GTGT tháng',
    description: 'Doanh nghiệp doanh thu năm trên 50 tỷ đồng khai GTGT theo tháng',
    legalBasis: 'NĐ 252/2026/NĐ-CP Điều 10.2',
    penalty: `tiền chậm nộp 0,03%/ngày; ${LATE_FILING}`,
  },
  vat_quarterly: {
    name: 'Khai thuế GTGT, TNCN quý',
    description: 'Khai GTGT quý (doanh thu đến 50 tỷ/năm) và TNCN đã khấu trừ từ tiền lương (khai quý từ 01/7/2026)',
    legalBasis: 'NĐ 252/2026/NĐ-CP Điều 10.3; TT 89/2026/TT-BTC Điều 22',
    penalty: `tiền chậm nộp 0,03%/ngày; ${LATE_FILING}`,
  },
  cit_quarterly: {
    name: 'Tạm nộp thuế TNDN quý',
    description: 'Tạm nộp thuế TNDN theo quý; tổng 4 quý không thấp hơn 80% số quyết toán',
    legalBasis: 'NĐ 252/2026/NĐ-CP Điều 24',
    penalty: 'tiền chậm nộp 0,03%/ngày trên số tạm nộp thiếu',
  },
  cit_annual: {
    name: 'Quyết toán thuế TNDN, TNCN năm (tổ chức)',
    description: 'Quyết toán TNDN và quyết toán TNCN của tổ chức trả thu nhập (kể cả quyết toán thay cá nhân ủy quyền)',
    legalBasis: 'NĐ 252/2026/NĐ-CP Điều 10.5.a',
    penalty: `tiền chậm nộp 0,03%/ngày; ${LATE_FILING}`,
  },
  household_quarterly: {
    name: 'Khai thuế hộ kinh doanh (doanh thu > 1 tỷ)',
    description: 'Hộ, cá nhân kinh doanh doanh thu trên 1 tỷ đồng/năm khai quý (trên 50 tỷ khai tháng); từ 1 tỷ trở xuống chỉ thông báo doanh thu trước 31/01 năm sau',
    legalBasis: 'NĐ 68/2026/NĐ-CP Điều 8 (ngưỡng 1 tỷ theo NĐ 141/2026/NĐ-CP)',
    penalty: `tiền chậm nộp 0,03%/ngày; ${LATE_FILING}`,
  },
  property_transfer: {
    name: 'Thuế chuyển nhượng BĐS',
    description: 'Đã có Giấy chứng nhận: khai, nộp trong thời hạn đăng ký biến động (30 ngày); nhà hình thành trong tương lai: ngày thứ 10 kể từ ngày hợp đồng có hiệu lực',
    legalBasis: 'NĐ 252/2026/NĐ-CP Điều 10.8',
    penalty: `tiền chậm nộp 0,03%/ngày; ${LATE_FILING}`,
  },
  rental_quarterly: {
    name: 'Khai thuế cho thuê tài sản',
    description: 'Cá nhân cho thuê bất động sản tự khai 2 lần/năm (31/7 và 31/01 năm sau) hoặc 1 lần (31/01 năm sau); doanh thu từ 1 tỷ đồng/năm trở xuống không phải nộp thuế',
    legalBasis: 'NĐ 68/2026/NĐ-CP Điều 8.3.d',
    penalty: `tiền chậm nộp 0,03%/ngày; ${LATE_FILING}`,
  },
  dependent_registration: {
    name: 'Đăng ký người phụ thuộc',
    description: 'Đăng ký người phụ thuộc để được giảm trừ gia cảnh cho chính năm tính thuế',
    legalBasis: 'TT 87/2026/TT-BTC',
    penalty: 'không được giảm trừ nếu không đăng ký',
  },
  custom: {
    name: 'Deadline tùy chỉnh',
    description: 'Deadline do người dùng tự tạo',
    legalBasis: '',
    penalty: '',
  },
};

// Single deadline entry
export interface TaxDeadline {
  id: string;
  type: DeadlineType;
  name: string;
  description?: string;
  dueDate: Date;
  status: DeadlineStatus;
  amount?: number; // Estimated tax amount
  notes?: string;
  isCustom: boolean;
}

// Manager input
export interface DeadlineManagerInput {
  year: number;
  includePersonal: boolean;
  includeBusiness: boolean;
  customDeadlines: TaxDeadline[];
  completedIds?: ReadonlySet<string>;
  today?: Date;
}

// Manager result
export interface DeadlineManagerResult {
  allDeadlines: TaxDeadline[];
  upcomingDeadlines: TaxDeadline[];
  dueSoonDeadlines: TaxDeadline[]; // Within 7 days
  overdueDeadlines: TaxDeadline[];
  completedDeadlines: TaxDeadline[];
  nextDeadline: TaxDeadline | null;
  summary: {
    total: number;
    upcoming: number;
    dueSoon: number;
    overdue: number;
    completed: number;
  };
}

/**
 * Generate unique ID (deadline tùy chỉnh)
 */
export function generateDeadlineId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Số ngày từ hôm nay đến hạn (theo ngày local; âm = quá hạn)
 */
export function getDaysUntilDeadline(dueDate: Date, today: Date = new Date()): number {
  return daysBetween(today, dueDate);
}

/**
 * Trạng thái theo số ngày còn lại
 */
export function getDeadlineStatus(daysUntil: number): DeadlineStatus {
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 7) return 'due_soon';
  return 'upcoming';
}

/**
 * Các hạn chuẩn của năm `year` (ID xác định theo loại + kỳ để giữ trạng thái hoàn thành)
 */
export function generateStandardDeadlines(
  year: number,
  includePersonal: boolean,
  includeBusiness: boolean
): TaxDeadline[] {
  const make = (type: DeadlineType, period: string, name: string, dueDate: Date): TaxDeadline => ({
    id: `${type}-${period}`,
    type,
    name,
    description: DEADLINE_CONFIGS[type].description,
    dueDate,
    status: 'upcoming',
    isCustom: false,
  });
  const quarters = [1, 2, 3, 4] as const;
  const deadlines: TaxDeadline[] = [];

  if (includePersonal) {
    deadlines.push(
      make('pit_annual', `${year - 1}`, `Quyết toán thuế TNCN năm ${year - 1} (cá nhân tự quyết toán)`, annualDeadline(year - 1, 'individual')),
      make('dependent_registration', `${year}`, `Đăng ký người phụ thuộc năm ${year}`, new Date(year, 11, 31)),
      make('rental_quarterly', `${year}-H1`, `Khai thuế cho thuê tài sản 6 tháng đầu ${year}`, toWorkingDay(new Date(year, 6, 31))),
      make('rental_quarterly', `${year}-H2`, `Khai thuế cho thuê tài sản 6 tháng cuối ${year} (hoặc cả năm)`, toWorkingDay(new Date(year + 1, 0, 31))),
    );
  }

  if (includeBusiness) {
    for (const q of quarters) {
      deadlines.push(make('vat_quarterly', `${year}-Q${q}`, `Khai thuế GTGT, TNCN quý ${q}/${year}`, quarterDeadline(year, q)));
    }
    for (const q of quarters) {
      deadlines.push(make('cit_quarterly', `${year}-Q${q}`, `Tạm nộp thuế TNDN quý ${q}/${year}`, quarterDeadline(year, q)));
    }
    deadlines.push(make('cit_annual', `${year - 1}`, `Quyết toán thuế TNDN, TNCN năm ${year - 1} (tổ chức)`, annualDeadline(year - 1, 'org')));
    for (const q of quarters) {
      deadlines.push(make('household_quarterly', `${year}-Q${q}`, `Khai thuế hộ kinh doanh quý ${q}/${year}`, quarterDeadline(year, q)));
    }
  }

  return deadlines;
}

/**
 * Main calculation function
 */
export function calculateDeadlineManager(input: DeadlineManagerInput): DeadlineManagerResult {
  const { year, includePersonal, includeBusiness, customDeadlines, completedIds, today = new Date() } = input;

  const allDeadlines = [...generateStandardDeadlines(year, includePersonal, includeBusiness), ...customDeadlines]
    .map(d => ({
      ...d,
      status: completedIds?.has(d.id) ? 'completed' as const : getDeadlineStatus(getDaysUntilDeadline(d.dueDate, today)),
    }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const byStatus = (status: DeadlineStatus) => allDeadlines.filter(d => d.status === status);
  const upcomingDeadlines = byStatus('upcoming');
  const dueSoonDeadlines = byStatus('due_soon');
  const overdueDeadlines = byStatus('overdue');
  const completedDeadlines = byStatus('completed');

  return {
    allDeadlines,
    upcomingDeadlines,
    dueSoonDeadlines,
    overdueDeadlines,
    completedDeadlines,
    // Hạn gần nhất chưa hoàn thành, chưa quá hạn
    nextDeadline: allDeadlines.find(d => d.status === 'due_soon' || d.status === 'upcoming') ?? null,
    summary: {
      total: allDeadlines.length,
      upcoming: upcomingDeadlines.length,
      dueSoon: dueSoonDeadlines.length,
      overdue: overdueDeadlines.length,
      completed: completedDeadlines.length,
    },
  };
}

/**
 * Format short date
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get status label
 */
export function getStatusLabel(status: DeadlineStatus): string {
  switch (status) {
    case 'overdue':
      return 'Quá hạn';
    case 'due_soon':
      return 'Sắp đến hạn';
    case 'upcoming':
      return 'Sắp tới';
    case 'completed':
      return 'Đã hoàn thành';
    default:
      return '';
  }
}

/**
 * Get days text
 */
export function getDaysText(daysUntil: number): string {
  if (daysUntil < 0) {
    return `Quá hạn ${Math.abs(daysUntil)} ngày`;
  }
  if (daysUntil === 0) {
    return 'Hôm nay';
  }
  if (daysUntil === 1) {
    return 'Ngày mai';
  }
  return `Còn ${daysUntil} ngày`;
}
