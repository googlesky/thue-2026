'use client';

import { useState, useEffect } from 'react';
import {
  OtherIncomeState,
  DEFAULT_OTHER_INCOME,
  calculateOtherIncomeTax,
  formatCurrency,
  formatNumber,
  OtherIncomeTaxResult,
} from '@/lib/taxCalculator';

interface OtherIncomeInputProps {
  otherIncome: OtherIncomeState;
  onChange: (income: OtherIncomeState) => void;
}

interface IncomeFieldConfig {
  key: keyof OtherIncomeState;
  label: string;
  icon: string;
  description: string;
  placeholder: string;
}

const incomeFields: IncomeFieldConfig[] = [
  {
    key: 'freelance',
    label: 'Thu nhập dịch vụ / Freelance',
    icon: '💼',
    description: 'Thu nhập từ cung cấp dịch vụ, tư vấn, thiết kế... (10% doanh thu)',
    placeholder: 'VD: 20,000,000',
  },
  {
    key: 'rental',
    label: 'Cho thuê tài sản',
    icon: '🏠',
    description: 'Cho thuê nhà, phòng trọ, mặt bằng... (5% TNCN + 5% VAT)',
    placeholder: 'VD: 10,000,000',
  },
  {
    key: 'investment',
    label: 'Cổ tức / Lãi tiền gửi',
    icon: '📈',
    description: 'Thu nhập từ cổ tức, lãi tiền gửi ngân hàng (5%)',
    placeholder: 'VD: 5,000,000',
  },
  {
    key: 'transfer',
    label: 'Chuyển nhượng chứng khoán',
    icon: '📊',
    description: 'Giá trị giao dịch bán chứng khoán (0.1% giá bán)',
    placeholder: 'VD: 100,000,000',
  },
  {
    key: 'lottery',
    label: 'Trúng thưởng',
    icon: '🎰',
    description: 'Trúng xổ số, casino, khuyến mãi... (10% phần > 10 triệu)',
    placeholder: 'VD: 50,000,000',
  },
];

