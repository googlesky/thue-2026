/**
 * Tax Document Generator
 * Tạo báo cáo và tờ khai thuế TNCN (bản tham khảo rút gọn)
 *
 * Căn cứ pháp lý:
 * - Thông tư 89/2026/TT-BTC (mẫu 02/KK-TNCN: cá nhân tự khai quý; 02/QTT-TNCN: cá nhân tự quyết toán;
 *   tổ chức trả thu nhập khai quý 05/KK-TNCN)
 * - Nghị định 252/2026/NĐ-CP (Điều 10: thời hạn nộp hồ sơ khai thuế)
 *
 * Đầu vào là kết quả thuế 1 tháng từ engine (calculateNewTax/calculateOldTax); số liệu kỳ quý/năm
 * được ước tính = 1 tháng × số tháng của kỳ (giả định thu nhập đều các tháng).
 */

import { formatDate, formatNumber, TaxResult } from './taxCalculator';
import {
  calculateAnnualTax,
  EDUCATION_DEDUCTION_CAP,
  MEDICAL_DEDUCTION_CAP,
} from './annualSettlementCalculator';
import { annualDeadline, quarterDeadline } from './taxDeadlines';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Loại tài liệu thuế
 */
export type DocumentType =
  | 'personal_report'        // Báo cáo thu nhập cá nhân (cả năm)
  | 'quarterly_declaration'  // Tờ khai thuế TNCN quý (02/KK-TNCN)
  | 'annual_settlement';     // Tờ khai quyết toán (02/QTT-TNCN)

/**
 * Thông tin cá nhân
 */
export interface PersonalInfo {
  fullName: string;
  taxCode?: string;
  idNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  employer?: string;
  employerTaxCode?: string;
}

/**
 * Input cho tạo báo cáo
 */
export interface DocumentInput {
  type: DocumentType;
  period: {
    year: number;
    quarter?: number; // Cho tờ khai quý
  };
  personalInfo: PersonalInfo;
  monthlyResult: TaxResult;     // Kết quả thuế 1 tháng theo luật của năm tính thuế
  numberOfDependents: number;
  taxPaid: number;              // Thuế đã khấu trừ/tạm nộp trong cả kỳ
  medicalExpenses?: number;     // Chi y tế cả năm (chỉ tờ khai quyết toán từ năm 2026)
  educationExpenses?: number;   // Học phí cả năm (chỉ tờ khai quyết toán từ năm 2026)
  notes?: string;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  generatedAt: Date;
  documentId: string;
  version: string;
}

/**
 * Output cho tài liệu
 */
export interface DocumentOutput {
  type: DocumentType;
  title: string;
  metadata: DocumentMetadata;
  content: DocumentSection[];
  legalNote: string;
}

/**
 * Section trong tài liệu
 */
export interface DocumentSection {
  id: string;
  title: string;
  rows: DocumentRow[];
}

/**
 * Row trong section
 */
export interface DocumentRow {
  label: string;
  value: string | number;
  format?: 'currency' | 'number' | 'percent' | 'text';
  highlight?: boolean;
  indent?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DOCUMENT_TYPE_INFO: Record<DocumentType, {
  label: string;
  description: string;
  formCode: string;
  months: number; // Số tháng của kỳ
}> = {
  personal_report: {
    label: 'Báo cáo thu nhập cá nhân',
    description: 'Tổng hợp thu nhập và thuế TNCN cả năm (ước tính từ thu nhập 1 tháng × 12)',
    formCode: '',
    months: 12,
  },
  quarterly_declaration: {
    label: 'Tờ khai thuế TNCN quý',
    description: 'Cá nhân nhận lương từ nước ngoài, tổ chức quốc tế chưa khấu trừ thuế tự khai theo quý',
    formCode: '02/KK-TNCN',
    months: 3,
  },
  annual_settlement: {
    label: 'Tờ khai quyết toán thuế TNCN',
    description: 'Cá nhân tự quyết toán thuế TNCN năm, hạn ngày cuối cùng của tháng 4 năm sau',
    formCode: '02/QTT-TNCN',
    months: 12,
  },
};

const ESTIMATE_NOTE = (months: number) =>
  months === 1 ? '' : `Số liệu kỳ ước tính = số liệu 1 tháng × ${months} (giả định thu nhập đều các tháng).`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique document ID
 */
function generateDocumentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `DOC-${timestamp}-${random}`.toUpperCase();
}

/**
 * Format value based on type
 */
