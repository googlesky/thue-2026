'use client';

import { YearlyResult } from '@/lib/yearlyTaxCalculator';
import { formatCurrency } from '@/lib/taxCalculator';

interface YearlySummaryProps {
  result: YearlyResult;
  isHighlighted?: boolean;
}

export default function YearlySummary({ result, isHighlighted = false }: YearlySummaryProps) {
  const {
    year,
    totalGross,
    totalInsurance,
    totalTax,
    totalNet,
    effectiveRate,
    monthlyBreakdown,
    oldLawMonths,
    newLawMonths,
  } = result;

  const totalMonths = monthlyBreakdown.length;
  const bonusCount = monthlyBreakdown.filter(m => m.isBonus).length;

  return (
    <div className={`rounded-lg p-4 ${isHighlighted ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{year}</span>
          <span className="text-xs text-gray-500">
            ({totalMonths - bonusCount} tháng{bonusCount > 0 ? ` + ${bonusCount} thưởng` : ''})
          </span>
        </div>
        {isHighlighted && (
          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
            Tối ưu
          </span>
        )}
      </div>

      {/* Luật áp dụng */}
      {year === 2026 && (
        <div className="flex gap-2 text-xs mb-3">
          {oldLawMonths > 0 && (
            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
              {oldLawMonths} tháng luật cũ
            </span>
          )}
          {newLawMonths > 0 && (
            <span className="bg-green-200 text-green-700 px-2 py-0.5 rounded">
              {newLawMonths} tháng luật mới
            </span>
          )}
        </div>
      )}

      {/* Chi tiết */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Tổng thu nhập</span>
          <span className="font-medium">{formatCurrency(totalGross)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Bảo hiểm</span>
          <span className="text-gray-500">-{formatCurrency(totalInsurance)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Thuế TNCN</span>
          <span className={`font-medium ${isHighlighted ? 'text-green-600' : 'text-red-600'}`}>
            -{formatCurrency(totalTax)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Thuế suất thực tế</span>
          <span className="text-gray-500">{effectiveRate.toFixed(2)}%</span>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Thực nhận</span>
            <span className={`font-bold text-lg ${isHighlighted ? 'text-green-600' : 'text-gray-800'}`}>
              {formatCurrency(totalNet)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
