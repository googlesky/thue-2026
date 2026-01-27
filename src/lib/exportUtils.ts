/**
 * Export Utilities - PDF và CSV/Excel export
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ============================================
// PDF Export
// ============================================

export interface PDFOptions {
  filename?: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter';
}

/**
 * Export HTML element to PDF using html2canvas + jsPDF
 */
export async function exportToPDF(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> {
  const {
    filename = 'bao-cao-thue.pdf',
    title = 'Báo cáo thuế TNCN',
    orientation = 'portrait',
    pageSize = 'a4',
  } = options;

  try {
    // Capture element as canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize,
    });

    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate image dimensions to fit page
    const imgWidth = pageWidth - 20; // 10mm margin each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add title
    pdf.setFontSize(16);
    pdf.text(title, pageWidth / 2, 15, { align: 'center' });

    // Add image (may span multiple pages)
    let heightLeft = imgHeight;
    let position = 25; // Start after title

    // First page
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - position);

    // Additional pages if needed
    while (heightLeft > 0) {
      pdf.addPage();
      position = 10;
      pdf.addImage(imgData, 'PNG', 10, position - (imgHeight - heightLeft), imgWidth, imgHeight);
      heightLeft -= (pageHeight - position);
    }

    // Save PDF
    pdf.save(filename);
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Không thể xuất PDF. Vui lòng thử lại.');
  }
}

// ============================================
// CSV/Excel Export
// ============================================

export interface ExcelRow {
  [key: string]: string | number | undefined;
}

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: ExcelRow[];
}

/**
 * Convert data to CSV string with proper Vietnamese encoding
 */
function toCSV(headers: string[], rows: ExcelRow[]): string {
  // BOM for UTF-8 (Excel needs this for Vietnamese characters)
  const BOM = '\uFEFF';

  // Format header row
  const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');

  // Format data rows
  const dataRows = rows.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === undefined || value === null) return '""';
      if (typeof value === 'number') return value.toString();
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return BOM + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Export data to CSV file (can be opened in Excel)
 */
export function exportToCSV(
  headers: string[],
  rows: ExcelRow[],
  filename: string = 'bao-cao-thue.csv'
): void {
  const csv = toCSV(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export multiple sheets to Excel-compatible format
 * Uses SYLK format for basic Excel compatibility without external libraries
 */
export function exportToExcel(
  sheets: ExcelSheet[],
  filename: string = 'bao-cao-thue.xlsx'
): void {
  // For simplicity, export first sheet as CSV (Excel can open it)
  // Full Excel support would require xlsx library
  if (sheets.length === 0) return;

  const sheet = sheets[0];
  const csv = toCSV(sheet.headers, sheet.rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  // Change extension to .csv for proper opening
  const csvFilename = filename.replace(/\.xlsx?$/, '.csv');
  downloadBlob(blob, csvFilename);
}

// ============================================
// Tax Data Export Helpers
// ============================================

export interface TaxExportData {
  personalInfo?: {
    fullName?: string;
    taxCode?: string;
    idNumber?: string;
    employer?: string;
  };
  period: {
    year: number;
    month?: number;
  };
  income: {
    grossIncome: number;
    allowances?: number;
    totalInsurance: number;
  };
  deductions: {
    personalDeduction: number;
    dependentDeduction: number;
    numberOfDependents: number;
    otherDeductions?: number;
  };
  tax: {
    taxableIncome: number;
    taxAmount: number;
    taxPaid?: number;
    netIncome: number;
    effectiveRate?: number;
  };
}

/**
 * Format tax data for export
 */
export function formatTaxDataForExport(data: TaxExportData): ExcelSheet {
  const { personalInfo, period, income, deductions, tax } = data;

  const periodStr = period.month
    ? `Tháng ${period.month}/${period.year}`
    : `Năm ${period.year}`;

  const rows: ExcelRow[] = [
    // Personal Info Section
    { 'Mục': 'THÔNG TIN CÁ NHÂN', 'Giá trị': '' },
    { 'Mục': 'Họ và tên', 'Giá trị': personalInfo?.fullName || '(Chưa nhập)' },
    { 'Mục': 'Mã số thuế', 'Giá trị': personalInfo?.taxCode || '(Chưa nhập)' },
    { 'Mục': 'CCCD/CMND', 'Giá trị': personalInfo?.idNumber || '(Chưa nhập)' },
    { 'Mục': 'Đơn vị công tác', 'Giá trị': personalInfo?.employer || '(Chưa nhập)' },
    { 'Mục': '', 'Giá trị': '' },

    // Period
    { 'Mục': 'KỲ TÍNH THUẾ', 'Giá trị': periodStr },
    { 'Mục': '', 'Giá trị': '' },

    // Income Section
    { 'Mục': 'THU NHẬP', 'Giá trị': '' },
    { 'Mục': 'Thu nhập GROSS', 'Giá trị': formatCurrency(income.grossIncome) },
    { 'Mục': 'Phụ cấp không tính thuế', 'Giá trị': formatCurrency(income.allowances || 0) },
    { 'Mục': 'Bảo hiểm bắt buộc', 'Giá trị': formatCurrency(income.totalInsurance) },
    { 'Mục': '', 'Giá trị': '' },

    // Deductions Section
    { 'Mục': 'GIẢM TRỪ', 'Giá trị': '' },
    { 'Mục': 'Giảm trừ bản thân', 'Giá trị': formatCurrency(deductions.personalDeduction) },
    { 'Mục': 'Số người phụ thuộc', 'Giá trị': deductions.numberOfDependents },
    { 'Mục': 'Giảm trừ người phụ thuộc', 'Giá trị': formatCurrency(deductions.dependentDeduction) },
    { 'Mục': 'Giảm trừ khác', 'Giá trị': formatCurrency(deductions.otherDeductions || 0) },
    { 'Mục': '', 'Giá trị': '' },

    // Tax Section
    { 'Mục': 'THUẾ TNCN', 'Giá trị': '' },
    { 'Mục': 'Thu nhập chịu thuế', 'Giá trị': formatCurrency(tax.taxableIncome) },
    { 'Mục': 'Thuế TNCN phải nộp', 'Giá trị': formatCurrency(tax.taxAmount) },
    { 'Mục': 'Thuế đã tạm nộp', 'Giá trị': formatCurrency(tax.taxPaid || 0) },
    { 'Mục': 'Thuế còn phải nộp/hoàn', 'Giá trị': formatCurrency(tax.taxAmount - (tax.taxPaid || 0)) },
    { 'Mục': '', 'Giá trị': '' },

    // Summary
    { 'Mục': 'KẾT QUẢ', 'Giá trị': '' },
    { 'Mục': 'Thu nhập NET thực nhận', 'Giá trị': formatCurrency(tax.netIncome) },
    { 'Mục': 'Thuế suất hiệu dụng', 'Giá trị': `${(tax.effectiveRate || 0).toFixed(2)}%` },
  ];

  return {
    name: 'Báo cáo thuế TNCN',
    headers: ['Mục', 'Giá trị'],
    rows,
  };
}

// ============================================
// Utility Functions
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
