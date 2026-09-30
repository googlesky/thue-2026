/**
 * Thuế hộ kinh doanh, cá nhân kinh doanh cư trú
 *
 * Căn cứ:
 * - Luật Thuế TNCN 109/2025/QH15 Điều 7 (khoản 1 sửa đổi bởi Luật 09/2026/QH16 Điều 1)
 * - Luật Thuế GTGT 48/2024/QH15 Điều 12.2 (tỷ lệ % trên doanh thu); khoản 25 Điều 5 sửa bởi Luật 09/2026/QH16
 * - NĐ 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP: ngưỡng 01 tỷ đồng), TT 18/2026/TT-BTC
 * - Phụ lục danh mục ngành, nghề NĐ 253/2026/NĐ-CP
 *
 * Từ kỳ tính thuế 2026 (bỏ thuế khoán từ 01/01/2026):
 * - Tổng doanh thu năm ≤ 1 tỷ: không nộp TNCN, GTGT; thông báo doanh thu (Mẫu 01/TKN-CNKD) chậm nhất 31/01 năm sau.
 * - Trên 1 tỷ: GTGT = toàn bộ doanh thu × tỷ lệ ngành; TNCN theo
 *   + phương pháp thu nhập (bắt buộc khi DT > 3 tỷ): (DT − chi phí) × 15%/17%/20%
 *   + phương pháp tỷ lệ (chỉ được chọn khi 1 tỷ < DT ≤ 3 tỷ): (DT − 1 tỷ) × tỷ lệ ngành
 * Năm 2025: ngưỡng 100 triệu, thuế khoán trên toàn bộ doanh thu (chỉ dùng để so sánh).
 */

// Nhóm ngành (Luật 109/2025 Điều 7.3; Phụ lục NĐ 253/2026)
export type BusinessCategory =
  | 'distribution'      // Phân phối, cung cấp hàng hóa
  | 'services'          // Dịch vụ, xây dựng không bao thầu NVL
  | 'rental_agency'     // Cho thuê tài sản (trừ BĐS), đại lý bảo hiểm, xổ số, bán hàng đa cấp
  | 'production'        // Sản xuất, vận tải, dịch vụ gắn với hàng hóa, xây dựng có bao thầu NVL
  | 'digital_content'   // Nội dung thông tin số: giải trí, trò chơi, phim, ảnh, nhạc số, quảng cáo số
  | 'other';            // Hoạt động kinh doanh khác

// Phương pháp tính TNCN. Key 'khoan' giữ để tương thích; từ 2026 là phương pháp
// tỷ lệ % trên doanh thu (Luật Điều 7.3), nhãn "khoán" chỉ đúng cho năm 2025.
export type TaxMethod =
  | 'khoan'             // Tỷ lệ % × (Doanh thu − ngưỡng)
  | 'income';           // (Doanh thu − Chi phí) × 15%/17%/20%

export interface HouseholdBusiness {
  id: string;
  name: string;
  category: BusinessCategory;
  monthlyRevenue: number;
  monthlyExpenses: number; // Chi phí hàng tháng (cho phương pháp thu nhập)
  operatingMonths: number; // Số tháng hoạt động trong năm (1-12)
  hasBusinessLicense: boolean;
  notes?: string;
}

export interface HouseholdBusinessTaxInput {
  businesses: HouseholdBusiness[];
  year: 2025 | 2026;
  taxMethod: TaxMethod; // Phương pháp người nộp thuế chọn (chỉ áp dụng từ 2026)
}

export interface BusinessTaxResult {
  id: string;
  name: string;
  category: BusinessCategory;
  annualRevenue: number;
  annualExpenses: number;
  taxableIncome: number; // Doanh thu tính thuế (tỷ lệ) hoặc thu nhập tính thuế (thu nhập)
  isAboveThreshold: boolean;
  threshold: number;
  thresholdDeduction: number; // Phần ngưỡng được trừ cho hoạt động này
  taxMethod: TaxMethod; // Phương pháp thực tế áp dụng
  taxRate: number; // %
  vatRate: number; // %
  totalTaxRate: number; // %
  pitAmount: number;
  vatAmount: number;
  totalTax: number;
  netIncome: number;
  recommendation: string;
}

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
    threshold: number;
    thresholdUsed: number; // Tổng ngưỡng đã trừ (tối đa bằng ngưỡng)
    year: number;
    taxMethod: TaxMethod; // Phương pháp thực tế áp dụng (DT > 3 tỷ luôn là 'income')
  };
}

