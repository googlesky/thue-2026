/**
 * Tổng hợp thuế TNCN cả năm từ nhiều nguồn thu nhập (cá nhân cư trú)
 *
 * Căn cứ pháp lý (kỳ tính thuế 2026):
 * - Luật Thuế TNCN số 109/2025/QH15 (sửa đổi bởi Luật 09/2026/QH16)
 * - Nghị định 253/2026/NĐ-CP, Thông tư 87/2026/TT-BTC
 * - Nghị định 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP): ngưỡng doanh thu 1 tỷ/năm
 * Năm 2025 dùng luật cũ (biểu 7 bậc, giảm trừ 11tr/4,4tr, ngưỡng kinh doanh 100 triệu) theo ngày tính.
 */

import {
  calculateTaxForDate,
  getInsuranceDetailed,
  getPerTransactionThreshold,
  getCasualWithholdingThreshold,
  getRentalIncomeThreshold,
  getVoluntaryPensionCap,
  formatNumber,
  CASUAL_WITHHOLDING_RATE,
  DEFAULT_INSURANCE_OPTIONS,
  DEPENDENT_INCOME_LIMIT,
  EFFECTIVE_DATES,
  NEW_DEDUCTIONS,
} from './taxCalculator';

// ===== TYPES =====

/**
 * Nguồn thu nhập với các loại khác nhau
 */
export type IncomeSourceType =
  | 'salary'           // Lương, tiền công
  | 'freelance'        // Thu nhập tự do (tiền công) / kinh doanh
  | 'rental'           // Cho thuê tài sản
  | 'dividend'         // Cổ tức
  | 'interest'         // Lãi tiền gửi, trái phiếu, cho vay
  | 'securities'       // Chuyển nhượng chứng khoán
  | 'real_estate'      // Chuyển nhượng BĐS
  | 'lottery'          // Trúng thưởng
  | 'inheritance'      // Thừa kế/Quà tặng
  | 'royalty'          // Bản quyền, nhượng quyền
  | 'capital_investment'; // Góp vốn kinh doanh

export const INCOME_SOURCE_LABELS: Record<IncomeSourceType, string> = {
  salary: 'Lương, tiền công',
  freelance: 'Thu nhập tự do / Kinh doanh',
  rental: 'Cho thuê tài sản',
  dividend: 'Cổ tức',
  interest: 'Lãi tiền gửi, trái phiếu, cho vay',
  securities: 'Chuyển nhượng chứng khoán',
  real_estate: 'Chuyển nhượng bất động sản',
  lottery: 'Trúng thưởng',
  inheritance: 'Thừa kế / Quà tặng',
  royalty: 'Bản quyền / Nhượng quyền',
  capital_investment: 'Góp vốn kinh doanh',
};

export const INCOME_SOURCE_DESCRIPTIONS: Record<IncomeSourceType, string> = {
  salary: 'Tiền lương, tiền công, thưởng. Nhiều nơi trả được gộp lại tính lũy tiến; thưởng nhập "Một lần" (không tính bảo hiểm).',
  freelance: 'Thù lao dịch vụ không đăng ký kinh doanh (tính như tiền công, gộp với lương) hoặc doanh thu hộ, cá nhân kinh doanh.',
  rental: 'Doanh thu cho thuê nhà, đất, tài sản khác. Tổng doanh thu kinh doanh đến 1 tỷ/năm không nộp thuế TNCN.',
  dividend: 'Cổ tức được chia từ công ty (5%).',
  interest: 'Lãi cho vay, lãi trái phiếu doanh nghiệp chịu 5%. Lãi tiền gửi tại tổ chức tín dụng, trái phiếu Chính phủ, trái phiếu chính quyền địa phương, hợp đồng bảo hiểm nhân thọ được miễn.',
  securities: 'Nhập tổng giá bán cổ phiếu, trái phiếu, chứng chỉ quỹ (0,1% mỗi lần bán). Chứng chỉ quỹ mở nắm giữ từ 2 năm được miễn.',
  real_estate: 'Giá chuyển nhượng nhà, quyền sử dụng đất (2%). Nhà, đất ở duy nhất được miễn.',
  lottery: 'Xổ số, khuyến mại, đặt cược, trò chơi có thưởng. Trúng thưởng casino không thuộc diện chịu thuế TNCN.',
  inheritance: 'Chỉ chịu thuế khi nhận chứng khoán, phần vốn, bất động sản, tài sản phải đăng ký (ô tô, xe máy...). Tiền mặt, tài sản khác không chịu thuế.',
  royalty: 'Tiền bản quyền, chuyển giao công nghệ, nhượng quyền thương mại. Mỗi dòng là một hợp đồng.',
  capital_investment: 'Lợi nhuận được chia từ góp vốn kinh doanh (5%).',
};