export default function OtherIncomeInput({ otherIncome, onChange }: OtherIncomeInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFields, setActiveFields] = useState<Set<keyof OtherIncomeState>>(
    new Set(
      Object.entries(otherIncome)
        .filter(([, value]) => value > 0)
        .map(([key]) => key as keyof OtherIncomeState)
    )
  );

  // Sync activeFields when otherIncome changes externally (e.g., loading from history)
  useEffect(() => {
    const newActiveFields = new Set(
      Object.entries(otherIncome)
        .filter(([, value]) => value > 0)
        .map(([key]) => key as keyof OtherIncomeState)
    );
    setActiveFields(newActiveFields);
  }, [otherIncome]);

  const taxResult = calculateOtherIncomeTax(otherIncome);
  const hasAnyIncome = taxResult.totalIncome > 0;

  const handleValueChange = (key: keyof OtherIncomeState, value: string) => {
    const numericValue = parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
    onChange({
      ...otherIncome,
      [key]: numericValue,
    });
  };

  const toggleField = (key: keyof OtherIncomeState) => {
    const newActiveFields = new Set(activeFields);
    if (newActiveFields.has(key)) {
      newActiveFields.delete(key);
      // Reset value when removing field
      onChange({
        ...otherIncome,
        [key]: 0,
      });
    } else {
      newActiveFields.add(key);
    }
    setActiveFields(newActiveFields);
  };

  const resetAll = () => {
    onChange(DEFAULT_OTHER_INCOME);
    setActiveFields(new Set());
  };

  return (
    <div className="card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="w-full min-h-[44px] flex items-center justify-between text-left py-2"
      >
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Thu nhập khác
          {hasAnyIncome && (
            <span className="text-sm font-normal text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
              {formatCurrency(taxResult.totalIncome)}
            </span>
          )}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Quick add buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn loại thu nhập
            </label>
            <div className="flex flex-wrap gap-2">
              {incomeFields.map((field) => (
                <button
                  key={field.key}
                  onClick={() => toggleField(field.key)}
                  aria-pressed={activeFields.has(field.key)}
                  className={`px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeFields.has(field.key)
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                >
                  <span>{field.icon}</span>
                  <span>{field.label.split('/')[0].trim()}</span>
                  {activeFields.has(field.key) && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active income fields */}
          {activeFields.size > 0 && (
            <div className="space-y-4">
              {incomeFields
                .filter((field) => activeFields.has(field.key))
                .map((field) => (
                  <div key={field.key} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <span>{field.icon}</span>
                        {field.label}
                      </label>
                      <button
                        onClick={() => toggleField(field.key)}
                        className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label={`Xóa ${field.label}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formatNumber(otherIncome[field.key])}
                      onChange={(e) => handleValueChange(field.key, e.target.value)}
                      className="input-field"
                      placeholder={field.placeholder}
                    />
                    <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Tax calculation result */}
          {hasAnyIncome && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-3">Chi tiết thuế thu nhập khác</h4>
              <div className="space-y-2">
                <TaxResultRow
                  label="Freelance / Dịch vụ"
                  result={taxResult.freelance}
                  show={taxResult.freelance.income > 0}
                />
                <TaxResultRow
                  label="Cho thuê tài sản"
                  result={taxResult.rental}
                  show={taxResult.rental.income > 0}
                  isRental
                />
                <TaxResultRow
                  label="Cổ tức / Lãi tiền gửi"
                  result={taxResult.investment}
                  show={taxResult.investment.income > 0}
                />
                <TaxResultRow
                  label="Chuyển nhượng CK"
                  result={taxResult.transfer}
                  show={taxResult.transfer.income > 0}
                />
                <TaxResultRow
                  label="Trúng thưởng"
                  result={taxResult.lottery}
                  show={taxResult.lottery.income > 0}
                  isLottery
                />

                {/* Total */}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Tổng thu nhập khác:</span>
                    <span className="font-bold">{formatCurrency(taxResult.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span className="font-medium">Tổng thuế phải nộp:</span>
                    <span className="font-bold">-{formatCurrency(taxResult.totalTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="font-medium">Thực nhận:</span>
                    <span className="font-bold">{formatCurrency(taxResult.totalNet)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reset button */}
          {activeFields.size > 0 && (
            <button
              onClick={resetAll}
              className="text-sm text-gray-500 hover:text-red-600 min-h-[44px] py-2"
            >
              Xóa tất cả thu nhập khác
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for tax result rows
function TaxResultRow({
  label,
  result,
  show,
  isRental,
  isLottery,
}: {
  label: string;
  result: OtherIncomeTaxResult['freelance'] | OtherIncomeTaxResult['rental'] | OtherIncomeTaxResult['lottery'];
  show: boolean;
  isRental?: boolean;
  isLottery?: boolean;
}) {
  if (!show) return null;

  const rentalResult = result as OtherIncomeTaxResult['rental'];
  const lotteryResult = result as OtherIncomeTaxResult['lottery'];
  const basicResult = result as OtherIncomeTaxResult['freelance'];

  return (
    <div className="flex justify-between items-start text-sm bg-white rounded p-2">
      <div>
        <span className="text-gray-700">{label}</span>
        <span className="text-xs text-gray-500 ml-2">({result.note})</span>
        {isLottery && lotteryResult.taxableAmount < lotteryResult.income && (
          <div className="text-xs text-gray-500">
            Phần chịu thuế: {formatCurrency(lotteryResult.taxableAmount)}
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-gray-700">{formatCurrency(result.income)}</div>
        <div className="text-red-600 text-xs">
          -{formatCurrency(isRental ? rentalResult.totalTax : basicResult.tax)}
        </div>
      </div>
    </div>
  );
}
