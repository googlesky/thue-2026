/**
 * Household Business Tax Calculator for Vietnam
 * Reference: Luật Thuế TNCN sửa đổi 2025, Nghị định 123/2025/NĐ-CP
 *
 * Key Changes in 2026:
 * - Revenue threshold increased from 100M to 500M VND/year
 * - Below threshold: No tax, no business registration required
 * - Above threshold: Tax rates 1-5% depending on business type
 */

// Business categories
export type BusinessCategory =
  | 'distribution'      // Phân phối, cung cấp hàng hóa
  | 'services'          // Dịch vụ, xây dựng (không bao thầu NVL)
  | 'production'        // Sản xuất, vận tải, dịch vụ có liên quan hàng hóa
  | 'other';            // Hoạt động kinh doanh khác

// Business type
export interface HouseholdBusiness {
  id: string;
  name: string;
  category: BusinessCategory;
  monthlyRevenue: number;
  operatingMonths: number; // Số tháng hoạt động trong năm (1-12)
  hasBusinessLicense: boolean;
  notes?: string;
}

// Tax calculation input
export interface HouseholdBusinessTaxInput {
  businesses: HouseholdBusiness[];
  year: 2025 | 2026;
}

// Individual business result
export interface BusinessTaxResult {
  id: string;
  name: string;
  category: BusinessCategory;
  annualRevenue: number;
  isAboveThreshold: boolean;
  threshold: number;
  taxRate: number;
  vatRate: number;
  totalTaxRate: number;
  pitAmount: number;
  vatAmount: number;
  totalTax: number;
  netIncome: number;
  recommendation: string;
}

// Complete household business tax result
export interface HouseholdBusinessTaxResult {
  businesses: BusinessTaxResult[];
  summary: {
    totalAnnualRevenue: number;
    totalPIT: number;
    totalVAT: number;
    totalTax: number;
    totalNetIncome: number;
    businessesBelowThreshold: number;
    businessesAboveThreshold: number;
    threshold: number;
    year: number;
  };
}

// Revenue thresholds by year
export const REVENUE_THRESHOLDS = {
  2025: 100_000_000,  // 100 triệu/năm
  2026: 200_000_000,  // 200 triệu/năm (cập nhật theo quy định mới)
};

// Tax rates by business category (PIT)
// Reference: Circular 40/2021/TT-BTC, updated for 2026
export const PIT_RATES: Record<BusinessCategory, number> = {
  distribution: 0.005,    // 0.5% - Phân phối, cung cấp hàng hóa
  services: 0.02,         // 2% - Dịch vụ, xây dựng
  production: 0.015,      // 1.5% - Sản xuất, vận tải
  other: 0.01,            // 1% - Hoạt động khác
};

// VAT rates by business category
export const VAT_RATES: Record<BusinessCategory, number> = {
  distribution: 0.01,     // 1% - Phân phối, cung cấp hàng hóa
  services: 0.05,         // 5% - Dịch vụ, xây dựng
  production: 0.03,       // 3% - Sản xuất, vận tải
  other: 0.02,            // 2% - Hoạt động khác
};

// Business category labels
export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  distribution: 'Phân phối, cung cấp hàng hóa',
  services: 'Dịch vụ, xây dựng (không bao thầu NVL)',
  production: 'Sản xuất, vận tải, dịch vụ có liên quan hàng hóa',
  other: 'Hoạt động kinh doanh khác',
};

// Business category descriptions with examples
export const BUSINESS_CATEGORY_DESCRIPTIONS: Record<BusinessCategory, string> = {
  distribution: 'Bán lẻ, đại lý, phân phối sản phẩm (cửa hàng tạp hóa, shop online...)',
  services: 'Dịch vụ tư vấn, sửa chữa, xây dựng không bao thầu nguyên vật liệu',
  production: 'Sản xuất hàng hóa, xe ôm công nghệ, giao hàng, vận tải',
  other: 'Các hoạt động kinh doanh không thuộc nhóm trên',
};

/**
 * Get revenue threshold for a given year
 */