// Thuế suất các nguồn ngoài tiền lương (Luật 109/2025 Điều 7, 12–18)
const RATES = {
  rental: 0.05,             // cho thuê tài sản, BĐS: 5% phần doanh thu vượt ngưỡng (Điều 7.3.c, 7.4)
  business: 0.02,           // thu nhập tự do có ĐKKD: tạm tính tỷ lệ dịch vụ 2% (Điều 7.3.c)
  dividend: 0.05,
  capital_investment: 0.05,
  interest: 0.05,
  securities: 0.001,
  real_estate: 0.02,
  lottery: 0.10,
  inheritance: 0.10,
  royalty: 0.05,
};

// Doanh thu năm trên 3 tỷ: bắt buộc tính theo thu nhập (DT − CP) × thuế suất (Luật Điều 7.2–7.3)
const INCOME_METHOD_REVENUE = 3_000_000_000;

const NO_INSURANCE = { bhxh: false, bhyt: false, bhtn: false };

/**
 * Một nguồn thu nhập
 */
export interface IncomeSource {
  id: string;
  type: IncomeSourceType;
  amount: number;              // Số tiền mỗi lần nhận theo tần suất
  frequency: 'monthly' | 'yearly' | 'one_time';
  description?: string;
  // Các trường đặc biệt cho từng loại
  isFromFamily?: boolean;      // Thừa kế/quà tặng là BĐS giữa người thân → miễn (Luật Điều 4.1)
  isGovBond?: boolean;         // Lãi được miễn: tiền gửi TCTD, TP Chính phủ/CQĐP, BH nhân thọ (Điều 4.6) — giữ tên key cho dữ liệu đã lưu
  isBusiness?: boolean;        // Thu nhập tự do có đăng ký kinh doanh → thuế theo doanh thu; mặc định là tiền công
}

/**
 * Input cho tính toán đa nguồn
 */
export interface MultiSourceInput {
  // Danh sách thu nhập
  incomeSources: IncomeSource[];

  // Giảm trừ gia cảnh
  dependents: number;

  // Có đóng BHXH, BHYT, BHTN bắt buộc trên lương không
  hasInsurance: boolean;

  // Các khoản giảm trừ khác (VND/năm)
  pensionContribution: number;    // Hưu trí tự nguyện, bảo hiểm nhân thọ
  charitableContribution: number; // Từ thiện, nhân đạo

  // Năm thuế
  taxYear: 2025 | 2026;
  isSecondHalf2026?: boolean;     // Thu nhập theo lần phát sinh từ 01/7 (ngưỡng 20 triệu)
}

/**
 * Kết quả tính thuế cho một nguồn
 */
export interface SourceTaxResult {
  source: IncomeSource;
  annualAmount: number;           // Quy đổi về năm
  taxableAmount: number;          // Số tiền tính thuế
  taxAmount: number;              // Số tiền thuế
  insuranceAmount: number;        // BH bắt buộc người lao động đóng (nguồn lương)
  effectiveRate: number;          // Thuế suất thực tế
  appliedRate: number | 'progressive';
  method: string;
  notes: string[];
}

/**
 * Kết quả tổng hợp
 */
export interface MultiSourceResult {
  // Chi tiết từng nguồn
  sourceResults: SourceTaxResult[];

  // Tổng hợp
  totalGrossIncome: number;       // Tổng thu nhập trước thuế
  totalTaxableIncome: number;     // Tổng thu nhập tính thuế
  totalInsurance: number;         // BH bắt buộc người lao động đóng cả năm
  totalTax: number;               // Tổng thuế phải nộp
  totalNetIncome: number;         // Thực nhận = thu nhập − BH − thuế

