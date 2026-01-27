import {
  RegionType,
  InsuranceOptions,
  InsuranceDetail,
  DEFAULT_INSURANCE_OPTIONS,
  calculateOldTax,
  calculateNewTax,
  getInsuranceDetailed,
} from './taxCalculator';

// Thuế suất khấu trừ cho thu nhập vãng lai (freelancer/contractor)
export const FREELANCER_TAX_RATE = 0.10; // 10%

export type IncomeFrequency = 'monthly' | 'project' | 'annual';

// =============================================================================
// CONTENT CREATOR TYPES & CALCULATIONS
// =============================================================================

/**
 * Loại nguồn thu nhập cho Content Creator
 */
export type CreatorIncomeSourceType =
  | 'youtube'           // YouTube AdSense (nước ngoài, USD)
  | 'tiktok'            // TikTok Creator Fund (nước ngoài)
  | 'facebook_reels'    // Facebook/Instagram Reels Bonus
  | 'affiliate'         // Shopee/Lazada/Tiki Affiliate
  | 'sponsorship'       // Brand deals, Sponsorship
  | 'donation'          // Super Chat, Membership, Donation
  | 'digital_product'   // Khóa học online, Ebook
  | 'consulting'        // Tư vấn, Coaching
  | 'other';            // Thu nhập khác

/**
 * Thông tin nguồn thu nhập Creator
 */
export interface CreatorIncomeSource {
  id: string;
  type: CreatorIncomeSourceType;
  name: string;
  amount: number;          // Số tiền (VND hoặc USD tùy thuộc isForeign)
  currency: 'VND' | 'USD';
  frequency: IncomeFrequency;
  isForeign: boolean;      // Thu nhập từ nước ngoài?
  withheldTax: number;     // Thuế đã khấu trừ tại nguồn (nếu có)
}

/**
 * Tỷ giá USD/VND (có thể cập nhật)
 */
export const DEFAULT_USD_EXCHANGE_RATE = 25_400; // VND per USD

/**
 * Ngưỡng khấu trừ tại nguồn cho thu nhập trong nước
 */
export const WITHHOLDING_THRESHOLD = 2_000_000; // 2 triệu VND

/**
 * Metadata cho từng loại nguồn thu nhập
 */
export const CREATOR_INCOME_SOURCE_INFO: Record<CreatorIncomeSourceType, {
  label: string;
  description: string;
  defaultCurrency: 'VND' | 'USD';
  isForeign: boolean;
  withheldAtSource: boolean; // Có khấu trừ tại nguồn không?
}> = {
  youtube: {
    label: 'YouTube AdSense',
    description: 'Thu nhập từ quảng cáo YouTube (Google trả USD)',
    defaultCurrency: 'USD',
    isForeign: true,
    withheldAtSource: false,
  },
  tiktok: {
    label: 'TikTok Creator Fund',
    description: 'Thu nhập từ TikTok Creator Fund, Creator Rewards',
    defaultCurrency: 'USD',
    isForeign: true,
    withheldAtSource: false,
  },
  facebook_reels: {
    label: 'Facebook/Instagram Reels',
    description: 'Bonus từ Facebook Reels, Instagram Reels',
    defaultCurrency: 'USD',
    isForeign: true,
    withheldAtSource: false,
  },
  affiliate: {
    label: 'Affiliate Marketing',
    description: 'Hoa hồng từ Shopee, Lazada, Tiki Affiliate',
    defaultCurrency: 'VND',
    isForeign: false,
    withheldAtSource: true, // >= 2 triệu khấu trừ 10%
  },
  sponsorship: {
    label: 'Sponsorship / Brand Deal',
    description: 'Thu nhập từ hợp đồng quảng cáo, review sản phẩm',
    defaultCurrency: 'VND',
    isForeign: false,
    withheldAtSource: true,
  },
  donation: {
    label: 'Donation / Super Chat',
    description: 'Super Chat, Membership, ủng hộ từ khán giả',
    defaultCurrency: 'VND',
    isForeign: false,
    withheldAtSource: false,
  },
  digital_product: {
    label: 'Sản phẩm số',
    description: 'Bán khóa học online, Ebook, Template',
    defaultCurrency: 'VND',
    isForeign: false,
    withheldAtSource: true,
  },
  consulting: {
    label: 'Tư vấn / Coaching',
    description: 'Tư vấn 1-1, Mentoring, Coaching',
    defaultCurrency: 'VND',
    isForeign: false,
    withheldAtSource: true,
  },
  other: {
    label: 'Thu nhập khác',
    description: 'Các nguồn thu nhập không liệt kê ở trên',
    defaultCurrency: 'VND',
    isForeign: false,
    withheldAtSource: false,
  },
};

