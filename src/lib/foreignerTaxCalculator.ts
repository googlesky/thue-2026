// ===== FOREIGNER TAX CALCULATOR =====
// Tính thuế TNCN cho người nước ngoài làm việc tại Việt Nam
// Thuế thu nhập cá nhân expatriate / non-resident tax Vietnam

import {
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  EFFECTIVE_DATES,
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
  getInsuranceDetailed,
  InsuranceDetail,
  TaxBreakdownItem,
} from './taxCalculator';

// ===== CONSTANTS =====

// Thuế suất cho người không cư trú (Non-resident flat rate)
export const NON_RESIDENT_TAX_RATE = 0.20; // 20% flat

// Số ngày để xác định cư trú thuế (183 ngày/năm)
export const RESIDENCY_DAYS_THRESHOLD = 183;

// Danh sách các nước có Hiệp định tránh đánh thuế hai lần với Việt Nam
export const DOUBLE_TAX_TREATY_COUNTRIES = [
  { code: 'AU', name: 'Úc (Australia)', year: 1992 },
  { code: 'AT', name: 'Áo (Austria)', year: 2009 },
  { code: 'BY', name: 'Belarus', year: 1997 },
  { code: 'BE', name: 'Bỉ (Belgium)', year: 1996 },
  { code: 'BN', name: 'Brunei', year: 2007 },
  { code: 'BG', name: 'Bulgaria', year: 1996 },
  { code: 'CA', name: 'Canada', year: 1997 },
  { code: 'CN', name: 'Trung Quốc (China)', year: 1995 },
  { code: 'HR', name: 'Croatia', year: 2016 },
  { code: 'CZ', name: 'Séc (Czech Republic)', year: 1997 },
  { code: 'DK', name: 'Đan Mạch (Denmark)', year: 1995 },
  { code: 'EG', name: 'Ai Cập (Egypt)', year: 2012 },
  { code: 'FI', name: 'Phần Lan (Finland)', year: 2002 },
  { code: 'FR', name: 'Pháp (France)', year: 1993 },
  { code: 'DE', name: 'Đức (Germany)', year: 1996 },
  { code: 'HK', name: 'Hồng Kông (Hong Kong)', year: 2008 },
  { code: 'HU', name: 'Hungary', year: 1995 },
  { code: 'IS', name: 'Iceland', year: 2003 },
  { code: 'IN', name: 'Ấn Độ (India)', year: 1994 },
  { code: 'ID', name: 'Indonesia', year: 1998 },
  { code: 'IR', name: 'Iran', year: 2014 },
  { code: 'IE', name: 'Ireland', year: 2008 },
  { code: 'IL', name: 'Israel', year: 2009 },
  { code: 'IT', name: 'Ý (Italy)', year: 1996 },
  { code: 'JP', name: 'Nhật Bản (Japan)', year: 1995 },
  { code: 'KZ', name: 'Kazakhstan', year: 2015 },
  { code: 'KP', name: 'Triều Tiên (North Korea)', year: 2005 },
  { code: 'KR', name: 'Hàn Quốc (South Korea)', year: 1994 },
  { code: 'KW', name: 'Kuwait', year: 2011 },
  { code: 'LA', name: 'Lào (Laos)', year: 1996 },
  { code: 'LV', name: 'Latvia', year: 2016 },
  { code: 'LU', name: 'Luxembourg', year: 1996 },
  { code: 'MY', name: 'Malaysia', year: 1995 },
  { code: 'MT', name: 'Malta', year: 2017 },
  { code: 'MN', name: 'Mông Cổ (Mongolia)', year: 1996 },
  { code: 'MA', name: 'Morocco', year: 2012 },
  { code: 'MZ', name: 'Mozambique', year: 2016 },
  { code: 'MM', name: 'Myanmar', year: 2011 },
  { code: 'NL', name: 'Hà Lan (Netherlands)', year: 1995 },
  { code: 'NZ', name: 'New Zealand', year: 2013 },
  { code: 'NO', name: 'Na Uy (Norway)', year: 1996 },
  { code: 'OM', name: 'Oman', year: 2010 },
  { code: 'PK', name: 'Pakistan', year: 2005 },
  { code: 'PA', name: 'Panama', year: 2017 },
  { code: 'PH', name: 'Philippines', year: 2003 },
  { code: 'PL', name: 'Ba Lan (Poland)', year: 1994 },
  { code: 'PT', name: 'Bồ Đào Nha (Portugal)', year: 2016 },
  { code: 'QA', name: 'Qatar', year: 2009 },
  { code: 'RO', name: 'Romania', year: 1996 },
  { code: 'RU', name: 'Nga (Russia)', year: 1993 },
  { code: 'SA', name: 'Ả Rập Saudi (Saudi Arabia)', year: 2010 },
  { code: 'RS', name: 'Serbia', year: 2016 },
  { code: 'SC', name: 'Seychelles', year: 2006 },
  { code: 'SG', name: 'Singapore', year: 1994 },
  { code: 'SK', name: 'Slovakia', year: 2009 },
  { code: 'ES', name: 'Tây Ban Nha (Spain)', year: 2006 },
  { code: 'LK', name: 'Sri Lanka', year: 2006 },
  { code: 'SE', name: 'Thụy Điển (Sweden)', year: 1994 },
  { code: 'CH', name: 'Thụy Sĩ (Switzerland)', year: 1996 },
  { code: 'TW', name: 'Đài Loan (Taiwan)', year: 1998 },
  { code: 'TH', name: 'Thái Lan (Thailand)', year: 1992 },
  { code: 'TN', name: 'Tunisia', year: 2013 },
  { code: 'TR', name: 'Thổ Nhĩ Kỳ (Turkey)', year: 2015 },
  { code: 'UA', name: 'Ukraine', year: 1996 },
  { code: 'AE', name: 'UAE', year: 2009 },
  { code: 'GB', name: 'Anh (United Kingdom)', year: 1994 },
  { code: 'US', name: 'Hoa Kỳ (United States)', year: 2016 },
  { code: 'UZ', name: 'Uzbekistan', year: 1996 },
  { code: 'VE', name: 'Venezuela', year: 2009 },
];

