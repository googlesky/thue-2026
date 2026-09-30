/**
 * Tax Calendar Data for Vietnamese Tax System
 * Dữ liệu lịch thuế cho hệ thống thuế Việt Nam
 *
 * Ngày thực tế của mỗi mốc tính bằng lib/taxDeadlines: hạn khai, nộp, quyết toán trùng
 * thứ Bảy, Chủ nhật, ngày nghỉ lễ được dời sang ngày làm việc liền kề sau (NĐ 252/2026/NĐ-CP Điều 3.7).
 */

import { daysBetween, toWorkingDay } from '@/lib/taxDeadlines';

export type DeadlineCategory = 'settlement' | 'declaration' | 'payment' | 'registration' | 'special';
export type DeadlinePriority = 'critical' | 'important' | 'normal';
export type ApplicableTo = 'all' | 'employee' | 'business' | 'freelancer';

export interface TaxDeadline {
  id: string;
  title: string;
  description: string;
  date: { month: number; day: number }; // ngày danh nghĩa lặp hằng năm (month 0 = hằng tháng)
  category: DeadlineCategory;
  priority: DeadlinePriority;
  applicableTo: ApplicableTo;
  recurring: boolean;
  specialYear?: number; // For non-recurring events like new law effective date
  officialLink?: string;
}

export interface TaxReminder {
  deadlineId: string;
  enabled: boolean;
  daysBefore: number; // 7, 3, 1
  addedAt: string;
}

