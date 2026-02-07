'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculateVAT,
  compareVATMethods,
  checkVATRefundEligibility,
  checkVATRegistration,
  getVATRateOptions,
  isVATReductionPeriod,
  VAT_METHODS,
  VAT_CATEGORIES,
  DIRECT_VAT_RATES,
  VAT_REGISTRATION_THRESHOLD,
  VAT_REDUCTION_DATES,
  formatCurrency,
  formatPercent,
  VATMethod,
  BusinessCategory,
  VATOutput,
} from '@/lib/vatCalculator';
import { VATTabState, DEFAULT_VAT_STATE } from '@/lib/snapshotTypes';
import { formatNumber, parseCurrency } from '@/lib/taxCalculator';
import { parseCurrencyInput, CurrencyInputIssues } from '@/utils/inputSanitizers';
import Tooltip from '@/components/ui/Tooltip';

interface VATCalculatorProps {
  tabState?: VATTabState;
  onTabStateChange?: (state: VATTabState) => void;
}

// Info icon component for tooltips
function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function VATCalculator({ tabState, onTabStateChange }: VATCalculatorProps) {
  // Initialize state from tabState or defaults
  const [method, setMethod] = useState<VATMethod>(tabState?.method ?? DEFAULT_VAT_STATE.method);
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>(
    tabState?.businessCategory ?? DEFAULT_VAT_STATE.businessCategory
  );
  const [salesRevenueInput, setSalesRevenueInput] = useState<string>(
    tabState?.salesRevenue?.toString() ?? '0'
  );
  const [purchaseValueInput, setPurchaseValueInput] = useState<string>(
    tabState?.purchaseValue?.toString() ?? '0'
  );
  const [outputRate, setOutputRate] = useState<number>(
    tabState?.outputRate ?? DEFAULT_VAT_STATE.outputRate
  );
  const [inputRate, setInputRate] = useState<number>(
    tabState?.inputRate ?? DEFAULT_VAT_STATE.inputRate
  );
  const [useCurrentDate, setUseCurrentDate] = useState<boolean>(
    tabState?.useCurrentDate ?? DEFAULT_VAT_STATE.useCurrentDate
  );
  const [customDate, setCustomDate] = useState<string>(
    tabState?.customDate ?? DEFAULT_VAT_STATE.customDate
  );

  const [salesWarning, setSalesWarning] = useState<string | null>(null);
  const [purchaseWarning, setPurchaseWarning] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showRefundCheck, setShowRefundCheck] = useState(false);

  // Calculated values
  const calculationDate = useMemo(() => {
    return useCurrentDate ? new Date() : new Date(customDate);
  }, [useCurrentDate, customDate]);

  const isReducedPeriod = useMemo(() => {
    return isVATReductionPeriod(calculationDate);
  }, [calculationDate]);

  const rateOptions = useMemo(() => {
    return getVATRateOptions(calculationDate);
  }, [calculationDate]);

  // Parse values
  const salesRevenue = parseCurrency(salesRevenueInput);
  const purchaseValue = parseCurrency(purchaseValueInput);

  // Update parent state when local state changes
  const updateTabState = useCallback(() => {
    if (onTabStateChange) {
      onTabStateChange({
        method,
        businessCategory,
        salesRevenue,
        purchaseValue,
        outputRate,
        inputRate,
        useCurrentDate,
        customDate,
      });
    }
  }, [method, businessCategory, salesRevenue, purchaseValue, outputRate, inputRate, useCurrentDate, customDate, onTabStateChange]);

  // Calculate result when inputs change
  const result = useMemo((): VATOutput | null => {
    if (salesRevenue <= 0) return null;

    return calculateVAT({
      salesRevenue,
      purchaseValue,
      outputRate,
      inputRate,
      method,
      businessCategory,
      calculationDate,
    });
  }, [salesRevenue, purchaseValue, outputRate, inputRate, method, businessCategory, calculationDate]);

  // Compare methods
  const comparison = useMemo(() => {
    if (salesRevenue <= 0) return null;

    return compareVATMethods({
      salesRevenue,
      purchaseValue,
      outputRate,
      inputRate,
      businessCategory,
      calculationDate,
    });
  }, [salesRevenue, purchaseValue, outputRate, inputRate, businessCategory, calculationDate]);

  // Registration check
  const registrationCheck = useMemo(() => {
    return checkVATRegistration({
      annualRevenue: salesRevenue * 12,
      hasVATInvoices: purchaseValue > 0,
      currentMethod: method,
    });
  }, [salesRevenue, purchaseValue, method]);

  // Refund check
  const refundCheck = useMemo(() => {
    if (!result || result.vatRefundable <= 0) return null;

    return checkVATRefundEligibility({
      vatRefundable: result.vatRefundable,
      period: 'monthly',
      consecutiveMonths: 6,
      hasExportActivity: outputRate === 0,
      hasInvestmentProject: false,
      exportRevenue: outputRate === 0 ? salesRevenue : 0,
      totalRevenue: salesRevenue,
    });
  }, [result, salesRevenue, outputRate]);

  useEffect(() => {
    updateTabState();
  }, [updateTabState]);

  // Input handlers
  const handleSalesChange = (value: string) => {
    const MAX_VALUE = 1_000_000_000_000; // 1 nghìn tỷ
    const parsed = parseCurrencyInput(value, { max: MAX_VALUE });
    setSalesRevenueInput(parsed.value.toString());
    setSalesWarning(buildWarning(parsed.issues, MAX_VALUE));
  };

  const handlePurchaseChange = (value: string) => {
    const MAX_VALUE = 1_000_000_000_000;
    const parsed = parseCurrencyInput(value, { max: MAX_VALUE });
    setPurchaseValueInput(parsed.value.toString());
    setPurchaseWarning(buildWarning(parsed.issues, MAX_VALUE));
  };

  const buildWarning = (issues: CurrencyInputIssues, max?: number): string | null => {
    const messages: string[] = [];
    if (issues.negative) {
      messages.push('Không hỗ trợ số âm.');
    }
    if (issues.decimal) {
      messages.push('Không hỗ trợ số thập phân, đã bỏ phần lẻ.');
    }
    if (issues.overflow && max) {
      messages.push(`Giá trị quá lớn, giới hạn tối đa ${formatNumber(max)} VNĐ.`);
    }
    return messages.length ? messages.join(' ') : null;
  };

  // Business category labels
  const businessCategoryLabels: Record<BusinessCategory, string> = {
    distribution: 'Phân phối, cung cấp hàng hóa (1%)',
    services: 'Dịch vụ (5%)',
    production: 'Sản xuất, vận tải, xây dựng (3%)',
    otherActivities: 'Hoạt động khác (2%)',
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl">📋</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tính thuế GTGT (VAT)</h2>
          <p className="text-sm text-gray-500">
            Theo Luật Thuế GTGT 2008, Nghị định 209/2013/NĐ-CP
          </p>
        </div>
      </div>

      {/* VAT Reduction Notice */}
      {isReducedPeriod && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-2">
            <span className="text-lg">🎉</span>
            <div>
              <h4 className="font-semibold text-green-800">Đang áp dụng giảm VAT 2%</h4>
              <p className="text-sm text-green-700">
                Theo Luật 48/2024/QH15, thuế suất 10% được giảm còn 8% từ{' '}
                {VAT_REDUCTION_DATES.start.toLocaleDateString('vi-VN')} đến{' '}
                {VAT_REDUCTION_DATES.end.toLocaleDateString('vi-VN')}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
            Thông tin tính thuế
          </h3>

          {/* Calculation Method */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Phương pháp tính thuế</span>
              <Tooltip content="Phương pháp khấu trừ: VAT = Đầu ra - Đầu vào. Phương pháp trực tiếp: VAT = Doanh thu × Tỷ lệ">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('deduction')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  method === 'deduction'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-medium text-gray-900">Khấu trừ</div>
                <div className="text-xs text-gray-500">Đầu ra - Đầu vào</div>
              </button>
              <button
                onClick={() => setMethod('direct')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  method === 'direct'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-medium text-gray-900">Trực tiếp</div>
                <div className="text-xs text-gray-500">% trên doanh thu</div>
              </button>
            </div>
          </div>

          {/* Business Category (for Direct method) */}
          {method === 'direct' && (
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Loại hình kinh doanh</span>
                <Tooltip content="Tỷ lệ VAT trực tiếp trên doanh thu theo từng loại hình">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <select
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value as BusinessCategory)}
                className="input-field"
              >
                {Object.entries(businessCategoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sales Revenue */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Doanh thu bán hàng (đầu ra)</span>
              <Tooltip content="Tổng doanh thu bán hàng, dịch vụ chưa có VAT">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              type="text"
              value={formatNumber(salesRevenue)}
              onChange={(e) => handleSalesChange(e.target.value)}
              className="input-field text-lg font-semibold"
              placeholder="Nhập doanh thu"
            />
            {salesWarning && (
              <p className="text-xs text-amber-600 mt-1">{salesWarning}</p>
            )}
          </div>

          {/* Output VAT Rate */}
          {method === 'deduction' && (
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Thuế suất đầu ra</span>
              </label>
              <select
                value={outputRate}
                onChange={(e) => setOutputRate(parseFloat(e.target.value))}
                className="input-field"
              >
                {rateOptions.filter(opt => opt.value !== null).map((opt) => (
                  <option key={opt.value} value={opt.value!}>
                    {opt.label} - {opt.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Purchase Value & Input Rate (for Deduction method) */}
          {method === 'deduction' && (
            <>
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                  <span>Giá trị mua hàng (đầu vào)</span>
                  <Tooltip content="Tổng giá trị mua hàng, dịch vụ có hóa đơn VAT hợp lệ">
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      <InfoIcon />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="text"
                  value={formatNumber(purchaseValue)}
                  onChange={(e) => handlePurchaseChange(e.target.value)}
                  className="input-field text-lg font-semibold"
                  placeholder="Nhập giá trị mua vào"
                />
                {purchaseWarning && (
                  <p className="text-xs text-amber-600 mt-1">{purchaseWarning}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                  <span>Thuế suất đầu vào</span>
                </label>
                <select
                  value={inputRate}
                  onChange={(e) => setInputRate(parseFloat(e.target.value))}
                  className="input-field"
                >
                  {rateOptions.filter(opt => opt.value !== null).map((opt) => (
                    <option key={opt.value} value={opt.value!}>
                      {opt.label} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Date Selection */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Thời điểm tính thuế</span>
              <Tooltip content="Để xác định có áp dụng giảm VAT 2% hay không">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={useCurrentDate}
                  onChange={() => setUseCurrentDate(true)}
                  className="text-green-600"
                />
                <span className="text-sm text-gray-700">Hiện tại</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!useCurrentDate}
                  onChange={() => setUseCurrentDate(false)}
                  className="text-green-600"
                />
                <span className="text-sm text-gray-700">Tùy chọn</span>
              </label>
            </div>
            {!useCurrentDate && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="input-field"
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showComparison
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 So sánh phương pháp
            </button>
            <button
              onClick={() => setShowCategories(!showCategories)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showCategories
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📋 Danh mục thuế suất
            </button>
            {result && result.vatRefundable > 0 && (
              <button
                onClick={() => setShowRefundCheck(!showRefundCheck)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showRefundCheck
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 Kiểm tra hoàn thuế
              </button>
            )}
          </div>
        </div>

        {/* Result Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
            Kết quả tính toán
          </h3>

          {result && (
            <>
              {/* Method Applied */}
              <div className="rounded-lg p-4 bg-gray-50 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Phương pháp áp dụng</div>
                <div className="text-lg font-semibold text-gray-900">
                  {VAT_METHODS[result.method]}
                </div>
                {result.isReducedRateApplied && (
                  <div className="text-xs text-green-600 mt-1">
                    Đã áp dụng giảm VAT 2%
                  </div>
                )}
              </div>

              {/* VAT Breakdown */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-semibold text-green-900">Chi tiết tính thuế</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Doanh thu (chưa VAT):</span>
                    <span className="font-medium text-gray-900">{formatCurrency(salesRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      VAT đầu ra ({formatPercent(result.appliedOutputRate)}):
                    </span>
                    <span className="font-medium text-green-700">
                      +{formatCurrency(result.outputVAT)}
                    </span>
                  </div>
                  {method === 'deduction' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Giá trị mua vào:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(purchaseValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          VAT đầu vào ({formatPercent(result.appliedInputRate)}):
                        </span>
                        <span className="font-medium text-blue-700">
                          -{formatCurrency(result.inputVAT)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* VAT Payable */}
              {result.vatPayable > 0 ? (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 border-2 border-red-300">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="font-semibold text-red-900">VAT phải nộp</h4>
                  </div>
                  <div className="text-3xl font-bold text-red-700">
                    {formatCurrency(result.vatPayable)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    = {formatCurrency(result.outputVAT)} - {formatCurrency(result.inputVAT)}
                  </div>
                </div>
              ) : result.vatRefundable > 0 ? (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border-2 border-blue-300">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="font-semibold text-blue-900">VAT được khấu trừ/hoàn</h4>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    {formatCurrency(result.vatRefundable)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Chuyển sang kỳ sau hoặc đề nghị hoàn thuế
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-center text-gray-500">
                    VAT đầu ra = VAT đầu vào, không phát sinh thuế phải nộp
                  </div>
                </div>
              )}

              {/* Registration Notice */}
              {registrationCheck.requiresRegistration && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-amber-800">
                        Bắt buộc đăng ký VAT
                      </h4>
                      <p className="text-sm text-amber-700">
                        Doanh thu ước tính {formatCurrency(salesRevenue * 12)}/năm vượt ngưỡng{' '}
                        {formatCurrency(VAT_REGISTRATION_THRESHOLD)}.
                      </p>
                      <ul className="text-sm text-amber-700 mt-2 space-y-1">
                        {registrationCheck.notes.map((note, i) => (
                          <li key={i}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!result && (
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">Nhập doanh thu để tính thuế GTGT</p>
            </div>
          )}
        </div>
      </div>

      {/* Method Comparison */}
      {showComparison && comparison && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            So sánh phương pháp tính thuế
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Deduction Method */}
            <div className={`rounded-lg p-4 border-2 ${
              comparison.recommendation === 'deduction'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Phương pháp khấu trừ</h4>
                {comparison.recommendation === 'deduction' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                    Đề xuất
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT đầu ra:</span>
                  <span>{formatCurrency(comparison.deduction.outputVAT)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT đầu vào:</span>
                  <span>-{formatCurrency(comparison.deduction.inputVAT)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium">VAT phải nộp:</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(comparison.deduction.vatPayable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Method */}
            <div className={`rounded-lg p-4 border-2 ${
              comparison.recommendation === 'direct'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Phương pháp trực tiếp</h4>
                {comparison.recommendation === 'direct' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                    Đề xuất
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Doanh thu:</span>
                  <span>{formatCurrency(salesRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tỷ lệ:</span>
                  <span>{formatPercent(DIRECT_VAT_RATES[businessCategory])}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium">VAT phải nộp:</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(comparison.direct.vatPayable)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings & Notes */}
          {comparison.savings > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <span>💡</span>
                <span className="font-medium">
                  Tiết kiệm {formatCurrency(comparison.savings)} khi dùng phương pháp {VAT_METHODS[comparison.recommendation]}
                </span>
              </div>
            </div>
          )}

          {comparison.notes.length > 0 && (
            <div className="mt-4 space-y-2">
              {comparison.notes.map((note, i) => (
                <div key={i} className="text-sm text-gray-700">
                  • {note}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VAT Categories */}
      {showCategories && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Danh mục thuế suất VAT
          </h3>
          <div className="space-y-4">
            {/* 0% */}
            <div className="rounded-lg p-4 bg-blue-50 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">0% - Xuất khẩu</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {VAT_CATEGORIES.zero.items.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            {/* 5% */}
            <div className="rounded-lg p-4 bg-green-50 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">5% - Hàng thiết yếu</h4>
              <ul className="text-sm text-green-700 space-y-1 columns-2 gap-4">
                {VAT_CATEGORIES.reduced5.items.map((item, i) => (
                  <li key={i} className="break-inside-avoid">• {item}</li>
                ))}
              </ul>
            </div>

            {/* Không chịu thuế */}
            <div className="rounded-lg p-4 bg-gray-50 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Không chịu thuế</h4>
              <ul className="text-sm text-gray-600 space-y-1 columns-2 gap-4">
                {VAT_CATEGORIES.exempt.items.map((item, i) => (
                  <li key={i} className="break-inside-avoid">• {item}</li>
                ))}
              </ul>
            </div>

            {/* 10% (8%) */}
            <div className="rounded-lg p-4 bg-orange-50 border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-2">
                {isReducedPeriod ? '8% (giảm từ 10%)' : '10%'} - Tiêu chuẩn
              </h4>
              <p className="text-sm text-orange-700">
                Áp dụng cho tất cả hàng hóa, dịch vụ không thuộc các nhóm trên.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refund Check */}
      {showRefundCheck && refundCheck && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Kiểm tra điều kiện hoàn thuế
          </h3>
          <div className={`rounded-lg p-4 border ${
            refundCheck.isEligible
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {refundCheck.isEligible ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-green-800">Đủ điều kiện hoàn thuế</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-semibold text-amber-800">Chưa đủ điều kiện</span>
                </>
              )}
            </div>
            <p className={`text-sm mb-3 ${
              refundCheck.isEligible ? 'text-green-700' : 'text-amber-700'
            }`}>
              {refundCheck.reason}
            </p>
            {refundCheck.isEligible && (
              <div className="text-lg font-bold text-green-700 mb-3">
                Số tiền có thể hoàn: {formatCurrency(refundCheck.refundableAmount)}
              </div>
            )}
            <div className="space-y-2">
              {refundCheck.conditions.map((cond, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {cond.met ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">○</span>
                  )}
                  <div>
                    <div className={cond.met ? 'text-green-700' : 'text-gray-600'}>
                      {cond.condition}
                    </div>
                    <div className="text-xs text-gray-500">{cond.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legal Info */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Căn cứ pháp lý
        </h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Luật Thuế GTGT 2008</strong> (sửa đổi 2013, 2016): Quy định về thuế GTGT</li>
          <li>• <strong>Nghị định 209/2013/NĐ-CP</strong>: Hướng dẫn thi hành Luật Thuế GTGT</li>
          <li>• <strong>Thông tư 219/2013/TT-BTC</strong>: Chi tiết thuế suất và điều kiện áp dụng</li>
          <li>• <strong>Luật 48/2024/QH15</strong>: Giảm thuế GTGT 2% (10% → 8%) đến 30/06/2025</li>
        </ul>
        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Lưu ý:</strong> Công cụ này chỉ mang tính chất tham khảo. Để đảm bảo tính chính xác,
            vui lòng tham khảo ý kiến của chuyên gia thuế hoặc cơ quan thuế địa phương.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VATCalculator;
