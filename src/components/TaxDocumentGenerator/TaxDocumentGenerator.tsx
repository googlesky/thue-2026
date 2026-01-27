'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  generateTaxDocument,
  getDocumentTypes,
  getDeductionAmounts,
  formatValue,
  DocumentType,
  DocumentInput,
  DocumentOutput,
  PersonalInfo,
} from '@/lib/taxDocumentGenerator';
import { formatNumber, parseCurrency, TaxResult, SharedTaxState } from '@/lib/taxCalculator';
import { parseCurrencyInput } from '@/utils/inputSanitizers';
import Tooltip from '@/components/ui/Tooltip';
import { exportToPDF, exportToCSV, formatTaxDataForExport, TaxExportData } from '@/lib/exportUtils';

interface TaxDocumentGeneratorProps {
  sharedState?: SharedTaxState;
  taxResult?: TaxResult;
}

// Info icon component for tooltips
function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function TaxDocumentGenerator({ sharedState, taxResult }: TaxDocumentGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Document type selection
  const [documentType, setDocumentType] = useState<DocumentType>('personal_report');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(undefined);

  // Personal info
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: '',
    taxCode: '',
    idNumber: '',
    address: '',
    phone: '',
    email: '',
    employer: '',
    employerTaxCode: '',
  });

  // Tax paid override
  const [taxPaidInput, setTaxPaidInput] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  // Generated document
  const [generatedDoc, setGeneratedDoc] = useState<DocumentOutput | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Available document types
  const documentTypes = useMemo(() => getDocumentTypes(), []);

  // Calculate deductions
  const deductions = useMemo(() => {
    const isSecondHalf2026 = year === 2026 && (month === undefined || month >= 7);
    return getDeductionAmounts(year, isSecondHalf2026);
  }, [year, month]);

  // Build document input from shared state and tax result
  const buildDocumentInput = useCallback((): DocumentInput => {
    const grossIncome = sharedState?.grossIncome || 0;
    const dependents = sharedState?.dependents || 0;
    const insuranceDetail = taxResult?.insuranceDetail;

    const totalInsurance = insuranceDetail
      ? insuranceDetail.bhxh + insuranceDetail.bhyt + insuranceDetail.bhtn
      : 0;

    const taxableIncome = taxResult?.taxableIncome || 0;
    const taxAmount = taxResult?.taxAmount || 0;
    const taxPaid = parseCurrency(taxPaidInput);

    return {
      type: documentType,
      period: {
        year,
        month: documentType === 'monthly_declaration' ? month : undefined,
      },
      personalInfo,
      incomeInfo: {
        grossIncome,
        allowances: sharedState?.allowances
          ? Object.values(sharedState.allowances).reduce((a, b) => a + b, 0)
          : 0,
        socialInsurance: insuranceDetail?.bhxh || 0,
        healthInsurance: insuranceDetail?.bhyt || 0,
        unemploymentInsurance: insuranceDetail?.bhtn || 0,
        pensionContribution: sharedState?.pensionContribution || 0,
        charitableContributions: 0,
      },
      deductionInfo: {
        personalDeduction: deductions.personalDeduction,
        dependentDeduction: dependents * deductions.dependentDeduction,
        numberOfDependents: dependents,
        otherDeductions: sharedState?.otherDeductions || 0,
      },
      taxInfo: {
        taxableIncome,
        taxAmount,
        taxPaid,
        taxOwed: taxAmount - taxPaid,
        effectiveRate: grossIncome > 0 ? (taxAmount / grossIncome) * 100 : 0,
      },
      notes: notes || undefined,
    };
  }, [sharedState, taxResult, documentType, year, month, personalInfo, taxPaidInput, notes, deductions]);

  // Generate document
  const handleGenerate = useCallback(() => {
    const input = buildDocumentInput();
    const doc = generateTaxDocument(input);
    setGeneratedDoc(doc);
    setShowPreview(true);
  }, [buildDocumentInput]);

  // Print document
  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${generatedDoc?.title || 'Báo cáo thuế TNCN'}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Times New Roman', serif;
              font-size: 13pt;
              line-height: 1.5;
              padding: 20mm;
              max-width: 210mm;
              margin: 0 auto;
            }
            h1 { font-size: 16pt; text-align: center; margin-bottom: 20px; font-weight: bold; }
            h2 { font-size: 14pt; margin: 20px 0 10px; font-weight: bold; }
            .meta { text-align: right; font-size: 11pt; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f5f5f5; font-weight: bold; }
            .currency { text-align: right; font-family: 'Courier New', monospace; }
            .highlight { background: #fffde7; font-weight: bold; }
            .indent-1 { padding-left: 30px; }
            .legal-note { margin-top: 30px; padding: 15px; background: #f5f5f5; font-size: 11pt; font-style: italic; }
            .signature { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; width: 45%; }
            .signature-line { margin-top: 60px; border-top: 1px solid #000; padding-top: 5px; }
            @media print {
              body { padding: 15mm; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [generatedDoc]);

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    if (!printRef.current) return;

    setIsExporting(true);
    try {
      await exportToPDF(printRef.current, {
        filename: `bao-cao-thue-${year}${month ? `-thang-${month}` : ''}.pdf`,
        title: generatedDoc?.title || 'Báo cáo thuế TNCN',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Không thể xuất PDF. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  }, [year, month, generatedDoc]);

  // Export to CSV/Excel
  const handleExportExcel = useCallback(() => {
    const grossIncome = sharedState?.grossIncome || 0;
    const insuranceDetail = taxResult?.insuranceDetail;
    const totalInsurance = insuranceDetail
      ? insuranceDetail.bhxh + insuranceDetail.bhyt + insuranceDetail.bhtn
      : 0;

    const exportData: TaxExportData = {
      personalInfo: {
        fullName: personalInfo.fullName || undefined,
        taxCode: personalInfo.taxCode || undefined,
        idNumber: personalInfo.idNumber || undefined,
        employer: personalInfo.employer || undefined,
      },
      period: {
        year,
        month: documentType === 'monthly_declaration' ? month : undefined,
      },
      income: {
        grossIncome,
        allowances: sharedState?.allowances
          ? Object.values(sharedState.allowances).reduce((a, b) => a + b, 0)
          : 0,
        totalInsurance,
      },
      deductions: {
        personalDeduction: deductions.personalDeduction,
        dependentDeduction: (sharedState?.dependents || 0) * deductions.dependentDeduction,
        numberOfDependents: sharedState?.dependents || 0,
        otherDeductions: sharedState?.otherDeductions || 0,
      },
      tax: {
        taxableIncome: taxResult?.taxableIncome || 0,
        taxAmount: taxResult?.taxAmount || 0,
        taxPaid: parseCurrency(taxPaidInput),
        netIncome: taxResult?.netIncome || 0,
        effectiveRate: grossIncome > 0 ? ((taxResult?.taxAmount || 0) / grossIncome) * 100 : 0,
      },
    };

    const sheet = formatTaxDataForExport(exportData);
    exportToCSV(sheet.headers, sheet.rows, `bao-cao-thue-${year}${month ? `-thang-${month}` : ''}.csv`);
  }, [sharedState, taxResult, personalInfo, year, month, documentType, deductions, taxPaidInput]);

  // Handle personal info change
  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl">📄</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tạo báo cáo thuế TNCN</h2>
          <p className="text-sm text-gray-500">Xuất báo cáo và tờ khai thuế để in hoặc lưu</p>
        </div>
      </div>

      {!showPreview ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Document Settings */}
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Loại tài liệu</h3>

            {/* Document Type */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Loại báo cáo</span>
                <Tooltip content="Chọn loại tài liệu cần tạo">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="input-field"
              >
                {documentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {documentTypes.find(t => t.id === documentType)?.description}
              </p>
            </div>

            {/* Year */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Năm tính thuế</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="input-field"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            {/* Month (for monthly declaration) */}
            {documentType === 'monthly_declaration' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tháng</label>
                <select
                  value={month || ''}
                  onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input-field"
                >
                  <option value="">Chọn tháng</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tax Paid */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Thuế đã tạm nộp/khấu trừ (VNĐ)</span>
                <Tooltip content="Số tiền thuế đã được khấu trừ tại nguồn hoặc đã tạm nộp">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumber(parseCurrency(taxPaidInput))}
                onChange={(e) => {
                  const parsed = parseCurrencyInput(e.target.value, { max: 100_000_000_000 });
                  setTaxPaidInput(parsed.value.toString());
                }}
                className="input-field"
                placeholder="0"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Ghi chú</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field min-h-[80px]"
                placeholder="Ghi chú thêm (nếu có)"
              />
            </div>
          </div>

          {/* Right Column: Personal Info */}
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Thông tin cá nhân</h3>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Họ và tên</label>
              <input
                type="text"
                value={personalInfo.fullName}
                onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                className="input-field"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Mã số thuế cá nhân</label>
              <input
                type="text"
                value={personalInfo.taxCode}
                onChange={(e) => handlePersonalInfoChange('taxCode', e.target.value)}
                className="input-field"
                placeholder="0123456789"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">CCCD/CMND</label>
              <input
                type="text"
                value={personalInfo.idNumber}
                onChange={(e) => handlePersonalInfoChange('idNumber', e.target.value)}
                className="input-field"
                placeholder="012345678901"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Địa chỉ</label>
              <input
                type="text"
                value={personalInfo.address}
                onChange={(e) => handlePersonalInfoChange('address', e.target.value)}
                className="input-field"
                placeholder="Số nhà, đường, quận/huyện, tỉnh/TP"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Đơn vị công tác</label>
              <input
                type="text"
                value={personalInfo.employer}
                onChange={(e) => handlePersonalInfoChange('employer', e.target.value)}
                className="input-field"
                placeholder="Tên công ty"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Document Preview */
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setShowPreview(false)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Export CSV/Excel */}
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                title="Xuất file CSV (mở được bằng Excel)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Excel</span>
              </button>

              {/* Export PDF */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Xuất file PDF"
              >
                {isExporting ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span className="hidden sm:inline">{isExporting ? 'Đang xuất...' : 'PDF'}</span>
              </button>

              {/* Print */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
                title="In báo cáo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="hidden sm:inline">In</span>
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div
            ref={printRef}
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
          >
            {generatedDoc && (
              <>
                {/* Header */}
                <h1 className="text-xl font-bold text-center mb-2">{generatedDoc.title}</h1>
                <div className="text-right text-sm text-gray-500 mb-6">
                  <p>Mã tài liệu: {generatedDoc.metadata.documentId}</p>
                  <p>Ngày tạo: {generatedDoc.metadata.generatedAt.toLocaleDateString('vi-VN')}</p>
                </div>

                {/* Sections */}
                {generatedDoc.content.map((section) => (
                  <div key={section.id} className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-3">
                      {section.title}
                    </h2>
                    <table className="w-full">
                      <tbody>
                        {section.rows.map((row, index) => (
                          <tr
                            key={index}
                            className={`border-b border-gray-100 ${row.highlight ? 'bg-yellow-50' : ''}`}
                          >
                            <td className={`py-2 text-gray-700 ${row.indent ? 'pl-6' : ''}`}>
                              {row.label}
                            </td>
                            <td className={`py-2 text-right font-medium ${
                              row.format === 'currency' ? 'font-mono' : ''
                            }`}>
                              {formatValue(row.value, row.format)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Legal Note */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 italic">{generatedDoc.legalNote}</p>
                </div>

                {/* Signature Section */}
                <div className="mt-8 flex justify-between">
                  <div className="text-center w-2/5">
                    <p className="text-sm text-gray-600">Ngày ... tháng ... năm ...</p>
                    <p className="font-semibold mt-1">Người nộp thuế</p>
                    <p className="text-xs text-gray-500">(Ký, ghi rõ họ tên)</p>
                    <div className="h-20"></div>
                  </div>
                  <div className="text-center w-2/5">
                    <p className="text-sm text-gray-600">Ngày ... tháng ... năm ...</p>
                    <p className="font-semibold mt-1">Xác nhận của cơ quan thuế</p>
                    <p className="text-xs text-gray-500">(Ký, đóng dấu)</p>
                    <div className="h-20"></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Generate Button */}
      {!showPreview && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Tạo báo cáo
          </button>
        </div>
      )}

      {/* Info Box */}
      {!showPreview && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lưu ý
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Báo cáo này chỉ mang tính chất tham khảo, không thay thế tờ khai thuế chính thức.</li>
            <li>• Để khai thuế chính thức, sử dụng phần mềm HTKK hoặc khai trực tuyến tại <strong>thuedientu.gdt.gov.vn</strong>.</li>
            <li>• Dữ liệu thu nhập và thuế được lấy từ các thông tin bạn đã nhập ở các tab tính thuế.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default TaxDocumentGenerator;
