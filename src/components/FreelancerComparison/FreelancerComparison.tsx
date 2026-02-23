'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  SharedTaxState,
  RegionType,
  getRegionalMinimumWages,
  formatNumber,
  calculateNewTax,
  getInsuranceDetailed,
} from '@/lib/taxCalculator';
import { CurrencyInputIssues, MAX_MONTHLY_INCOME, parseCurrencyInput } from '@/utils/inputSanitizers';
import { FreelancerTabState, FreelancerMode } from '@/lib/snapshotTypes';
import {
  FREELANCER_TAX_RATE,
  IncomeFrequency,
  CreatorIncomeSource,
  CreatorIncomeSourceType,
  CREATOR_INCOME_SOURCE_INFO,
  DEFAULT_USD_EXCHANGE_RATE,
  calculateCreatorTax,
  createDefaultIncomeSource,
} from '@/lib/freelancerCalculator';

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
  // Get date-aware regional minimum wages
  const regionalMinimumWages = useMemo(() => getRegionalMinimumWages(new Date()), []);

  // Mode state
  const [mode, setMode] = useState<FreelancerMode>(tabState?.mode ?? 'simple');

  // Simple mode state
  const [grossIncome, setGrossIncome] = useState(sharedState?.grossIncome || 30_000_000);
  const [frequency, setFrequency] = useState<IncomeFrequency>(tabState?.frequency ?? 'monthly');

  // Creator mode state
  const [creatorIncomeSources, setCreatorIncomeSources] = useState<CreatorIncomeSource[]>(
    tabState?.creatorIncomeSources ?? []
  );
  const [exchangeRate, setExchangeRate] = useState(tabState?.exchangeRate ?? DEFAULT_USD_EXCHANGE_RATE);

  // Shared state
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
    if (tabState) {
      setMode(tabState.mode ?? 'simple');
      setFrequency(tabState.frequency);
      setCreatorIncomeSources(tabState.creatorIncomeSources ?? []);
      setExchangeRate(tabState.exchangeRate ?? DEFAULT_USD_EXCHANGE_RATE);
    }
  }, [tabState]);

  // Save tab state
  const saveTabState = (updates: Partial<FreelancerTabState>) => {
    const newState: FreelancerTabState = {
      mode,
      frequency,
      useNewLaw: true,
      creatorIncomeSources,
      exchangeRate,
      ...updates,
    };
    onTabStateChange?.(newState);
  };

  // ===========================================
  // SIMPLE MODE CALCULATIONS
  // ===========================================
  const monthlyGross = frequency === 'annual' ? grossIncome / 12 : grossIncome;

  const freelancerTax = monthlyGross * FREELANCER_TAX_RATE;
  const freelancerNet = monthlyGross - freelancerTax;

  const simpleTaxResult = calculateNewTax({
    grossIncome: monthlyGross,
    dependents,
    hasInsurance,
    region,
  });

  const simpleInsuranceDetail = hasInsurance
    ? getInsuranceDetailed(monthlyGross, region)
    : { bhxh: 0, bhyt: 0, bhtn: 0, total: 0 };

  const simpleEmployeeInsurance = simpleInsuranceDetail.total;
  const simpleEmployeeTax = simpleTaxResult.taxAmount;
  const simpleEmployeeNet = simpleTaxResult.netIncome;

  const simpleNetDifference = freelancerNet - simpleEmployeeNet;
  const simpleFreelancerBetter = simpleNetDifference > 0;

  // ===========================================
  // CREATOR MODE CALCULATIONS
  // ===========================================
  const creatorResult = useMemo(() => {
    if (mode !== 'creator' || creatorIncomeSources.length === 0) return null;

    return calculateCreatorTax({
      incomeSources: creatorIncomeSources,
      exchangeRate,
      dependents,
      region,
      useNewLaw: true,
      hasInsurance,
    });
  }, [mode, creatorIncomeSources, exchangeRate, dependents, region, hasInsurance]);

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

  const handleModeChange = (newMode: FreelancerMode) => {
    setMode(newMode);
    saveTabState({ mode: newMode });
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
    saveTabState({ frequency: value });
  };

  // Creator mode handlers
  const handleAddIncomeSource = (type: CreatorIncomeSourceType) => {
    const newSource = createDefaultIncomeSource(type);
    const newSources = [...creatorIncomeSources, newSource];
    setCreatorIncomeSources(newSources);
    saveTabState({ creatorIncomeSources: newSources });
  };

  const handleRemoveIncomeSource = (id: string) => {
    const newSources = creatorIncomeSources.filter(s => s.id !== id);
    setCreatorIncomeSources(newSources);
    saveTabState({ creatorIncomeSources: newSources });
  };

  const handleUpdateIncomeSource = (id: string, updates: Partial<CreatorIncomeSource>) => {
    const newSources = creatorIncomeSources.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    setCreatorIncomeSources(newSources);
    saveTabState({ creatorIncomeSources: newSources });
  };

  const handleExchangeRateChange = (value: string) => {
    const parsed = parseCurrencyInput(value, { max: 100_000 });
    const rate = parsed.value || DEFAULT_USD_EXCHANGE_RATE;
    setExchangeRate(rate);
    saveTabState({ exchangeRate: rate });
  };

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        So sánh Freelancer vs Nhân viên
      </h3>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => handleModeChange('simple')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'simple'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Freelancer đơn giản
        </button>
        <button
          onClick={() => handleModeChange('creator')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'creator'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Content Creator
        </button>
      </div>

      {inputWarning && (
        <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {inputWarning}
        </div>
      )}

      {/* Mode: Simple Freelancer */}
      {mode === 'simple' && (
        <SimpleModeUI
          grossIncome={grossIncome}
          frequency={frequency}
          dependents={dependents}
          hasInsurance={hasInsurance}
          region={region}
          regionalMinimumWages={regionalMinimumWages}
          monthlyGross={monthlyGross}
          freelancerTax={freelancerTax}
          freelancerNet={freelancerNet}
          employeeTax={simpleEmployeeTax}
          employeeInsurance={simpleEmployeeInsurance}
          employeeNet={simpleEmployeeNet}
          netDifference={simpleNetDifference}
          freelancerBetter={simpleFreelancerBetter}
          onGrossChange={handleGrossChange}
          onFrequencyChange={handleFrequencyChange}
          onDependentsChange={handleDependentsChange}
          onInsuranceChange={handleInsuranceChange}
          onRegionChange={handleRegionChange}
        />
      )}

      {/* Mode: Content Creator */}
      {mode === 'creator' && (
        <CreatorModeUI
          incomeSources={creatorIncomeSources}
          exchangeRate={exchangeRate}
          dependents={dependents}
          hasInsurance={hasInsurance}
          region={region}
          regionalMinimumWages={regionalMinimumWages}
          result={creatorResult}
          onAddSource={handleAddIncomeSource}
          onRemoveSource={handleRemoveIncomeSource}
          onUpdateSource={handleUpdateIncomeSource}
          onExchangeRateChange={handleExchangeRateChange}
          onDependentsChange={handleDependentsChange}
          onInsuranceChange={handleInsuranceChange}
          onRegionChange={handleRegionChange}
        />
      )}
    </div>
  );
}