/**
 * Input cho tính thuế Creator
 */
export interface CreatorTaxInput {
  incomeSources: CreatorIncomeSource[];
  exchangeRate: number;     // Tỷ giá USD/VND
  dependents: number;
  region: RegionType;
  useNewLaw: boolean;
  hasInsurance: boolean;
  insuranceOptions?: InsuranceOptions;
}

/**
 * Chi tiết thuế cho từng nguồn thu nhập
 */
export interface CreatorIncomeSourceResult {
  source: CreatorIncomeSource;
  monthlyAmountVND: number;     // Quy đổi về VND/tháng
  annualAmountVND: number;      // VND/năm
  taxRate: number;              // Thuế suất áp dụng
  estimatedTax: number;         // Thuế ước tính (năm)
  withheldTax: number;          // Thuế đã khấu trừ
  taxOwed: number;              // Thuế còn phải nộp
}

/**
 * Kết quả tính thuế Creator
 */
export interface CreatorTaxResult {
  // Tổng hợp thu nhập
  totalMonthlyGross: number;
  totalAnnualGross: number;

  // Chi tiết theo nguồn
  sourceResults: CreatorIncomeSourceResult[];

  // Thu nhập theo loại
  foreignIncome: number;        // Thu nhập nước ngoài (năm)
  domesticIncome: number;       // Thu nhập trong nước (năm)

  // Thuế
  totalEstimatedTax: number;    // Tổng thuế ước tính (10% flat)
  totalWithheldTax: number;     // Thuế đã khấu trừ
  totalTaxOwed: number;         // Thuế còn phải nộp

  // Net income
  monthlyNet: number;
  annualNet: number;
  effectiveRate: number;

  // So sánh với nhân viên
  employeeComparison: {
    tax: number;
    insurance: number;
    net: number;
    annualTax: number;
    annualInsurance: number;
    annualNet: number;
    effectiveRate: number;
    insuranceDetail: InsuranceDetail;
  };

  // So sánh
  comparison: {
    netDifference: number;
    annualDifference: number;
    creatorBetter: boolean;
  };
}

/**
 * Quy đổi thu nhập về VND/tháng
 */
function normalizeIncomeToMonthlyVND(
  source: CreatorIncomeSource,
  exchangeRate: number
): number {
  // Quy đổi tiền tệ
  let amountVND = source.currency === 'USD'
    ? source.amount * exchangeRate
    : source.amount;

  // Quy đổi về tháng
  switch (source.frequency) {
    case 'monthly':
      return amountVND;
    case 'project':
      return amountVND; // Coi mỗi dự án như 1 tháng
    case 'annual':
      return amountVND / 12;
  }
}

/**
 * Quy đổi thu nhập về VND/năm
 */
function normalizeIncomeToAnnualVND(
  source: CreatorIncomeSource,
  exchangeRate: number
): number {
  let amountVND = source.currency === 'USD'
    ? source.amount * exchangeRate
    : source.amount;

  switch (source.frequency) {
    case 'monthly':
      return amountVND * 12;
    case 'project':
      return amountVND; // Dự án đơn lẻ
    case 'annual':
      return amountVND;
  }
}

/**
 * Tính thuế cho một nguồn thu nhập
 */
function calculateSourceTax(
  source: CreatorIncomeSource,
  exchangeRate: number
): CreatorIncomeSourceResult {
  const monthlyVND = normalizeIncomeToMonthlyVND(source, exchangeRate);
  const annualVND = normalizeIncomeToAnnualVND(source, exchangeRate);

  // Thuế suất 10% cho thu nhập vãng lai (cả trong nước và nước ngoài)
  const taxRate = FREELANCER_TAX_RATE;
  const estimatedTax = annualVND * taxRate;

  // Thuế đã khấu trừ tại nguồn
  let withheldTax = source.withheldTax || 0;

  // Với thu nhập trong nước >= 2 triệu, bên trả có thể đã khấu trừ 10%
  const sourceInfo = CREATOR_INCOME_SOURCE_INFO[source.type];
  if (!source.isForeign && sourceInfo.withheldAtSource) {
    // Giả sử đã khấu trừ nếu >= ngưỡng
    // (trong thực tế, user cần nhập số đã khấu trừ)
  }

  const taxOwed = Math.max(0, estimatedTax - withheldTax);

  return {
    source,
    monthlyAmountVND: monthlyVND,
    annualAmountVND: annualVND,
    taxRate,
    estimatedTax,
    withheldTax,
    taxOwed,
  };
}

