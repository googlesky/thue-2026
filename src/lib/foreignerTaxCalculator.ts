// ===== FOREIGNER TAX CALCULATOR =====
// Tính thuế TNCN cho người nước ngoài làm việc tại Việt Nam
// Căn cứ: Luật Thuế TNCN 109/2025/QH15 Điều 2 (cư trú), Điều 21 (không cư trú 20%);
// NĐ 253/2026/NĐ-CP Điều 4 (cư trú), Điều 8 (tiền nhà ≤ 15%, khoản không tính vào TN chịu thuế), Điều 64.

import {
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
  getInsuranceDetailed,
  InsuranceDetail,
  TaxBreakdownItem,
} from './taxCalculator';

// ===== CONSTANTS =====

// Thuế suất cho người không cư trú (Luật 109/2025/QH15 Điều 21)
export const NON_RESIDENT_TAX_RATE = 0.20; // 20% flat

// Số ngày để xác định cư trú thuế (183 ngày/năm)
export const RESIDENCY_DAYS_THRESHOLD = 183;

// Tiền nhà NSDLĐ trả thay: tính vào TN chịu thuế tối đa 15% tổng TN chịu thuế tại đơn vị
// (chưa gồm tiền nhà) — NĐ 253/2026/NĐ-CP Điều 8.2.h; áp dụng cả không cư trú (Điều 64.2)
export const HOUSING_TAXABLE_CAP_RATE = 0.15;

export interface TreatyCountry {
  code: string;
  name: string;
  year: number; // Năm có hiệu lực (hiệp định chưa có hiệu lực: năm ký)
  pending?: boolean; // Đã ký nhưng chưa có hiệu lực → không áp dụng ưu đãi
}

// Danh sách các nước có Hiệp định tránh đánh thuế hai lần với Việt Nam
export const DOUBLE_TAX_TREATY_COUNTRIES: TreatyCountry[] = [
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
  // Ký 07/7/2015, đến nay CHƯA có hiệu lực
  { code: 'US', name: 'Hoa Kỳ (United States)', year: 2015, pending: true },
  { code: 'UZ', name: 'Uzbekistan', year: 1996 },
  { code: 'VE', name: 'Venezuela', year: 2009 },
];

// ===== TYPES =====

export type ResidencyStatus = 'resident' | 'non-resident' | 'unknown';

export interface ForeignerAllowances {
  housing: number;           // Tiền nhà công ty trả thay (tính tối đa 15%)
  schoolFees: number;        // Học phí cho con từ mầm non đến THPT (không tính — Điều 8.4.g)
  homeLeaveFare: number;     // Vé máy bay về phép 1 lần/năm (không tính — Điều 8.4.e)
  relocation: number;        // Trợ cấp chuyển vùng 1 lần (không tính — Điều 8.3.l)
  languageTraining: number;  // Đào tạo ngôn ngữ (không tính nếu phù hợp công việc — Điều 8.4.i)
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
  daysInVietnam?: number;           // Số ngày có mặt (năm dương lịch hoặc 12 tháng liên tục)
  hasPermanentResidence: boolean;   // Có nơi ở thường xuyên (NĐ 253 Điều 4.2)

  // Thu nhập
  grossIncome: number;              // Thu nhập từ VN
  foreignIncome?: number;           // Thu nhập từ nước ngoài (chỉ resident)

  // Phụ cấp
  allowances: ForeignerAllowances;
  languageTrainingJobRelated?: boolean; // Đào tạo phù hợp công việc/theo kế hoạch NSDLĐ

  // Bảo hiểm
  hasVietnameseInsurance: boolean;
  insuranceOptions?: InsuranceOptions;
  region?: RegionType;

  // Giảm trừ
  dependents: number;

  // Năm tính thuế
  taxYear: 2025 | 2026;
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
  treatyInfo?: TreatyCountry;
  notes: string[];
}

// ===== HELPER FUNCTIONS =====

/**
 * Xác định trạng thái cư trú thuế (Luật 109/2025/QH15 Điều 2.2; NĐ 253/2026/NĐ-CP Điều 4)
 */
