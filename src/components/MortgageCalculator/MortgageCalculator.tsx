'use client';

import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  calculateMortgage,
  MORTGAGE_DEFAULTS,
  PREFERENTIAL_PERIOD_OPTIONS,
  MortgageInput,
  MortgageResult,
  PropertyType,
  RepaymentMethod,
  AmortizationRow,
  YearlyAmortization,
} from '@/lib/mortgageCalculator';
import { formatNumber } from '@/lib/taxCalculator';
import { parseCurrencyInput } from '@/utils/inputSanitizers';
import { MortgageTabState, DEFAULT_MORTGAGE_STATE } from '@/lib/snapshotTypes';

const LazyChart = lazy(() =>
  import('./MortgageChart').then((m) => ({ default: m.MortgageAmortizationChart }))
);

interface MortgageCalculatorProps {
  tabState?: MortgageTabState;
  onTabStateChange?: (state: MortgageTabState) => void;
}

function displayCurrency(value: number): string {
  if (value === 0) return '0';
  return formatNumber(value);
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return billions % 1 === 0
      ? `${billions} tỷ`
      : `${billions.toFixed(1)} tỷ`;
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return millions % 1 === 0
      ? `${millions} tr`
      : `${millions.toFixed(1)} tr`;
  }
  return formatNumber(value);
}

function formatCurrencyFull(value: number): string {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return billions % 1 === 0
      ? `${billions} tỷ`
      : `${billions.toFixed(2)} tỷ`;
  }
  return formatNumber(value) + ' VNĐ';
}

