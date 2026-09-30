/**
 * Content Creator Tax Calculator
 * Tính thuế cho YouTuber, TikToker, KOL, Affiliate Marketing
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 109/2025/QH15 (sửa đổi bởi Luật 09/2026/QH16): thu nhập từ kinh doanh dựa trên
 *   nền tảng số là thu nhập kinh doanh (Điều 3.1.d, NĐ 253/2026/NĐ-CP Điều 7.6), áp dụng từ kỳ tính thuế 2026
 * - NĐ 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP), TT 18/2026/TT-BTC: ngưỡng 1 tỷ, kê khai
 * - NĐ 117/2025/NĐ-CP: khấu trừ thay trên nền tảng thương mại điện tử, nền tảng số
 *
 * Quy định chính (từ 2026):
 * - Tổng doanh thu năm ≤ 1 tỷ: không nộp TNCN, GTGT; thông báo doanh thu chậm nhất 31/01 năm sau
 * - Trên 1 tỷ: GTGT 5% trên toàn bộ doanh thu; TNCN = (DT − 1 tỷ) × 5% (nội dung số, quảng cáo số)
 *   hoặc 2% (hoa hồng tiếp thị liên kết); trên 3 tỷ bắt buộc phương pháp thu nhập (DT − CP) × 17%/20%
 * - Nghĩa vụ phát sinh từ quý doanh thu lũy kế vượt 1 tỷ
 * - Khoản bị khấu trừ 10% theo chế độ tiền công (chưa đăng ký kinh doanh) không trừ vào thuế kinh doanh
 * Năm 2025: ngưỡng 100 triệu, GTGT 5% + TNCN 2% trên toàn bộ doanh thu (quy định cũ)
 */

import {
  calculateBusinessLinesTax,
  getIncomeTaxRate2026,
  formatTy,
  PERCENTAGE_METHOD_MAX_REVENUE,
  VAT_RATES,
  BusinessCategory,
  TaxMethod,
} from './householdBusinessTaxCalculator';
import { getCasualWithholdingThreshold, CASUAL_WITHHOLDING_RATE } from './taxCalculator';

// Platform types
export type PlatformType = 'domestic' | 'foreign';

export interface Platform {
  id: string;
  name: string;
  type: PlatformType;
  category: BusinessCategory; // Nhóm tỷ lệ thuế: nội dung số 5%, hoa hồng đại lý 2%
  description: string;
}

export const PLATFORMS: Platform[] = [
  // Trong nước: hoa hồng tiếp thị liên kết (nhóm dịch vụ - hoa hồng đại lý)
  { id: 'shopee', name: 'Shopee Affiliate', type: 'domestic', category: 'services', description: 'Hoa hồng tiếp thị liên kết Shopee' },
  { id: 'lazada', name: 'Lazada Affiliate', type: 'domestic', category: 'services', description: 'Hoa hồng tiếp thị liên kết Lazada' },
  { id: 'tiki', name: 'Tiki Affiliate', type: 'domestic', category: 'services', description: 'Hoa hồng tiếp thị liên kết Tiki' },
  { id: 'sendo', name: 'Sendo Affiliate', type: 'domestic', category: 'services', description: 'Hoa hồng tiếp thị liên kết Sendo' },
  // Nước ngoài: nội dung số, quảng cáo số
  { id: 'youtube', name: 'YouTube', type: 'foreign', category: 'digital_content', description: 'Quảng cáo, Super Chat, hội viên (Membership)' },
  { id: 'tiktok', name: 'TikTok', type: 'foreign', category: 'digital_content', description: 'Creator Rewards, quà tặng LIVE' },
  { id: 'facebook', name: 'Facebook/Meta', type: 'foreign', category: 'digital_content', description: 'Quảng cáo, Stars, Reels' },
  { id: 'instagram', name: 'Instagram', type: 'foreign', category: 'digital_content', description: 'Reels Bonus, quà tặng' },
  { id: 'twitch', name: 'Twitch', type: 'foreign', category: 'digital_content', description: 'Subscription, Bits, quảng cáo' },
  { id: 'patreon', name: 'Patreon', type: 'foreign', category: 'digital_content', description: 'Người hâm mộ trả phí xem nội dung' },
  { id: 'other', name: 'Khác', type: 'foreign', category: 'digital_content', description: 'Nền tảng số khác' },
];

