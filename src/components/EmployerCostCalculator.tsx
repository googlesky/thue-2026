'use client';

import { useState, useEffect } from 'react';
import {
  SharedTaxState,
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
  REGIONAL_MINIMUM_WAGES,
  EMPLOYER_INSURANCE_RATES,
  getFullEmployerCostResult,
  formatNumber,
  parseCurrency,
  AllowancesState,
  DEFAULT_ALLOWANCES,
} from '@/lib/taxCalculator';
import { EmployerCostTabState } from '@/lib/snapshotTypes';

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
  // Local state
  const [grossSalary, setGrossSalary] = useState(sharedState?.grossIncome || 30_000_000);
  const [useDeclaredSalary, setUseDeclaredSalary] = useState(sharedState?.declaredSalary !== undefined);
  const [declaredSalary, setDeclaredSalary] = useState(sharedState?.declaredSalary || 0);
  const [dependents, setDependents] = useState(sharedState?.dependents ?? 0);
  const [region, setRegion] = useState<RegionType>(sharedState?.region ?? 1);
  const [insuranceOptions, setInsuranceOptions] = useState<InsuranceOptions>(
    sharedState?.insuranceOptions ?? DEFAULT_INSURANCE_OPTIONS
  );
  const [allowances, setAllowances] = useState<AllowancesState>(
    sharedState?.allowances ?? DEFAULT_ALLOWANCES
  );
  const [includeUnionFee, setIncludeUnionFee] = useState(tabState?.includeUnionFee ?? false);
  const [useNewLaw, setUseNewLaw] = useState(tabState?.useNewLaw ?? false);

  // Sync from shared state
  useEffect(() => {
    if (sharedState) {
      if (sharedState.grossIncome > 0) setGrossSalary(sharedState.grossIncome);
      setDependents(sharedState.dependents);
      setRegion(sharedState.region);
      if (sharedState.insuranceOptions) setInsuranceOptions(sharedState.insuranceOptions);
      if (sharedState.allowances) setAllowances(sharedState.allowances);

      // Sync declared salary
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
    sharedState?.allowances,
    sharedState?.declaredSalary,
  ]);

  // Sync from tab state
  useEffect(() => {
    if (tabState) {
      setIncludeUnionFee(tabState.includeUnionFee);
      setUseNewLaw(tabState.useNewLaw);
    }
  }, [tabState?.includeUnionFee, tabState?.useNewLaw]);

  // Reset declared salary when all insurance is toggled off
  const hasInsurance = insuranceOptions.bhxh || insuranceOptions.bhyt || insuranceOptions.bhtn;
  useEffect(() => {
    if (!hasInsurance && useDeclaredSalary) {
      setUseDeclaredSalary(false);
      setDeclaredSalary(0);
      onStateChange?.({ declaredSalary: undefined });
    }
  }, [hasInsurance, useDeclaredSalary, onStateChange]);

  // Direct calculation - no useMemo
  const result = grossSalary > 0
    ? getFullEmployerCostResult({
        grossIncome: grossSalary,
        declaredSalary: (useDeclaredSalary && declaredSalary > 0) ? declaredSalary : undefined,
        dependents,
        region,
        insuranceOptions,
        includeUnionFee,
        useNewLaw,
        allowances,
      })
    : null;

  // Handlers
  const handleGrossChange = (value: string) => {
    const numValue = parseCurrency(value);
    setGrossSalary(numValue);
    onStateChange?.({ grossIncome: numValue });
  };

  const handleDeclaredChange = (value: string) => {
    const numValue = parseCurrency(value);
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
    onTabStateChange?.({ includeUnionFee: checked, useNewLaw });
  };

  const handleLawChange = (newLaw: boolean) => {
    setUseNewLaw(newLaw);
    onTabStateChange?.({ includeUnionFee, useNewLaw: newLaw });
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Chi phí nhà tuyển dụng
      </h3>

      {/* Sync indicator */}
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
          </div>

          {/* Declared Salary Toggle */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useDeclaredSalary}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseDeclaredSalary(checked);
                  if (!checked) {
                    setDeclaredSalary(0);
                    onStateChange?.({ declaredSalary: undefined });
                  }
                }}
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
                <p className="text-xs text-amber-600">BH tính trên mức này • Thuế tính trên lương thực</p>
              </>
            )}
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vùng lương</label>
            <select
              value={region}
              onChange={(e) => handleRegionChange(parseInt(e.target.value) as RegionType)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.entries(REGIONAL_MINIMUM_WAGES).map(([key, info]) => (
                <option key={key} value={Number(key)}>
                  {info.name} - {formatNumber(info.wage)} VND
                </option>
              ))}
            </select>
          </div>

          {/* Dependents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ thuộc</label>
            <select
              value={dependents}
              onChange={(e) => handleDependentsChange(parseInt(e.target.value))}
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

          {/* Tax Law Toggle */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-sm text-gray-600">Biểu thuế:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!useNewLaw}
                onChange={() => handleLawChange(false)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">Hiện hành (7 bậc)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={useNewLaw}
                onChange={() => handleLawChange(true)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">Mới 2026 (5 bậc)</span>
            </label>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Total Cost Highlight */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
                <div className="text-sm opacity-90 mb-1">Tổng chi phí doanh nghiệp</div>
                <div className="text-3xl font-bold">{formatNumber(result.totalEmployerCost)} VND</div>
                <div className="text-sm opacity-90 mt-1">
                  = {result.totalCostPercentOfGross.toFixed(1)}% lương GROSS
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="font-medium text-gray-800 mb-3">Chi tiết chi phí</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lương GROSS</span>
                    <span className="font-medium">{formatNumber(result.grossSalary)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="text-xs text-gray-500 mb-2">BẢO HIỂM PHÍA CÔNG TY</div>
                  </div>
                  {result.employerInsurance.bhxh > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>BHXH ({(EMPLOYER_INSURANCE_RATES.socialInsurance * 100).toFixed(1)}%)</span>
                      <span className="text-red-600">+{formatNumber(result.employerInsurance.bhxh)}</span>
                    </div>
                  )}
                  {result.employerInsurance.bhyt > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>BHYT ({(EMPLOYER_INSURANCE_RATES.healthInsurance * 100).toFixed(1)}%)</span>
                      <span className="text-red-600">+{formatNumber(result.employerInsurance.bhyt)}</span>
                    </div>
                  )}
                  {result.employerInsurance.bhtn > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>BHTN ({(EMPLOYER_INSURANCE_RATES.unemploymentInsurance * 100).toFixed(1)}%)</span>
                      <span className="text-red-600">+{formatNumber(result.employerInsurance.bhtn)}</span>
                    </div>
                  )}
                  {result.employerInsurance.unionFee > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Công đoàn ({(EMPLOYER_INSURANCE_RATES.unionFee * 100).toFixed(1)}%)</span>
                      <span className="text-red-600">+{formatNumber(result.employerInsurance.unionFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200 font-medium">
                    <span>Tổng BH công ty</span>
                    <span className="text-red-600">+{formatNumber(result.employerInsurance.total)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300 font-bold text-base">
                    <span>TỔNG CHI PHÍ</span>
                    <span className="text-primary-600">{formatNumber(result.totalEmployerCost)}</span>
                  </div>
                </div>
              </div>

              {/* Yearly Summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="font-medium text-amber-800 mb-1">Chi phí cả năm</div>
                <div className="text-2xl font-bold text-amber-900">
                  {formatNumber(result.yearlyEmployerCost)} VND
                </div>
                <div className="text-sm text-amber-700 mt-1">
                  = {formatNumber(result.totalEmployerCost)} × 12 tháng
                </div>
              </div>

              {/* Employee Perspective */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="font-medium text-blue-800 mb-3">Góc nhìn người lao động</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Lương GROSS nhận</span>
                    <span className="font-medium">{formatNumber(result.grossSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Bảo hiểm (NLĐ đóng)</span>
                    <span className="text-red-600">-{formatNumber(result.employeeInsurance.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Thuế TNCN</span>
                    <span className="text-red-600">-{formatNumber(result.employeeTax)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200 font-bold">
                    <span className="text-blue-800">Thực nhận (NET)</span>
                    <span className="text-green-600">{formatNumber(result.employeeNetIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Efficiency Ratio */}
              <div className="bg-gray-100 rounded-xl p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Tỷ lệ hiệu quả</div>
                <div className="text-2xl font-bold text-gray-800">
                  {((result.employeeNetIncome / result.totalEmployerCost) * 100).toFixed(1)}%
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
