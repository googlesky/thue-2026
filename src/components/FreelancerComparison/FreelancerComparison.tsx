'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  SharedTaxState,
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
  REGIONAL_MINIMUM_WAGES,
  formatNumber,
  parseCurrency,
} from '@/lib/taxCalculator';
import {
  calculateFreelancerComparison,
  IncomeFrequency,
  FREELANCER_PROS,
  FREELANCER_CONS,
  EMPLOYEE_PROS,
  EMPLOYEE_CONS,
} from '@/lib/freelancerCalculator';
import { FreelancerTabState } from '@/lib/snapshotTypes';

interface FreelancerComparisonProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
  tabState?: FreelancerTabState;
  onTabStateChange?: (state: FreelancerTabState) => void;
}

export default function FreelancerComparison({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: FreelancerComparisonProps) {
  const isLocalChange = useRef(false);

  const [grossIncome, setGrossIncome] = useState(sharedState?.grossIncome || 30_000_000);
  const [frequency, setFrequency] = useState<IncomeFrequency>(tabState?.frequency ?? 'monthly');
  const [dependents, setDependents] = useState(sharedState?.dependents || 0);
  const [hasInsurance, setHasInsurance] = useState(sharedState?.hasInsurance ?? true);
  const [region, setRegion] = useState<RegionType>(sharedState?.region || 1);
  const [useNewLaw, setUseNewLaw] = useState(tabState?.useNewLaw ?? true);
  const [showDetails, setShowDetails] = useState(false);

  // Sync từ shared state
  useEffect(() => {
    if (sharedState && !isLocalChange.current) {
      if (sharedState.grossIncome > 0) {
        setGrossIncome(sharedState.grossIncome);
      }
      setDependents(sharedState.dependents);
      setHasInsurance(sharedState.hasInsurance);
      setRegion(sharedState.region);
    }
    isLocalChange.current = false;
  }, [sharedState]);

  // Sync from tab state
  useEffect(() => {
    if (tabState) {
      setFrequency(tabState.frequency);
      setUseNewLaw(tabState.useNewLaw);
    }
  }, [tabState]);

  // Tính toán kết quả
  const result = useMemo(() => {
    if (grossIncome <= 0) return null;

    return calculateFreelancerComparison({
      grossIncome,
      frequency,
      dependents,
      hasInsurance,
      insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
      region,
      useNewLaw,
    });
  }, [grossIncome, frequency, dependents, hasInsurance, region, useNewLaw]);

  const handleGrossChange = (value: string) => {
    const numValue = parseCurrency(value);
    isLocalChange.current = true;
    setGrossIncome(numValue);
    onStateChange?.({ grossIncome: numValue });
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        So sánh Freelancer vs Nhân viên
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

      {/* Input Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thu nhập GROSS</label>
          <input
            type="text"
            value={grossIncome > 0 ? formatNumber(grossIncome) : ''}
            onChange={(e) => handleGrossChange(e.target.value)}
            placeholder="30,000,000"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Loại thu nhập</label>
          <select
            value={frequency}
            onChange={(e) => {
              const value = e.target.value as IncomeFrequency;
              setFrequency(value);
              onTabStateChange?.({ frequency: value, useNewLaw });
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
            onChange={(e) => {
              const value = parseInt(e.target.value);
              isLocalChange.current = true;
              setDependents(value);
              onStateChange?.({ dependents: value });
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
            onChange={(e) => {
              const value = parseInt(e.target.value) as RegionType;
              isLocalChange.current = true;
              setRegion(value);
              onStateChange?.({ region: value });
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {Object.entries(REGIONAL_MINIMUM_WAGES).map(([key, info]) => (
              <option key={key} value={key}>{info.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Options Row */}
      <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasInsurance}
            onChange={(e) => {
              setHasInsurance(e.target.checked);
              onStateChange?.({ hasInsurance: e.target.checked });
            }}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">NV có đóng BHXH (10.5%)</span>
        </label>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Biểu thuế:</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!useNewLaw}
              onChange={() => {
                setUseNewLaw(false);
                onTabStateChange?.({ frequency, useNewLaw: false });
              }}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">Hiện hành</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={useNewLaw}
              onChange={() => {
                setUseNewLaw(true);
                onTabStateChange?.({ frequency, useNewLaw: true });
              }}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">Mới 2026</span>
          </label>
        </div>
      </div>

      {/* Results */}
      {result ? (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className={`rounded-xl p-4 ${result.comparison.freelancerBetter ? 'bg-green-50 border-2 border-green-400' : 'bg-blue-50 border-2 border-blue-400'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${result.comparison.freelancerBetter ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-lg text-gray-800">
                  {result.comparison.freelancerBetter ? 'Freelancer có lợi hơn' : 'Nhân viên chính thức có lợi hơn'}
                </div>
                <div className="text-sm text-gray-600">
                  Chênh lệch: <span className="font-bold">{formatNumber(Math.abs(result.comparison.netDifference))}</span> VND/tháng
                  ({formatNumber(Math.abs(result.comparison.annualDifference))} VND/năm)
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Freelancer */}
            <div className={`rounded-xl p-4 ${result.comparison.freelancerBetter ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-gray-800">Freelancer</h4>
                {result.comparison.freelancerBetter && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Có lợi hơn</span>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Thu nhập GROSS</span>
                  <span className="font-medium">{formatNumber(result.gross)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thuế khấu trừ (10%)</span>
                  <span className="text-red-600">-{formatNumber(result.freelancer.tax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                  <span>Thực nhận (NET)</span>
                  <span className="text-green-600">{formatNumber(result.freelancer.net)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Thuế suất thực tế</span>
                  <span>{result.freelancer.effectiveRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Thu nhập năm</div>
                <div className="font-bold text-lg">{formatNumber(result.freelancer.annualNet)} VND</div>
              </div>
            </div>

            {/* Employee */}
            <div className={`rounded-xl p-4 ${!result.comparison.freelancerBetter ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-gray-800">Nhân viên chính thức</h4>
                {!result.comparison.freelancerBetter && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Có lợi hơn</span>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Lương GROSS</span>
                  <span className="font-medium">{formatNumber(result.gross)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bảo hiểm (10.5%)</span>
                  <span className="text-red-600">-{formatNumber(result.employee.insurance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thuế TNCN</span>
                  <span className="text-red-600">-{formatNumber(result.employee.tax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                  <span>Thực nhận (NET)</span>
                  <span className="text-green-600">{formatNumber(result.employee.net)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Thuế suất thực tế</span>
                  <span>{result.employee.effectiveRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Thu nhập năm</div>
                <div className="font-bold text-lg">{formatNumber(result.employee.annualNet)} VND</div>
              </div>
            </div>
          </div>

          {/* Break-even Point */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <div>
                <div className="font-medium text-amber-800 mb-1">Điểm hòa vốn (tiền mặt)</div>
                <div className="text-sm text-amber-700">
                  Với điều kiện hiện tại ({dependents} người phụ thuộc, {hasInsurance ? 'có' : 'không'} BHXH),
                  mức lương hòa vốn là khoảng <span className="font-bold">{formatNumber(result.comparison.breakEvenGross)}</span> VND/tháng.
                </div>
                <div className="text-sm text-amber-600 mt-2">
                  • Dưới mức này: Nhân viên có lợi hơn (do được giảm trừ gia cảnh)<br />
                  • Trên mức này: Freelancer có lợi hơn (do thuế suất cố định 10%)
                </div>
                <div className="text-xs text-amber-500 mt-2 italic">
                  * Đây là điểm hòa vốn về tiền mặt, chưa tính chi phí tự mua BHYT và giá trị lương hưu mà nhân viên được hưởng.
                </div>
              </div>
            </div>
          </div>

          {/* Pros/Cons Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2"
          >
            {showDetails ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Ẩn ưu/nhược điểm
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Xem ưu/nhược điểm chi tiết
              </>
            )}
          </button>

          {/* Pros/Cons Table */}
          {showDetails && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Freelancer Pros/Cons */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-800">Freelancer</h4>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-700 font-medium mb-2">ƯU ĐIỂM</div>
                  <ul className="space-y-1">
                    {FREELANCER_PROS.map((pro, i) => (
                      <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="text-green-500">+</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs text-red-700 font-medium mb-2">NHƯỢC ĐIỂM</div>
                  <ul className="space-y-1">
                    {FREELANCER_CONS.map((con, i) => (
                      <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                        <span className="text-red-500">-</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Employee Pros/Cons */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-800">Nhân viên chính thức</h4>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-700 font-medium mb-2">ƯU ĐIỂM</div>
                  <ul className="space-y-1">
                    {EMPLOYEE_PROS.map((pro, i) => (
                      <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="text-green-500">+</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs text-red-700 font-medium mb-2">NHƯỢC ĐIỂM</div>
                  <ul className="space-y-1">
                    {EMPLOYEE_CONS.map((con, i) => (
                      <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                        <span className="text-red-500">-</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          Nhập thu nhập GROSS để so sánh
        </div>
      )}

      {/* Warning Box - Important Disclaimer */}
      <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-red-700">
            <div className="font-medium mb-1">Lưu ý quan trọng khi so sánh</div>
            <ul className="list-disc list-inside space-y-1 text-red-600">
              <li><strong>Freelancer phải tự mua BHYT</strong> (~1-2 triệu/tháng) - chưa được tính vào so sánh</li>
              <li><strong>Nhân viên được DN đóng 21.5% bảo hiểm</strong> (lương hưu, thai sản, ốm đau) - giá trị dài hạn lớn</li>
              <li><strong>Điểm hòa vốn thực tế cao hơn</strong> khi tính đủ các chi phí ẩn của freelancer</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-600">
            <div className="font-medium mb-1">Về thuế suất</div>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>Freelancer/Contractor: Thuế khấu trừ 10% trên tổng thu nhập (phương pháp khoán)</li>
              <li>Nhân viên: Thuế lũy tiến 5-35%, được giảm trừ gia cảnh và bảo hiểm</li>
              <li>Freelancer có thể chọn phương pháp khác: 50% chi phí + thuế lũy tiến (nếu có lợi hơn)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
