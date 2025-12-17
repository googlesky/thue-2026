'use client';

import { useState, useCallback } from 'react';
import {
  SalarySlipData,
  SalarySlipSummary,
  VIETNAMESE_MONTHS,
} from './types';

interface SalarySlipPDFProps {
  data: SalarySlipData;
  summary: SalarySlipSummary;
  onGenerating?: (isGenerating: boolean) => void;
}

// Format currency for Vietnamese
function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' VND';
}

// Convert number to Vietnamese words (simplified)
function numberToVietnameseWords(num: number): string {
  if (num === 0) return 'Không đồng';

  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const positions = ['', 'nghìn', 'triệu', 'tỷ'];

  const formatGroup = (n: number): string => {
    if (n === 0) return '';
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;

    let result = '';
    if (hundreds > 0) result += units[hundreds] + ' trăm ';
    if (tens > 0) {
      if (tens === 1) result += 'mười ';
      else result += units[tens] + ' mươi ';
    } else if (hundreds > 0 && ones > 0) {
      result += 'lẻ ';
    }
    if (ones > 0) {
      if (tens > 1 && ones === 1) result += 'mốt';
      else if (tens > 0 && ones === 5) result += 'lăm';
      else result += units[ones];
    }
    return result.trim();
  };

  const groups: number[] = [];
  let n = Math.abs(Math.round(num));
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] > 0) {
      result += formatGroup(groups[i]) + ' ' + positions[i] + ' ';
    }
  }

  return result.trim().replace(/\s+/g, ' ') + ' đồng';
}

