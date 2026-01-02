'use client';

import { MonthlyEntry } from '@/lib/yearlyTaxCalculator';
import { formatNumber, parseCurrency } from '@/lib/taxCalculator';

interface MonthlyInputGridProps {
  months: MonthlyEntry[];
  bonusMonths: MonthlyEntry[];
  onChange: (months: MonthlyEntry[], bonusMonths: MonthlyEntry[]) => void;
  year: 2025 | 2026;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
  'T7', 'T8', 'T9', 'T10', 'T11', 'T12'
];

export default function MonthlyInputGrid({
  months,
  bonusMonths,
  onChange,
  year,
  disabled = false,
}: MonthlyInputGridProps) {
  const handleMonthChange = (index: number, value: string) => {
    const newMonths = [...months];
    newMonths[index] = {
      ...newMonths[index],
      grossIncome: parseCurrency(value),
    };
    onChange(newMonths, bonusMonths);
  };

  const handleBonusChange = (index: number, value: string) => {
    const newBonusMonths = [...bonusMonths];
    newBonusMonths[index] = {
      ...newBonusMonths[index],
      grossIncome: parseCurrency(value),
    };
    onChange(months, newBonusMonths);
  };

  const handleFillAll = () => {
    if (months[0]?.grossIncome > 0) {
      const firstValue = months[0].grossIncome;
      const newMonths = months.map(m => ({ ...m, grossIncome: firstValue }));
      onChange(newMonths, bonusMonths);
    }
  };

  const addBonus = () => {
    const nextMonth = 13 + bonusMonths.length;
    const newBonus: MonthlyEntry = {
      month: nextMonth,
      grossIncome: months[0]?.grossIncome || 0,
      isBonus: true,
      label: `Thưởng T${nextMonth}`,
    };
    onChange(months, [...bonusMonths, newBonus]);
  };

  const removeBonus = (index: number) => {
    const newBonusMonths = bonusMonths.filter((_, i) => i !== index);
    onChange(months, newBonusMonths);
  };

  // Xác định tháng nào áp dụng luật mới
  // Note: Luật mới áp dụng từ 01/01/2026 cho toàn bộ năm đối với thu nhập tiền lương
  const isNewLawMonth = (_monthIndex: number) => {
    return year === 2026; // All months in 2026 use new law
  };

  return (
    <div className="space-y-3">
      {/* Header với nút Fill All */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">Lương hàng tháng</span>
        <button
          type="button"
          onClick={handleFillAll}
          disabled={disabled}
          className="text-xs text-primary-600 hover:text-primary-700 disabled:text-gray-500 min-h-[44px] py-2 px-2"
        >
          Điền giống T1
        </button>
      </div>

      {/* Grid 12 tháng (2 cột mobile, 3 cột desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {months.map((entry, index) => (
          <div key={entry.month} className="relative">
            <label className="text-xs text-gray-500 flex items-center gap-1">
              {MONTH_NAMES[index]}
              {isNewLawMonth(index) && (
                <span className="text-[10px] text-green-600" title="Luật mới">*</span>
              )}
            </label>
            <input
              type="text"
              value={entry.grossIncome > 0 ? formatNumber(entry.grossIncome) : ''}
              onChange={(e) => handleMonthChange(index, e.target.value)}
              placeholder="0"
              disabled={disabled}
              className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500 ${
                isNewLawMonth(index) ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Chú thích luật */}
      {year === 2026 && (
        <div className="text-[10px] text-gray-500 flex items-center gap-1">
          <span className="text-green-600">*</span>
          <span>Áp dụng luật mới từ 01/01/2026 (giảm trừ 15.5tr, 5 bậc thuế)</span>
        </div>
      )}

      {/* Thưởng */}
      <div className="border-t pt-3 mt-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500">Thưởng</span>
          <button
            type="button"
            onClick={addBonus}
            disabled={disabled || bonusMonths.length >= 3}
            className="text-xs text-primary-600 hover:text-primary-700 disabled:text-gray-500 flex items-center gap-1 min-h-[44px] py-2 px-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm thưởng
          </button>
        </div>

        {bonusMonths.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-2">
            Không có khoản thưởng
          </div>
        ) : (
          <div className="space-y-2">
            {bonusMonths.map((bonus, index) => (
              <div key={`bonus-${bonus.month}`} className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">{bonus.label || `T${bonus.month}`}</label>
                  <input
                    type="text"
                    value={bonus.grossIncome > 0 ? formatNumber(bonus.grossIncome) : ''}
                    onChange={(e) => handleBonusChange(index, e.target.value)}
                    placeholder="0"
                    disabled={disabled}
                    className="w-full px-2 py-1.5 text-sm border border-amber-200 bg-amber-50/50 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeBonus(index)}
                  disabled={disabled}
                  aria-label={`Xóa thưởng ${bonus.label || `T${bonus.month}`}`}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 disabled:text-gray-300 rounded-lg mt-4"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
