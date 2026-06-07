/**
 * Multi-source Income Calculator - Tổng hợp thu nhập từ nhiều nguồn
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 2007 (sửa đổi 2012, 2014)
 * - Nghị định 65/2013/NĐ-CP
 * - Thông tư 111/2013/TT-BTC
 */

import { getPerTransactionThreshold, getMaxSocialInsuranceSalary, NEW_TAX_BRACKETS, NEW_DEDUCTIONS } from './taxCalculator';

// ===== TYPES =====

/**
 * Nguồn thu nhập với các loại khác nhau
 */
export type IncomeSourceType =
  | 'salary'           // Lương, tiền công
  | 'freelance'        // Thu nhập tự do/kinh doanh
  | 'rental'           // Cho thuê tài sản
  | 'dividend'         // Cổ tức
  | 'interest'         // Lãi tiền gửi, trái phiếu
  | 'securities'       // Chuyển nhượng chứng khoán
  | 'real_estate'      // Chuyển nhượng BĐS
  | 'lottery'          // Trúng thưởng
  | 'inheritance'      // Thừa kế/Quà tặng
  | 'royalty'          // Bản quyền
  | 'capital_investment'; // Góp vốn kinh doanh

export const INCOME_SOURCE_LABELS: Record<IncomeSourceType, string> = {
  salary: 'Lương, tiền công',
  freelance: 'Thu nhập tự do / Kinh doanh',
  rental: 'Cho thuê tài sản',
  dividend: 'Cổ tức',
  interest: 'Lãi tiền gửi, trái phiếu',
  securities: 'Chuyển nhượng chứng khoán',
  real_estate: 'Chuyển nhượng bất động sản',
  lottery: 'Trúng thưởng',
  inheritance: 'Thừa kế / Quà tặng',
  royalty: 'Bản quyền / Nhượng quyền',
  capital_investment: 'Góp vốn kinh doanh',
};

export const INCOME_SOURCE_DESCRIPTIONS: Record<IncomeSourceType, string> = {
  salary: 'Thu nhập từ hợp đồng lao động, tiền lương, thưởng',
  freelance: 'Thu nhập từ hoạt động kinh doanh cá nhân, dịch vụ tự do',
  rental: 'Thu nhập từ cho thuê nhà, đất, tài sản khác',
  dividend: 'Thu nhập từ cổ tức được chia từ công ty',
  interest: 'Lãi từ tiền gửi ngân hàng, trái phiếu doanh nghiệp',
  securities: 'Thu nhập từ mua bán cổ phiếu, trái phiếu, chứng chỉ quỹ',
  real_estate: 'Thu nhập từ chuyển nhượng quyền sử dụng đất, nhà',
  lottery: 'Thu nhập từ xổ số, đặt cược, casino, khuyến mại',
  inheritance: 'Thu nhập từ thừa kế hoặc quà tặng (ngoài gia đình)',
  royalty: 'Thu nhập từ bản quyền sáng chế, phần mềm, nhượng quyền thương mại',
  capital_investment: 'Thu nhập từ góp vốn, lợi nhuận chia, hoàn vốn',
};

/**
 * Thuế suất áp dụng cho từng loại thu nhập
 */
export const INCOME_TAX_RATES: Record<IncomeSourceType, {
  rate: number | 'progressive';
  description: string;
  method: 'flat' | 'progressive' | 'on_gain' | 'on_revenue';
  threshold?: number;
}> = {
  salary: {
    rate: 'progressive',
    description: 'Biểu thuế lũy tiến 5 bậc (từ 2026)',
    method: 'progressive',
  },
  freelance: {
    rate: 0.10,
    description: '10% trên doanh thu (dưới 100 triệu/năm có thể miễn)',
    method: 'on_revenue',
    threshold: 100_000_000,
  },
  rental: {
    rate: 0.05,
    description: '5% trên doanh thu cho thuê',
    method: 'on_revenue',
  },
  dividend: {
    rate: 0.05,
    description: '5% trên số tiền cổ tức',
    method: 'flat',
  },
  interest: {
    rate: 0.05,
    description: '5% trên lãi (lãi TPCP miễn thuế)',
    method: 'flat',
  },
  securities: {
    rate: 0.001,
    description: '0.1% trên giá trị chuyển nhượng',
    method: 'on_revenue',
  },
  real_estate: {
    rate: 0.02,
    description: '2% trên giá chuyển nhượng',
    method: 'on_revenue',
  },
  lottery: {
    rate: 0.10,
    description: '10% trên phần vượt 10 triệu',
    method: 'on_gain',
    threshold: 10_000_000,
  },
  inheritance: {
    rate: 0.10,
    description: '10% trên phần vượt 10 triệu (miễn nếu từ gia đình)',
    method: 'on_gain',
    threshold: 10_000_000,
  },
  royalty: {
    rate: 0.05,
    description: '5% trên thu nhập bản quyền',
    method: 'flat',
  },
  capital_investment: {
    rate: 0.05,
    description: '5% trên lợi nhuận được chia',
    method: 'flat',
  },
};

