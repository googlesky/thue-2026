'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  calculateESOPComparison,
  ESOP_PERIODS,
  formatMoney,
  type ESOPInput,
  type ESOPPeriodResult,
} from '@/lib/esopCalculator';
import { SharedTaxState } from '@/lib/taxCalculator';
import { ESOPTabState } from '@/lib/snapshotTypes';
import Tooltip from '@/components/ui/Tooltip';

interface ESOPCalculatorProps {
  sharedState: SharedTaxState;
  onStateChange: (updates: Partial<SharedTaxState>) => void;
  tabState: ESOPTabState;
  onTabStateChange: (state: ESOPTabState) => void;
}

function PeriodCard({
  result,
  isSelected,
  isRecommended,
  onSelect,
}: {
  result: ESOPPeriodResult;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  const period = result.period;

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
          <h3 className="font-semibold text-gray-900">{period.name}</h3>
          <p className="text-sm text-gray-500">{period.description}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            period.taxLaw === 'new'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {period.taxLaw === 'new' ? '5 bậc mới' : '7 bậc cũ'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Thuế TNCN:</span>
          <span className="font-medium text-red-600">{formatMoney(result.tax)} đ</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Lợi nhuận ròng:</span>
          <span className="font-semibold text-green-600">{formatMoney(result.netGain)} đ</span>
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

export default function ESOPCalculator({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: ESOPCalculatorProps) {
  // Local input state
  const [localInputs, setLocalInputs] = useState({
    grantPrice: formatMoney(tabState.grantPrice),
    exercisePrice: formatMoney(tabState.exercisePrice),
    numberOfShares: formatMoney(tabState.numberOfShares),
  });

  // Sync localInputs when props change (e.g., from snapshot loading)
  useEffect(() => {
    setLocalInputs({
      grantPrice: formatMoney(tabState.grantPrice),
      exercisePrice: formatMoney(tabState.exercisePrice),
      numberOfShares: formatMoney(tabState.numberOfShares),
    });
  }, [tabState.grantPrice, tabState.exercisePrice, tabState.numberOfShares]);

  // Handle input changes
  const handleInputChange = useCallback(
    (field: keyof typeof localInputs, value: string) => {
      // Only allow numbers
      const numericValue = value.replace(/[^\d]/g, '');
      setLocalInputs((prev) => ({ ...prev, [field]: numericValue }));

      const numValue = parseInt(numericValue) || 0;
      onTabStateChange({
        ...tabState,
        [field]: numValue,
      });
    },
    [onTabStateChange, tabState]
  );

  // Format input on blur - use functional setState to avoid stale closure
  const handleBlur = useCallback((field: keyof typeof localInputs) => {
    setLocalInputs((prev) => {
      const numValue = parseInt(prev[field].replace(/[^\d]/g, '')) || 0;
      return {
        ...prev,
        [field]: formatMoney(numValue),
      };
    });
  }, []);

  // Clear formatting on focus - use functional setState, handle zero values
  const handleFocus = useCallback((field: keyof typeof localInputs) => {
    setLocalInputs((prev) => {
      const numValue = parseInt(prev[field].replace(/[^\d]/g, '')) || 0;
      return {
        ...prev,
        [field]: numValue.toString(),
      };
    });
  }, []);

  // Calculate results
  const result = useMemo(() => {
    const grantPrice = parseInt(localInputs.grantPrice.replace(/[^\d]/g, '')) || 0;
    const exercisePrice = parseInt(localInputs.exercisePrice.replace(/[^\d]/g, '')) || 0;
    const numberOfShares = parseInt(localInputs.numberOfShares.replace(/[^\d]/g, '')) || 0;

    const input: ESOPInput = {
      grantPrice,
      exercisePrice,
      numberOfShares,
      dependents: sharedState.dependents,
      region: ([1, 2, 3, 4].includes(sharedState.region) ? sharedState.region : 1) as 1 | 2 | 3 | 4,
      hasInsurance: sharedState.hasInsurance,
      monthlySalary: sharedState.grossIncome,
    };

    return calculateESOPComparison(input);
  }, [localInputs, sharedState]);

  // Handle period selection
  const handleSelectPeriod = useCallback(
    (periodId: string) => {
      onTabStateChange({
        ...tabState,
        selectedPeriodId: periodId,
      });
    },
    [onTabStateChange, tabState]
  );

  const hasValidInput =
    result.input.grantPrice > 0 &&
    result.input.exercisePrice > 0 &&
    result.input.numberOfShares > 0;

  const hasGain = result.taxableGain > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl">📈</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tính thuế ESOP</h2>
            <p className="text-sm text-gray-500">
              Tính thuế TNCN cho cổ phiếu thưởng và quyền mua cổ phiếu
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-500">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Cách tính thuế ESOP:</p>
              <p>
                Thu nhập chịu thuế = (Giá thực hiện - Giá cấp quyền) × Số cổ phiếu.
                Thu nhập này được cộng vào lương tháng thực hiện và chịu thuế theo biểu lũy tiến.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Thông tin cổ phiếu</h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="esop-grant-price" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Giá cấp quyền (Grant Price)
              <Tooltip content="Giá mua cổ phiếu được cấp khi tham gia ESOP">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="esop-grant-price"
                type="text"
                value={localInputs.grantPrice}
                onChange={(e) => handleInputChange('grantPrice', e.target.value)}
                onBlur={() => handleBlur('grantPrice')}
                onFocus={() => handleFocus('grantPrice')}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                đ
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="esop-exercise-price" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Giá thực hiện (Exercise Price)
              <Tooltip content="Giá thị trường tại thời điểm thực hiện quyền mua">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="esop-exercise-price"
                type="text"
                value={localInputs.exercisePrice}
                onChange={(e) => handleInputChange('exercisePrice', e.target.value)}
                onBlur={() => handleBlur('exercisePrice')}
                onFocus={() => handleFocus('exercisePrice')}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                đ
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="esop-num-shares" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Số lượng cổ phiếu
              <Tooltip content="Số cổ phiếu bạn muốn thực hiện quyền mua">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="esop-num-shares"
                type="text"
                value={localInputs.numberOfShares}
                onChange={(e) => handleInputChange('numberOfShares', e.target.value)}
                onBlur={() => handleBlur('numberOfShares')}
                onFocus={() => handleFocus('numberOfShares')}
                className="input-field pr-16"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                CP
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {hasValidInput && (
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-sm text-gray-500 mb-1">Tổng giá trị cổ phiếu</div>
              <div className="text-xl font-bold text-gray-900">
                {formatMoney(result.totalValue)} đ
              </div>
            </div>
            <div
              className={`p-4 rounded-xl ${hasGain ? 'bg-green-50' : 'bg-red-50'}`}
            >
              <div className="text-sm text-gray-500 mb-1">Thu nhập chịu thuế (Gain)</div>
              <div
                className={`text-xl font-bold ${hasGain ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatMoney(result.taxableGain)} đ
              </div>
              {!hasGain && result.input.exercisePrice < result.input.grantPrice && (
                <p className="text-xs text-red-600 mt-1">
                  Giá thực hiện thấp hơn giá cấp quyền
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Period Comparison */}
      {hasValidInput && hasGain && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">So sánh thời điểm thực hiện</h3>

          <div className="grid md:grid-cols-3 gap-4">
            {result.periods.map((periodResult) => (
              <PeriodCard
                key={periodResult.period.id}
                result={periodResult}
                isSelected={tabState.selectedPeriodId === periodResult.period.id}
                isRecommended={result.recommendation.id === periodResult.period.id}
                onSelect={() => handleSelectPeriod(periodResult.period.id)}
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
                  <h4 className="font-semibold text-green-800">Tiết kiệm tối đa</h4>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatMoney(result.maxSavings)} đ
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Nếu thực hiện vào {result.recommendation.name} thay vì các thời điểm khác
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Table */}
      {hasValidInput && hasGain && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Bảng so sánh chi tiết</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Chỉ số</th>
                  {result.periods.map((p) => (
                    <th
                      key={p.period.id}
                      className={`text-right py-2 px-3 font-medium ${
                        result.recommendation.id === p.period.id
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {p.period.name}
                      {result.recommendation.id === p.period.id && (
                        <span className="ml-1 text-green-500">★</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Thu nhập chịu thuế</td>
                  {result.periods.map((p) => (
                    <td key={p.period.id} className="text-right py-2 px-3 font-medium">
                      {formatMoney(p.taxableGain)} đ
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Thuế TNCN</td>
                  {result.periods.map((p) => (
                    <td
                      key={p.period.id}
                      className={`text-right py-2 px-3 font-medium ${
                        result.recommendation.id === p.period.id
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatMoney(p.tax)} đ
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2 px-3 text-gray-900 font-medium">Lợi nhuận ròng</td>
                  {result.periods.map((p) => (
                    <td
                      key={p.period.id}
                      className={`text-right py-2 px-3 font-bold ${
                        result.recommendation.id === p.period.id
                          ? 'text-green-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {formatMoney(p.netGain)} đ
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Thuế suất hiệu quả</td>
                  {result.periods.map((p) => (
                    <td key={p.period.id} className="text-right py-2 px-3">
                      {p.effectiveTaxRate.toFixed(1)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tips */}
      {hasValidInput && hasGain && (
        <div className="card bg-amber-50 border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            Lưu ý quan trọng
          </h3>
          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>
                Thuế ESOP được tính dựa trên chênh lệch giữa giá thực hiện và giá cấp quyền
                tại thời điểm bạn thực hiện quyền mua.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>
                Thu nhập từ ESOP được cộng vào lương tháng và chịu thuế theo biểu lũy tiến,
                có thể đẩy bạn lên bậc thuế cao hơn.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>
                Nếu bán cổ phiếu sau khi thực hiện, lợi nhuận từ việc bán (nếu có) có thể
                chịu thuế chuyển nhượng chứng khoán 0.1% trên giá bán.
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* Empty State */}
      {!hasValidInput && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nhập thông tin ESOP</h3>
          <p className="text-gray-500">
            Điền giá cấp quyền, giá thực hiện và số lượng cổ phiếu để tính thuế
          </p>
        </div>
      )}
    </div>
  );
}