// Color mappings for categories
export const CATEGORY_COLORS: Record<DeadlineCategory, { bg: string; text: string; border: string }> = {
  settlement: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  declaration: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  payment: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  registration: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  special: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

// Priority colors
export const PRIORITY_COLORS: Record<DeadlinePriority, { dot: string; badge: string; text: string }> = {
  critical: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', text: 'text-red-600' },
  important: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-600' },
  normal: { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-600' },
};

// Category labels in Vietnamese
export const CATEGORY_LABELS: Record<DeadlineCategory, string> = {
  settlement: 'Quyết toán',
  declaration: 'Kê khai',
  payment: 'Nộp thuế',
  registration: 'Đăng ký',
  special: 'Sự kiện đặc biệt',
};

// Priority labels in Vietnamese
export const PRIORITY_LABELS: Record<DeadlinePriority, string> = {
  critical: 'Quan trọng',
  important: 'Cần lưu ý',
  normal: 'Bình thường',
};

// Applicable to labels in Vietnamese
export const APPLICABLE_TO_LABELS: Record<ApplicableTo, string> = {
  all: 'Tất cả',
  employee: 'Người làm công ăn lương',
  business: 'Doanh nghiệp',
  freelancer: 'Freelancer/Tự kinh doanh',
};

const QUARTER_DECLARATION =
  'thuế GTGT khai quý (doanh thu đến 50 tỷ đồng/năm), TNCN đã khấu trừ từ tiền lương (tổ chức khai theo quý từ 01/7/2026, TT 89/2026/TT-BTC Điều 22) và thuế hộ kinh doanh doanh thu trên 1 tỷ đồng/năm. Hạn: ngày cuối cùng của tháng đầu quý sau (NĐ 252/2026/NĐ-CP Điều 10.3).';

// Main tax deadlines data (id giữ ổn định vì nhắc nhở lưu theo id)
export const TAX_DEADLINES: TaxDeadline[] = [
  // Critical Deadlines
  {
    id: 'annual-settlement-org',
    title: 'Hạn tổ chức quyết toán thuế TNCN, TNDN năm trước',
    description: 'Tổ chức trả thu nhập quyết toán TNCN (kể cả quyết toán thay cho cá nhân ủy quyền) và quyết toán TNDN chậm nhất ngày cuối cùng của tháng 3 (NĐ 252/2026/NĐ-CP Điều 10.5.a). Cá nhân muốn ủy quyền quyết toán gửi giấy ủy quyền cho tổ chức trả thu nhập trước hạn này.',
    date: { month: 3, day: 31 },
    category: 'settlement',
    priority: 'critical',
    applicableTo: 'all',
    recurring: true,
    officialLink: 'https://thuedientu.gdt.gov.vn',
  },
  {
    id: 'annual-settlement',
    title: 'Hạn cá nhân tự quyết toán thuế TNCN năm trước',
    description: 'Cá nhân trực tiếp quyết toán thuế TNCN từ tiền lương, tiền công nộp hồ sơ và số thuế còn thiếu chậm nhất ngày cuối cùng của tháng 4 (NĐ 252/2026/NĐ-CP Điều 10.5.c). Không phải quyết toán nếu số thuế đã nộp lớn hơn số phải nộp mà không đề nghị hoàn.',
    date: { month: 4, day: 30 },
    category: 'settlement',
    priority: 'critical',
    applicableTo: 'all',
    recurring: true,
    officialLink: 'https://thuedientu.gdt.gov.vn',
  },
  {
    id: 'financial-report',
    title: 'Hạn nộp báo cáo tài chính năm',
    description: 'Doanh nghiệp nộp báo cáo tài chính năm cùng hồ sơ quyết toán thuế TNDN, chậm nhất ngày cuối cùng của tháng thứ 3 (90 ngày) kể từ khi kết thúc năm tài chính.',
    date: { month: 3, day: 31 },
    category: 'declaration',
    priority: 'important',
    applicableTo: 'business',
    recurring: true,
    officialLink: 'https://thuedientu.gdt.gov.vn',
  },
  {
    id: 'freelancer-annual-declaration',
    title: 'Hạn quyết toán TNCN của hộ, cá nhân kinh doanh',
    description: 'Hộ, cá nhân kinh doanh doanh thu trên 1 tỷ đồng/năm nộp thuế theo phương pháp thu nhập (doanh thu trừ chi phí) quyết toán TNCN chậm nhất ngày 31/3 năm sau (NĐ 68/2026/NĐ-CP Điều 8.3.c). Cá nhân chỉ có tiền công đã bị khấu trừ 10% quyết toán theo hạn của cá nhân (cuối tháng 4).',
    date: { month: 3, day: 31 },
    category: 'settlement',
    priority: 'critical',
    applicableTo: 'freelancer',
    recurring: true,
  },

  // Monthly Recurring - Declaration
  {
    id: 'monthly-vat-pit-20',
    title: 'Hạn khai thuế GTGT tháng trước',
    description: 'Doanh nghiệp doanh thu năm trên 50 tỷ đồng khai thuế GTGT theo tháng, hạn ngày 20 tháng sau (NĐ 252/2026/NĐ-CP Điều 10.2). Từ 01/7/2026, tổ chức trả thu nhập khai TNCN đã khấu trừ từ tiền lương theo quý.',
    date: { month: 0, day: 20 }, // month: 0 means every month
    category: 'declaration',
    priority: 'important',
    applicableTo: 'business',
    recurring: true,
    officialLink: 'https://thuedientu.gdt.gov.vn',
  },

  // Registration Deadlines
  {
    id: 'dependent-registration-next-year',
    title: 'Hạn đăng ký người phụ thuộc của năm tính thuế',
    description: 'Đăng ký người phụ thuộc chậm nhất ngày 31/12 để được tính giảm trừ gia cảnh cho chính năm tính thuế đó. Người phụ thuộc có thu nhập bình quân tháng không quá 3 triệu đồng (TT 87/2026/TT-BTC).',
    date: { month: 12, day: 31 },
    category: 'registration',
    priority: 'important',
    applicableTo: 'employee',
    recurring: true,
  },

  // Quarterly Deadlines
  {
    id: 'quarterly-pit-q1',
    title: 'Hạn khai thuế GTGT, TNCN quý I',
    description: `Quý I (tháng 1–3): ${QUARTER_DECLARATION}`,
    date: { month: 4, day: 30 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'business',
    recurring: true,
  },
  {
    id: 'quarterly-pit-q2',
    title: 'Hạn khai thuế GTGT, TNCN quý II',
    description: `Quý II (tháng 4–6): ${QUARTER_DECLARATION}`,
    date: { month: 7, day: 31 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'business',
    recurring: true,
  },
  {
    id: 'quarterly-pit-q3',
    title: 'Hạn khai thuế GTGT, TNCN quý III',
    description: `Quý III (tháng 7–9): ${QUARTER_DECLARATION}`,
    date: { month: 10, day: 31 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'business',
    recurring: true,
  },
  {
    id: 'quarterly-pit-q4',
    title: 'Hạn khai thuế GTGT, TNCN quý IV',
    description: `Quý IV (tháng 10–12): ${QUARTER_DECLARATION}`,
    date: { month: 1, day: 31 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'business',
    recurring: true,
  },

  // Hộ, cá nhân kinh doanh; cho thuê tài sản (NĐ 68/2026/NĐ-CP Điều 8, ngưỡng 1 tỷ theo NĐ 141/2026/NĐ-CP)
  {
    id: 'household-revenue-notice',
    title: 'Hạn thông báo doanh thu hộ kinh doanh năm trước',
    description: 'Hộ, cá nhân kinh doanh doanh thu năm từ 1 tỷ đồng trở xuống (không nộp thuế GTGT, TNCN) thông báo doanh thu thực tế phát sinh trong năm chậm nhất ngày 31/01 năm sau (NĐ 68/2026/NĐ-CP Điều 8.1).',
    date: { month: 1, day: 31 },
    category: 'declaration',
    priority: 'important',
    applicableTo: 'freelancer',
    recurring: true,
  },
  {
    id: 'rental-first-half',
    title: 'Hạn khai thuế cho thuê tài sản 6 tháng đầu năm',
    description: 'Cá nhân cho thuê bất động sản tự khai thuế, nếu chọn khai 2 lần/năm: lần 1 chậm nhất ngày 31/7 (NĐ 68/2026/NĐ-CP Điều 8.3.d). Doanh thu từ 1 tỷ đồng/năm trở xuống không phải nộp thuế.',
    date: { month: 7, day: 31 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'freelancer',
    recurring: true,
  },
  {
    id: 'rental-annual',
    title: 'Hạn khai thuế cho thuê tài sản năm trước',
    description: 'Cá nhân cho thuê bất động sản tự khai thuế: lần 2 (nếu khai 2 lần/năm) hoặc khai 1 lần cho cả năm, chậm nhất ngày 31/01 năm sau (NĐ 68/2026/NĐ-CP Điều 8.3.d).',
    date: { month: 1, day: 31 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'freelancer',
    recurring: true,
  },

  // Special Events
  {
    id: 'new-law-2026',
    title: 'Luật Thuế TNCN 109/2025/QH15 và NĐ 253/2026 có hiệu lực',
    description: 'Luật Thuế TNCN 109/2025/QH15, Luật Quản lý thuế 108/2025/QH15, NĐ 253/2026/NĐ-CP, NĐ 252/2026/NĐ-CP và TT 87/2026/TT-BTC có hiệu lực. Biểu thuế 5 bậc và giảm trừ 15,5 triệu đồng/tháng (bản thân), 6,2 triệu đồng/tháng (người phụ thuộc) đã áp dụng cho thu nhập từ tiền lương, tiền công từ kỳ tính thuế 2026 (từ 01/01/2026). Từ 01/7/2026: ngưỡng 20 triệu đồng/lần với trúng thưởng, bản quyền, thừa kế, quà tặng; khấu trừ 10% thu nhập vãng lai từ 5 triệu đồng/lần; tiền ăn giữa ca bằng tiền miễn đến 1,2 triệu đồng/tháng.',
    date: { month: 7, day: 1 },
    category: 'special',
    priority: 'critical',
    applicableTo: 'all',
    recurring: false,
    specialYear: 2026,
    officialLink: 'https://thuedientu.gdt.gov.vn',
  },
];

// Hạn khai, nộp, quyết toán được dời nếu trùng ngày nghỉ; mốc đăng ký và sự kiện giữ nguyên ngày
const shiftsOnHoliday = (deadline: TaxDeadline) =>
  deadline.category !== 'registration' && deadline.category !== 'special';

/**
 * Các ngày thực tế của mốc trong năm danh nghĩa `year`
 */
function occurrencesInYear(deadline: TaxDeadline, year: number): Date[] {
  if (!deadline.recurring) {
    return deadline.specialYear === year
      ? [new Date(year, deadline.date.month - 1, deadline.date.day)]
      : [];
  }
  const months = deadline.date.month === 0
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    : [deadline.date.month];
  return months.map(m => {
    const nominal = new Date(year, m - 1, deadline.date.day);
    return shiftsOnHoliday(deadline) ? toWorkingDay(nominal) : nominal;
  });
}

/**
 * Get deadlines falling on a specific date (ngày thực tế, đã dời ngày nghỉ)
 */
export function getDeadlinesForDate(year: number, month: number, day: number): TaxDeadline[] {
  const target = new Date(year, month - 1, day);
  return TAX_DEADLINES.filter(deadline =>
    [year - 1, year].some(y => occurrencesInYear(deadline, y).some(d => daysBetween(d, target) === 0))
  );
}

/**
 * Lần diễn ra tiếp theo của mốc, tính cả hôm nay (null nếu sự kiện một lần đã qua)
 */
export function getNextOccurrence(deadline: TaxDeadline, fromDate: Date = new Date()): Date | null {
  const y = fromDate.getFullYear();
  return [y - 1, y, y + 1]
    .flatMap(year => occurrencesInYear(deadline, year))
    .filter(d => daysBetween(fromDate, d) >= 0)
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
}

/**
 * Calculate days until a deadline (0 = hôm nay; null nếu sự kiện đã qua)
 */
export function getDaysUntilDeadline(deadline: TaxDeadline, today: Date = new Date()): number | null {
  const next = getNextOccurrence(deadline, today);
  return next ? daysBetween(today, next) : null;
}

/**
 * Get upcoming deadlines within a number of days
 */
export function getUpcomingDeadlines(days: number = 30, filter?: ApplicableTo, today: Date = new Date()): TaxDeadline[] {
  return TAX_DEADLINES
    .filter(d => !filter || filter === 'all' || d.applicableTo === 'all' || d.applicableTo === filter)
    .map(deadline => ({ deadline, daysUntil: getDaysUntilDeadline(deadline, today) }))
    .filter((item): item is { deadline: TaxDeadline; daysUntil: number } =>
      item.daysUntil !== null && item.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .map(item => item.deadline);
}

// Ngày hiển thị/xuất lịch: lần diễn ra tiếp theo, hoặc ngày của sự kiện một lần đã qua
function displayDate(deadline: TaxDeadline, today: Date): Date {
  return getNextOccurrence(deadline, today)
    ?? new Date(deadline.specialYear ?? today.getFullYear(), deadline.date.month - 1, deadline.date.day);
}

const pad = (n: number) => String(n).padStart(2, '0');
const compactDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nextDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

/**
 * Format date for display (lần diễn ra tiếp theo)
 */
export function formatDeadlineDate(deadline: TaxDeadline, today: Date = new Date()): string {
  if (deadline.date.month === 0) {
    return `Ngày ${deadline.date.day} hàng tháng`;
  }
  const date = displayDate(deadline, today);
  const text = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  return date.getDate() !== deadline.date.day
    ? `${text} (dời từ ${deadline.date.day}/${deadline.date.month})`
    : text;
}

// Escape TEXT theo RFC 5545
const icsText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/**
 * Generate ICS calendar file content — sự kiện cả ngày vào lần diễn ra tiếp theo.
 * Không dùng RRULE: ngày thực tế thay đổi theo lịch nghỉ từng năm (VD 30/4 luôn là ngày lễ).
 */
export function generateICSContent(deadline: TaxDeadline, today: Date = new Date()): string {
  const date = displayDate(deadline, today);
  const createdDate = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Tinh Thue TNCN 2026//Tax Calendar//VI
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART;VALUE=DATE:${compactDate(date)}
DTEND;VALUE=DATE:${compactDate(nextDay(date))}
DTSTAMP:${createdDate}
UID:${deadline.id}-${compactDate(date)}@thue.1devops.io
SUMMARY:${icsText(deadline.title)}
DESCRIPTION:${icsText(deadline.description)}
CATEGORIES:${icsText(CATEGORY_LABELS[deadline.category])}
PRIORITY:${deadline.priority === 'critical' ? 1 : deadline.priority === 'important' ? 5 : 9}
STATUS:CONFIRMED
TRANSP:TRANSPARENT
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:${icsText(deadline.title)}
TRIGGER:-P7D
END:VALARM
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:${icsText(deadline.title)}
TRIGGER:-P1D
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

/**
 * Generate Google Calendar URL (lần diễn ra tiếp theo)
 */
export function generateGoogleCalendarUrl(deadline: TaxDeadline, today: Date = new Date()): string {
  const date = displayDate(deadline, today);

  // Google Calendar needs end date to be exclusive (next day for all-day events)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: deadline.title,
    dates: `${compactDate(date)}/${compactDate(nextDay(date))}`,
    details: deadline.description,
    ctz: 'Asia/Ho_Chi_Minh',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL (lần diễn ra tiếp theo; ngày local, không qua toISOString)
 */
export function generateOutlookCalendarUrl(deadline: TaxDeadline, today: Date = new Date()): string {
  const date = displayDate(deadline, today);

  const params = new URLSearchParams({
    subject: deadline.title,
    body: deadline.description,
    startdt: isoDate(date),
    enddt: isoDate(nextDay(date)),
    allday: 'true',
    path: '/calendar/action/compose',
    rru: 'addevent',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Local storage key for reminders
 */
export const REMINDERS_STORAGE_KEY = 'tax-calendar-reminders';

/**
 * Get reminders from localStorage
 */
export function getStoredReminders(): TaxReminder[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(REMINDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save reminders to localStorage
 */
export function saveReminders(reminders: TaxReminder[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch {
    console.error('Failed to save reminders to localStorage');
  }
}

/**
 * Check if a deadline has an active reminder
 */
export function hasActiveReminder(deadlineId: string, reminders: TaxReminder[]): boolean {
  return reminders.some(r => r.deadlineId === deadlineId && r.enabled);
}

/**
 * Get reminders that are due (within daysBefore of the deadline)
 */
export function getDueReminders(reminders: TaxReminder[]): Array<{ reminder: TaxReminder; deadline: TaxDeadline; daysUntil: number }> {
  const dueReminders: Array<{ reminder: TaxReminder; deadline: TaxDeadline; daysUntil: number }> = [];

  reminders.forEach(reminder => {
    if (!reminder.enabled) return;

    const deadline = TAX_DEADLINES.find(d => d.id === reminder.deadlineId);
    if (!deadline) return;

    const daysUntil = getDaysUntilDeadline(deadline);
    if (daysUntil === null) return;

    if (daysUntil <= reminder.daysBefore && daysUntil >= 0) {
      dueReminders.push({ reminder, deadline, daysUntil });
    }
  });

  // Sort by days until (closest first)
  dueReminders.sort((a, b) => a.daysUntil - b.daysUntil);

  return dueReminders;
}

/**
 * Get critical deadlines within X days
 */
export function getCriticalDeadlinesWithinDays(days: number = 30): Array<{ deadline: TaxDeadline; daysUntil: number }> {
  const criticalDeadlines: Array<{ deadline: TaxDeadline; daysUntil: number }> = [];

  TAX_DEADLINES.forEach(deadline => {
    if (deadline.priority !== 'critical') return;

    const daysUntil = getDaysUntilDeadline(deadline);
    if (daysUntil === null || daysUntil < 0 || daysUntil > days) return;

    criticalDeadlines.push({ deadline, daysUntil });
  });

  // Sort by days until
  criticalDeadlines.sort((a, b) => a.daysUntil - b.daysUntil);

  return criticalDeadlines;
}