export function formatValue(value: string | number, format?: 'currency' | 'number' | 'percent' | 'text'): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return `${formatNumber(value)} VNĐ`;
    case 'number':
      return formatNumber(value);
    case 'percent':
      return `${value.toFixed(2).replace('.', ',')}%`;
    default:
      return value.toString();
  }
}

/**
 * Get period label
 */
function getPeriodLabel(input: DocumentInput): string {
  const { period } = input;
  return input.type === 'quarterly_declaration' && period.quarter
    ? `Quý ${period.quarter}/${period.year}`
    : `Năm ${period.year}`;
}

/**
 * Số liệu của kỳ tài liệu: [21] thu nhập chịu thuế − Σ[22] giảm trừ = [23] thu nhập tính thuế
 */
export function getPeriodFigures(input: DocumentInput) {
  const months = DOCUMENT_TYPE_INFO[input.type].months;
  const r = input.monthlyResult;
  const law = input.period.year >= 2026 ? 'new' : 'old';
  const allowances = r.allowancesBreakdown;

  const gross = r.grossIncome * months;
  const exemptAllowances = (allowances?.taxExempt ?? 0) * months;
  const taxableAllowances = (allowances?.taxable ?? 0) * months;
  const taxableIncome = gross + taxableAllowances;
  const personal = r.personalDeduction * months;
  const dependent = r.dependentDeduction * months;
  const bhxh = r.insuranceDetail.bhxh * months;
  const bhyt = r.insuranceDetail.bhyt * months;
  const bhtn = r.insuranceDetail.bhtn * months;
  const insurance = r.insuranceDeduction * months;
  const other = r.otherDeductions * months;
  // Giảm trừ y tế, giáo dục (NĐ 253/2026 Điều 49.2): chỉ khi tự quyết toán từ kỳ tính thuế 2026
  const medicalEducation = input.type === 'annual_settlement' && law === 'new'
    ? Math.min(input.medicalExpenses ?? 0, MEDICAL_DEDUCTION_CAP) + Math.min(input.educationExpenses ?? 0, EDUCATION_DEDUCTION_CAP)
    : 0;
  const totalDeductions = personal + dependent + insurance + other + medicalEducation;
  const assessableIncome = Math.max(0, taxableIncome - totalDeductions);
  // Kỳ năm: biểu thuế năm; kỳ quý: thuế tháng × 3
  const taxAmount = months === 12 ? calculateAnnualTax(assessableIncome, law) : r.taxAmount * months;
  const totalIncome = gross + exemptAllowances + taxableAllowances;

  return {
    months,
    gross,
    exemptAllowances,
    taxableAllowances,
    taxableIncome,
    personal,
    dependent,
    bhxh,
    bhyt,
    bhtn,
    insurance,
    other,
    medicalEducation,
    totalDeductions,
    assessableIncome,
    taxAmount,
    taxOwed: taxAmount - input.taxPaid,
    effectiveRate: totalIncome > 0 ? (taxAmount / totalIncome) * 100 : 0,
  };
}

// =============================================================================
// DOCUMENT GENERATORS
// =============================================================================

const metadata = (): DocumentMetadata => ({
  generatedAt: new Date(),
  documentId: generateDocumentId(),
  version: '1.1',
});

/**
 * Generate personal income report
 */
