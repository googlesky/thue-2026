/**
 * Income Summary Calculator
 * Tổng hợp thu nhập và thuế TNCN cả năm từ các khoản nhập theo tháng (cá nhân cư trú)
 *
 * - Lương, thưởng, thù lao dịch vụ không đăng ký kinh doanh: gộp cả năm, quyết toán lũy tiến
 *   theo luật của năm chọn (2025: 7 bậc, 11tr/4,4tr; từ 2026: 5 bậc, 15,5tr/6,2tr)
 * - Kinh doanh, cho thuê, nội dung số: ngưỡng doanh thu năm chung (1 tỷ từ 2026; 100 triệu năm 2025)
 * - Trúng thưởng, thừa kế/quà tặng, thu nhập khác: phần vượt ngưỡng theo từng lần (10 → 20 triệu từ 01/7/2026)
 */

import { EFFECTIVE_DATES, getPerTransactionThreshold } from './taxCalculator';
import {
  allocate,
  calculateAnnualInsurance,
  calculateAnnualWageTax,
  calculateBusinessTaxable,
  formatPercent as formatRate,
} from './multiSourceIncomeCalculator';

// Income source categories
export type IncomeCategory =
  | 'salary'           // Lương, tiền công
  | 'bonus'            // Thưởng, lương 13
  | 'freelance'        // Thù lao dịch vụ không đăng ký kinh doanh (tiền công)
  | 'rental'           // Cho thuê tài sản
  | 'investment'       // Đầu tư (cổ tức, lãi cho vay)
  | 'securities'       // Chứng khoán
  | 'crypto'           // Tài sản số
  | 'content_creator'  // Content creator (YouTube, TikTok)
  | 'business'         // Kinh doanh cá thể/HKD
  | 'real_estate'      // Chuyển nhượng BĐS
  | 'lottery'          // Trúng thưởng
  | 'inheritance'      // Thừa kế, quà tặng
  | 'other';           // Thu nhập khác

// Category configuration
export interface IncomeCategoryConfig {
  id: IncomeCategory;
  name: string;
  color: string;
  // progressive: gộp tiền lương, tiền công tính lũy tiến; flat: % trên giá trị;
  // per_time: % phần vượt ngưỡng mỗi lần; business: % phần doanh thu năm vượt ngưỡng (chung mọi hoạt động)
  taxMethod: 'progressive' | 'flat' | 'per_time' | 'business';
  defaultTaxRate?: number;
  taxableFrom?: Date; // Chỉ chịu thuế với khoản phát sinh từ ngày này
  description: string;
}

// Thu nhập khác mới của Luật 109/2025 (tài sản số, tên miền .vn, tín chỉ carbon, biển số) chịu thuế từ 01/7/2026
const LAW_109_OTHER_INCOME_FROM = EFFECTIVE_DATES.PER_TRANSACTION_THRESHOLD_2026;