/**
 * Biểu thuế lũy tiến 5 bậc (từ 1/7/2026)
 */
// Tái dùng biểu thuế 5 bậc trung tâm (tránh duplicate sai lệch)
export const PROGRESSIVE_TAX_BRACKETS_2026 = NEW_TAX_BRACKETS;

/**
 * Giảm trừ gia cảnh (từ 1/7/2026)
 */
// Tái dùng mức giảm trừ gia cảnh trung tâm (NQ 110/2025/UBTVQH15)
export const DEDUCTIONS_2026 = {
  personal: NEW_DEDUCTIONS.personal,
  dependent: NEW_DEDUCTIONS.dependent,
};

/**
 * Một nguồn thu nhập
 */
export interface IncomeSource {
  id: string;
  type: IncomeSourceType;
  amount: number;              // Số tiền thu nhập
  frequency: 'monthly' | 'yearly' | 'one_time';
  description?: string;
  // Các trường đặc biệt cho từng loại
  isFromFamily?: boolean;      // Cho thừa kế/quà tặng
  isGovBond?: boolean;         // Cho lãi - miễn thuế nếu là TPCP
  acquisitionCost?: number;    // Chi phí mua vào (cho BĐS, CK nếu chọn tính theo lợi nhuận)
}

/**
 * Input cho tính toán đa nguồn
 */
export interface MultiSourceInput {
  // Danh sách thu nhập
  incomeSources: IncomeSource[];

  // Giảm trừ gia cảnh
  dependents: number;

  // Có bảo hiểm bắt buộc không (cho lương)
  hasInsurance: boolean;
  insuranceAmount?: number;

  // Các khoản giảm trừ khác
  pensionContribution: number;    // Hưu trí tự nguyện
  charitableContribution: number; // Từ thiện

  // Năm thuế
  taxYear: 2025 | 2026;
  isSecondHalf2026?: boolean;     // Sau 1/7/2026
}

/**
 * Kết quả tính thuế cho một nguồn
 */
export interface SourceTaxResult {
  source: IncomeSource;
  annualAmount: number;           // Quy đổi về năm
  taxableAmount: number;          // Số tiền chịu thuế
  taxAmount: number;              // Số tiền thuế
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
  totalTaxableIncome: number;     // Tổng thu nhập chịu thuế
  totalTax: number;               // Tổng thuế phải nộp
  totalNetIncome: number;         // Thu nhập thực nhận

