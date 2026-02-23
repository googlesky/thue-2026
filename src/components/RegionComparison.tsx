'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  formatCurrency,
  formatNumber,
  RegionType,
  SharedTaxState,
  REGIONAL_MINIMUM_WAGES_2026,
} from '@/lib/taxCalculator';
import { grossToNet, GrossNetResult } from '@/lib/grossNetCalculator';
import { parseCurrency } from '@/lib/taxCalculator';

interface RegionComparisonProps {
  sharedState: SharedTaxState;
  onStateChange: (updates: Partial<SharedTaxState>) => void;
}

const REGION_NAMES: Record<RegionType, string> = {
  1: 'Vùng I',
  2: 'Vùng II',
  3: 'Vùng III',
  4: 'Vùng IV',
};

const REGION_DESCRIPTIONS: Record<RegionType, string> = {
  1: 'Hà Nội, TP.HCM, Hải Phòng, Đà Nẵng...',
  2: 'TP thuộc tỉnh, huyện ngoại thành...',
  3: 'Thị xã, huyện thuộc tỉnh...',
  4: 'Huyện miền núi, vùng sâu vùng xa...',
};

const REGION_COLORS: Record<RegionType, { main: string; bg: string; light: string; text: string }> = {
  1: { main: '#3b82f6', bg: 'bg-blue-50', light: 'bg-blue-100', text: 'text-blue-700' },
  2: { main: '#8b5cf6', bg: 'bg-violet-50', light: 'bg-violet-100', text: 'text-violet-700' },
  3: { main: '#f59e0b', bg: 'bg-amber-50', light: 'bg-amber-100', text: 'text-amber-700' },
  4: { main: '#10b981', bg: 'bg-emerald-50', light: 'bg-emerald-100', text: 'text-emerald-700' },
};

interface RegionResult {
  region: RegionType;
  name: string;
  minimumWage: number;
  result: GrossNetResult;
}

function displayCurrency(value: number): string {
  if (value === 0) return '0';
  return formatNumber(value);
}

