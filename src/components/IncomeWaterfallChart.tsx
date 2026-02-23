'use client';

import { memo, useMemo } from 'react';
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
  TaxResult,
  formatCurrency,
  formatNumber,
} from '@/lib/taxCalculator';

interface IncomeWaterfallChartProps {
  result: TaxResult;
  label?: string;
}

interface WaterfallDataItem {
  name: string;
  shortName: string;
  base: number;
  value: number;
  rawValue: number;
  runningTotal: number;
  color: string;
  isTotal?: boolean;
  detail?: string;
  percentOfGross?: number;
}

const COLORS = {
  gross: '#3b82f6',
  insurance: '#f97316',
  deduction: '#a855f7',
  taxableIncome: '#64748b',
  tax: '#ef4444',
  net: '#22c55e',
};

function buildWaterfallData(result: TaxResult): WaterfallDataItem[] {
  const data: WaterfallDataItem[] = [];
  const gross = result.grossIncome;
  let running = gross;

  // 1. GROSS
  data.push({
    name: 'Thu nhập gộp',
    shortName: 'GROSS',
    base: 0,
    value: gross,
    rawValue: gross,
    runningTotal: running,
    color: COLORS.gross,
    isTotal: true,
    percentOfGross: 100,
  });

  // 2. Bảo hiểm gộp (BHXH + BHYT + BHTN)
  const totalInsurance = result.insuranceDeduction;
  if (totalInsurance > 0) {
    running -= totalInsurance;
    const parts: string[] = [];
    if (result.insuranceDetail.bhxh > 0) parts.push(`BHXH ${formatCurrency(result.insuranceDetail.bhxh)}`);
    if (result.insuranceDetail.bhyt > 0) parts.push(`BHYT ${formatCurrency(result.insuranceDetail.bhyt)}`);
    if (result.insuranceDetail.bhtn > 0) parts.push(`BHTN ${formatCurrency(result.insuranceDetail.bhtn)}`);

    data.push({
      name: 'Bảo hiểm (10,5%)',
      shortName: 'Bảo hiểm',
      base: running,
      value: totalInsurance,
      rawValue: -totalInsurance,
      runningTotal: running,
      color: COLORS.insurance,
      detail: parts.join(' + '),
      percentOfGross: gross > 0 ? (totalInsurance / gross) * 100 : 0,
    });
  }

  // 3. Giảm trừ gộp (bản thân + NPT + khác)
  const totalDeduction = result.personalDeduction + result.dependentDeduction + result.otherDeductions;
  if (totalDeduction > 0) {
    const prevRunning = running;
    running -= totalDeduction;

    const parts: string[] = [];
    if (result.personalDeduction > 0) parts.push(`Bản thân ${formatCurrency(result.personalDeduction)}`);
    if (result.dependentDeduction > 0) parts.push(`NPT ${formatCurrency(result.dependentDeduction)}`);
    if (result.otherDeductions > 0) parts.push(`Khác ${formatCurrency(result.otherDeductions)}`);

    // Khi deductions lớn hơn remaining → bar chỉ hiển thị phần trên 0
    const visibleValue = Math.min(totalDeduction, prevRunning);
    data.push({
      name: 'Giảm trừ',
      shortName: 'Giảm trừ',
      base: Math.max(running, 0),
      value: visibleValue,
      rawValue: -totalDeduction,
      runningTotal: running,
      color: COLORS.deduction,
      detail: parts.join(' + '),
      percentOfGross: gross > 0 ? (totalDeduction / gross) * 100 : 0,
    });
  }

  // 4. Thu nhập tính thuế
  data.push({
    name: 'TN tính thuế',
    shortName: 'TN thuế',
    base: 0,
    value: result.taxableIncome,
    rawValue: result.taxableIncome,
    runningTotal: result.taxableIncome,
    color: COLORS.taxableIncome,
    isTotal: true,
    percentOfGross: gross > 0 ? (result.taxableIncome / gross) * 100 : 0,
  });

  // 5. Thuế TNCN gộp
  if (result.taxAmount > 0) {
    const bracketParts = result.taxBreakdown
      .filter(b => b.taxAmount > 0)
      .map(b => `${(b.rate * 100).toFixed(0)}%: ${formatCurrency(b.taxAmount)}`);

    data.push({
      name: 'Thuế TNCN',
      shortName: 'Thuế',
      base: result.taxableIncome - result.taxAmount,
      value: result.taxAmount,
      rawValue: -result.taxAmount,
      runningTotal: result.taxableIncome - result.taxAmount,
      color: COLORS.tax,
      detail: bracketParts.join(', '),
      percentOfGross: gross > 0 ? (result.taxAmount / gross) * 100 : 0,
    });
  }

  // 6. NET
  data.push({
    name: 'Thực nhận',
    shortName: 'NET',
    base: 0,
    value: result.netIncome,
    rawValue: result.netIncome,
    runningTotal: result.netIncome,
    color: COLORS.net,
    isTotal: true,
    percentOfGross: gross > 0 ? (result.netIncome / gross) * 100 : 0,
  });

  return data;
}