export function getRevenueThreshold(year: 2025 | 2026): number {
  return REVENUE_THRESHOLDS[year];
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Calculate tax for a single household business
 */
export function calculateBusinessTax(
  business: HouseholdBusiness,
  year: 2025 | 2026
): BusinessTaxResult {
  const annualRevenue = business.monthlyRevenue * business.operatingMonths;
  const threshold = getRevenueThreshold(year);
  const isAboveThreshold = annualRevenue > threshold;

  let pitRate = 0;
  let vatRate = 0;
  let pitAmount = 0;
  let vatAmount = 0;
  let recommendation = '';

  if (isAboveThreshold) {
    pitRate = PIT_RATES[business.category];
    vatRate = VAT_RATES[business.category];
    pitAmount = Math.round(annualRevenue * pitRate);
    vatAmount = Math.round(annualRevenue * vatRate);

    if (!business.hasBusinessLicense) {
      recommendation = 'Cần đăng ký kinh doanh và kê khai thuế định kỳ';
    } else {
      recommendation = 'Tiếp tục kê khai và nộp thuế theo quy định';
    }
  } else {
    recommendation = `Doanh thu dưới ${formatCurrency(threshold)}/năm - không phải đóng thuế, không cần đăng ký kinh doanh`;
  }

  const totalTaxRate = pitRate + vatRate;
  const totalTax = pitAmount + vatAmount;
  const netIncome = annualRevenue - totalTax;

  return {
    id: business.id,
    name: business.name,
    category: business.category,
    annualRevenue,
    isAboveThreshold,
    threshold,
    taxRate: pitRate * 100,
    vatRate: vatRate * 100,
    totalTaxRate: totalTaxRate * 100,
    pitAmount,
    vatAmount,
    totalTax,
    netIncome,
    recommendation,
  };
}

/**
 * Calculate complete household business tax
 */
export function calculateHouseholdBusinessTax(
  input: HouseholdBusinessTaxInput
): HouseholdBusinessTaxResult {
  // Calculate tax for each business
  const businessResults = input.businesses.map((b) =>
    calculateBusinessTax(b, input.year)
  );

  // Calculate summary
  const totalAnnualRevenue = businessResults.reduce(
    (sum, b) => sum + b.annualRevenue,
    0
  );
  const totalPIT = businessResults.reduce((sum, b) => sum + b.pitAmount, 0);
  const totalVAT = businessResults.reduce((sum, b) => sum + b.vatAmount, 0);
  const totalTax = totalPIT + totalVAT;
  const totalNetIncome = businessResults.reduce((sum, b) => sum + b.netIncome, 0);
  const businessesBelowThreshold = businessResults.filter(
    (b) => !b.isAboveThreshold
  ).length;
  const businessesAboveThreshold = businessResults.filter(
    (b) => b.isAboveThreshold
  ).length;

  return {
    businesses: businessResults,
    summary: {
      totalAnnualRevenue,
      totalPIT,
      totalVAT,
      totalTax,
      totalNetIncome,
      businessesBelowThreshold,
      businessesAboveThreshold,
      threshold: getRevenueThreshold(input.year),
      year: input.year,
    },
  };
}

/**
 * Create empty business
 */
export function createEmptyBusiness(): HouseholdBusiness {
  return {
    id: generateId(),
    name: '',
    category: 'distribution',
    monthlyRevenue: 0,
    operatingMonths: 12,
    hasBusinessLicense: false,
  };
}

/**
 * Format currency in VND
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Common business examples
 */
export const COMMON_BUSINESS_EXAMPLES = [
  {
    category: 'distribution' as BusinessCategory,
    examples: [
      'Cửa hàng tạp hóa',
      'Shop quần áo online',
      'Đại lý bán lẻ',
      'Bán hàng trên sàn TMĐT',
    ],
  },
  {
    category: 'services' as BusinessCategory,
    examples: [
      'Tiệm cắt tóc',
      'Dịch vụ sửa chữa',
      'Tư vấn, thiết kế',
      'Dịch vụ ăn uống (không bán thực phẩm)',
    ],
  },
  {
    category: 'production' as BusinessCategory,
    examples: [
      'Sản xuất bánh kẹo',
      'Xe ôm công nghệ (Grab, Be)',
      'Shipper giao hàng',
      'Xưởng may gia công',
    ],
  },
  {
    category: 'other' as BusinessCategory,
    examples: [
      'Cho thuê xe',
      'Dịch vụ quảng cáo',
      'Hoạt động trung gian',
    ],
  },
];

/**
 * Calculate monthly threshold
 */
export function getMonthlyThreshold(year: 2025 | 2026): number {
  return Math.round(getRevenueThreshold(year) / 12);
}

/**
 * Check if business needs to register
 */
export function needsBusinessRegistration(
  annualRevenue: number,
  year: 2025 | 2026
): boolean {
  return annualRevenue > getRevenueThreshold(year);
}

/**
 * Compare tax between years
 */
export function compareTaxBetweenYears(
  business: HouseholdBusiness
): {
  tax2025: BusinessTaxResult;
  tax2026: BusinessTaxResult;
  savings: number;
  savingsPercentage: number;
} {
  const tax2025 = calculateBusinessTax(business, 2025);
  const tax2026 = calculateBusinessTax(business, 2026);
  const savings = tax2025.totalTax - tax2026.totalTax;
  const savingsPercentage =
    tax2025.totalTax > 0 ? (savings / tax2025.totalTax) * 100 : 0;

  return {
    tax2025,
    tax2026,
    savings,
    savingsPercentage: Math.round(savingsPercentage * 100) / 100,
  };
}
