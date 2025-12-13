'use client';

import { TwoYearResult, StrategyComparison as StrategyComparisonType } from '@/lib/yearlyTaxCalculator';
import { formatCurrency } from '@/lib/taxCalculator';

interface StrategyComparisonProps {
  comparison: StrategyComparisonType;
  strategyNames?: string[];
}

export default function StrategyComparison({ comparison, strategyNames }: StrategyComparisonProps) {
  const { strategies, bestStrategy, maxSavings } = comparison;

  if (strategies.length === 0) {
    return null;
  }

  const defaultNames = strategies.map((_, i) => `Chiến lược ${i + 1}`);
  const names = strategyNames || defaultNames;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-bold text-gray-800">Tổng kết 2 năm (2025 + 2026)</h3>
      </div>

      {/* Comparison Grid */}
      <div className={`grid gap-4 ${strategies.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {strategies.map((strategy, index) => (
          <StrategyCard
            key={index}
            strategy={strategy}
            name={names[index]}
            isOptimal={index === bestStrategy}
            savings={index === bestStrategy ? maxSavings : 0}
            comparedTo={index !== 0 ? strategies[0].combinedTax - strategy.combinedTax : undefined}
          />
        ))}
      </div>

      {/* Savings Banner */}
      {maxSavings > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-bold text-lg">{names[bestStrategy]} tiết kiệm được</div>
              <div className="text-2xl font-bold">{formatCurrency(maxSavings)}</div>
              <div className="text-green-100 text-sm">so với {names[0]}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StrategyCardProps {
  strategy: TwoYearResult;
  name: string;
  isOptimal: boolean;
  savings: number;
  comparedTo?: number; // Difference from first strategy
}

function StrategyCard({ strategy, name, isOptimal, comparedTo }: StrategyCardProps) {
  const { year2025, year2026, combinedGross, combinedTax, combinedNet, combinedEffectiveRate } = strategy;

  return (
    <div className={`rounded-xl p-4 ${isOptimal ? 'bg-green-50 border-2 border-green-400' : 'bg-gray-50 border border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-gray-800">{name}</div>
        {isOptimal && (
          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Tối ưu
          </span>
        )}
      </div>

      {/* Years Summary */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="bg-white rounded-lg p-2">
          <div className="text-gray-500">2025</div>
          <div className="font-medium text-red-600">-{formatCurrency(year2025.totalTax)}</div>
        </div>
        <div className="bg-white rounded-lg p-2">
          <div className="text-gray-500">2026</div>
          <div className="font-medium text-red-600">-{formatCurrency(year2026.totalTax)}</div>
        </div>
      </div>

      {/* Combined Summary */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Tổng thu nhập</span>
          <span className="font-medium">{formatCurrency(combinedGross)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Tổng thuế 2 năm</span>
          <span className={`font-bold ${isOptimal ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(combinedTax)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Thuế suất TB</span>
          <span className="text-gray-500">{combinedEffectiveRate.toFixed(2)}%</span>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Tổng thực nhận</span>
            <span className={`font-bold text-lg ${isOptimal ? 'text-green-600' : 'text-gray-800'}`}>
              {formatCurrency(combinedNet)}
            </span>
          </div>
        </div>

        {/* Comparison to first strategy */}
        {comparedTo !== undefined && comparedTo !== 0 && (
          <div className={`text-xs mt-2 p-2 rounded ${comparedTo > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {comparedTo > 0 ? (
              <span>Tiết kiệm {formatCurrency(comparedTo)} so với CL1</span>
            ) : (
              <span>Tốn thêm {formatCurrency(Math.abs(comparedTo))} so với CL1</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