  // Thuế theo loại
  progressiveTax: number;         // Thuế lũy tiến (từ lương)
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

function annualizeAmount(amount: number, frequency: 'monthly' | 'yearly' | 'one_time'): number {
  switch (frequency) {
    case 'monthly':
      return amount * 12;
    case 'yearly':
    case 'one_time':
      return amount;
  }
}

/**
 * Tính thuế lũy tiến cho thu nhập chịu thuế
 */
function calculateProgressiveTax(taxableIncome: number, isNewLaw: boolean): number {
  const brackets = PROGRESSIVE_TAX_BRACKETS_2026;
  let tax = 0;
  let remaining = taxableIncome;

  for (const bracket of brackets) {
    if (remaining <= 0) break;

    const bracketWidth = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
  }

  return Math.round(tax);
}

/**
 * Tính thuế cho một nguồn thu nhập
 */
function calculateSourceTax(source: IncomeSource, input: MultiSourceInput): SourceTaxResult {
  const annualAmount = annualizeAmount(source.amount, source.frequency);
  const rateInfo = INCOME_TAX_RATES[source.type];
  const notes: string[] = [];

  // Ngưỡng chịu thuế theo từng lần phát sinh (date-aware: 10M, 20M từ 01/7/2026)
  const perTxThreshold = getPerTransactionThreshold(
    new Date(input.taxYear, input.isSecondHalf2026 ? 6 : 0, 1)
  );
  const perTxThresholdText = `${perTxThreshold / 1_000_000} triệu`;

  let taxableAmount = annualAmount;
  let taxAmount = 0;
  let effectiveRate = 0;
  let appliedRate: number | 'progressive' = rateInfo.rate;
  let method = '';

  switch (source.type) {
    case 'salary': {
      // Tính thu nhập chịu thuế
      const monthlyGross = source.frequency === 'monthly' ? source.amount : source.amount / 12;

      // Giảm trừ BHXH: 10.5% lương, trần = 20 lần lương cơ sở (date-aware)
      const insuranceCap = getMaxSocialInsuranceSalary(new Date(input.taxYear, input.isSecondHalf2026 ? 6 : 0, 1));
      const monthlyInsurance = input.hasInsurance
        ? Math.min(monthlyGross, insuranceCap) * 0.105
        : (input.insuranceAmount || 0) / 12;

      // Giảm trừ gia cảnh
      const monthlyDeduction = DEDUCTIONS_2026.personal + (input.dependents * DEDUCTIONS_2026.dependent);

      // Giảm trừ hưu trí tự nguyện và từ thiện
      const otherDeductions = (input.pensionContribution + input.charitableContribution) / 12;

      const monthlyTaxable = Math.max(0, monthlyGross - monthlyInsurance - monthlyDeduction - otherDeductions);
      taxableAmount = monthlyTaxable * 12;

      // Tính thuế lũy tiến hàng tháng
      const monthlyTax = calculateProgressiveTax(monthlyTaxable, input.isSecondHalf2026 || false);
      taxAmount = monthlyTax * 12;

      appliedRate = 'progressive';
      method = 'Lũy tiến 5 bậc';

      if (input.dependents > 0) {
        notes.push(`Giảm trừ ${input.dependents} người phụ thuộc`);
      }
      break;
    }

    case 'freelance': {
      // 10% trên doanh thu nếu >= 100 triệu/năm
      if (annualAmount < INCOME_TAX_RATES.freelance.threshold!) {
        taxAmount = 0;
        taxableAmount = 0;
        notes.push('Doanh thu < 100 triệu/năm - có thể được miễn thuế TNCN');
      } else {
        taxAmount = Math.round(annualAmount * 0.10);
        notes.push('Thuế 10% trên doanh thu');
      }
      appliedRate = 0.10;
      method = 'Thuế suất cố định trên doanh thu';
      break;
    }

    case 'rental': {
      // 5% thuế TNCN + 5% GTGT trên doanh thu
      taxAmount = Math.round(annualAmount * 0.05);
      appliedRate = 0.05;
      method = '5% trên doanh thu';
      notes.push('Còn 5% thuế GTGT cần nộp riêng');
      break;
    }

    case 'dividend':
    case 'capital_investment': {
      // 5% cố định
      taxAmount = Math.round(annualAmount * 0.05);
      appliedRate = 0.05;
      method = '5% thuế suất cố định';
      break;
    }

    case 'interest': {
      if (source.isGovBond) {
        taxAmount = 0;
        taxableAmount = 0;
        appliedRate = 0;
        notes.push('Lãi trái phiếu Chính phủ được miễn thuế');
      } else {
        taxAmount = Math.round(annualAmount * 0.05);
        appliedRate = 0.05;
      }
      method = '5% thuế suất cố định';
      break;
    }

    case 'securities': {
      // 0.1% trên giá trị chuyển nhượng
      taxAmount = Math.round(annualAmount * 0.001);
      appliedRate = 0.001;
      method = '0.1% trên giá trị giao dịch';
      break;
    }

    case 'real_estate': {
      // 2% trên giá chuyển nhượng
      taxAmount = Math.round(annualAmount * 0.02);
      appliedRate = 0.02;
      method = '2% trên giá chuyển nhượng';
      notes.push('Có thể tính theo 25% lợi nhuận nếu có chứng từ');
      break;
    }

    case 'lottery': {
      // 10% trên phần vượt ngưỡng (date-aware: 10tr, 20tr từ 01/7/2026)
      if (annualAmount <= perTxThreshold) {
        taxAmount = 0;
        taxableAmount = 0;
        notes.push(`Trúng thưởng ≤ ${perTxThresholdText} - không chịu thuế`);
      } else {
        taxableAmount = annualAmount - perTxThreshold;
        taxAmount = Math.round(taxableAmount * 0.10);
        notes.push(`Thuế 10% trên phần vượt ${perTxThresholdText}`);
      }
      appliedRate = 0.10;
      method = '10% trên phần vượt ngưỡng';
      break;
    }

    case 'inheritance': {
      if (source.isFromFamily) {
        taxAmount = 0;
        taxableAmount = 0;
        notes.push('Thừa kế/quà tặng từ gia đình được miễn thuế');
      } else {
        if (annualAmount <= perTxThreshold) {
          taxAmount = 0;
          taxableAmount = 0;
          notes.push(`Giá trị ≤ ${perTxThresholdText} - không chịu thuế`);
        } else {
          taxableAmount = annualAmount - perTxThreshold;
          taxAmount = Math.round(taxableAmount * 0.10);
          notes.push(`Thuế 10% trên phần vượt ${perTxThresholdText}`);
        }
      }
      appliedRate = source.isFromFamily ? 0 : 0.10;
      method = source.isFromFamily ? 'Miễn thuế' : '10% trên phần vượt ngưỡng';
      break;
    }

    case 'royalty': {
      taxAmount = Math.round(annualAmount * 0.05);
      appliedRate = 0.05;
      method = '5% thuế suất cố định';
      break;
    }
  }

  effectiveRate = annualAmount > 0 ? taxAmount / annualAmount : 0;

  return {
    source,
    annualAmount,
    taxableAmount,
    taxAmount,
    effectiveRate,
    appliedRate,
    method,
    notes,
  };
}

// ===== MAIN FUNCTIONS =====

/**
 * Tính thuế tổng hợp từ nhiều nguồn thu nhập
 */
export function calculateMultiSourceTax(input: MultiSourceInput): MultiSourceResult {
  const sourceResults: SourceTaxResult[] = [];

  // Calculate tax for each source
  for (const source of input.incomeSources) {
    const result = calculateSourceTax(source, input);
    sourceResults.push(result);
  }

  // Aggregate results
  const totalGrossIncome = sourceResults.reduce((sum, r) => sum + r.annualAmount, 0);
  const totalTaxableIncome = sourceResults.reduce((sum, r) => sum + r.taxableAmount, 0);
  const totalTax = sourceResults.reduce((sum, r) => sum + r.taxAmount, 0);
  const totalNetIncome = totalGrossIncome - totalTax;

  // Calculate progressive vs flat tax
  const progressiveTax = sourceResults
    .filter(r => r.appliedRate === 'progressive')
    .reduce((sum, r) => sum + r.taxAmount, 0);

  const flatTax = sourceResults
    .filter(r => r.appliedRate !== 'progressive')
    .reduce((sum, r) => sum + r.taxAmount, 0);

  // Category breakdown
  const categoryBreakdown = {
    salary: { gross: 0, tax: 0 },
    investment: { gross: 0, tax: 0 },
    business: { gross: 0, tax: 0 },
    other: { gross: 0, tax: 0 },
  };

  for (const result of sourceResults) {
    const category = getCategoryForType(result.source.type);
    categoryBreakdown[category].gross += result.annualAmount;
    categoryBreakdown[category].tax += result.taxAmount;
  }

  // Overall effective rate
  const overallEffectiveRate = totalGrossIncome > 0 ? totalTax / totalGrossIncome : 0;

  // Optimization tips
  const optimizationTips = generateOptimizationTips(input, sourceResults);

  return {
    sourceResults,
    totalGrossIncome,
    totalTaxableIncome,
    totalTax,
    totalNetIncome,
    progressiveTax,
    flatTax,
    overallEffectiveRate,
    categoryBreakdown,
    optimizationTips,
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
 * Generate optimization tips
 */
function generateOptimizationTips(input: MultiSourceInput, results: SourceTaxResult[]): string[] {
  const tips: string[] = [];

  // Check for progressive tax optimization
  const salaryResults = results.filter(r => r.source.type === 'salary');
  const salaryTax = salaryResults.reduce((sum, r) => sum + r.taxAmount, 0);

  if (salaryTax > 0 && input.dependents === 0) {
    tips.push('Đăng ký người phụ thuộc (cha mẹ, con) để được giảm trừ thêm 7.2 triệu/tháng/người.');
  }

  // Check for pension contribution
  if (input.pensionContribution === 0 && salaryTax > 0) {
    tips.push('Đóng hưu trí tự nguyện để được giảm trừ thêm (tối đa 1 triệu/tháng).');
  }

  // Check for charitable contribution
  if (input.charitableContribution === 0 && salaryTax > 0) {
    tips.push('Đóng góp từ thiện qua tổ chức được công nhận để được giảm trừ.');
  }

  // Check for high freelance income
  const freelanceResults = results.filter(r => r.source.type === 'freelance');
  const freelanceIncome = freelanceResults.reduce((sum, r) => sum + r.annualAmount, 0);

  if (freelanceIncome > 1_000_000_000) {
    tips.push('Thu nhập freelance cao - cân nhắc thành lập doanh nghiệp để tối ưu thuế.');
  }

  // Check for rental income
  const rentalResults = results.filter(r => r.source.type === 'rental');
  const rentalIncome = rentalResults.reduce((sum, r) => sum + r.annualAmount, 0);

  if (rentalIncome > 1_000_000_000) {
    tips.push('Thu nhập cho thuê cao - cân nhắc đăng ký hộ kinh doanh để được khấu trừ chi phí.');
  }

  // Check for government bonds
  const hasInterest = results.some(r => r.source.type === 'interest' && !r.source.isGovBond);
  if (hasInterest) {
    tips.push('Cân nhắc đầu tư trái phiếu Chính phủ để được miễn thuế thu nhập.');
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
 * Format currency in Vietnamese style
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
