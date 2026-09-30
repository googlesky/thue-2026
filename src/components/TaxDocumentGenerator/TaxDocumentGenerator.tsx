'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  generateTaxDocument,
  getDocumentTypes,
  formatValue,
  DocumentType,
  DocumentInput,
  DocumentOutput,
  PersonalInfo,
} from '@/lib/taxDocumentGenerator';
import {
  formatNumber,
  parseCurrency,
  TaxResult,
  SharedTaxState,
  calculateNewTax,
  calculateOldTax,
} from '@/lib/taxCalculator';
import { EDUCATION_DEDUCTION_CAP, MEDICAL_DEDUCTION_CAP } from '@/lib/annualSettlementCalculator';
import { parseCurrencyInput } from '@/utils/inputSanitizers';
import Tooltip from '@/components/ui/Tooltip';
import { exportToPDF, exportToCSV } from '@/lib/exportUtils';

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
  const [quarter, setQuarter] = useState<number>(() => Math.floor(new Date().getMonth() / 3) + 1);

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
  // Giảm trừ y tế, giáo dục cả năm (tờ khai quyết toán từ năm 2026)
  const [medicalInput, setMedicalInput] = useState<string>('0');
  const [educationInput, setEducationInput] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  // Generated document
  const [generatedDoc, setGeneratedDoc] = useState<DocumentOutput | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Available document types
  const documentTypes = useMemo(() => getDocumentTypes(), []);

  // Kết quả thuế 1 tháng theo luật của năm tính thuế: từ 2026 dùng kết quả tab tính thuế (luật mới);
  // năm trước dùng biểu 7 bậc, giảm trừ 11 triệu/4,4 triệu với trần bảo hiểm tại 31/12 năm đó
  const monthResult = useMemo<TaxResult>(() => {
    if (year >= 2026 && taxResult) return taxResult;
    const input = {
      grossIncome: sharedState?.grossIncome ?? 0,
      declaredSalary: sharedState?.declaredSalary,
      dependents: sharedState?.dependents ?? 0,
      otherDeductions: sharedState?.otherDeductions ?? 0,
      pensionContribution: sharedState?.pensionContribution ?? 0,
      hasInsurance: sharedState?.hasInsurance ?? true,
      insuranceOptions: sharedState?.insuranceOptions,
      region: sharedState?.region,
      allowances: sharedState?.allowances,
    };
    return year >= 2026
      ? calculateNewTax(input)
      : calculateOldTax({ ...input, calculationDate: new Date(year, 11, 31) });
  }, [year, sharedState, taxResult]);

  // Build document input: số liệu 1 tháng, thư viện quy đổi theo kỳ (quý × 3, năm × 12)
  const buildDocumentInput = useCallback((): DocumentInput => ({
    type: documentType,
    period: {
      year,
      quarter: documentType === 'quarterly_declaration' ? quarter : undefined,
    },
    personalInfo,
    monthlyResult: monthResult,
    numberOfDependents: sharedState?.dependents ?? 0,
    taxPaid: parseCurrency(taxPaidInput),
    medicalExpenses: parseCurrency(medicalInput),
    educationExpenses: parseCurrency(educationInput),
    notes: notes || undefined,
  }), [sharedState, monthResult, documentType, year, quarter, personalInfo, taxPaidInput, medicalInput, educationInput, notes]);

  const fileBase = `bao-cao-thue-${year}${documentType === 'quarterly_declaration' ? `-quy-${quarter}` : ''}`;

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
        filename: `${fileBase}.pdf`,
        title: generatedDoc?.title || 'Báo cáo thuế TNCN',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Không thể xuất PDF. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  }, [fileBase, generatedDoc]);

  // Export to CSV/Excel: đúng các dòng của tài liệu đang xem (cùng kỳ, cùng số liệu)
  const handleExportExcel = useCallback(() => {
    if (!generatedDoc) return;
    const rows = [
      { 'Mục': generatedDoc.title, 'Giá trị': '' },
      ...generatedDoc.content.flatMap((section) => [
        { 'Mục': '', 'Giá trị': '' },
        { 'Mục': section.title, 'Giá trị': '' },
        ...section.rows.map((row) => ({ 'Mục': row.label, 'Giá trị': formatValue(row.value, row.format) })),
      ]),
      { 'Mục': '', 'Giá trị': '' },
      { 'Mục': 'Ghi chú', 'Giá trị': generatedDoc.legalNote },
    ];
    exportToCSV(['Mục', 'Giá trị'], rows, `${fileBase}.csv`);
  }, [generatedDoc, fileBase]);

  // Handle personal info change
  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tạo báo cáo thuế TNCN</h2>
          <p className="text-sm text-gray-500">Xuất báo cáo và tờ khai thuế để in hoặc lưu</p>
        </div>
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Quarter (for quarterly declaration) */}
            {documentType === 'quarterly_declaration' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Quý</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(parseInt(e.target.value))}
                  className="input-field"
                >
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>Quý {q}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Giảm trừ y tế, giáo dục (tự quyết toán từ năm 2026) */}
            {documentType === 'annual_settlement' && year >= 2026 && (
              <>
                {[
                  { label: 'Chi khám chữa bệnh cả năm', cap: MEDICAL_DEDUCTION_CAP, value: medicalInput, set: setMedicalInput },
                  { label: 'Học phí, đào tạo cả năm', cap: EDUCATION_DEDUCTION_CAP, value: educationInput, set: setEducationInput },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      {field.label} (VNĐ, tối đa {formatNumber(field.cap / 1_000_000)} triệu)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={field.value === '' ? '' : formatNumber(parseCurrency(field.value))}
                      onChange={(e) => {
                        // Cho phép xóa trắng để gõ số mới (không khóa ở "0")
                        if (!/\d/.test(e.target.value)) return field.set('');
                        const parsed = parseCurrencyInput(e.target.value, { max: field.cap });
                        field.set(parsed.value.toString());
                      }}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-500">
                  Giảm trừ y tế, giáo dục chỉ áp dụng khi tự quyết toán (NĐ 253/2026/NĐ-CP Điều 49, 51.3).
                </p>
              </>
            )}

            {/* Tax Paid */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>
                  Thuế đã khấu trừ/tạm nộp {documentType === 'quarterly_declaration' ? 'trong quý' : 'cả năm'} (VNĐ)
                </span>
                <Tooltip content="Tổng số thuế đã được khấu trừ tại nguồn hoặc đã tạm nộp trong cả kỳ của tài liệu">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={taxPaidInput === '' ? '' : formatNumber(parseCurrency(taxPaidInput))}
                onChange={(e) => {
                  if (!/\d/.test(e.target.value)) return setTaxPaidInput('');
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
            <li>• Dữ liệu thu nhập và thuế được lấy từ các thông tin bạn đã nhập ở các tab tính thuế; số liệu quý, năm ước tính bằng thu nhập 1 tháng × 3 hoặc × 12.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default TaxDocumentGenerator;
