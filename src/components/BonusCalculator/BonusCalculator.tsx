'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  calculateBonusComparison,
  BONUS_SCENARIOS,
  type BonusInput,
  type BonusScenarioResult,
} from '@/lib/bonusCalculator';
import { SharedTaxState, RegionType } from '@/lib/taxCalculator';
import { BonusTabState } from '@/lib/snapshotTypes';
import Tooltip from '@/components/ui/Tooltip';

interface BonusCalculatorProps {
  sharedState: SharedTaxState;
  onStateChange: (updates: Partial<SharedTaxState>) => void;
  tabState: BonusTabState;
  onTabStateChange: (state: BonusTabState) => void;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function ScenarioCard({
  result,
  isSelected,
  isRecommended,
  onSelect,
}: {
  result: BonusScenarioResult;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  const scenario = result.scenario;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={isSelected}
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50 shadow-lg'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
          Tối ưu nhất
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{scenario.name}</h3>
          <p className="text-sm text-gray-500">{scenario.description}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            scenario.taxLaw === 'new'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {scenario.taxLaw === 'new' ? '5 bậc mới' : '7 bậc cũ'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Thuế phát sinh:</span>
          <span className="font-medium text-red-600">{formatMoney(result.additionalTax)} đ</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Thưởng thực nhận:</span>
          <span className="font-semibold text-green-600">{formatMoney(result.netBonus)} đ</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Thuế suất hiệu quả:</span>
          <span className="font-medium text-gray-700">{result.effectiveTaxRate.toFixed(1)}%</span>
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-4 right-4">
          <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function BonusCalculator({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: BonusCalculatorProps) {
  // Use shared state for monthly salary
  const monthlySalary = sharedState.grossIncome;

  // Local input state for amounts
  const [localInputs, setLocalInputs] = useState({
    monthlySalary: formatMoney(monthlySalary),
    thirteenthMonthSalary: formatMoney(tabState.thirteenthMonthSalary),
    tetBonus: formatMoney(tabState.tetBonus),
    otherBonuses: formatMoney(tabState.otherBonuses),
  });

  // Sync localInputs when props change (e.g., from snapshot loading or other tabs)
  useEffect(() => {
    setLocalInputs({
      monthlySalary: formatMoney(monthlySalary),
      thirteenthMonthSalary: formatMoney(tabState.thirteenthMonthSalary),
      tetBonus: formatMoney(tabState.tetBonus),
      otherBonuses: formatMoney(tabState.otherBonuses),
    });
  }, [monthlySalary, tabState.thirteenthMonthSalary, tabState.tetBonus, tabState.otherBonuses]);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof typeof localInputs, value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^\d]/g, '');
    setLocalInputs(prev => ({ ...prev, [field]: numericValue }));

    const numValue = parseInt(numericValue) || 0;

    if (field === 'monthlySalary') {
      onStateChange({ grossIncome: numValue });
    } else {
      onTabStateChange({
        ...tabState,
        [field]: numValue,
      });
    }
  }, [onStateChange, onTabStateChange, tabState]);

  // Format input on blur - use functional setState to avoid stale closure
  const handleBlur = useCallback((field: keyof typeof localInputs) => {
    setLocalInputs(prev => {
      const numValue = parseInt(prev[field].replace(/[^\d]/g, '')) || 0;
      return {
        ...prev,
        [field]: formatMoney(numValue),
      };
    });
  }, []);

  // Clear formatting on focus - use functional setState, handle zero values
  const handleFocus = useCallback((field: keyof typeof localInputs) => {
    setLocalInputs(prev => {
      const numValue = parseInt(prev[field].replace(/[^\d]/g, '')) || 0;
      return {
        ...prev,
        [field]: numValue.toString(),
      };
    });
  }, []);

  // Calculate results
  const result = useMemo(() => {
    const input: BonusInput = {
      monthlySalary: parseInt(localInputs.monthlySalary.replace(/[^\d]/g, '')) || 0,
      thirteenthMonthSalary: parseInt(localInputs.thirteenthMonthSalary.replace(/[^\d]/g, '')) || 0,
      tetBonus: parseInt(localInputs.tetBonus.replace(/[^\d]/g, '')) || 0,
      otherBonuses: parseInt(localInputs.otherBonuses.replace(/[^\d]/g, '')) || 0,
      dependents: sharedState.dependents,
      region: ([1, 2, 3, 4].includes(sharedState.region) ? sharedState.region : 1) as 1 | 2 | 3 | 4,
      hasInsurance: sharedState.hasInsurance,
    };

    return calculateBonusComparison(input);
  }, [localInputs, sharedState]);

  const totalBonus = result.input.thirteenthMonthSalary + result.input.tetBonus + result.input.otherBonuses;

  // Handle scenario selection
  const handleSelectScenario = useCallback((scenarioId: string) => {
    onTabStateChange({
      ...tabState,
      selectedScenarioId: scenarioId,
    });
  }, [onTabStateChange, tabState]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl">🎁</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tính thuế Thưởng Tết</h2>
            <p className="text-sm text-gray-500">
              So sánh thời điểm trả thưởng để tối ưu thuế TNCN
            </p>
          </div>
        </div>

        {/* Tip box */}
        <div className="bg-amber-50 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-500">💡</span>
            <p className="text-sm text-amber-800">
              Từ 01/01/2026, luật thuế mới với biểu thuế 5 bậc và mức giảm trừ cao hơn sẽ có hiệu lực.
              So sánh các phương án trả thưởng trước và sau năm 2026 để tối ưu thuế TNCN.
            </p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Thông tin thu nhập</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bonus-monthly-salary" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Lương tháng (GROSS)
              <Tooltip content="Mức lương hàng tháng trước thuế">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="bonus-monthly-salary"
                type="text"
                value={localInputs.monthlySalary}
                onChange={(e) => handleInputChange('monthlySalary', e.target.value)}
                onBlur={() => handleBlur('monthlySalary')}
                onFocus={() => handleFocus('monthlySalary')}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          <div>
            <label htmlFor="bonus-thirteenth-month" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Lương tháng 13
              <Tooltip content="Thường bằng 1 tháng lương cơ bản">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="bonus-thirteenth-month"
                type="text"
                value={localInputs.thirteenthMonthSalary}
                onChange={(e) => handleInputChange('thirteenthMonthSalary', e.target.value)}
                onBlur={() => handleBlur('thirteenthMonthSalary')}
                onFocus={() => handleFocus('thirteenthMonthSalary')}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          <div>
            <label htmlFor="bonus-tet" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Thưởng Tết
              <Tooltip content="Khoản thưởng dịp Tết Nguyên đán">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="bonus-tet"
                type="text"
                value={localInputs.tetBonus}
                onChange={(e) => handleInputChange('tetBonus', e.target.value)}
                onBlur={() => handleBlur('tetBonus')}
                onFocus={() => handleFocus('tetBonus')}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          <div>
            <label htmlFor="bonus-other" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Thưởng khác
              <Tooltip content="Thưởng dự án, thưởng hiệu suất, etc.">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="bonus-other"
                type="text"
                value={localInputs.otherBonuses}
                onChange={(e) => handleInputChange('otherBonuses', e.target.value)}
                onBlur={() => handleBlur('otherBonuses')}
                onFocus={() => handleFocus('otherBonuses')}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Tổng thưởng:</span>
            <span className="text-xl font-bold text-gray-900 font-mono tabular-nums">{formatMoney(totalBonus)} đ</span>
          </div>
        </div>
      </div>

      {/* Scenarios Comparison */}
      {totalBonus > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">So sánh các phương án</h3>

          <div className="grid md:grid-cols-3 gap-4">
            {result.scenarios.map((scenarioResult) => (
              <ScenarioCard
                key={scenarioResult.scenario.id}
                result={scenarioResult}
                isSelected={tabState.selectedScenarioId === scenarioResult.scenario.id}
                isRecommended={result.recommendation.id === scenarioResult.scenario.id}
                onSelect={() => handleSelectScenario(scenarioResult.scenario.id)}
              />
            ))}
          </div>

          {/* Savings Summary */}
          {result.maxSavings > 0 && (
            <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-lg">💰</span>
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">Tiết kiệm được</h4>
                  <p className="text-2xl font-bold text-green-600 mt-1 font-mono tabular-nums">
                    {formatMoney(result.maxSavings)} đ
                  </p>
                  <p className="text-sm text-green-700 mt-1">{result.savingsDetails}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Table */}
      {totalBonus > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Bảng so sánh chi tiết</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Chỉ số</th>
                  {result.scenarios.map((s) => (
                    <th
                      key={s.scenario.id}
                      className={`text-right py-2 px-3 font-medium ${
                        result.recommendation.id === s.scenario.id
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {s.scenario.name}
                      {result.recommendation.id === s.scenario.id && (
                        <span className="ml-1 text-green-500">★</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Tổng thưởng</td>
                  {result.scenarios.map((s) => (
                    <td key={s.scenario.id} className="text-right py-2 px-3 font-medium">
                      {formatMoney(s.totalBonus)} đ
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Thuế phát sinh</td>
                  {result.scenarios.map((s) => (
                    <td
                      key={s.scenario.id}
                      className={`text-right py-2 px-3 font-medium ${
                        result.recommendation.id === s.scenario.id
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatMoney(s.additionalTax)} đ
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2 px-3 text-gray-900 font-medium">Thưởng thực nhận</td>
                  {result.scenarios.map((s) => (
                    <td
                      key={s.scenario.id}
                      className={`text-right py-2 px-3 font-bold ${
                        result.recommendation.id === s.scenario.id
                          ? 'text-green-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {formatMoney(s.netBonus)} đ
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Thuế suất hiệu quả</td>
                  {result.scenarios.map((s) => (
                    <td key={s.scenario.id} className="text-right py-2 px-3">
                      {s.effectiveTaxRate.toFixed(1)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalBonus === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nhập thông tin thưởng
          </h3>
          <p className="text-gray-500">
            Điền các khoản thưởng để xem so sánh các phương án tối ưu thuế
          </p>
        </div>
      )}
    </div>
  );
}