/**
 * Tính thuế tổng hợp cho Content Creator
 */
export function calculateCreatorTax(input: CreatorTaxInput): CreatorTaxResult {
  const {
    incomeSources,
    exchangeRate,
    dependents,
    region,
    useNewLaw,
    hasInsurance,
    insuranceOptions = DEFAULT_INSURANCE_OPTIONS,
  } = input;

  // Tính thuế cho từng nguồn
  const sourceResults = incomeSources.map(source =>
    calculateSourceTax(source, exchangeRate)
  );

  // Tổng hợp
  const totalMonthlyGross = sourceResults.reduce(
    (sum, r) => sum + r.monthlyAmountVND, 0
  );
  const totalAnnualGross = sourceResults.reduce(
    (sum, r) => sum + r.annualAmountVND, 0
  );

  // Phân loại thu nhập
  const foreignIncome = sourceResults
    .filter(r => r.source.isForeign)
    .reduce((sum, r) => sum + r.annualAmountVND, 0);
  const domesticIncome = sourceResults
    .filter(r => !r.source.isForeign)
    .reduce((sum, r) => sum + r.annualAmountVND, 0);

  // Tổng thuế
  const totalEstimatedTax = sourceResults.reduce(
    (sum, r) => sum + r.estimatedTax, 0
  );
  const totalWithheldTax = sourceResults.reduce(
    (sum, r) => sum + r.withheldTax, 0
  );
  const totalTaxOwed = sourceResults.reduce(
    (sum, r) => sum + r.taxOwed, 0
  );

  // Net income
  const annualNet = totalAnnualGross - totalEstimatedTax;
  const monthlyNet = annualNet / 12;
  const effectiveRate = totalAnnualGross > 0
    ? (totalEstimatedTax / totalAnnualGross) * 100
    : 0;

  // So sánh với nhân viên (nếu làm công ăn lương với thu nhập tương đương)
  const taxResult = useNewLaw
    ? calculateNewTax({
        grossIncome: totalMonthlyGross,
        dependents,
        hasInsurance,
        insuranceOptions,
        region,
      })
    : calculateOldTax({
        grossIncome: totalMonthlyGross,
        dependents,
        hasInsurance,
        insuranceOptions,
        region,
      });

  const insuranceDetail = getInsuranceDetailed(
    totalMonthlyGross, region, insuranceOptions
  );
  const employeeMonthlyInsurance = hasInsurance ? insuranceDetail.total : 0;
  const employeeMonthlyTax = taxResult.taxAmount;
  const employeeMonthlyNet = taxResult.netIncome;

  const employeeComparison = {
    tax: employeeMonthlyTax,
    insurance: employeeMonthlyInsurance,
    net: employeeMonthlyNet,
    annualTax: employeeMonthlyTax * 12,
    annualInsurance: employeeMonthlyInsurance * 12,
    annualNet: employeeMonthlyNet * 12,
    effectiveRate: totalMonthlyGross > 0
      ? (employeeMonthlyTax / totalMonthlyGross) * 100
      : 0,
    insuranceDetail,
  };

  // So sánh
  const netDifference = monthlyNet - employeeMonthlyNet;
  const annualDifference = annualNet - employeeComparison.annualNet;

  return {
    totalMonthlyGross,
    totalAnnualGross,
    sourceResults,
    foreignIncome,
    domesticIncome,
    totalEstimatedTax,
    totalWithheldTax,
    totalTaxOwed,
    monthlyNet,
    annualNet,
    effectiveRate,
    employeeComparison,
    comparison: {
      netDifference,
      annualDifference,
      creatorBetter: netDifference > 0,
    },
  };
}

/**
 * Tạo nguồn thu nhập mặc định
 */
export function createDefaultIncomeSource(
  type: CreatorIncomeSourceType
): CreatorIncomeSource {
  const info = CREATOR_INCOME_SOURCE_INFO[type];
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    name: info.label,
    amount: 0,
    currency: info.defaultCurrency,
    frequency: 'monthly',
    isForeign: info.isForeign,
    withheldTax: 0,
  };
}

