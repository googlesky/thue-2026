'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculateVAT,
  compareVATMethods,
  checkVATRefundEligibility,
  checkVATRegistration,
  getVATRateOptions,
  getVATRateOptionKey,
  getVATReductionBasis,
  isVATReductionPeriod,
  VAT_METHODS,
  VAT_CATEGORIES,
  DIRECT_VAT_RATES,
  formatCurrency,
  formatPercent,
  VATMethod,
  VATTaxpayerType,
  BusinessCategory,
  VATOutput,
} from '@/lib/vatCalculator';
import { VATTabState, DEFAULT_VAT_STATE } from '@/lib/snapshotTypes';
import { formatNumber } from '@/lib/taxCalculator';
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

// Nhãn tỷ lệ % trên doanh thu (Luật GTGT Điều 12.2.b)
const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  distribution: 'Phân phối, cung cấp hàng hóa',
  services: 'Dịch vụ, xây dựng không bao thầu nguyên vật liệu',
  production: 'Sản xuất, vận tải, dịch vụ có gắn với hàng hóa, xây dựng có bao thầu nguyên vật liệu',
  otherActivities: 'Hoạt động kinh doanh khác',
};

// 'YYYY-MM-DD' (input type=date) → Date theo giờ địa phương
function parseLocalDate(value: string): Date | null {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

export function VATCalculator({ tabState, onTabStateChange }: VATCalculatorProps) {
  // Initialize state from tabState or defaults
  const [method, setMethod] = useState<VATMethod>(tabState?.method ?? DEFAULT_VAT_STATE.method);
  const [taxpayerType, setTaxpayerType] = useState<VATTaxpayerType>(
    tabState?.taxpayerType ?? 'business'
  );
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>(
    tabState?.businessCategory ?? DEFAULT_VAT_STATE.businessCategory
  );
  const [salesRevenue, setSalesRevenue] = useState<number>(tabState?.salesRevenue ?? 0);
  const [purchaseValue, setPurchaseValue] = useState<number>(tabState?.purchaseValue ?? 0);
  const [outputRate, setOutputRate] = useState<number>(
    tabState?.outputRate ?? DEFAULT_VAT_STATE.outputRate
  );
  const [inputRate, setInputRate] = useState<number>(
    tabState?.inputRate ?? DEFAULT_VAT_STATE.inputRate
  );
  const [outputNotReduced, setOutputNotReduced] = useState<boolean>(tabState?.outputNotReduced ?? false);
  const [inputNotReduced, setInputNotReduced] = useState<boolean>(tabState?.inputNotReduced ?? false);
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

  const isHousehold = taxpayerType === 'household';
  // Hộ, cá nhân kinh doanh luôn dùng phương pháp trực tiếp
  const effectiveMethod: VATMethod = isHousehold ? 'direct' : method;

  // Calculated values
  const calculationDate = useMemo(() => {
    return useCurrentDate ? new Date() : parseLocalDate(customDate) ?? new Date();
  }, [useCurrentDate, customDate]);

  const isReducedPeriod = useMemo(() => {
    return isVATReductionPeriod(calculationDate);
  }, [calculationDate]);

  const rateOptions = useMemo(() => {
    return getVATRateOptions(calculationDate);
  }, [calculationDate]);

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
        outputNotReduced,
        inputNotReduced,
        taxpayerType,
      });
    }
  }, [method, businessCategory, salesRevenue, purchaseValue, outputRate, inputRate, useCurrentDate, customDate, outputNotReduced, inputNotReduced, taxpayerType, onTabStateChange]);

  // Calculate result when inputs change
  const result = useMemo((): VATOutput | null => {
    if (salesRevenue <= 0) return null;

    return calculateVAT({
      salesRevenue,
      purchaseValue,
      outputRate,
      inputRate,
      outputNotReduced,
      inputNotReduced,
      method: effectiveMethod,
      businessCategory,
      taxpayerType,
      calculationDate,
    });
  }, [salesRevenue, purchaseValue, outputRate, inputRate, outputNotReduced, inputNotReduced, effectiveMethod, businessCategory, taxpayerType, calculationDate]);

  // Compare methods (chỉ doanh nghiệp được chọn phương pháp)
  const comparison = useMemo(() => {
    if (salesRevenue <= 0 || isHousehold) return null;

    return compareVATMethods({
      salesRevenue,
      purchaseValue,
      outputRate,
      inputRate,
      outputNotReduced,
      inputNotReduced,
      businessCategory,
      calculationDate,
    });
  }, [salesRevenue, purchaseValue, outputRate, inputRate, outputNotReduced, inputNotReduced, businessCategory, calculationDate, isHousehold]);

  // Phương pháp bắt buộc theo doanh thu năm
  const registrationCheck = useMemo(() => {
    return checkVATRegistration({
      annualRevenue: salesRevenue * 12,
      taxpayerType,
    });
  }, [salesRevenue, taxpayerType]);

  const methodConflict =
    registrationCheck.requiredMethod !== undefined && registrationCheck.requiredMethod !== effectiveMethod;

  // Refund check
  const refundCheck = useMemo(() => {
    if (!result || result.vatRefundable <= 0) return null;

    return checkVATRefundEligibility({
      vatRefundable: result.vatRefundable,
      exportRevenue: result.appliedOutputRate === 0 ? salesRevenue : 0,
      onlyFivePercentGoods: result.appliedOutputRate === 0.05,
    });
  }, [result, salesRevenue]);

  useEffect(() => {
    updateTabState();
  }, [updateTabState]);

  // Input handlers
  const handleSalesChange = (value: string) => {
    const MAX_VALUE = 1_000_000_000_000; // 1 nghìn tỷ
    const parsed = parseCurrencyInput(value, { max: MAX_VALUE });
    setSalesRevenue(parsed.value);
    setSalesWarning(buildWarning(parsed.issues, MAX_VALUE));
  };

  const handlePurchaseChange = (value: string) => {
    const MAX_VALUE = 1_000_000_000_000;
    const parsed = parseCurrencyInput(value, { max: MAX_VALUE });
    setPurchaseValue(parsed.value);
    setPurchaseWarning(buildWarning(parsed.issues, MAX_VALUE));
  };

  const handleRateSelect = (key: string, target: 'output' | 'input') => {
    const option = rateOptions.find((o) => o.key === key);
    if (!option) return;
    if (target === 'output') {
      setOutputRate(option.rate);
      setOutputNotReduced(option.notReduced);
    } else {
      setInputRate(option.rate);
      setInputNotReduced(option.notReduced);
    }
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

  const choiceClass = (active: boolean) =>
    `p-3 rounded-lg border-2 transition-all text-left ${
      active ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
    }`;

  return (
    <div className="card">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tính thuế GTGT (VAT)</h2>
        <p className="text-sm text-gray-500">
          Theo Luật Thuế GTGT 48/2024/QH15 (sửa đổi 2025, 2026), Nghị định 181/2025/NĐ-CP
        </p>
      </div>

      {/* VAT Reduction Notice */}
      {isReducedPeriod && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800">Đang trong thời gian giảm thuế GTGT</h4>
          <p className="text-sm text-green-700">
            Thuế suất 10% còn 8% (phương pháp khấu trừ); giảm 20% tỷ lệ % trên doanh thu (phương pháp
            trực tiếp). Không áp dụng cho nhóm loại trừ: viễn thông, tài chính, ngân hàng, chứng khoán,
            bảo hiểm, bất động sản, kim loại, khai khoáng, hàng chịu thuế tiêu thụ đặc biệt.
            Căn cứ: {getVATReductionBasis(calculationDate)}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
            Thông tin tính thuế
          </h3>

          {/* Taxpayer type */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Người nộp thuế</span>
              <Tooltip content="Doanh nghiệp doanh thu năm từ 1 tỷ đồng bắt buộc khấu trừ. Hộ, cá nhân kinh doanh luôn tính theo tỷ lệ % trên doanh thu và không chịu GTGT nếu doanh thu năm từ 1 tỷ đồng trở xuống.">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTaxpayerType('business')} className={choiceClass(!isHousehold)}>
                <div className="text-sm font-medium text-gray-900">Doanh nghiệp</div>
                <div className="text-xs text-gray-500">Khấu trừ hoặc trực tiếp</div>
              </button>
              <button onClick={() => setTaxpayerType('household')} className={choiceClass(isHousehold)}>
                <div className="text-sm font-medium text-gray-900">Hộ, cá nhân KD</div>
                <div className="text-xs text-gray-500">Luôn trực tiếp</div>
              </button>
            </div>
          </div>

          {/* Calculation Method (doanh nghiệp) */}
          {!isHousehold && (
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Phương pháp tính thuế</span>
                <Tooltip content="Phương pháp khấu trừ: GTGT = đầu ra - đầu vào. Phương pháp trực tiếp: GTGT = doanh thu × tỷ lệ %.">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMethod('deduction')} className={choiceClass(method === 'deduction')}>
                  <div className="text-sm font-medium text-gray-900">Khấu trừ</div>
                  <div className="text-xs text-gray-500">Đầu ra - đầu vào</div>
                </button>
                <button onClick={() => setMethod('direct')} className={choiceClass(method === 'direct')}>
                  <div className="text-sm font-medium text-gray-900">Trực tiếp</div>
                  <div className="text-xs text-gray-500">% trên doanh thu</div>
                </button>
              </div>
            </div>
          )}

          {/* Business Category (for Direct method) */}
          {effectiveMethod === 'direct' && (
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Loại hình kinh doanh</span>
                <Tooltip content="Tỷ lệ % GTGT trên doanh thu theo Luật GTGT Điều 12.2">
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
                {(Object.keys(BUSINESS_CATEGORY_LABELS) as BusinessCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {BUSINESS_CATEGORY_LABELS[key]} ({formatPercent(DIRECT_VAT_RATES[key])})
                  </option>
                ))}
              </select>
              {isReducedPeriod && (
                <label className="flex items-start gap-2 mt-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outputNotReduced}
                    onChange={(e) => setOutputNotReduced(e.target.checked)}
                    className="mt-0.5 rounded"
                  />
                  <span>Hàng hóa, dịch vụ thuộc nhóm không được giảm 20% tỷ lệ</span>
                </label>
              )}
            </div>
          )}

          {/* Sales Revenue */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Doanh thu bán ra trong tháng</span>
              <Tooltip content="Tổng doanh thu bán hàng, dịch vụ trong tháng, chưa có thuế GTGT">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={salesRevenue > 0 ? formatNumber(salesRevenue) : ''}
              onChange={(e) => handleSalesChange(e.target.value)}
              className="input-field text-lg font-semibold"
              placeholder="0"
            />
            {salesWarning && (
              <p className="text-xs text-amber-600 mt-1">{salesWarning}</p>
            )}
          </div>

          {/* Output VAT Rate */}
          {effectiveMethod === 'deduction' && (
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Thuế suất đầu ra</span>
              </label>
              <select
                value={getVATRateOptionKey(outputRate, outputNotReduced, calculationDate)}
                onChange={(e) => handleRateSelect(e.target.value, 'output')}
                className="input-field"
              >
                {rateOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Purchase Value & Input Rate (for Deduction method) */}
          {effectiveMethod === 'deduction' && (
            <>
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                  <span>Giá trị mua vào trong tháng</span>
                  <Tooltip content="Tổng giá trị hàng hóa, dịch vụ mua vào có hóa đơn GTGT hợp lệ, chưa có thuế">
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      <InfoIcon />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={purchaseValue > 0 ? formatNumber(purchaseValue) : ''}
                  onChange={(e) => handlePurchaseChange(e.target.value)}
                  className="input-field text-lg font-semibold"
                  placeholder="0"
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
                  value={getVATRateOptionKey(inputRate, inputNotReduced, calculationDate)}
                  onChange={(e) => handleRateSelect(e.target.value, 'input')}
                  className="input-field"
                >
                  {rateOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
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
              <Tooltip content="Để xác định có áp dụng giảm thuế GTGT hay không">
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
            {!isHousehold && (
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showComparison
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                So sánh phương pháp
              </button>
            )}
            <button
              onClick={() => setShowCategories(!showCategories)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showCategories
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Danh mục thuế suất
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
                Kiểm tra hoàn thuế
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
                    {result.method === 'direct'
                      ? `Đã giảm 20% tỷ lệ: ${formatPercent(DIRECT_VAT_RATES[businessCategory])} còn ${formatPercent(result.appliedOutputRate)}`
                      : 'Đã áp dụng thuế suất giảm 8% cho nhóm hàng hóa, dịch vụ 10%'}
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
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-600">Doanh thu (chưa GTGT):</span>
                    <span className="font-medium text-gray-900">{formatCurrency(salesRevenue)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-600">
                      GTGT {result.method === 'direct' ? 'phải nộp' : 'đầu ra'} ({formatPercent(result.appliedOutputRate)}):
                    </span>
                    <span className="font-medium text-green-700">
                      +{formatCurrency(result.outputVAT)}
                    </span>
                  </div>
                  {result.method === 'deduction' && (
                    <>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">Giá trị mua vào:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(purchaseValue)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">
                          GTGT đầu vào ({formatPercent(result.appliedInputRate)}):
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
                    <h4 className="font-semibold text-red-900">GTGT phải nộp</h4>
                  </div>
                  <div className="text-3xl font-bold text-red-700">
                    {formatCurrency(result.vatPayable)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {result.method === 'deduction'
                      ? `= ${formatCurrency(result.outputVAT)} - ${formatCurrency(result.inputVAT)}`
                      : `= ${formatCurrency(salesRevenue)} × ${formatPercent(result.appliedOutputRate)}`}
                  </div>
                </div>
              ) : result.vatRefundable > 0 ? (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border-2 border-blue-300">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="font-semibold text-blue-900">GTGT đầu vào chưa khấu trừ hết</h4>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    {formatCurrency(result.vatRefundable)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Chuyển khấu trừ kỳ sau hoặc đề nghị hoàn thuế nếu đủ điều kiện
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-center text-gray-500">
                    {result.isBelowThreshold
                      ? 'Không phải nộp thuế GTGT: doanh thu năm ước tính từ 1 tỷ đồng trở xuống'
                      : 'GTGT đầu ra bằng GTGT đầu vào, không phát sinh thuế phải nộp'}
                  </div>
                </div>
              )}

              {/* Phương pháp theo quy định */}
              <div className={`rounded-lg p-4 border ${methodConflict ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`font-semibold ${methodConflict ? 'text-amber-800' : 'text-gray-800'}`}>
                  {methodConflict
                    ? `Doanh thu này phải dùng ${VAT_METHODS[registrationCheck.requiredMethod!].toLowerCase()}`
                    : 'Phương pháp tính thuế theo quy định'}
                </h4>
                <p className={`text-sm mt-1 ${methodConflict ? 'text-amber-700' : 'text-gray-600'}`}>
                  Doanh thu năm ước tính {formatCurrency(salesRevenue * 12)} (doanh thu tháng × 12).
                </p>
                <ul className={`text-sm mt-2 space-y-1 ${methodConflict ? 'text-amber-700' : 'text-gray-600'}`}>
                  {registrationCheck.notes.map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <span className="text-gray-600">GTGT đầu ra:</span>
                  <span>{formatCurrency(comparison.deduction.outputVAT)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GTGT đầu vào:</span>
                  <span>-{formatCurrency(comparison.deduction.inputVAT)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium">GTGT phải nộp:</span>
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
                  <span>{formatPercent(comparison.direct.appliedOutputRate)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium">GTGT phải nộp:</span>
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
              <span className="font-medium text-blue-800">
                Tiết kiệm {formatCurrency(comparison.savings)} khi dùng {VAT_METHODS[comparison.recommendation].toLowerCase()}
              </span>
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
            Danh mục thuế suất GTGT
          </h3>
          <div className="space-y-4">
            {/* 0% */}
            <div className="rounded-lg p-4 bg-blue-50 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">0% - Xuất khẩu</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {VAT_CATEGORIES.zero.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            {/* 5% */}
            <div className="rounded-lg p-4 bg-green-50 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">5% - Hàng hóa, dịch vụ thiết yếu</h4>
              <ul className="text-sm text-green-700 space-y-1 sm:columns-2 gap-4">
                {VAT_CATEGORIES.reduced5.map((item, i) => (
                  <li key={i} className="break-inside-avoid">• {item}</li>
                ))}
              </ul>
            </div>

            {/* Không chịu thuế */}
            <div className="rounded-lg p-4 bg-gray-50 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Không chịu thuế</h4>
              <ul className="text-sm text-gray-600 space-y-1 sm:columns-2 gap-4">
                {VAT_CATEGORIES.exempt.map((item, i) => (
                  <li key={i} className="break-inside-avoid">• {item}</li>
                ))}
              </ul>
            </div>

            {/* 10% (8%) */}
            <div className="rounded-lg p-4 bg-orange-50 border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-2">
                {isReducedPeriod ? '10% (đang giảm còn 8%)' : '10%'} - Thuế suất phổ thông
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {VAT_CATEGORIES.standard.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
              <p className="text-sm text-orange-700 mt-2">
                <strong>Không được giảm (vẫn 10%):</strong> {VAT_CATEGORIES.notReduced}.
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
                  <span className="font-semibold text-green-800">Có thể đề nghị hoàn thuế</span>
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
                Số tiền đề nghị hoàn: {formatCurrency(refundCheck.refundableAmount)}
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
          <li>• <strong>Luật Thuế GTGT 48/2024/QH15</strong> (sửa đổi bởi Luật 90/2025/QH15, 149/2025/QH15, 09/2026/QH16): đối tượng, thuế suất, phương pháp tính, hoàn thuế</li>
          <li>• <strong>Nghị định 181/2025/NĐ-CP, Thông tư 69/2025/TT-BTC</strong>: hướng dẫn thi hành Luật Thuế GTGT</li>
          <li>• <strong>Nghị quyết 204/2025/QH15, Nghị định 174/2025/NĐ-CP</strong>: giảm thuế suất 10% còn 8%, giảm 20% tỷ lệ % trên doanh thu, từ 01/7/2025 đến hết 31/12/2026</li>
          <li>• <strong>Nghị định 141/2026/NĐ-CP</strong>: ngưỡng doanh thu 1 tỷ đồng/năm của hộ, cá nhân kinh doanh</li>
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
