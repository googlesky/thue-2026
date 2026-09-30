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

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Mọi chuỗi người dùng nhập phải escape trước khi ghép vào HTML (preview + PDF)
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

// Đọc nhóm 3 chữ số; full = nhóm không đứng đầu → đọc đủ "không trăm", "lẻ"
function readGroup(n: number, full: boolean): string {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;
  const words: string[] = [];
  if (hundreds > 0 || full) words.push(DIGITS[hundreds], 'trăm');
  if (tens > 1) words.push(DIGITS[tens], 'mươi');
  else if (tens === 1) words.push('mười');
  else if (ones > 0 && words.length > 0) words.push('lẻ');
  if (ones === 1 && tens > 1) words.push('mốt');
  else if (ones === 5 && tens > 0) words.push('lăm');
  else if (ones > 0) words.push(DIGITS[ones]);
  return words.join(' ');
}

// n nguyên dương; tách theo tỷ (đệ quy) để có "nghìn tỷ", "triệu tỷ"
function readNumber(n: number): string {
  const billions = Math.floor(n / 1e9);
  const rest = n % 1e9;
  const parts: string[] = billions > 0 ? [`${readNumber(billions)} tỷ`] : [];
  const groups = [Math.floor(rest / 1e6), Math.floor(rest / 1e3) % 1000, rest % 1000];
  const units = [' triệu', ' nghìn', ''];
  groups.forEach((group, i) => {
    if (group > 0) parts.push(readGroup(group, parts.length > 0) + units[i]);
  });
  return parts.join(' ');
}

