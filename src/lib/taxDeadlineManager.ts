/**
 * Tax Deadline Manager
 * Quản lý và nhắc nhở các deadline nộp thuế
 *
 * Căn cứ pháp lý:
 * - Luật Quản lý thuế 2019 (Luật số 38/2019/QH14)
 * - Nghị định 126/2020/NĐ-CP
 * - Thông tư 80/2021/TT-BTC
 *
 * Các mốc quan trọng:
 * - Thuế TNCN quyết toán: 31/3 năm sau
 * - Thuế TNCN tạm nộp quý: Ngày 30 của tháng đầu quý sau
 * - Thuế GTGT: Ngày 20 của tháng sau (kê khai tháng) hoặc ngày 30 của tháng đầu quý sau
 * - Thuế TNDN tạm tính: Ngày 30 của tháng đầu quý sau
 */

// Deadline types
export type DeadlineType =
  | 'pit_annual'           // Quyết toán thuế TNCN năm
  | 'pit_quarterly'        // Tạm nộp thuế TNCN quý
  | 'vat_monthly'          // Kê khai thuế GTGT tháng
  | 'vat_quarterly'        // Kê khai thuế GTGT quý
  | 'cit_quarterly'        // Tạm tính thuế TNDN quý
  | 'cit_annual'           // Quyết toán thuế TNDN năm
  | 'household_quarterly'  // Thuế hộ kinh doanh quý
  | 'property_transfer'    // Thuế chuyển nhượng BĐS
  | 'rental_quarterly'     // Thuế cho thuê quý
  | 'dependent_registration' // Đăng ký người phụ thuộc
  | 'insurance_annual'     // Quyết toán BHXH năm
  | 'custom';              // Deadline tùy chỉnh

// Deadline priority
export type DeadlinePriority = 'urgent' | 'high' | 'medium' | 'low';

// Deadline status
export type DeadlineStatus = 'upcoming' | 'due_soon' | 'overdue' | 'completed';

// Deadline configuration
export interface DeadlineConfig {
  type: DeadlineType;
  name: string;
  description: string;
  icon: string;
  category: 'personal' | 'business' | 'both';
  isRecurring: boolean;
  frequency?: 'monthly' | 'quarterly' | 'annual';
  legalBasis: string;
  penalty: string;
}