// ===== TYPES =====

export type ResidencyStatus = 'resident' | 'non-resident' | 'unknown';

export interface ForeignerAllowances {
  housing: number;           // Phụ cấp nhà ở
  schoolFees: number;        // Học phí cho con
  homeLeaveFare: number;     // Vé máy bay về nước
  relocation: number;        // Chi phí chuyển chỗ ở
  languageTraining: number;  // Đào tạo ngôn ngữ
  other: number;             // Phụ cấp khác
}

export const DEFAULT_FOREIGNER_ALLOWANCES: ForeignerAllowances = {
  housing: 0,
  schoolFees: 0,
  homeLeaveFare: 0,
  relocation: 0,
  languageTraining: 0,
  other: 0,
};

export interface ForeignerTaxInput {
  // Thông tin cá nhân
  nationality: string;              // Quốc tịch
  arrivalDate?: Date;               // Ngày đến Việt Nam
  daysInVietnam?: number;           // Số ngày ở VN (nếu không có arrivalDate)
  hasPermanentResidence: boolean;   // Có nơi ở thường trú không

  // Thu nhập
  grossIncome: number;              // Thu nhập từ VN
  foreignIncome?: number;           // Thu nhập từ nước ngoài (chỉ resident)

  // Phụ cấp
  allowances: ForeignerAllowances;

  // Bảo hiểm
  hasVietnameseInsurance: boolean;
  insuranceOptions?: InsuranceOptions;
  region?: RegionType;

  // Giảm trừ
  dependents: number;

  // Năm tính thuế
  taxYear: 2025 | 2026;
  isSecondHalf2026?: boolean;       // Deprecated: Luật mới áp dụng từ 01/01/2026 cho toàn năm
}

export interface ForeignerTaxResult {
  // Trạng thái cư trú
  residencyStatus: ResidencyStatus;
  daysInVietnam: number;

  // Thu nhập
  grossIncome: number;
  foreignIncome: number;
  totalAllowances: number;
  taxableAllowances: number;
  exemptAllowances: number;
  totalIncome: number;

  // Các khoản giảm trừ (chỉ resident)
  insuranceDeduction: number;
  insuranceDetail?: InsuranceDetail;
  personalDeduction: number;
  dependentDeduction: number;
  totalDeductions: number;

  // Thuế
  taxableIncome: number;
  taxAmount: number;
  taxBreakdown?: TaxBreakdownItem[];
  effectiveTaxRate: number;

