/**
 * Income Summary Calculator
 * Tổng hợp thu nhập và thuế từ nhiều nguồn trong năm
 *
 * Dashboard hiển thị:
 * - Tổng thu nhập cả năm theo từng nguồn
 * - Tổng thuế phải nộp
 * - Biểu đồ phân bổ thu nhập
 * - So sánh với năm trước
 */

import { getMaxSocialInsuranceSalary } from './taxCalculator';

// Income source categories
export type IncomeCategory =
  | 'salary'           // Lương, tiền công
  | 'bonus'            // Thưởng, lương 13
  | 'freelance'        // Thu nhập tự do, hợp đồng dịch vụ
  | 'rental'           // Cho thuê tài sản
  | 'investment'       // Đầu tư (cổ tức, lãi vay)
  | 'securities'       // Chứng khoán
  | 'crypto'           // Crypto/NFT
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
  icon: string;
  color: string;
  taxMethod: 'progressive' | 'flat' | 'exempt';
  defaultTaxRate?: number; // For flat rate
  description: string;
}

// Category configurations
export const INCOME_CATEGORIES: IncomeCategoryConfig[] = [
  {
    id: 'salary',
    name: 'Lương, tiền công',
    icon: '💼',
    color: '#3B82F6', // blue
    taxMethod: 'progressive',
    description: 'Thu nhập từ lương chính, phụ cấp, trợ cấp',
  },
  {
    id: 'bonus',
    name: 'Thưởng',
    icon: '🎁',
    color: '#8B5CF6', // violet
    taxMethod: 'progressive',
    description: 'Thưởng Tết, lương tháng 13, thưởng hiệu suất',
  },
  {
    id: 'freelance',
    name: 'Thu nhập tự do',
    icon: '👤',
    color: '#EC4899', // pink
    taxMethod: 'flat',
    defaultTaxRate: 0.10,
    description: 'Hợp đồng dịch vụ, tư vấn, freelance',
  },
  {
    id: 'rental',
    name: 'Cho thuê tài sản',
    icon: '🏠',
    color: '#F59E0B', // amber
    taxMethod: 'flat',
    defaultTaxRate: 0.05,
    description: 'Cho thuê nhà, đất, xe, thiết bị',
  },
  {
    id: 'investment',
    name: 'Đầu tư',
    icon: '📈',
    color: '#10B981', // emerald
    taxMethod: 'flat',
    defaultTaxRate: 0.05,
    description: 'Cổ tức, lãi vay, lãi tiền gửi',
  },
  {
    id: 'securities',
    name: 'Chứng khoán',
    icon: '📊',
    color: '#06B6D4', // cyan
    taxMethod: 'flat',
    defaultTaxRate: 0.001,
    description: 'Mua bán cổ phiếu, trái phiếu',
  },
  {
    id: 'crypto',
    name: 'Crypto/NFT',
    icon: '₿',
    color: '#F97316', // orange
    taxMethod: 'flat',
    defaultTaxRate: 0.001,
    description: 'Bitcoin, Ethereum, NFT',
  },
  {
    id: 'content_creator',
    name: 'Content Creator',
    icon: '🎬',
    color: '#EF4444', // red
    taxMethod: 'flat',
    defaultTaxRate: 0.07,
    description: 'YouTube, TikTok, KOL, Affiliate',
  },
  {
    id: 'business',
    name: 'Kinh doanh',
    icon: '🏪',
    color: '#84CC16', // lime
    taxMethod: 'flat',
    defaultTaxRate: 0.015,
    description: 'Hộ kinh doanh, cá thể',
  },
  {
    id: 'real_estate',
    name: 'Bất động sản',
    icon: '🏡',
    color: '#A855F7', // purple
    taxMethod: 'flat',
    defaultTaxRate: 0.02,
    description: 'Chuyển nhượng nhà, đất',
  },
  {
    id: 'lottery',
    name: 'Trúng thưởng',
    icon: '🎰',
    color: '#F43F5E', // rose
    taxMethod: 'flat',
    defaultTaxRate: 0.10,
    description: 'Xổ số, casino, game show',
  },
  {
    id: 'inheritance',
    name: 'Thừa kế/Quà tặng',
    icon: '🎀',
    color: '#14B8A6', // teal
    taxMethod: 'flat',
    defaultTaxRate: 0.10,
    description: 'Nhận thừa kế, quà tặng > 10 triệu',
  },
  {
    id: 'other',
    name: 'Thu nhập khác',
    icon: '💰',
    color: '#6B7280', // gray
    taxMethod: 'flat',
    defaultTaxRate: 0.10,
    description: 'Các khoản thu nhập khác',
  },
];