  // Thuế theo loại
  progressiveTax: number;         // Thuế lũy tiến (tiền lương, tiền công)
  flatTax: number;                // Thuế suất cố định

  // Thuế suất hiệu quả
  overallEffectiveRate: number;

  // Breakdown by category
  categoryBreakdown: {
    salary: { gross: number; tax: number };
    investment: { gross: number; tax: number };
    business: { gross: number; tax: number };
    other: { gross: number; tax: number };
  };

  // Gợi ý tối ưu
  optimizationTips: string[];
}

// ===== HELPER FUNCTIONS =====

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// 20.000.000 → "20 triệu"; 1.000.000.000 → "1 tỷ"
function formatMoneyShort(value: number): string {
  return value >= 1_000_000_000
    ? `${(value / 1_000_000_000).toLocaleString('vi-VN')} tỷ`
    : `${(value / 1_000_000).toLocaleString('vi-VN')} triệu`;
}

function annualize(source: IncomeSource): number {
  const amount = Math.max(0, Number(source.amount) || 0);
  return source.frequency === 'monthly' ? amount * 12 : amount;
}

/**
 * Chia `total` theo tỷ trọng, dồn phần lẻ làm tròn vào phần tử cuối để tổng khớp từng đồng.
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  let rest = total;
  return weights.map((weight, i) => {
    if (i === weights.length - 1) return rest;
    const part = sum > 0 ? Math.round((total * weight) / sum) : 0;
    rest -= part;
    return part;
  });
}

/**
 * BH bắt buộc người lao động đóng cả năm, cộng TỪNG THÁNG vì trần đổi giữa năm
 * (BHXH, BHYT: 46,8tr → 50,6tr từ 01/7/2026; BHTN theo vùng I).
 * monthlySalaries: lương đóng BH của 12 tháng (tháng không có lương = 0).
 */
export function calculateAnnualInsurance(monthlySalaries: number[], year: number): number {
  return Math.round(
    monthlySalaries.reduce(
      (sum, salary, month) =>
        sum + getInsuranceDetailed(salary, 1, DEFAULT_INSURANCE_OPTIONS, new Date(year, month, 1)).total,
      0
    )
  );
}

/**
 * Thuế tiền lương, tiền công cả năm theo quyết toán (Luật 109 Điều 8–11; NĐ 253 Điều 51):
 * gộp mọi nguồn, giảm trừ gia cảnh MỘT lần, thu nhập tính thuế năm quy về bình quân tháng,
 * áp biểu tháng rồi × 12. calculateTaxForDate chọn luật theo kỳ tính thuế (2025: 7 bậc, 11tr/4,4tr)
 * và tự chặn trần hưu trí tự nguyện + BH nhân thọ (3tr/tháng từ kỳ 2026).
 */
export function calculateAnnualWageTax(p: {
  year: number;
  income: number;      // tổng tiền lương, tiền công cả năm
  insurance: number;   // BH bắt buộc cả năm (calculateAnnualInsurance)
  dependents: number;
  pension?: number;    // hưu trí tự nguyện, BH nhân thọ cả năm
  charity?: number;    // từ thiện, nhân đạo cả năm
}): { tax: number; taxableIncome: number; personalDeduction: number; dependentDeduction: number } {
  if (p.income <= 0) return { tax: 0, taxableIncome: 0, personalDeduction: 0, dependentDeduction: 0 };
  const r = calculateTaxForDate({
    grossIncome: p.income / 12,
    dependents: p.dependents,
    insuranceOptions: NO_INSURANCE,
    // BH đã tính theo từng tháng → truyền qua "giảm trừ khác" (r.otherDeductions gồm cả BH)
    otherDeductions: ((p.charity ?? 0) + p.insurance) / 12,
    pensionContribution: (p.pension ?? 0) / 12,
    calculationDate: new Date(p.year, 11, 31),
  });
  return {
    tax: Math.round(r.taxAmount * 12),
    taxableIncome: Math.round(r.taxableIncome * 12),
    personalDeduction: r.personalDeduction * 12,
    dependentDeduction: r.dependentDeduction * 12,
  };
}

