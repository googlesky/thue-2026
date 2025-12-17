'use client';

import { YearScenario, calculateYearlyTax, MonthlyEntry } from '@/lib/yearlyTaxCalculator';
import MonthlyInputGrid from './MonthlyInputGrid';
import YearlySummary from './YearlySummary';
import { useEffect, useState, useMemo } from 'react';

interface ScenarioColumnProps {
  scenario: YearScenario;
  onChange: (scenario: YearScenario) => void;
  isOptimal?: boolean;
  showDetails?: boolean;
}

export default function ScenarioColumn({
  scenario,
  onChange,
  isOptimal = false,
  showDetails = false,
}: ScenarioColumnProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);

  // Sync isExpanded với showDetails khi prop thay đổi
  useEffect(() => {
    setIsExpanded(showDetails);
  }, [showDetails]);

  // Tính toán kết quả - dùng useMemo thay vì useState+useEffect
  // để tránh flash of empty content
  const result = useMemo(() => calculateYearlyTax(scenario), [scenario]);

  const handleMonthsChange = (months: MonthlyEntry[], bonusMonths: MonthlyEntry[]) => {
    onChange({
      ...scenario,
      months,
      bonusMonths,
    });
  };

  const yearColor = scenario.year === 2025 ? 'border-gray-300' : 'border-primary-300';
  const headerBg = scenario.year === 2025 ? 'bg-gray-100' : 'bg-primary-50';

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${yearColor} ${isOptimal ? 'ring-2 ring-green-400' : ''}`}>
      {/* Header */}
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
        <div>
          <h3 className="font-bold text-lg">{scenario.name}</h3>
          <div className="text-xs text-gray-500">
            {scenario.year === 2025 ? 'Luật hiện hành' : 'T1-6: Luật cũ | T7-12: Luật mới'}
          </div>
        </div>
        {isOptimal && (
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Tối ưu
          </span>
        )}
      </div>

      {/* Toggle Details */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1 border-b"
      >
        {isExpanded ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Ẩn chi tiết
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Xem chi tiết
          </>
        )}
      </button>

      {/* Monthly Input Grid */}
      {isExpanded && (
        <div className="p-4 border-b bg-white">
          <MonthlyInputGrid
            months={scenario.months}
            bonusMonths={scenario.bonusMonths}
            onChange={handleMonthsChange}
            year={scenario.year}
          />
        </div>
      )}

      {/* Summary */}
      <div className="p-4">
        <YearlySummary result={result} isHighlighted={isOptimal} />
      </div>
    </div>
  );
}