// ===========================================
// SIMPLE MODE UI COMPONENT
// ===========================================
interface SimpleModeUIProps {
  grossIncome: number;
  frequency: IncomeFrequency;
  dependents: number;
  hasInsurance: boolean;
  region: RegionType;
  regionalMinimumWages: ReturnType<typeof getRegionalMinimumWages>;
  monthlyGross: number;
  freelancerTax: number;
  freelancerNet: number;
  employeeTax: number;
  employeeInsurance: number;
  employeeNet: number;
  netDifference: number;
  freelancerBetter: boolean;
  onGrossChange: (value: string) => void;
  onFrequencyChange: (value: IncomeFrequency) => void;
  onDependentsChange: (value: number) => void;
  onInsuranceChange: (checked: boolean) => void;
  onRegionChange: (value: RegionType) => void;
}

function SimpleModeUI({
  grossIncome,
  frequency,
  dependents,
  hasInsurance,
  region,
  regionalMinimumWages,
  monthlyGross,
  freelancerTax,
  freelancerNet,
  employeeTax,
  employeeInsurance,
  employeeNet,
  netDifference,
  freelancerBetter,
  onGrossChange,
  onFrequencyChange,
  onDependentsChange,
  onInsuranceChange,
  onRegionChange,
}: SimpleModeUIProps) {
  return (
    <>
      {/* Input Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thu nhập GROSS</label>
          <input
            type="text"
            inputMode="numeric"
            value={grossIncome > 0 ? formatNumber(grossIncome) : ''}
            onChange={(e) => onGrossChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Loại thu nhập</label>
          <select
            value={frequency}
            onChange={(e) => onFrequencyChange(e.target.value as IncomeFrequency)}
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
            onChange={(e) => onDependentsChange(Number(e.target.value))}
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
            onChange={(e) => onRegionChange(Number(e.target.value) as RegionType)}
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
            onChange={(e) => onInsuranceChange(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-sm text-gray-700">NV có đóng BHXH (10.5%)</span>
        </label>
      </div>

      {/* Results */}
      {monthlyGross > 0 && (
        <ComparisonResults
          title1="Freelancer"
          title2="Nhân viên chính thức"
          monthlyGross={monthlyGross}
          result1={{
            tax: freelancerTax,
            net: freelancerNet,
            insurance: 0,
            effectiveRate: 10,
          }}
          result2={{
            tax: employeeTax,
            net: employeeNet,
            insurance: employeeInsurance,
            effectiveRate: monthlyGross > 0 ? (employeeTax / monthlyGross) * 100 : 0,
          }}
          netDifference={netDifference}
          result1Better={freelancerBetter}
          hasInsurance={hasInsurance}
        />
      )}

      {monthlyGross <= 0 && (
        <div className="text-center text-gray-500 py-8">
          Nhập thu nhập GROSS để so sánh
        </div>
      )}
    </>
  );
}

