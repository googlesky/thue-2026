'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  SharedTaxState,
  AllowancesState,
  DEFAULT_ALLOWANCES,
  TaxResultWithConfig,
  calculateTaxForDate,
  getTaxConfigForDate,
  getMaxSocialInsuranceSalary,
  formatNumber,
} from '@/lib/taxCalculator';
import SalarySlipForm from './SalarySlipForm';
import SalarySlipPDF, { generatePDFHTML } from './SalarySlipPDF';
import {
  SalarySlipData,
  SalarySlipSummary,
  EarningsItem,
  DEFAULT_SALARY_SLIP_DATA,
  ALLOWANCE_PRESETS,
  STORAGE_KEYS,
  VIETNAMESE_MONTHS,
} from './types';

interface SalarySlipGeneratorProps {
  sharedState: SharedTaxState;
  onStateChange: (updates: Partial<SharedTaxState>) => void;
  // Không dùng: phiếu tự tính BH/thuế theo kỳ lương (giữ để page truyền props cũ không lỗi)
  insuranceDetail?: {
    bhxh: number;
    bhyt: number;
    bhtn: number;
  };
  taxAmount?: number;
}

// Phụ cấp trên phiếu → khóa AllowancesState của engine; id khác (phụ cấp khác, tự đặt tên) tính là chịu thuế
const ENGINE_ALLOWANCE_KEYS = new Map<string, keyof AllowancesState>([
  ['meal', 'meal'],
  ['phone', 'phone'],
  ['transport', 'transport'],
  ['hazardous', 'hazardous'],
  ['clothing', 'clothing'],
  ['housing', 'housing'],
  ['position', 'position'],
  ['responsibility', 'position'],
]);

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

// Đọc thông tin công ty/nhân viên đã lưu (chỉ nhận trường chuỗi)
function readSaved(key: string): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === 'string')
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

// Phụ cấp nhập ở tab Tính thuế → dòng phụ cấp trên phiếu
function allowancesFromCalculator(allowances?: AllowancesState): EarningsItem[] {
  if (!allowances) return [];
  return ALLOWANCE_PRESETS.flatMap((preset) => {
    const amount = allowances[preset.id as keyof AllowancesState];
    return typeof amount === 'number' && amount > 0 ? [{ ...preset, amount }] : [];
  });
}

export function createInitialSlipData(sharedState: SharedTaxState): SalarySlipData {
  return {
    ...DEFAULT_SALARY_SLIP_DATA,
    company: { ...DEFAULT_SALARY_SLIP_DATA.company, ...readSaved(STORAGE_KEYS.COMPANY_INFO) },
    employee: { ...DEFAULT_SALARY_SLIP_DATA.employee, ...readSaved(STORAGE_KEYS.EMPLOYEE_INFO) },
    earnings: {
      ...DEFAULT_SALARY_SLIP_DATA.earnings,
      basicSalary: sharedState.grossIncome,
      allowances: allowancesFromCalculator(sharedState.allowances),
    },
  };
}