// Custom tooltip for NET chart
function NetChartTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; net: number; tax: number; insurance: number; region: RegionType; gross: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const netPercent = d.gross > 0 ? (d.net / d.gross * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 max-w-[220px]">
      <p className="font-semibold text-sm mb-2" style={{ color: REGION_COLORS[d.region].main }}>
        {d.name}
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Thực nhận</span>
          <span className="font-mono tabular-nums font-bold text-green-600">{formatCurrency(d.net)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Bảo hiểm</span>
          <span className="font-mono tabular-nums text-orange-600">-{formatCurrency(d.insurance)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Thuế TNCN</span>
          <span className="font-mono tabular-nums text-red-600">-{formatCurrency(d.tax)}</span>
        </div>
        <div className="pt-1 border-t border-gray-100 flex justify-between gap-4">
          <span className="text-gray-500">Tỷ lệ NET/GROSS</span>
          <span className="font-mono tabular-nums font-medium">{netPercent.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function RegionComparisonComponent({ sharedState, onStateChange }: RegionComparisonProps) {
  const [customGross, setCustomGross] = useState<string>('');
  const [useCustomGross, setUseCustomGross] = useState(false);

  const grossIncome = useCustomGross && customGross !== ''
    ? parseCurrency(customGross)
    : sharedState.grossIncome;

  const handleCustomGrossChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw === '') {
      setCustomGross('');
      return;
    }
    const num = parseInt(raw, 10) || 0;
    setCustomGross(formatNumber(num));
  }, []);

  const handleCustomGrossBlur = useCallback(() => {
    if (customGross === '') {
      setCustomGross('0');
    }
  }, [customGross]);

  // Calculate for all 4 regions
  const regionResults = useMemo<RegionResult[]>(() => {
    const regions: RegionType[] = [1, 2, 3, 4];
    return regions.map(region => {
      const result = grossToNet({
        amount: grossIncome,
        type: 'gross',
        dependents: sharedState.dependents,
        hasInsurance: sharedState.hasInsurance,
        useNewLaw: true,
        region,
      });

      return {
        region,
        name: REGION_NAMES[region],
        minimumWage: REGIONAL_MINIMUM_WAGES_2026[region].wage,
        result,
      };
    });
  }, [grossIncome, sharedState.dependents, sharedState.hasInsurance]);

  // Chart data - NET only with region colors
  const chartData = useMemo(() => {
    return regionResults.map(r => ({
      name: r.name,
      net: r.result.net,
      tax: r.result.tax,
      insurance: r.result.insurance,
      region: r.region,
      gross: r.result.gross,
    }));
  }, [regionResults]);

  // Find best and worst region
  const bestRegion = useMemo(() => {
    return regionResults.reduce((best, curr) =>
      curr.result.net > best.result.net ? curr : best
    );
  }, [regionResults]);

  const worstRegion = useMemo(() => {
    return regionResults.reduce((worst, curr) =>
      curr.result.net < worst.result.net ? curr : worst
    );
  }, [regionResults]);

  const netDifference = bestRegion.result.net - worstRegion.result.net;
  const maxNet = Math.max(...regionResults.map(r => r.result.net));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">So sánh lương theo vùng</h2>
              <p className="text-sm text-gray-500">Cùng GROSS, NET khác nhau do mức đóng bảo hiểm khác nhau</p>
            </div>
          </div>

          {/* Toggle custom gross */}
          <label className="inline-flex items-center gap-2 cursor-pointer flex-shrink-0">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={useCustomGross}
                onChange={(e) => setUseCustomGross(e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500" />
            </div>
            <span className="text-sm text-gray-600">GROSS khác</span>
          </label>
        </div>

        {/* Custom gross input */}
        {useCustomGross && (
          <div className="mb-5">
            <div className="relative max-w-xs">
              <input
                type="text"
                inputMode="numeric"
                value={customGross}
                onChange={handleCustomGrossChange}
                onBlur={handleCustomGrossBlur}
                placeholder="Nhập mức lương thử nghiệm..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">VND</span>
            </div>
          </div>
        )}

        {/* Current GROSS display */}
        <div className="bg-gray-50 rounded-lg p-3.5 flex items-center justify-between">
          <span className="text-sm text-gray-600">Lương GROSS</span>
          <div className="text-right">
            <span className="text-lg font-bold font-mono tabular-nums text-gray-800">
              {formatCurrency(grossIncome)}
            </span>
            {sharedState.dependents > 0 && (
              <span className="text-xs text-gray-400 ml-2">
                ({sharedState.dependents} NPT)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Region Cards - Main comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {regionResults.map(r => {
          const colors = REGION_COLORS[r.region];
          const isCurrent = sharedState.region === r.region;
          const isBest = r.region === bestRegion.region && netDifference > 0;
          const netPercent = grossIncome > 0 ? (r.result.net / grossIncome) * 100 : 0;
          const barWidth = maxNet > 0 ? (r.result.net / maxNet) * 100 : 0;

          return (
            <div
              key={r.region}
              className={`card p-4 border-2 transition-all cursor-pointer ${
                isCurrent
                  ? 'border-primary-400 bg-primary-50/30 shadow-md'
                  : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
              }`}
              onClick={() => onStateChange({ region: r.region })}
            >
              {/* Region header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.main }} />
                  <span className="font-semibold text-sm text-gray-800">{r.name}</span>
                </div>
                {isCurrent && (
                  <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
                    Hiện tại
                  </span>
                )}
                {isBest && !isCurrent && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                    Tốt nhất
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-3 line-clamp-1">{REGION_DESCRIPTIONS[r.region]}</p>

              {/* NET highlight */}
              <div className="mb-3">
                <div className="text-xl font-bold font-mono tabular-nums text-green-600">
                  {formatCurrency(r.result.net)}
                </div>
                <div className="text-[11px] text-gray-400 font-mono tabular-nums">
                  {netPercent.toFixed(1)}% GROSS
                </div>
              </div>

              {/* NET bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${barWidth}%`, backgroundColor: colors.main }}
                />
              </div>

              {/* Details */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Bảo hiểm</span>
                  <span className="font-mono tabular-nums text-orange-600">-{formatCurrency(r.result.insurance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thuế</span>
                  <span className="font-mono tabular-nums text-red-600">-{formatCurrency(r.result.tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lương TT vùng</span>
                  <span className="font-mono tabular-nums">{formatNumber(r.minimumWage)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Highlight difference */}
      {netDifference > 0 && (
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-green-500 rounded-full mt-0.5 flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">
                Chênh lệch NET giữa {bestRegion.name} và {worstRegion.name}:
                {' '}<span className="font-bold font-mono tabular-nums">{formatCurrency(netDifference)}/tháng</span>
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Tương đương {formatCurrency(netDifference * 12)}/năm
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NET Comparison Chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">So sánh lương thực nhận</h3>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
              barCategoryGap="30%"
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
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
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                width={48}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<NetChartTooltip />}
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              />
              <Bar dataKey="net" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={500}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={REGION_COLORS[entry.region as RegionType].main} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table - desktop only */}
      <div className="card hidden sm:block">
        <h3 className="font-semibold text-gray-800 mb-4">Chi tiết theo từng vùng</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Khoản mục</th>
                {regionResults.map(r => (
                  <th key={r.region} className="text-right py-3 px-2 font-medium" style={{ color: REGION_COLORS[r.region].main }}>
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 px-2 text-gray-600">GROSS</td>
                {regionResults.map(r => (
                  <td key={r.region} className="py-2.5 px-2 text-right font-mono tabular-nums font-medium">
                    {formatCurrency(r.result.gross)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 px-2 text-gray-600">Bảo hiểm (10,5%)</td>
                {regionResults.map(r => (
                  <td key={r.region} className="py-2.5 px-2 text-right font-mono tabular-nums text-orange-600">
                    -{formatCurrency(r.result.insurance)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 px-2 text-gray-600">Giảm trừ</td>
                {regionResults.map(r => (
                  <td key={r.region} className="py-2.5 px-2 text-right font-mono tabular-nums text-purple-600">
                    -{formatCurrency(r.result.deductions.personal + r.result.deductions.dependent)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 px-2 text-gray-600">TN tính thuế</td>
                {regionResults.map(r => (
                  <td key={r.region} className="py-2.5 px-2 text-right font-mono tabular-nums">
                    {formatCurrency(r.result.taxableIncome)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 px-2 text-gray-600">Thuế TNCN</td>
                {regionResults.map(r => (
                  <td key={r.region} className="py-2.5 px-2 text-right font-mono tabular-nums text-red-600">
                    -{formatCurrency(r.result.tax)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 bg-green-50/50">
                <td className="py-3 px-2 font-semibold text-gray-800">NET (Thực nhận)</td>
                {regionResults.map(r => (
                  <td key={r.region} className="py-3 px-2 text-right font-mono tabular-nums font-bold text-green-600">
                    {formatCurrency(r.result.net)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-2 text-gray-500 text-xs">Thuế suất thực tế</td>
                {regionResults.map(r => {
                  const rate = r.result.gross > 0 ? (r.result.tax / r.result.gross) * 100 : 0;
                  return (
                    <td key={r.region} className="py-2.5 px-2 text-right text-xs font-medium text-gray-500">
                      {rate.toFixed(2)}%
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const RegionComparison = memo(RegionComparisonComponent);
export default RegionComparison;