// Generate HTML template for PDF
function generatePDFHTML(data: SalarySlipData, summary: SalarySlipSummary): string {
  const { company, employee, payPeriod, earnings, deductions } = data;
  const monthName = VIETNAMESE_MONTHS[payPeriod.month - 1];
  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN');

  // Calculate total allowances
  const totalAllowances = earnings.allowances.reduce((sum, a) => sum + a.amount, 0);

  // Generate allowances rows
  const allowanceRows = earnings.allowances.length > 0
    ? earnings.allowances
        .map(
          (a, i) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i + 1 === 1 ? '' : ''}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">- ${a.label}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(a.amount)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
          </tr>
        `
        )
        .join('')
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
        }
        body {
          padding: 40px;
          font-size: 13px;
          line-height: 1.5;
          color: #1a1a1a;
        }
        .container {
          max-width: 700px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #1a1a1a;
          padding-bottom: 20px;
        }
        .company-name {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .company-address {
          font-size: 12px;
          color: #666;
        }
        .title {
          font-size: 20px;
          font-weight: bold;
          text-transform: uppercase;
          text-align: center;
          margin: 20px 0;
        }
        .subtitle {
          text-align: center;
          font-size: 14px;
          margin-bottom: 25px;
        }
        .employee-info {
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .info-label {
          width: 150px;
          color: #666;
        }
        .info-value {
          flex: 1;
          font-weight: 500;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #f8fafc;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #334155;
        }
        th:nth-child(3), th:nth-child(4) {
          text-align: right;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .section-header {
          background: #f1f5f9 !important;
          font-weight: bold;
        }
        .total-row {
          background: #f8fafc;
          font-weight: bold;
        }
        .total-row td {
          padding: 12px 8px;
          border-top: 2px solid #334155;
          border-bottom: 2px solid #334155;
        }
        .net-pay-row {
          background: #ecfdf5;
        }
        .net-pay-row td {
          padding: 15px 8px;
          font-size: 15px;
          border-top: 3px double #334155;
        }
        .amount-in-words {
          margin: 20px 0;
          padding: 15px;
          background: #f8fafc;
          border-radius: 4px;
          font-style: italic;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 50px;
          text-align: center;
        }
        .signature-box {
          width: 30%;
        }
        .signature-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .signature-date {
          font-size: 11px;
          color: #666;
          margin-bottom: 60px;
        }
        .signature-name {
          border-top: 1px solid #334155;
          padding-top: 5px;
          font-weight: 500;
        }
        .footer {
          margin-top: 40px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 11px;
          color: #666;
        }
        .disclaimer {
          margin-top: 20px;
          padding: 10px;
          background: #fef3c7;
          border-radius: 4px;
          font-size: 11px;
          color: #92400e;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="company-name">${company.name || 'CÔNG TY'}</div>
          <div class="company-address">${company.address || 'Địa chỉ'}</div>
        </div>

        <!-- Title -->
        <div class="title">PHIẾU LƯƠNG</div>
        <div class="subtitle">${monthName} năm ${payPeriod.year}</div>

        <!-- Employee Info -->
        <div class="employee-info">
          <div class="info-row">
            <span class="info-label">Họ tên nhân viên:</span>
            <span class="info-value">${employee.name || '_______________'}</span>
          </div>
          ${employee.employeeId ? `
          <div class="info-row">
            <span class="info-label">Mã nhân viên:</span>
            <span class="info-value">${employee.employeeId}</span>
          </div>
          ` : ''}
          ${employee.position ? `
          <div class="info-row">
            <span class="info-label">Chức vụ:</span>
            <span class="info-value">${employee.position}</span>
          </div>
          ` : ''}
          ${employee.department ? `
          <div class="info-row">
            <span class="info-label">Phòng ban:</span>
            <span class="info-value">${employee.department}</span>
          </div>
          ` : ''}
          ${employee.bankAccount ? `
          <div class="info-row">
            <span class="info-label">Số tài khoản:</span>
            <span class="info-value">${employee.bankAccount}${employee.bankName ? ` - ${employee.bankName}` : ''}</span>
          </div>
          ` : ''}
        </div>

        <!-- Salary Details Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">STT</th>
              <th>Khoản mục</th>
              <th style="width: 140px;">Thu nhập</th>
              <th style="width: 140px;">Khấu trừ</th>
            </tr>
          </thead>
          <tbody>
            <!-- Earnings Section -->
            <tr class="section-header">
              <td colspan="4" style="padding: 10px 8px; background: #e0f2fe;">I. THU NHẬP</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">1</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Lương cơ bản</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(earnings.basicSalary)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
            </tr>
            ${totalAllowances > 0 ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">2</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">Phụ cấp</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(totalAllowances)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
            </tr>
            ${allowanceRows}
            ` : ''}
            ${earnings.overtime > 0 ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${totalAllowances > 0 ? '3' : '2'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Làm thêm giờ</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(earnings.overtime)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
            </tr>
            ` : ''}
            ${earnings.bonus > 0 ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${totalAllowances > 0 ? (earnings.overtime > 0 ? '4' : '3') : (earnings.overtime > 0 ? '3' : '2')}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Thưởng</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(earnings.bonus)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
            </tr>
            ` : ''}
            ${earnings.otherEarnings > 0 ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Thu nhập khác</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(earnings.otherEarnings)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td></td>
              <td style="text-align: right; padding-right: 20px;">Tổng thu nhập (A):</td>
              <td style="text-align: right; color: #059669;">${formatVND(summary.grossIncome)}</td>
              <td></td>
            </tr>

            <!-- Deductions Section -->
            <tr class="section-header">
              <td colspan="4" style="padding: 10px 8px; background: #fee2e2;">II. CÁC KHOẢN KHẤU TRỪ</td>
            </tr>
            ${deductions.bhxh > 0 ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">1</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">BHXH (8%)</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(deductions.bhxh)}</td>
            </tr>
            ` : ''}
            ${deductions.bhyt > 0 ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">2</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">BHYT (1.5%)</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(deductions.bhyt)}</td>
            </tr>
            ` : ''}
            ${deductions.bhtn > 0 ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">3</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">BHTN (1%)</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(deductions.bhtn)}</td>
            </tr>
            ` : ''}
            ${deductions.personalIncomeTax > 0 ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">4</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Thuế TNCN</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(deductions.personalIncomeTax)}</td>
            </tr>
            ` : ''}
            ${deductions.otherDeductions > 0 ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">5</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Khấu trừ khác</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"></td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatVND(deductions.otherDeductions)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td></td>
              <td style="text-align: right; padding-right: 20px;">Tổng khấu trừ (B):</td>
              <td></td>
              <td style="text-align: right; color: #dc2626;">${formatVND(summary.totalDeductions)}</td>
            </tr>

            <!-- Net Pay -->
            <tr class="net-pay-row">
              <td></td>
              <td style="font-weight: bold;">THỰC LĨNH (A - B):</td>
              <td colspan="2" style="text-align: right; font-weight: bold; color: #059669; font-size: 16px;">
                ${formatVND(summary.netPay)}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Amount in words -->
        <div class="amount-in-words">
          <strong>Bằng chữ:</strong> ${numberToVietnameseWords(summary.netPay).charAt(0).toUpperCase() + numberToVietnameseWords(summary.netPay).slice(1)}
        </div>

        <!-- Signatures -->
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-title">Người lập</div>
            <div class="signature-date">Ngày ${dateStr}</div>
            <div class="signature-name">&nbsp;</div>
          </div>
          <div class="signature-box">
            <div class="signature-title">Kế toán trưởng</div>
            <div class="signature-date">Ngày ${dateStr}</div>
            <div class="signature-name">&nbsp;</div>
          </div>
          <div class="signature-box">
            <div class="signature-title">Giám đốc</div>
            <div class="signature-date">Ngày ${dateStr}</div>
            <div class="signature-name">&nbsp;</div>
          </div>
        </div>

        <!-- Disclaimer -->
        <div class="disclaimer">
          Phiếu lương này được tạo tự động, vui lòng kiểm tra lại trước khi sử dụng.
        </div>

        <!-- Footer -->
        <div class="footer">
          Tạo bởi Tính Thuế TNCN 2026 - thue.1devops.io
        </div>
      </div>
    </body>
    </html>
  `;
}

export default function SalarySlipPDF({ data, summary, onGenerating }: SalarySlipPDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    onGenerating?.(true);

    try {
      // Dynamic imports to reduce bundle size
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // Create a temporary container for the PDF content
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 794px;
        background: white;
      `;

      container.innerHTML = generatePDFHTML(data, summary);
      document.body.appendChild(container);

      // Generate canvas from the container
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Remove the temporary container
      document.body.removeChild(container);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // If content is longer than one page, add more pages
      const pageHeight = 297; // A4 height in mm
      let heightLeft = imgHeight - pageHeight;
      let position = -pageHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        position -= pageHeight;
      }

      // Generate filename
      const monthYear = `${data.payPeriod.month.toString().padStart(2, '0')}-${data.payPeriod.year}`;
      const employeeName = data.employee.name
        ? data.employee.name.toLowerCase().replace(/\s+/g, '-')
        : 'phieu-luong';
      const filename = `phieu-luong-${employeeName}-${monthYear}.pdf`;

      // Download the PDF
      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Không thể tạo PDF. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
      onGenerating?.(false);
    }
  }, [data, summary, onGenerating]);

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className={`
          flex items-center gap-2 px-6 py-3 min-h-[48px]
          rounded-xl font-semibold transition-all duration-200
          ${
            isGenerating
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl'
          }
        `}
        aria-label={isGenerating ? 'Đang tạo PDF...' : 'Tải phiếu lương PDF'}
      >
        {isGenerating ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Đang tạo PDF...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Tải phiếu lương PDF</span>
          </>
        )}
      </button>
      {error && (
        <p className="mt-3 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Export the HTML generator for preview
export { generatePDFHTML };