// Ngưỡng doanh thu năm không phải nộp TNCN, GTGT
export const REVENUE_THRESHOLDS = {
  2025: 100_000_000,
  2026: 1_000_000_000, // Luật 09/2026/QH16 + NĐ 141/2026/NĐ-CP, từ kỳ tính thuế 2026
};

// Chỉ được chọn phương pháp tỷ lệ khi doanh thu năm không quá mức này (Luật Điều 7.3)
export const PERCENTAGE_METHOD_MAX_REVENUE = 3_000_000_000;

// Tỷ lệ TNCN trên doanh thu (Luật 109/2025 Điều 7.3)
export const PIT_RATES: Record<BusinessCategory, number> = {
  distribution: 0.005,
  services: 0.02,
  rental_agency: 0.05,
  production: 0.015,
  digital_content: 0.05,
  other: 0.01,
};

// Năm 2025 (thuế khoán, TT 40/2021): chưa có nhóm nội dung số riêng, thuộc nhóm dịch vụ 2%
export const PIT_RATES_2025: Record<BusinessCategory, number> = { ...PIT_RATES, digital_content: 0.02 };

// Tỷ lệ GTGT trên doanh thu (Luật Thuế GTGT Điều 12.2.b)
export const VAT_RATES: Record<BusinessCategory, number> = {
  distribution: 0.01,
  services: 0.05,
  rental_agency: 0.05,
  production: 0.03,
  digital_content: 0.05,
  other: 0.02,
};

// Phương pháp thu nhập: thuế suất theo doanh thu năm (Luật Điều 7.2)
export const INCOME_TAX_BRACKETS_2026 = [
  { min: REVENUE_THRESHOLDS[2026], max: PERCENTAGE_METHOD_MAX_REVENUE, rate: 0.15 },
  { min: PERCENTAGE_METHOD_MAX_REVENUE, max: 50_000_000_000, rate: 0.17 },
  { min: 50_000_000_000, max: Infinity, rate: 0.20 },
];

/** "1 tỷ", "3 tỷ", "50 tỷ" */
export const formatTy = (amount: number) => `${(amount / 1e9).toLocaleString('vi-VN')} tỷ`;

