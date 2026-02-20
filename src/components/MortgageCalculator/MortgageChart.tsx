'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { YearlyAmortization } from '@/lib/mortgageCalculator';
import { formatNumber } from '@/lib/taxCalculator';

interface MortgageChartProps {
  data: YearlyAmortization[];
  preferentialMonths: number;
}

function formatMillions(value: number): string {
  return `${(value / 1_000_000).toFixed(0)}tr`;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: YearlyAmortization;
    dataKey: string;
    value: number;
    color: string;
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 max-w-[220px]">
      <p className="font-semibold text-sm text-gray-800 mb-2">Năm {d.year}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-blue-600">Gốc trả</span>
          <span className="font-mono tabular-nums font-medium">{formatNumber(Math.round(d.totalPrincipal))}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-red-500">Lãi trả</span>
          <span className="font-mono tabular-nums font-medium">{formatNumber(Math.round(d.totalInterest))}</span>
        </div>
        <div className="pt-1 border-t border-gray-100 flex justify-between gap-4">
          <span className="text-gray-600 font-medium">Tổng trả</span>
          <span className="font-mono tabular-nums font-bold">{formatNumber(Math.round(d.totalPayment))}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Dư nợ</span>
          <span className="font-mono tabular-nums text-gray-500">{formatNumber(Math.round(d.endingBalance))}</span>
        </div>
      </div>
    </div>
  );
}

export function MortgageAmortizationChart({ data, preferentialMonths }: MortgageChartProps) {
  const preferentialYears = Math.ceil(preferentialMonths / 12);

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: Math.max(400, data.length * 40) }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="year"
              tickFormatter={(v) => `${v}`}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tickFormatter={formatMillions}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              width={50}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
            {preferentialYears > 0 && preferentialYears < data.length && (
              <ReferenceLine
                x={preferentialYears}
                stroke="#f97316"
                strokeDasharray="5 5"
                label={{
                  value: 'Hết ưu đãi',
                  position: 'top',
                  fill: '#f97316',
                  fontSize: 11,
                }}
              />
            )}
            <Bar
              dataKey="totalPrincipal"
              name="Gốc"
              stackId="a"
              fill="#3b82f6"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="totalInterest"
              name="Lãi"
              stackId="a"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
