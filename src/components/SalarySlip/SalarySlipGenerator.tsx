'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { SharedTaxState } from '@/lib/taxCalculator';
import SalarySlipForm from './SalarySlipForm';
import SalarySlipPDF, { generatePDFHTML } from './SalarySlipPDF';
import {
  SalarySlipData,
  SalarySlipSummary,
  DEFAULT_SALARY_SLIP_DATA,
  VIETNAMESE_MONTHS,
} from './types';

interface SalarySlipGeneratorProps {
  sharedState: SharedTaxState;
  onStateChange: (updates: Partial<SharedTaxState>) => void;
  insuranceDetail?: {
    bhxh: number;
    bhyt: number;
    bhtn: number;
  };
  taxAmount?: number;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export default function SalarySlipGenerator({
  sharedState,
  insuranceDetail,
  taxAmount,
}: SalarySlipGeneratorProps) {
  const [data, setData] = useState<SalarySlipData>(() => ({
    ...DEFAULT_SALARY_SLIP_DATA,
    earnings: {
      ...DEFAULT_SALARY_SLIP_DATA.earnings,
      basicSalary: sharedState.grossIncome,
    },
    deductions: {
      ...DEFAULT_SALARY_SLIP_DATA.deductions,
      bhxh: insuranceDetail?.bhxh || 0,
      bhyt: insuranceDetail?.bhyt || 0,
      bhtn: insuranceDetail?.bhtn || 0,
      personalIncomeTax: taxAmount || 0,
    },
  }));

  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Calculate summary
  const summary = useMemo<SalarySlipSummary>(() => {
    const { earnings, deductions } = data;

    const totalAllowances = earnings.allowances.reduce((sum, a) => sum + a.amount, 0);
    const grossIncome =
      earnings.basicSalary +
      totalAllowances +
      earnings.overtime +
      earnings.bonus +
      earnings.otherEarnings;

    const totalDeductions =
      deductions.bhxh +
      deductions.bhyt +
      deductions.bhtn +
      deductions.personalIncomeTax +
      deductions.otherDeductions;

    const netPay = grossIncome - totalDeductions;

    return {
      grossIncome,
      totalDeductions,
      netPay,
    };
  }, [data]);

  // Handle data change from form
  const handleDataChange = useCallback((newData: SalarySlipData) => {
    setData(newData);
  }, []);

  // Handle generating state
  const handleGenerating = useCallback((generating: boolean) => {
    setIsGenerating(generating);
  }, []);

  // Validation check
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!data.company.name.trim()) {
      errors.push('Vui lòng nhập tên công ty');
    }
    if (!data.company.address.trim()) {
      errors.push('Vui lòng nhập địa chỉ công ty');
    }
    if (!data.employee.name.trim()) {
      errors.push('Vui lòng nhập họ tên nhân viên');
    }
    if (data.earnings.basicSalary <= 0) {
      errors.push('Vui lòng nhập lương cơ bản');
    }
    return errors;
  }, [data]);

  const isValid = validationErrors.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl">📋</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tạo Phiếu Lương</h2>
            <p className="text-sm text-gray-500">
              Tạo phiếu lương chuyên nghiệp để tải xuống PDF
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-500">💡</span>
            <div className="text-sm text-blue-800">
              <p className="mb-1">
                Thông tin lương và các khoản khấu trừ sẽ được tự động điền từ công cụ tính thuế.
              </p>
              <p>
                Bạn có thể chỉnh sửa tất cả các trường trước khi tạo phiếu lương PDF.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <SalarySlipForm
        data={data}
        onChange={handleDataChange}
        grossIncome={sharedState.grossIncome}
        insuranceDeductions={insuranceDetail}
        taxAmount={taxAmount}
      />

      {/* Summary Card */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">📊</span>
          Tóm tắt
        </h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="text-sm text-green-600 mb-1">Tổng thu nhập</div>
            <div className="text-xl font-bold text-green-700 font-mono tabular-nums">
              {formatMoney(summary.grossIncome)} đ
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-xl">
            <div className="text-sm text-red-600 mb-1">Tổng khấu trừ</div>
            <div className="text-xl font-bold text-red-700 font-mono tabular-nums">
              {formatMoney(summary.totalDeductions)} đ
            </div>
          </div>
          <div className="p-4 bg-primary-50 rounded-xl">
            <div className="text-sm text-primary-600 mb-1">Thực lĩnh</div>
            <div className="text-2xl font-bold text-primary-700 font-mono tabular-nums">
              {formatMoney(summary.netPay)} đ
            </div>
          </div>
        </div>

        {/* Deductions Breakdown */}
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Chi tiết khấu trừ:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div>
              <span className="text-gray-500">BHXH (8%):</span>
              <span className="ml-2 font-medium">{formatMoney(data.deductions.bhxh)} đ</span>
            </div>
            <div>
              <span className="text-gray-500">BHYT (1.5%):</span>
              <span className="ml-2 font-medium">{formatMoney(data.deductions.bhyt)} đ</span>
            </div>
            <div>
              <span className="text-gray-500">BHTN (1%):</span>
              <span className="ml-2 font-medium">{formatMoney(data.deductions.bhtn)} đ</span>
            </div>
            <div>
              <span className="text-gray-500">Thuế TNCN:</span>
              <span className="ml-2 font-medium">{formatMoney(data.deductions.personalIncomeTax)} đ</span>
            </div>
            <div>
              <span className="text-gray-500">Khác:</span>
              <span className="ml-2 font-medium">{formatMoney(data.deductions.otherDeductions)} đ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Vui lòng hoàn thành các trường bắt buộc:
          </h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview and Download Section */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-lg">📄</span>
            Xuất phiếu lương
          </h3>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {showPreview ? 'Ẩn xem trước' : 'Xem trước'}
            </button>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div
            ref={previewRef}
            className="mb-6 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-inner"
          >
            <div className="p-2 bg-gray-100 border-b border-gray-200 text-xs text-gray-500 text-center">
              Xem trước phiếu lương - {VIETNAMESE_MONTHS[data.payPeriod.month - 1]} {data.payPeriod.year}
            </div>
            <div
              className="p-4 overflow-auto max-h-[600px]"
              style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}
              dangerouslySetInnerHTML={{ __html: generatePDFHTML(data, summary) }}
            />
          </div>
        )}

        {/* Download Button */}
        <div className="flex flex-col items-center">
          {isValid ? (
            <SalarySlipPDF
              data={data}
              summary={summary}
              onGenerating={handleGenerating}
            />
          ) : (
            <button
              disabled
              className="flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-xl font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Tải phiếu lương PDF</span>
            </button>
          )}

          <p className="mt-4 text-xs text-gray-500 text-center max-w-md">
            Phiếu lương này được tạo tự động, vui lòng kiểm tra lại trước khi sử dụng.
          </p>
        </div>
      </div>

      {/* Print Styles Info */}
      <div className="card border-dashed border-2 border-gray-200 bg-gray-50">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🖨️</span>
          <div>
            <h4 className="font-medium text-gray-900 mb-1">In trực tiếp</h4>
            <p className="text-sm text-gray-600">
              Sau khi tải PDF, bạn có thể mở file và chọn In (Ctrl+P) để in trực tiếp.
              Định dạng A4 dọc đã được tối ưu cho in ấn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