export function MortgageCalculator({ tabState, onTabStateChange }: MortgageCalculatorProps) {
  // ===== STATE =====
  const [propertyPriceInput, setPropertyPriceInput] = useState(
    tabState?.propertyPrice?.toString() ?? MORTGAGE_DEFAULTS.propertyPrice.toString()
  );
  const [downPaymentPercent, setDownPaymentPercent] = useState(
    tabState?.downPaymentPercent ?? MORTGAGE_DEFAULTS.downPaymentPercent
  );
  const [downPaymentMode, setDownPaymentMode] = useState<'percent' | 'amount'>('percent');
  const [downPaymentAmountInput, setDownPaymentAmountInput] = useState('');
  const [loanTermYears, setLoanTermYears] = useState(
    tabState?.loanTermYears ?? MORTGAGE_DEFAULTS.loanTermYears
  );
  const [preferentialRate, setPreferentialRate] = useState(
    tabState?.preferentialRate?.toString() ?? MORTGAGE_DEFAULTS.preferentialRate.toString()
  );
  const [preferentialMonths, setPreferentialMonths] = useState(
    tabState?.preferentialMonths ?? MORTGAGE_DEFAULTS.preferentialMonths
  );
  const [floatingRate, setFloatingRate] = useState(
    tabState?.floatingRate?.toString() ?? MORTGAGE_DEFAULTS.floatingRate.toString()
  );

  // Advanced inputs
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState(
    tabState?.monthlyIncome?.toString() ?? MORTGAGE_DEFAULTS.monthlyIncome.toString()
  );
  const [otherDebtInput, setOtherDebtInput] = useState(
    tabState?.otherDebtPayments?.toString() ?? '0'
  );
  const [gracePeriodMonths, setGracePeriodMonths] = useState(
    tabState?.gracePeriodMonths ?? MORTGAGE_DEFAULTS.gracePeriodMonths
  );
  const [propertyType, setPropertyType] = useState<PropertyType>(
    tabState?.propertyType ?? MORTGAGE_DEFAULTS.propertyType
  );
  const [repaymentMethod, setRepaymentMethod] = useState<RepaymentMethod>(
    tabState?.repaymentMethod ?? MORTGAGE_DEFAULTS.repaymentMethod
  );

  // Amortization table state
  const [tableView, setTableView] = useState<'yearly' | 'monthly'>('yearly');
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Parse inputs
  const propertyPrice = parseCurrencyInput(propertyPriceInput).value;
  const monthlyIncome = parseCurrencyInput(monthlyIncomeInput).value;
  const otherDebt = parseCurrencyInput(otherDebtInput).value;
  const prefRate = parseFloat(preferentialRate) || 0;
  const floatRate = parseFloat(floatingRate) || 0;

  // Down payment amount sync
  const downPayment = downPaymentMode === 'percent'
    ? propertyPrice * (downPaymentPercent / 100)
    : parseCurrencyInput(downPaymentAmountInput).value;

  const effectiveDownPaymentPercent = downPaymentMode === 'percent'
    ? downPaymentPercent
    : propertyPrice > 0
      ? (parseCurrencyInput(downPaymentAmountInput).value / propertyPrice) * 100
      : 0;

  // Build input
  const mortgageInput = useMemo<MortgageInput>(() => ({
    propertyPrice,
    downPaymentPercent: effectiveDownPaymentPercent,
    loanTermYears,
    preferentialRate: prefRate,
    preferentialMonths,
    floatingRate: floatRate,
    monthlyIncome,
    otherDebtPayments: otherDebt,
    gracePeriodMonths,
    propertyType,
    repaymentMethod,
  }), [
    propertyPrice, effectiveDownPaymentPercent, loanTermYears,
    prefRate, preferentialMonths, floatRate,
    monthlyIncome, otherDebt, gracePeriodMonths,
    propertyType, repaymentMethod,
  ]);

  // Calculate
  const result = useMemo(() => calculateMortgage(mortgageInput), [mortgageInput]);

  // Sync tab state
  const syncTabState = useCallback(() => {
    onTabStateChange?.({
      propertyPrice,
      downPaymentPercent: effectiveDownPaymentPercent,
      loanTermYears,
      preferentialRate: prefRate,
      preferentialMonths,
      floatingRate: floatRate,
      monthlyIncome,
      otherDebtPayments: otherDebt,
      gracePeriodMonths,
      propertyType,
      repaymentMethod,
    });
  }, [
    onTabStateChange, propertyPrice, effectiveDownPaymentPercent,
    loanTermYears, prefRate, preferentialMonths, floatRate,
    monthlyIncome, otherDebt, gracePeriodMonths,
    propertyType, repaymentMethod,
  ]);

  // Currency input handler
  const handleCurrencyInput = (
    value: string,
    setter: (v: string) => void
  ) => {
    const raw = value.replace(/[^\d]/g, '');
    setter(raw);
  };

  const handleCurrencyBlur = (
    value: string,
    setter: (v: string) => void
  ) => {
    const parsed = parseCurrencyInput(value);
    setter(parsed.value === 0 ? '0' : parsed.value.toString());
    syncTabState();
  };

  // DTI helpers
  const getDTILabel = (dti: number) => {
    if (dti <= 35) return 'An toàn';
    if (dti <= 50) return 'Chấp nhận được';
    return 'Rủi ro cao';
  };

  const getDTIColorClasses = (dti: number) => {
    if (dti <= 35) return {
      bg: 'bg-green-500',
      badge: 'bg-green-100 text-green-800',
      text: 'text-green-700',
    };
    if (dti <= 50) return {
      bg: 'bg-yellow-500',
      badge: 'bg-yellow-100 text-yellow-800',
      text: 'text-yellow-700',
    };
    return {
      bg: 'bg-red-500',
      badge: 'bg-red-100 text-red-800',
      text: 'text-red-700',
    };
  };

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="card">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🏠</span>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Vay mua nhà
          </h2>
        </div>
        <p className="text-sm text-gray-500 ml-10">
          Tính trả góp, phí mua nhà, đánh giá khả năng tài chính
        </p>
      </div>

      {/* ===== INPUTS ===== */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Thông tin khoản vay
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Giá nhà */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá nhà
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={propertyPrice === 0 ? '' : displayCurrency(propertyPrice)}
                onChange={(e) => handleCurrencyInput(e.target.value, setPropertyPriceInput)}
                onBlur={() => handleCurrencyBlur(propertyPriceInput, setPropertyPriceInput)}
                className="input-field w-full pr-12"
                placeholder="3.000.000.000"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                VNĐ
              </span>
            </div>
            {propertyPrice > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {formatCurrencyFull(propertyPrice)}
              </p>
            )}
          </div>

          {/* Tiền trả trước */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiền trả trước
            </label>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-gray-300 overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setDownPaymentMode('percent')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    downPaymentMode === 'percent'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  %
                </button>
                <button
                  onClick={() => {
                    setDownPaymentMode('amount');
                    setDownPaymentAmountInput(Math.round(downPayment).toString());
                  }}
                  className={`px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                    downPaymentMode === 'amount'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  VNĐ
                </button>
              </div>
              {downPaymentMode === 'percent' ? (
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={downPaymentPercent}
                    onChange={(e) => {
                      const v = Math.min(100, Math.max(0, Number(e.target.value)));
                      setDownPaymentPercent(v);
                    }}
                    onBlur={syncTabState}
                    className="input-field w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              ) : (
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={parseCurrencyInput(downPaymentAmountInput).value === 0 ? '' : displayCurrency(parseCurrencyInput(downPaymentAmountInput).value)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setDownPaymentAmountInput)}
                    onBlur={() => handleCurrencyBlur(downPaymentAmountInput, setDownPaymentAmountInput)}
                    className="input-field w-full"
                    placeholder="900.000.000"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {downPaymentMode === 'percent'
                ? `= ${formatCurrency(Math.round(downPayment))}`
                : `= ${effectiveDownPaymentPercent.toFixed(1)}%`
              }
            </p>
          </div>

          {/* Thời hạn vay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thời hạn vay: <span className="font-bold text-primary-600">{loanTermYears} năm</span>
            </label>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={loanTermYears}
              onChange={(e) => setLoanTermYears(Number(e.target.value))}
              onMouseUp={syncTabState}
              onTouchEnd={syncTabState}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 năm</span>
              <span>15 năm</span>
              <span>30 năm</span>
            </div>
          </div>

          {/* Lãi suất ưu đãi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lãi suất ưu đãi
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={preferentialRate}
                onChange={(e) => setPreferentialRate(e.target.value)}
                onBlur={syncTabState}
                className="input-field w-full pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%/năm</span>
            </div>
          </div>

          {/* Thời gian ưu đãi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thời gian ưu đãi
            </label>
            <select
              value={preferentialMonths}
              onChange={(e) => {
                setPreferentialMonths(Number(e.target.value));
                syncTabState();
              }}
              className="input-field w-full"
            >
              {PREFERENTIAL_PERIOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} tháng
                </option>
              ))}
            </select>
          </div>

          {/* Lãi suất thả nổi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lãi suất thả nổi (sau ưu đãi)
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={floatingRate}
                onChange={(e) => setFloatingRate(e.target.value)}
                onBlur={syncTabState}
                className="input-field w-full pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%/năm</span>
            </div>
          </div>
        </div>

        {/* Advanced options */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Tùy chọn nâng cao
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* Thu nhập hàng tháng */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thu nhập hàng tháng
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={monthlyIncome === 0 ? '' : displayCurrency(monthlyIncome)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setMonthlyIncomeInput)}
                    onBlur={() => handleCurrencyBlur(monthlyIncomeInput, setMonthlyIncomeInput)}
                    className="input-field w-full pr-12"
                    placeholder="30.000.000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">VNĐ</span>
                </div>
              </div>

              {/* Chi trả nợ khác */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chi trả nợ khác/tháng
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otherDebt === 0 ? '' : displayCurrency(otherDebt)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setOtherDebtInput)}
                    onBlur={() => handleCurrencyBlur(otherDebtInput, setOtherDebtInput)}
                    className="input-field w-full pr-12"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">VNĐ</span>
                </div>
              </div>

              {/* Ân hạn vốn gốc */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ân hạn vốn gốc
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step={1}
                    value={gracePeriodMonths}
                    onChange={(e) => setGracePeriodMonths(Number(e.target.value))}
                    onBlur={syncTabState}
                    className="input-field w-full pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">tháng</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Chỉ trả lãi, không trả gốc
                </p>
              </div>

              {/* Loại nhà */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại nhà
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => {
                    setPropertyType(e.target.value as PropertyType);
                    syncTabState();
                  }}
                  className="input-field w-full"
                >
                  <option value="secondary">Nhà cũ (mua lại)</option>
                  <option value="primary_developer">Nhà mới (từ chủ đầu tư)</option>
                </select>
              </div>

              {/* Phương thức trả nợ */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phương thức trả nợ
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRepaymentMethod('annuity');
                      syncTabState();
                    }}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                      repaymentMethod === 'annuity'
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Trả đều (annuity)
                  </button>
                  <button
                    onClick={() => {
                      setRepaymentMethod('straight_line');
                      syncTabState();
                    }}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                      repaymentMethod === 'straight_line'
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Gốc đều (straight-line)
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {repaymentMethod === 'annuity'
                    ? 'Tổng tiền trả mỗi tháng không đổi trong cùng giai đoạn lãi suất'
                    : 'Gốc trả đều mỗi tháng, lãi giảm dần theo dư nợ còn lại'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Trả góp ưu đãi */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
          <p className="text-xs sm:text-sm text-green-600 font-medium mb-1">
            Trả góp ưu đãi
          </p>
          <p className="text-lg sm:text-2xl font-bold text-green-700 font-mono tabular-nums">
            {formatCurrency(result.preferentialPayment)}
          </p>
          <p className="text-xs text-green-500 mt-1">
            /tháng ({preferentialMonths} tháng)
          </p>
        </div>

        {/* Trả góp sau ưu đãi */}
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50">
          <p className="text-xs sm:text-sm text-orange-600 font-medium mb-1">
            Trả góp sau ưu đãi
          </p>
          <p className="text-lg sm:text-2xl font-bold text-orange-700 font-mono tabular-nums">
            {formatCurrency(result.floatingPayment)}
          </p>
          <p className="text-xs text-orange-500 mt-1">
            /tháng (còn lại)
          </p>
        </div>

        {/* Tổng lãi */}
        <div className="card bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/50">
          <p className="text-xs sm:text-sm text-red-600 font-medium mb-1">
            Tổng lãi phải trả
          </p>
          <p className="text-lg sm:text-2xl font-bold text-red-700 font-mono tabular-nums">
            {formatCurrency(result.totalInterest)}
          </p>
          <p className="text-xs text-red-500 mt-1">
            = {propertyPrice > 0 ? ((result.totalInterest / propertyPrice) * 100).toFixed(0) : 0}% giá nhà
          </p>
        </div>

        {/* Tổng phải trả */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">
            Tổng phải trả
          </p>
          <p className="text-lg sm:text-2xl font-bold text-blue-700 font-mono tabular-nums">
            {formatCurrency(result.totalPayment)}
          </p>
          <p className="text-xs text-blue-500 mt-1">
            Gốc + lãi toàn bộ
          </p>
        </div>
      </div>

      {/* ===== DTI + FEES ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* DTI Card */}
        {monthlyIncome > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Khả năng tài chính (DTI)
            </h3>

            {/* Progress bar */}
            <div className="relative mb-3 mt-8">
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-green-400" style={{ width: '35%' }} />
                <div className="h-full bg-yellow-400" style={{ width: '15%' }} />
                <div className="h-full bg-red-400" style={{ width: '50%' }} />
              </div>
              {/* DTI marker */}
              <div
                className="absolute top-0 h-4 w-0.5 bg-gray-800"
                style={{ left: `${Math.min(result.dtiRatio, 100)}%` }}
              />
              <div
                className="absolute -top-6 -translate-x-1/2 text-xs font-bold text-gray-800 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm whitespace-nowrap"
                style={{ left: `${Math.min(result.dtiRatio, 100)}%` }}
              >
                {result.dtiRatio}%
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span>0%</span>
              <span>35%</span>
              <span>50%</span>
              <span>100%</span>
            </div>

            {/* Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDTIColorClasses(result.dtiRatio).badge}`}>
                {getDTILabel(result.dtiRatio)}
              </span>
              <span className="text-sm text-gray-500">
                Nợ vay / thu nhập = {result.dtiRatio}%
              </span>
            </div>

            {/* Max loan */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                Khả năng vay tối đa (DTI 50%)
              </p>
              <p className="text-xl font-bold text-gray-800 font-mono tabular-nums">
                {formatCurrencyFull(result.maxLoanByIncome)}
              </p>
              {result.loanAmount > result.maxLoanByIncome && (
                <p className="text-xs text-red-500 mt-1">
                  Vượt {formatCurrency(result.loanAmount - result.maxLoanByIncome)} so với khả năng vay
                </p>
              )}
            </div>
          </div>
        )}

        {/* Fees Card */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Phí mua nhà
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-sm text-gray-600">Lệ phí trước bạ (0,5%)</span>
              <span className="text-sm font-medium font-mono tabular-nums">
                {formatNumber(Math.round(result.fees.registrationFee))}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-sm text-gray-600">Phí công chứng</span>
              <span className="text-sm font-medium font-mono tabular-nums">
                {formatNumber(Math.round(result.fees.notaryFee))}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
              <span className="text-sm text-gray-600">Phí thẩm định (0,15%)</span>
              <span className="text-sm font-medium font-mono tabular-nums">
                {formatNumber(Math.round(result.fees.appraisalFee))}
              </span>
            </div>
            {result.fees.maintenanceFee > 0 && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-sm text-gray-600">Phí bảo trì (2%)</span>
                <span className="text-sm font-medium font-mono tabular-nums">
                  {formatNumber(Math.round(result.fees.maintenanceFee))}
                </span>
              </div>
            )}
            {result.fees.vat > 0 && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-sm text-gray-600">VAT 10% (~70% phần xây dựng)</span>
                <span className="text-sm font-medium font-mono tabular-nums">
                  {formatNumber(Math.round(result.fees.vat))}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-t-2 border-gray-200 font-bold">
              <span className="text-sm text-gray-800">Tổng phí</span>
              <span className="text-sm text-primary-600 font-mono tabular-nums">
                {formatNumber(Math.round(result.fees.total))}
              </span>
            </div>
          </div>

          <div className="mt-3 bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium">
              Tổng chi phí ban đầu
            </p>
            <p className="text-xl font-bold text-blue-700 font-mono tabular-nums">
              {formatCurrencyFull(result.totalUpfrontCost)}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Trả trước + phí
            </p>
          </div>
        </div>
      </div>

      {/* ===== AMORTIZATION CHART ===== */}
      {result.yearlyAmortization.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Biểu đồ gốc và lãi theo năm
          </h3>
          <Suspense fallback={
            <div className="h-64 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
              <span className="text-gray-400 text-sm">Đang tải biểu đồ...</span>
            </div>
          }>
            <LazyChart
              data={result.yearlyAmortization}
              preferentialMonths={preferentialMonths + gracePeriodMonths}
            />
          </Suspense>
        </div>
      )}

      {/* ===== AMORTIZATION TABLE ===== */}
      {result.amortizationSchedule.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Bảng khấu hao
            </h3>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setTableView('yearly')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  tableView === 'yearly'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Theo năm
              </button>
              <button
                onClick={() => { setTableView('monthly'); setShowAllMonths(false); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 ${
                  tableView === 'monthly'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Theo tháng
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            {tableView === 'yearly' ? (
              <YearlyTable data={result.yearlyAmortization} />
            ) : (
              <MonthlyTable
                data={result.amortizationSchedule}
                showAll={showAllMonths}
                onShowAll={() => setShowAllMonths(true)}
              />
            )}
          </div>
        </div>
      )}

      {/* ===== SENSITIVITY ANALYSIS ===== */}
      {result.sensitivity.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Phân tích độ nhạy lãi suất
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {result.sensitivity.map((scenario, idx) => {
              const colors = [
                { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
                { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
                { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
              ][idx];

              return (
                <div key={scenario.label} className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
                      {scenario.label}
                    </span>
                    <span className="text-sm text-gray-500">
                      {scenario.rate}%/năm
                    </span>
                  </div>

                  <p className={`text-xl font-bold font-mono tabular-nums ${colors.text}`}>
                    {formatCurrency(scenario.monthlyPayment)}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">/tháng</p>

                  {scenario.differenceFromBase > 0 && (
                    <p className="text-sm text-red-600 font-medium">
                      +{formatCurrency(scenario.differenceFromBase)}/tháng
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Tổng lãi: {formatCurrency(scenario.totalInterest)}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-3 italic">
            Lãi suất thả nổi có thể thay đổi theo thị trường. Nên dự phòng khả năng lãi suất tăng 1–2% so với hiện tại.
          </p>
        </div>
      )}
    </div>
  );
}

// ===== SUB-COMPONENTS =====

function YearlyTable({ data }: { data: YearlyAmortization[] }) {
  return (
    <table className="w-full text-sm min-w-[500px]">
      <thead>
        <tr className="border-b-2 border-gray-200">
          <th className="text-left py-2 px-2 text-gray-600 font-semibold">Năm</th>
          <th className="text-right py-2 px-2 text-gray-600 font-semibold">Gốc trả</th>
          <th className="text-right py-2 px-2 text-gray-600 font-semibold">Lãi trả</th>
          <th className="text-right py-2 px-2 text-gray-600 font-semibold">Tổng trả</th>
          <th className="text-right py-2 px-2 text-gray-600 font-semibold">Dư nợ</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr
            key={row.year}
            className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}
          >
            <td className="py-2 px-2 font-medium text-gray-800">Năm {row.year}</td>
            <td className="py-2 px-2 text-right font-mono tabular-nums text-blue-600">
              {formatNumber(Math.round(row.totalPrincipal))}
            </td>
            <td className="py-2 px-2 text-right font-mono tabular-nums text-red-600">
              {formatNumber(Math.round(row.totalInterest))}
            </td>
            <td className="py-2 px-2 text-right font-mono tabular-nums font-medium">
              {formatNumber(Math.round(row.totalPayment))}
            </td>
            <td className="py-2 px-2 text-right font-mono tabular-nums text-gray-500">
              {formatNumber(Math.round(row.endingBalance))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MonthlyTable({
  data,
  showAll,
  onShowAll,
}: {
  data: AmortizationRow[];
  showAll: boolean;
  onShowAll: () => void;
}) {
  const displayData = showAll ? data : data.slice(0, 24);
  const remaining = data.length - 24;
  const firstFloatingMonth = data.find(r => r.phase === 'floating')?.month;

  return (
    <>
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 px-2 text-gray-600 font-semibold">Kỳ</th>
            <th className="text-right py-2 px-2 text-gray-600 font-semibold">Gốc trả</th>
            <th className="text-right py-2 px-2 text-gray-600 font-semibold">Lãi trả</th>
            <th className="text-right py-2 px-2 text-gray-600 font-semibold">Tổng trả</th>
            <th className="text-right py-2 px-2 text-gray-600 font-semibold">Dư nợ</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, idx) => {
            const bgColor = row.phase === 'grace' ? 'bg-purple-50/50' : idx % 2 === 1 ? 'bg-gray-50/50' : '';

            return (
              <tr
                key={row.month}
                className={`border-b border-gray-100 ${bgColor}`}
              >
                <td className="py-1.5 px-2 text-gray-800">
                  <span className="font-medium">T{row.month}</span>
                  {row.phase === 'grace' && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      ân hạn
                    </span>
                  )}
                  {row.month === firstFloatingMonth && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                      thả nổi
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums text-blue-600">
                  {formatNumber(row.principal)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums text-red-600">
                  {formatNumber(row.interest)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums font-medium">
                  {formatNumber(row.totalPayment)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums text-gray-500">
                  {formatNumber(row.remainingBalance)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!showAll && remaining > 0 && (
        <div className="text-center mt-3">
          <button
            onClick={onShowAll}
            className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium hover:bg-primary-50 rounded-lg transition-colors"
          >
            Xem tất cả {data.length} tháng (+{remaining} tháng nữa)
          </button>
        </div>
      )}
    </>
  );
}