// Predefined deadline configurations
export const DEADLINE_CONFIGS: Record<DeadlineType, DeadlineConfig> = {
  pit_annual: {
    type: 'pit_annual',
    name: 'Quyết toán thuế TNCN năm',
    description: 'Nộp tờ khai quyết toán thuế TNCN và nộp thuế còn thiếu',
    icon: '📋',
    category: 'personal',
    isRecurring: true,
    frequency: 'annual',
    legalBasis: 'Điều 44, Luật Quản lý thuế 2019',
    penalty: 'Phạt chậm nộp 0,03%/ngày + phạt hành chính 2-5 triệu đồng',
  },
  pit_quarterly: {
    type: 'pit_quarterly',
    name: 'Tạm nộp thuế TNCN quý',
    description: 'Nộp thuế TNCN tạm tính theo quý (áp dụng cho thu nhập không qua lương)',
    icon: '💰',
    category: 'personal',
    isRecurring: true,
    frequency: 'quarterly',
    legalBasis: 'Điều 8, Thông tư 111/2013/TT-BTC',
    penalty: 'Phạt chậm nộp 0,03%/ngày',
  },
  vat_monthly: {
    type: 'vat_monthly',
    name: 'Kê khai thuế GTGT tháng',
    description: 'Nộp tờ khai thuế GTGT tháng (doanh thu > 50 tỷ/năm)',
    icon: '📊',
    category: 'business',
    isRecurring: true,
    frequency: 'monthly',
    legalBasis: 'Điều 44, Luật Quản lý thuế 2019',
    penalty: 'Phạt chậm nộp tờ khai 2-5 triệu đồng',
  },
  vat_quarterly: {
    type: 'vat_quarterly',
    name: 'Kê khai thuế GTGT quý',
    description: 'Nộp tờ khai thuế GTGT quý (doanh thu <= 50 tỷ/năm)',
    icon: '📊',
    category: 'business',
    isRecurring: true,
    frequency: 'quarterly',
    legalBasis: 'Điều 44, Luật Quản lý thuế 2019',
    penalty: 'Phạt chậm nộp tờ khai 2-5 triệu đồng',
  },
  cit_quarterly: {
    type: 'cit_quarterly',
    name: 'Tạm tính thuế TNDN quý',
    description: 'Nộp thuế TNDN tạm tính theo quý',
    icon: '🏢',
    category: 'business',
    isRecurring: true,
    frequency: 'quarterly',
    legalBasis: 'Điều 55, Luật Quản lý thuế 2019',
    penalty: 'Phạt chậm nộp 0,03%/ngày',
  },
  cit_annual: {
    type: 'cit_annual',
    name: 'Quyết toán thuế TNDN năm',
    description: 'Nộp tờ khai quyết toán thuế TNDN và nộp thuế còn thiếu',
    icon: '🏢',
    category: 'business',
    isRecurring: true,
    frequency: 'annual',
    legalBasis: 'Điều 44, Luật Quản lý thuế 2019',
    penalty: 'Phạt chậm nộp 0,03%/ngày + phạt hành chính',
  },
  household_quarterly: {
    type: 'household_quarterly',
    name: 'Nộp thuế hộ kinh doanh quý',
    description: 'Nộp thuế khoán quý cho hộ kinh doanh',
    icon: '🏪',
    category: 'business',
    isRecurring: true,
    frequency: 'quarterly',
    legalBasis: 'Thông tư 40/2021/TT-BTC',
    penalty: 'Phạt chậm nộp 0,03%/ngày',
  },
  property_transfer: {
    type: 'property_transfer',
    name: 'Thuế chuyển nhượng BĐS',
    description: 'Nộp thuế trong 10 ngày kể từ ngày ký hợp đồng',
    icon: '🏡',
    category: 'personal',
    isRecurring: false,
    legalBasis: 'Điều 32, Luật Thuế TNCN',
    penalty: 'Phạt chậm nộp 0,03%/ngày + phạt hành chính',
  },
  rental_quarterly: {
    type: 'rental_quarterly',
    name: 'Thuế cho thuê tài sản quý',
    description: 'Nộp thuế cho thuê nhà/tài sản theo quý',
    icon: '🏠',
    category: 'personal',
    isRecurring: true,
    frequency: 'quarterly',
    legalBasis: 'Thông tư 92/2015/TT-BTC',
    penalty: 'Phạt chậm nộp 0,03%/ngày',
  },
  dependent_registration: {
    type: 'dependent_registration',
    name: 'Đăng ký người phụ thuộc',
    description: 'Đăng ký/cập nhật thông tin người phụ thuộc',
    icon: '👨‍👩‍👧‍👦',
    category: 'personal',
    isRecurring: true,
    frequency: 'annual',
    legalBasis: 'Thông tư 111/2013/TT-BTC',
    penalty: 'Không được giảm trừ nếu không đăng ký',
  },
  insurance_annual: {
    type: 'insurance_annual',
    name: 'Quyết toán BHXH năm',
    description: 'Quyết toán bảo hiểm xã hội năm',
    icon: '🛡️',
    category: 'both',
    isRecurring: true,
    frequency: 'annual',
    legalBasis: 'Luật BHXH 2014',
    penalty: 'Phạt hành chính theo quy định',
  },
  custom: {
    type: 'custom',
    name: 'Deadline tùy chỉnh',
    description: 'Deadline do người dùng tự tạo',
    icon: '📌',
    category: 'both',
    isRecurring: false,
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
  reminderDays: number[]; // Days before due date to remind
  status: DeadlineStatus;
  priority: DeadlinePriority;
  amount?: number; // Estimated tax amount
  notes?: string;
  completedAt?: Date;
  isCustom: boolean;
}

// Manager input
export interface DeadlineManagerInput {
  year: number;
  includePersonal: boolean;
  includeBusiness: boolean;
  customDeadlines: TaxDeadline[];
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
 * Generate unique ID
 */
export function generateDeadlineId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Get deadline status based on due date
 */
export function getDeadlineStatus(dueDate: Date, completedAt?: Date): DeadlineStatus {
  if (completedAt) return 'completed';

  const now = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'due_soon';
  return 'upcoming';
}

/**
 * Get deadline priority based on type and days until due
 */
export function getDeadlinePriority(type: DeadlineType, daysUntilDue: number): DeadlinePriority {
  // Overdue is always urgent
  if (daysUntilDue < 0) return 'urgent';

  // Within 3 days is urgent
  if (daysUntilDue <= 3) return 'urgent';

  // Within 7 days is high
  if (daysUntilDue <= 7) return 'high';

  // Within 14 days is medium
  if (daysUntilDue <= 14) return 'medium';

  return 'low';
}

/**
 * Calculate days until deadline
 */
export function getDaysUntilDeadline(dueDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get quarterly deadline date
 * Quarter 1: 30/4, Quarter 2: 30/7, Quarter 3: 30/10, Quarter 4: 30/1 (next year)
 */
function getQuarterlyDeadline(year: number, quarter: 1 | 2 | 3 | 4): Date {
  switch (quarter) {
    case 1:
      return new Date(year, 3, 30); // 30/4
    case 2:
      return new Date(year, 6, 30); // 30/7
    case 3:
      return new Date(year, 9, 30); // 30/10
    case 4:
      return new Date(year + 1, 0, 30); // 30/1 next year
  }
}

/**
 * Get monthly VAT deadline (20th of next month)
 */
function getMonthlyVATDeadline(year: number, month: number): Date {
  if (month === 12) {
    return new Date(year + 1, 0, 20); // 20/1 next year
  }
  return new Date(year, month, 20); // 20th of next month
}

/**
 * Generate standard deadlines for a year
 */
export function generateStandardDeadlines(
  year: number,
  includePersonal: boolean,
  includeBusiness: boolean
): TaxDeadline[] {
  const deadlines: TaxDeadline[] = [];

  if (includePersonal) {
    // PIT Annual Settlement - March 31
    deadlines.push({
      id: generateDeadlineId(),
      type: 'pit_annual',
      name: `Quyết toán thuế TNCN năm ${year - 1}`,
      description: DEADLINE_CONFIGS.pit_annual.description,
      dueDate: new Date(year, 2, 31), // March 31
      reminderDays: [30, 14, 7, 3, 1],
      status: 'upcoming',
      priority: 'medium',
      isCustom: false,
    });

    // Dependent Registration - End of year
    deadlines.push({
      id: generateDeadlineId(),
      type: 'dependent_registration',
      name: `Đăng ký người phụ thuộc năm ${year}`,
      description: DEADLINE_CONFIGS.dependent_registration.description,
      dueDate: new Date(year, 11, 31), // December 31
      reminderDays: [30, 14, 7],
      status: 'upcoming',
      priority: 'low',
      isCustom: false,
    });

    // Rental income quarterly
    for (let q = 1; q <= 4; q++) {
      const quarter = q as 1 | 2 | 3 | 4;
      deadlines.push({
        id: generateDeadlineId(),
        type: 'rental_quarterly',
        name: `Thuế cho thuê Q${q}/${year}`,
        description: DEADLINE_CONFIGS.rental_quarterly.description,
        dueDate: getQuarterlyDeadline(year, quarter),
        reminderDays: [14, 7, 3, 1],
        status: 'upcoming',
        priority: 'medium',
        isCustom: false,
      });
    }
  }

  if (includeBusiness) {
    // VAT Quarterly
    for (let q = 1; q <= 4; q++) {
      const quarter = q as 1 | 2 | 3 | 4;
      deadlines.push({
        id: generateDeadlineId(),
        type: 'vat_quarterly',
        name: `Kê khai thuế GTGT Q${q}/${year}`,
        description: DEADLINE_CONFIGS.vat_quarterly.description,
        dueDate: getQuarterlyDeadline(year, quarter),
        reminderDays: [14, 7, 3, 1],
        status: 'upcoming',
        priority: 'high',
        isCustom: false,
      });
    }

    // CIT Quarterly
    for (let q = 1; q <= 4; q++) {
      const quarter = q as 1 | 2 | 3 | 4;
      deadlines.push({
        id: generateDeadlineId(),
        type: 'cit_quarterly',
        name: `Tạm tính thuế TNDN Q${q}/${year}`,
        description: DEADLINE_CONFIGS.cit_quarterly.description,
        dueDate: getQuarterlyDeadline(year, quarter),
        reminderDays: [14, 7, 3, 1],
        status: 'upcoming',
        priority: 'high',
        isCustom: false,
      });
    }

    // CIT Annual - March 31
    deadlines.push({
      id: generateDeadlineId(),
      type: 'cit_annual',
      name: `Quyết toán thuế TNDN năm ${year - 1}`,
      description: DEADLINE_CONFIGS.cit_annual.description,
      dueDate: new Date(year, 2, 31), // March 31
      reminderDays: [30, 14, 7, 3, 1],
      status: 'upcoming',
      priority: 'high',
      isCustom: false,
    });

    // Household business quarterly
    for (let q = 1; q <= 4; q++) {
      const quarter = q as 1 | 2 | 3 | 4;
      deadlines.push({
        id: generateDeadlineId(),
        type: 'household_quarterly',
        name: `Thuế hộ kinh doanh Q${q}/${year}`,
        description: DEADLINE_CONFIGS.household_quarterly.description,
        dueDate: getQuarterlyDeadline(year, quarter),
        reminderDays: [14, 7, 3, 1],
        status: 'upcoming',
        priority: 'medium',
        isCustom: false,
      });
    }
  }

  // Insurance annual (both)
  if (includePersonal || includeBusiness) {
    deadlines.push({
      id: generateDeadlineId(),
      type: 'insurance_annual',
      name: `Quyết toán BHXH năm ${year - 1}`,
      description: DEADLINE_CONFIGS.insurance_annual.description,
      dueDate: new Date(year, 1, 28), // February 28
      reminderDays: [30, 14, 7, 3],
      status: 'upcoming',
      priority: 'medium',
      isCustom: false,
    });
  }

  return deadlines;
}

/**
 * Update deadline statuses
 */
function updateDeadlineStatuses(deadlines: TaxDeadline[]): TaxDeadline[] {
  return deadlines.map(deadline => {
    const daysUntil = getDaysUntilDeadline(deadline.dueDate);
    return {
      ...deadline,
      status: getDeadlineStatus(deadline.dueDate, deadline.completedAt),
      priority: deadline.completedAt ? deadline.priority : getDeadlinePriority(deadline.type, daysUntil),
    };
  });
}

/**
 * Main calculation function
 */
export function calculateDeadlineManager(input: DeadlineManagerInput): DeadlineManagerResult {
  const { year, includePersonal, includeBusiness, customDeadlines } = input;

  // Generate standard deadlines
  const standardDeadlines = generateStandardDeadlines(year, includePersonal, includeBusiness);

  // Combine with custom deadlines
  const allDeadlines = updateDeadlineStatuses([...standardDeadlines, ...customDeadlines]);

  // Sort by due date
  allDeadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // Categorize
  const upcomingDeadlines = allDeadlines.filter(d => d.status === 'upcoming');
  const dueSoonDeadlines = allDeadlines.filter(d => d.status === 'due_soon');
  const overdueDeadlines = allDeadlines.filter(d => d.status === 'overdue');
  const completedDeadlines = allDeadlines.filter(d => d.status === 'completed');

  // Find next deadline (not completed)
  const nextDeadline = allDeadlines.find(d => d.status !== 'completed' && d.status !== 'overdue') || null;

  return {
    allDeadlines,
    upcomingDeadlines,
    dueSoonDeadlines,
    overdueDeadlines,
    completedDeadlines,
    nextDeadline,
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
 * Format date in Vietnamese
 */
export function formatDateVN(date: Date): string {
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
 * Get status color
 */
export function getStatusColor(status: DeadlineStatus): string {
  switch (status) {
    case 'overdue':
      return 'red';
    case 'due_soon':
      return 'orange';
    case 'upcoming':
      return 'blue';
    case 'completed':
      return 'green';
    default:
      return 'gray';
  }
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
 * Get priority color
 */
export function getPriorityColor(priority: DeadlinePriority): string {
  switch (priority) {
    case 'urgent':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'green';
    default:
      return 'gray';
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