// BH + thuế TNCN của phiếu theo kỳ lương: biểu thuế, giảm trừ, trần BH, mức miễn ăn ca lấy theo ngày 01 của kỳ.
// Người phụ thuộc, vùng, lương đóng BH, giảm trừ khác lấy từ tab Tính thuế.
export function computeSlipTax(data: SalarySlipData, sharedState: SharedTaxState): TaxResultWithConfig {
  const calculationDate = new Date(data.payPeriod.year, data.payPeriod.month - 1, 1);
  const { basicSalary, allowances, overtime, bonus, otherEarnings } = data.earnings;

  const engineAllowances: AllowancesState = { ...DEFAULT_ALLOWANCES };
  for (const a of allowances) {
    engineAllowances[ENGINE_ALLOWANCE_KEYS.get(a.id) ?? 'position'] += a.amount;
  }

  // Từ kỳ 2026 tiền lương làm thêm giờ đúng luật được miễn toàn bộ (Luật 109/2025/QH15 Điều 4).
  // Luật cũ chỉ miễn phần trả cao hơn giờ thường, phiếu không tách được → cộng cả vào thu nhập chịu thuế.
  const taxableOvertime = getTaxConfigForDate(calculationDate).isNew2026 ? 0 : overtime;

  return calculateTaxForDate({
    grossIncome: basicSalary + bonus + otherEarnings + taxableOvertime,
    // Thưởng, tăng ca không thuộc tiền lương đóng BH
    declaredSalary: sharedState.declaredSalary ?? basicSalary,
    dependents: sharedState.dependents,
    otherDeductions: sharedState.otherDeductions,
    pensionContribution: sharedState.pensionContribution,
    hasInsurance: sharedState.hasInsurance,
    insuranceOptions: sharedState.insuranceOptions,
    region: sharedState.region,
    allowances: engineAllowances,
    calculationDate,
  });
}

function slipNotes(data: SalarySlipData, calc: TaxResultWithConfig): string[] {
  const { month, year } = data.payPeriod;
  const isNewLaw = calc.taxConfig.isNew2026;
  const cap = getMaxSocialInsuranceSalary(new Date(year, month - 1, 1));
  const notes = [
    `Kỳ ${month}/${year}: biểu ${isNewLaw ? '5' : '7'} bậc, giảm trừ bản thân ${formatNumber(calc.personalDeduction)}đ, trần đóng BHXH/BHYT ${formatNumber(cap)}đ. Người phụ thuộc, vùng, lương đóng BH, giảm trừ khác lấy theo tab Tính thuế.`,
  ];
  if (isNewLaw && year === 2026 && month <= 6) {
    notes.push('Kỳ 01–06/2026: số đã khấu trừ theo quy định cũ không phải khai lại, chênh lệch được điều chỉnh khi quyết toán năm 2026 (NĐ 253/2026/NĐ-CP Điều 70).');
  }
  if (data.earnings.overtime > 0) {
    notes.push(
      isNewLaw
        ? 'Tiền lương làm thêm giờ đúng quy định được miễn thuế toàn bộ (Luật 109/2025/QH15).'
        : 'Luật cũ chỉ miễn phần tiền làm thêm giờ trả cao hơn giờ thường: phiếu đang cộng cả khoản tăng ca vào thu nhập chịu thuế, bỏ chọn tự tính để sửa tay.'
    );
  }
  return notes;
}

