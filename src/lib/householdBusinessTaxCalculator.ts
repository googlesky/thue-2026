/**
 * Household Business Tax Calculator for Vietnam
 * Reference: Luật Thuế TNCN số 109/2025/QH15
 *
 * Key Changes in 2026:
 * - Revenue threshold increased from 100M to 500M VND/year
 * - Below threshold: No PIT, no VAT, no business registration required
 * - Above threshold: Two methods available:
 *   1. Khoán (Revenue-based): % × (Revenue - 500M threshold)
 *   2. Thu nhập (Income-based): 15%/17%/20% × (Revenue - Expenses)
 * - VAT calculated on entire revenue when above threshold (not deductible)
 */

// Business categories
export type BusinessCategory =
  | 'distribution'      // Phân phối, cung cấp hàng hóa
  | 'services'          // Dịch vụ, xây dựng (không bao thầu NVL)
  | 'production'        // Sản xuất, vận tải, dịch vụ có liên quan hàng hóa
  | 'other';            // Hoạt động kinh doanh khác

// Tax calculation method for 2026
// Reference: Điều 7 Luật 109/2025/QH15
export type TaxMethod =
  | 'khoan'             // Phương pháp khoán: % × (Doanh thu - Ngưỡng 500tr)
  | 'income';           // Phương pháp thu nhập: 15%/17%/20% × (Doanh thu - Chi phí)

// Business type
export interface HouseholdBusiness {
  id: string;
  name: string;
  category: BusinessCategory;
  monthlyRevenue: number;
  monthlyExpenses: number; // Chi phí hàng tháng (cho phương pháp thu nhập)
  operatingMonths: number; // Số tháng hoạt động trong năm (1-12)
  hasBusinessLicense: boolean;
  applyThresholdDeduction: boolean; // Áp dụng trừ ngưỡng 500tr cho hoạt động này
  notes?: string;
}

// Tax calculation input
export interface HouseholdBusinessTaxInput {
  businesses: HouseholdBusiness[];
  year: 2025 | 2026;
  taxMethod: TaxMethod; // Phương pháp tính thuế (chỉ áp dụng cho 2026)
}

// Individual business result
export interface BusinessTaxResult {
  id: string;
  name: string;
  category: BusinessCategory;
  annualRevenue: number;
  annualExpenses: number;
  taxableIncome: number; // Thu nhập chịu thuế (DT - CP hoặc DT - ngưỡng)
  isAboveThreshold: boolean;
  threshold: number;
  thresholdDeduction: number; // Phần ngưỡng được trừ cho hoạt động này
  taxMethod: TaxMethod;
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
    totalAnnualExpenses: number;
    totalTaxableIncome: number;
    totalPIT: number;
    totalVAT: number;
    totalTax: number;
    totalNetIncome: number;
    businessesBelowThreshold: number;
    businessesAboveThreshold: number;
    threshold: number;
    thresholdUsed: number; // Tổng ngưỡng đã sử dụng (max 500tr)
    year: number;
    taxMethod: TaxMethod;
  };
}

