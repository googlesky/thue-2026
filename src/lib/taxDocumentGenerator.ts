/**
 * Tax Document Generator
 * Tạo báo cáo và tờ khai thuế TNCN
 *
 * Căn cứ pháp lý:
 * - Thông tư 80/2021/TT-BTC về khai thuế TNCN
 * - Nghị định 126/2020/NĐ-CP về quản lý thuế
 */

import { formatNumber } from './taxCalculator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Loại tài liệu thuế
 */
export type DocumentType =
  | 'personal_report'      // Báo cáo thu nhập cá nhân
  | 'monthly_declaration'  // Tờ khai thuế tháng (02/KK-TNCN)
  | 'annual_settlement';   // Tờ khai quyết toán (02/QTT-TNCN)

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
 * Thông tin thu nhập
 */
export interface IncomeInfo {
  grossIncome: number;
  allowances: number;
  socialInsurance: number;
  healthInsurance: number;
  unemploymentInsurance: number;
  pensionContribution: number;
  charitableContributions: number;
}

/**
 * Thông tin giảm trừ
 */
export interface DeductionInfo {
  personalDeduction: number;
  dependentDeduction: number;
  numberOfDependents: number;
  otherDeductions: number;
}

/**
 * Thông tin thuế
 */
export interface TaxInfo {
  taxableIncome: number;
  taxAmount: number;
  taxPaid: number;
  taxOwed: number;
  effectiveRate: number;
}

/**
 * Input cho tạo báo cáo
 */
export interface DocumentInput {
  type: DocumentType;
  period: {
    year: number;
    month?: number;  // Cho tờ khai tháng
    quarter?: number; // Cho tờ khai quý
  };
  personalInfo: PersonalInfo;
  incomeInfo: IncomeInfo;
  deductionInfo: DeductionInfo;
  taxInfo: TaxInfo;
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
}> = {
  personal_report: {
    label: 'Báo cáo thu nhập cá nhân',
    description: 'Tổng hợp thu nhập và thuế TNCN trong kỳ',
    formCode: '',
  },
  monthly_declaration: {
    label: 'Tờ khai thuế TNCN tháng',
    description: 'Tờ khai thuế TNCN theo tháng/quý',
    formCode: '02/KK-TNCN',
  },
  annual_settlement: {
    label: 'Tờ khai quyết toán thuế TNCN',
    description: 'Tờ khai quyết toán thuế TNCN năm',
    formCode: '02/QTT-TNCN',
  },
};

// Personal deduction amounts
const PERSONAL_DEDUCTION_2025 = 11_000_000;
const PERSONAL_DEDUCTION_2026 = 15_100_000; // From July 2026
const DEPENDENT_DEDUCTION_2025 = 4_400_000;
const DEPENDENT_DEDUCTION_2026 = 7_000_000; // From July 2026

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
      return `${value.toFixed(2)}%`;
    default:
      return value.toString();
  }
}

/**
 * Get period label
 */
function getPeriodLabel(period: DocumentInput['period']): string {
  if (period.month) {
    return `Tháng ${period.month}/${period.year}`;
  }
  if (period.quarter) {
    return `Quý ${period.quarter}/${period.year}`;
  }
  return `Năm ${period.year}`;
}

// =============================================================================
// DOCUMENT GENERATORS
// =============================================================================

/**
 * Generate personal income report
 */