/** 0.005 -> "0,5%" (tránh lỗi số thực như 17.000000000000004%) */
export const formatRate = (rate: number) =>
  `${(rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;

export const TAX_METHOD_LABELS: Record<TaxMethod, string> = {
  khoan: `Tỷ lệ % trên doanh thu (DT ${REVENUE_THRESHOLDS[2026] / 1e9}–${PERCENTAGE_METHOD_MAX_REVENUE / 1e9} tỷ)`,
  income: 'Phương pháp thu nhập (% lợi nhuận)',
};

export const TAX_METHOD_DESCRIPTIONS: Record<TaxMethod, string> = {
  khoan: `TNCN = (Doanh thu − ${formatTy(REVENUE_THRESHOLDS[2026])}) × tỷ lệ ngành (0,5%–5%). Chỉ được chọn khi doanh thu năm trên ${formatTy(REVENUE_THRESHOLDS[2026])} đến ${formatTy(PERCENTAGE_METHOD_MAX_REVENUE)}; không cần chứng từ chi phí.`,
  income: `TNCN = (Doanh thu − Chi phí) × ${INCOME_TAX_BRACKETS_2026.map((b) => formatRate(b.rate)).join('/')} theo doanh thu năm. Bắt buộc khi doanh thu năm trên ${formatTy(PERCENTAGE_METHOD_MAX_REVENUE)}; cần hóa đơn, chứng từ chi phí hợp lệ.`,
};

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  distribution: 'Phân phối, cung cấp hàng hóa',
  services: 'Dịch vụ, xây dựng không bao thầu nguyên vật liệu',
  rental_agency: 'Cho thuê tài sản khác (xe, máy móc), đại lý bảo hiểm, xổ số, đa cấp',
  production: 'Sản xuất, vận tải, dịch vụ gắn với hàng hóa, xây dựng có bao thầu NVL',
  digital_content: 'Nội dung số (giải trí, trò chơi, phim, ảnh, nhạc số, quảng cáo số)',
  other: 'Hoạt động kinh doanh khác',
};

export const BUSINESS_CATEGORY_DESCRIPTIONS: Record<BusinessCategory, string> = {
  distribution: 'Bán buôn, bán lẻ hàng hóa: cửa hàng tạp hóa, shop online, bán hàng trên sàn TMĐT.',
  services: 'Lưu trú (homestay, nhà nghỉ), cắt tóc, giặt là, sửa chữa máy tính và đồ gia dụng, tư vấn, thiết kế, môi giới, đấu giá, hoa hồng đại lý, quảng cáo (không phải quảng cáo số), karaoke, internet; xây dựng không bao thầu nguyên vật liệu.',
  rental_agency: 'Cho thuê phương tiện, máy móc thiết bị không kèm người điều khiển, tài sản khác không kèm dịch vụ; làm đại lý bảo hiểm, xổ số, bán hàng đa cấp. Cho thuê nhà, đất: dùng tab Cho thuê bất động sản (không được chọn phương pháp thu nhập).',
  production: 'Sản xuất, gia công, chế biến; vận tải hàng hóa, hành khách (xe công nghệ, giao hàng); dịch vụ ăn uống; sửa chữa ô tô, xe máy, máy móc; xây dựng có bao thầu nguyên vật liệu.',
  digital_content: 'Cung cấp sản phẩm, dịch vụ nội dung thông tin số: giải trí, trò chơi điện tử, phim số, ảnh số, nhạc số, quảng cáo số (kênh YouTube, TikTok...).',
  other: 'Sản xuất sản phẩm, cung cấp dịch vụ chịu thuế suất GTGT 5% và hoạt động chưa được liệt kê ở các nhóm trên.',
};

export function getRevenueThreshold(year: number): number {
  return year >= 2026 ? REVENUE_THRESHOLDS[2026] : REVENUE_THRESHOLDS[2025];
}

/** Thuế suất phương pháp thu nhập theo doanh thu năm (0 nếu chưa vượt ngưỡng) */
export function getIncomeTaxRate2026(annualRevenue: number): number {
  return INCOME_TAX_BRACKETS_2026.find((b) => annualRevenue > b.min && annualRevenue <= b.max)?.rate ?? 0;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Phân bổ mức trừ ngưỡng cho nhiều ngành (NĐ 68/2026 Điều 4.3, 4.4): trừ vào ngành có
 * tỷ lệ cao nhất trước (phương án có lợi nhất), phần chưa trừ hết trừ tiếp vào ngành khác.
 * Trả về mức trừ theo đúng thứ tự đầu vào; tổng ≤ threshold.
 */
export function allocateThreshold(lines: { revenue: number; rate: number }[], threshold: number): number[] {
  const deductions = lines.map(() => 0);
  let left = threshold;
  const order = lines.map((_, i) => i).sort((a, b) => lines[b].rate - lines[a].rate);
  for (const i of order) {
    deductions[i] = Math.max(0, Math.min(left, lines[i].revenue));
    left -= deductions[i];
  }
  return deductions;
}

export interface BusinessLine {
  category: BusinessCategory;
  revenue: number;   // Doanh thu năm
  expenses?: number; // Chi phí năm (phương pháp thu nhập)
}

export interface BusinessLineTax {
  thresholdDeduction: number;
  taxableBase: number;
  pitRate: number;
  pit: number;
  vatRate: number;
  vat: number;
}

export interface BusinessLinesTaxResult {
  method: TaxMethod; // Phương pháp thực tế áp dụng
  isAboveThreshold: boolean;
  threshold: number;
  lines: BusinessLineTax[];
  pit: number;
  vat: number;
}

/**
 * TNCN + GTGT cho toàn bộ hoạt động kinh doanh của một cá nhân trong năm.
 * Ngưỡng, phương pháp, thuế suất phương pháp thu nhập xét trên TỔNG doanh thu.
 * Phương pháp thu nhập tính trên tổng (DT − CP) của mọi hoạt động: lỗ hoạt động này
 * bù lãi hoạt động khác (diễn giải Luật 109/2025 Điều 7.2.a); phần thuế được chia cho
 * từng hoạt động theo tỷ trọng lợi nhuận dương để hiển thị.
 */
export function calculateBusinessLinesTax(
  lines: BusinessLine[],
  year: number,
  method: TaxMethod
): BusinessLinesTaxResult {
  const threshold = getRevenueThreshold(year);
  const total = lines.reduce((sum, l) => sum + l.revenue, 0);
  const isAboveThreshold = total > threshold;
  const is2026 = year >= 2026;
  // DT > 3 tỷ: bắt buộc phương pháp thu nhập (NĐ 68/2026 Điều 4.5.b)
  const effective: TaxMethod = !is2026 ? 'khoan' : total > PERCENTAGE_METHOD_MAX_REVENUE ? 'income' : method;

  let deductions = lines.map(() => 0);
  let bases = lines.map(() => 0);
  let rates = lines.map(() => 0);

  if (isAboveThreshold && !is2026) {
    // 2025: thuế khoán trên toàn bộ doanh thu
    bases = lines.map((l) => l.revenue);
    rates = lines.map((l) => PIT_RATES_2025[l.category]);
  } else if (isAboveThreshold && effective === 'khoan') {
    rates = lines.map((l) => PIT_RATES[l.category]);
    deductions = allocateThreshold(lines.map((l, i) => ({ revenue: l.revenue, rate: rates[i] })), threshold);
    bases = lines.map((l, i) => l.revenue - deductions[i]);
  } else if (isAboveThreshold) {
    const rate = getIncomeTaxRate2026(total);
    const profits = lines.map((l) => Math.max(0, l.revenue - (l.expenses ?? 0)));
    const positive = profits.reduce((a, b) => a + b, 0);
    const taxable = Math.max(0, lines.reduce((sum, l) => sum + l.revenue - (l.expenses ?? 0), 0));
    const k = positive > 0 ? taxable / positive : 0;
    bases = profits.map((p) => p * k);
    rates = lines.map(() => rate);
  }

  const result = lines.map((l, i) => {
    const vatRate = isAboveThreshold ? VAT_RATES[l.category] : 0;
    return {
      thresholdDeduction: deductions[i],
      taxableBase: bases[i],
      pitRate: rates[i],
      pit: Math.round(bases[i] * rates[i]),
      vatRate,
      vat: Math.round(l.revenue * vatRate),
    };
  });

  return {
    method: effective,
    isAboveThreshold,
    threshold,
    lines: result,
    pit: result.reduce((sum, r) => sum + r.pit, 0),
    vat: result.reduce((sum, r) => sum + r.vat, 0),
  };
}

function getRecommendation(business: HouseholdBusiness, tax: BusinessLinesTaxResult, year: number): string {
  if (!tax.isAboveThreshold) {
    return year >= 2026
      ? `Tổng doanh thu từ ${formatTy(tax.threshold)} trở xuống: không nộp TNCN, GTGT; vẫn phải thông báo doanh thu (Mẫu 01/TKN-CNKD) chậm nhất ngày 31/01 năm sau`
      : `Tổng doanh thu từ ${formatCurrency(tax.threshold)} trở xuống: không nộp TNCN, GTGT`;
  }
  let text = year < 2026
    ? 'Thuế khoán tính trên toàn bộ doanh thu (quy định năm 2025)'
    : tax.method === 'income'
      ? 'Phương pháp thu nhập: lưu giữ hóa đơn, chứng từ chi phí; quyết toán TNCN chậm nhất 31/3 năm sau (Mẫu 02/CNKD-TNCN-QTT)'
      : 'Tỷ lệ % trên doanh thu: TNCN tính trên phần doanh thu sau khi trừ ngưỡng được phân bổ';
  if (!business.hasBusinessLicense) {
    text += '. Cần đăng ký kinh doanh, đăng ký thuế và kê khai theo quy định';
  }
  return text;
}

/**
 * Tính thuế hộ kinh doanh (nhiều hoạt động)
 */
export function calculateHouseholdBusinessTax(
  input: HouseholdBusinessTaxInput
): HouseholdBusinessTaxResult {
  const { businesses, year, taxMethod } = input;
  const annual = businesses.map((b) => ({
    revenue: b.monthlyRevenue * b.operatingMonths,
    expenses: b.monthlyExpenses * b.operatingMonths,
  }));
  const tax = calculateBusinessLinesTax(
    businesses.map((b, i) => ({ category: b.category, ...annual[i] })),
    year,
    taxMethod
  );

  const businessResults: BusinessTaxResult[] = businesses.map((b, i) => {
    const t = tax.lines[i];
    const totalTax = t.pit + t.vat;
    return {
      id: b.id,
      name: b.name,
      category: b.category,
      annualRevenue: annual[i].revenue,
      annualExpenses: annual[i].expenses,
      taxableIncome: t.taxableBase,
      isAboveThreshold: tax.isAboveThreshold,
      threshold: tax.threshold,
      thresholdDeduction: t.thresholdDeduction,
      taxMethod: tax.method,
      taxRate: t.pitRate * 100,
      vatRate: t.vatRate * 100,
      totalTaxRate: (t.pitRate + t.vatRate) * 100,
      pitAmount: t.pit,
      vatAmount: t.vat,
      totalTax,
      netIncome: annual[i].revenue - annual[i].expenses - totalTax,
      recommendation: getRecommendation(b, tax, year),
    };
  });

  const sum = (pick: (r: BusinessTaxResult) => number) => businessResults.reduce((s, r) => s + pick(r), 0);

  return {
    businesses: businessResults,
    summary: {
      totalAnnualRevenue: sum((r) => r.annualRevenue),
      totalAnnualExpenses: sum((r) => r.annualExpenses),
      totalTaxableIncome: sum((r) => r.taxableIncome),
      totalPIT: tax.pit,
      totalVAT: tax.vat,
      totalTax: tax.pit + tax.vat,
      totalNetIncome: sum((r) => r.netIncome),
      threshold: tax.threshold,
      thresholdUsed: sum((r) => r.thresholdDeduction),
      year,
      taxMethod: tax.method,
    },
  };
}

export function createEmptyBusiness(): HouseholdBusiness {
  return {
    id: generateId(),
    name: '',
    category: 'distribution',
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    operatingMonths: 12,
    hasBusinessLicense: false,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Ví dụ theo Phụ lục NĐ 253/2026 (ăn uống thuộc nhóm 1,5%; lưu trú, môi giới, quảng cáo thuộc nhóm 2%)
export const COMMON_BUSINESS_EXAMPLES = [
  { category: 'distribution' as BusinessCategory, examples: ['Cửa hàng tạp hóa', 'Shop quần áo online', 'Bán hàng trên sàn TMĐT'] },
  { category: 'services' as BusinessCategory, examples: ['Homestay, nhà nghỉ', 'Tiệm cắt tóc', 'Môi giới, hoa hồng đại lý', 'Tư vấn, thiết kế'] },
  { category: 'rental_agency' as BusinessCategory, examples: ['Cho thuê xe tự lái', 'Đại lý bảo hiểm, xổ số', 'Bán hàng đa cấp'] },
  { category: 'production' as BusinessCategory, examples: ['Quán ăn, quán cà phê', 'Xe công nghệ (Grab, Be)', 'Shipper giao hàng', 'Xưởng may gia công'] },
  { category: 'digital_content' as BusinessCategory, examples: ['Kênh YouTube, TikTok', 'Bán nhạc, ảnh số', 'Trò chơi điện tử'] },
  { category: 'other' as BusinessCategory, examples: ['Dịch vụ chịu thuế suất GTGT 5%', 'Hoạt động chưa liệt kê ở nhóm khác'] },
];

export function getMonthlyThreshold(year: 2025 | 2026): number {
  return Math.round(getRevenueThreshold(year) / 12);
}

/**
 * So sánh 2 phương pháp năm 2026. Không trả chênh lệch cho phương án không hợp lệ:
 * DT > 3 tỷ thì khoanResult = null (bắt buộc phương pháp thu nhập).
 */
export function compareTaxMethods2026(businesses: HouseholdBusiness[]): {
  khoanResult: HouseholdBusinessTaxResult | null;
  incomeResult: HouseholdBusinessTaxResult;
  recommendedMethod: TaxMethod;
  savings: number;
  explanation: string;
} {
  const incomeResult = calculateHouseholdBusinessTax({ businesses, year: 2026, taxMethod: 'income' });
  const { totalAnnualRevenue: total, threshold } = incomeResult.summary;

  if (total > PERCENTAGE_METHOD_MAX_REVENUE) {
    return {
      khoanResult: null,
      incomeResult,
      recommendedMethod: 'income',
      savings: 0,
      explanation: `Doanh thu trên ${formatTy(PERCENTAGE_METHOD_MAX_REVENUE)}: bắt buộc phương pháp thu nhập, không được chọn tỷ lệ % trên doanh thu.`,
    };
  }

  const khoanResult = calculateHouseholdBusinessTax({ businesses, year: 2026, taxMethod: 'khoan' });
  if (total <= threshold) {
    return {
      khoanResult,
      incomeResult,
      recommendedMethod: 'khoan',
      savings: 0,
      explanation: `Doanh thu từ ${formatTy(threshold)} trở xuống: không nộp TNCN, GTGT.`,
    };
  }

  const khoanTax = khoanResult.summary.totalTax;
  const incomeTax = incomeResult.summary.totalTax;
  const savings = Math.abs(khoanTax - incomeTax);
  return khoanTax <= incomeTax
    ? {
        khoanResult,
        incomeResult,
        recommendedMethod: 'khoan',
        savings,
        explanation: `Tỷ lệ % trên doanh thu có lợi hơn ${formatCurrency(savings)}; không cần chứng từ chi phí.`,
      }
    : {
        khoanResult,
        incomeResult,
        recommendedMethod: 'income',
        savings,
        explanation: `Phương pháp thu nhập có lợi hơn ${formatCurrency(savings)}; cần hóa đơn, chứng từ chi phí hợp lệ và áp dụng ổn định 2 năm liên tục (NĐ 68/2026 Điều 4.5.d).`,
      };
}