// Revenue thresholds by year (ngưỡng doanh thu miễn thuế)
// Reference: Luật Thuế TNCN sửa đổi 2025, Nghị quyết 198/2025/QH15
export const REVENUE_THRESHOLDS = {
  2025: 100_000_000,  // 100 triệu/năm
  2026: 500_000_000,  // 500 triệu/năm (từ 01/01/2026)
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

// Income tax brackets for 2026 (phương pháp thu nhập)
// Reference: Điều 7, khoản 2 Luật 109/2025/QH15
export const INCOME_TAX_BRACKETS_2026 = [
  { min: 500_000_000, max: 3_000_000_000, rate: 0.15 },   // 500tr - 3 tỷ: 15%
  { min: 3_000_000_000, max: 50_000_000_000, rate: 0.17 }, // 3 tỷ - 50 tỷ: 17%
  { min: 50_000_000_000, max: Infinity, rate: 0.20 },      // Trên 50 tỷ: 20%
];

// Tax method labels
export const TAX_METHOD_LABELS: Record<TaxMethod, string> = {
  khoan: 'Phương pháp khoán (% doanh thu)',
  income: 'Phương pháp thu nhập (% lợi nhuận)',
};

// Tax method descriptions
export const TAX_METHOD_DESCRIPTIONS: Record<TaxMethod, string> = {
  khoan: 'Thuế TNCN = (Doanh thu - 500 triệu) × Thuế suất ngành (0.5% - 5%). Không cần chứng từ chi phí.',
  income: 'Thuế TNCN = (Doanh thu - Chi phí) × 15%/17%/20%. Cần có hóa đơn, chứng từ chi phí hợp lệ.',
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
 * Get income tax rate for 2026 based on annual revenue
 * Reference: Điều 7, khoản 2 Luật 109/2025/QH15
 */
export function getIncomeTaxRate2026(annualRevenue: number): number {
  for (const bracket of INCOME_TAX_BRACKETS_2026) {
    if (annualRevenue > bracket.min && annualRevenue <= bracket.max) {
      return bracket.rate;
    }
  }
  // Default to highest rate if above all brackets
  if (annualRevenue > 50_000_000_000) {
    return 0.20;
  }
  return 0;
}

/**
 * Get income tax bracket label
 */
export function getIncomeTaxBracketLabel(annualRevenue: number): string {
  if (annualRevenue <= 500_000_000) {
    return 'Dưới ngưỡng - Miễn thuế';
  }
  if (annualRevenue <= 3_000_000_000) {
    return '500 triệu - 3 tỷ: 15%';
  }
  if (annualRevenue <= 50_000_000_000) {
    return '3 tỷ - 50 tỷ: 17%';
  }
  return 'Trên 50 tỷ: 20%';
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Calculate tax for a single household business
 * Updated for Luật 109/2025/QH15
 */
export function calculateBusinessTax(
  business: HouseholdBusiness,
  year: 2025 | 2026,
  totalAnnualRevenue: number,
  taxMethod: TaxMethod = 'khoan',
  thresholdDeduction: number = 0 // Phần ngưỡng 500tr được trừ cho hoạt động này
): BusinessTaxResult {
  const annualRevenue = business.monthlyRevenue * business.operatingMonths;
  const annualExpenses = business.monthlyExpenses * business.operatingMonths;
  const threshold = getRevenueThreshold(year);
  const isAboveThreshold = totalAnnualRevenue > threshold;

  let pitRate = 0;
  let vatRate = 0;
  let pitAmount = 0;
  let vatAmount = 0;
  let taxableIncome = 0;
  let recommendation = '';
  let effectiveTaxMethod: TaxMethod = taxMethod;

  if (isAboveThreshold) {
    vatRate = VAT_RATES[business.category];
    // VAT tính trên toàn bộ doanh thu khi vượt ngưỡng (không được trừ)
    // Reference: Luật thuế GTGT sửa đổi 2025
    vatAmount = Math.round(annualRevenue * vatRate);

    if (year === 2026) {
      if (taxMethod === 'income') {
        // Phương pháp thu nhập: Thuế = (Doanh thu - Chi phí) × 15%/17%/20%
        // Reference: Điều 7, khoản 2 Luật 109/2025/QH15
        taxableIncome = Math.max(0, annualRevenue - annualExpenses);
        pitRate = getIncomeTaxRate2026(totalAnnualRevenue);
        pitAmount = Math.round(taxableIncome * pitRate);
        recommendation = 'Phương pháp thu nhập: Cần lưu giữ hóa đơn, chứng từ chi phí hợp lệ';
      } else {
        // Phương pháp khoán: Thuế = (Doanh thu - Ngưỡng 500tr) × Thuế suất ngành
        // Reference: Điều 7, khoản 3 Luật 109/2025/QH15
        pitRate = PIT_RATES[business.category];
        taxableIncome = Math.max(0, annualRevenue - thresholdDeduction);
        pitAmount = Math.round(taxableIncome * pitRate);
        effectiveTaxMethod = 'khoan';
        recommendation = 'Phương pháp khoán: Thuế tính trên doanh thu vượt ngưỡng';
      }
    } else {
      // Năm 2025: Thuế = Doanh thu × Thuế suất (trên toàn bộ doanh thu)
      pitRate = PIT_RATES[business.category];
      taxableIncome = annualRevenue;
      pitAmount = Math.round(annualRevenue * pitRate);
      effectiveTaxMethod = 'khoan';
      recommendation = 'Thuế khoán tính trên toàn bộ doanh thu';
    }

    if (!business.hasBusinessLicense) {
      recommendation += '. Cần đăng ký kinh doanh và kê khai thuế định kỳ';
    }
  } else {
    recommendation = `Doanh thu dưới ${formatCurrency(threshold)}/năm - không phải đóng thuế TNCN và GTGT, không cần đăng ký kinh doanh`;
  }

  const totalTaxRate = pitRate + vatRate;
  const totalTax = pitAmount + vatAmount;
  const netIncome = annualRevenue - annualExpenses - totalTax;

  return {
    id: business.id,
    name: business.name,
    category: business.category,
    annualRevenue,
    annualExpenses,
    taxableIncome,
    isAboveThreshold,
    threshold,
    thresholdDeduction,
    taxMethod: effectiveTaxMethod,
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
 * Updated for Luật 109/2025/QH15
 */
export function calculateHouseholdBusinessTax(
  input: HouseholdBusinessTaxInput
): HouseholdBusinessTaxResult {
  const { businesses, year, taxMethod } = input;
  const threshold = getRevenueThreshold(year);

  // Calculate total annual revenue first (threshold applies to total)
  const totalAnnualRevenue = businesses.reduce(
    (sum, b) => sum + b.monthlyRevenue * b.operatingMonths,
    0
  );

  const totalAnnualExpenses = businesses.reduce(
    (sum, b) => sum + b.monthlyExpenses * b.operatingMonths,
    0
  );

  const isAboveThreshold = totalAnnualRevenue > threshold;

  // Calculate threshold deduction for each business
  // Luật cho phép người nộp thuế TỰ CHỌN hoạt động nào được trừ ngưỡng 500tr
  // Tổng không quá 500tr cho tất cả hoạt động
  let remainingThreshold = isAboveThreshold && year === 2026 && taxMethod === 'khoan'
    ? threshold
    : 0;

  // Sort businesses by applyThresholdDeduction (prioritize those that want deduction)
  // and then by revenue (highest first to maximize benefit)
  const sortedBusinesses = [...businesses].sort((a, b) => {
    if (a.applyThresholdDeduction !== b.applyThresholdDeduction) {
      return a.applyThresholdDeduction ? -1 : 1;
    }
    return (b.monthlyRevenue * b.operatingMonths) - (a.monthlyRevenue * a.operatingMonths);
  });

  // Calculate threshold deduction for each business
  const thresholdDeductions = new Map<string, number>();

  for (const business of sortedBusinesses) {
    const annualRevenue = business.monthlyRevenue * business.operatingMonths;

    if (business.applyThresholdDeduction && remainingThreshold > 0) {
      // Trừ tối đa bằng doanh thu của hoạt động đó
      const deduction = Math.min(remainingThreshold, annualRevenue);
      thresholdDeductions.set(business.id, deduction);
      remainingThreshold -= deduction;
    } else {
      thresholdDeductions.set(business.id, 0);
    }
  }

  // If no business is marked for deduction but we're above threshold,
  // distribute proportionally (backward compatibility)
  const totalSelectedDeduction = Array.from(thresholdDeductions.values()).reduce((a, b) => a + b, 0);
  if (isAboveThreshold && year === 2026 && taxMethod === 'khoan' && totalSelectedDeduction === 0) {
    // Phân bổ theo tỷ lệ doanh thu
    for (const business of businesses) {
      const annualRevenue = business.monthlyRevenue * business.operatingMonths;
      const proportionalDeduction = totalAnnualRevenue > 0
        ? (threshold * annualRevenue) / totalAnnualRevenue
        : 0;
      thresholdDeductions.set(business.id, proportionalDeduction);
    }
  }

  // Calculate tax for each business
  const businessResults = businesses.map((b) =>
    calculateBusinessTax(
      b,
      year,
      totalAnnualRevenue,
      taxMethod,
      thresholdDeductions.get(b.id) || 0
    )
  );

  // Calculate summary
  const totalPIT = businessResults.reduce((sum, b) => sum + b.pitAmount, 0);
  const totalVAT = businessResults.reduce((sum, b) => sum + b.vatAmount, 0);
  const totalTax = totalPIT + totalVAT;
  const totalNetIncome = businessResults.reduce((sum, b) => sum + b.netIncome, 0);
  const totalTaxableIncome = businessResults.reduce((sum, b) => sum + b.taxableIncome, 0);
  const thresholdUsed = Array.from(thresholdDeductions.values()).reduce((a, b) => a + b, 0);
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
      totalAnnualExpenses,
      totalTaxableIncome,
      totalPIT,
      totalVAT,
      totalTax,
      totalNetIncome,
      businessesBelowThreshold,
      businessesAboveThreshold,
      threshold,
      thresholdUsed,
      year,
      taxMethod,
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
    monthlyExpenses: 0,
    operatingMonths: 12,
    hasBusinessLicense: false,
    applyThresholdDeduction: true, // Mặc định áp dụng trừ ngưỡng
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
  business: HouseholdBusiness,
  taxMethod2026: TaxMethod = 'khoan'
): {
  tax2025: BusinessTaxResult;
  tax2026Khoan: BusinessTaxResult;
  tax2026Income: BusinessTaxResult;
  savings: number;
  savingsPercentage: number;
  bestMethod2026: TaxMethod;
} {
  const totalAnnualRevenue = business.monthlyRevenue * business.operatingMonths;
  const threshold2026 = getRevenueThreshold(2026);

  // Calculate 2025 tax
  const tax2025 = calculateBusinessTax(business, 2025, totalAnnualRevenue, 'khoan', 0);

  // Calculate 2026 tax with both methods
  const thresholdDeduction = business.applyThresholdDeduction
    ? Math.min(threshold2026, totalAnnualRevenue)
    : 0;

  const tax2026Khoan = calculateBusinessTax(
    business,
    2026,
    totalAnnualRevenue,
    'khoan',
    thresholdDeduction
  );

  const tax2026Income = calculateBusinessTax(
    business,
    2026,
    totalAnnualRevenue,
    'income',
    0
  );

  // Determine best method (lowest total tax)
  const bestMethod2026: TaxMethod = tax2026Khoan.totalTax <= tax2026Income.totalTax
    ? 'khoan'
    : 'income';

  const bestTax2026 = bestMethod2026 === 'khoan' ? tax2026Khoan : tax2026Income;
  const savings = tax2025.totalTax - bestTax2026.totalTax;
  const savingsPercentage =
    tax2025.totalTax > 0 ? (savings / tax2025.totalTax) * 100 : 0;

  return {
    tax2025,
    tax2026Khoan,
    tax2026Income,
    savings,
    savingsPercentage: Math.round(savingsPercentage * 100) / 100,
    bestMethod2026,
  };
}

/**
 * Compare tax methods for 2026
 * Helps user choose the best tax method
 */
export function compareTaxMethods2026(
  businesses: HouseholdBusiness[]
): {
  khoanResult: HouseholdBusinessTaxResult;
  incomeResult: HouseholdBusinessTaxResult;
  recommendedMethod: TaxMethod;
  savings: number;
  explanation: string;
} {
  const khoanResult = calculateHouseholdBusinessTax({
    businesses,
    year: 2026,
    taxMethod: 'khoan',
  });

  const incomeResult = calculateHouseholdBusinessTax({
    businesses,
    year: 2026,
    taxMethod: 'income',
  });

  const khoanTax = khoanResult.summary.totalTax;
  const incomeTax = incomeResult.summary.totalTax;
  const savings = Math.abs(khoanTax - incomeTax);

  let recommendedMethod: TaxMethod;
  let explanation: string;

  if (khoanTax <= incomeTax) {
    recommendedMethod = 'khoan';
    explanation = `Phương pháp khoán có lợi hơn ${formatCurrency(savings)}. Không cần chứng từ chi phí.`;
  } else {
    recommendedMethod = 'income';
    explanation = `Phương pháp thu nhập có lợi hơn ${formatCurrency(savings)}. Cần lưu giữ hóa đơn chi phí hợp lệ.`;
  }

  // Check if income method is available (revenue > 500M to 3B)
  const totalRevenue = khoanResult.summary.totalAnnualRevenue;
  if (totalRevenue <= 500_000_000) {
    explanation = 'Doanh thu dưới ngưỡng - Miễn thuế hoàn toàn.';
  } else if (totalRevenue > 3_000_000_000) {
    explanation = `Doanh thu trên 3 tỷ - Phương pháp khoán không khả dụng, bắt buộc dùng phương pháp thu nhập.`;
    recommendedMethod = 'income';
  }

  return {
    khoanResult,
    incomeResult,
    recommendedMethod,
    savings,
    explanation,
  };
}
