'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { TAX_METHOD_LABELS, formatRate } from '@/lib/householdBusinessTaxCalculator';
import { getSelfHealthInsuranceAnnual } from '@/lib/freelancerCalculator';
import { formatNumber, parseCurrency, RegionType, CASUAL_WITHHOLDING_RATE } from '@/lib/taxCalculator';
import { parseCurrencyInput, CurrencyInputIssues } from '@/utils/inputSanitizers';
import Tooltip from '@/components/ui/Tooltip';
import { BusinessFormComparisonTabState } from '@/lib/snapshotTypes';

interface BusinessFormComparisonProps {
  tabState?: BusinessFormComparisonTabState;
  onTabStateChange?: (state: BusinessFormComparisonTabState) => void;
}

const DEFAULT_EXPENSE_RATIO = 0.3;

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
  const [expenseRatio, setExpenseRatio] = useState<number>(tabState?.expenseRatio ?? DEFAULT_EXPENSE_RATIO);
  const [revenueWarning, setRevenueWarning] = useState<string | null>(null);

  const [result, setResult] = useState<BusinessFormComparisonResult | null>(null);
  const selfInsuranceAnnual = getSelfHealthInsuranceAnnual();

  // Update parent state
  const updateTabState = useCallback(() => {
    if (onTabStateChange) {
      onTabStateChange({
        annualRevenue: parseCurrency(annualRevenueInput),
        businessCategory,
        region,
        dependents,
        hasSelfInsurance,
        expenseRatio,
      });
    }
  }, [annualRevenueInput, businessCategory, region, dependents, hasSelfInsurance, expenseRatio, onTabStateChange]);

  // Calculate when inputs change
  useEffect(() => {
    const annualRevenue = parseCurrency(annualRevenueInput);

    if (annualRevenue > 0) {
      const input: BusinessFormComparisonInput = {
        annualRevenue,
        expenseRatio,
        businessCategory,
        region,
        dependents,
        hasSelfInsurance,
      };

      setResult(compareBusinessForms(input));
    } else {
      setResult(null);
    }

    updateTabState();
  }, [annualRevenueInput, businessCategory, region, dependents, hasSelfInsurance, expenseRatio, updateTabState]);

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

  const revenue = parseCurrency(annualRevenueInput);

  return (
    <div className="card">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">So sánh hình thức kinh doanh</h2>
        <p className="text-sm text-gray-500">Lương vs Freelancer vs Hộ kinh doanh</p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            inputMode="numeric"
            value={revenue > 0 ? formatNumber(revenue) : ''}
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
            <Tooltip content="Được giảm trừ khi tính thuế tiền lương, tiền công (nhân viên và freelancer); không áp dụng cho thuế hộ kinh doanh">
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
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasSelfInsurance}
            onChange={(e) => setHasSelfInsurance(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            Tự mua BHYT (~{(selfInsuranceAnnual / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} triệu/năm)
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Chi phí tự chịu (freelancer, hộ KD):</span>
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(expenseRatio * 100) || ''}
            placeholder="0"
            onChange={(e) => setExpenseRatio(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) / 100)}
            className="w-16 text-sm border border-gray-300 rounded px-2 py-1"
          />
          <span>% doanh thu</span>
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
          <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="font-semibold text-indigo-900 mb-1">Khuyến nghị</h3>
            <p className="text-sm text-indigo-800">{result.summary}</p>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Employee Card */}
            <div className={`rounded-xl p-4 border-2 transition-all ${getRecommendationColor('employee', result.recommendation === 'employee')}`}>
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">{BUSINESS_FORM_INFO.employee.name}</h3>
                {result.recommendation === 'employee' && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Khuyến nghị</span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Thu nhập gộp:</span>
                  <span className="font-medium">{formatCurrency(result.employee.grossIncome)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Thuế TNCN:</span>
                  <span className="text-red-600 font-medium">-{formatCurrency(result.employee.taxAmount)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">BHXH, BHYT, BHTN (NLĐ):</span>
                  <span className="text-orange-600 font-medium">-{formatCurrency(result.employee.insuranceEmployee)}</span>
                </div>
                <div className="flex justify-between gap-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Thực nhận:</span>
                  <span className="text-lg font-bold text-blue-700">{formatCurrency(result.employee.netIncome)}</span>
                </div>
                <div className="flex justify-between gap-2 text-xs">
                  <span className="text-gray-500">Thuế suất thực tế:</span>
                  <span className="text-gray-600">{formatPercent(result.employee.effectiveTaxRate)}</span>
                </div>
              </div>
            </div>

            {/* Freelancer Card */}
            <div className={`rounded-xl p-4 border-2 transition-all ${getRecommendationColor('freelancer', result.recommendation === 'freelancer')}`}>
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">{BUSINESS_FORM_INFO.freelancer.name}</h3>
                {result.recommendation === 'freelancer' && (
                  <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Khuyến nghị</span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Thu nhập gộp:</span>
                  <span className="font-medium">{formatCurrency(result.freelancer.grossIncome)}</span>
                </div>
                {result.freelancer.expenses > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">Chi phí tự chịu:</span>
                    <span className="text-orange-600 font-medium">-{formatCurrency(result.freelancer.expenses)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Thuế TNCN cả năm (lũy tiến):</span>
                  <span className="text-red-600 font-medium">-{formatCurrency(result.freelancer.finalTax)}</span>
                </div>
                {result.freelancer.selfInsurance > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">BHYT tự mua:</span>
                    <span className="text-orange-600 font-medium">-{formatCurrency(result.freelancer.selfInsurance)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Thực nhận:</span>
                  <span className="text-lg font-bold text-purple-700">{formatCurrency(result.freelancer.netIncome)}</span>
                </div>
                <div className="flex justify-between gap-2 text-xs">
                  <span className="text-gray-500">Thuế suất thực tế:</span>
                  <span className="text-gray-600">{formatPercent(result.freelancer.effectiveTaxRate)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between gap-2">
                    <span>Đã tạm khấu trừ {formatRate(CASUAL_WITHHOLDING_RATE)}:</span>
                    <span>{formatCurrency(result.freelancer.withholdingTax)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>{result.freelancer.settlement >= 0 ? 'Quyết toán nộp thêm:' : 'Quyết toán được hoàn:'}</span>
                    <span className="font-medium">{formatCurrency(Math.abs(result.freelancer.settlement))}</span>
                  </div>
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
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">{BUSINESS_FORM_INFO.household.name}</h3>
                {result.recommendation === 'household' && (
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Khuyến nghị</span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Doanh thu:</span>
                  <span className="font-medium">{formatCurrency(result.householdBusiness.grossIncome)}</span>
                </div>
                {result.householdBusiness.expenses > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">Chi phí:</span>
                    <span className="text-orange-600 font-medium">-{formatCurrency(result.householdBusiness.expenses)}</span>
                  </div>
                )}
                {result.householdBusiness.isExempt ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">Thuế:</span>
                    <span className="text-green-600 font-medium">Không nộp (≤ 1 tỷ/năm)</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">Thuế TNCN:</span>
                      <span className="text-red-600 font-medium">-{formatCurrency(result.householdBusiness.pitTax)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">Thuế GTGT:</span>
                      <span className="text-red-600 font-medium">-{formatCurrency(result.householdBusiness.vatTax)}</span>
                    </div>
                  </>
                )}
                {result.householdBusiness.selfInsurance > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">BHYT tự mua:</span>
                    <span className="text-orange-600 font-medium">-{formatCurrency(result.householdBusiness.selfInsurance)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Thực nhận:</span>
                  <span className="text-lg font-bold text-green-700">{formatCurrency(result.householdBusiness.netIncome)}</span>
                </div>
                <div className="flex justify-between gap-2 text-xs">
                  <span className="text-gray-500">Thuế suất thực tế:</span>
                  <span className="text-gray-600">{formatPercent(result.householdBusiness.effectiveTaxRate)}</span>
                </div>
                {!result.householdBusiness.isExempt && (
                  <div className="text-xs text-gray-500">
                    TNCN theo: {TAX_METHOD_LABELS[result.householdBusiness.method]}
                  </div>
                )}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              ['employee', result.employee.prosCons, 'bg-blue-50', 'text-blue-900'],
              ['freelancer', result.freelancer.prosCons, 'bg-purple-50', 'text-purple-900'],
              ['household', result.householdBusiness.prosCons, 'bg-green-50', 'text-green-900'],
            ] as const).map(([form, prosCons, bg, titleColor]) => (
              <div key={form} className={`${bg} rounded-lg p-4`}>
                <h4 className={`font-semibold ${titleColor} mb-3`}>
                  {BUSINESS_FORM_INFO[form].name}: ưu/nhược điểm
                </h4>
                <div className="space-y-2 text-sm">
                  {prosCons.pros.slice(0, 3).map((pro, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">{pro}</span>
                    </div>
                  ))}
                  {prosCons.cons.slice(0, 2).map((con, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-red-600 mt-0.5">✗</span>
                      <span className="text-gray-700">{con}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
          <li>• Kết quả chỉ mang tính tham khảo, cần tư vấn chuyên gia trước khi quyết định.</li>
          <li>• Hộ kinh doanh có doanh thu ≤ 1 tỷ/năm không nộp TNCN, GTGT (Luật 09/2026/QH16, NĐ 141/2026/NĐ-CP) nhưng vẫn phải thông báo doanh thu chậm nhất 31/01 năm sau; trên 1 tỷ: TNCN theo tỷ lệ % (doanh thu đến 3 tỷ) hoặc 15–20% lợi nhuận, GTGT trên toàn bộ doanh thu.</li>
          <li>• Freelancer (không đăng ký kinh doanh) bị tạm khấu trừ 10% khoản chi từ 5 triệu đồng/lần; cuối năm quyết toán theo biểu lũy tiến 5 bậc, được giảm trừ gia cảnh, không được trừ chi phí (NĐ 253/2026/NĐ-CP Điều 8.2.c). Giả định mỗi lần chi trả từ 5 triệu đồng.</li>
          <li>• Doanh nghiệp có tổng doanh thu năm ≤ 1 tỷ được miễn thuế TNDN từ kỳ tính thuế 2026 (Luật 09/2026/QH16 Điều 3, NĐ 141/2026/NĐ-CP).</li>
          <li>• BHXH là quyền lợi quan trọng, cần cân nhắc kỹ trước khi từ bỏ.</li>
        </ul>
      </div>
    </div>
  );
}

export default BusinessFormComparison;