/**
 * Doanh thu tính thuế của hộ, cá nhân kinh doanh theo tỷ lệ (Luật 109 Điều 7.3–7.4;
 * NĐ 68/2026 Điều 4 sửa bởi NĐ 141/2026): tổng doanh thu năm ≤ 1 tỷ thì không nộp; vượt thì
 * được trừ 1 tỷ MỘT lần cho toàn bộ hoạt động, trừ vào hoạt động thuế suất cao trước
 * (phương án có lợi nhất). Năm 2025 trở về trước: tổng doanh thu > 100 triệu thì tính trên toàn bộ.
 */
export function calculateBusinessTaxable(items: { revenue: number; rate: number }[], year: number): number[] {
  const yearEnd = new Date(year, 11, 31);
  const threshold = getRentalIncomeThreshold(yearEnd); // ngưỡng chung mọi hoạt động kinh doanh
  const total = items.reduce((sum, item) => sum + item.revenue, 0);
  if (total <= threshold) return items.map(() => 0);
  if (yearEnd < EFFECTIVE_DATES.NEW_TAX_LAW_2026) return items.map((item) => item.revenue);

  const taxable = items.map((item) => item.revenue);
  let left = threshold;
  items
    .map((_, i) => i)
    .sort((a, b) => items[b].rate - items[a].rate) // sort ổn định: cùng tỷ lệ giữ thứ tự nhập
    .forEach((i) => {
      const deducted = Math.min(left, taxable[i]);
      taxable[i] -= deducted;
      left -= deducted;
    });
  return taxable;
}

// Tiền lương, tiền công: lương + thù lao dịch vụ không đăng ký kinh doanh (NĐ 253 Điều 50.2)
const isWage = (s: IncomeSource) => s.type === 'salary' || (s.type === 'freelance' && !s.isBusiness);
// Lương đóng BH bắt buộc: lương theo tháng/năm, không gồm thưởng một lần và thù lao dịch vụ
const isInsured = (s: IncomeSource) => s.type === 'salary' && s.frequency !== 'one_time';
const getBusinessRate = (s: IncomeSource) =>
  s.type === 'rental' ? RATES.rental : s.type === 'freelance' && s.isBusiness ? RATES.business : 0;

// ===== MAIN FUNCTIONS =====

/**
 * Tính thuế tổng hợp từ nhiều nguồn thu nhập
 */