// Hạn nộp hồ sơ khai quý: ngày cuối cùng của tháng đầu quý sau (NĐ 68/2026 Điều 8.3.a)
export const QUARTER_DEADLINES = ['30/04', '31/07', '31/10', '31/01 năm sau'];

export interface PlatformIncome {
  platformId: string;
  monthlyIncome: number[]; // 12 tháng
}

export interface ContentCreatorInput {
  year: number;
  platforms: PlatformIncome[];
  isRegisteredBusiness: boolean; // Đã đăng ký kinh doanh/đăng ký thuế: không bị khấu trừ 10% tiền công
  annualExpenses?: number;       // Chi phí có hóa đơn (phương pháp thu nhập, bắt buộc khi DT > 3 tỷ)
}

export interface QuarterSummary {
  quarter: number;
  income: number;
  tax: number;       // Thuế phát sinh trong quý (GTGT + TNCN)
  withheld: number;  // Đã bị khấu trừ 10% (tiền công)
  deadline: string;
}

export interface Recommendation {
  id: string;
  type: 'warning' | 'info' | 'tip';
  title: string;
  description: string;
}

export interface ContentCreatorTaxResult {
  totalIncome: number;
  totalIncomeByPlatform: {
    platformId: string;
    platformName: string;
    amount: number;
    pitRate: number;
    thresholdDeduction: number;
  }[];
  threshold: number;
  isExempt: boolean;
  method: TaxMethod; // 'khoan' = tỷ lệ % trên doanh thu (2026) / thuế khoán (2025)
  taxableIncome: number;
  vatAmount: number;
  pitAmount: number;
  totalTaxDue: number;
  totalWithheld: number; // Khấu trừ 10% theo chế độ tiền công - KHÔNG trừ vào thuế kinh doanh
  effectiveTaxRate: number;
  quarters: QuarterSummary[];
  recommendations: Recommendation[];
}

export function getPlatformById(id: string): Platform | undefined {
  return PLATFORMS.find(p => p.id === id);
}

const sum = (values: number[]) => values.reduce((s, v) => s + (v || 0), 0);

