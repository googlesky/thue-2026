/**
 * Content Creator Tax Calculator
 * Tính thuế cho YouTuber, TikToker, KOL, Affiliate Marketing
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 2025 (có hiệu lực 1/7/2026)
 * - Thông tư 111/2013/TT-BTC (khấu trừ tại nguồn)
 * - Nghị định 125/2020/NĐ-CP (xử phạt vi phạm)
 *
 * Quy định chính:
 * - Ngưỡng miễn thuế 2026: 500 triệu/năm
 * - Thuế suất: GTGT 5% + TNCN 2% = 7%
 * - Khấu trừ tại nguồn: 10% cho thu nhập >= 2 triệu/lần (nền tảng VN)
 */

// Platform types
export type PlatformType = 'domestic' | 'foreign';

export interface Platform {
  id: string;
  name: string;
  type: PlatformType;
  icon: string;
  description: string;
  withholdingRate: number | null; // null = tự kê khai
}

// Predefined platforms
export const PLATFORMS: Platform[] = [
  // Domestic platforms (khấu trừ 10%)
  {
    id: 'shopee',
    name: 'Shopee Affiliate',
    type: 'domestic',
    icon: '🛒',
    description: 'Tiếp thị liên kết Shopee',
    withholdingRate: 0.10,
  },
  {
    id: 'lazada',
    name: 'Lazada Affiliate',
    type: 'domestic',
    icon: '🛍️',
    description: 'Tiếp thị liên kết Lazada',
    withholdingRate: 0.10,
  },
  {
    id: 'tiki',
    name: 'Tiki Affiliate',
    type: 'domestic',
    icon: '📦',
    description: 'Tiếp thị liên kết Tiki',
    withholdingRate: 0.10,
  },
  {
    id: 'sendo',
    name: 'Sendo Affiliate',
    type: 'domestic',
    icon: '🏪',
    description: 'Tiếp thị liên kết Sendo',
    withholdingRate: 0.10,
  },
  // Foreign platforms (tự kê khai)
  {
    id: 'youtube',
    name: 'YouTube',
    type: 'foreign',
    icon: '📺',
    description: 'Thu nhập từ quảng cáo, Super Chat, Membership',
    withholdingRate: null,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    type: 'foreign',
    icon: '🎵',
    description: 'Thu nhập từ Creator Fund, LIVE, Affiliate',
    withholdingRate: null,
  },
  {
    id: 'facebook',
    name: 'Facebook/Meta',
    type: 'foreign',
    icon: '👤',
    description: 'Thu nhập từ quảng cáo, Stars, Reels',
    withholdingRate: null,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    type: 'foreign',
    icon: '📷',
    description: 'Thu nhập từ Reels Bonus, Brand deals',
    withholdingRate: null,
  },
  {
    id: 'twitch',
    name: 'Twitch',
    type: 'foreign',
    icon: '🎮',
    description: 'Thu nhập từ Subscription, Bits, Ads',
    withholdingRate: null,
  },
  {
    id: 'patreon',
    name: 'Patreon',
    type: 'foreign',
    icon: '❤️',
    description: 'Thu nhập từ người hâm mộ',
    withholdingRate: null,
  },
  {
    id: 'other',
    name: 'Khác',
    type: 'foreign',
    icon: '🌐',
    description: 'Nền tảng khác',
    withholdingRate: null,
  },
];

// Tax configuration
export const CONTENT_CREATOR_TAX_CONFIG = {
  // Ngưỡng miễn thuế
  thresholds: {
    year2025: 100_000_000, // 100 triệu/năm (trước 2026)
    year2026: 1_000_000_000, // 1 tỷ/năm (Nghị định 141/2026/NĐ-CP, từ 01/01/2026)
  },

  // Thuế suất cho cá nhân kinh doanh
  rates: {
    vat: 0.05,      // 5% GTGT
    pit: 0.02,      // 2% TNCN
    total: 0.07,    // Tổng 7%
  },

  // Khấu trừ tại nguồn
  withholding: {
    rate: 0.10,     // 10%
    threshold: 2_000_000, // >= 2 triệu/lần
  },

  // Ngày hiệu lực luật mới
  newLawEffectiveDate: new Date('2026-07-01'),
};

// Income entry for a platform
export interface PlatformIncome {
  platformId: string;
  monthlyIncome: number[];  // 12 months
  totalIncome: number;
  withheldTax: number;      // Thuế đã khấu trừ tại nguồn
}

