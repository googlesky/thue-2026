'use client';

import { useMemo, memo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { calculateTaxRange, formatCurrency } from '@/lib/taxCalculator';

interface TaxChartProps {
  dependents: number;
  currentIncome: number;
}

const RANGE = { min: 10_000_000, max: 150_000_000, step: 5_000_000 };

// Trục dạng "15tr", "2,5tr" (dấu phẩy thập phân kiểu Việt Nam)
const formatMillions = (value: number) =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)}tr`;

// Memoized CustomTooltip component to prevent unnecessary re-renders
const CustomTooltip = memo(function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <p className="font-semibold text-gray-800 mb-2">
          Thu nhập: {formatCurrency(label)}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
});

function TaxChartComponent({ dependents, currentIncome }: TaxChartProps) {
  const chartData = useMemo(() => {
    return calculateTaxRange(RANGE.min, RANGE.max, RANGE.step, dependents);
  }, [dependents]);

  // Trục X là danh mục theo bước 5tr → làm tròn lương hiện tại về mốc gần nhất; ngoài dải thì không vẽ
  const currentTick =
    currentIncome >= RANGE.min && currentIncome <= RANGE.max
      ? Math.round(currentIncome / RANGE.step) * RANGE.step
      : null;

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Biểu đồ thuế TNCN theo thu nhập
      </h3>
      <p className="text-xs text-gray-500 -mt-4 mb-4">
        Thuế/tháng theo lương GROSS, {dependents} người phụ thuộc; giả định đóng đủ BHXH, BHYT, BHTN
        theo lương GROSS (có mức trần), vùng I, không phụ cấp, không giảm trừ khác. Kết quả của bạn
        ở trên đã tính theo đúng thông tin đã nhập.
      </p>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="income"
              tickFormatter={formatMillions}
              stroke="#9ca3af"
              fontSize={11}
              interval="preserveStartEnd"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tickFormatter={formatMillions}
              stroke="#9ca3af"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            {currentTick !== null && (
              <ReferenceLine
                x={currentTick}
                stroke="#B42318"
                strokeDasharray="4 4"
                label={{ value: 'Lương của bạn', position: 'insideTopRight', fill: '#B42318', fontSize: 11 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="newTax"
              name="Thuế TNCN"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTax)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Export memoized TaxChart component
export default memo(TaxChartComponent);