export interface FreelancerInput {
  grossIncome: number;
  frequency: IncomeFrequency;
  // Cho so sánh với nhân viên
  dependents: number;
  hasInsurance: boolean;
  insuranceOptions?: InsuranceOptions;
  region: RegionType;
  // Phiên bản luật thuế
  useNewLaw: boolean;
}

export interface FreelancerResult {
  gross: number;           // Tương đương tháng
  annualGross: number;

  // Tính toán cho Freelancer
  freelancer: {
    tax: number;           // 10% của gross
    net: number;           // gross - tax
    annualTax: number;
    annualNet: number;
    effectiveRate: number;
  };

  // Tính toán cho nhân viên (sử dụng logic hiện có)
  employee: {
    tax: number;
    insurance: number;
    net: number;
    annualTax: number;
    annualInsurance: number;
    annualNet: number;
    effectiveRate: number;
    insuranceDetail: InsuranceDetail;
  };

  // So sánh
  comparison: {
    netDifference: number;        // freelancer.net - employee.net
    annualDifference: number;
    freelancerBetter: boolean;
    breakEvenGross: number;       // Mức thu nhập mà 2 bên bằng nhau
  };
}

// Chuẩn hóa về tháng
function normalizeToMonthly(amount: number, frequency: IncomeFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amount;
    case 'project':
      return amount; // Mỗi dự án coi như 1 tháng
    case 'annual':
      return amount / 12;
  }
}

// Chuẩn hóa về năm
function normalizeToAnnual(amount: number, frequency: IncomeFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amount * 12;
    case 'project':
      return amount; // Dự án đơn lẻ
    case 'annual':
      return amount;
  }
}

