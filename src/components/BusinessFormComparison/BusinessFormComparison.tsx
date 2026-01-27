'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  compareBusinessForms,
  BusinessFormComparisonInput,
  BusinessFormComparisonResult,
  BusinessForm,
  BUSINESS_FORM_INFO,
  BUSINESS_CATEGORIES,
  BusinessCategory,
  formatCurrency,
  formatPercent,
} from '@/lib/businessFormComparisonCalculator';
import { formatNumber, parseCurrency, RegionType } from '@/lib/taxCalculator';
import { parseCurrencyInput, CurrencyInputIssues } from '@/utils/inputSanitizers';
import Tooltip from '@/components/ui/Tooltip';
import { BusinessFormComparisonTabState } from '@/lib/snapshotTypes';

interface BusinessFormComparisonProps {
  tabState?: BusinessFormComparisonTabState;
  onTabStateChange?: (state: BusinessFormComparisonTabState) => void;
}

// Info icon component
function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function BusinessFormComparison({ tabState, onTabStateChange }: BusinessFormComparisonProps) {
  // Initialize state
  const [annualRevenueInput, setAnnualRevenueInput] = useState<string>(
    tabState?.annualRevenue?.toString() ?? '500000000'
  );
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>(
    tabState?.businessCategory ?? 'services'
  );
  const [region, setRegion] = useState<RegionType>(tabState?.region ?? 1);
  const [dependents, setDependents] = useState<number>(tabState?.dependents ?? 0);
  const [hasSelfInsurance, setHasSelfInsurance] = useState<boolean>(
    tabState?.hasSelfInsurance ?? true
  );
  const [revenueWarning, setRevenueWarning] = useState<string | null>(null);

  const [result, setResult] = useState<BusinessFormComparisonResult | null>(null);

  // Update parent state
  const updateTabState = useCallback(() => {
    if (onTabStateChange) {
      onTabStateChange({
        annualRevenue: parseCurrency(annualRevenueInput),
        businessCategory,
        region,
        dependents,
        hasSelfInsurance,
      });
    }
  }, [annualRevenueInput, businessCategory, region, dependents, hasSelfInsurance, onTabStateChange]);

  // Calculate when inputs change
  useEffect(() => {
    const annualRevenue = parseCurrency(annualRevenueInput);

    if (annualRevenue > 0) {
      const input: BusinessFormComparisonInput = {
        annualRevenue,
        expenseRatio: 0.3, // Default 30% chi phí
        businessCategory,
        region,
        dependents,
        hasSelfInsurance,
      };

      const calculated = compareBusinessForms(input);
      setResult(calculated);
    } else {
      setResult(null);
    }

    updateTabState();
  }, [annualRevenueInput, businessCategory, region, dependents, hasSelfInsurance, updateTabState]);

  // Handle revenue input
  const handleRevenueChange = (value: string) => {
    const MAX_REVENUE = 100_000_000_000; // 100 tỷ
    const parsed = parseCurrencyInput(value, { max: MAX_REVENUE });
    setAnnualRevenueInput(parsed.value.toString());
    setRevenueWarning(buildWarning(parsed.issues, MAX_REVENUE));
  };

  const buildWarning = (issues: CurrencyInputIssues, max?: number): string | null => {
    const messages: string[] = [];
    if (issues.negative) messages.push('Không hỗ trợ số âm.');
    if (issues.decimal) messages.push('Không hỗ trợ số thập phân.');
    if (issues.overflow && max) messages.push(`Giá trị tối đa ${formatNumber(max)} VNĐ.`);
    return messages.length ? messages.join(' ') : null;
  };

  // Get recommendation color
  const getRecommendationColor = (form: BusinessForm, isRecommended: boolean) => {
    if (!isRecommended) return 'bg-white border-gray-200';
    switch (form) {
      case 'employee': return 'bg-blue-50 border-blue-300 ring-2 ring-blue-200';
      case 'freelancer': return 'bg-purple-50 border-purple-300 ring-2 ring-purple-200';
      case 'household': return 'bg-green-50 border-green-300 ring-2 ring-green-200';
    }
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl">⚖️</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">So sánh hình thức kinh doanh</h2>
          <p className="text-sm text-gray-500">Lương vs Freelancer vs Hộ kinh doanh</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Annual Revenue */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <span>Doanh thu/Thu nhập năm (VNĐ)</span>
            <Tooltip content="Tổng thu nhập hoặc doanh thu dự kiến trong 1 năm">
              <span className="text-gray-500 hover:text-gray-700 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </label>
          <input
            type="text"
            value={formatNumber(parseCurrency(annualRevenueInput))}
            onChange={(e) => handleRevenueChange(e.target.value)}
            className="input-field text-lg font-semibold"
            placeholder="Nhập doanh thu/năm"
          />
          {revenueWarning && (
            <p className="text-xs text-amber-600 mt-1">{revenueWarning}</p>
          )}
        </div>

        {/* Business Category */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <span>Ngành nghề</span>
            <Tooltip content="Ngành nghề ảnh hưởng đến thuế suất hộ kinh doanh">
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
            {BUSINESS_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dependents */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <span>Người phụ thuộc</span>
            <Tooltip content="Số người phụ thuộc được giảm trừ (chỉ áp dụng cho lương)">
              <span className="text-gray-500 hover:text-gray-700 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </label>
          <input
            type="number"
            value={dependents}
            onChange={(e) => setDependents(Math.max(0, parseInt(e.target.value) || 0))}
            className="input-field"
            min="0"
            max="10"
          />
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasSelfInsurance}
            onChange={(e) => setHasSelfInsurance(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Tự mua BHYT (~1.5 triệu/năm)</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Vùng:</span>
          <select
            value={region}
            onChange={(e) => setRegion(parseInt(e.target.value) as RegionType)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={1}>Vùng 1</option>
            <option value={2}>Vùng 2</option>
            <option value={3}>Vùng 3</option>
            <option value={4}>Vùng 4</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-semibold text-indigo-900 mb-1">Khuyến nghị</h3>
                <p className="text-sm text-indigo-800">{result.summary}</p>
              </div>
            </div>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {/* Employee Card */}
            <div className={`rounded-xl p-4 border-2 transition-all ${getRecommendationColor('employee', result.recommendation === 'employee')}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{BUSINESS_FORM_INFO.employee.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{BUSINESS_FORM_INFO.employee.name}</h3>
                  {result.recommendation === 'employee' && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Khuyến nghị</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Thu nhập gộp:</span>
                  <span className="font-medium">{formatCurrency(result.employee.grossIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thuế TNCN:</span>
                  <span className="text-red-600 font-medium">-{formatCurrency(result.employee.taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">BHXH (NLĐ):</span>
                  <span className="text-orange-600 font-medium">-{formatCurrency(result.employee.insuranceEmployee)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Thực nhận:</span>
                  <span className="text-lg font-bold text-blue-700">{formatCurrency(result.employee.netIncome)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Thuế suất thực tế:</span>
                  <span className="text-gray-600">{formatPercent(result.employee.effectiveTaxRate)}</span>
                </div>
              </div>
            </div>

            {/* Freelancer Card */}
            <div className={`rounded-xl p-4 border-2 transition-all ${getRecommendationColor('freelancer', result.recommendation === 'freelancer')}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{BUSINESS_FORM_INFO.freelancer.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{BUSINESS_FORM_INFO.freelancer.name}</h3>
                  {result.recommendation === 'freelancer' && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Khuyến nghị</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Thu nhập gộp:</span>
                  <span className="font-medium">{formatCurrency(result.freelancer.grossIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thuế 10%:</span>
                  <span className="text-red-600 font-medium">-{formatCurrency(result.freelancer.withholdingTax)}</span>
                </div>
                {result.freelancer.selfInsurance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">BHYT tự mua:</span>
                    <span className="text-orange-600 font-medium">-{formatCurrency(result.freelancer.selfInsurance)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Thực nhận:</span>
                  <span className="text-lg font-bold text-purple-700">{formatCurrency(result.freelancer.netIncome)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Thuế suất thực tế:</span>
                  <span className="text-gray-600">{formatPercent(result.freelancer.effectiveTaxRate)}</span>
                </div>
              </div>

              {/* Savings badge */}
              {result.savingsVsEmployee.freelancer > 0 && (
                <div className="mt-3 p-2 bg-green-50 rounded-lg text-center">
                  <span className="text-sm text-green-700 font-medium">
                    +{formatCurrency(result.savingsVsEmployee.freelancer)} so với lương
                  </span>
                </div>
              )}
            </div>

            {/* Household Business Card */}
            <div className={`rounded-xl p-4 border-2 transition-all ${getRecommendationColor('household', result.recommendation === 'household')}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{BUSINESS_FORM_INFO.household.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{BUSINESS_FORM_INFO.household.name}</h3>
                  {result.recommendation === 'household' && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Khuyến nghị</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Doanh thu:</span>
                  <span className="font-medium">{formatCurrency(result.householdBusiness.grossIncome)}</span>
                </div>
                {result.householdBusiness.isExempt ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thuế:</span>
                    <span className="text-green-600 font-medium">Miễn thuế</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thuế TNCN:</span>
                      <span className="text-red-600 font-medium">-{formatCurrency(result.householdBusiness.pitTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thuế VAT:</span>
                      <span className="text-red-600 font-medium">-{formatCurrency(result.householdBusiness.vatTax)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Thực nhận:</span>
                  <span className="text-lg font-bold text-green-700">{formatCurrency(result.householdBusiness.netIncome)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Thuế suất thực tế:</span>
                  <span className="text-gray-600">{formatPercent(result.householdBusiness.effectiveTaxRate)}</span>
                </div>
              </div>

              {/* Savings badge */}
              {result.savingsVsEmployee.householdBusiness > 0 && (
                <div className="mt-3 p-2 bg-green-50 rounded-lg text-center">
                  <span className="text-sm text-green-700 font-medium">
                    +{formatCurrency(result.savingsVsEmployee.householdBusiness)} so với lương
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pros and Cons */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Employee Pros/Cons */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <span>{BUSINESS_FORM_INFO.employee.icon}</span>
                Ưu/Nhược điểm
              </h4>
              <div className="space-y-2 text-sm">
                {result.employee.prosCons.pros.slice(0, 3).map((pro, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="text-gray-700">{pro}</span>
                  </div>
                ))}
                {result.employee.prosCons.cons.slice(0, 2).map((con, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span className="text-gray-700">{con}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Freelancer Pros/Cons */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <span>{BUSINESS_FORM_INFO.freelancer.icon}</span>
                Ưu/Nhược điểm
              </h4>
              <div className="space-y-2 text-sm">
                {result.freelancer.prosCons.pros.slice(0, 3).map((pro, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="text-gray-700">{pro}</span>
                  </div>
                ))}
                {result.freelancer.prosCons.cons.slice(0, 2).map((con, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span className="text-gray-700">{con}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Household Pros/Cons */}
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <span>{BUSINESS_FORM_INFO.household.icon}</span>
                Ưu/Nhược điểm
              </h4>
              <div className="space-y-2 text-sm">
                {result.householdBusiness.prosCons.pros.slice(0, 3).map((pro, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="text-gray-700">{pro}</span>
                  </div>
                ))}
                {result.householdBusiness.prosCons.cons.slice(0, 2).map((con, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-red-600 mt-0.5">✗</span>
                    <span className="text-gray-700">{con}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* No result placeholder */}
      {!result && (
        <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">Nhập doanh thu/thu nhập năm để so sánh các hình thức kinh doanh</p>
        </div>
      )}

      {/* Legal Note */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Lưu ý quan trọng
        </h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Kết quả chỉ mang tính tham khảo, cần tư vấn chuyên gia trước khi quyết định</li>
          <li>• Thuế suất có thể thay đổi theo quy định mới nhất của pháp luật</li>
          <li>• Hộ kinh doanh được miễn thuế nếu doanh thu ≤ 100 triệu/năm</li>
          <li>• Freelancer có thể quyết toán theo biểu lũy tiến nếu có lợi hơn</li>
          <li>• BHXH là quyền lợi quan trọng, cần cân nhắc kỹ trước khi từ bỏ</li>
        </ul>
      </div>
    </div>
  );
}

export default BusinessFormComparison;
