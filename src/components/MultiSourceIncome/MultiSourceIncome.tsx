'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  calculateMultiSourceTax,
  createIncomeSource,
  getIncomeSourceOptions,
  formatCurrency,
  formatPercent,
  INCOME_SOURCE_LABELS,
  INCOME_SOURCE_DESCRIPTIONS,
  INCOME_TAX_RATES,
  type IncomeSourceType,
  type IncomeSource,
  type MultiSourceResult,
} from '@/lib/multiSourceIncomeCalculator';
import { MultiSourceIncomeTabState, DEFAULT_MULTI_SOURCE_INCOME_STATE } from '@/lib/snapshotTypes';

interface MultiSourceIncomeProps {
  tabState: MultiSourceIncomeTabState;
  onTabStateChange: (state: MultiSourceIncomeTabState) => void;
}

const FREQUENCY_LABELS = {
  monthly: 'Hàng tháng',
  yearly: 'Hàng năm',
  one_time: 'Một lần',
};

export function MultiSourceIncome({ tabState, onTabStateChange }: MultiSourceIncomeProps) {
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  // Income source options
  const sourceOptions = useMemo(() => getIncomeSourceOptions(), []);

  // Calculate results
  const result = useMemo((): MultiSourceResult => {
    return calculateMultiSourceTax({
      incomeSources: tabState.incomeSources,
      dependents: tabState.dependents,
      hasInsurance: tabState.hasInsurance,
      pensionContribution: tabState.pensionContribution,
      charitableContribution: tabState.charitableContribution,
      taxYear: tabState.taxYear,
      isSecondHalf2026: tabState.isSecondHalf2026,
    });
  }, [tabState]);

  // Update a single field
  const updateField = <K extends keyof MultiSourceIncomeTabState>(
    field: K,
    value: MultiSourceIncomeTabState[K]
  ) => {
    onTabStateChange({ ...tabState, [field]: value });
  };

  // Add new income source
  const addSource = useCallback((type: IncomeSourceType) => {
    const newSource = createIncomeSource(type);
    updateField('incomeSources', [...tabState.incomeSources, newSource]);
    setExpandedSourceId(newSource.id);
  }, [tabState.incomeSources]);

  // Update an income source
  const updateSource = useCallback((id: string, updates: Partial<IncomeSource>) => {
    const updatedSources = tabState.incomeSources.map(source =>
      source.id === id ? { ...source, ...updates } : source
    );
    updateField('incomeSources', updatedSources);
  }, [tabState.incomeSources]);

  // Remove an income source
  const removeSource = useCallback((id: string) => {
    const updatedSources = tabState.incomeSources.filter(source => source.id !== id);
    updateField('incomeSources', updatedSources);
    if (expandedSourceId === id) {
      setExpandedSourceId(null);
    }
  }, [tabState.incomeSources, expandedSourceId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Tổng hợp thu nhập từ nhiều nguồn
        </h2>
        <p className="text-sm text-gray-600">
          Thêm các nguồn thu nhập để tính tổng thuế TNCN phải nộp trong năm.
        </p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-md font-medium text-gray-900 mb-4">
          Thông tin chung
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dependents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số người phụ thuộc
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={tabState.dependents}
              onChange={(e) => updateField('dependents', parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>

          {/* Tax Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Năm thuế
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateField('taxYear', 2025)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
                  ${tabState.taxYear === 2025
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                  }`}
              >
                2025
              </button>
              <button
                onClick={() => updateField('taxYear', 2026)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
                  ${tabState.taxYear === 2026
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                  }`}
              >
                2026
              </button>
            </div>
          </div>

          {/* Insurance */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={tabState.hasInsurance}
                onChange={(e) => updateField('hasInsurance', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">
                Có đóng BHXH bắt buộc (được trừ 10.5% lương vào thu nhập chịu thuế)
              </span>
            </label>
          </div>

          {/* Pension Contribution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hưu trí tự nguyện (VND/năm)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.pensionContribution === 0 ? '' : tabState.pensionContribution.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('pensionContribution', value ? parseInt(value, 10) : 0);
              }}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>

          {/* Charitable Contribution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Từ thiện (VND/năm)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.charitableContribution === 0 ? '' : tabState.charitableContribution.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('charitableContribution', value ? parseInt(value, 10) : 0);
              }}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Income Sources */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium text-gray-900">
            Các nguồn thu nhập ({tabState.incomeSources.length})
          </h3>
        </div>

        {/* Add Source Dropdown */}
        <div className="mb-4">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                addSource(e.target.value as IncomeSourceType);
                e.target.value = '';
              }
            }}
            className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
          >
            <option value="">+ Thêm nguồn thu nhập...</option>
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Source List */}
        {tabState.incomeSources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Chưa có nguồn thu nhập nào. Chọn loại thu nhập ở trên để thêm.
          </div>
        ) : (
          <div className="space-y-3">
            {tabState.incomeSources.map((source) => {
              const sourceResult = result.sourceResults.find(r => r.source.id === source.id);
              const isExpanded = expandedSourceId === source.id;

              return (
                <div
                  key={source.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedSourceId(isExpanded ? null : source.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getIconForType(source.type)}</span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {INCOME_SOURCE_LABELS[source.type]}
                        </div>
                        <div className="text-sm text-gray-500">
                          {source.amount > 0
                            ? `${formatCurrency(source.amount)} / ${FREQUENCY_LABELS[source.frequency]}`
                            : 'Chưa nhập số tiền'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sourceResult && sourceResult.taxAmount > 0 && (
                        <span className="text-sm font-medium text-red-600">
                          Thuế: {formatCurrency(sourceResult.taxAmount)}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSource(source.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Xóa"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-gray-200">
                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Số tiền (VND)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={source.amount === 0 ? '' : source.amount.toLocaleString('vi-VN')}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            updateSource(source.id, { amount: value ? parseInt(value, 10) : 0 });
                          }}
                          placeholder="Nhập số tiền..."
                          className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
                        />
                      </div>

                      {/* Frequency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tần suất
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['monthly', 'yearly', 'one_time'] as const).map((freq) => (
                            <button
                              key={freq}
                              onClick={() => updateSource(source.id, { frequency: freq })}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors
                                ${source.frequency === freq
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                              {FREQUENCY_LABELS[freq]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Type-specific options */}
                      {source.type === 'inheritance' && (
                        <label className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                          <input
                            type="checkbox"
                            checked={source.isFromFamily || false}
                            onChange={(e) => updateSource(source.id, { isFromFamily: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            Từ thành viên gia đình (vợ/chồng, cha mẹ, con) - được miễn thuế
                          </span>
                        </label>
                      )}

                      {source.type === 'interest' && (
                        <label className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <input
                            type="checkbox"
                            checked={source.isGovBond || false}
                            onChange={(e) => updateSource(source.id, { isGovBond: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            Lãi từ trái phiếu Chính phủ - được miễn thuế
                          </span>
                        </label>
                      )}

                      {/* Tax Info */}
                      {sourceResult && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Thu nhập năm:</span>
                              <span className="ml-2 font-medium">{formatCurrency(sourceResult.annualAmount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Thuế suất:</span>
                              <span className="ml-2 font-medium">
                                {sourceResult.appliedRate === 'progressive'
                                  ? 'Lũy tiến'
                                  : formatPercent(sourceResult.appliedRate as number)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Thuế phải nộp:</span>
                              <span className="ml-2 font-medium text-red-600">{formatCurrency(sourceResult.taxAmount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Thực nhận:</span>
                              <span className="ml-2 font-medium text-green-600">
                                {formatCurrency(sourceResult.annualAmount - sourceResult.taxAmount)}
                              </span>
                            </div>
                          </div>
                          {sourceResult.notes.length > 0 && (
                            <ul className="mt-2 text-xs text-gray-500">
                              {sourceResult.notes.map((note, idx) => (
                                <li key={idx}>• {note}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {tabState.incomeSources.length > 0 && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tổng hợp thuế năm {tabState.taxYear}
          </h3>

          <div className="space-y-3">
            {/* Total Gross Income */}
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Tổng thu nhập:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(result.totalGrossIncome)}
              </span>
            </div>

            {/* Category Breakdown */}
            <div className="py-2 border-b border-gray-200">
              <div className="text-sm text-gray-500 mb-2">Phân loại:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {result.categoryBreakdown.salary.gross > 0 && (
                  <div className="flex justify-between">
                    <span>Lương:</span>
                    <span>{formatCurrency(result.categoryBreakdown.salary.gross)}</span>
                  </div>
                )}
                {result.categoryBreakdown.investment.gross > 0 && (
                  <div className="flex justify-between">
                    <span>Đầu tư:</span>
                    <span>{formatCurrency(result.categoryBreakdown.investment.gross)}</span>
                  </div>
                )}
                {result.categoryBreakdown.business.gross > 0 && (
                  <div className="flex justify-between">
                    <span>Kinh doanh:</span>
                    <span>{formatCurrency(result.categoryBreakdown.business.gross)}</span>
                  </div>
                )}
                {result.categoryBreakdown.other.gross > 0 && (
                  <div className="flex justify-between">
                    <span>Khác:</span>
                    <span>{formatCurrency(result.categoryBreakdown.other.gross)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Tax */}
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="font-medium text-gray-700">Tổng thuế TNCN:</span>
              <span className="text-xl font-bold text-red-600">
                {formatCurrency(result.totalTax)}
              </span>
            </div>

            {/* Tax Breakdown */}
            {result.progressiveTax > 0 && result.flatTax > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-gray-200 text-sm">
                <div className="text-gray-500">
                  <div>Thuế lũy tiến (lương): {formatCurrency(result.progressiveTax)}</div>
                  <div>Thuế khác: {formatCurrency(result.flatTax)}</div>
                </div>
              </div>
            )}

            {/* Effective Rate */}
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Thuế suất hiệu quả:</span>
              <span className="font-medium text-orange-600">
                {formatPercent(result.overallEffectiveRate)}
              </span>
            </div>

            {/* Net Income */}
            <div className="flex items-center justify-between py-3 bg-green-50 rounded-lg px-3">
              <span className="font-medium text-gray-700">Thu nhập thực nhận:</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(result.totalNetIncome)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Tips */}
      {result.optimizationTips.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
          <h3 className="text-md font-medium text-blue-900 mb-3">
            💡 Gợi ý tối ưu thuế
          </h3>
          <ul className="space-y-2">
            {result.optimizationTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legal Reference */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium mb-2">Căn cứ pháp lý:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Luật Thuế TNCN 2007 (sửa đổi 2012, 2014)</li>
          <li>Nghị quyết 954/2020/UBTVQH14 về điều chỉnh giảm trừ gia cảnh</li>
          <li>Thông tư 111/2013/TT-BTC hướng dẫn Luật Thuế TNCN</li>
          <li>Luật sửa đổi thuế TNCN có hiệu lực từ 1/7/2026</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Get icon for income source type
 */
function getIconForType(type: IncomeSourceType): string {
  const icons: Record<IncomeSourceType, string> = {
    salary: '💼',
    freelance: '🧑‍💻',
    rental: '🏠',
    dividend: '📈',
    interest: '🏦',
    securities: '📊',
    real_estate: '🏡',
    lottery: '🎰',
    inheritance: '🎁',
    royalty: '📝',
    capital_investment: '💰',
  };
  return icons[type] || '💵';
}

export default MultiSourceIncome;