// Single income entry
export interface IncomeEntry {
  id: string;
  category: IncomeCategory;
  description: string;
  amount: number;
  taxableAmount: number;
  taxAmount: number;
  month: number; // 1-12
  date?: Date;
  notes?: string;
}

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

// Result
export interface IncomeSummaryResult {
  // Totals
  totalGrossIncome: number;
  totalTaxableIncome: number;
  totalTax: number;
  effectiveTaxRate: number;

  // Net income
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

  // Entries
  totalEntries: number;
  entries: IncomeEntry[];
}

// Tax brackets for progressive tax (biểu 5 bậc - Luật 109/2025/QH15, từ 2026)
const TAX_BRACKETS_2026 = [
  { min: 0, max: 10_000_000, rate: 0.05 },
  { min: 10_000_000, max: 30_000_000, rate: 0.10 },
  { min: 30_000_000, max: 60_000_000, rate: 0.20 },
  { min: 60_000_000, max: 100_000_000, rate: 0.30 },
  { min: 100_000_000, max: Infinity, rate: 0.35 },
];

// Deductions (Nghị quyết 110/2025/UBTVQH15)
const DEDUCTIONS = {
  personal: 15_500_000, // 15.5 triệu/tháng từ 2026
  dependent: 6_200_000, // 6.2 triệu/người/tháng từ 2026
  insuranceRate: 0.105, // 10.5% BHXH
  insuranceCap: 46_800_000, // (không dùng - thay bằng getMaxSocialInsuranceSalary date-aware)
};

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
 * Calculate progressive tax on salary income
 */
function calculateProgressiveTax(annualTaxableIncome: number): number {
  // Biểu thuế lũy tiến là ngưỡng THÁNG -> quy đổi thu nhập năm về tháng,
  // tính thuế tháng rồi nhân 12 (đúng phương pháp tính thuế TNCN từ tiền lương).
  const monthlyTaxableIncome = Math.max(0, annualTaxableIncome) / 12;
  let monthlyTax = 0;
  let remaining = monthlyTaxableIncome;

  for (const bracket of TAX_BRACKETS_2026) {
    const taxableInBracket = Math.min(
      Math.max(0, remaining),
      bracket.max - bracket.min
    );
    monthlyTax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    if (remaining <= 0) break;
  }

  return Math.round(monthlyTax * 12);
}

/**
 * Main calculation function
 */
