'use client';

import { useState, useCallback } from 'react';
import { TaxResult as TaxResultType, formatCurrency, OtherIncomeTaxResult } from '@/lib/taxCalculator';

interface PDFExportButtonProps {
  result: TaxResultType;
  otherIncomeTax?: OtherIncomeTaxResult | null;
  declaredSalary?: number;
  variant?: 'default' | 'minimal' | 'inline';
  className?: string;
}

export default function PDFExportButton({
  result,
  otherIncomeTax,
  declaredSalary,
  variant = 'default',
  className = '',
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Dynamic imports to reduce initial bundle size
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // Calculate totals including other income
      const hasOtherIncome = otherIncomeTax && otherIncomeTax.totalIncome > 0;
      const totalTax = result.taxAmount + (hasOtherIncome ? otherIncomeTax.totalTax : 0);

      // Create a temporary container for the PDF content
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 794px;
        background: white;
        font-family: 'Helvetica', 'Arial', sans-serif;
        padding: 40px;
        box-sizing: border-box;
      `;

      // Format number for Vietnamese display
      const formatVND = (amount: number): string => {
        return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' VND';
      };

      // Current date
      const now = new Date();
      const dateStr = now.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Build allowances section if exists
      let allowancesSection = '';
      if (result.allowancesBreakdown && result.allowancesBreakdown.total > 0) {
        allowancesSection = `
          <div style="margin-bottom: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
            <h4 style="margin: 0 0 10px 0; color: #15803d; font-size: 14px;">Phụ cấp</h4>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span>Tổng phụ cấp:</span>
              <span style="font-weight: 600;">${formatVND(result.allowancesBreakdown.total)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #15803d;">
              <span>  - Miễn thuế:</span>
              <span>${formatVND(result.allowancesBreakdown.taxExempt)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #d97706;">
              <span>  - Chịu thuế:</span>
              <span>${formatVND(result.allowancesBreakdown.taxable)}</span>
            </div>
          </div>
        `;
      }

      // Build insurance detail section
      const insuranceDetail = result.insuranceDetail;
      let insuranceSection = '';
      if (result.insuranceDeduction > 0) {
        insuranceSection = `
          <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748b;">
              <span>Bảo hiểm:</span>
              <span>-${formatVND(result.insuranceDeduction)}</span>
            </div>
            ${insuranceDetail.bhxh > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; padding-left: 15px;">
                <span>BHXH (8%):</span>
                <span>-${formatVND(insuranceDetail.bhxh)}</span>
              </div>
            ` : ''}
            ${insuranceDetail.bhyt > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; padding-left: 15px;">
                <span>BHYT (1.5%):</span>
                <span>-${formatVND(insuranceDetail.bhyt)}</span>
              </div>
            ` : ''}
            ${insuranceDetail.bhtn > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; padding-left: 15px;">
                <span>BHTN (1%):</span>
                <span>-${formatVND(insuranceDetail.bhtn)}</span>
              </div>
            ` : ''}
          </div>
        `;
      }

      // Build tax breakdown table
      const buildTaxBreakdownRows = (r: TaxResultType): string => {
        if (r.taxBreakdown.length === 0) {
          return '<tr><td colspan="4" style="text-align: center; padding: 10px; color: #64748b;">Không phải nộp thuế</td></tr>';
        }
        return r.taxBreakdown.map((item, index) => `
          <tr style="background: ${index % 2 === 0 ? '#f8fafc' : 'white'};">
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Bậc ${item.bracket}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${(item.rate * 100).toFixed(0)}%</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${formatVND(item.taxableAmount)}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${formatVND(item.taxAmount)}</td>
          </tr>
        `).join('');
      };

      // Other income section
      let otherIncomeSection = '';
      if (hasOtherIncome) {
        otherIncomeSection = `
          <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">Thu nhập khác</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
              <div>
                <div style="font-size: 12px; color: #64748b;">Tổng thu nhập</div>
                <div style="font-size: 16px; font-weight: 600;">${formatVND(otherIncomeTax.totalIncome)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Thuế phải nộp</div>
                <div style="font-size: 16px; font-weight: 600; color: #dc2626;">${formatVND(otherIncomeTax.totalTax)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Thực nhận</div>
                <div style="font-size: 16px; font-weight: 600; color: #16a34a;">${formatVND(otherIncomeTax.totalNet)}</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 20px; padding: 20px; background: #1f2937; border-radius: 8px; color: white;">
            <h3 style="margin: 0 0 15px 0; font-size: 16px;">Tổng kết tất cả nguồn thu nhập</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
              <div>
                <div style="font-size: 12px; color: #9ca3af;">Lương GROSS</div>
                <div style="font-size: 14px; font-weight: 600;">${formatVND(result.grossIncome)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #9ca3af;">Thu nhập khác</div>
                <div style="font-size: 14px; font-weight: 600;">${formatVND(otherIncomeTax.totalIncome)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #9ca3af;">Tổng thuế</div>
                <div style="font-size: 14px; font-weight: 600; color: #f87171;">${formatVND(totalTax)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #9ca3af;">Tổng thực nhận</div>
                <div style="font-size: 14px; font-weight: 600; color: #4ade80;">${formatVND(result.netIncome + otherIncomeTax.totalNet)}</div>
              </div>
            </div>
          </div>
        `;
      }

      // Declared salary notice
      const hasDeclaredSalary = declaredSalary !== undefined && declaredSalary !== result.grossIncome;
      const declaredSalaryNotice = hasDeclaredSalary ? `
        <div style="margin-bottom: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            <strong>Lưu ý:</strong> Bảo hiểm tính trên lương khai báo <strong>${formatVND(declaredSalary)}</strong>,
            nhưng thuế TNCN vẫn tính trên lương thực tế <strong>${formatVND(result.grossIncome)}</strong>
          </p>
        </div>
      ` : '';

      container.innerHTML = `
        <div style="max-width: 754px; margin: 0 auto;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6;">
            <h1 style="margin: 0; font-size: 24px; color: #1e40af;">BÁO CÁO TÍNH THUẾ TNCN</h1>
            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Theo Luật 109/2025/QH15 – 5 bậc thuế | Ngày tạo: ${dateStr}</p>
          </div>

          ${declaredSalaryNotice}

          <!-- Input Summary -->
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #334155; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Thông tin đầu vào</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <div style="font-size: 12px; color: #64748b;">Thu nhập GROSS</div>
                <div style="font-size: 16px; font-weight: 600;">${formatVND(result.grossIncome)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Người phụ thuộc</div>
                <div style="font-size: 16px; font-weight: 600;">${Math.round(result.dependentDeduction / 6200000)} người</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Giảm trừ bản thân</div>
                <div style="font-size: 16px; font-weight: 600;">${formatVND(result.personalDeduction)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Giảm trừ người phụ thuộc</div>
                <div style="font-size: 16px; font-weight: 600;">${formatVND(result.dependentDeduction)}</div>
              </div>
            </div>
            ${allowancesSection}
            ${insuranceSection}
          </div>

          <!-- Tax Result -->
          <div style="border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; background: #eff6ff; margin-bottom: 25px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #3b82f6;"></div>
              <h3 style="margin: 0; font-size: 16px; color: #334155;">Kết quả tính thuế (Luật 109/2025 – 5 bậc)</h3>
            </div>
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                <span style="color: #64748b;">Thu nhập tính thuế:</span>
                <span style="font-weight: 500;">${formatVND(result.taxableIncome)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                <span style="color: #64748b;">Thuế suất thực tế:</span>
                <span style="font-weight: 500;">${result.effectiveRate.toFixed(2)}%</span>
              </div>
            </div>
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 12px; color: #64748b;">Thuế TNCN phải nộp</div>
              <div style="font-size: 24px; font-weight: bold; color: #1d4ed8;">${formatVND(result.taxAmount)}</div>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #bfdbfe; text-align: center;">
              <div style="font-size: 12px; color: #64748b;">Thu nhập thực nhận</div>
              <div style="font-size: 20px; font-weight: bold; color: #16a34a;">${formatVND(result.netIncome)}</div>
            </div>
          </div>

          <!-- Tax Breakdown Table -->
          <div style="margin-bottom: 25px;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #334155;">Chi tiết các bậc thuế</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #dbeafe;">
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Bậc</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Thuế suất</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Thu nhập</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Thuế</th>
                </tr>
              </thead>
              <tbody>
                ${buildTaxBreakdownRows(result)}
                <tr style="background: #dbeafe; font-weight: 600;">
                  <td colspan="3" style="padding: 8px; border: 1px solid #e2e8f0;">Tổng thuế</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${formatVND(result.taxAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${otherIncomeSection}

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0 0 5px 0;">Báo cáo được tạo từ <strong>Tính Thuế TNCN 2026</strong> - thue.1devops.io</p>
            <p style="margin: 0;">Đây là công cụ tham khảo. Vui lòng tư vấn chuyên gia thuế cho các quyết định tài chính quan trọng.</p>
          </div>
        </div>
      `;

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

      // Generate filename with date
      const dateForFile = now.toISOString().split('T')[0];
      const filename = `bao-cao-thue-tncn-${dateForFile}.pdf`;

      // Download the PDF
      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Không thể tạo PDF. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  }, [result, otherIncomeTax, declaredSalary]);

  // Different button styles based on variant
  const getButtonClasses = () => {
    const base = 'flex items-center gap-2 font-medium transition-all duration-200 min-h-[44px]';

    switch (variant) {
      case 'minimal':
        return `${base} px-3 py-2 text-sm rounded-lg ${
          isGenerating
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`;
      case 'inline':
        return `${base} px-4 py-2 text-sm rounded-lg ${
          isGenerating
            ? 'bg-white/20 text-white/60 cursor-not-allowed'
            : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
        }`;
      default:
        return `${base} px-4 py-2.5 rounded-lg shadow-sm ${
          isGenerating
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
        }`;
    }
  };

  return (
    <div className={`inline-flex flex-col items-end ${className}`}>
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className={getButtonClasses()}
        aria-label={isGenerating ? 'Đang tạo PDF...' : 'Xuất báo cáo PDF'}
      >
        {isGenerating ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Đang tạo...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Xuất PDF</span>
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