export default function SalarySlipGenerator({ sharedState }: SalarySlipGeneratorProps) {
  const [data, setData] = useState<SalarySlipData>(() => createInitialSlipData(sharedState));
  // true: BH + thuế TNCN tự tính theo kỳ lương; false: người dùng tự nhập
  const [autoDeductions, setAutoDeductions] = useState(true);

  // Tab khác/snapshot đổi lương hoặc phụ cấp → cập nhật lại phiếu (điều chỉnh state khi props đổi)
  const [syncedFrom, setSyncedFrom] = useState(sharedState);
  if (syncedFrom.grossIncome !== sharedState.grossIncome || syncedFrom.allowances !== sharedState.allowances) {
    setSyncedFrom(sharedState);
    setData((prev) => ({
      ...prev,
      earnings: {
        ...prev.earnings,
        basicSalary: sharedState.grossIncome,
        allowances: allowancesFromCalculator(sharedState.allowances),
      },
    }));
  }

  const [showPreview, setShowPreview] = useState(false);

  const calc = useMemo(() => computeSlipTax(data, sharedState), [data, sharedState]);

  // Dữ liệu dùng cho form, tóm tắt, xem trước và PDF
  const slip = useMemo<SalarySlipData>(
    () =>
      autoDeductions
        ? {
            ...data,
            deductions: {
              ...data.deductions,
              bhxh: Math.round(calc.insuranceDetail.bhxh),
              bhyt: Math.round(calc.insuranceDetail.bhyt),
              bhtn: Math.round(calc.insuranceDetail.bhtn),
              personalIncomeTax: Math.round(calc.taxAmount),
            },
          }
        : data,
    [autoDeductions, calc, data]
  );

  const notes = useMemo(() => slipNotes(data, calc), [data, calc]);

  // Calculate summary
  const summary = useMemo<SalarySlipSummary>(() => {
    const { earnings, deductions } = slip;

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

    return {
      grossIncome,
      totalDeductions,
      netPay: grossIncome - totalDeductions,
    };
  }, [slip]);

  // Handle data change from form
  const handleDataChange = useCallback((newData: SalarySlipData) => {
    setData(newData);
  }, []);

  // Chuyển sang tự nhập: bắt đầu từ số đang tự tính
  const handleAutoDeductionsChange = useCallback(
    (auto: boolean) => {
      if (!auto) setData(slip);
      setAutoDeductions(auto);
    },
    [slip]
  );

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
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tạo Phiếu Lương</h2>
            <p className="text-sm text-gray-500">
              Tạo phiếu lương chuyên nghiệp để tải xuống PDF
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
          <p className="mb-1">
            Lương, phụ cấp lấy từ tab Tính thuế; BH và thuế TNCN tự tính theo kỳ lương và các khoản trên phiếu.
          </p>
          <p>
            Bạn có thể chỉnh sửa tất cả các trường trước khi tạo phiếu lương PDF.
          </p>
        </div>
      </div>

      {/* Form Section */}
      <SalarySlipForm
        data={slip}
        onChange={handleDataChange}
        autoDeductions={autoDeductions}
        onAutoDeductionsChange={handleAutoDeductionsChange}
        deductionNotes={autoDeductions ? notes : []}
      />

      {/* Summary Card */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Tóm tắt</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <span className="ml-2 font-medium">{formatMoney(slip.deductions.bhxh)} đ</span>
            </div>
            <div>
              <span className="text-gray-500">BHYT (1,5%):</span>
              <span className="ml-2 font-medium">{formatMoney(slip.deductions.bhyt)} đ</span>
            </div>
            <div>
              <span className="text-gray-500">BHTN (1%):</span>
              <span className="ml-2 font-medium">{formatMoney(slip.deductions.bhtn)} đ</span>
            </div>
            <div>
              <span className="text-gray-500">Thuế TNCN:</span>
              <span className="ml-2 font-medium">{formatMoney(slip.deductions.personalIncomeTax)} đ</span>
            </div>
            <div>
              <span className="text-gray-500">Khác:</span>
              <span className="ml-2 font-medium">{formatMoney(slip.deductions.otherDeductions)} đ</span>
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
          <h3 className="font-semibold text-gray-900">Xuất phiếu lương</h3>

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

        {/* Preview (HTML đã escape, CSS gói trong .slip-root) */}
        {showPreview && (
          <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-inner">
            <div className="p-2 bg-gray-100 border-b border-gray-200 text-xs text-gray-500 text-center">
              Xem trước phiếu lương - {VIETNAMESE_MONTHS[data.payPeriod.month - 1]} {data.payPeriod.year}
            </div>
            <div
              className="p-4 overflow-auto max-h-[600px]"
              dangerouslySetInnerHTML={{ __html: generatePDFHTML(slip, summary) }}
            />
          </div>
        )}

        {/* Download Button */}
        <div className="flex flex-col items-center">
          {isValid ? (
            <SalarySlipPDF data={slip} summary={summary} />
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
        <h4 className="font-medium text-gray-900 mb-1">In trực tiếp</h4>
        <p className="text-sm text-gray-600">
          Sau khi tải PDF, bạn có thể mở file và chọn In (Ctrl+P) để in trực tiếp.
          Định dạng A4 dọc đã được tối ưu cho in ấn.
        </p>
      </div>
    </div>
  );
}
