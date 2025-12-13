'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SharedTaxState,
  formatNumber,
  formatCurrency,
  parseCurrency,
  DEFAULT_INSURANCE_OPTIONS,
  RegionType,
  InsuranceOptions,
} from '@/lib/taxCalculator';
import {
  SettlementYear,
  MonthlyIncomeEntry,
  DependentInfo,
  AnnualSettlementResult,
  calculateAnnualSettlement,
  createDefaultMonthlyIncome,
  generateDependentId,
  estimateMonthlyTax,
  getLawForMonth,
} from '@/lib/annualSettlementCalculator';
import {
  AnnualSettlementTabState,
  DEFAULT_ANNUAL_SETTLEMENT_STATE,
} from '@/lib/snapshotTypes';
import { getInsuranceDetailed } from '@/lib/taxCalculator';
import Tooltip from '@/components/ui/Tooltip';

interface AnnualSettlementProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
  tabState?: AnnualSettlementTabState;
  onTabStateChange?: (state: AnnualSettlementTabState) => void;
}

const MONTH_NAMES = [
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
  'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
];

const FULL_MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

// Info icon component for tooltips
function InfoIcon() {
  return (
    <span className="text-gray-400 hover:text-gray-600 cursor-help">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  );
}

export default function AnnualSettlement({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: AnnualSettlementProps) {
  const isLocalChange = useRef(false);

  // Local state
  const [year, setYear] = useState<SettlementYear>(tabState?.year ?? 2025);
  const [useAverageSalary, setUseAverageSalary] = useState(tabState?.useAverageSalary ?? true);
  const [averageSalary, setAverageSalary] = useState(
    tabState?.averageSalary ?? sharedState?.grossIncome ?? 0
  );
  const [monthlyIncome, setMonthlyIncome] = useState<MonthlyIncomeEntry[]>(
    tabState?.monthlyIncome ?? createDefaultMonthlyIncome(0, 0, 0)
  );
  const [dependents, setDependents] = useState<DependentInfo[]>(tabState?.dependents ?? []);
  const [charitableContributions, setCharitableContributions] = useState(
    tabState?.charitableContributions ?? 0
  );
  const [voluntaryPension, setVoluntaryPension] = useState(tabState?.voluntaryPension ?? 0);
  const [insuranceOptions, setInsuranceOptions] = useState<InsuranceOptions>(
    tabState?.insuranceOptions ?? sharedState?.insuranceOptions ?? DEFAULT_INSURANCE_OPTIONS
  );
  const [region, setRegion] = useState<RegionType>(
    tabState?.region ?? sharedState?.region ?? 1
  );
  const [manualTaxPaidMode, setManualTaxPaidMode] = useState(tabState?.manualTaxPaidMode ?? false);
  const [manualTaxPaid, setManualTaxPaid] = useState(tabState?.manualTaxPaid ?? 0);
  const [showMonthlyDetails, setShowMonthlyDetails] = useState(false);

  // Sync from shared state
  useEffect(() => {
    if (sharedState && !isLocalChange.current) {
      if (averageSalary === 0 && sharedState.grossIncome > 0) {
        setAverageSalary(sharedState.grossIncome);
      }
      if (sharedState.insuranceOptions) {
        setInsuranceOptions(sharedState.insuranceOptions);
      }
      if (sharedState.region) {
        setRegion(sharedState.region);
      }
    }
    isLocalChange.current = false;
  }, [sharedState, averageSalary]);

  // Sync from tab state (only when it's an external change, not from local edits)
  const prevTabStateRef = useRef(tabState);
  useEffect(() => {
    // Skip if this is a local change propagating back
    if (isLocalChange.current) {
      prevTabStateRef.current = tabState;
      return;
    }
    // Only sync if tabState actually changed from external source
    if (tabState && tabState !== prevTabStateRef.current) {
      setYear(tabState.year);
      setUseAverageSalary(tabState.useAverageSalary);
      setAverageSalary(tabState.averageSalary);
      setMonthlyIncome(tabState.monthlyIncome);
      setDependents(tabState.dependents);
      setCharitableContributions(tabState.charitableContributions);
      setVoluntaryPension(tabState.voluntaryPension);
      setInsuranceOptions(tabState.insuranceOptions);
      setRegion(tabState.region);
      setManualTaxPaidMode(tabState.manualTaxPaidMode);
      setManualTaxPaid(tabState.manualTaxPaid);
      prevTabStateRef.current = tabState;
    }
  }, [tabState]);

  // Notify parent of tab state changes
  const updateTabState = useCallback(
    (updates: Partial<AnnualSettlementTabState>) => {
      onTabStateChange?.({
        year,
        useAverageSalary,
        averageSalary,
        monthlyIncome,
        dependents,
        charitableContributions,
        voluntaryPension,
        insuranceOptions,
        region,
        manualTaxPaidMode,
        manualTaxPaid,
        ...updates,
      });
    },
    [year, useAverageSalary, averageSalary, monthlyIncome, dependents,
      charitableContributions, voluntaryPension, insuranceOptions, region,
      manualTaxPaidMode, manualTaxPaid, onTabStateChange]
  );

  // Helper function to count dependents for a specific month
  const getDependentCountForMonth = useCallback((month: number): number => {
    return dependents.filter(d => d.fromMonth <= month && d.toMonth >= month).length;
  }, [dependents]);

  // When averageSalary changes, update monthly income
  useEffect(() => {
    if (useAverageSalary && averageSalary > 0) {
      const newMonthlyIncome = createDefaultMonthlyIncome(averageSalary, 0, 0);
      // Calculate estimated tax for each month
      const insurance = getInsuranceDetailed(averageSalary, region, insuranceOptions);
      newMonthlyIncome.forEach(entry => {
        const law = getLawForMonth(year, entry.month);
        const dependentCountForMonth = getDependentCountForMonth(entry.month);
        entry.taxPaid = estimateMonthlyTax(averageSalary, dependentCountForMonth, insurance.total, law);
      });
      setMonthlyIncome(newMonthlyIncome);
    }
  }, [useAverageSalary, averageSalary, year, region, insuranceOptions, dependents, getDependentCountForMonth]);

  // Calculate result
  const result = useMemo<AnnualSettlementResult | null>(() => {
    const totalIncome = monthlyIncome.reduce((sum, m) => sum + m.grossSalary, 0);
    if (totalIncome <= 0) return null;

    return calculateAnnualSettlement({
      year,
      monthlyIncome,
      dependents,
      charitableContributions,
      voluntaryPension,
      insuranceOptions,
      region,
      manualTaxPaid: manualTaxPaidMode ? manualTaxPaid : undefined,
    });
  }, [year, monthlyIncome, dependents, charitableContributions, voluntaryPension,
    insuranceOptions, region, manualTaxPaidMode, manualTaxPaid]);

  // Handle year change
  const handleYearChange = (newYear: SettlementYear) => {
    setYear(newYear);
    updateTabState({ year: newYear });
  };

  // Handle average salary change
  const handleAverageSalaryChange = (value: string) => {
    const numValue = parseCurrency(value);
    isLocalChange.current = true;
    setAverageSalary(numValue);
    updateTabState({ averageSalary: numValue });
    onStateChange?.({ grossIncome: numValue });
  };

  // Handle monthly income change
  const handleMonthlyIncomeChange = (month: number, field: keyof MonthlyIncomeEntry, value: number) => {
    const newMonthlyIncome = monthlyIncome.map(entry =>
      entry.month === month ? { ...entry, [field]: value } : entry
    );
    setMonthlyIncome(newMonthlyIncome);
    updateTabState({ monthlyIncome: newMonthlyIncome });
  };

  // Add dependent
  const addDependent = () => {
    const newDep: DependentInfo = {
      id: generateDependentId(),
      name: `NPT ${dependents.length + 1}`,
      fromMonth: 1,
      toMonth: 12,
    };
    const newDependents = [...dependents, newDep];
    setDependents(newDependents);
    updateTabState({ dependents: newDependents });
  };

  // Update dependent
  const updateDependent = (id: string, updates: Partial<DependentInfo>) => {
    const newDependents = dependents.map(d =>
      d.id === id ? { ...d, ...updates } : d
    );
    setDependents(newDependents);
    updateTabState({ dependents: newDependents });
  };

  // Remove dependent
  const removeDependent = (id: string) => {
    const newDependents = dependents.filter(d => d.id !== id);
    setDependents(newDependents);
    updateTabState({ dependents: newDependents });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Quyết Toán Thuế TNCN</h2>
            <p className="text-sm text-gray-500 mt-1">
              Tính thuế TNCN cả năm và so sánh với thuế đã tạm nộp
            </p>
          </div>
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <Tooltip content="Năm 2025 áp dụng luật cũ, năm 2026 là năm chuyển tiếp (T1-T6 luật cũ, T7-T12 luật mới)">
              <InfoIcon />
            </Tooltip>
            <div className="flex gap-2">
              <button
                onClick={() => handleYearChange(2025)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  year === 2025
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Năm 2025
              </button>
              <button
                onClick={() => handleYearChange(2026)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  year === 2026
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Năm 2026
              </button>
            </div>
          </div>
        </div>

        {/* Year info */}
        {year === 2026 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <span className="text-amber-600">&#9888;</span>
              <div className="text-amber-800">
                <strong>Năm chuyển tiếp:</strong> T1-T6/2026 áp dụng luật cũ (giảm trừ 11tr/4.4tr),
                T7-T12/2026 áp dụng luật mới (giảm trừ 15.5tr/6.2tr)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column - Input */}
        <div className="space-y-6">
          {/* Income input */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Thu nhập</h3>

            {/* Input mode toggle */}
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useAverageSalary}
                  onChange={() => {
                    setUseAverageSalary(true);
                    updateTabState({ useAverageSalary: true });
                  }}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">Lương trung bình</span>
                <Tooltip content="Nhập lương trung bình tháng thay vì từng tháng riêng biệt">
                  <InfoIcon />
                </Tooltip>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useAverageSalary}
                  onChange={() => {
                    setUseAverageSalary(false);
                    updateTabState({ useAverageSalary: false });
                  }}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">Nhập từng tháng</span>
                <Tooltip content="Nhập chi tiết lương, thưởng, thuế đã nộp mỗi tháng">
                  <InfoIcon />
                </Tooltip>
              </label>
            </div>

            {useAverageSalary ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lương GROSS trung bình/tháng
                </label>
                <input
                  type="text"
                  value={formatNumber(averageSalary)}
                  onChange={(e) => handleAverageSalaryChange(e.target.value)}
                  className="input-field"
                  placeholder="30,000,000"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-2">Tháng</th>
                      <th className="py-2 px-2">Lương GROSS</th>
                      <th className="py-2 px-2">Thưởng</th>
                      <th className="py-2 pl-2">Thuế đã nộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyIncome.map((entry) => (
                      <tr key={entry.month} className="border-t border-gray-100">
                        <td className="py-2 pr-2 font-medium">{MONTH_NAMES[entry.month - 1]}</td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={formatNumber(entry.grossSalary)}
                            onChange={(e) => handleMonthlyIncomeChange(entry.month, 'grossSalary', parseCurrency(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={formatNumber(entry.bonus)}
                            onChange={(e) => handleMonthlyIncomeChange(entry.month, 'bonus', parseCurrency(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right"
                          />
                        </td>
                        <td className="py-2 pl-2">
                          <input
                            type="text"
                            value={formatNumber(entry.taxPaid)}
                            onChange={(e) => handleMonthlyIncomeChange(entry.month, 'taxPaid', parseCurrency(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Dependents */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800">Người phụ thuộc</h3>
                <Tooltip content="NPT có thể được giảm trừ theo từng tháng đăng ký">
                  <InfoIcon />
                </Tooltip>
              </div>
              <button
                onClick={addDependent}
                className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                + Thêm NPT
              </button>
            </div>

            {dependents.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Chưa có người phụ thuộc</p>
            ) : (
              <div className="space-y-3">
                {dependents.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={dep.name}
                      onChange={(e) => updateDependent(dep.id, { name: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                      placeholder="Tên NPT"
                    />
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Từ</span>
                      <select
                        value={dep.fromMonth}
                        onChange={(e) => updateDependent(dep.id, { fromMonth: Number(e.target.value) })}
                        className="px-2 py-1 border border-gray-200 rounded"
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i} value={i + 1}>{name}</option>
                        ))}
                      </select>
                      <span className="text-gray-500">đến</span>
                      <select
                        value={dep.toMonth}
                        onChange={(e) => updateDependent(dep.id, { toMonth: Number(e.target.value) })}
                        className="px-2 py-1 border border-gray-200 rounded"
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i} value={i + 1}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => removeDependent(dep.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other deductions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Giảm trừ khác</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <span>Từ thiện, nhân đạo (VND/năm)</span>
                  <Tooltip content="Khoản đóng góp được giảm trừ không giới hạn">
                    <InfoIcon />
                  </Tooltip>
                </label>
                <input
                  type="text"
                  value={formatNumber(charitableContributions)}
                  onChange={(e) => {
                    const value = parseCurrency(e.target.value);
                    setCharitableContributions(value);
                    updateTabState({ charitableContributions: value });
                  }}
                  className="input-field"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <span>Quỹ hưu trí tự nguyện (VND/năm, tối đa 12 triệu)</span>
                  <Tooltip content="Tối đa 12 triệu/năm được giảm trừ">
                    <InfoIcon />
                  </Tooltip>
                </label>
                <input
                  type="text"
                  value={formatNumber(voluntaryPension)}
                  onChange={(e) => {
                    const value = Math.min(parseCurrency(e.target.value), 12_000_000);
                    setVoluntaryPension(value);
                    updateTabState({ voluntaryPension: value });
                  }}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Manual tax paid override */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800">Thuế đã tạm nộp</h3>
                <Tooltip content="Tổng thuế khấu trừ hàng tháng, so sánh với thuế thực tế cả năm">
                  <InfoIcon />
                </Tooltip>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualTaxPaidMode}
                  onChange={(e) => {
                    setManualTaxPaidMode(e.target.checked);
                    updateTabState({ manualTaxPaidMode: e.target.checked });
                  }}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-600">Nhập thủ công</span>
                <Tooltip content="Nhập tổng thuế đã nộp thay vì tính từ bảng chi tiết">
                  <InfoIcon />
                </Tooltip>
              </label>
            </div>

            {manualTaxPaidMode ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tổng thuế đã tạm nộp cả năm
                </label>
                <input
                  type="text"
                  value={formatNumber(manualTaxPaid)}
                  onChange={(e) => {
                    const value = parseCurrency(e.target.value);
                    setManualTaxPaid(value);
                    updateTabState({ manualTaxPaid: value });
                  }}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Tự động tính từ thuế khấu trừ hàng tháng:{' '}
                <span className="font-medium text-gray-700">
                  {formatCurrency(monthlyIncome.reduce((sum, m) => sum + m.taxPaid, 0))}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Right column - Result */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Summary */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Kết quả quyết toán</h3>

                <div className="space-y-4">
                  {/* Income summary */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tổng thu nhập GROSS</span>
                      <span className="font-medium">{formatCurrency(result.totalGrossIncome)}</span>
                    </div>
                    {result.totalBonusIncome > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Thưởng</span>
                        <span className="font-medium">{formatCurrency(result.totalBonusIncome)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Tổng thu nhập chịu thuế</span>
                      <span>{formatCurrency(result.totalTaxableIncome)}</span>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Giảm trừ bản thân</span>
                      <span className="font-medium text-red-600">-{formatCurrency(result.totalPersonalDeduction)}</span>
                    </div>
                    {result.totalDependentDeduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Giảm trừ người phụ thuộc</span>
                        <span className="font-medium text-red-600">-{formatCurrency(result.totalDependentDeduction)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bảo hiểm bắt buộc</span>
                      <span className="font-medium text-red-600">-{formatCurrency(result.totalInsuranceDeduction)}</span>
                    </div>
                    {result.totalOtherDeduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Giảm trừ khác</span>
                        <span className="font-medium text-red-600">-{formatCurrency(result.totalOtherDeduction)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Tổng giảm trừ</span>
                      <span className="text-red-600">-{formatCurrency(result.totalDeductions)}</span>
                    </div>
                  </div>

                  {/* Tax calculation */}
                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Thu nhập tính thuế</span>
                      <span>{formatCurrency(result.totalAssessableIncome)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg">
                      <span>Thuế TNCN phải nộp cả năm</span>
                      <span className="text-primary-600">{formatCurrency(result.annualTaxDue)}</span>
                    </div>
                  </div>

                  {/* Comparison */}
                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thuế đã tạm nộp</span>
                      <span className="font-medium">{formatCurrency(result.totalTaxPaid)}</span>
                    </div>
                  </div>

                  {/* Settlement result */}
                  <div className={`p-4 rounded-lg ${
                    result.settlementType === 'pay'
                      ? 'bg-red-50 border border-red-200'
                      : result.settlementType === 'refund'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">
                        {result.settlementType === 'pay'
                          ? 'Số thuế còn phải nộp thêm'
                          : result.settlementType === 'refund'
                          ? 'Số thuế được hoàn lại'
                          : 'Không phát sinh chênh lệch'}
                      </div>
                      <div className={`text-2xl font-bold ${
                        result.settlementType === 'pay'
                          ? 'text-red-600'
                          : result.settlementType === 'refund'
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`}>
                        {result.settlementType === 'even'
                          ? '0 VND'
                          : formatCurrency(Math.abs(result.difference))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Period breakdown for transition year */}
              {result.isTransitionYear && result.periods && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Chi tiết theo giai đoạn</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {result.periods.map((period) => (
                      <div key={period.periodName} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-800">{period.periodName}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            period.law === 'old'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-primary-100 text-primary-700'
                          }`}>
                            Luật {period.law === 'old' ? 'cũ' : 'mới'}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Thu nhập</span>
                            <span>{formatCurrency(period.totalTaxableIncome)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Giảm trừ</span>
                            <span className="text-red-600">-{formatCurrency(period.totalDeductions)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">TN tính thuế</span>
                            <span>{formatCurrency(period.assessableIncome)}</span>
                          </div>
                          <div className="flex justify-between font-medium pt-2 border-t">
                            <span>Thuế phải nộp</span>
                            <span className="text-primary-600">{formatCurrency(period.taxDue)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly details toggle */}
              <div className="card">
                <button
                  onClick={() => setShowMonthlyDetails(!showMonthlyDetails)}
                  className="flex items-center justify-between w-full"
                >
                  <h3 className="text-lg font-semibold text-gray-800">Chi tiết hàng tháng</h3>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${showMonthlyDetails ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showMonthlyDetails && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="py-2 pr-2">Tháng</th>
                          <th className="py-2 px-2 text-right">GROSS</th>
                          <th className="py-2 px-2 text-right">Giảm trừ</th>
                          <th className="py-2 px-2 text-right">TN tính thuế</th>
                          <th className="py-2 pl-2 text-right">Thuế nộp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.monthlyBreakdown.map((month) => (
                          <tr key={month.month} className="border-b border-gray-100">
                            <td className="py-2 pr-2">
                              <span className="font-medium">{month.monthName}</span>
                              {year === 2026 && (
                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                  month.law === 'old' ? 'bg-gray-100' : 'bg-primary-50 text-primary-700'
                                }`}>
                                  {month.law === 'old' ? 'Cũ' : 'Mới'}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right">{formatNumber(month.gross + month.bonus)}</td>
                            <td className="py-2 px-2 text-right text-red-600">
                              -{formatNumber(month.insurance + month.personalDeduction + month.dependentDeduction)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              {formatNumber(Math.max(0, month.taxableIncome - month.insurance - month.personalDeduction - month.dependentDeduction))}
                            </td>
                            <td className="py-2 pl-2 text-right font-medium">{formatNumber(month.taxPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium bg-gray-50">
                          <td className="py-2 pr-2">Tổng</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(result.totalTaxableIncome)}</td>
                          <td className="py-2 px-2 text-right text-red-600">-{formatCurrency(result.totalDeductions)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(result.totalAssessableIncome)}</td>
                          <td className="py-2 pl-2 text-right">{formatCurrency(result.totalTaxPaid)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Settlement info */}
              <div className="card bg-blue-50 border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Lưu ý về quyết toán thuế</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Thời hạn quyết toán năm {year}: 1/1 - 31/3/{year + 1}</li>
                  <li>• Nếu có nhiều nguồn thu nhập, cần khai báo tất cả</li>
                  <li>• Thuế hoàn lại sẽ được chuyển vào tài khoản ngân hàng đã đăng ký</li>
                  <li>• Cần lưu giữ chứng từ trong 5 năm để đối chiếu khi cần</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">Nhập thông tin thu nhập để xem kết quả quyết toán</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