export function determineResidencyStatus(
  daysInVietnam: number,
  hasPermanentResidence: boolean
): ResidencyStatus {
  // Có nơi ở thường xuyên tại VN = cư trú
  if (hasPermanentResidence) return 'resident';

  // Có mặt >= 183 ngày (năm dương lịch hoặc 12 tháng liên tục) = cư trú
  if (daysInVietnam >= RESIDENCY_DAYS_THRESHOLD) return 'resident';

  return 'non-resident';
}

/**
 * Hiệp định ĐANG CÓ HIỆU LỰC với quốc gia (hiệp định đã ký nhưng chưa hiệu lực → undefined)
 */
export function checkDoubleTaxTreaty(nationalityCode: string): TreatyCountry | undefined {
  const country = DOUBLE_TAX_TREATY_COUNTRIES.find(
    c => c.code.toLowerCase() === nationalityCode.toLowerCase()
  );
  return country && !country.pending ? country : undefined;
}

/**
 * Phân loại các khoản phụ cấp/lợi ích: tính vào thu nhập chịu thuế hay không.
 * Tiền nhà trả thay chỉ tính tối đa 15% × (thu nhập chịu thuế tại đơn vị chưa gồm tiền nhà).
 */
export function calculateForeignerAllowances(
  allowances: ForeignerAllowances,
  grossIncome: number,
  languageTrainingJobRelated = false
): {
  total: number;
  taxable: number;
  exempt: number;
  housingTaxable: number;
  housingCap: number;
} {
  const total =
    allowances.housing +
    allowances.schoolFees +
    allowances.homeLeaveFare +
    allowances.relocation +
    allowances.languageTraining +
    allowances.other;

  // Đào tạo phù hợp công việc/theo kế hoạch NSDLĐ: không tính (NĐ 253 Điều 8.4.i)
  const otherTaxable = allowances.other + (languageTrainingJobRelated ? 0 : allowances.languageTraining);
  const housingCap = Math.round(HOUSING_TAXABLE_CAP_RATE * (grossIncome + otherTaxable));
  const housingTaxable = Math.min(allowances.housing, housingCap);

  // Không tính: học phí con (mầm non–THPT), vé máy bay về phép 1 lần/năm, trợ cấp chuyển vùng 1 lần,
  // phần tiền nhà vượt 15%, đào tạo phù hợp công việc
  const taxable = housingTaxable + otherTaxable;
  return { total, taxable, exempt: total - taxable, housingTaxable, housingCap };
}

/** Ghi chú về hiệp định theo tình trạng cư trú (hiệp định chưa hiệu lực: không áp dụng) */
function getTreatyNotes(nationality: string, resident: boolean): string[] {
  const country = DOUBLE_TAX_TREATY_COUNTRIES.find(c => c.code === nationality.toUpperCase());
  if (!country) return [];
  if (country.pending) {
    return [`Hiệp định giữa Việt Nam và ${country.name} ký năm ${country.year} nhưng chưa có hiệu lực: chưa được áp dụng ưu đãi hiệp định.`];
  }
  return [
    resident
      ? `Có Hiệp định tránh đánh thuế hai lần với ${country.name}: thuế đã nộp ở nước ngoài đối với thu nhập phát sinh ở nước ngoài được trừ vào số thuế phải nộp tại Việt Nam (tối đa bằng số thuế tính theo biểu thuế Việt Nam cho phần thu nhập đó).`
      : `Có Hiệp định tránh đánh thuế hai lần với ${country.name}: tiền lương có thể được miễn thuế tại Việt Nam nếu có mặt không quá 183 ngày, không do chủ lao động là đối tượng cư trú Việt Nam trả và không do cơ sở thường trú tại Việt Nam chịu (xem tab Hiệp định thuế).`,
  ];
}

function getHousingNote(allowances: ForeignerAllowances, calc: { housingTaxable: number; housingCap: number }): string[] {
  if (allowances.housing <= calc.housingTaxable) return [];
  return [
    `Tiền nhà công ty trả thay chỉ tính vào thu nhập chịu thuế tối đa 15% tổng thu nhập chịu thuế tại đơn vị (${new Intl.NumberFormat('vi-VN').format(calc.housingCap)} VNĐ); phần vượt ${new Intl.NumberFormat('vi-VN').format(allowances.housing - calc.housingTaxable)} VNĐ không tính (NĐ 253/2026/NĐ-CP Điều 8.2.h).`,
  ];
}

// ===== MAIN CALCULATION =====

/**
 * Tính thuế cho người không cư trú (Non-resident)
 */
