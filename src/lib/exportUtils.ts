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
 * Export HTML element to PDF using html2canvas + jsPDF.
 * `title` ghi vào thuộc tính tài liệu PDF (Unicode): font chuẩn của jsPDF không có dấu tiếng Việt,
 * tiêu đề hiển thị phải nằm sẵn trong element.
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
    pdf.setProperties({ title });

    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate image dimensions to fit page
    const margin = 10;
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const sliceHeight = pageHeight - 2 * margin; // phần ảnh hiện trên mỗi trang

    // Mỗi trang vẽ cả ảnh, dịch lên theo offset, rồi phủ trắng 2 lề để không lặp/tràn nội dung
    const imgData = canvas.toDataURL('image/png');
    for (let offset = 0; offset < imgHeight; offset += sliceHeight) {
      if (offset > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, margin - offset, imgWidth, imgHeight);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, margin, 'F');
      pdf.rect(0, pageHeight - margin, pageWidth, margin, 'F');
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

// Ô bắt đầu bằng = + - @ (hoặc tab, CR) bị Excel coi là công thức → thêm ' phía trước
export function csvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  if (typeof value === 'number') return value.toString();
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Convert data to CSV string with proper Vietnamese encoding
 */
function toCSV(headers: string[], rows: ExcelRow[]): string {
  // BOM for UTF-8 (Excel needs this for Vietnamese characters)
  const BOM = '\uFEFF';

  // Format header row
  const headerRow = headers.map(csvCell).join(',');

  // Format data rows
  const dataRows = rows.map(row => headers.map(header => csvCell(row[header])).join(','));

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

// ============================================
// Tax Data Export Helpers
// ============================================


// ============================================
// Utility Functions
// ============================================

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Thu hồi URL sau khi trình duyệt bắt đầu tải (revoke ngay có thể hủy tải trên Firefox/Safari)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
