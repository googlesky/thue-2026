'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  SharedTaxState,
  RegionType,
  getRegionalMinimumWages,
  formatNumber,
  calculateNewTax,
  getCasualWithholdingThreshold,
  CASUAL_INCOME_NO_SETTLEMENT_LIMIT,
  DEFAULT_INSURANCE_OPTIONS,
} from '@/lib/taxCalculator';
import { CurrencyInputIssues, MAX_MONTHLY_INCOME, parseCurrencyInput } from '@/utils/inputSanitizers';
import { FreelancerTabState, DEFAULT_FREELANCER_STATE } from '@/lib/snapshotTypes';
import { IncomeFrequency, calculateFreelancerTax, getSelfHealthInsuranceAnnual } from '@/lib/freelancerCalculator';

interface FreelancerComparisonProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
  tabState?: FreelancerTabState;
  onTabStateChange?: (state: FreelancerTabState) => void;
}

// Link/snapshot cũ có thể còn 'project' (trước đây được tính như theo tháng)
const toFrequency = (f?: IncomeFrequency): IncomeFrequency => (f === 'annual' ? 'annual' : 'monthly');

const NO_INSURANCE = { bhxh: false, bhyt: false, bhtn: false };

const formatPct = (value: number) =>
  `${value.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export default function FreelancerComparison({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: FreelancerComparisonProps) {
  // Get date-aware regional minimum wages
  const regionalMinimumWages = useMemo(() => getRegionalMinimumWages(new Date()), []);

  const [grossIncome, setGrossIncome] = useState(sharedState?.grossIncome || 30_000_000);
  const [frequency, setFrequency] = useState<IncomeFrequency>(toFrequency(tabState?.frequency));
  const [dependents, setDependents] = useState(sharedState?.dependents ?? 0);
  const [hasInsurance, setHasInsurance] = useState(sharedState?.hasInsurance ?? true);
  const [region, setRegion] = useState<RegionType>(sharedState?.region ?? 1);
  const [inputWarning, setInputWarning] = useState<string | null>(null);

  // Sync from shared state
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
    if (tabState) setFrequency(toFrequency(tabState.frequency));
  }, [tabState]);

  // ===========================================
  // CALCULATIONS
  // ===========================================
  const monthlyGross = frequency === 'annual' ? grossIncome / 12 : grossIncome;
  const annualGross = frequency === 'annual' ? grossIncome : grossIncome * 12;

  // Freelancer: tạm khấu trừ 10% khi nhận (giả định nhận hằng tháng), quyết toán lũy tiến cả năm
  const freelancerTax = calculateFreelancerTax(annualGross, dependents);
  const freelancerMonthlyTax = freelancerTax.finalTax / 12;
  const freelancerNet = monthlyGross - freelancerMonthlyTax;

  // Engine tính BH theo insuranceOptions: dùng lựa chọn chi tiết của tab chính (nếu có)
  const insuranceOptions = hasInsurance ? (sharedState?.insuranceOptions ?? DEFAULT_INSURANCE_OPTIONS) : NO_INSURANCE;
  const employeeTaxResult = calculateNewTax({
    grossIncome: monthlyGross,
    dependents,
    insuranceOptions,
    region,
  });
  const employeeInsurance = employeeTaxResult.insuranceDeduction;

  const netDifference = freelancerNet - employeeTaxResult.netIncome;

  // ===========================================
  // HANDLERS
  // ===========================================
  const buildWarning = (issues: CurrencyInputIssues, max?: number): string | null => {
    const messages: string[] = [];
    if (issues.negative) messages.push('Không hỗ trợ số âm.');
    if (issues.decimal) messages.push('Không hỗ trợ số thập phân, đã bỏ phần lẻ.');
    if (issues.overflow && max) messages.push(`Giá trị quá lớn, giới hạn tối đa ${formatNumber(max)} VNĐ.`);
    return messages.length ? messages.join(' ') : null;
  };

  const handleGrossChange = (value: string) => {
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    setInputWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
    setGrossIncome(parsed.value);
    onStateChange?.({ grossIncome: parsed.value });
  };

  const handleDependentsChange = (value: number) => {
    setDependents(value);
    onStateChange?.({ dependents: value });
  };

  const handleInsuranceChange = (checked: boolean) => {
    setHasInsurance(checked);
    // Engine tính BH theo insuranceOptions (ưu tiên hơn hasInsurance): đồng bộ cả hai cho các tab dùng chung
    onStateChange?.({
      hasInsurance: checked,
      insuranceOptions: checked ? DEFAULT_INSURANCE_OPTIONS : NO_INSURANCE,
    });
  };

  const handleRegionChange = (value: RegionType) => {
    setRegion(value);
    onStateChange?.({ region: value });
  };

  const handleFrequencyChange = (value: IncomeFrequency) => {
    setFrequency(value);
    onTabStateChange?.({ ...DEFAULT_FREELANCER_STATE, ...tabState, mode: 'simple', frequency: value, useNewLaw: true });
  };

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        So sánh Freelancer vs Nhân viên
      </h3>

      <p className="mb-6 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        Thu nhập từ YouTube, TikTok và các nền tảng số là thu nhập kinh doanh (Luật 109/2025/QH15 Điều 3.1.d), không tính như tiền công: xem tab{' '}
        <a href="#content-creator" className="font-medium text-primary-700 underline">Content Creator</a>.
      </p>

      {inputWarning && (
        <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {inputWarning}
        </div>
      )}

      {/* Input Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thu nhập GROSS</label>
          <input
            type="text"
            inputMode="numeric"
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
          <span className="text-sm text-gray-700">NV có đóng BHXH (10,5%)</span>
        </label>
      </div>

      {/* Results */}
      {monthlyGross > 0 ? (
        <ComparisonResults
          monthlyGross={monthlyGross}
          freelancer={{
            tax: freelancerMonthlyTax,
            net: freelancerNet,
            effectiveRate: annualGross > 0 ? (freelancerTax.finalTax / annualGross) * 100 : 0,
            withheldMonthly: freelancerTax.withheld / 12,
            settlement: freelancerTax.settlement,
          }}
          employee={{
            tax: employeeTaxResult.taxAmount,
            net: employeeTaxResult.netIncome,
            insurance: employeeInsurance,
            effectiveRate: (employeeTaxResult.taxAmount / monthlyGross) * 100,
          }}
          netDifference={netDifference}
        />
      ) : (
        <div className="text-center text-gray-500 py-8">
          Nhập thu nhập GROSS để so sánh
        </div>
      )}
    </div>
  );
}

// ===========================================
// COMPARISON RESULTS COMPONENT
// ===========================================
interface ComparisonResultsProps {
  monthlyGross: number;
  freelancer: { tax: number; net: number; effectiveRate: number; withheldMonthly: number; settlement: number };
  employee: { tax: number; net: number; insurance: number; effectiveRate: number };
  netDifference: number;
}

function ComparisonResults({
  monthlyGross,
  freelancer,
  employee,
  netDifference,
}: ComparisonResultsProps) {
  const freelancerBetter = netDifference > 0;
  const selfInsurance = getSelfHealthInsuranceAnnual();

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className={`rounded-xl p-4 ${freelancerBetter ? 'bg-green-50 border-2 border-green-400' : 'bg-blue-50 border-2 border-blue-400'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${freelancerBetter ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Freelancer */}
        <div className={`rounded-xl p-4 ${freelancerBetter ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg text-gray-800">Freelancer</h4>
            {freelancerBetter && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Có lợi hơn</span>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Thu nhập GROSS</span>
              <span className="font-medium">{formatNumber(monthlyGross)}</span>
            </div>
            <div className="flex justify-between gap-2 text-gray-500">
              <span>Tạm khấu trừ 10% khi nhận</span>
              <span>{formatNumber(freelancer.withheldMonthly)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Thuế TNCN (quyết toán lũy tiến)</span>
              <span className="text-red-600">-{formatNumber(freelancer.tax)}</span>
            </div>
            <div className="flex justify-between gap-2 pt-2 border-t border-gray-200 font-bold">
              <span>Thực nhận (NET)</span>
              <span className="text-green-600">{formatNumber(freelancer.net)}</span>
            </div>
            <div className="flex justify-between gap-2 text-gray-500">
              <span>Thuế suất thực tế</span>
              <span>{formatPct(freelancer.effectiveRate)}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Thu nhập năm</div>
              <div className="font-bold text-lg">{formatNumber(freelancer.net * 12)} VND</div>
            </div>
            <div className="text-sm text-gray-600">
              Quyết toán cuối năm: {freelancer.settlement >= 0 ? 'nộp thêm' : 'được hoàn'}{' '}
              <span className="font-semibold">{formatNumber(Math.abs(freelancer.settlement))}</span> VND
            </div>
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
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Lương GROSS</span>
              <span className="font-medium">{formatNumber(monthlyGross)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Bảo hiểm bắt buộc (NLĐ)</span>
              <span className="text-red-600">-{formatNumber(employee.insurance)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Thuế TNCN</span>
              <span className="text-red-600">-{formatNumber(employee.tax)}</span>
            </div>
            <div className="flex justify-between gap-2 pt-2 border-t border-gray-200 font-bold">
              <span>Thực nhận (NET)</span>
              <span className="text-green-600">{formatNumber(employee.net)}</span>
            </div>
            <div className="flex justify-between gap-2 text-gray-500">
              <span>Thuế suất thực tế</span>
              <span>{formatPct(employee.effectiveRate)}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Thu nhập năm</div>
            <div className="font-bold text-lg">{formatNumber(employee.net * 12)} VND</div>
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
              <li><strong>Freelancer phải tự mua BHYT</strong> (~{formatNumber(selfInsurance)} VND/năm theo hộ gia đình)</li>
              <li><strong>NV được DN đóng thêm 21,5% BH</strong> (lương hưu, thai sản)</li>
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
              <li>
                Freelancer (không đăng ký kinh doanh): thù lao là tiền công; tổ chức chi trả tạm khấu trừ 10% khoản từ{' '}
                {formatNumber(getCasualWithholdingThreshold())} VND/lần, cuối năm quyết toán theo biểu lũy tiến 5 bậc, được giảm trừ gia cảnh,
                không được trừ chi phí (NĐ 253/2026/NĐ-CP Điều 8.2.c, 50.2). Giả định nhận thù lao hằng tháng.
              </li>
              <li>
                Có lương chính và thu nhập vãng lai bình quân không quá {formatNumber(CASUAL_INCOME_NO_SETTLEMENT_LIMIT)} VND/tháng đã khấu trừ 10%:
                không phải quyết toán phần thu nhập này.
              </li>
              <li>Nhân viên: Thuế lũy tiến 5–35%, được giảm trừ gia cảnh và bảo hiểm bắt buộc</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
