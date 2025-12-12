'use client';

import { TaxResult as TaxResultType, formatCurrency } from '@/lib/taxCalculator';

interface TaxResultProps {
  oldResult: TaxResultType;
  newResult: TaxResultType;
}

export default function TaxResult({ oldResult, newResult }: TaxResultProps) {
  const savings = oldResult.taxAmount - newResult.taxAmount;
  const savingsPercent = oldResult.taxAmount > 0
    ? ((savings / oldResult.taxAmount) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Tổng kết tiết kiệm */}
      {savings > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold">Bạn tiết kiệm được</h3>
          </div>
          <div className="text-4xl font-bold mb-2">
            {formatCurrency(savings)}/tháng
          </div>
          <div className="text-green-100">
            Tương đương {formatCurrency(savings * 12)}/năm (giảm {savingsPercent}%)
          </div>
        </div>
      )}

      {/* So sánh chi tiết */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Luật cũ */}
        <div className="card border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <h3 className="text-lg font-bold text-gray-800">Luật hiện hành</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">7 bậc</span>
          </div>
          <ResultDetails result={oldResult} colorClass="text-red-600" />
        </div>

        {/* Luật mới */}
        <div className="card border-2 border-primary-200 bg-primary-50/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-primary-500"></div>
            <h3 className="text-lg font-bold text-gray-800">Luật mới 2026</h3>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">5 bậc</span>
          </div>
          <ResultDetails result={newResult} colorClass="text-primary-600" />
        </div>
      </div>

      {/* Chi tiết biểu thuế */}
      <div className="grid md:grid-cols-2 gap-6">
        <TaxBreakdown result={oldResult} title="Chi tiết thuế (Luật cũ)" colorClass="bg-red-500" />
        <TaxBreakdown result={newResult} title="Chi tiết thuế (Luật mới)" colorClass="bg-primary-500" />
      </div>
    </div>
  );
}

function ResultDetails({ result, colorClass }: { result: TaxResultType; colorClass: string }) {
  const items = [
    { label: 'Thu nhập gộp', value: result.grossIncome },
    { label: 'Trừ BHXH, BHYT, BHTN', value: -result.insuranceDeduction },
    { label: 'Giảm trừ bản thân', value: -result.personalDeduction },
    { label: 'Giảm trừ người phụ thuộc', value: -result.dependentDeduction },
    ...(result.otherDeductions > 0 ? [{ label: 'Giảm trừ khác', value: -result.otherDeductions }] : []),
  ];

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between text-sm">
          <span className="text-gray-600">{item.label}</span>
          <span className={item.value < 0 ? 'text-gray-500' : 'font-medium'}>
            {item.value < 0 ? '' : ''}{formatCurrency(item.value)}
          </span>
        </div>
      ))}

      <div className="border-t pt-3 mt-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Thu nhập tính thuế</span>
          <span className="font-medium">{formatCurrency(result.taxableIncome)}</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mt-4">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">Thuế TNCN phải nộp</span>
          <span className={`text-2xl font-bold ${colorClass}`}>
            {formatCurrency(result.taxAmount)}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-2 text-gray-500">
          <span>Thuế suất thực tế</span>
          <span>{result.effectiveRate.toFixed(2)}%</span>
        </div>
      </div>

      <div className="border-t pt-3 mt-3">
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">Thu nhập thực nhận</span>
          <span className="text-xl font-bold text-green-600">
            {formatCurrency(result.netIncome)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TaxBreakdown({ result, title, colorClass }: { result: TaxResultType; title: string; colorClass: string }) {
  if (result.taxBreakdown.length === 0) {
    return (
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-4">{title}</h4>
        <p className="text-gray-500 text-center py-4">Không phải nộp thuế</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h4 className="font-semibold text-gray-800 mb-4">{title}</h4>
      <div className="space-y-2">
        {result.taxBreakdown.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`w-2 h-8 rounded-full ${colorClass}`} style={{ opacity: 0.3 + (index * 0.15) }}></div>
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Bậc {item.bracket} ({(item.rate * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">{formatCurrency(item.taxAmount)}</span>
              </div>
              <div className="text-xs text-gray-400">
                {formatCurrency(item.taxableAmount)} × {(item.rate * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        ))}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between font-semibold">
            <span>Tổng thuế</span>
            <span>{formatCurrency(result.taxAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