function generatePersonalReport(input: DocumentInput): DocumentOutput {
  const { personalInfo, incomeInfo, deductionInfo, taxInfo, period, notes } = input;

  const sections: DocumentSection[] = [];

  // Section 1: Personal Information
  sections.push({
    id: 'personal',
    title: 'I. Thông tin người nộp thuế',
    rows: [
      { label: 'Họ và tên', value: personalInfo.fullName || '(Chưa nhập)', format: 'text' },
      { label: 'Mã số thuế', value: personalInfo.taxCode || '(Chưa có)', format: 'text' },
      { label: 'CCCD/CMND', value: personalInfo.idNumber || '(Chưa nhập)', format: 'text' },
      { label: 'Địa chỉ', value: personalInfo.address || '(Chưa nhập)', format: 'text' },
      { label: 'Đơn vị công tác', value: personalInfo.employer || '(Chưa nhập)', format: 'text' },
    ],
  });

  // Section 2: Income
  const totalInsurance = incomeInfo.socialInsurance + incomeInfo.healthInsurance + incomeInfo.unemploymentInsurance;

  sections.push({
    id: 'income',
    title: 'II. Thu nhập trong kỳ',
    rows: [
      { label: 'Tổng thu nhập (GROSS)', value: incomeInfo.grossIncome, format: 'currency', highlight: true },
      { label: 'Phụ cấp không chịu thuế', value: incomeInfo.allowances, format: 'currency', indent: 1 },
      { label: 'Bảo hiểm xã hội (8%)', value: incomeInfo.socialInsurance, format: 'currency', indent: 1 },
      { label: 'Bảo hiểm y tế (1.5%)', value: incomeInfo.healthInsurance, format: 'currency', indent: 1 },
      { label: 'Bảo hiểm thất nghiệp (1%)', value: incomeInfo.unemploymentInsurance, format: 'currency', indent: 1 },
      { label: 'Tổng bảo hiểm bắt buộc', value: totalInsurance, format: 'currency' },
      { label: 'Đóng góp hưu trí tự nguyện', value: incomeInfo.pensionContribution, format: 'currency', indent: 1 },
      { label: 'Đóng góp từ thiện', value: incomeInfo.charitableContributions, format: 'currency', indent: 1 },
    ],
  });

  // Section 3: Deductions
  const totalDeduction = deductionInfo.personalDeduction + deductionInfo.dependentDeduction + deductionInfo.otherDeductions;

  sections.push({
    id: 'deductions',
    title: 'III. Các khoản giảm trừ',
    rows: [
      { label: 'Giảm trừ bản thân', value: deductionInfo.personalDeduction, format: 'currency' },
      { label: 'Giảm trừ người phụ thuộc', value: deductionInfo.dependentDeduction, format: 'currency' },
      { label: 'Số người phụ thuộc', value: `${deductionInfo.numberOfDependents} người`, format: 'text', indent: 1 },
      { label: 'Giảm trừ khác', value: deductionInfo.otherDeductions, format: 'currency' },
      { label: 'Tổng giảm trừ', value: totalDeduction, format: 'currency', highlight: true },
    ],
  });

  // Section 4: Tax Calculation
  sections.push({
    id: 'tax',
    title: 'IV. Tính thuế TNCN',
    rows: [
      { label: 'Thu nhập chịu thuế', value: taxInfo.taxableIncome, format: 'currency' },
      { label: 'Thuế TNCN phải nộp', value: taxInfo.taxAmount, format: 'currency', highlight: true },
      { label: 'Thuế đã nộp/khấu trừ', value: taxInfo.taxPaid, format: 'currency' },
      {
        label: taxInfo.taxOwed >= 0 ? 'Thuế còn phải nộp' : 'Thuế được hoàn',
        value: Math.abs(taxInfo.taxOwed),
        format: 'currency',
        highlight: true
      },
      { label: 'Thuế suất thực tế', value: taxInfo.effectiveRate, format: 'percent' },
    ],
  });

  // Section 5: Notes
  if (notes) {
    sections.push({
      id: 'notes',
      title: 'V. Ghi chú',
      rows: [
        { label: '', value: notes, format: 'text' },
      ],
    });
  }

  return {
    type: 'personal_report',
    title: `Báo cáo thu nhập cá nhân - ${getPeriodLabel(period)}`,
    metadata: {
      generatedAt: new Date(),
      documentId: generateDocumentId(),
      version: '1.0',
    },
    content: sections,
    legalNote: 'Báo cáo này được tạo tự động dựa trên dữ liệu người dùng nhập và chỉ mang tính chất tham khảo. Người nộp thuế có trách nhiệm xác minh tính chính xác của các số liệu trước khi sử dụng cho mục đích khai thuế.',
  };
}

/**
 * Generate monthly tax declaration (simplified)
 */
function generateMonthlyDeclaration(input: DocumentInput): DocumentOutput {
  const { personalInfo, incomeInfo, taxInfo, period } = input;

  const sections: DocumentSection[] = [];

  // Section: Declaration info
  sections.push({
    id: 'declaration',
    title: 'Thông tin khai thuế',
    rows: [
      { label: 'Kỳ tính thuế', value: getPeriodLabel(period), format: 'text' },
      { label: 'Mẫu tờ khai', value: '02/KK-TNCN', format: 'text' },
      { label: 'Người nộp thuế', value: personalInfo.fullName || '(Chưa nhập)', format: 'text' },
      { label: 'MST', value: personalInfo.taxCode || '(Chưa có)', format: 'text' },
    ],
  });

  // Section: Income declaration
  sections.push({
    id: 'income_declaration',
    title: 'Chỉ tiêu thu nhập',
    rows: [
      { label: '[21] Tổng thu nhập chịu thuế', value: incomeInfo.grossIncome - incomeInfo.allowances, format: 'currency' },
      { label: '[22] Tổng thu nhập tính thuế', value: taxInfo.taxableIncome, format: 'currency' },
      { label: '[23] Tổng số thuế TNCN phải nộp', value: taxInfo.taxAmount, format: 'currency', highlight: true },
    ],
  });

  return {
    type: 'monthly_declaration',
    title: `Tờ khai thuế TNCN - ${getPeriodLabel(period)}`,
    metadata: {
      generatedAt: new Date(),
      documentId: generateDocumentId(),
      version: '1.0',
    },
    content: sections,
    legalNote: 'Đây là bản tham khảo. Để khai thuế chính thức, vui lòng sử dụng phần mềm HTKK hoặc khai trực tuyến tại thuedientu.gdt.gov.vn',
  };
}

