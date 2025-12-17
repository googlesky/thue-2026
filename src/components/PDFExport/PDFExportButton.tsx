'use client';

import { useState, useCallback } from 'react';
import { TaxResult as TaxResultType, formatCurrency, OtherIncomeTaxResult } from '@/lib/taxCalculator';

interface PDFExportButtonProps {
  oldResult: TaxResultType;
  newResult: TaxResultType;
  otherIncomeTax?: OtherIncomeTaxResult | null;
  declaredSalary?: number;
}

export default function PDFExportButton({
  oldResult,
  newResult,
  otherIncomeTax,
  declaredSalary,
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

      const savings = oldResult.taxAmount - newResult.taxAmount;
      const savingsPercent = oldResult.taxAmount > 0
        ? ((savings / oldResult.taxAmount) * 100).toFixed(1)
        : '0';

      // Calculate totals including other income
      const hasOtherIncome = otherIncomeTax && otherIncomeTax.totalIncome > 0;
      const totalNewTax = newResult.taxAmount + (hasOtherIncome ? otherIncomeTax.totalTax : 0);

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
      if (newResult.allowancesBreakdown && newResult.allowancesBreakdown.total > 0) {
        allowancesSection = `
          <div style="margin-bottom: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
            <h4 style="margin: 0 0 10px 0; color: #15803d; font-size: 14px;">Phu cap</h4>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span>Tong phu cap:</span>
              <span style="font-weight: 600;">${formatVND(newResult.allowancesBreakdown.total)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #15803d;">
              <span>  - Mien thue:</span>
              <span>${formatVND(newResult.allowancesBreakdown.taxExempt)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #d97706;">
              <span>  - Chiu thue:</span>
              <span>${formatVND(newResult.allowancesBreakdown.taxable)}</span>
            </div>
          </div>
        `;
      }

      // Build insurance detail section
      const insuranceDetail = newResult.insuranceDetail;
      let insuranceSection = '';
      if (newResult.insuranceDeduction > 0) {
        insuranceSection = `
          <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748b;">
              <span>Bao hiem:</span>
              <span>-${formatVND(newResult.insuranceDeduction)}</span>
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

      // Build tax breakdown table for old law
      const buildTaxBreakdownRows = (result: TaxResultType): string => {
        if (result.taxBreakdown.length === 0) {
          return '<tr><td colspan="4" style="text-align: center; padding: 10px; color: #64748b;">Khong phai nop thue</td></tr>';
        }
        return result.taxBreakdown.map((item, index) => `
          <tr style="background: ${index % 2 === 0 ? '#f8fafc' : 'white'};">
            <td style="padding: 8px; border: 1px solid #e2e8f0;">Bac ${item.bracket}</td>
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
            <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">Thu nhap khac</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
              <div>
                <div style="font-size: 12px; color: #64748b;">Tong thu nhap</div>
                <div style="font-size: 16px; font-weight: 600;">${formatVND(otherIncomeTax.totalIncome)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Thue phai nop</div>
                <div style="font-size: 16px; font-weight: 600; color: #dc2626;">${formatVND(otherIncomeTax.totalTax)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Thuc nhan</div>
                <div style="font-size: 16px; font-weight: 600; color: #16a34a;">${formatVND(otherIncomeTax.totalNet)}</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 20px; padding: 20px; background: #1f2937; border-radius: 8px; color: white;">
            <h3 style="margin: 0 0 15px 0; font-size: 16px;">Tong ket tat ca nguon thu nhap (Luat moi)</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
              <div>
                <div style="font-size: 12px; color: #9ca3af;">Luong GROSS</div>
                <div style="font-size: 14px; font-weight: 600;">${formatVND(newResult.grossIncome)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #9ca3af;">Thu nhap khac</div>
                <div style="font-size: 14px; font-weight: 600;">${formatVND(otherIncomeTax.totalIncome)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #9ca3af;">Tong thue</div>
                <div style="font-size: 14px; font-weight: 600; color: #f87171;">${formatVND(totalNewTax)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #9ca3af;">Tong thuc nhan</div>
                <div style="font-size: 14px; font-weight: 600; color: #4ade80;">${formatVND(newResult.netIncome + otherIncomeTax.totalNet)}</div>
              </div>
            </div>
          </div>
        `;
      }

      // Declared salary notice
      const hasDeclaredSalary = declaredSalary !== undefined && declaredSalary !== oldResult.grossIncome;
      const declaredSalaryNotice = hasDeclaredSalary ? `
        <div style="margin-bottom: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            <strong>Luu y:</strong> Bao hiem tinh tren luong khai bao <strong>${formatVND(declaredSalary)}</strong>,
            nhung thue TNCN van tinh tren luong thuc te <strong>${formatVND(oldResult.grossIncome)}</strong>
          </p>
        </div>
      ` : '';

      container.innerHTML = `
        <div style="max-width: 754px; margin: 0 auto;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6;">
            <h1 style="margin: 0; font-size: 24px; color: #1e40af;">BAO CAO TINH THUE TNCN</h1>
            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Ngay tao: ${dateStr}</p>
          </div>

          ${declaredSalaryNotice}

          <!-- Savings Summary -->
          ${savings > 0 ? `
            <div style="background: linear-gradient(135deg, #22c55e, #10b981); padding: 20px; border-radius: 12px; color: white; margin-bottom: 25px;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px;">Ban tiet kiem duoc</h2>
              <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${formatVND(savings)}/thang</div>
              <div style="font-size: 14px; opacity: 0.9;">Tuong duong ${formatVND(savings * 12)}/nam (giam ${savingsPercent}%)</div>
            </div>
          ` : ''}

          <!-- Input Summary -->
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #334155; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Thong tin dau vao</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <div style="font-size: 12px; color: #64748b;">Thu nhap GROSS</div>
                <div style="font-size: 16px; font-weight: 600;">${formatVND(newResult.grossIncome)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Nguoi phu thuoc</div>
                <div style="font-size: 16px; font-weight: 600;">${Math.round(newResult.dependentDeduction / 6200000)} nguoi</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Giam tru ban than</div>
                <div style="font-size: 16px; font-weight: 600;">${formatVND(newResult.personalDeduction)}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #64748b;">Giam tru nguoi phu thuoc</div>
                <div style="font-size: 16px; font-weight: 600;">${formatVND(newResult.dependentDeduction)}</div>
              </div>
            </div>
            ${allowancesSection}
            ${insuranceSection}
          </div>

          <!-- Comparison -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <!-- Old Law -->
            <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444;"></div>
                <h3 style="margin: 0; font-size: 16px; color: #334155;">Luat hien hanh (7 bac)</h3>
              </div>
              <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                  <span style="color: #64748b;">Thu nhap tinh thue:</span>
                  <span style="font-weight: 500;">${formatVND(oldResult.taxableIncome)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                  <span style="color: #64748b;">Thue suat thuc te:</span>
                  <span style="font-weight: 500;">${oldResult.effectiveRate.toFixed(2)}%</span>
                </div>
              </div>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 12px; color: #64748b;">Thue TNCN phai nop</div>
                <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${formatVND(oldResult.taxAmount)}</div>
              </div>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center;">
                <div style="font-size: 12px; color: #64748b;">Thu nhap thuc nhan</div>
                <div style="font-size: 20px; font-weight: bold; color: #16a34a;">${formatVND(oldResult.netIncome)}</div>
              </div>
            </div>

            <!-- New Law -->
            <div style="border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; background: #eff6ff;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #3b82f6;"></div>
                <h3 style="margin: 0; font-size: 16px; color: #334155;">Luat moi 2026 (5 bac)</h3>
              </div>
              <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                  <span style="color: #64748b;">Thu nhap tinh thue:</span>
                  <span style="font-weight: 500;">${formatVND(newResult.taxableIncome)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                  <span style="color: #64748b;">Thue suat thuc te:</span>
                  <span style="font-weight: 500;">${newResult.effectiveRate.toFixed(2)}%</span>
                </div>
              </div>
              <div style="background: #dbeafe; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 12px; color: #64748b;">Thue TNCN phai nop</div>
                <div style="font-size: 24px; font-weight: bold; color: #1d4ed8;">${formatVND(newResult.taxAmount)}</div>
              </div>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #bfdbfe; text-align: center;">
                <div style="font-size: 12px; color: #64748b;">Thu nhap thuc nhan</div>
                <div style="font-size: 20px; font-weight: bold; color: #16a34a;">${formatVND(newResult.netIncome)}</div>
              </div>
            </div>
          </div>

          <!-- Tax Breakdown Tables -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <!-- Old Law Breakdown -->
            <div>
              <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #334155;">Chi tiet thue (Luat cu)</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #fee2e2;">
                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Bac</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Thue suat</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Thu nhap</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Thue</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildTaxBreakdownRows(oldResult)}
                  <tr style="background: #fef2f2; font-weight: 600;">
                    <td colspan="3" style="padding: 8px; border: 1px solid #e2e8f0;">Tong thue</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${formatVND(oldResult.taxAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- New Law Breakdown -->
            <div>
              <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #334155;">Chi tiet thue (Luat moi)</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #dbeafe;">
                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Bac</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Thue suat</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Thu nhap</th>
                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Thue</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildTaxBreakdownRows(newResult)}
                  <tr style="background: #dbeafe; font-weight: 600;">
                    <td colspan="3" style="padding: 8px; border: 1px solid #e2e8f0;">Tong thue</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${formatVND(newResult.taxAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          ${otherIncomeSection}

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0 0 5px 0;">Bao cao duoc tao tu <strong>Tinh Thue TNCN 2026</strong> - thue.1devops.io</p>
            <p style="margin: 0;">Day la cong cu tham khao. Vui long tu van chuyen gia thue cho cac quyet dinh tai chinh quan trong.</p>
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
      setError('Khong the tao PDF. Vui long thu lai.');
    } finally {
      setIsGenerating(false);
    }
  }, [oldResult, newResult, otherIncomeTax, declaredSalary]);

  return (
    <div className="inline-flex flex-col items-end">
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className={`
          flex items-center gap-2 px-4 py-2.5 min-h-[44px]
          rounded-lg font-medium transition-all duration-200
          ${isGenerating
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg'
          }
        `}
        aria-label={isGenerating ? 'Dang tao PDF...' : 'Xuat bao cao PDF'}
      >
        {isGenerating ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Dang tao...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Xuat PDF</span>
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