// Category configurations
export const INCOME_CATEGORIES: IncomeCategoryConfig[] = [
  {
    id: 'salary',
    name: 'Lương, tiền công',
    color: '#3B82F6', // blue
    taxMethod: 'progressive',
    description: 'Lương, phụ cấp chịu thuế hằng tháng (tính BH bắt buộc)',
  },
  {
    id: 'bonus',
    name: 'Thưởng',
    color: '#8B5CF6', // violet
    taxMethod: 'progressive',
    description: 'Thưởng Tết, lương tháng 13, thưởng hiệu suất (gộp với lương, không tính BH)',
  },
  {
    id: 'freelance',
    name: 'Thu nhập tự do',
    color: '#EC4899', // pink
    taxMethod: 'progressive',
    description: 'Thù lao dịch vụ, tư vấn không đăng ký kinh doanh: tính như tiền công, gộp với lương (tổ chức chi trả tạm khấu trừ 10% khoản từ 5 triệu/lần)',
  },
  {
    id: 'rental',
    name: 'Cho thuê tài sản',
    color: '#F59E0B', // amber
    taxMethod: 'business',
    defaultTaxRate: 0.05,
    description: 'Cho thuê nhà, đất, xe, thiết bị: 5% phần doanh thu năm vượt 1 tỷ (tính chung ngưỡng với kinh doanh)',
  },
  {
    id: 'investment',
    name: 'Đầu tư',
    color: '#10B981', // emerald
    taxMethod: 'flat',
    defaultTaxRate: 0.05,
    description: 'Cổ tức, lãi cho vay, lãi trái phiếu doanh nghiệp (lãi tiền gửi, trái phiếu Chính phủ được miễn)',
  },
  {
    id: 'securities',
    name: 'Chứng khoán',
    color: '#06B6D4', // cyan
    taxMethod: 'flat',
    defaultTaxRate: 0.001,
    description: 'Tổng giá bán cổ phiếu, chứng chỉ quỹ, trái phiếu (0,1% mỗi lần bán)',
  },
  {
    id: 'crypto',
    name: 'Tài sản số',
    color: '#F97316', // orange
    taxMethod: 'flat',
    defaultTaxRate: 0.001,
    taxableFrom: LAW_109_OTHER_INCOME_FROM,
    description: 'Giá chuyển nhượng tài sản số, tiền mã hóa, NFT (0,1% từ 01/7/2026)',
  },
  {
    id: 'content_creator',
    name: 'Content Creator',
    color: '#EF4444', // red
    taxMethod: 'business',
    defaultTaxRate: 0.05,
    description: 'YouTube, TikTok, KOL, quảng cáo số: 5% phần doanh thu năm vượt 1 tỷ',
  },
  {
    id: 'business',
    name: 'Kinh doanh',
    color: '#84CC16', // lime
    taxMethod: 'business',
    defaultTaxRate: 0.015,
    description: 'Hộ, cá nhân kinh doanh: tạm tính 1,5% phần doanh thu năm vượt 1 tỷ (phân phối hàng hóa 0,5%, dịch vụ 2%)',
  },
  {
    id: 'real_estate',
    name: 'Bất động sản',
    color: '#A855F7', // purple
    taxMethod: 'flat',
    defaultTaxRate: 0.02,
    description: 'Giá chuyển nhượng nhà, đất (2%; nhà, đất ở duy nhất được miễn)',
  },
  {
    id: 'lottery',
    name: 'Trúng thưởng',
    color: '#F43F5E', // rose
    taxMethod: 'per_time',
    defaultTaxRate: 0.10,
    description: 'Xổ số, khuyến mại, game show: 10% phần vượt 20 triệu mỗi lần (trúng thưởng casino không chịu thuế TNCN)',
  },
  {
    id: 'inheritance',
    name: 'Thừa kế/Quà tặng',
    color: '#14B8A6', // teal
    taxMethod: 'per_time',
    defaultTaxRate: 0.10,
    description: 'Chứng khoán, phần vốn, BĐS, tài sản phải đăng ký: 10% phần vượt 20 triệu mỗi lần (BĐS giữa người thân được miễn)',
  },
  {
    id: 'other',
    name: 'Thu nhập khác',
    color: '#6B7280', // gray
    taxMethod: 'per_time',
    defaultTaxRate: 0.05,
    taxableFrom: LAW_109_OTHER_INCOME_FROM,
    description: 'Chuyển nhượng tên miền .vn, tín chỉ carbon, biển số xe trúng đấu giá: 5% phần vượt 20 triệu mỗi lần',
  },
];

// Single income entry
export interface IncomeEntry {
  id: string;
  category: IncomeCategory;
  description: string;
  amount: number;
  month: number; // 1-12
  notes?: string;
  // Do calculateIncomeSummary tính, không cần nhập
  taxableAmount?: number;
  taxAmount?: number;
}

type TaxedEntry = IncomeEntry & { taxableAmount: number; taxAmount: number };

// Monthly summary
export interface MonthlySummary {
  month: number;
  monthName: string;
  totalIncome: number;
  totalTax: number;
  entries: number;
  byCategory: {
    category: IncomeCategory;
    amount: number;
    tax: number;
  }[];
}

// Category summary
export interface CategorySummary {
  category: IncomeCategory;
  config: IncomeCategoryConfig;
  totalIncome: number;
  totalTax: number;
  entries: number;
  percentage: number;
}