// Tính điểm hòa vốn bằng binary search
export function calculateBreakEven(
  dependents: number,
  hasInsurance: boolean,
  region: RegionType,
  useNewLaw: boolean,
  insuranceOptions: InsuranceOptions = DEFAULT_INSURANCE_OPTIONS
): number {
  let low = 0;
  let high = 500_000_000; // 500 triệu
  const tolerance = 10_000; // 10k

  while (high - low > tolerance) {
    const mid = Math.floor((low + high) / 2);

    // Freelancer NET
    const freelancerNet = mid * (1 - FREELANCER_TAX_RATE);

    // Employee NET
    const taxResult = useNewLaw
      ? calculateNewTax({
          grossIncome: mid,
          dependents,
          hasInsurance,
          insuranceOptions,
          region,
        })
      : calculateOldTax({
          grossIncome: mid,
          dependents,
          hasInsurance,
          insuranceOptions,
          region,
        });
    const employeeNet = taxResult.netIncome;

    if (freelancerNet > employeeNet) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return Math.round((low + high) / 2);
}

// Hàm tính chính
export function calculateFreelancerComparison(input: FreelancerInput): FreelancerResult {
  const {
    grossIncome: rawGrossIncome,
    frequency,
    dependents: rawDependents,
    hasInsurance,
    insuranceOptions = DEFAULT_INSURANCE_OPTIONS,
    region,
    useNewLaw,
  } = input;

  // Input validation - ensure non-negative values
  const grossIncome = Math.max(0, rawGrossIncome || 0);
  const dependents = Math.max(0, rawDependents || 0);

  // 1. Chuẩn hóa về tháng
  const monthlyGross = normalizeToMonthly(grossIncome, frequency);
  const annualGross = normalizeToAnnual(grossIncome, frequency);

  // 2. Tính thuế freelancer (đơn giản 10%)
  const freelancerMonthlyTax = monthlyGross * FREELANCER_TAX_RATE;
  const freelancerMonthlyNet = monthlyGross - freelancerMonthlyTax;
  const freelancerAnnualTax = annualGross * FREELANCER_TAX_RATE;
  const freelancerAnnualNet = annualGross - freelancerAnnualTax;

  // 3. Tính thuế nhân viên
  const taxResult = useNewLaw
    ? calculateNewTax({
        grossIncome: monthlyGross,
        dependents,
        hasInsurance,
        insuranceOptions,
        region,
      })
    : calculateOldTax({
        grossIncome: monthlyGross,
        dependents,
        hasInsurance,
        insuranceOptions,
        region,
      });

  const insuranceDetail = getInsuranceDetailed(monthlyGross, region, insuranceOptions);
  const employeeMonthlyInsurance = hasInsurance ? insuranceDetail.total : 0;
  const employeeMonthlyTax = taxResult.taxAmount;
  const employeeMonthlyNet = taxResult.netIncome;

  const employeeAnnualInsurance = employeeMonthlyInsurance * 12;
  const employeeAnnualTax = employeeMonthlyTax * 12;
  const employeeAnnualNet = employeeMonthlyNet * 12;

  // 4. Tính điểm hòa vốn
  const breakEvenGross = calculateBreakEven(
    dependents,
    hasInsurance,
    region,
    useNewLaw,
    insuranceOptions
  );

  // 5. So sánh
  const netDifference = freelancerMonthlyNet - employeeMonthlyNet;
  const annualDifference = freelancerAnnualNet - employeeAnnualNet;

  return {
    gross: monthlyGross,
    annualGross,
    freelancer: {
      tax: freelancerMonthlyTax,
      net: freelancerMonthlyNet,
      annualTax: freelancerAnnualTax,
      annualNet: freelancerAnnualNet,
      effectiveRate: FREELANCER_TAX_RATE * 100,
    },
    employee: {
      tax: employeeMonthlyTax,
      insurance: employeeMonthlyInsurance,
      net: employeeMonthlyNet,
      annualTax: employeeAnnualTax,
      annualInsurance: employeeAnnualInsurance,
      annualNet: employeeAnnualNet,
      effectiveRate: monthlyGross > 0 ? (employeeMonthlyTax / monthlyGross) * 100 : 0,
      insuranceDetail,
    },
    comparison: {
      netDifference,
      annualDifference,
      freelancerBetter: netDifference > 0,
      breakEvenGross,
    },
  };
}

// Tạo dữ liệu cho biểu đồ so sánh
export function generateComparisonRange(
  minGross: number,
  maxGross: number,
  step: number,
  dependents: number,
  hasInsurance: boolean,
  region: RegionType,
  useNewLaw: boolean
): { gross: number; freelancerNet: number; employeeNet: number; difference: number }[] {
  const result = [];

  for (let gross = minGross; gross <= maxGross; gross += step) {
    const freelancerNet = gross * (1 - FREELANCER_TAX_RATE);

    const taxResult = useNewLaw
      ? calculateNewTax({ grossIncome: gross, dependents, hasInsurance, region })
      : calculateOldTax({ grossIncome: gross, dependents, hasInsurance, region });

    const employeeNet = taxResult.netIncome;

    result.push({
      gross,
      freelancerNet,
      employeeNet,
      difference: freelancerNet - employeeNet,
    });
  }

  return result;
}

// Ưu và nhược điểm
export const FREELANCER_PROS = [
  'Linh hoạt về thời gian và địa điểm làm việc',
  'Không phụ thuộc vào một công ty',
  'Có thể nhận nhiều dự án cùng lúc',
  'Thu nhập thực nhận cao hơn (ở mức lương cao)',
  'Thuế suất cố định 10%, không lũy tiến',
];

export const FREELANCER_CONS = [
  'Không được đóng BHXH, không có lương hưu từ nhà nước',
  'Phải tự mua BHYT (~1-2 triệu/tháng)',
  'Không được nghỉ phép có lương, không phép năm',
  'Thu nhập không ổn định, phụ thuộc vào dự án',
  'Tự chịu trách nhiệm thuế, hóa đơn, kế toán',
  'Không có thưởng tháng 13, trợ cấp thôi việc',
  'Khó vay ngân hàng (chứng minh thu nhập khó)',
];

export const EMPLOYEE_PROS = [
  'Doanh nghiệp đóng 21.5% bảo hiểm cho bạn',
  'Được đóng BHXH (lương hưu, thai sản, ốm đau)',
  'Được BHYT với mức đóng thấp (1.5%)',
  'Thu nhập ổn định, được nghỉ phép có lương',
  'Có thưởng tháng 13, trợ cấp thôi việc',
  'Thuế suất thấp hơn ở mức thu nhập trung bình',
  'Dễ vay ngân hàng (có hợp đồng lao động)',
];

export const EMPLOYEE_CONS = [
  'Thu nhập thực nhận thấp hơn (ở mức lương cao)',
  'Bị ràng buộc bởi hợp đồng lao động',
  'Phải làm việc theo giờ hành chính',
  'Khó nhận nhiều công việc cùng lúc',
];