// Calculator input
export interface ContentCreatorInput {
  year: number;
  platforms: PlatformIncome[];
  hasOtherIncome: boolean;  // Có thu nhập khác không (ảnh hưởng ngưỡng)
  isRegisteredBusiness: boolean; // Đã đăng ký hộ kinh doanh chưa
}

// Tax calculation result
export interface ContentCreatorTaxResult {
  // Tổng thu nhập
  totalIncome: number;
  totalIncomeByPlatform: { platformId: string; platformName: string; amount: number }[];

  // Ngưỡng miễn thuế
  threshold: number;
  isExempt: boolean;
  taxableIncome: number;

  // Thuế tính
  vatAmount: number;
  pitAmount: number;
  totalTaxDue: number;

  // Thuế đã khấu trừ
  totalWithheld: number;
  remainingTax: number; // Còn phải nộp

  // Thông tin bổ sung
  effectiveTaxRate: number;
  monthlyBreakdown: MonthlyBreakdown[];
  recommendations: Recommendation[];
}

export interface MonthlyBreakdown {
  month: number;
  income: number;
  vatDue: number;
  pitDue: number;
  withheld: number;
  netTax: number;
}

export interface Recommendation {
  id: string;
  type: 'warning' | 'info' | 'tip';
  title: string;
  description: string;
}

/**
 * Get threshold based on year
 */
export function getThreshold(year: number): number {
  return year >= 2026
    ? CONTENT_CREATOR_TAX_CONFIG.thresholds.year2026
    : CONTENT_CREATOR_TAX_CONFIG.thresholds.year2025;
}

/**
 * Get platform by ID
 */
export function getPlatformById(id: string): Platform | undefined {
  return PLATFORMS.find(p => p.id === id);
}

/**
 * Calculate withholding tax for domestic platform
 */
function calculateWithholding(income: number, platform: Platform): number {
  if (platform.type === 'foreign' || platform.withholdingRate === null) {
    return 0;
  }

  // Chỉ khấu trừ nếu >= 2 triệu/lần
  if (income >= CONTENT_CREATOR_TAX_CONFIG.withholding.threshold) {
    return income * platform.withholdingRate;
  }

  return 0;
}

/**
 * Generate recommendations based on situation
 */
function generateRecommendations(
  input: ContentCreatorInput,
  result: Partial<ContentCreatorTaxResult>
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const threshold = getThreshold(input.year);

  // Check if close to threshold
  if (result.totalIncome && result.totalIncome > threshold * 0.8 && result.totalIncome < threshold) {
    recommendations.push({
      id: 'near-threshold',
      type: 'warning',
      title: 'Gần ngưỡng chịu thuế',
      description: `Thu nhập của bạn đang gần ngưỡng ${formatCurrency(threshold)}/năm. Nếu vượt ngưỡng, bạn sẽ phải nộp thuế 7% trên toàn bộ doanh thu.`,
    });
  }

  // Check for foreign platform income
  const foreignIncome = input.platforms
    .filter(p => {
      const platform = getPlatformById(p.platformId);
      return platform?.type === 'foreign';
    })
    .reduce((sum, p) => sum + p.totalIncome, 0);

  if (foreignIncome > 0) {
    recommendations.push({
      id: 'foreign-platform',
      type: 'info',
      title: 'Thu nhập từ nền tảng nước ngoài',
      description: 'Thu nhập từ YouTube, TikTok, Facebook không được khấu trừ tại nguồn. Bạn cần tự kê khai và nộp thuế theo quy định.',
    });
  }

  // Check for high withholding
  if (result.totalWithheld && result.totalWithheld > 0 && result.remainingTax && result.remainingTax < 0) {
    recommendations.push({
      id: 'overpaid',
      type: 'tip',
      title: 'Có thể được hoàn thuế',
      description: `Bạn đã bị khấu trừ ${formatCurrency(result.totalWithheld)} nhưng thuế thực tế chỉ ${formatCurrency(result.totalTaxDue || 0)}. Có thể làm hồ sơ hoàn thuế.`,
    });
  }

  // Recommend business registration
  if (!input.isRegisteredBusiness && result.totalIncome && result.totalIncome > threshold) {
    recommendations.push({
      id: 'register-business',
      type: 'tip',
      title: 'Cân nhắc đăng ký hộ kinh doanh',
      description: 'Đăng ký hộ kinh doanh giúp quản lý thuế minh bạch hơn và có thể được hưởng các ưu đãi thuế.',
    });
  }

  // Deadline reminder
  recommendations.push({
    id: 'deadline',
    type: 'info',
    title: 'Mốc kê khai quan trọng',
    description: 'Kê khai thuế quý: Ngày 30 tháng đầu quý sau. Quyết toán năm: 31/03 năm sau.',
  });

  return recommendations;
}