function calculateNonResidentTax(input: ForeignerTaxInput): ForeignerTaxResult {
  const { grossIncome, allowances, nationality, languageTrainingJobRelated } = input;

  const allowanceCalc = calculateForeignerAllowances(allowances, grossIncome, languageTrainingJobRelated);

  // Non-resident: Thuế = 20% × (Thu nhập từ VN + các khoản tính vào thu nhập chịu thuế)
  // Không được giảm trừ gia cảnh, không được giảm trừ bảo hiểm (Luật 109 Điều 21; NĐ 253 Điều 64)
  const taxableIncome = grossIncome + allowanceCalc.taxable;
  const taxAmount = Math.round(taxableIncome * NON_RESIDENT_TAX_RATE);

  const totalIncome = grossIncome + allowanceCalc.total;
  const netIncome = totalIncome - taxAmount;
  const effectiveTaxRate = totalIncome > 0 ? (taxAmount / totalIncome) * 100 : 0;

  const treatyInfo = checkDoubleTaxTreaty(nationality);

  const notes: string[] = [
    'Người không cư trú chịu thuế 20% trên toàn bộ tiền lương, tiền công nhận được do làm việc tại Việt Nam, không phân biệt nơi trả (Luật 109/2025/QH15 Điều 21).',
    'Không được áp dụng giảm trừ gia cảnh và giảm trừ bảo hiểm.',
    ...getHousingNote(allowances, allowanceCalc),
    ...getTreatyNotes(nationality, false),
  ];

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
    nationality,
    daysInVietnam = 0,
    languageTrainingJobRelated,
  } = input;

  // Xác định luật áp dụng
  // Note: Từ 01/01/2026, luật mới áp dụng cho toàn bộ năm đối với thu nhập tiền lương, tiền công
  const useNewLaw = taxYear === 2026;
  const brackets = useNewLaw ? NEW_TAX_BRACKETS : OLD_TAX_BRACKETS;
  const deductions = useNewLaw ? NEW_DEDUCTIONS : OLD_DEDUCTIONS;

  const allowanceCalc = calculateForeignerAllowances(allowances, grossIncome, languageTrainingJobRelated);

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

  taxAmount = Math.round(taxAmount);
  const totalIncome = grossIncome + foreignIncome + allowanceCalc.total;
  const netIncome = totalIncome - insuranceDeduction - taxAmount;
  const effectiveTaxRate = totalIncome > 0 ? (taxAmount / totalIncome) * 100 : 0;

  const treatyInfo = checkDoubleTaxTreaty(nationality);

  const notes: string[] = [
    `Người cư trú thuế tại Việt Nam (${daysInVietnam >= RESIDENCY_DAYS_THRESHOLD ? `có mặt ${daysInVietnam} ngày, từ 183 ngày trở lên` : 'có nơi ở thường xuyên'}).`,
    'Áp dụng biểu thuế lũy tiến từ 5% đến 35%.',
    `Giảm trừ bản thân: ${new Intl.NumberFormat('vi-VN').format(personalDeduction)} VNĐ/tháng.`,
  ];

  if (daysInVietnam < RESIDENCY_DAYS_THRESHOLD) {
    notes.push('Có nơi ở thường xuyên nhưng có mặt dưới 183 ngày: vẫn là cá nhân cư trú, trừ khi chứng minh được là đối tượng cư trú của nước khác bằng Giấy chứng nhận cư trú (NĐ 253/2026/NĐ-CP Điều 4.3).');
  }

  if (dependents > 0) {
    notes.push(`Giảm trừ ${dependents} người phụ thuộc: ${new Intl.NumberFormat('vi-VN').format(dependentDeduction)} VNĐ/tháng.`);
  }

  if (foreignIncome > 0) {
    notes.push('Người cư trú phải kê khai cả thu nhập phát sinh ngoài Việt Nam.');
  }

  notes.push(...getHousingNote(allowances, allowanceCalc), ...getTreatyNotes(nationality, true));

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
  // Số ngày có mặt do người dùng nhập (ngày đến, ngày đi mỗi ngày tính 1 ngày) — không phụ thuộc ngày mở trang
  const daysInVietnam = input.daysInVietnam ?? 0;

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
  return `${rate.toFixed(1).replace('.', ',')}%`;
}