export function calculateIncomeSummary(input: IncomeSummaryInput): IncomeSummaryResult {
  const { year, entries, dependents, hasInsurance } = input;

  // Group entries by category
  const categoryMap = new Map<IncomeCategory, IncomeEntry[]>();
  const monthMap = new Map<number, IncomeEntry[]>();

  for (const entry of entries) {
    // By category
    const categoryEntries = categoryMap.get(entry.category) || [];
    categoryEntries.push(entry);
    categoryMap.set(entry.category, categoryEntries);

    // By month
    const monthEntries = monthMap.get(entry.month) || [];
    monthEntries.push(entry);
    monthMap.set(entry.month, monthEntries);
  }

  // Calculate totals
  let totalGrossIncome = 0;
  let totalTaxableIncome = 0;
  let totalTax = 0;

  // Calculate salary/bonus separately for progressive tax
  let salaryBonusIncome = 0;
  let otherIncome = 0;
  let otherTax = 0;

  // By category
  const byCategory: CategorySummary[] = [];

  for (const [category, catEntries] of categoryMap) {
    const config = getCategoryConfig(category);
    let categoryIncome = 0;
    let categoryTax = 0;

    for (const entry of catEntries) {
      categoryIncome += entry.amount;

      if (config.taxMethod === 'progressive') {
        // Will calculate later with deductions
        salaryBonusIncome += entry.amount;
      } else if (config.taxMethod === 'flat' && config.defaultTaxRate) {
        const tax = Math.round(entry.taxableAmount * config.defaultTaxRate);
        categoryTax += tax;
        otherIncome += entry.amount;
        otherTax += tax;
      }
    }

    totalGrossIncome += categoryIncome;

    byCategory.push({
      category,
      config,
      totalIncome: categoryIncome,
      totalTax: categoryTax,
      entries: catEntries.length,
      percentage: 0, // Will calculate after total
    });
  }

  // Calculate deductions for progressive income
  const monthlyDeduction = DEDUCTIONS.personal + (dependents * DEDUCTIONS.dependent);
  const annualDeduction = monthlyDeduction * 12;

  let insuranceDeduction = 0;
  if (hasInsurance && salaryBonusIncome > 0) {
    const monthlyInsurance = Math.min(salaryBonusIncome / 12, getMaxSocialInsuranceSalary()) * DEDUCTIONS.insuranceRate;
    insuranceDeduction = monthlyInsurance * 12;
  }

  const totalDeductions = annualDeduction + insuranceDeduction;

  // Calculate progressive tax on salary/bonus
  const salaryTaxableIncome = Math.max(0, salaryBonusIncome - totalDeductions);
  const salaryTax = calculateProgressiveTax(salaryTaxableIncome);

  // Update salary/bonus category tax
  for (const cat of byCategory) {
    if (cat.config.taxMethod === 'progressive') {
      // Distribute tax proportionally
      if (salaryBonusIncome > 0) {
        cat.totalTax = Math.round((cat.totalIncome / salaryBonusIncome) * salaryTax);
      }
    }
  }

  // Calculate totals
  totalTaxableIncome = salaryTaxableIncome + otherIncome;
  totalTax = salaryTax + otherTax;

  // Update percentages
  if (totalGrossIncome > 0) {
    for (const cat of byCategory) {
      cat.percentage = (cat.totalIncome / totalGrossIncome) * 100;
    }
  }

  // By month
  const byMonth: MonthlySummary[] = [];
  for (let month = 1; month <= 12; month++) {
    const monthEntries = monthMap.get(month) || [];
    let monthlyIncome = 0;
    let monthlyTax = 0;
    const categoryBreakdown: { category: IncomeCategory; amount: number; tax: number }[] = [];

    // Group by category within month
    const monthCategoryMap = new Map<IncomeCategory, { amount: number; tax: number }>();

    for (const entry of monthEntries) {
      monthlyIncome += entry.amount;
      monthlyTax += entry.taxAmount;

      const existing = monthCategoryMap.get(entry.category) || { amount: 0, tax: 0 };
      existing.amount += entry.amount;
      existing.tax += entry.taxAmount;
      monthCategoryMap.set(entry.category, existing);
    }

    for (const [category, data] of monthCategoryMap) {
      categoryBreakdown.push({ category, ...data });
    }

    byMonth.push({
      month,
      monthName: MONTH_NAMES[month - 1],
      totalIncome: monthlyIncome,
      totalTax: monthlyTax,
      entries: monthEntries.length,
      byCategory: categoryBreakdown,
    });
  }

  // Sort categories by income (descending)
  const sortedCategories = [...byCategory].sort((a, b) => b.totalIncome - a.totalIncome);
  const topCategories = sortedCategories.slice(0, 5);

  // Average monthly
  const monthsWithIncome = byMonth.filter(m => m.totalIncome > 0).length || 1;
  const averageMonthlyIncome = totalGrossIncome / monthsWithIncome;
  const averageMonthlyTax = totalTax / monthsWithIncome;

  // Effective tax rate
  const effectiveTaxRate = totalGrossIncome > 0
    ? (totalTax / totalGrossIncome) * 100
    : 0;

  return {
    totalGrossIncome,
    totalTaxableIncome,
    totalTax,
    effectiveTaxRate,
    totalNetIncome: totalGrossIncome - totalTax,
    deductions: {
      personal: DEDUCTIONS.personal * 12,
      dependent: DEDUCTIONS.dependent * dependents * 12,
      insurance: insuranceDeduction,
      total: totalDeductions,
    },
    byCategory: sortedCategories,
    byMonth,
    topCategories,
    averageMonthlyIncome: Math.round(averageMonthlyIncome),
    averageMonthlyTax: Math.round(averageMonthlyTax),
    totalEntries: entries.length,
    entries,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format short currency (e.g., 30M, 1.5B)
 */
export function formatShortCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