function generateRecommendations(
  input: ContentCreatorInput,
  r: Omit<ContentCreatorTaxResult, 'recommendations'>,
  hasForeignIncome: boolean
): Recommendation[] {
  const recs: Recommendation[] = [];
  const is2026 = input.year >= 2026;
  const threshold = r.threshold;

  if (r.totalIncome > threshold * 0.8 && r.totalIncome <= threshold) {
    recs.push({
      id: 'near-threshold',
      type: 'warning',
      title: 'Gần ngưỡng chịu thuế',
      description: is2026
        ? `Doanh thu đang gần ngưỡng ${formatTy(threshold)}/năm. Nếu vượt ngưỡng: GTGT tính trên toàn bộ doanh thu, TNCN tính trên phần doanh thu vượt ${formatTy(threshold)} (5% nội dung số, quảng cáo số; 2% hoa hồng tiếp thị liên kết).`
        : `Doanh thu đang gần ngưỡng ${formatCurrency(threshold)}/năm. Nếu vượt ngưỡng, thuế tính trên toàn bộ doanh thu.`,
    });
  }

  if (r.method === 'income' && is2026 && !r.isExempt) {
    recs.push({
      id: 'income-method',
      type: 'warning',
      title: `Doanh thu trên ${formatTy(PERCENTAGE_METHOD_MAX_REVENUE)}: bắt buộc phương pháp thu nhập`,
      description: 'TNCN = (Doanh thu − Chi phí có hóa đơn) × 17% (20% nếu doanh thu trên 50 tỷ). Nhập chi phí để tính đúng; phương pháp thu nhập áp dụng ổn định 2 năm liên tục và quyết toán chậm nhất 31/3 năm sau.',
    });
  }

  if (hasForeignIncome && is2026) {
    recs.push({
      id: 'foreign-platform',
      type: 'info',
      title: 'Thu nhập từ nền tảng nước ngoài',
      description: 'Thu nhập từ YouTube, TikTok, Facebook... là thu nhập kinh doanh trên nền tảng số (Luật 109/2025/QH15 Điều 3.1.d). Nền tảng không khấu trừ thay thì bạn tự kê khai; nếu tổ chức tại Việt Nam chi trả thay đã khấu trừ theo NĐ 117/2025/NĐ-CP, số đã khấu trừ được trừ khi xác định số phải nộp, hoặc được hoàn nếu cả năm không vượt ngưỡng (NĐ 68/2026 Điều 11, 12).',
    });
  }

  if (r.totalWithheld > 0) {
    recs.push({
      id: 'withheld',
      type: 'tip',
      title: 'Khoản đã bị khấu trừ 10%',
      description: `Bên trả thu nhập trong nước khấu trừ 10% khoản chi từ ${formatCurrency(getCasualWithholdingThreshold())}/lần theo chế độ tiền công khi bạn chưa đăng ký kinh doanh (NĐ 253/2026/NĐ-CP Điều 8.2.c, 50.2). Khoản này được quyết toán theo thu nhập tiền công (có thể được hoàn), không trừ vào thuế kinh doanh. Đăng ký thuế cho hoạt động kinh doanh để tự kê khai và không bị khấu trừ theo chế độ này.`,
    });
  }

  if (!input.isRegisteredBusiness && !r.isExempt) {
    recs.push({
      id: 'register-business',
      type: 'warning',
      title: 'Cần đăng ký kinh doanh và kê khai thuế',
      description: is2026
        ? `Doanh thu trên ${formatTy(threshold)}: phải đăng ký thuế, dùng hóa đơn điện tử và kê khai GTGT, TNCN theo quý kể từ quý doanh thu lũy kế vượt ngưỡng.`
        : 'Doanh thu vượt ngưỡng: cần đăng ký kinh doanh, kê khai và nộp thuế theo quy định năm 2025.',
    });
  }

  recs.push({
    id: 'deadline',
    type: 'info',
    title: 'Mốc kê khai quan trọng',
    description: is2026
      ? `Doanh thu từ ${formatTy(threshold)} trở xuống: thông báo doanh thu (Mẫu 01/TKN-CNKD) chậm nhất 31/01 năm sau. Trên ${formatTy(threshold)}: khai GTGT, TNCN theo quý (Mẫu 01/CNKD), hạn ngày cuối cùng của tháng đầu quý sau (30/4, 31/7, 31/10, 31/01); doanh thu năm trên 50 tỷ khai theo tháng. Phương pháp thu nhập quyết toán chậm nhất 31/3 năm sau (Mẫu 02/CNKD-TNCN-QTT).`
      : 'Kê khai thuế quý: ngày cuối cùng của tháng đầu quý sau (30/4, 31/7, 31/10, 31/01 năm sau).',
  });

  return recs;
}

/**
 * Main calculation function
 */
