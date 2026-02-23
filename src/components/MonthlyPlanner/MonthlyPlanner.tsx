'use client';

import { memo, useMemo, useCallback, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  formatCurrency,
  formatNumber,
  SharedTaxState,
} from '@/lib/taxCalculator';
import {
  calculateMonthlyPlan,
  PRESET_SCENARIOS,
  MONTH_FULL_LABELS,
  MonthlyEntry,
  MonthlyPlannerResult,
} from '@/lib/monthlyPlannerCalculator';
import { MonthlyPlannerTabState } from '@/lib/snapshotTypes';

interface MonthlyPlannerProps {
  sharedState: SharedTaxState;
  onStateChange: (updates: Partial<SharedTaxState>) => void;
  tabState: MonthlyPlannerTabState;
  onTabStateChange: (state: MonthlyPlannerTabState) => void;
}

function displayCurrency(value: number): string {
  if (value === 0) return '0';
  return formatNumber(value);
}

// Custom tooltip for the 12-month chart
function MonthChartTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; net: number; tax: number; insurance: number; gross: number; monthIndex: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 max-w-[200px]">
      <p className="font-semibold text-sm text-gray-800 mb-2">{MONTH_FULL_LABELS[d.monthIndex]}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">GROSS</span>
          <span className="font-mono tabular-nums font-medium">{formatCurrency(d.gross)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Bảo hiểm</span>
          <span className="font-mono tabular-nums text-orange-600">-{formatCurrency(d.insurance)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Thuế</span>
          <span className="font-mono tabular-nums text-red-600">-{formatCurrency(d.tax)}</span>
        </div>
        <div className="pt-1 border-t border-gray-100 flex justify-between gap-4">
          <span className="text-gray-500 font-medium">Thực nhận</span>
          <span className="font-mono tabular-nums font-bold text-green-600">{formatCurrency(d.net)}</span>
        </div>
      </div>
    </div>
  );
}

