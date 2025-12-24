/**
 * Tax Calendar Data for Vietnamese Tax System
 * Dữ liệu lịch thuế cho hệ thống thuế Việt Nam
 */

export type DeadlineCategory = 'settlement' | 'declaration' | 'payment' | 'registration' | 'special';
export type DeadlinePriority = 'critical' | 'important' | 'normal';
export type ApplicableTo = 'all' | 'employee' | 'business' | 'freelancer';

export interface TaxDeadline {
  id: string;
  title: string;
  description: string;
  date: { month: number; day: number }; // recurring yearly
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

// Main tax deadlines data
export const TAX_DEADLINES: TaxDeadline[] = [
  // Critical Deadlines
  {
    id: 'annual-settlement',
    title: 'Hạn quyết toán thuế TNCN năm trước',
    description: 'Hạn cuối cùng để nộp hồ sơ quyết toán thuế thu nhập cá nhân cho năm trước. Áp dụng cho cá nhân tự quyết toán thuế.',
    date: { month: 3, day: 31 },
    category: 'settlement',
    priority: 'critical',
    applicableTo: 'all',
    recurring: true,
    officialLink: 'https://thuedientu.gdt.gov.vn',
  },
  {
    id: 'financial-report',
    title: 'Hạn nộp báo cáo tài chính',
    description: 'Hạn nộp báo cáo tài chính năm trước cho doanh nghiệp.',
    date: { month: 4, day: 30 },
    category: 'declaration',
    priority: 'important',
    applicableTo: 'business',
    recurring: true,
    officialLink: 'https://thuedientu.gdt.gov.vn',
  },

  // Monthly Recurring - Declaration
  {
    id: 'monthly-vat-pit-20',
    title: 'Hạn nộp tờ khai thuế GTGT, TNCN tháng trước',
    description: 'Hạn nộp tờ khai thuế giá trị gia tăng (GTGT) và thuế thu nhập cá nhân (TNCN) cho tháng trước. Áp dụng cho doanh nghiệp và người nộp thuế có nghĩa vụ kê khai hàng tháng.',
    date: { month: 0, day: 20 }, // month: 0 means every month
    category: 'declaration',
    priority: 'important',
    applicableTo: 'business',
    recurring: true,
    officialLink: 'https://thuedientu.gdt.gov.vn',
  },

  // Registration Deadlines
  {
    id: 'dependent-registration-h1',
    title: 'Hạn đăng ký giảm trừ gia cảnh nửa đầu năm',
    description: 'Hạn đăng ký hoặc điều chỉnh thông tin người phụ thuộc để được giảm trừ gia cảnh trong nửa đầu năm.',
    date: { month: 6, day: 30 },
    category: 'registration',
    priority: 'important',
    applicableTo: 'employee',
    recurring: true,
  },
  {
    id: 'dependent-registration-next-year',
    title: 'Hạn đăng ký người phụ thuộc cho năm sau',
    description: 'Hạn cuối để đăng ký người phụ thuộc mới hoặc điều chỉnh thông tin để áp dụng giảm trừ gia cảnh cho năm tiếp theo.',
    date: { month: 12, day: 31 },
    category: 'registration',
    priority: 'important',
    applicableTo: 'employee',
    recurring: true,
  },

  // Quarterly Deadlines
  {
    id: 'quarterly-pit-q1',
    title: 'Hạn kê khai thuế TNCN quý I',
    description: 'Hạn nộp tờ khai thuế TNCN quý I (tháng 1-3) cho đối tượng kê khai theo quý.',
    date: { month: 4, day: 30 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'business',
    recurring: true,
  },
  {
    id: 'quarterly-pit-q2',
    title: 'Hạn kê khai thuế TNCN quý II',
    description: 'Hạn nộp tờ khai thuế TNCN quý II (tháng 4-6) cho đối tượng kê khai theo quý.',
    date: { month: 7, day: 30 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'business',
    recurring: true,
  },
  {
    id: 'quarterly-pit-q3',
    title: 'Hạn kê khai thuế TNCN quý III',
    description: 'Hạn nộp tờ khai thuế TNCN quý III (tháng 7-9) cho đối tượng kê khai theo quý.',
    date: { month: 10, day: 30 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'business',
    recurring: true,
  },
  {
    id: 'quarterly-pit-q4',
    title: 'Hạn kê khai thuế TNCN quý IV',
    description: 'Hạn nộp tờ khai thuế TNCN quý IV (tháng 10-12) cho đối tượng kê khai theo quý.',
    date: { month: 1, day: 30 },
    category: 'declaration',
    priority: 'normal',
    applicableTo: 'business',
    recurring: true,
  },

  // Payment Deadlines
  {
    id: 'annual-tax-payment',
    title: 'Hạn nộp thuế TNCN quyết toán',
    description: 'Hạn nộp số thuế TNCN còn thiếu theo quyết toán năm trước.',
    date: { month: 3, day: 31 },
    category: 'payment',
    priority: 'critical',
    applicableTo: 'all',
    recurring: true,
  },

  // Special Events
  {
    id: 'new-law-2026',
    title: 'Luật thuế TNCN mới có hiệu lực',
    description: 'Luật thuế thu nhập cá nhân sửa đổi chính thức có hiệu lực. Giảm từ 7 bậc xuống 5 bậc thuế, tăng mức giảm trừ gia cảnh lên 15.5 triệu VND/tháng cho bản thân và 6.2 triệu VND/tháng cho người phụ thuộc.',
    date: { month: 7, day: 1 },
    category: 'special',
    priority: 'critical',
    applicableTo: 'all',
    recurring: false,
    specialYear: 2026,
    officialLink: 'https://thuedientu.gdt.gov.vn',
  },

  // Freelancer specific
  {
    id: 'freelancer-annual-declaration',
    title: 'Hạn kê khai thuế TNCN năm cho freelancer',
    description: 'Hạn kê khai thuế TNCN năm cho cá nhân tự kinh doanh, freelancer không qua tổ chức chi trả.',
    date: { month: 3, day: 31 },
    category: 'declaration',
    priority: 'critical',
    applicableTo: 'freelancer',
    recurring: true,
  },

  // Insurance related
  {
    id: 'bhxh-adjustment',
    title: 'Hạn điều chỉnh mức đóng BHXH',
    description: 'Hạn để đề nghị điều chỉnh mức lương đóng bảo hiểm xã hội cho năm tiếp theo (nếu có thay đổi).',
    date: { month: 12, day: 15 },
    category: 'registration',
    priority: 'normal',
    applicableTo: 'employee',
    recurring: true,
  },
];

/**
 * Get deadlines for a specific month and year
 */
export function getDeadlinesForMonth(year: number, month: number): TaxDeadline[] {
  return TAX_DEADLINES.filter(deadline => {
    // For monthly recurring (month: 0), always include
    if (deadline.date.month === 0) {
      return true;
    }

    // Check if it matches the month
    if (deadline.date.month !== month) {
      return false;
    }

    // For non-recurring events, check the year
    if (!deadline.recurring && deadline.specialYear) {
      return deadline.specialYear === year;
    }

    return true;
  });
}

/**
 * Get deadlines for a specific date
 */
export function getDeadlinesForDate(year: number, month: number, day: number): TaxDeadline[] {
  return getDeadlinesForMonth(year, month).filter(deadline => deadline.date.day === day);
}

/**
 * Get upcoming deadlines within a number of days
 */
export function getUpcomingDeadlines(days: number = 30, filter?: ApplicableTo): TaxDeadline[] {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + days);

  const upcomingDeadlines: Array<{ deadline: TaxDeadline; date: Date }> = [];

  TAX_DEADLINES.forEach(deadline => {
    // Apply filter if specified
    if (filter && filter !== 'all' && deadline.applicableTo !== 'all' && deadline.applicableTo !== filter) {
      return;
    }

    // Get the next occurrence of this deadline
    const nextDate = getNextOccurrence(deadline, today);

    if (nextDate && nextDate <= endDate) {
      upcomingDeadlines.push({ deadline, date: nextDate });
    }
  });

  // Sort by date
  upcomingDeadlines.sort((a, b) => a.date.getTime() - b.date.getTime());

  return upcomingDeadlines.map(item => item.deadline);
}

/**
 * Get the next occurrence of a deadline from a given date
 */
export function getNextOccurrence(deadline: TaxDeadline, fromDate: Date = new Date()): Date | null {
  const currentYear = fromDate.getFullYear();
  const currentMonth = fromDate.getMonth() + 1;
  const currentDay = fromDate.getDate();

  // For special non-recurring events
  if (!deadline.recurring && deadline.specialYear) {
    const specialDate = new Date(deadline.specialYear, deadline.date.month - 1, deadline.date.day);
    return specialDate >= fromDate ? specialDate : null;
  }

  // For monthly recurring (month: 0), find the next occurrence
  if (deadline.date.month === 0) {
    let targetDate = new Date(currentYear, fromDate.getMonth(), deadline.date.day);
    targetDate.setHours(0, 0, 0, 0);
    const compareDate = new Date(fromDate);
    compareDate.setHours(0, 0, 0, 0);
    // Use < instead of <= to include today's deadline
    if (targetDate < compareDate) {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
    return targetDate;
  }

  // For regular recurring deadlines
  let targetYear = currentYear;
  let targetDate = new Date(targetYear, deadline.date.month - 1, deadline.date.day);
  targetDate.setHours(0, 0, 0, 0);
  const compareDate = new Date(fromDate);
  compareDate.setHours(0, 0, 0, 0);

  // If the deadline has already passed this year, get next year's
  // Use < instead of <= to include today's deadline
  if (targetDate < compareDate) {
    targetYear++;
    targetDate = new Date(targetYear, deadline.date.month - 1, deadline.date.day);
  }

  return targetDate;
}

/**
 * Calculate days until a deadline
 */
export function getDaysUntilDeadline(deadline: TaxDeadline): number | null {
  const nextDate = getNextOccurrence(deadline);
  if (!nextDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDate.setHours(0, 0, 0, 0);

  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format date for display
 */
export function formatDeadlineDate(deadline: TaxDeadline, year?: number): string {
  const targetYear = year || (deadline.specialYear || new Date().getFullYear());

  if (deadline.date.month === 0) {
    return `Ngày ${deadline.date.day} hàng tháng`;
  }

  const monthNames = [
    '', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  return `${deadline.date.day}/${deadline.date.month}/${targetYear}`;
}

/**
 * Generate ICS calendar file content
 */
export function generateICSContent(deadline: TaxDeadline, year?: number): string {
  const targetYear = year || (deadline.specialYear || new Date().getFullYear());
  const month = deadline.date.month === 0 ? new Date().getMonth() + 1 : deadline.date.month;
  const day = deadline.date.day;

  // Format date as YYYYMMDD
  const dateStr = `${targetYear}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  const nextDay = new Date(targetYear, month - 1, day + 1);
  const nextDayStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;

  const now = new Date();
  const createdDate = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Add RRULE for recurring events
  let rrule = '';
  if (deadline.recurring) {
    if (deadline.date.month === 0) {
      // Monthly recurring (e.g., 20th of every month)
      rrule = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`;
    } else {
      // Yearly recurring (same date every year)
      rrule = `RRULE:FREQ=YEARLY;BYMONTH=${deadline.date.month};BYMONTHDAY=${day}`;
    }
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Tinh Thue TNCN 2026//Tax Calendar//VI
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART;VALUE=DATE:${dateStr}
DTEND;VALUE=DATE:${nextDayStr}
DTSTAMP:${createdDate}
UID:${deadline.id}-${deadline.recurring ? 'recurring' : targetYear}@thue.1devops.io
SUMMARY:${deadline.title}
DESCRIPTION:${deadline.description.replace(/\n/g, '\\n')}
CATEGORIES:${CATEGORY_LABELS[deadline.category]}
PRIORITY:${deadline.priority === 'critical' ? 1 : deadline.priority === 'important' ? 5 : 9}
STATUS:CONFIRMED
TRANSP:TRANSPARENT${rrule ? '\n' + rrule : ''}
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:${deadline.title}
TRIGGER:-P7D
END:VALARM
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:${deadline.title}
TRIGGER:-P1D
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(deadline: TaxDeadline, year?: number): string {
  const targetYear = year || (deadline.specialYear || new Date().getFullYear());
  const month = deadline.date.month === 0 ? new Date().getMonth() + 1 : deadline.date.month;
  const day = deadline.date.day;

  const dateStr = `${targetYear}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;

  // Google Calendar needs end date to be exclusive (next day for all-day events)
  const nextDay = new Date(targetYear, month - 1, day + 1);
  const nextDayStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: deadline.title,
    dates: `${dateStr}/${nextDayStr}`,
    details: deadline.description,
    ctz: 'Asia/Ho_Chi_Minh',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL
 */
export function generateOutlookCalendarUrl(deadline: TaxDeadline, year?: number): string {
  const targetYear = year || (deadline.specialYear || new Date().getFullYear());
  const month = deadline.date.month === 0 ? new Date().getMonth() + 1 : deadline.date.month;
  const day = deadline.date.day;

  const startDate = new Date(targetYear, month - 1, day);
  const endDate = new Date(targetYear, month - 1, day + 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const params = new URLSearchParams({
    subject: deadline.title,
    body: deadline.description,
    startdt: formatDate(startDate),
    enddt: formatDate(endDate),
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
