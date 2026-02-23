'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  SharedTaxState,
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
  getRegionalMinimumWages,
  getMaxUnemploymentInsuranceSalary,
  formatNumber,
} from '@/lib/taxCalculator';
import { CurrencyInputIssues, MAX_MONTHLY_INCOME, parseCurrencyInput } from '@/utils/inputSanitizers';
import { EmployerCostTabState } from '@/lib/snapshotTypes';

// Constants - inline to avoid dependency issues
const MAX_SOCIAL_INSURANCE_SALARY = 46_800_000;

const INSURANCE_RATES = {
  socialInsurance: 0.08,
  healthInsurance: 0.015,
  unemploymentInsurance: 0.01,
};

const EMPLOYER_RATES = {
  socialInsurance: 0.175,
  healthInsurance: 0.03,
  unemploymentInsurance: 0.01,
  unionFee: 0.02,
};

const DEDUCTIONS = { personal: 15_500_000, dependent: 6_200_000 };

const TAX_BRACKETS = [
  { min: 0, max: 10_000_000, rate: 0.05 },
  { min: 10_000_000, max: 30_000_000, rate: 0.1 },
  { min: 30_000_000, max: 60_000_000, rate: 0.2 },
  { min: 60_000_000, max: 100_000_000, rate: 0.3 },
  { min: 100_000_000, max: Infinity, rate: 0.35 },
];

interface EmployerCostCalculatorProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
  tabState?: EmployerCostTabState;
  onTabStateChange?: (state: EmployerCostTabState) => void;
}