/**
 * Main calculation function
 */
export function calculateContentCreatorTax(input: ContentCreatorInput): ContentCreatorTaxResult {
  const threshold = getThreshold(input.year);
  const { rates } = CONTENT_CREATOR_TAX_CONFIG;

  // Calculate total income and withheld tax
  let totalIncome = 0;
  let totalWithheld = 0;
  const totalIncomeByPlatform: { platformId: string; platformName: string; amount: number }[] = [];

  for (const platformIncome of input.platforms) {
    const platform = getPlatformById(platformIncome.platformId);
    if (!platform) continue;

    totalIncome += platformIncome.totalIncome;
    totalWithheld += platformIncome.withheldTax;

    totalIncomeByPlatform.push({
      platformId: platformIncome.platformId,
      platformName: platform.name,
      amount: platformIncome.totalIncome,
    });
  }

  // Check exemption
  const isExempt = totalIncome <= threshold;
  const taxableIncome = isExempt ? 0 : totalIncome;

  // Calculate tax
  const vatAmount = isExempt ? 0 : taxableIncome * rates.vat;
  const pitAmount = isExempt ? 0 : taxableIncome * rates.pit;
  const totalTaxDue = vatAmount + pitAmount;
  const remainingTax = totalTaxDue - totalWithheld;

  // Effective tax rate
  const effectiveTaxRate = totalIncome > 0 ? (totalTaxDue / totalIncome) * 100 : 0;

  // Monthly breakdown
  const monthlyBreakdown: MonthlyBreakdown[] = [];
  for (let month = 1; month <= 12; month++) {
    let monthIncome = 0;
    let monthWithheld = 0;

    for (const platformIncome of input.platforms) {
      const monthlyValue = platformIncome.monthlyIncome[month - 1] || 0;
      monthIncome += monthlyValue;

      const platform = getPlatformById(platformIncome.platformId);
      if (platform) {
        monthWithheld += calculateWithholding(monthlyValue, platform);
      }
    }

    const monthVat = isExempt ? 0 : monthIncome * rates.vat;
    const monthPit = isExempt ? 0 : monthIncome * rates.pit;

    monthlyBreakdown.push({
      month,
      income: monthIncome,
      vatDue: monthVat,
      pitDue: monthPit,
      withheld: monthWithheld,
      netTax: monthVat + monthPit - monthWithheld,
    });
  }

  // Build partial result for recommendations
  const partialResult = {
    totalIncome,
    totalWithheld,
    totalTaxDue,
    remainingTax,
  };

  const recommendations = generateRecommendations(input, partialResult);

  return {
    totalIncome,
    totalIncomeByPlatform,
    threshold,
    isExempt,
    taxableIncome,
    vatAmount,
    pitAmount,
    totalTaxDue,
    totalWithheld,
    remainingTax,
    effectiveTaxRate,
    monthlyBreakdown,
    recommendations,
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
 * Get month name in Vietnamese
 */
export function getMonthName(month: number): string {
  return `Tháng ${month}`;
}

/**
 * Calculate quarterly summary
 */
export function getQuarterlySummary(monthlyBreakdown: MonthlyBreakdown[]): {
  quarter: number;
  income: number;
  tax: number;
  withheld: number;
  deadline: string;
}[] {
  const quarters = [
    { quarter: 1, months: [1, 2, 3], deadline: '30/04' },
    { quarter: 2, months: [4, 5, 6], deadline: '30/07' },
    { quarter: 3, months: [7, 8, 9], deadline: '30/10' },
    { quarter: 4, months: [10, 11, 12], deadline: '30/01 năm sau' },
  ];

  return quarters.map(q => {
    const monthData = monthlyBreakdown.filter(m => q.months.includes(m.month));
    return {
      quarter: q.quarter,
      income: monthData.reduce((sum, m) => sum + m.income, 0),
      tax: monthData.reduce((sum, m) => sum + m.vatDue + m.pitDue, 0),
      withheld: monthData.reduce((sum, m) => sum + m.withheld, 0),
      deadline: q.deadline,
    };
  });
}