/**
 * Generate annual settlement (simplified)
 */
function generateAnnualSettlement(input: DocumentInput): DocumentOutput {
  const { personalInfo, incomeInfo, deductionInfo, taxInfo, period } = input;

  const sections: DocumentSection[] = [];

  // Section 1: Personal info
  sections.push({
    id: 'personal',
    title: 'Phần A - Thông tin người nộp thuế',
    rows: [
      { label: '[01] Họ và tên', value: personalInfo.fullName || '(Chưa nhập)', format: 'text' },
      { label: '[02] Mã số thuế', value: personalInfo.taxCode || '(Chưa có)', format: 'text' },
      { label: '[03] CCCD/Hộ chiếu', value: personalInfo.idNumber || '(Chưa nhập)', format: 'text' },
      { label: '[04] Địa chỉ', value: personalInfo.address || '(Chưa nhập)', format: 'text' },
    ],
  });

  // Section 2: Income summary
  const totalInsurance = incomeInfo.socialInsurance + incomeInfo.healthInsurance + incomeInfo.unemploymentInsurance;

  sections.push({
    id: 'income_summary',
    title: 'Phần B - Thu nhập chịu thuế',
    rows: [
      { label: '[21] Tổng thu nhập chịu thuế', value: incomeInfo.grossIncome, format: 'currency' },
      { label: '[22] Các khoản giảm trừ', value: '', format: 'text' },
      { label: '[22a] - Giảm trừ gia cảnh', value: deductionInfo.personalDeduction + deductionInfo.dependentDeduction, format: 'currency', indent: 1 },
      { label: '[22b] - BHXH, BHYT, BHTN', value: totalInsurance, format: 'currency', indent: 1 },
      { label: '[22c] - Quỹ hưu trí tự nguyện', value: incomeInfo.pensionContribution, format: 'currency', indent: 1 },
      { label: '[22d] - Từ thiện, nhân đạo', value: incomeInfo.charitableContributions, format: 'currency', indent: 1 },
      { label: '[23] Thu nhập tính thuế', value: taxInfo.taxableIncome, format: 'currency', highlight: true },
    ],
  });

  // Section 3: Tax calculation
  sections.push({
    id: 'tax_calculation',
    title: 'Phần C - Thuế TNCN phải nộp',
    rows: [
      { label: '[31] Tổng thuế TNCN phải nộp', value: taxInfo.taxAmount, format: 'currency' },
      { label: '[32] Tổng thuế đã tạm nộp/khấu trừ', value: taxInfo.taxPaid, format: 'currency' },
      { label: '[33] Tổng thuế còn phải nộp', value: Math.max(0, taxInfo.taxOwed), format: 'currency', highlight: true },
      { label: '[34] Tổng thuế nộp thừa được hoàn', value: Math.max(0, -taxInfo.taxOwed), format: 'currency' },
    ],
  });

  return {
    type: 'annual_settlement',
    title: `Tờ khai quyết toán thuế TNCN - Năm ${period.year}`,
    metadata: {
      generatedAt: new Date(),
      documentId: generateDocumentId(),
      version: '1.0',
    },
    content: sections,
    legalNote: 'Đây là bản tham khảo theo mẫu 02/QTT-TNCN. Để quyết toán chính thức, vui lòng sử dụng phần mềm HTKK hoặc khai trực tuyến tại thuedientu.gdt.gov.vn. Hạn quyết toán: 31/3 năm sau.',
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
    case 'personal_report':
      return generatePersonalReport(input);
    case 'monthly_declaration':
      return generateMonthlyDeclaration(input);
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

/**
 * Get deduction amounts based on year
 */
export function getDeductionAmounts(year: number, isSecondHalf2026: boolean = false): {
  personalDeduction: number;
  dependentDeduction: number;
} {
  if (year >= 2026 && isSecondHalf2026) {
    return {
      personalDeduction: PERSONAL_DEDUCTION_2026,
      dependentDeduction: DEPENDENT_DEDUCTION_2026,
    };
  }
  return {
    personalDeduction: PERSONAL_DEDUCTION_2025,
    dependentDeduction: DEPENDENT_DEDUCTION_2025,
  };
}