  // Thu nhập thực nhận
  netIncome: number;

  // So sánh
  taxUnderOldLaw?: number;
  taxUnderNewLaw?: number;
  savings?: number;

  // Thông tin bổ sung
  hasTreatyWithCountry: boolean;
  treatyInfo?: { code: string; name: string; year: number };
  notes: string[];
}

// ===== HELPER FUNCTIONS =====

/**
 * Tính số ngày từ ngày đến đến cuối năm
 */
export function calculateDaysInVietnam(arrivalDate: Date, taxYear: number): number {
  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear, 11, 31);

  // Nếu đến trước năm tính thuế, tính từ đầu năm
  const effectiveStart = arrivalDate < yearStart ? yearStart : arrivalDate;

  // Tính số ngày
  const today = new Date();
  const endDate = today < yearEnd ? today : yearEnd;

  if (effectiveStart > endDate) return 0;

  const diffTime = Math.abs(endDate.getTime() - effectiveStart.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return diffDays;
}

/**
 * Xác định trạng thái cư trú thuế
 */
export function determineResidencyStatus(
  daysInVietnam: number,
  hasPermanentResidence: boolean
): ResidencyStatus {
  // Có nơi ở thường trú tại VN = cư trú
  if (hasPermanentResidence) return 'resident';

  // Ở VN >= 183 ngày/năm = cư trú
  if (daysInVietnam >= RESIDENCY_DAYS_THRESHOLD) return 'resident';

  // Ở VN < 183 ngày = không cư trú
  return 'non-resident';
}

/**
 * Kiểm tra quốc gia có hiệp định thuế với VN không
 */
export function checkDoubleTaxTreaty(nationalityCode: string): { code: string; name: string; year: number } | undefined {
  return DOUBLE_TAX_TREATY_COUNTRIES.find(
    c => c.code.toLowerCase() === nationalityCode.toLowerCase()
  );
}

/**
 * Tính phụ cấp chịu thuế và miễn thuế
 */
export function calculateForeignerAllowances(allowances: ForeignerAllowances): {
  total: number;
  taxable: number;
  exempt: number;
} {
  const total =
    allowances.housing +
    allowances.schoolFees +
    allowances.homeLeaveFare +
    allowances.relocation +
    allowances.languageTraining +
    allowances.other;

  // Phụ cấp miễn thuế cho người nước ngoài:
  // - Học phí cho con (schoolFees)
  // - Vé máy bay về nước 1 lần/năm (homeLeaveFare)
  // - Chi phí chuyển chỗ ở (relocation) - chỉ 1 lần
  const exempt = allowances.schoolFees + allowances.homeLeaveFare + allowances.relocation;

  // Phụ cấp chịu thuế:
  // - Nhà ở (housing) - chịu thuế 100%
  // - Đào tạo ngôn ngữ (languageTraining) - chịu thuế nếu không phục vụ công việc
  // - Phụ cấp khác (other)
  const taxable = allowances.housing + allowances.languageTraining + allowances.other;

  return { total, taxable, exempt };
}

// ===== MAIN CALCULATION =====

/**
 * Tính thuế cho người không cư trú (Non-resident)
 */
function calculateNonResidentTax(input: ForeignerTaxInput): ForeignerTaxResult {
  const { grossIncome, allowances, nationality } = input;

  const allowanceCalc = calculateForeignerAllowances(allowances);

  // Non-resident: Thuế = 20% × (Thu nhập từ VN + phụ cấp chịu thuế)
  // Không được giảm trừ gia cảnh, không được giảm trừ bảo hiểm
  const taxableIncome = grossIncome + allowanceCalc.taxable;
  const taxAmount = taxableIncome * NON_RESIDENT_TAX_RATE;

  const totalIncome = grossIncome + allowanceCalc.total;
  const netIncome = totalIncome - taxAmount;
  const effectiveTaxRate = totalIncome > 0 ? (taxAmount / totalIncome) * 100 : 0;

  const treatyInfo = checkDoubleTaxTreaty(nationality);

  const notes: string[] = [
    'Người không cư trú chịu thuế 20% trên thu nhập phát sinh tại Việt Nam.',
    'Không được áp dụng giảm trừ gia cảnh và giảm trừ bảo hiểm.',
  ];

  if (treatyInfo) {
    notes.push(`Quốc gia ${treatyInfo.name} có Hiệp định thuế với Việt Nam (từ ${treatyInfo.year}). Có thể được khấu trừ thuế đã nộp.`);
  }

  return {
    residencyStatus: 'non-resident',
    daysInVietnam: input.daysInVietnam ?? 0,
    grossIncome,
    foreignIncome: 0, // Non-resident không tính thu nhập nước ngoài
    totalAllowances: allowanceCalc.total,
    taxableAllowances: allowanceCalc.taxable,
    exemptAllowances: allowanceCalc.exempt,
    totalIncome,
    insuranceDeduction: 0,
    personalDeduction: 0,
    dependentDeduction: 0,
    totalDeductions: 0,
    taxableIncome,
    taxAmount,
    effectiveTaxRate,
    netIncome,
    hasTreatyWithCountry: !!treatyInfo,
    treatyInfo,
    notes,
  };
}