function generatePersonalReport(input: DocumentInput): DocumentOutput {
  const { personalInfo, notes } = input;
  const f = getPeriodFigures(input);

  const sections: DocumentSection[] = [
    {
      id: 'personal',
      title: 'I. Thông tin người nộp thuế',
      rows: [
        { label: 'Họ và tên', value: personalInfo.fullName || '(Chưa nhập)', format: 'text' },
        { label: 'Mã số thuế', value: personalInfo.taxCode || '(Chưa có)', format: 'text' },
        { label: 'CCCD/CMND', value: personalInfo.idNumber || '(Chưa nhập)', format: 'text' },
        { label: 'Địa chỉ', value: personalInfo.address || '(Chưa nhập)', format: 'text' },
        { label: 'Đơn vị công tác', value: personalInfo.employer || '(Chưa nhập)', format: 'text' },
      ],
    },
    {
      id: 'income',
      title: 'II. Thu nhập trong kỳ',
      rows: [
        { label: 'Tiền lương (GROSS)', value: f.gross, format: 'currency' },
        { label: 'Phụ cấp tính thuế', value: f.taxableAllowances, format: 'currency', indent: 1 },
        { label: 'Phụ cấp không tính vào thu nhập chịu thuế', value: f.exemptAllowances, format: 'currency', indent: 1 },
        { label: 'Thu nhập chịu thuế', value: f.taxableIncome, format: 'currency', highlight: true },
      ],
    },
    {
      id: 'deductions',
      title: 'III. Các khoản giảm trừ',
      rows: [
        { label: 'Giảm trừ bản thân', value: f.personal, format: 'currency' },
        { label: 'Giảm trừ người phụ thuộc', value: f.dependent, format: 'currency' },
        { label: 'Số người phụ thuộc', value: `${input.numberOfDependents} người`, format: 'text', indent: 1 },
        { label: 'Bảo hiểm bắt buộc', value: f.insurance, format: 'currency' },
        { label: 'BHXH (8%)', value: f.bhxh, format: 'currency', indent: 1 },
        { label: 'BHYT (1,5%)', value: f.bhyt, format: 'currency', indent: 1 },
        { label: 'BHTN (1%)', value: f.bhtn, format: 'currency', indent: 1 },
        { label: 'Hưu trí tự nguyện, từ thiện và giảm trừ khác', value: f.other, format: 'currency' },
        { label: 'Tổng giảm trừ', value: f.totalDeductions, format: 'currency', highlight: true },
      ],
    },
    {
      id: 'tax',
      title: 'IV. Tính thuế TNCN',
      rows: [
        { label: 'Thu nhập tính thuế', value: f.assessableIncome, format: 'currency' },
        { label: 'Thuế TNCN phải nộp', value: f.taxAmount, format: 'currency', highlight: true },
        { label: 'Thuế đã nộp/khấu trừ', value: input.taxPaid, format: 'currency' },
        {
          label: f.taxOwed >= 0 ? 'Thuế còn phải nộp' : 'Thuế được hoàn',
          value: Math.abs(f.taxOwed),
          format: 'currency',
          highlight: true,
        },
        { label: 'Thuế suất thực tế', value: f.effectiveRate, format: 'percent' },
      ],
    },
  ];

  if (notes) {
    sections.push({
      id: 'notes',
      title: 'V. Ghi chú',
      rows: [{ label: '', value: notes, format: 'text' }],
    });
  }

  return {
    type: 'personal_report',
    title: `Báo cáo thu nhập cá nhân - ${getPeriodLabel(input)}`,
    metadata: metadata(),
    content: sections,
    legalNote: `${ESTIMATE_NOTE(f.months)} Báo cáo được tạo tự động từ dữ liệu người dùng nhập, chỉ mang tính tham khảo. Người nộp thuế có trách nhiệm xác minh số liệu trước khi khai thuế.`,
  };
}

/**
 * Generate quarterly tax declaration (simplified)
 */
function generateQuarterlyDeclaration(input: DocumentInput): DocumentOutput {
  const { personalInfo, period } = input;
  const f = getPeriodFigures(input);
  const quarter = (period.quarter ?? 1) as 1 | 2 | 3 | 4;

  return {
    type: 'quarterly_declaration',
    title: `Tờ khai thuế TNCN - ${getPeriodLabel(input)}`,
    metadata: metadata(),
    content: [
      {
        id: 'declaration',
        title: 'Thông tin khai thuế',
        rows: [
          { label: 'Kỳ tính thuế', value: getPeriodLabel(input), format: 'text' },
          { label: 'Mẫu tờ khai', value: DOCUMENT_TYPE_INFO.quarterly_declaration.formCode, format: 'text' },
          { label: 'Hạn nộp', value: formatDate(quarterDeadline(period.year, quarter)), format: 'text' },
          { label: 'Người nộp thuế', value: personalInfo.fullName || '(Chưa nhập)', format: 'text' },
          { label: 'MST', value: personalInfo.taxCode || '(Chưa có)', format: 'text' },
        ],
      },
      {
        id: 'income_declaration',
        title: 'Chỉ tiêu thu nhập',
        rows: [
          { label: '[21] Tổng thu nhập chịu thuế', value: f.taxableIncome, format: 'currency' },
          { label: '[22] Tổng các khoản giảm trừ', value: f.totalDeductions, format: 'currency' },
          { label: '[23] Tổng thu nhập tính thuế', value: f.assessableIncome, format: 'currency' },
          { label: '[24] Tổng số thuế TNCN phải nộp', value: f.taxAmount, format: 'currency', highlight: true },
        ],
      },
    ],
    legalNote: `Bản tham khảo rút gọn theo mẫu 02/KK-TNCN (TT 89/2026/TT-BTC), số hiệu chỉ tiêu có thể khác mẫu chính thức. Hạn nộp: ngày cuối cùng của tháng đầu quý sau, dời sang ngày làm việc tiếp theo nếu trùng ngày nghỉ (NĐ 252/2026/NĐ-CP Điều 10.3). Tổ chức trả thu nhập khai số thuế đã khấu trừ theo quý bằng mẫu 05/KK-TNCN. ${ESTIMATE_NOTE(f.months)} Khai chính thức tại thuedientu.gdt.gov.vn hoặc ứng dụng eTax Mobile.`,
  };
}

