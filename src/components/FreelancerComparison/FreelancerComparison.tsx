'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  SharedTaxState,
  RegionType,
  getRegionalMinimumWages,
  formatNumber,
  parseCurrency,
  calculateOldTax,
  calculateNewTax,
  getInsuranceDetailed,
  isCurrentlyIn2026,
} from '@/lib/taxCalculator';
import { FreelancerTabState } from '@/lib/snapshotTypes';

const FREELANCER_TAX_RATE = 0.10;

interface FreelancerComparisonProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
  tabState?: FreelancerTabState;
  onTabStateChange?: (state: FreelancerTabState) => void;
}

type IncomeFrequency = 'monthly' | 'project' | 'annual';

export default function FreelancerComparison({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: FreelancerComparisonProps) {
  // Get date-aware regional minimum wages
  const regionalMinimumWages = useMemo(() => getRegionalMinimumWages(new Date()), []);

  // Local state - simple and direct
  const [grossIncome, setGrossIncome] = useState(sharedState?.grossIncome || 30_000_000);
  const [frequency, setFrequency] = useState<IncomeFrequency>(tabState?.frequency ?? 'monthly');
  const [dependents, setDependents] = useState(sharedState?.dependents ?? 0);
  const [hasInsurance, setHasInsurance] = useState(sharedState?.hasInsurance ?? true);
  const [region, setRegion] = useState<RegionType>(sharedState?.region ?? 1);
  // Auto-detect based on current date (if in 2026, default to new law)
  const [useNewLaw, setUseNewLaw] = useState(() => tabState?.useNewLaw ?? isCurrentlyIn2026());

  // Sync from shared state (one-way, only on mount or when sharedState changes externally)
  useEffect(() => {
    if (sharedState) {
      if (sharedState.grossIncome > 0) setGrossIncome(sharedState.grossIncome);
      setDependents(sharedState.dependents);
      setHasInsurance(sharedState.hasInsurance);
      setRegion(sharedState.region);
    }
  }, [sharedState?.grossIncome, sharedState?.dependents, sharedState?.hasInsurance, sharedState?.region]);

  // Sync from tab state
  useEffect(() => {
    if (tabState) {
      setFrequency(tabState.frequency);
      setUseNewLaw(tabState.useNewLaw);
    }
  }, [tabState?.frequency, tabState?.useNewLaw]);

  // Normalize income to monthly
  const monthlyGross = frequency === 'annual' ? grossIncome / 12 : grossIncome;

  // Calculate Freelancer (simple 10% tax)
  const freelancerTax = monthlyGross * FREELANCER_TAX_RATE;
  const freelancerNet = monthlyGross - freelancerTax;

  // Calculate Employee
  const taxResult = useNewLaw
    ? calculateNewTax({
        grossIncome: monthlyGross,
        dependents,
        hasInsurance,
        region,
      })
    : calculateOldTax({
        grossIncome: monthlyGross,
        dependents,
        hasInsurance,
        region,
      });

  const insuranceDetail = hasInsurance
    ? getInsuranceDetailed(monthlyGross, region)
    : { bhxh: 0, bhyt: 0, bhtn: 0, total: 0 };

  const employeeInsurance = insuranceDetail.total;
  const employeeTax = taxResult.taxAmount;
  const employeeNet = taxResult.netIncome;

  // Comparison
  const netDifference = freelancerNet - employeeNet;
  const freelancerBetter = netDifference > 0;

  // Handlers with state sync
  const handleGrossChange = (value: string) => {
    const num = parseCurrency(value);
    setGrossIncome(num);
    onStateChange?.({ grossIncome: num });
  };

  const handleDependentsChange = (value: number) => {
    setDependents(value);
    onStateChange?.({ dependents: value });
  };

  const handleInsuranceChange = (checked: boolean) => {
    setHasInsurance(checked);
    onStateChange?.({ hasInsurance: checked });
  };

  const handleRegionChange = (value: RegionType) => {
    setRegion(value);
    onStateChange?.({ region: value });
  };

  const handleFrequencyChange = (value: IncomeFrequency) => {
    setFrequency(value);
    onTabStateChange?.({ frequency: value, useNewLaw });
  };

  const handleLawChange = (newLaw: boolean) => {
    setUseNewLaw(newLaw);
    onTabStateChange?.({ frequency, useNewLaw: newLaw });
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        So sánh Freelancer vs Nhân viên
      </h3>

      {/* Input Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thu nhập GROSS</label>
          <input
            type="text"
            value={grossIncome > 0 ? formatNumber(grossIncome) : ''}
            onChange={(e) => handleGrossChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Loại thu nhập</label>
          <select
            value={frequency}
            onChange={(e) => handleFrequencyChange(e.target.value as IncomeFrequency)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="monthly">Hàng tháng</option>
            <option value="project">Theo dự án</option>
            <option value="annual">Hàng năm</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ thuộc</label>
          <select
            value={dependents}
            onChange={(e) => handleDependentsChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {[0, 1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n} người</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vùng lương</label>
          <select
            value={region}
            onChange={(e) => handleRegionChange(Number(e.target.value) as RegionType)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {([1, 2, 3, 4] as RegionType[]).map(r => (
              <option key={r} value={r}>{regionalMinimumWages[r].name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Options Row */}
      <div className="flex flex-wrap gap-6 mb-6 pb-4 border-b border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasInsurance}
            onChange={(e) => handleInsuranceChange(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-sm text-gray-700">NV có đóng BHXH (10.5%)</span>
        </label>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Biểu thuế:</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!useNewLaw}
              onChange={() => handleLawChange(false)}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">Hiện hành</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={useNewLaw}
              onChange={() => handleLawChange(true)}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">Mới 2026</span>
          </label>
        </div>
      </div>

      {/* Results */}
      {monthlyGross > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className={`rounded-xl p-4 ${freelancerBetter ? 'bg-green-50 border-2 border-green-400' : 'bg-blue-50 border-2 border-blue-400'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${freelancerBetter ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-lg text-gray-800">
                  {freelancerBetter ? 'Freelancer có lợi hơn' : 'Nhân viên chính thức có lợi hơn'}
                </div>
                <div className="text-sm text-gray-600">
                  Chênh lệch: <span className="font-bold">{formatNumber(Math.abs(netDifference))}</span> VND/tháng
                  ({formatNumber(Math.abs(netDifference * 12))} VND/năm)
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Freelancer */}
            <div className={`rounded-xl p-4 ${freelancerBetter ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-gray-800">Freelancer</h4>
                {freelancerBetter && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Có lợi hơn</span>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Thu nhập GROSS</span>
                  <span className="font-medium">{formatNumber(monthlyGross)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thuế khấu trừ (10%)</span>
                  <span className="text-red-600">-{formatNumber(freelancerTax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                  <span>Thực nhận (NET)</span>
                  <span className="text-green-600">{formatNumber(freelancerNet)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Thuế suất thực tế</span>
                  <span>10.0%</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Thu nhập năm</div>
                <div className="font-bold text-lg">{formatNumber(freelancerNet * 12)} VND</div>
              </div>
            </div>

            {/* Employee */}
            <div className={`rounded-xl p-4 ${!freelancerBetter ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-gray-800">Nhân viên chính thức</h4>
                {!freelancerBetter && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Có lợi hơn</span>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Lương GROSS</span>
                  <span className="font-medium">{formatNumber(monthlyGross)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bảo hiểm ({hasInsurance ? '10.5%' : '0%'})</span>
                  <span className="text-red-600">-{formatNumber(employeeInsurance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thuế TNCN</span>
                  <span className="text-red-600">-{formatNumber(employeeTax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                  <span>Thực nhận (NET)</span>
                  <span className="text-green-600">{formatNumber(employeeNet)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Thuế suất thực tế</span>
                  <span>{monthlyGross > 0 ? ((employeeTax / monthlyGross) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Thu nhập năm</div>
                <div className="font-bold text-lg">{formatNumber(employeeNet * 12)} VND</div>
              </div>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-red-700">
                <div className="font-medium mb-1">Lưu ý quan trọng</div>
                <ul className="list-disc list-inside space-y-1 text-red-600">
                  <li><strong>Freelancer phải tự mua BHYT</strong> (~1-2 triệu/tháng)</li>
                  <li><strong>NV được DN đóng thêm 21.5% BH</strong> (lương hưu, thai sản)</li>
                  <li><strong>So sánh này chỉ tính tiền mặt</strong>, chưa tính giá trị dài hạn</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-gray-600">
                <div className="font-medium mb-1">Về thuế suất</div>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>Freelancer: Thuế khấu trừ 10% (phương pháp khoán)</li>
                  <li>Nhân viên: Thuế lũy tiến 5-35%, được giảm trừ gia cảnh</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {monthlyGross <= 0 && (
        <div className="text-center text-gray-500 py-8">
          Nhập thu nhập GROSS để so sánh
        </div>
      )}
    </div>
  );
}
