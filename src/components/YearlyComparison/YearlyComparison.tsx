'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  YearScenario,
  TwoYearResult,
  PresetConfig,
  PRESETS,
  findPreset,
  createUniformMonths,
  calculateTwoYearStrategy,
  compareStrategies,
  StrategyComparison as StrategyComparisonType,
} from '@/lib/yearlyTaxCalculator';
import { RegionType, SharedTaxState, formatNumber } from '@/lib/taxCalculator';
import { CurrencyInputIssues, MAX_MONTHLY_INCOME, parseCurrencyInput } from '@/utils/inputSanitizers';
import ScenarioPresets, { PresetDescription } from './ScenarioPresets';
import ScenarioColumn from './ScenarioColumn';
import StrategyComparison from './StrategyComparison';
import { YearlyComparisonTabState } from '@/lib/snapshotTypes';
import Tooltip from '@/components/ui/Tooltip';

interface YearlyComparisonProps {
  sharedState?: SharedTaxState;
  onStateChange?: (state: Partial<SharedTaxState>) => void;
  tabState?: YearlyComparisonTabState;
  onTabStateChange?: (state: YearlyComparisonTabState) => void;
}

const DEFAULT_SALARY = 30_000_000;

export default function YearlyComparison({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: YearlyComparisonProps) {
  // Preset hoặc custom
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    findPreset(tabState ? tabState.selectedPresetId : 'normal')?.id ?? null
  );

  // Common params
  const [monthlySalary, setMonthlySalary] = useState(sharedState?.grossIncome || DEFAULT_SALARY);
  const [bonusAmount, setBonusAmount] = useState(
    tabState?.bonusAmount ?? sharedState?.grossIncome ?? DEFAULT_SALARY
  );
  const [dependents, setDependents] = useState(sharedState?.dependents || 0);
  const [hasInsurance, setHasInsurance] = useState(sharedState?.hasInsurance ?? true);
  const [region, setRegion] = useState<RegionType>(sharedState?.region || 1);
  const [inputWarning, setInputWarning] = useState<string | null>(null);

  // Custom scenarios (khi không dùng preset)
  const [customScenario2025, setCustomScenario2025] = useState<YearScenario | null>(null);
  const [customScenario2026, setCustomScenario2026] = useState<YearScenario | null>(null);

  // All strategies for comparison
  const [allStrategies, setAllStrategies] = useState<TwoYearResult[]>([]);
  const [comparison, setComparison] = useState<StrategyComparisonType | null>(null);

  // Sync from shared state
  useEffect(() => {
    if (sharedState) {
      if (sharedState.grossIncome > 0 && sharedState.grossIncome !== monthlySalary) {
        setMonthlySalary(sharedState.grossIncome);
        setBonusAmount(sharedState.grossIncome);
      }
      setDependents(sharedState.dependents);
      setHasInsurance(sharedState.hasInsurance);
      setRegion(sharedState.region);
    }
  }, [sharedState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from tab state
  useEffect(() => {
    if (tabState) {
      setSelectedPresetId(findPreset(tabState.selectedPresetId)?.id ?? null);
      setBonusAmount(tabState.bonusAmount);
    }
  }, [tabState]);

  // Initialize custom scenarios when switching to custom mode
  useEffect(() => {
    if (selectedPresetId === null && !customScenario2025) {
      setCustomScenario2025({
        id: 'custom-2025',
        name: '2025 (Tùy chỉnh)',
        year: 2025,
        months: createUniformMonths(monthlySalary),
        bonusMonths: [],
        dependents,
        hasInsurance,
        region,
      });
      setCustomScenario2026({
        id: 'custom-2026',
        name: '2026 (Tùy chỉnh)',
        year: 2026,
        months: createUniformMonths(monthlySalary),
        bonusMonths: [],
        dependents,
        hasInsurance,
        region,
      });
    }
  }, [selectedPresetId, customScenario2025, monthlySalary, dependents, hasInsurance, region]);

  // Calculate all preset strategies
  const calculateAllStrategies = useCallback(() => {
    const strategies: TwoYearResult[] = [];
    const names: string[] = [];

    // Calculate all presets
    for (const preset of PRESETS) {
      const { scenario2025, scenario2026 } = preset.create(
        monthlySalary,
        dependents,
        hasInsurance,
        region,
        bonusAmount
      );
      const result = calculateTwoYearStrategy(scenario2025, scenario2026);
      strategies.push(result);
      names.push(preset.name);
    }

    // If custom mode, add custom strategy
    if (selectedPresetId === null && customScenario2025 && customScenario2026) {
      // Update custom scenarios with current common params
      const updated2025 = { ...customScenario2025, dependents, hasInsurance, region };
      const updated2026 = { ...customScenario2026, dependents, hasInsurance, region };
      const result = calculateTwoYearStrategy(updated2025, updated2026);
      strategies.push(result);
      names.push('Tùy chỉnh');
    }

    setAllStrategies(strategies);
    setComparison(compareStrategies(strategies));
  }, [monthlySalary, bonusAmount, dependents, hasInsurance, region, selectedPresetId, customScenario2025, customScenario2026]);

  // Recalculate when params change
  useEffect(() => {
    calculateAllStrategies();
  }, [calculateAllStrategies]);

  // Handle preset selection
  const handlePresetSelect = (preset: PresetConfig | null) => {
    const newPresetId = preset?.id ?? null;
    setSelectedPresetId(newPresetId);
    onTabStateChange?.({ selectedPresetId: newPresetId, bonusAmount });
  };

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

  const parseCurrencyWithWarning = (raw: string, max: number) => {
    const parsed = parseCurrencyInput(raw, { max });
    setInputWarning(buildWarning(parsed.issues, max));
    return parsed.value;
  };

  // Get current strategy index
  const getCurrentStrategyIndex = () => {
    if (selectedPresetId === null) {
      return allStrategies.length - 1; // Custom is last
    }
    return PRESETS.findIndex(p => p.id === selectedPresetId);
  };

  // Get current two-year result
  const getCurrentResult = (): TwoYearResult | null => {
    const index = getCurrentStrategyIndex();
    return allStrategies[index] || null;
  };

  const currentResult = getCurrentResult();
  const selectedPreset = PRESETS.find(p => p.id === selectedPresetId) || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">So sánh thuế theo năm</h2>
            <p className="text-sm text-gray-500">Thuế sau quyết toán năm 2025 (luật cũ) và 2026 (luật mới)</p>
          </div>
        </div>
      </div>
      {inputWarning && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {inputWarning}
        </div>
      )}

      {/* Common Parameters */}
      <div className="card">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Thông số chung
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Monthly Salary */}
          <div>
            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
              Lương tháng (GROSS)
              <Tooltip content="Thu nhập gộp hàng tháng trước khi trừ BHXH và thuế">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <input
              type="text"
              value={monthlySalary > 0 ? formatNumber(monthlySalary) : ''}
              onChange={(e) => {
                const value = parseCurrencyWithWarning(e.target.value, MAX_MONTHLY_INCOME);
                setMonthlySalary(value);
                if (bonusAmount === monthlySalary || bonusAmount === 0) {
                  setBonusAmount(value);
                }
                onStateChange?.({ grossIncome: value });
              }}
              placeholder="30.000.000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Bonus Amount */}
          <div>
            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
              Thưởng T13
              <Tooltip content="Tiền thưởng tháng 13 hoặc Tết (thường bằng 1 tháng lương)">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <input
              type="text"
              value={bonusAmount > 0 ? formatNumber(bonusAmount) : ''}
              onChange={(e) => {
                const value = parseCurrencyWithWarning(e.target.value, MAX_MONTHLY_INCOME);
                setBonusAmount(value);
                onTabStateChange?.({ selectedPresetId, bonusAmount: value });
              }}
              placeholder="= Lương tháng"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Dependents */}
          <div>
            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
              Người phụ thuộc
              <Tooltip content="Số người được đăng ký giảm trừ gia cảnh (con nhỏ, cha mẹ...)">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <select
              value={dependents}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setDependents(value);
                onStateChange?.({ dependents: value });
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Array.from({ length: Math.max(11, dependents + 1) }, (_, n) => n).map(n => (
                <option key={n} value={n}>{n} người</option>
              ))}
            </select>
          </div>

          {/* Insurance */}
          <div>
            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
              Bảo hiểm
              <Tooltip content="BHXH, BHYT, BHTN bắt buộc 10,5% trên tiền lương (không tính trên thưởng)">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <label className="flex items-center gap-2 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={hasInsurance}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasInsurance(checked);
                  // Tab chính tính BH theo insuranceOptions -> cập nhật cả hai cho đồng bộ
                  onStateChange?.({ hasInsurance: checked, insuranceOptions: { bhxh: checked, bhyt: checked, bhtn: checked } });
                }}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Đóng BHXH (10,5%)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Preset Selection */}
      <div className="card">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Chọn kịch bản
        </h3>

        <ScenarioPresets
          selectedPreset={selectedPresetId}
          onSelect={handlePresetSelect}
        />

        <div className="mt-3">
          <PresetDescription preset={selectedPreset} />
        </div>
      </div>

      {/* Scenario Details (for current selection) */}
      {currentResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 2025 */}
          <ScenarioColumn
            scenario={
              selectedPresetId === null && customScenario2025
                ? customScenario2025
                : {
                    id: `${selectedPresetId}-2025`,
                    name: currentResult.year2025.scenarioName,
                    year: 2025,
                    months: createUniformMonths(monthlySalary),
                    bonusMonths: currentResult.year2025.monthlyBreakdown
                      .filter(m => m.isBonus)
                      .map(m => ({
                        month: m.month,
                        grossIncome: m.grossIncome,
                        isBonus: true,
                        label: m.label,
                      })),
                    dependents,
                    hasInsurance,
                    region,
                  }
            }
            onChange={(scenario) => {
              if (selectedPresetId === null) {
                setCustomScenario2025(scenario);
              }
            }}
            showDetails={selectedPresetId === null}
          />

          {/* 2026 */}
          <ScenarioColumn
            scenario={
              selectedPresetId === null && customScenario2026
                ? customScenario2026
                : {
                    id: `${selectedPresetId}-2026`,
                    name: currentResult.year2026.scenarioName,
                    year: 2026,
                    months: createUniformMonths(monthlySalary),
                    bonusMonths: currentResult.year2026.monthlyBreakdown
                      .filter(m => m.isBonus)
                      .map(m => ({
                        month: m.month,
                        grossIncome: m.grossIncome,
                        isBonus: true,
                        label: m.label,
                      })),
                    dependents,
                    hasInsurance,
                    region,
                  }
            }
            onChange={(scenario) => {
              if (selectedPresetId === null) {
                setCustomScenario2026(scenario);
              }
            }}
            showDetails={selectedPresetId === null}
          />
        </div>
      )}

      {/* Strategy Comparison */}
      {comparison && allStrategies.length > 1 && (
        <div className="card">
          <StrategyComparison
            comparison={comparison}
            strategyNames={[...PRESETS.map(p => p.name), ...(selectedPresetId === null ? ['Tùy chỉnh'] : [])]}
          />
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-amber-800">
            <div className="font-medium mb-1">Lưu ý</div>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li><strong>Kỳ tính thuế 2026:</strong> áp dụng luật mới cho cả năm (5 bậc, giảm trừ 15,5tr/6,2tr) theo Luật 109/2025/QH15, NĐ 253/2026/NĐ-CP</li>
              <li>Thuế tiền lương tính theo năm và quyết toán: thưởng cộng vào thu nhập của năm nhận, nhận vào tháng nào trong cùng năm cũng không đổi thuế năm (chỉ đổi số tạm khấu trừ)</li>
              <li>Bảo hiểm bắt buộc chỉ tính trên tiền lương, không tính trên thưởng</li>
              <li>Các kịch bản so sánh trên cùng tổng thu nhập 2 năm; năm 2026 là số ước tính đến hết năm</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
