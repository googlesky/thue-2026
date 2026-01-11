'use client';

import { memo, useMemo } from 'react';
import {
  TaxResult as TaxResultType,
  formatCurrency,
  OtherIncomeTaxResult,
  AllowancesBreakdown,
  getTaxConfigForDate,
  formatDate,
  EFFECTIVE_DATES,
} from '@/lib/taxCalculator';
import { PDFExportButton } from '@/components/PDFExport';

interface TaxResultProps {
  oldResult: TaxResultType;
  newResult: TaxResultType;
  otherIncomeTax?: OtherIncomeTaxResult | null;
  declaredSalary?: number;
}

// Component hiển thị luật đang áp dụng dựa trên ngày hiện tại
const DateAwareIndicator = memo(function DateAwareIndicator() {
  const today = new Date();
  const taxConfig = getTaxConfigForDate(today);
  const isNew2026 = taxConfig.isNew2026;

  // Tính số ngày còn lại đến mốc tiếp theo (nếu chưa đến 2026)
  const daysUntil2026 = !isNew2026
    ? Math.ceil((EFFECTIVE_DATES.NEW_TAX_LAW_2026.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className={`rounded-xl p-4 mb-4 ${
      isNew2026
        ? 'bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200'
        : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isNew2026 ? 'bg-primary-500' : 'bg-amber-500'}`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className={`text-sm font-medium ${isNew2026 ? 'text-primary-800' : 'text-amber-800'}`}>
              Ngày tính thuế: {formatDate(today)}
            </div>
            <div className={`text-xs ${isNew2026 ? 'text-primary-600' : 'text-amber-600'}`}>
              {taxConfig.lawName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isNew2026 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-500 text-white">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Luật mới có hiệu lực
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500 text-white">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Còn {daysUntil2026} ngày đến luật mới
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

function TaxResultComponent({ oldResult, newResult, otherIncomeTax, declaredSalary }: TaxResultProps) {
  const savings = oldResult.taxAmount - newResult.taxAmount;
  const savingsPercent = oldResult.taxAmount > 0
    ? ((savings / oldResult.taxAmount) * 100).toFixed(1)
    : '0';

  // Calculate totals including other income
  const hasOtherIncome = otherIncomeTax && otherIncomeTax.totalIncome > 0;
  const totalNewTax = newResult.taxAmount + (hasOtherIncome ? otherIncomeTax.totalTax : 0);

  // Check if using declared salary for insurance
  const hasDeclaredSalary = declaredSalary !== undefined && declaredSalary !== oldResult.grossIncome;

  return (
    <div className="space-y-6">
      {/* Date-aware indicator */}
      <DateAwareIndicator />

      {/* Notice about declared salary */}
      {hasDeclaredSalary && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                <span className="font-medium">Lưu ý:</span> Bảo hiểm tính trên lương khai báo <span className="font-semibold">{formatCurrency(declaredSalary)}</span>,
                nhưng thuế TNCN vẫn tính trên lương thực tế <span className="font-semibold">{formatCurrency(oldResult.grossIncome)}</span>
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Tổng kết tiết kiệm */}
      {savings > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg sm:text-xl font-bold">Bạn tiết kiệm được</h3>
              </div>
              <div className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 font-mono tabular-nums">
                {formatCurrency(savings)}/tháng
              </div>
              <div className="text-green-100 text-sm sm:text-base">
                Tương đương {formatCurrency(savings * 12)}/năm (giảm {savingsPercent}%)
              </div>
            </div>
            <div className="self-end sm:self-start">
              <PDFExportButton
                oldResult={oldResult}
                newResult={newResult}
                otherIncomeTax={otherIncomeTax}
                declaredSalary={declaredSalary}
                variant="inline"
              />
            </div>
          </div>
        </div>
      )}

      {/* Nút xuất PDF khi không có tiết kiệm (savings <= 0) */}
      {savings <= 0 && (
        <div className="flex justify-end">
          <PDFExportButton
            oldResult={oldResult}
            newResult={newResult}
            otherIncomeTax={otherIncomeTax}
            declaredSalary={declaredSalary}
          />
        </div>
      )}

      {/* Other income summary */}
      {hasOtherIncome && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-bold">Thu nhập khác</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-blue-100 text-sm">Tổng thu nhập</div>
              <div className="text-2xl font-bold font-mono tabular-nums">{formatCurrency(otherIncomeTax.totalIncome)}</div>
            </div>
            <div>
              <div className="text-blue-100 text-sm">Thuế phải nộp</div>
              <div className="text-2xl font-bold font-mono tabular-nums">{formatCurrency(otherIncomeTax.totalTax)}</div>
            </div>
            <div>
              <div className="text-blue-100 text-sm">Thực nhận</div>
              <div className="text-2xl font-bold font-mono tabular-nums">{formatCurrency(otherIncomeTax.totalNet)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Total summary when having other income */}
      {hasOtherIncome && (
        <div className="bg-gray-800 rounded-xl p-6 text-white">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Tổng kết tất cả nguồn thu nhập (Luật mới)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-300 text-sm">Lương GROSS</div>
              <div className="text-xl font-bold font-mono tabular-nums">{formatCurrency(newResult.grossIncome)}</div>
            </div>
            <div>
              <div className="text-gray-300 text-sm">Thu nhập khác</div>
              <div className="text-xl font-bold font-mono tabular-nums">{formatCurrency(otherIncomeTax.totalIncome)}</div>
            </div>
            <div>
              <div className="text-gray-300 text-sm">Tổng thuế</div>
              <div className="text-xl font-bold text-red-400 font-mono tabular-nums">{formatCurrency(totalNewTax)}</div>
            </div>
            <div>
              <div className="text-gray-300 text-sm">Tổng thực nhận</div>
              <div className="text-xl font-bold text-green-400 font-mono tabular-nums">
                {formatCurrency(newResult.netIncome + otherIncomeTax.totalNet)}
              </div>
            </div>
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
          <ResultDetails result={oldResult} colorClass="text-red-600" declaredSalary={declaredSalary} />
        </div>

        {/* Luật mới */}
        <div className="card border-2 border-primary-200 bg-primary-50/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-primary-500"></div>
            <h3 className="text-lg font-bold text-gray-800">Luật mới 2026</h3>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">5 bậc</span>
          </div>
          <ResultDetails result={newResult} colorClass="text-primary-600" declaredSalary={declaredSalary} />
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

// Memoize ResultDetails to prevent unnecessary re-renders
const ResultDetails = memo(function ResultDetails({ result, colorClass, declaredSalary }: { result: TaxResultType; colorClass: string; declaredSalary?: number }) {
  const { insuranceDetail, allowancesBreakdown } = result;
  const hasInsurance = result.insuranceDeduction > 0;
  const hasDeclaredSalary = declaredSalary !== undefined && declaredSalary !== result.grossIncome;
  const hasAllowances = allowancesBreakdown && allowancesBreakdown.total > 0;
  const effectiveRate = Number.isFinite(result.effectiveRate) ? result.effectiveRate : 0;

  const items: Array<{ label: string; value: number; isHeader?: boolean; isPositive?: boolean; isSubItem?: boolean }> = [
    { label: 'Thu nhập gộp', value: result.grossIncome },
  ];

  // Thêm chi tiết phụ cấp nếu có
  if (hasAllowances) {
    items.push({
      label: 'Phụ cấp',
      value: allowancesBreakdown.total,
      isHeader: true,
      isPositive: true
    });
    if (allowancesBreakdown.taxExempt > 0) {
      items.push({
        label: '  └ Miễn thuế',
        value: allowancesBreakdown.taxExempt,
        isPositive: true,
        isSubItem: true
      });
    }
    if (allowancesBreakdown.taxable > 0) {
      items.push({
        label: '  └ Chịu thuế',
        value: allowancesBreakdown.taxable,
        isPositive: true,
        isSubItem: true
      });
    }
  }

  // Thêm chi tiết bảo hiểm nếu có
  if (hasInsurance) {
    if (hasDeclaredSalary) {
      items.push({
        label: `Bảo hiểm (trên ${formatCurrency(declaredSalary)})`,
        value: -result.insuranceDeduction,
        isHeader: true
      });
    }
    if (insuranceDetail.bhxh > 0) {
      items.push({ label: '  └ BHXH (8%)', value: -insuranceDetail.bhxh });
    }
    if (insuranceDetail.bhyt > 0) {
      items.push({ label: '  └ BHYT (1.5%)', value: -insuranceDetail.bhyt });
    }
    if (insuranceDetail.bhtn > 0) {
      items.push({ label: '  └ BHTN (1%)', value: -insuranceDetail.bhtn });
    }
  }

  items.push(
    { label: 'Giảm trừ bản thân', value: -result.personalDeduction },
    { label: 'Giảm trừ người phụ thuộc', value: -result.dependentDeduction },
  );

  if (result.otherDeductions > 0) {
    items.push({ label: 'Giảm trừ khác', value: -result.otherDeductions });
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between text-sm">
          <span className={item.isHeader ? 'text-gray-700 font-medium' : 'text-gray-600'}>{item.label}</span>
          <span className={
            item.isPositive
              ? (item.isSubItem ? 'text-green-500' : 'font-medium text-green-600')
              : (item.value < 0 ? 'text-gray-500' : 'font-medium')
          }>
            {item.isPositive ? '+' : ''}{formatCurrency(item.value)}
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
          <span className={`text-2xl font-bold font-mono tabular-nums ${colorClass}`}>
            {formatCurrency(result.taxAmount)}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-2 text-gray-500">
          <span>Thuế suất thực tế</span>
          <span>{effectiveRate.toFixed(2)}%</span>
        </div>
      </div>

      <div className="border-t pt-3 mt-3">
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">Thu nhập thực nhận</span>
          <span className="text-xl font-bold text-green-600 font-mono tabular-nums">
            {formatCurrency(result.netIncome)}
          </span>
        </div>
      </div>
    </div>
  );
});

// Memoize TaxBreakdown to prevent unnecessary re-renders
const TaxBreakdown = memo(function TaxBreakdown({ result, title, colorClass }: { result: TaxResultType; title: string; colorClass: string }) {
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
              <div className="text-xs text-gray-500">
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
});

// Export memoized TaxResult component
export default memo(TaxResultComponent);