// Custom tooltip
function WaterfallTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: WaterfallDataItem }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0].payload;
  const isDeduction = item.rawValue < 0 && !item.isTotal;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3.5 max-w-[260px]">
      <p className="font-semibold text-sm text-gray-800 mb-1.5">{item.name}</p>
      <p className={`text-lg font-bold font-mono tabular-nums ${
        isDeduction ? 'text-red-600' : item.isTotal ? 'text-gray-800' : 'text-gray-700'
      }`}>
        {isDeduction ? '-' : ''}{formatCurrency(Math.abs(item.rawValue))}
      </p>
      {item.percentOfGross !== undefined && (
        <p className="text-xs text-gray-400 mt-0.5">
          {item.percentOfGross.toFixed(1)}% thu nhập gộp
        </p>
      )}
      {item.detail && (
        <p className="text-xs text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
          {item.detail}
        </p>
      )}
    </div>
  );
}

function formatYAxisTick(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return m % 1 === 0 ? `${m}tr` : `${m.toFixed(1)}tr`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`;
  }
  return formatNumber(value);
}

function IncomeWaterfallChartComponent({ result, label }: IncomeWaterfallChartProps) {
  const data = useMemo(() => buildWaterfallData(result), [result]);

  if (result.grossIncome <= 0) return null;

  const gross = result.grossIncome;
  const netPercent = gross > 0 ? (result.netIncome / gross) * 100 : 0;
  const insurancePercent = gross > 0 ? (result.insuranceDeduction / gross) * 100 : 0;
  const deductionTotal = result.personalDeduction + result.dependentDeduction + result.otherDeductions;
  const deductionPercent = gross > 0 ? (deductionTotal / gross) * 100 : 0;
  const taxPercent = gross > 0 ? (result.taxAmount / gross) * 100 : 0;

  return (
    <div className="card mt-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 bg-blue-100 rounded-lg">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-gray-800">
            Dòng tiền từ GROSS đến NET {label ? `(${label})` : ''}
          </h4>
          <p className="text-xs text-gray-500">Bạn giữ lại {netPercent.toFixed(0)}% thu nhập gộp</p>
        </div>
      </div>

      {/* Flow summary - horizontal breakdown */}
      <div className="mb-5">
        {/* Stacked progress bar: chỉ hiển thị dòng tiền thật (Bảo hiểm + Thuế + Thực nhận = 100%) */}
        <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
          <div className="h-full transition-all" style={{ width: `${insurancePercent}%`, backgroundColor: COLORS.insurance }} />
          <div className="h-full transition-all" style={{ width: `${taxPercent}%`, backgroundColor: COLORS.tax }} />
          <div className="h-full transition-all" style={{ width: `${netPercent}%`, backgroundColor: COLORS.net }} />
        </div>

        {/* Flow items */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.insurance }} />
            <div className="min-w-0">
              <div className="text-xs text-gray-500 truncate">Bảo hiểm</div>
              <div className="text-sm font-semibold font-mono tabular-nums text-orange-600">
                {formatCurrency(result.insuranceDeduction)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.deduction }} />
            <div className="min-w-0">
              <div className="text-xs text-gray-500 truncate">Giảm trừ</div>
              <div className="text-sm font-semibold font-mono tabular-nums text-purple-600">
                {formatCurrency(deductionTotal)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.tax }} />
            <div className="min-w-0">
              <div className="text-xs text-gray-500 truncate">Thuế TNCN</div>
              <div className="text-sm font-semibold font-mono tabular-nums text-red-600">
                {formatCurrency(result.taxAmount)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.net }} />
            <div className="min-w-0">
              <div className="text-xs text-gray-500 truncate">Thực nhận</div>
              <div className="text-sm font-semibold font-mono tabular-nums text-green-600">
                {formatCurrency(result.netIncome)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Waterfall Chart */}
      <div className="w-full overflow-x-auto -mx-2 px-2">
        <div style={{ minWidth: 400, height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
              barCategoryGap="18%"
            >
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                interval={0}
                height={30}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tickFormatter={formatYAxisTick}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                width={48}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<WaterfallTooltip />}
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              />
              <ReferenceLine y={0} stroke="#e5e7eb" />

              <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
              <Bar
                dataKey="value"
                stackId="waterfall"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={500}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} fillOpacity={entry.isTotal ? 1 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export const IncomeWaterfallChart = memo(IncomeWaterfallChartComponent);
export default IncomeWaterfallChart;