/**
 * Generate annual settlement (simplified)
 */
function generateAnnualSettlement(input: DocumentInput): DocumentOutput {
  const { personalInfo, period } = input;
  const f = getPeriodFigures(input);

  const deductionRows: DocumentRow[] = [
    { label: '[22] Các khoản giảm trừ', value: f.totalDeductions, format: 'currency' },
    { label: '[22a] Giảm trừ gia cảnh', value: f.personal + f.dependent, format: 'currency', indent: 1 },
    { label: '[22b] Bảo hiểm bắt buộc (BHXH, BHYT, BHTN)', value: f.insurance, format: 'currency', indent: 1 },
    { label: '[22c] Hưu trí tự nguyện, từ thiện và giảm trừ khác', value: f.other, format: 'currency', indent: 1 },
  ];
  if (f.medicalEducation > 0) {
    deductionRows.push({ label: '[22d] Chi y tế, giáo dục - đào tạo', value: f.medicalEducation, format: 'currency', indent: 1 });
  }

  return {
    type: 'annual_settlement',
    title: `Tờ khai quyết toán thuế TNCN - Năm ${period.year}`,
    metadata: metadata(),
    content: [
      {
        id: 'personal',
        title: 'Phần A - Thông tin người nộp thuế',
        rows: [
          { label: '[01] Họ và tên', value: personalInfo.fullName || '(Chưa nhập)', format: 'text' },
          { label: '[02] Mã số thuế', value: personalInfo.taxCode || '(Chưa có)', format: 'text' },
          { label: '[03] CCCD/Hộ chiếu', value: personalInfo.idNumber || '(Chưa nhập)', format: 'text' },
          { label: '[04] Địa chỉ', value: personalInfo.address || '(Chưa nhập)', format: 'text' },
        ],
      },
      {
        id: 'income_summary',
        title: 'Phần B - Thu nhập chịu thuế',
        rows: [
          { label: '[21] Tổng thu nhập chịu thuế', value: f.taxableIncome, format: 'currency' },
          ...deductionRows,
          { label: '[23] Thu nhập tính thuế', value: f.assessableIncome, format: 'currency', highlight: true },
        ],
      },
      {
        id: 'tax_calculation',
        title: 'Phần C - Thuế TNCN phải nộp',
        rows: [
          { label: '[31] Tổng thuế TNCN phải nộp', value: f.taxAmount, format: 'currency' },
          { label: '[32] Tổng thuế đã khấu trừ/tạm nộp', value: input.taxPaid, format: 'currency' },
          { label: '[33] Tổng thuế còn phải nộp', value: Math.max(0, f.taxOwed), format: 'currency', highlight: true },
          { label: '[34] Tổng thuế nộp thừa', value: Math.max(0, -f.taxOwed), format: 'currency' },
        ],
      },
    ],
    legalNote: `Bản tham khảo rút gọn theo mẫu 02/QTT-TNCN (TT 89/2026/TT-BTC), số hiệu chỉ tiêu có thể khác mẫu chính thức. Hạn cá nhân tự quyết toán năm ${period.year}: ${formatDate(annualDeadline(period.year, 'individual'))} (ngày cuối cùng của tháng 4 năm sau, NĐ 252/2026/NĐ-CP Điều 10.5.c). Chênh lệch từ 50.000đ trở xuống: phải nộp thêm thì được miễn, nộp thừa thì bù trừ kỳ sau. ${ESTIMATE_NOTE(f.months)} Quyết toán chính thức tại thuedientu.gdt.gov.vn hoặc ứng dụng eTax Mobile.`,
  };
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate tax document based on type
 */
export function generateTaxDocument(input: DocumentInput): DocumentOutput {
  switch (input.type) {
    case 'quarterly_declaration':
      return generateQuarterlyDeclaration(input);
    case 'annual_settlement':
      return generateAnnualSettlement(input);
    default:
      return generatePersonalReport(input);
  }
}

/**
 * Get available document types
 */
export function getDocumentTypes(): Array<{ id: DocumentType; label: string; description: string }> {
  return Object.entries(DOCUMENT_TYPE_INFO).map(([id, info]) => ({
    id: id as DocumentType,
    label: info.label,
    description: info.description,
  }));
}