/**
 * Tính thuế cho người cư trú (Resident)
 */
function calculateResidentTax(input: ForeignerTaxInput): ForeignerTaxResult {
  const {
    grossIncome,
    foreignIncome = 0,
    allowances,
    hasVietnameseInsurance,
    insuranceOptions = DEFAULT_INSURANCE_OPTIONS,
    region = 1,
    dependents,
    taxYear,
    isSecondHalf2026,
    nationality,
    daysInVietnam = 0,
  } = input;

  // Xác định luật áp dụng
  // Note: Từ 01/01/2026, luật mới áp dụng cho toàn bộ năm đối với thu nhập tiền lương, tiền công
  const useNewLaw = taxYear === 2026;
  const brackets = useNewLaw ? NEW_TAX_BRACKETS : OLD_TAX_BRACKETS;
  const deductions = useNewLaw ? NEW_DEDUCTIONS : OLD_DEDUCTIONS;

  const allowanceCalc = calculateForeignerAllowances(allowances);

  // Tổng thu nhập = VN + nước ngoài + phụ cấp chịu thuế
  const totalTaxableIncome = grossIncome + foreignIncome + allowanceCalc.taxable;

  // Tính bảo hiểm (nếu có)
  let insuranceDetail: InsuranceDetail | undefined;
  let insuranceDeduction = 0;

  if (hasVietnameseInsurance) {
    insuranceDetail = getInsuranceDetailed(grossIncome, region, insuranceOptions);
    insuranceDeduction = insuranceDetail.total;
  }

  // Giảm trừ
  const personalDeduction = deductions.personal;
  const dependentDeduction = dependents * deductions.dependent;
  const totalDeductions = insuranceDeduction + personalDeduction + dependentDeduction;

  // Thu nhập chịu thuế
  const taxableIncome = Math.max(0, totalTaxableIncome - totalDeductions);

  // Tính thuế theo biểu lũy tiến
  let taxAmount = 0;
  const taxBreakdown: TaxBreakdownItem[] = [];
  let remaining = taxableIncome;

  for (let i = 0; i < brackets.length && remaining > 0; i++) {
    const bracket = brackets[i];
    const bracketWidth = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    const taxInBracket = taxableInBracket * bracket.rate;

    if (taxableInBracket > 0) {
      taxBreakdown.push({
        bracket: i + 1,
        from: bracket.min,
        to: bracket.max === Infinity ? bracket.min + taxableInBracket : bracket.max,
        rate: bracket.rate,
        taxableAmount: taxableInBracket,
        taxAmount: taxInBracket,
      });
    }

    taxAmount += taxInBracket;
    remaining -= taxableInBracket;
  }

  // Tính thuế theo luật cũ và mới để so sánh
  let taxUnderOldLaw: number | undefined;
  let taxUnderNewLaw: number | undefined;
  let savings: number | undefined;

  if (taxYear === 2026) {
    // Tính với luật cũ
    const oldTaxableIncome = Math.max(0, totalTaxableIncome - insuranceDeduction - OLD_DEDUCTIONS.personal - dependents * OLD_DEDUCTIONS.dependent);
    taxUnderOldLaw = 0;
    let oldRemaining = oldTaxableIncome;
    for (const bracket of OLD_TAX_BRACKETS) {
      if (oldRemaining <= 0) break;
      const bracketWidth = bracket.max - bracket.min;
      const taxableInBracket = Math.min(oldRemaining, bracketWidth);
      taxUnderOldLaw += taxableInBracket * bracket.rate;
      oldRemaining -= taxableInBracket;
    }

    // Tính với luật mới
    const newTaxableIncome = Math.max(0, totalTaxableIncome - insuranceDeduction - NEW_DEDUCTIONS.personal - dependents * NEW_DEDUCTIONS.dependent);
    taxUnderNewLaw = 0;
    let newRemaining = newTaxableIncome;
    for (const bracket of NEW_TAX_BRACKETS) {
      if (newRemaining <= 0) break;
      const bracketWidth = bracket.max - bracket.min;
      const taxableInBracket = Math.min(newRemaining, bracketWidth);
      taxUnderNewLaw += taxableInBracket * bracket.rate;
      newRemaining -= taxableInBracket;
    }

    savings = taxUnderOldLaw - taxUnderNewLaw;
  }

  const totalIncome = grossIncome + foreignIncome + allowanceCalc.total;
  const netIncome = totalIncome - insuranceDeduction - taxAmount;
  const effectiveTaxRate = totalIncome > 0 ? (taxAmount / totalIncome) * 100 : 0;

  const treatyInfo = checkDoubleTaxTreaty(nationality);

  const notes: string[] = [
    `Người cư trú thuế tại Việt Nam (${daysInVietnam >= 183 ? `${daysInVietnam} ngày ≥ 183 ngày` : 'có nơi ở thường trú'}).`,
    'Áp dụng biểu thuế lũy tiến từ 5% đến 35%.',
    `Giảm trừ bản thân: ${new Intl.NumberFormat('vi-VN').format(personalDeduction)} VNĐ/tháng.`,
  ];

  if (dependents > 0) {
    notes.push(`Giảm trừ ${dependents} người phụ thuộc: ${new Intl.NumberFormat('vi-VN').format(dependentDeduction)} VNĐ/tháng.`);
  }

  if (foreignIncome > 0) {
    notes.push('Người cư trú phải kê khai cả thu nhập phát sinh ngoài Việt Nam.');
  }

  if (treatyInfo) {
    notes.push(`Quốc gia ${treatyInfo.name} có Hiệp định thuế với Việt Nam. Thu nhập đã nộp thuế ở nước ngoài có thể được khấu trừ.`);
  }

  if (savings && savings > 0) {
    notes.push(`Luật thuế mới 2026 giúp tiết kiệm ${new Intl.NumberFormat('vi-VN').format(savings)} VNĐ/tháng.`);
  }

  return {
    residencyStatus: 'resident',
    daysInVietnam,
    grossIncome,
    foreignIncome,
    totalAllowances: allowanceCalc.total,
    taxableAllowances: allowanceCalc.taxable,
    exemptAllowances: allowanceCalc.exempt,
    totalIncome,
    insuranceDeduction,
    insuranceDetail,
    personalDeduction,
    dependentDeduction,
    totalDeductions,
    taxableIncome,
    taxAmount,
    taxBreakdown,
    effectiveTaxRate,
    netIncome,
    taxUnderOldLaw,
    taxUnderNewLaw,
    savings,
    hasTreatyWithCountry: !!treatyInfo,
    treatyInfo,
    notes,
  };
}

/**
 * Main function: Tính thuế TNCN cho người nước ngoài
 */
export function calculateForeignerTax(input: ForeignerTaxInput): ForeignerTaxResult {
  // Tính số ngày ở VN
  let daysInVietnam = input.daysInVietnam ?? 0;

  if (input.arrivalDate) {
    daysInVietnam = calculateDaysInVietnam(input.arrivalDate, input.taxYear);
  }

  // Xác định trạng thái cư trú
  const residencyStatus = determineResidencyStatus(daysInVietnam, input.hasPermanentResidence);

  // Cập nhật input với số ngày đã tính
  const updatedInput = { ...input, daysInVietnam };

  // Tính thuế theo trạng thái cư trú
  if (residencyStatus === 'non-resident') {
    return calculateNonResidentTax(updatedInput);
  }

  return calculateResidentTax(updatedInput);
}

// ===== UTILITY EXPORTS =====

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function formatPercent(rate: number): string {
  return `${rate.toFixed(1)}%`;
}