export default function EmployerCostCalculator({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: EmployerCostCalculatorProps) {
  // Local state - simple and direct
  const [grossSalary, setGrossSalary] = useState(sharedState?.grossIncome || 30_000_000);
  const [useDeclaredSalary, setUseDeclaredSalary] = useState(sharedState?.declaredSalary !== undefined);
  const [declaredSalary, setDeclaredSalary] = useState(sharedState?.declaredSalary || 0);
  const [dependents, setDependents] = useState(sharedState?.dependents ?? 0);
  const [region, setRegion] = useState<RegionType>(sharedState?.region ?? 1);
  const [insuranceOptions, setInsuranceOptions] = useState<InsuranceOptions>(
    sharedState?.insuranceOptions ?? DEFAULT_INSURANCE_OPTIONS
  );
  const [includeUnionFee, setIncludeUnionFee] = useState(tabState?.includeUnionFee ?? false);
  const [grossWarning, setGrossWarning] = useState<string | null>(null);
  const [declaredWarning, setDeclaredWarning] = useState<string | null>(null);

  // Sync from shared state
  useEffect(() => {
    if (sharedState) {
      if (sharedState.grossIncome > 0) setGrossSalary(sharedState.grossIncome);
      setDependents(sharedState.dependents);
      setRegion(sharedState.region);
      if (sharedState.insuranceOptions) setInsuranceOptions(sharedState.insuranceOptions);

      const hasDeclared = sharedState.declaredSalary !== undefined;
      setUseDeclaredSalary(hasDeclared);
      if (hasDeclared && sharedState.declaredSalary !== undefined) {
        setDeclaredSalary(sharedState.declaredSalary);
      }
    }
  }, [
    sharedState?.grossIncome,
    sharedState?.dependents,
    sharedState?.region,
    sharedState?.insuranceOptions,
    sharedState?.declaredSalary,
  ]);

  // Sync from tab state
  useEffect(() => {
    if (tabState) {
      setIncludeUnionFee(tabState.includeUnionFee);
    }
  }, [tabState?.includeUnionFee]);

  // ========== INLINE CALCULATIONS - Recalculate on every render ==========

  // Get date-aware constants (uses browser's current date)
  const regionalMinimumWages = useMemo(() => getRegionalMinimumWages(new Date()), []);
  const maxUnemploymentInsuranceSalary = useMemo(() => getMaxUnemploymentInsuranceSalary(new Date()), []);

  // Base for insurance calculation
  const insuranceBase = (useDeclaredSalary && declaredSalary > 0) ? declaredSalary : grossSalary;

  // Employee insurance (deducted from salary)
  const bhxhBhytBase = Math.min(insuranceBase, MAX_SOCIAL_INSURANCE_SALARY);
  const maxBhtn = maxUnemploymentInsuranceSalary[region];
  const bhtnBase = Math.min(insuranceBase, maxBhtn);

  const employeeBhxh = insuranceOptions.bhxh ? bhxhBhytBase * INSURANCE_RATES.socialInsurance : 0;
  const employeeBhyt = insuranceOptions.bhyt ? bhxhBhytBase * INSURANCE_RATES.healthInsurance : 0;
  const employeeBhtn = insuranceOptions.bhtn ? bhtnBase * INSURANCE_RATES.unemploymentInsurance : 0;
  const employeeInsuranceTotal = employeeBhxh + employeeBhyt + employeeBhtn;

  // Employer insurance (company pays)
  const employerBhxh = insuranceOptions.bhxh ? bhxhBhytBase * EMPLOYER_RATES.socialInsurance : 0;
  const employerBhyt = insuranceOptions.bhyt ? bhxhBhytBase * EMPLOYER_RATES.healthInsurance : 0;
  const employerBhtn = insuranceOptions.bhtn ? bhtnBase * EMPLOYER_RATES.unemploymentInsurance : 0;
  const employerUnionFee = includeUnionFee ? grossSalary * EMPLOYER_RATES.unionFee : 0;
  const employerInsuranceTotal = employerBhxh + employerBhyt + employerBhtn + employerUnionFee;

  // Tax calculation
  const personalDeduction = DEDUCTIONS.personal;
  const dependentDeduction = dependents * DEDUCTIONS.dependent;
  const taxableIncome = Math.max(0, grossSalary - employeeInsuranceTotal - personalDeduction - dependentDeduction);

  // Calculate tax using brackets
  let tax = 0;
  let remainingIncome = taxableIncome;
  for (const bracket of TAX_BRACKETS) {
    if (remainingIncome <= 0) break;
    const bracketWidth = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remainingIncome, bracketWidth);
    tax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  // Final results
  const employeeNetIncome = grossSalary - employeeInsuranceTotal - tax;
  const totalEmployerCost = grossSalary + employerInsuranceTotal;
  const yearlyEmployerCost = totalEmployerCost * 12;
  const totalCostPercentOfGross = grossSalary > 0 ? (totalEmployerCost / grossSalary) * 100 : 0;

  // ========== HANDLERS ==========

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

  const handleGrossChange = (value: string) => {
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    const numValue = parsed.value;
    setGrossWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
    setGrossSalary(numValue);
    onStateChange?.({ grossIncome: numValue });
  };

  const handleDeclaredChange = (value: string) => {
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    const numValue = parsed.value;
    setDeclaredWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
    setDeclaredSalary(numValue);
    onStateChange?.({ declaredSalary: numValue });
  };

  const handleRegionChange = (value: RegionType) => {
    setRegion(value);
    onStateChange?.({ region: value });
  };

  const handleDependentsChange = (value: number) => {
    setDependents(value);
    onStateChange?.({ dependents: value });
  };

  const handleInsuranceChange = (key: keyof InsuranceOptions, checked: boolean) => {
    const newOptions = { ...insuranceOptions, [key]: checked };
    setInsuranceOptions(newOptions);
    onStateChange?.({ insuranceOptions: newOptions });
  };

  const handleUnionFeeChange = (checked: boolean) => {
    setIncludeUnionFee(checked);
    onTabStateChange?.({ includeUnionFee: checked, useNewLaw: true });
  };

  const handleDeclaredToggle = (checked: boolean) => {
    setUseDeclaredSalary(checked);
    if (!checked) {
      setDeclaredSalary(0);
      onStateChange?.({ declaredSalary: undefined });
    }
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Chi phí nhà tuyển dụng
      </h3>

      {sharedState && (
        <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Dữ liệu được đồng bộ với các tab khác
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="space-y-4">
          {/* Gross Salary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lương GROSS hàng tháng
            </label>
            <input
              type="text"
              value={grossSalary > 0 ? formatNumber(grossSalary) : ''}
              onChange={(e) => handleGrossChange(e.target.value)}
              placeholder="30,000,000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {grossWarning && (
              <p className="text-xs text-amber-600 mt-1">{grossWarning}</p>
            )}
          </div>

          {/* Declared Salary Toggle */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useDeclaredSalary}
                onChange={(e) => handleDeclaredToggle(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Lương đóng BH khác lương thực</span>
            </label>
            {useDeclaredSalary && (
              <>
                <input
                  type="text"
                  value={declaredSalary > 0 ? formatNumber(declaredSalary) : ''}
                  onChange={(e) => handleDeclaredChange(e.target.value)}
                  placeholder="Lương đóng BHXH, BHYT, BHTN"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {declaredWarning && (
                  <p className="text-xs text-amber-600 mt-1">{declaredWarning}</p>
                )}
                <p className="text-xs text-amber-600">BH tính trên mức này - Thuế tính trên lương thực</p>
              </>
            )}
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vùng lương</label>
            <select
              value={region}
              onChange={(e) => handleRegionChange(Number(e.target.value) as RegionType)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {([1, 2, 3, 4] as RegionType[]).map((r) => (
                <option key={r} value={r}>
                  {regionalMinimumWages[r].name} - {formatNumber(regionalMinimumWages[r].wage)} VND
                </option>
              ))}
            </select>
          </div>

          {/* Dependents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ thuộc</label>
            <select
              value={dependents}
              onChange={(e) => handleDependentsChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {[0, 1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} người</option>
              ))}
            </select>
          </div>

          {/* Insurance Options */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="font-medium text-sm text-gray-700 mb-2">Bảo hiểm bắt buộc</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={insuranceOptions.bhxh}
                onChange={(e) => handleInsuranceChange('bhxh', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded"
              />
              <span className="text-sm">BHXH (NLĐ: 8%, DN: 17.5%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={insuranceOptions.bhyt}
                onChange={(e) => handleInsuranceChange('bhyt', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded"
              />
              <span className="text-sm">BHYT (NLĐ: 1.5%, DN: 3%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={insuranceOptions.bhtn}
                onChange={(e) => handleInsuranceChange('bhtn', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded"
              />
              <span className="text-sm">BHTN (NLĐ: 1%, DN: 1%)</span>
            </label>
          </div>

          {/* Union Fee */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeUnionFee}
              onChange={(e) => handleUnionFeeChange(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Phí công đoàn (DN: 2%)</span>
          </label>

        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {grossSalary > 0 ? (
            <>
              {/* Total Cost Highlight */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
                <div className="text-sm opacity-90 mb-1">Tổng chi phí doanh nghiệp</div>
                <div className="text-3xl font-bold">{formatNumber(totalEmployerCost)} VND</div>
                <div className="text-sm opacity-90 mt-1">
                  = {totalCostPercentOfGross.toFixed(1)}% lương GROSS
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="font-medium text-gray-800 mb-3">Chi tiết chi phí</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lương GROSS</span>
                    <span className="font-medium">{formatNumber(grossSalary)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="text-xs text-gray-500 mb-2">BẢO HIỂM PHÍA CÔNG TY</div>
                  </div>
                  {employerBhxh > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>BHXH (17.5%)</span>
                      <span className="text-red-600">+{formatNumber(employerBhxh)}</span>
                    </div>
                  )}
                  {employerBhyt > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>BHYT (3%)</span>
                      <span className="text-red-600">+{formatNumber(employerBhyt)}</span>
                    </div>
                  )}
                  {employerBhtn > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>BHTN (1%)</span>
                      <span className="text-red-600">+{formatNumber(employerBhtn)}</span>
                    </div>
                  )}
                  {employerUnionFee > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Công đoàn (2%)</span>
                      <span className="text-red-600">+{formatNumber(employerUnionFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200 font-medium">
                    <span>Tổng BH công ty</span>
                    <span className="text-red-600">+{formatNumber(employerInsuranceTotal)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300 font-bold text-base">
                    <span>TỔNG CHI PHÍ</span>
                    <span className="text-primary-600">{formatNumber(totalEmployerCost)}</span>
                  </div>
                </div>
              </div>

              {/* Yearly Summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="font-medium text-amber-800 mb-1">Chi phí cả năm</div>
                <div className="text-2xl font-bold text-amber-900">
                  {formatNumber(yearlyEmployerCost)} VND
                </div>
                <div className="text-sm text-amber-700 mt-1">
                  = {formatNumber(totalEmployerCost)} x 12 tháng
                </div>
              </div>

              {/* Employee Perspective */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="font-medium text-blue-800 mb-3">Góc nhìn người lao động</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Lương GROSS nhận</span>
                    <span className="font-medium">{formatNumber(grossSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Bảo hiểm (NLĐ đóng)</span>
                    <span className="text-red-600">-{formatNumber(employeeInsuranceTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Thuế TNCN</span>
                    <span className="text-red-600">-{formatNumber(tax)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200 font-bold">
                    <span className="text-blue-800">Thực nhận (NET)</span>
                    <span className="text-green-600">{formatNumber(employeeNetIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Efficiency Ratio */}
              <div className="bg-gray-100 rounded-xl p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Tỷ lệ hiệu quả</div>
                <div className="text-2xl font-bold text-gray-800">
                  {((employeeNetIncome / totalEmployerCost) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  (NLĐ thực nhận / DN chi trả)
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Nhập lương GROSS để xem chi phí
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-600">
            <div className="font-medium mb-1">Lưu ý về bảo hiểm</div>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>BHXH, BHYT: Giới hạn mức đóng tối đa 20 lần lương cơ sở (46.8 triệu)</li>
              <li>BHTN: Giới hạn 20 lần lương tối thiểu vùng</li>
              <li>Phí công đoàn: 2% không giới hạn, chỉ một số doanh nghiệp có</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