export function calculateMultiSourceTax(input: MultiSourceInput): MultiSourceResult {
  const year = input.taxYear;
  const yearEnd = new Date(year, 11, 31);
  const isNewLaw = yearEnd >= EFFECTIVE_DATES.NEW_TAX_LAW_2026;
  // Thu nhập theo lần phát sinh: ngưỡng 10 → 20 triệu, khấu trừ vãng lai 2 → 5 triệu từ 01/7/2026
  const eventDate = new Date(year, input.isSecondHalf2026 ? 6 : 0, 1);
  const perTxThreshold = getPerTransactionThreshold(eventDate);
  const dependents = Math.min(20, Math.max(0, Math.floor(Number(input.dependents) || 0)));
  const pension = Math.max(0, Number(input.pensionContribution) || 0);
  const charity = Math.max(0, Number(input.charitableContribution) || 0);

  const sourceResults: SourceTaxResult[] = input.incomeSources.map((source) => ({
    source,
    annualAmount: annualize(source),
    taxableAmount: 0,
    taxAmount: 0,
    insuranceAmount: 0,
    effectiveRate: 0,
    appliedRate: 0,
    method: '',
    notes: [],
  }));

  // 1) Tiền lương, tiền công: gộp mọi nguồn, giảm trừ gia cảnh một lần, lũy tiến một lần
  const wage = sourceResults.filter((r) => isWage(r.source));
  const insured = wage.filter((r) => isInsured(r.source));
  const insuredMonthly = insured.reduce((sum, r) => sum + r.annualAmount / 12, 0);
  const totalInsurance = input.hasInsurance
    ? calculateAnnualInsurance(Array(12).fill(insuredMonthly), year)
    : 0;
  const wageTax = calculateAnnualWageTax({
    year,
    income: wage.reduce((sum, r) => sum + r.annualAmount, 0),
    insurance: totalInsurance,
    dependents,
    pension,
    charity,
  });
  const wageWeights = wage.map((r) => r.annualAmount);
  const wageTaxes = allocate(wageTax.tax, wageWeights);
  const wageTaxables = allocate(wageTax.taxableIncome, wageWeights);
  const insurances = allocate(totalInsurance, insured.map((r) => r.annualAmount));
  insured.forEach((r, i) => {
    r.insuranceAmount = insurances[i];
    if (insurances[i] > 0) r.notes.push(`BHXH, BHYT, BHTN người lao động đóng: ${formatNumber(insurances[i])} đ/năm`);
  });

  const casualThreshold = getCasualWithholdingThreshold(eventDate);
  wage.forEach((r, i) => {
    r.taxAmount = wageTaxes[i];
    r.taxableAmount = wageTaxables[i];
    r.appliedRate = 'progressive';
    r.method = isNewLaw ? 'Lũy tiến 5 bậc' : 'Lũy tiến 7 bậc';
    if (wage.length > 1) {
      r.notes.push(`Gộp ${wage.length} nguồn tiền lương, tiền công: giảm trừ gia cảnh một lần, thuế chia theo tỷ lệ thu nhập`);
    }
    if (dependents > 0) {
      r.notes.push(`Giảm trừ ${dependents} người phụ thuộc`);
    }
    if (r.source.type === 'freelance') {
      // Tổ chức chi trả tạm khấu trừ 10% khoản từ 5 triệu/lần (NĐ 253 Điều 50.2), trừ lại khi quyết toán
      const perPayment = r.source.frequency === 'monthly' ? r.annualAmount / 12 : r.annualAmount;
      const withheld = perPayment >= casualThreshold ? Math.round(r.annualAmount * CASUAL_WITHHOLDING_RATE) : 0;
      r.notes.push(
        `Tính như tiền công, quyết toán cùng lương. Tổ chức chi trả tạm khấu trừ 10% khoản từ ${formatMoneyShort(casualThreshold)}/lần` +
          (withheld > 0 ? `: ${formatNumber(withheld)} đ, được trừ vào số thuế khi quyết toán` : '')
      );
    }
  });

  // 2) Kinh doanh, cho thuê: ngưỡng doanh thu năm chung cho mọi hoạt động
  const business = sourceResults.filter((r) => getBusinessRate(r.source) > 0);
  const businessThreshold = getRentalIncomeThreshold(yearEnd);
  const businessRevenue = business.reduce((sum, r) => sum + r.annualAmount, 0);
  const businessTaxables = calculateBusinessTaxable(
    business.map((r) => ({ revenue: r.annualAmount, rate: getBusinessRate(r.source) })),
    year
  );
  business.forEach((r, i) => {
    const rate = getBusinessRate(r.source);
    r.taxableAmount = businessTaxables[i];
    r.taxAmount = Math.round(businessTaxables[i] * rate);
    r.appliedRate = rate;
    r.method = isNewLaw
      ? `${formatPercent(rate)} phần doanh thu vượt ${formatMoneyShort(businessThreshold)}/năm`
      : `${formatPercent(rate)} trên doanh thu (khi vượt ${formatMoneyShort(businessThreshold)}/năm)`;
    if (businessRevenue <= businessThreshold) {
      r.notes.push(`Tổng doanh thu kinh doanh không quá ${formatMoneyShort(businessThreshold)}/năm: không nộp thuế TNCN`);
    } else if (r.source.type === 'rental') {
      r.notes.push('Còn thuế GTGT 5% trên toàn bộ doanh thu cho thuê (nộp riêng)');
    }
    if (r.source.type === 'freelance') {
      r.notes.push('Tạm tính tỷ lệ dịch vụ 2% (phân phối hàng hóa 0,5%; sản xuất, vận tải 1,5%)');
      if (isNewLaw && businessRevenue > INCOME_METHOD_REVENUE) {
        r.notes.push('Doanh thu năm trên 3 tỷ: bắt buộc tính theo thu nhập ((doanh thu − chi phí) × 17%), số trên chỉ để tham khảo');
      }
    }
  });

  // 3) Các nguồn thuế suất cố định / theo từng lần
  for (const r of sourceResults) {
    if (isWage(r.source) || getBusinessRate(r.source) > 0) continue;
    const { source, annualAmount } = r;
    let rate: number = RATES[source.type as keyof typeof RATES] ?? 0;

    switch (source.type) {
      case 'dividend':
      case 'capital_investment':
        r.taxableAmount = annualAmount;
        r.method = '5% trên thu nhập được chia';
        break;

      case 'interest':
        if (source.isGovBond) {
          rate = 0;
          r.method = 'Miễn thuế';
          r.notes.push('Lãi tiền gửi tại tổ chức tín dụng, trái phiếu Chính phủ, chính quyền địa phương, BH nhân thọ: miễn thuế (Luật Thuế TNCN Điều 4.6)');
        } else {
          r.taxableAmount = annualAmount;
          r.method = '5% trên tiền lãi';
          r.notes.push('Lãi cho vay, lãi trái phiếu doanh nghiệp: 5%');
        }
        break;

      case 'securities':
        r.taxableAmount = annualAmount;
        r.method = '0,1% trên giá chuyển nhượng';
        break;

      case 'real_estate':
        r.taxableAmount = annualAmount;
        r.method = '2% trên giá chuyển nhượng';
        r.notes.push('Miễn thuế nếu là nhà ở, đất ở duy nhất (sở hữu từ 183 ngày, chuyển nhượng toàn bộ)');
        break;

      case 'lottery':
      case 'inheritance': {
        if (source.type === 'inheritance' && source.isFromFamily) {
          rate = 0;
          r.method = 'Miễn thuế';
          r.notes.push('Bất động sản nhận thừa kế, quà tặng giữa người thân: miễn thuế (Luật Thuế TNCN Điều 4.1)');
          break;
        }
        // Ngưỡng tính theo TỪNG LẦN nhận: "Hàng tháng" = 12 lần
        const times = source.frequency === 'monthly' ? 12 : 1;
        r.taxableAmount = times * Math.max(0, annualAmount / times - perTxThreshold);
        r.method = `10% phần vượt ${formatMoneyShort(perTxThreshold)} mỗi lần`;
        if (r.taxableAmount === 0) {
          r.notes.push(`Mỗi lần không quá ${formatMoneyShort(perTxThreshold)}: không chịu thuế`);
        }
        break;
      }

      case 'royalty':
        // Ngưỡng tính theo TỪNG HỢP ĐỒNG (mỗi dòng là một hợp đồng)
        r.taxableAmount = Math.max(0, annualAmount - perTxThreshold);
        r.method = `5% phần vượt ${formatMoneyShort(perTxThreshold)} mỗi hợp đồng`;
        if (r.taxableAmount === 0) {
          r.notes.push(`Hợp đồng không quá ${formatMoneyShort(perTxThreshold)}: không chịu thuế`);
        }
        break;
    }

    r.appliedRate = rate;
    r.taxAmount = Math.round(r.taxableAmount * rate);
  }

  for (const r of sourceResults) {
    r.effectiveRate = r.annualAmount > 0 ? r.taxAmount / r.annualAmount : 0;
  }

  // Aggregate results
  const totalGrossIncome = sourceResults.reduce((sum, r) => sum + r.annualAmount, 0);
  const totalTaxableIncome = sourceResults.reduce((sum, r) => sum + r.taxableAmount, 0);
  const totalTax = sourceResults.reduce((sum, r) => sum + r.taxAmount, 0);
  const totalNetIncome = totalGrossIncome - totalInsurance - totalTax;

  const progressiveTax = wageTax.tax;
  const flatTax = totalTax - progressiveTax;

  // Category breakdown (thù lao tính như tiền công xếp vào nhóm lương)
  const categoryBreakdown = {
    salary: { gross: 0, tax: 0 },
    investment: { gross: 0, tax: 0 },
    business: { gross: 0, tax: 0 },
    other: { gross: 0, tax: 0 },
  };

  for (const result of sourceResults) {
    const category = result.appliedRate === 'progressive' ? 'salary' : getCategoryForType(result.source.type);
    categoryBreakdown[category].gross += result.annualAmount;
    categoryBreakdown[category].tax += result.taxAmount;
  }

  // Overall effective rate
  const overallEffectiveRate = totalGrossIncome > 0 ? totalTax / totalGrossIncome : 0;

  return {
    sourceResults,
    totalGrossIncome,
    totalTaxableIncome,
    totalInsurance,
    totalTax,
    totalNetIncome,
    progressiveTax,
    flatTax,
    overallEffectiveRate,
    categoryBreakdown,
    optimizationTips: generateOptimizationTips(sourceResults, dependents, pension, charity),
  };
}