// Số tiền bằng chữ, VD: 25.000.005 → "Hai mươi lăm triệu không trăm lẻ năm đồng"
export function numberToVietnameseWords(num: number): string {
  const n = Math.round(num);
  if (!Number.isFinite(n) || n === 0) return 'Không đồng';
  const text = `${n < 0 ? 'âm ' : ''}${readNumber(Math.abs(n))} đồng`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// CSS gói trong .slip-root: chèn vào trang (xem trước, xuất PDF) không ảnh hưởng layout toàn trang
const SLIP_CSS = `
  .slip-root {
    max-width: 700px;
    margin: 0 auto;
    font-family: var(--font-sans), 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: #1a1a1a;
    background: #fff;
  }
  .slip-root * { box-sizing: border-box; }
  .slip-root .header {
    text-align: center;
    margin-bottom: 30px;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 20px;
  }
  .slip-root .company-name {
    font-size: 18px;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .slip-root .company-address { font-size: 12px; color: #666; }
  .slip-root .title {
    font-size: 20px;
    font-weight: bold;
    text-transform: uppercase;
    text-align: center;
    margin: 20px 0;
  }
  .slip-root .subtitle { text-align: center; font-size: 14px; margin-bottom: 25px; }
  .slip-root .employee-info { margin-bottom: 20px; }
  .slip-root .info-row { display: flex; margin-bottom: 8px; }
  .slip-root .info-label { width: 150px; flex-shrink: 0; color: #666; }
  .slip-root .info-value { flex: 1; font-weight: 500; overflow-wrap: anywhere; }
  .slip-root table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .slip-root th {
    background: #f8fafc;
    padding: 10px 8px;
    text-align: left;
    font-weight: bold;
    border-bottom: 2px solid #334155;
  }
  .slip-root th:nth-child(3), .slip-root th:nth-child(4), .slip-root td.num { text-align: right; }
  .slip-root td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
  .slip-root td.num { white-space: nowrap; }
  .slip-root .section-header td { padding: 10px 8px; font-weight: bold; }
  .slip-root .total-row { background: #f8fafc; font-weight: bold; }
  .slip-root .total-row td {
    padding: 12px 8px;
    border-top: 2px solid #334155;
    border-bottom: 2px solid #334155;
  }
  .slip-root .net-pay-row { background: #ecfdf5; }
  .slip-root .net-pay-row td { padding: 15px 8px; font-size: 15px; border-top: 3px double #334155; }
  .slip-root .amount-in-words {
    margin: 20px 0;
    padding: 15px;
    background: #f8fafc;
    border-radius: 4px;
    font-style: italic;
  }
  .slip-root .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 50px;
    text-align: center;
  }
  .slip-root .signature-box { width: 30%; }
  .slip-root .signature-title { font-weight: bold; margin-bottom: 5px; }
  .slip-root .signature-date { font-size: 11px; color: #666; margin-bottom: 60px; }
  .slip-root .signature-name { border-top: 1px solid #334155; padding-top: 5px; font-weight: 500; }
  .slip-root .footer {
    margin-top: 40px;
    padding-top: 15px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 11px;
    color: #666;
  }
  .slip-root .disclaimer {
    margin-top: 20px;
    padding: 10px;
    background: #fef3c7;
    border-radius: 4px;
    font-size: 11px;
    color: #92400e;
    text-align: center;
  }
`;

// Dòng bảng; label đã escape (nếu là dữ liệu người dùng) trước khi truyền vào
function row(stt: string, label: string, income: string, deduction: string, labelStyle = ''): string {
  return `<tr><td>${stt}</td><td${labelStyle ? ` style="${labelStyle}"` : ''}>${label}</td><td class="num">${income}</td><td class="num">${deduction}</td></tr>`;
}

// Generate HTML fragment for preview + PDF (không có <html>/<body>, CSS đã scope)
function generatePDFHTML(data: SalarySlipData, summary: SalarySlipSummary): string {
  const { company, employee, payPeriod, earnings, deductions } = data;
  const monthName = VIETNAMESE_MONTHS[payPeriod.month - 1];
  const dateStr = new Date().toLocaleDateString('vi-VN');
  const totalAllowances = earnings.allowances.reduce((sum, a) => sum + a.amount, 0);

  const infoRow = (label: string, value: string | undefined) =>
    value
      ? `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${escapeHtml(value)}</span></div>`
      : '';

  // STT đánh liên tục theo các dòng thực sự hiển thị
  let earningNo = 0;
  const earningRows = [
    row(String(++earningNo), 'Lương cơ bản', formatVND(earnings.basicSalary), ''),
    totalAllowances > 0
      ? row(String(++earningNo), 'Phụ cấp', formatVND(totalAllowances), '', 'font-weight: 500;') +
        earnings.allowances
          .filter((a) => a.amount > 0)
          .map((a) => row('', `- ${escapeHtml(a.label)}`, formatVND(a.amount), ''))
          .join('')
      : '',
    earnings.overtime > 0 ? row(String(++earningNo), 'Làm thêm giờ', formatVND(earnings.overtime), '') : '',
    earnings.bonus > 0 ? row(String(++earningNo), 'Thưởng', formatVND(earnings.bonus), '') : '',
    earnings.otherEarnings > 0 ? row(String(++earningNo), 'Thu nhập khác', formatVND(earnings.otherEarnings), '') : '',
  ].join('');

  let deductionNo = 0;
  const deductionRows = (
    [
      ['BHXH (8%)', deductions.bhxh],
      ['BHYT (1,5%)', deductions.bhyt],
      ['BHTN (1%)', deductions.bhtn],
      ['Thuế TNCN', deductions.personalIncomeTax],
      ['Khấu trừ khác', deductions.otherDeductions],
    ] as const
  )
    .filter(([, amount]) => amount > 0)
    .map(([label, amount]) => row(String(++deductionNo), label, '', formatVND(amount)))
    .join('');

  const bankInfo = employee.bankAccount
    ? `${employee.bankAccount}${employee.bankName ? ` - ${employee.bankName}` : ''}`
    : '';

  return `
    <style>${SLIP_CSS}</style>
    <div class="slip-root">
      <div class="header">
        <div class="company-name">${escapeHtml(company.name || 'CÔNG TY')}</div>
        <div class="company-address">${escapeHtml(company.address || 'Địa chỉ')}</div>
      </div>

      <div class="title">PHIẾU LƯƠNG</div>
      <div class="subtitle">${monthName} năm ${payPeriod.year}</div>

      <div class="employee-info">
        ${infoRow('Họ tên nhân viên:', employee.name || '_______________')}
        ${infoRow('Mã nhân viên:', employee.employeeId)}
        ${infoRow('Chức vụ:', employee.position)}
        ${infoRow('Phòng ban:', employee.department)}
        ${infoRow('Số tài khoản:', bankInfo)}
      </div>

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
          <tr class="section-header"><td colspan="4" style="background: #e0f2fe;">I. THU NHẬP</td></tr>
          ${earningRows}
          <tr class="total-row">
            <td></td>
            <td style="text-align: right; padding-right: 20px;">Tổng thu nhập (A):</td>
            <td class="num" style="color: #059669;">${formatVND(summary.grossIncome)}</td>
            <td></td>
          </tr>

          <tr class="section-header"><td colspan="4" style="background: #fee2e2;">II. CÁC KHOẢN KHẤU TRỪ</td></tr>
          ${deductionRows}
          <tr class="total-row">
            <td></td>
            <td style="text-align: right; padding-right: 20px;">Tổng khấu trừ (B):</td>
            <td></td>
            <td class="num" style="color: #dc2626;">${formatVND(summary.totalDeductions)}</td>
          </tr>

          <tr class="net-pay-row">
            <td></td>
            <td style="font-weight: bold;">THỰC LĨNH (A - B):</td>
            <td colspan="2" class="num" style="font-weight: bold; color: #059669; font-size: 16px;">
              ${formatVND(summary.netPay)}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="amount-in-words">
        <strong>Bằng chữ:</strong> ${numberToVietnameseWords(summary.netPay)}
      </div>

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

      <div class="disclaimer">
        Phiếu lương này được tạo tự động, vui lòng kiểm tra lại trước khi sử dụng.
      </div>

      <div class="footer">
        Tạo bởi Tính Thuế TNCN 2026 - thue.1devops.io
      </div>
    </div>
  `;
}

export default function SalarySlipPDF({ data, summary, onGenerating }: SalarySlipPDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    onGenerating?.(true);

    let container: HTMLDivElement | null = null;
    try {
      // Dynamic imports to reduce bundle size
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // Create a temporary container for the PDF content
      container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 794px;
        padding: 40px 0;
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
      // Luôn gỡ container tạm, kể cả khi html2canvas lỗi
      container?.remove();
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