// Input
export interface IncomeSummaryInput {
  year: number;
  entries: IncomeEntry[];
  dependents: number;
  hasInsurance: boolean;
}

export const DEFAULT_INCOME_SUMMARY_INPUT: IncomeSummaryInput = {
  year: new Date().getFullYear(),
  entries: [],
  dependents: 0,
  hasInsurance: true,
};

// Result
export interface IncomeSummaryResult {
  // Totals
  totalGrossIncome: number;
  totalTaxableIncome: number;
  totalTax: number;
  effectiveTaxRate: number;

  // Net income (sau BH bắt buộc và thuế)
  totalNetIncome: number;

  // Deductions applied
  deductions: {
    personal: number;
    dependent: number;
    insurance: number;
    total: number;
  };

  // By category
  byCategory: CategorySummary[];

  // By month
  byMonth: MonthlySummary[];

  // Top categories
  topCategories: CategorySummary[];

  // Average monthly
  averageMonthlyIncome: number;
  averageMonthlyTax: number;

  // Entries (đã có thuế từng khoản)
  totalEntries: number;
  entries: TaxedEntry[];
}

// Month names in Vietnamese
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

/**
 * Generate unique ID
 */
export function generateEntryId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Get category config
 */
export function getCategoryConfig(category: IncomeCategory): IncomeCategoryConfig {
  return INCOME_CATEGORIES.find(c => c.id === category) || INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
}

/**
 * Main calculation function
 */