/**
 * Get category for income type
 */
function getCategoryForType(type: IncomeSourceType): 'salary' | 'investment' | 'business' | 'other' {
  switch (type) {
    case 'salary':
      return 'salary';
    case 'dividend':
    case 'interest':
    case 'securities':
    case 'capital_investment':
      return 'investment';
    case 'freelance':
    case 'rental':
    case 'royalty':
      return 'business';
    default:
      return 'other';
  }
}

/**
 * Gợi ý tối ưu (theo luật hiện hành, áp dụng cho các kỳ tới)
 */
function generateOptimizationTips(
  results: SourceTaxResult[],
  dependents: number,
  pension: number,
  charity: number
): string[] {
  const tips: string[] = [];
  const wageTax = results
    .filter(r => r.appliedRate === 'progressive')
    .reduce((sum, r) => sum + r.taxAmount, 0);

  if (wageTax > 0 && dependents === 0) {
    tips.push(
      `Đăng ký người phụ thuộc (con chưa thành niên; cha mẹ, vợ/chồng, con đang đi học có thu nhập bình quân không quá ${formatMoneyShort(DEPENDENT_INCOME_LIMIT)}/tháng) để được giảm trừ ${formatMoneyShort(NEW_DEDUCTIONS.dependent)}/tháng mỗi người.`
    );
  }

  if (wageTax > 0 && pension === 0) {
    tips.push(
      `Đóng hưu trí tự nguyện, bảo hiểm nhân thọ để được giảm trừ (tổng tối đa ${formatMoneyShort(getVoluntaryPensionCap())}/tháng, gồm cả phần công ty đóng).`
    );
  }

  if (wageTax > 0 && charity === 0) {
    tips.push('Đóng góp từ thiện, nhân đạo qua tổ chức được công nhận để được giảm trừ.');
  }

  const freelanceIncome = results
    .filter(r => r.source.type === 'freelance')
    .reduce((sum, r) => sum + r.annualAmount, 0);
  if (freelanceIncome > 1_000_000_000) {
    tips.push('Thu nhập tự do cao: cân nhắc thành lập doanh nghiệp để tối ưu thuế.');
  }

  if (results.some(r => r.source.type === 'interest' && r.taxAmount > 0)) {
    tips.push('Lãi tiền gửi tại tổ chức tín dụng, trái phiếu Chính phủ, trái phiếu chính quyền địa phương được miễn thuế TNCN; lãi cho vay, trái phiếu doanh nghiệp chịu 5%.');
  }

  return tips;
}

/**
 * Create a new income source with defaults
 */
export function createIncomeSource(type: IncomeSourceType): IncomeSource {
  return {
    id: generateId(),
    type,
    amount: 0,
    frequency: type === 'salary' ? 'monthly' : 'yearly',
    // Lãi phổ biến nhất là lãi tiền gửi ngân hàng (miễn); bỏ chọn nếu là lãi cho vay, TP doanh nghiệp
    ...(type === 'interest' ? { isGovBond: true } : {}),
  };
}

/**
 * Get all income source type options
 */
export function getIncomeSourceOptions(): Array<{ value: IncomeSourceType; label: string; description: string }> {
  return Object.entries(INCOME_SOURCE_LABELS).map(([value, label]) => ({
    value: value as IncomeSourceType,
    label,
    description: INCOME_SOURCE_DESCRIPTIONS[value as IncomeSourceType],
  }));
}

/**
 * Định dạng tỷ lệ kiểu Việt Nam: 0.001 → "0,1%"
 */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}