export function calculateContentCreatorTax(input: ContentCreatorInput): ContentCreatorTaxResult {
  const entries = input.platforms.flatMap((p) => {
    const platform = getPlatformById(p.platformId);
    return platform ? [{ platform, months: p.monthlyIncome }] : [];
  });
  const annualByPlatform = entries.map((e) => sum(e.months.slice(0, 12)));
  const totalIncome = sum(annualByPlatform);
  const expenses = Math.max(0, input.annualExpenses ?? 0);
  const expenseShare = (revenue: number) => (totalIncome > 0 ? (expenses * revenue) / totalIncome : 0);

  const linesFor = (revenues: number[]) =>
    entries.map((e, i) => ({ category: e.platform.category, revenue: revenues[i], expenses: expenseShare(revenues[i]) }));

  const annual = calculateBusinessLinesTax(linesFor(annualByPlatform), input.year, 'khoan');

  // Thuế lũy kế đến hết tháng thứ `months`: chưa vượt ngưỡng thì chưa phát sinh nghĩa vụ;
  // quý vượt ngưỡng kê khai cả phần doanh thu từ đầu năm (NĐ 68/2026 Điều 8.1.a)
  const cumulativeTax = (months: number) => {
    const revenues = entries.map((e) => sum(e.months.slice(0, months)));
    const c = sum(revenues);
    if (c <= annual.threshold) return 0;
    if (annual.method === 'income') {
      // Tạm nộp theo lợi nhuận lũy kế, thuế suất theo doanh thu cả năm
      const vat = entries.reduce((s, e, i) => s + Math.round(revenues[i] * VAT_RATES[e.platform.category]), 0);
      return vat + Math.round(Math.max(0, c - expenseShare(c)) * getIncomeTaxRate2026(totalIncome));
    }
    const t = calculateBusinessLinesTax(linesFor(revenues), input.year, 'khoan');
    return t.pit + t.vat;
  };

  const totalTaxDue = annual.pit + annual.vat;
  const cumulative = [0, cumulativeTax(3), cumulativeTax(6), cumulativeTax(9), totalTaxDue];

  // Khấu trừ 10% theo chế độ tiền công: nền tảng trong nước, chưa đăng ký kinh doanh,
  // khoản chi (mỗi tháng) từ ngưỡng theo ngày chi trả
  const withheldInMonth = (m: number) =>
    input.isRegisteredBusiness
      ? 0
      : entries.reduce((s, e) => {
          const amount = e.months[m] || 0;
          return e.platform.type === 'domestic' && amount >= getCasualWithholdingThreshold(new Date(input.year, m, 1))
            ? s + Math.round(amount * CASUAL_WITHHOLDING_RATE)
            : s;
        }, 0);

  const quarters: QuarterSummary[] = QUARTER_DEADLINES.map((deadline, q) => {
    const monthIdx = [q * 3, q * 3 + 1, q * 3 + 2];
    return {
      quarter: q + 1,
      income: sum(monthIdx.map((m) => sum(entries.map((e) => e.months[m] || 0)))),
      tax: cumulative[q + 1] - cumulative[q],
      withheld: sum(monthIdx.map(withheldInMonth)),
      deadline,
    };
  });

  const partial: Omit<ContentCreatorTaxResult, 'recommendations'> = {
    totalIncome,
    totalIncomeByPlatform: entries.map((e, i) => ({
      platformId: e.platform.id,
      platformName: e.platform.name,
      amount: annualByPlatform[i],
      pitRate: annual.lines[i].pitRate,
      thresholdDeduction: annual.lines[i].thresholdDeduction,
    })),
    threshold: annual.threshold,
    isExempt: !annual.isAboveThreshold,
    method: annual.method,
    taxableIncome: sum(annual.lines.map((l) => l.taxableBase)),
    vatAmount: annual.vat,
    pitAmount: annual.pit,
    totalTaxDue,
    totalWithheld: sum(quarters.map((q) => q.withheld)),
    effectiveTaxRate: totalIncome > 0 ? (totalTaxDue / totalIncome) * 100 : 0,
    quarters,
  };

  return {
    ...partial,
    recommendations: generateRecommendations(input, partial, entries.some((e) => e.platform.type === 'foreign')),
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

// Chia doanh thu năm cho 12 tháng, tổng khớp chính xác (phần dư dồn vào tháng 12)
export function spreadAnnual(value: number): number[] {
  const monthly = Math.floor(value / 12);
  return Array.from({ length: 12 }, (_, i) => (i === 11 ? value - monthly * 11 : monthly));
}