// ===========================================
// CREATOR MODE UI COMPONENT
// ===========================================
interface CreatorModeUIProps {
  incomeSources: CreatorIncomeSource[];
  exchangeRate: number;
  dependents: number;
  hasInsurance: boolean;
  region: RegionType;
  regionalMinimumWages: ReturnType<typeof getRegionalMinimumWages>;
  result: ReturnType<typeof calculateCreatorTax> | null;
  onAddSource: (type: CreatorIncomeSourceType) => void;
  onRemoveSource: (id: string) => void;
  onUpdateSource: (id: string, updates: Partial<CreatorIncomeSource>) => void;
  onExchangeRateChange: (value: string) => void;
  onDependentsChange: (value: number) => void;
  onInsuranceChange: (checked: boolean) => void;
  onRegionChange: (value: RegionType) => void;
}

function CreatorModeUI({
  incomeSources,
  exchangeRate,
  dependents,
  hasInsurance,
  region,
  regionalMinimumWages,
  result,
  onAddSource,
  onRemoveSource,
  onUpdateSource,
  onExchangeRateChange,
  onDependentsChange,
  onInsuranceChange,
  onRegionChange,
}: CreatorModeUIProps) {
  const [showAddSourceMenu, setShowAddSourceMenu] = useState(false);

  const sourceTypes = Object.entries(CREATOR_INCOME_SOURCE_INFO) as [CreatorIncomeSourceType, typeof CREATOR_INCOME_SOURCE_INFO[CreatorIncomeSourceType]][];

  return (
    <>
      {/* Settings Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ giá USD/VND</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(exchangeRate)}
            onChange={(e) => onExchangeRateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Người phụ thuộc</label>
          <select
            value={dependents}
            onChange={(e) => onDependentsChange(Number(e.target.value))}
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
            onChange={(e) => onRegionChange(Number(e.target.value) as RegionType)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {([1, 2, 3, 4] as RegionType[]).map(r => (
              <option key={r} value={r}>{regionalMinimumWages[r].name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Insurance option */}
      <div className="flex flex-wrap gap-6 mb-6 pb-4 border-b border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasInsurance}
            onChange={(e) => onInsuranceChange(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-sm text-gray-700">So sánh với NV có đóng BHXH</span>
        </label>
      </div>

      {/* Income Sources */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800">Nguồn thu nhập</h4>
          <div className="relative">
            <button
              onClick={() => setShowAddSourceMenu(!showAddSourceMenu)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm nguồn thu
            </button>

            {showAddSourceMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
                {sourceTypes.map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => {
                      onAddSource(type);
                      setShowAddSourceMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-800 text-sm">{info.label}</div>
                    <div className="text-xs text-gray-500">{info.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Source List */}
        {incomeSources.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-gray-500">Chưa có nguồn thu nhập nào</p>
            <p className="text-sm text-gray-400">Nhấn &quot;Thêm nguồn thu&quot; để bắt đầu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incomeSources.map((source) => (
              <IncomeSourceCard
                key={source.id}
                source={source}
                exchangeRate={exchangeRate}
                onUpdate={(updates) => onUpdateSource(source.id, updates)}
                onRemove={() => onRemoveSource(source.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {result && result.totalMonthlyGross > 0 && (
        <>
          {/* Income Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Tổng hợp thu nhập</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Thu nhập/tháng</div>
                <div className="font-bold text-lg">{formatNumber(result.totalMonthlyGross)}</div>
              </div>
              <div>
                <div className="text-gray-500">Thu nhập/năm</div>
                <div className="font-bold text-lg">{formatNumber(result.totalAnnualGross)}</div>
              </div>
              <div>
                <div className="text-gray-500">Thu nhập nước ngoài</div>
                <div className="font-medium">{formatNumber(result.foreignIncome)}</div>
              </div>
              <div>
                <div className="text-gray-500">Thu nhập trong nước</div>
                <div className="font-medium">{formatNumber(result.domesticIncome)}</div>
              </div>
            </div>
          </div>

          {/* Comparison Results */}
          <ComparisonResults
            title1="Content Creator"
            title2="Nhân viên chính thức"
            monthlyGross={result.totalMonthlyGross}
            result1={{
              tax: result.totalEstimatedTax / 12,
              net: result.monthlyNet,
              insurance: 0,
              effectiveRate: result.effectiveRate,
            }}
            result2={{
              tax: result.employeeComparison.tax,
              net: result.employeeComparison.net,
              insurance: result.employeeComparison.insurance,
              effectiveRate: result.employeeComparison.effectiveRate,
            }}
            netDifference={result.comparison.netDifference}
            result1Better={result.comparison.creatorBetter}
            hasInsurance={hasInsurance}
          />

          {/* Tax Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <div className="font-medium mb-2">Chi tiết thuế Creator</div>
                <ul className="space-y-1 text-blue-600">
                  <li>Tổng thuế ước tính (10%): <strong>{formatNumber(result.totalEstimatedTax)}</strong> VND/năm</li>
                  <li>Thuế đã khấu trừ tại nguồn: <strong>{formatNumber(result.totalWithheldTax)}</strong> VND</li>
                  <li>Thuế còn phải nộp: <strong>{formatNumber(result.totalTaxOwed)}</strong> VND</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {(!result || result.totalMonthlyGross <= 0) && incomeSources.length > 0 && (
        <div className="text-center text-gray-500 py-8">
          Nhập số tiền cho ít nhất một nguồn thu để xem kết quả
        </div>
      )}
    </>
  );
}

// ===========================================
// INCOME SOURCE CARD
// ===========================================
interface IncomeSourceCardProps {
  source: CreatorIncomeSource;
  exchangeRate: number;
  onUpdate: (updates: Partial<CreatorIncomeSource>) => void;
  onRemove: () => void;
}

function IncomeSourceCard({ source, exchangeRate, onUpdate, onRemove }: IncomeSourceCardProps) {
  const info = CREATOR_INCOME_SOURCE_INFO[source.type];

  // Calculate VND equivalent for display
  const amountVND = source.currency === 'USD'
    ? source.amount * exchangeRate
    : source.amount;

  const handleAmountChange = (value: string) => {
    const parsed = parseCurrencyInput(value, { max: source.currency === 'USD' ? 1_000_000 : MAX_MONTHLY_INCOME });
    onUpdate({ amount: parsed.value });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-medium text-gray-800">{info.label}</div>
          <div className="text-xs text-gray-500">{info.description}</div>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 p-1"
          title="Xóa nguồn thu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Số tiền</label>
          <input
            type="text"
            inputMode="numeric"
            value={source.amount > 0 ? formatNumber(source.amount) : ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Loại tiền</label>
          <select
            value={source.currency}
            onChange={(e) => onUpdate({
              currency: e.target.value as 'VND' | 'USD',
              isForeign: e.target.value === 'USD'
            })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Tần suất</label>
          <select
            value={source.frequency}
            onChange={(e) => onUpdate({ frequency: e.target.value as IncomeFrequency })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="monthly">Hàng tháng</option>
            <option value="project">Theo lần</option>
            <option value="annual">Hàng năm</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Quy đổi VND</label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
            {source.amount > 0 ? formatNumber(amountVND) : '0'}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mt-3">
        {source.isForeign && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
            Nước ngoài
          </span>
        )}
        {info.withheldAtSource && !source.isForeign && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
            Có thể khấu trừ nguồn
          </span>
        )}
      </div>
    </div>
  );
}

// ===========================================
// COMPARISON RESULTS COMPONENT
// ===========================================
interface ComparisonResultsProps {
  title1: string;
  title2: string;
  monthlyGross: number;
  result1: { tax: number; net: number; insurance: number; effectiveRate: number };
  result2: { tax: number; net: number; insurance: number; effectiveRate: number };
  netDifference: number;
  result1Better: boolean;
  hasInsurance: boolean;
}

function ComparisonResults({
  title1,
  title2,
  monthlyGross,
  result1,
  result2,
  netDifference,
  result1Better,
  hasInsurance,
}: ComparisonResultsProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className={`rounded-xl p-4 ${result1Better ? 'bg-green-50 border-2 border-green-400' : 'bg-blue-50 border-2 border-blue-400'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${result1Better ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-lg text-gray-800">
              {result1Better ? `${title1} có lợi hơn` : `${title2} có lợi hơn`}
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
        {/* Result 1 */}
        <div className={`rounded-xl p-4 ${result1Better ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg text-gray-800">{title1}</h4>
            {result1Better && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Có lợi hơn</span>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Thu nhập GROSS</span>
              <span className="font-medium">{formatNumber(monthlyGross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Thuế (10%)</span>
              <span className="text-red-600">-{formatNumber(result1.tax)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
              <span>Thực nhận (NET)</span>
              <span className="text-green-600">{formatNumber(result1.net)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Thuế suất thực tế</span>
              <span>{result1.effectiveRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Thu nhập năm</div>
            <div className="font-bold text-lg">{formatNumber(result1.net * 12)} VND</div>
          </div>
        </div>

        {/* Result 2 */}
        <div className={`rounded-xl p-4 ${!result1Better ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg text-gray-800">{title2}</h4>
            {!result1Better && (
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
              <span className="text-red-600">-{formatNumber(result2.insurance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Thuế TNCN</span>
              <span className="text-red-600">-{formatNumber(result2.tax)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
              <span>Thực nhận (NET)</span>
              <span className="text-green-600">{formatNumber(result2.net)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Thuế suất thực tế</span>
              <span>{result2.effectiveRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Thu nhập năm</div>
            <div className="font-bold text-lg">{formatNumber(result2.net * 12)} VND</div>
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
              <li><strong>Freelancer/Creator phải tự mua BHYT</strong> (~1-2 triệu/tháng)</li>
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
              <li>Freelancer/Creator: Thuế khấu trừ 10% (phương pháp khoán)</li>
              <li>Nhân viên: Thuế lũy tiến 5-35%, được giảm trừ gia cảnh</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