export function calculateIncomeSummary(input: IncomeSummaryInput): IncomeSummaryResult {
  const { year, hasInsurance } = input;
  const dependents = Math.min(20, Math.max(0, Math.floor(Number(input.dependents) || 0)));
  const rateOf = (e: IncomeEntry) => getCategoryConfig(e.category).defaultTaxRate ?? 0;

  // Theo thứ tự tháng: ngưỡng doanh thu năm được trừ vào các tháng sớm trước
  const entries: TaxedEntry[] = input.entries
    .map((e) => ({
      ...e,
      amount: Math.max(0, Number(e.amount) || 0),
      month: Math.min(12, Math.max(1, Math.round(Number(e.month)) || 1)), // dữ liệu snapshot có thể lệch
      taxableAmount: 0,
      taxAmount: 0,
    }))
    .sort((a, b) => a.month - b.month);
  const byMethod = (method: IncomeCategoryConfig['taxMethod']) =>
    entries.filter((e) => getCategoryConfig(e.category).taxMethod === method);

  // 1) Tiền lương, tiền công: gộp cả năm, quyết toán lũy tiến; BH chỉ tính trên lương từng tháng
  const wage = byMethod('progressive');
  const monthlySalaries = Array<number>(12).fill(0);
  for (const e of wage) {
    if (e.category === 'salary') monthlySalaries[e.month - 1] += e.amount;
  }
  const insurance = hasInsurance ? calculateAnnualInsurance(monthlySalaries, year) : 0;
  const wageTax = calculateAnnualWageTax({
    year,
    income: wage.reduce((sum, e) => sum + e.amount, 0),
    insurance,
    dependents,
  });
  const wageWeights = wage.map((e) => e.amount);
  allocate(wageTax.tax, wageWeights).forEach((tax, i) => { wage[i].taxAmount = tax; });
  allocate(wageTax.taxableIncome, wageWeights).forEach((taxable, i) => { wage[i].taxableAmount = taxable; });

  // 2) Kinh doanh, cho thuê: ngưỡng doanh thu năm chung, trừ vào hoạt động thuế suất cao trước
  const business = byMethod('business');
  calculateBusinessTaxable(business.map((e) => ({ revenue: e.amount, rate: rateOf(e) })), year)
    .forEach((taxable, i) => {
      business[i].taxableAmount = taxable;
      business[i].taxAmount = Math.round(taxable * rateOf(business[i]));
    });

  // 3) Thuế suất cố định / phần vượt ngưỡng theo từng lần (ngưỡng theo tháng phát sinh)
  for (const e of entries) {
    const config = getCategoryConfig(e.category);
    if (config.taxMethod !== 'flat' && config.taxMethod !== 'per_time') continue;
    const date = new Date(year, e.month - 1, 1);
    if (config.taxableFrom && date < config.taxableFrom) continue;
    e.taxableAmount = config.taxMethod === 'per_time'
      ? Math.max(0, e.amount - getPerTransactionThreshold(date))
      : e.amount;
    e.taxAmount = Math.round(e.taxableAmount * rateOf(e));
  }

  // Tổng hợp theo loại và theo tháng từ thuế từng khoản (luôn khớp tổng)
  const categoryMap = new Map<IncomeCategory, CategorySummary>();
  const byMonth: MonthlySummary[] = MONTH_NAMES.map((monthName, i) => ({
    month: i + 1,
    monthName,
    totalIncome: 0,
    totalTax: 0,
    entries: 0,
    byCategory: [],
  }));

  for (const e of entries) {
    const cat = categoryMap.get(e.category) ?? {
      category: e.category,
      config: getCategoryConfig(e.category),
      totalIncome: 0,
      totalTax: 0,
      entries: 0,
      percentage: 0,
    };
    cat.totalIncome += e.amount;
    cat.totalTax += e.taxAmount;
    cat.entries += 1;
    categoryMap.set(e.category, cat);

    const month = byMonth[e.month - 1];
    month.totalIncome += e.amount;
    month.totalTax += e.taxAmount;
    month.entries += 1;
    const monthCat = month.byCategory.find((c) => c.category === e.category);
    if (monthCat) {
      monthCat.amount += e.amount;
      monthCat.tax += e.taxAmount;
    } else {
      month.byCategory.push({ category: e.category, amount: e.amount, tax: e.taxAmount });
    }
  }

  const totalGrossIncome = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalTaxableIncome = entries.reduce((sum, e) => sum + e.taxableAmount, 0);
  const totalTax = entries.reduce((sum, e) => sum + e.taxAmount, 0);

  // Sort categories by income (descending)
  const sortedCategories = [...categoryMap.values()].sort((a, b) => b.totalIncome - a.totalIncome);
  if (totalGrossIncome > 0) {
    for (const cat of sortedCategories) {
      cat.percentage = (cat.totalIncome / totalGrossIncome) * 100;
    }
  }

  // Average monthly
  const monthsWithIncome = byMonth.filter(m => m.totalIncome > 0).length || 1;

  return {
    totalGrossIncome,
    totalTaxableIncome,
    totalTax,
    effectiveTaxRate: totalGrossIncome > 0 ? (totalTax / totalGrossIncome) * 100 : 0,
    totalNetIncome: totalGrossIncome - insurance - totalTax,
    deductions: {
      personal: wageTax.personalDeduction,
      dependent: wageTax.dependentDeduction,
      insurance,
      total: wageTax.personalDeduction + wageTax.dependentDeduction + insurance,
    },
    byCategory: sortedCategories,
    byMonth,
    topCategories: sortedCategories.slice(0, 5),
    averageMonthlyIncome: Math.round(totalGrossIncome / monthsWithIncome),
    averageMonthlyTax: Math.round(totalTax / monthsWithIncome),
    totalEntries: entries.length,
    entries,
  };
}

/**
 * Cách tính thuế của loại thu nhập, VD "10% phần vượt ngưỡng mỗi lần"
 */
export function formatTaxMethod(config: IncomeCategoryConfig): string {
  const rate = formatRate(config.defaultTaxRate ?? 0);
  switch (config.taxMethod) {
    case 'progressive':
      return 'Lũy tiến (gộp với lương)';
    case 'per_time':
      return `${rate} phần vượt ngưỡng mỗi lần`;
    case 'business':
      return `${rate} phần doanh thu vượt ngưỡng năm`;
    default:
      return rate;
  }
}

/**
 * Rút gọn số tiền: 360.000.000 → "360 tr", 1.500.000.000 → "1,5 tỷ"
 */
export function formatShortCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(safe);
  const format = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (abs >= 1_000_000_000) return `${format(safe / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${format(safe / 1_000_000)} tr`;
  if (abs >= 1_000) return `${format(safe / 1_000)} nghìn`;
  return format(safe);
}

/**
 * Định dạng phần trăm (đầu vào đã nhân 100): 12.345 → "12,35%"
 */
export function formatPercent(value: number): string {
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}