function MonthlyPlannerComponent({
  sharedState,
  tabState,
  onTabStateChange,
}: MonthlyPlannerProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());

  const baseSalary = tabState.baseSalary || sharedState.grossIncome;

  // Toggle single month
  const toggleMonth = useCallback((index: number) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Expand/collapse all
  const toggleAllMonths = useCallback(() => {
    setExpandedMonths(prev => {
      if (prev.size === 12) return new Set();
      return new Set(Array.from({ length: 12 }, (_, i) => i));
    });
  }, []);

  // Handle base salary change
  const handleBaseSalaryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw === '') {
      onTabStateChange({ ...tabState, baseSalary: 0 });
      return;
    }
    const num = parseInt(raw, 10) || 0;
    onTabStateChange({ ...tabState, baseSalary: num });
  }, [tabState, onTabStateChange]);

  const handleBaseSalaryBlur = useCallback(() => {
    if (tabState.baseSalary === 0) {
      onTabStateChange({ ...tabState, baseSalary: sharedState.grossIncome });
    }
  }, [tabState, onTabStateChange, sharedState.grossIncome]);

  // Handle preset selection
  const handlePresetChange = useCallback((presetId: string) => {
    const preset = PRESET_SCENARIOS.find(p => p.id === presetId);
    if (!preset) return;

    const months = preset.applyToMonths(baseSalary);
    onTabStateChange({
      ...tabState,
      selectedPreset: presetId,
      months,
    });
  }, [baseSalary, tabState, onTabStateChange]);

  // Handle individual month change
  const handleMonthFieldChange = useCallback((monthIndex: number, field: keyof MonthlyEntry, value: string) => {
    const raw = value.replace(/[^\d]/g, '');
    const num = raw === '' ? 0 : (parseInt(raw, 10) || 0);

    const newMonths = [...tabState.months];
    newMonths[monthIndex] = { ...newMonths[monthIndex], [field]: num };

    onTabStateChange({
      ...tabState,
      months: newMonths,
      selectedPreset: 'custom',
    });
  }, [tabState, onTabStateChange]);

  // Calculate results
  const result = useMemo<MonthlyPlannerResult>(() => {
    return calculateMonthlyPlan({
      baseSalary,
      months: tabState.months,
      dependents: sharedState.dependents,
      hasInsurance: sharedState.hasInsurance,
      region: sharedState.region,
    });
  }, [baseSalary, tabState.months, sharedState.dependents, sharedState.hasInsurance, sharedState.region]);

  // Chart data
  const chartData = useMemo(() => {
    return result.months.map((m, index) => ({
      name: m.label,
      net: m.net,
      tax: m.tax,
      insurance: m.insurance,
      gross: m.gross,
      monthIndex: index,
    }));
  }, [result.months]);

  // Find max tax month
  const maxTaxMonth = useMemo(() => {
    return result.months.reduce((max, m) => m.tax > max.tax ? m : max);
  }, [result.months]);

  const { summary } = result;
  const allExpanded = expandedMonths.size === 12;

  return (
    <div className="space-y-6">
      {/* Header + Config */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Kế hoạch thu nhập 12 tháng</h2>
            <p className="text-sm text-gray-500">Nhập lương từng tháng, tính thuế thực tế cả năm</p>
          </div>
        </div>

        {/* Base salary + info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lương cơ bản hàng tháng
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={baseSalary === 0 ? '' : displayCurrency(baseSalary)}
                onChange={handleBaseSalaryChange}
                onBlur={handleBaseSalaryBlur}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">VND</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thông tin chung
            </label>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Vùng</span>
                <span className="font-medium">Vùng {sharedState.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Người phụ thuộc</span>
                <span className="font-medium">{sharedState.dependents} người</span>
              </div>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Kịch bản</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SCENARIOS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  tabState.selectedPreset === preset.id
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {PRESET_SCENARIOS.find(p => p.id === tabState.selectedPreset)?.description || ''}
          </p>
        </div>
      </div>

      {/* Year Summary - TOP (visible ngay) */}
      <div className="card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 mb-0.5">Tổng GROSS năm</div>
            <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-blue-700">
              {formatCurrency(summary.totalGross)}
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-xs text-orange-600 mb-0.5">Tổng bảo hiểm</div>
            <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-orange-700">
              {formatCurrency(summary.totalInsurance)}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-red-600 mb-0.5">Tổng thuế</div>
            <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-red-700">
              {formatCurrency(summary.totalTax)}
            </div>
            <div className="text-[10px] text-red-400 mt-0.5">
              Thuế suất: {summary.effectiveRate.toFixed(2)}%
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 mb-0.5">Tổng NET năm</div>
            <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-green-700">
              {formatCurrency(summary.totalNet)}
            </div>
            <div className="text-[10px] text-green-500 mt-0.5">
              TB: {formatCurrency(summary.averageMonthlyNet)}/tháng
            </div>
          </div>
        </div>

        {/* Comparison: Uniform vs Actual */}
        {Math.abs(summary.taxDifference) > 1000 && (
          <div className={`mt-4 rounded-lg p-3.5 border ${
            summary.taxDifference > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <div className={`p-1 rounded-full mt-0.5 flex-shrink-0 ${
                summary.taxDifference > 0 ? 'bg-amber-500' : 'bg-green-500'
              }`}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={summary.taxDifference > 0
                      ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    } />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  summary.taxDifference > 0 ? 'text-amber-800' : 'text-green-800'
                }`}>
                  {summary.taxDifference > 0
                    ? 'Thu nhập biến động làm thuế tăng'
                    : 'Thu nhập biến động giúp thuế giảm'
                  }
                  {' '}<span className="font-bold font-mono tabular-nums">
                    {summary.taxDifference > 0 ? '+' : ''}{formatCurrency(summary.taxDifference)}
                  </span>
                </p>
                <p className={`text-xs mt-1 ${
                  summary.taxDifference > 0 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  So với thuế nếu lương đều đặn {formatCurrency(summary.totalGross / 12)}/tháng
                  {' '}= {formatCurrency(summary.uniformTotalTax)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart - 12 months */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Biểu đồ 12 tháng</h3>
        <div className="w-full overflow-x-auto -mx-2 px-2">
          <div style={{ minWidth: 500, height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
                barCategoryGap="12%"
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  interval={0}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tickFormatter={(v: number) => {
                    if (v >= 1_000_000) {
                      const m = v / 1_000_000;
                      return m % 1 === 0 ? `${m}tr` : `${m.toFixed(1)}tr`;
                    }
                    return formatNumber(v);
                  }}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  width={42}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<MonthChartTooltip />}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                />
                <ReferenceLine
                  y={summary.averageMonthlyNet}
                  stroke="#16a34a"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `TB ${formatCurrency(summary.averageMonthlyNet)}`,
                    position: 'right',
                    fontSize: 9,
                    fill: '#16a34a',
                  }}
                />
                <Bar dataKey="insurance" stackId="stack" fill="#f97316" isAnimationActive={true} animationDuration={400} />
                <Bar dataKey="tax" stackId="stack" fill="#ef4444" isAnimationActive={true} animationDuration={400} />
                <Bar dataKey="net" stackId="stack" fill="#22c55e" radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={400}>
                  {chartData.map((_, index) => {
                    const isMax = result.months[index].month === maxTaxMonth.month && maxTaxMonth.tax > 0;
                    return (
                      <Cell key={index} fill={isMax ? '#16a34a' : '#22c55e'} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" /> Bảo hiểm
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" /> Thuế
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" /> Thực nhận
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-green-600" /> NET trung bình
          </div>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Chi tiết từng tháng</h3>
          <button
            onClick={toggleAllMonths}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            {allExpanded ? 'Thu gọn tất cả' : 'Mở tất cả'}
          </button>
        </div>
        <div className="space-y-1.5">
          {result.months.map((m, index) => {
            const entry = tabState.months[index] || { bonus: 0, overtime: 0, otherIncome: 0 };
            const hasExtra = entry.bonus > 0 || entry.overtime > 0 || entry.otherIncome > 0;
            const isExpanded = expandedMonths.has(index);
            const isMaxTax = m.month === maxTaxMonth.month && maxTaxMonth.tax > 0;

            return (
              <div key={index} className={`border rounded-lg transition-all ${
                isMaxTax ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
              }`}>
                {/* Summary row */}
                <button
                  onClick={() => toggleMonth(index)}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2 text-left hover:bg-gray-50/50 rounded-lg"
                >
                  <span className={`text-xs sm:text-sm font-bold w-6 sm:w-8 flex-shrink-0 ${
                    isMaxTax ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {m.label}
                  </span>

                  {/* Progress bar showing composition */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="h-5 sm:h-6 bg-gray-100 rounded overflow-hidden flex">
                          {m.gross > 0 && (
                            <>
                              <div
                                className="h-full bg-orange-400 transition-all"
                                style={{ width: `${(m.insurance / m.gross) * 100}%` }}
                              />
                              <div
                                className="h-full bg-red-400 transition-all"
                                style={{ width: `${(m.tax / m.gross) * 100}%` }}
                              />
                              <div
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${(m.net / m.gross) * 100}%` }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-mono tabular-nums font-bold text-green-600 flex-shrink-0 w-[80px] sm:w-[100px] text-right">
                        {formatCurrency(m.net)}
                      </span>
                    </div>
                    {hasExtra && (
                      <div className="text-[10px] text-amber-600 mt-0.5">
                        +{entry.bonus > 0 ? ` Thưởng` : ''}{entry.overtime > 0 ? ` OT` : ''}{entry.otherIncome > 0 ? ` Khác` : ''}
                      </div>
                    )}
                  </div>

                  <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Thưởng</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.bonus === 0 ? '' : displayCurrency(entry.bonus)}
                          onChange={(e) => handleMonthFieldChange(index, 'bonus', e.target.value)}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tăng ca</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.overtime === 0 ? '' : displayCurrency(entry.overtime)}
                          onChange={(e) => handleMonthFieldChange(index, 'overtime', e.target.value)}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">TN khác</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.otherIncome === 0 ? '' : displayCurrency(entry.otherIncome)}
                          onChange={(e) => handleMonthFieldChange(index, 'otherIncome', e.target.value)}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    {/* Detail breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-gray-400">GROSS</div>
                        <div className="font-mono tabular-nums font-medium">{formatCurrency(m.gross)}</div>
                      </div>
                      <div className="bg-orange-50 rounded p-2">
                        <div className="text-orange-400">Bảo hiểm</div>
                        <div className="font-mono tabular-nums text-orange-600">-{formatCurrency(m.insurance)}</div>
                      </div>
                      <div className="bg-red-50 rounded p-2">
                        <div className="text-red-400">Thuế</div>
                        <div className="font-mono tabular-nums text-red-600">-{formatCurrency(m.tax)}</div>
                      </div>
                      <div className="bg-green-50 rounded p-2">
                        <div className="text-green-500">Thực nhận</div>
                        <div className="font-mono tabular-nums font-bold text-green-600">{formatCurrency(m.net)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const MonthlyPlanner = memo(MonthlyPlannerComponent);
export default MonthlyPlanner;
