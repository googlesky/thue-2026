'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  HouseholdBusiness,
  HouseholdBusinessTaxInput,
  calculateHouseholdBusinessTax,
  createEmptyBusiness,
  getRevenueThreshold,
  getMonthlyThreshold,
  compareTaxMethods2026,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_DESCRIPTIONS,
  COMMON_BUSINESS_EXAMPLES,
  PIT_RATES,
  VAT_RATES,
  INCOME_TAX_BRACKETS_2026,
  TAX_METHOD_LABELS,
  TAX_METHOD_DESCRIPTIONS,
  BusinessCategory,
  TaxMethod,
} from '@/lib/householdBusinessTaxCalculator';

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function HouseholdBusinessTaxCalculator() {
  const [businesses, setBusinesses] = useState<HouseholdBusiness[]>([
    createEmptyBusiness(),
  ]);
  const [year, setYear] = useState<2025 | 2026>(2026);
  const [taxMethod, setTaxMethod] = useState<TaxMethod>('khoan');
  const [showComparison, setShowComparison] = useState(false);
  const [showMethodComparison, setShowMethodComparison] = useState(false);

  // Calculate tax
  const input: HouseholdBusinessTaxInput = useMemo(
    () => ({ businesses, year, taxMethod }),
    [businesses, year, taxMethod]
  );

  const result = useMemo(() => calculateHouseholdBusinessTax(input), [input]);

  // Method comparison for 2026
  const methodComparison = useMemo(() => {
    if (year === 2026 && businesses.some(b => b.monthlyRevenue > 0)) {
      return compareTaxMethods2026(businesses);
    }
    return null;
  }, [businesses, year]);

  // Add business
  const addBusiness = useCallback(() => {
    setBusinesses((prev) => [...prev, createEmptyBusiness()]);
  }, []);

  // Remove business
  const removeBusiness = useCallback((id: string) => {
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Update business
  const updateBusiness = useCallback(
    (id: string, updates: Partial<HouseholdBusiness>) => {
      setBusinesses((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
    },
    []
  );

  const threshold = getRevenueThreshold(year);
  const monthlyThreshold = getMonthlyThreshold(year);
  const isAboveThreshold = result.summary.totalAnnualRevenue > threshold;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🏪</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Thuế hộ kinh doanh cá thể
            </h2>
            <p className="text-gray-600 text-sm">
              Tính thuế cho hộ kinh doanh cá thể theo Luật 109/2025/QH15.
              Từ 2026, ngưỡng doanh thu được nâng lên {formatCurrency(getRevenueThreshold(2026))}/năm.
            </p>
          </div>
        </div>

        {/* Year selector */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Năm:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setYear(2025)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  year === 2025
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                2025
              </button>
              <button
                onClick={() => setYear(2026)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  year === 2026
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                2026
              </button>
            </div>
          </div>

          {/* Tax method selector - only for 2026 */}
          {year === 2026 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Phương pháp:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTaxMethod('khoan')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    taxMethod === 'khoan'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Khoán
                </button>
                <button
                  onClick={() => setTaxMethod('income')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    taxMethod === 'income'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Thu nhập
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tax method description */}
        {year === 2026 && (
          <div className="mt-3 p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm">
            <div className="font-medium text-orange-900">{TAX_METHOD_LABELS[taxMethod]}</div>
            <div className="text-orange-700 mt-1">{TAX_METHOD_DESCRIPTIONS[taxMethod]}</div>
          </div>
        )}

        {/* Threshold info */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <div className="font-semibold text-orange-900">
                Ngưỡng doanh thu năm {year}: {formatCurrency(threshold)}/năm
              </div>
              <div className="text-sm text-orange-700">
                Tương đương ~{formatCurrency(monthlyThreshold)}/tháng
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm text-orange-800 space-y-1">
            <p><strong>Dưới ngưỡng:</strong> Không đóng thuế TNCN và GTGT, không cần đăng ký kinh doanh.</p>
            <p><strong>Trên ngưỡng:</strong> Phải đăng ký kinh doanh và nộp thuế theo quy định.</p>
            {year === 2026 && (
              <p className="text-orange-700">
                <strong>Năm 2026:</strong> TNCN tính trên phần vượt ngưỡng (phương pháp khoán) hoặc lợi nhuận (phương pháp thu nhập). VAT tính trên toàn bộ doanh thu.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tax rates reference */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">
          Biểu thuế suất {year === 2026 && taxMethod === 'income' ? '(Phương pháp thu nhập)' : '(Phương pháp khoán)'}
        </h3>

        {year === 2026 && taxMethod === 'income' ? (
          // Income tax brackets for 2026
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Bậc doanh thu năm</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Thuế TNCN</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-3 font-medium">≤ 500 triệu</td>
                  <td className="text-center py-3 px-3">
                    <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-medium">0%</span>
                  </td>
                  <td className="py-3 px-3 text-gray-500">Miễn thuế hoàn toàn</td>
                </tr>
                {INCOME_TAX_BRACKETS_2026.map((bracket, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-3 font-medium">
                      {formatCurrency(bracket.min)} - {bracket.max === Infinity ? 'trở lên' : formatCurrency(bracket.max)}
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">
                        {bracket.rate * 100}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">
                      Tính trên (Doanh thu - Chi phí)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">
              Lưu ý: Thuế GTGT tính riêng theo tỷ lệ ngành nghề trên toàn bộ doanh thu.
            </p>
          </div>
        ) : (
          // Khoan method rates
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Ngành nghề</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Thuế TNCN</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Thuế GTGT</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(BUSINESS_CATEGORY_LABELS).map(([key, label]) => {
                  const category = key as BusinessCategory;
                  const pitRate = PIT_RATES[category] * 100;
                  const vatRate = VAT_RATES[category] * 100;
                  const totalRate = pitRate + vatRate;
                  return (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-3 px-3">
                        <div className="font-medium text-gray-900">{label}</div>
                        <div className="text-xs text-gray-500">
                          {COMMON_BUSINESS_EXAMPLES.find(e => e.category === category)?.examples.slice(0, 2).join(', ')}
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">
                          {pitRate}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-medium">
                          {vatRate}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="px-2 py-1 rounded bg-purple-50 text-purple-700 font-bold">
                          {totalRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {year === 2026 && (
              <p className="mt-2 text-xs text-gray-500">
                Lưu ý năm 2026: TNCN tính trên (Doanh thu - 500 triệu), GTGT tính trên toàn bộ doanh thu.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Businesses input */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Hoạt động kinh doanh</h3>
          <button
            onClick={addBusiness}
            className="btn-secondary text-sm"
          >
            + Thêm hoạt động
          </button>
        </div>

        <div className="space-y-4">
          {businesses.map((business, index) => (
            <div
              key={business.id}
              className="p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700">
                  Hoạt động #{index + 1}
                </span>
                {businesses.length > 1 && (
                  <button
                    onClick={() => removeBusiness(business.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Business name */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Tên hoạt động
                  </label>
                  <input
                    type="text"
                    value={business.name}
                    onChange={(e) =>
                      updateBusiness(business.id, { name: e.target.value })
                    }
                    placeholder="VD: Cửa hàng tạp hóa"
                    className="input-field w-full"
                  />
                </div>

                {/* Business category */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Ngành nghề
                  </label>
                  <select
                    value={business.category}
                    onChange={(e) =>
                      updateBusiness(business.id, {
                        category: e.target.value as BusinessCategory,
                      })
                    }
                    className="input-field w-full"
                  >
                    {Object.entries(BUSINESS_CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monthly revenue */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Doanh thu/tháng
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={business.monthlyRevenue === 0 ? '' : business.monthlyRevenue.toLocaleString('vi-VN')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, '');
                      updateBusiness(business.id, {
                        monthlyRevenue: parseInt(value) || 0,
                      });
                    }}
                    placeholder="VD: 50,000,000"
                    className="input-field w-full"
                  />
                </div>

                {/* Monthly expenses - only for income method */}
                {year === 2026 && taxMethod === 'income' && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Chi phí/tháng
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={business.monthlyExpenses === 0 ? '' : business.monthlyExpenses.toLocaleString('vi-VN')}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        updateBusiness(business.id, {
                          monthlyExpenses: parseInt(value) || 0,
                        });
                      }}
                      placeholder="VD: 30,000,000"
                      className="input-field w-full"
                    />
                  </div>
                )}

                {/* Operating months */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Số tháng hoạt động
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={business.operatingMonths}
                    onChange={(e) =>
                      updateBusiness(business.id, {
                        operatingMonths: Math.min(12, Math.max(1, parseInt(e.target.value) || 12)),
                      })
                    }
                    className="input-field w-full"
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`license-${business.id}`}
                      checked={business.hasBusinessLicense}
                      onChange={(e) =>
                        updateBusiness(business.id, {
                          hasBusinessLicense: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`license-${business.id}`}
                      className="text-sm text-gray-700"
                    >
                      Đã đăng ký kinh doanh
                    </label>
                  </div>

                  {/* Threshold deduction checkbox - only for khoan method 2026 with multiple businesses */}
                  {year === 2026 && taxMethod === 'khoan' && businesses.length > 1 && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`threshold-${business.id}`}
                        checked={business.applyThresholdDeduction}
                        onChange={(e) =>
                          updateBusiness(business.id, {
                            applyThresholdDeduction: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <label
                        htmlFor={`threshold-${business.id}`}
                        className="text-sm text-gray-700"
                      >
                        Áp dụng trừ ngưỡng 500tr
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Category description */}
              <div className="mt-3 p-3 rounded-lg bg-blue-50 text-sm text-blue-700">
                <strong>Mô tả:</strong> {BUSINESS_CATEGORY_DESCRIPTIONS[business.category]}
              </div>
            </div>
          ))}
        </div>

        {/* Threshold allocation info */}
        {year === 2026 && taxMethod === 'khoan' && businesses.length > 1 && isAboveThreshold && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600">⚠️</span>
              <div>
                <strong className="text-yellow-800">Phân bổ ngưỡng 500 triệu:</strong>
                <p className="text-yellow-700 mt-1">
                  Theo Luật 109/2025/QH15, bạn có thể chọn hoạt động nào được trừ ngưỡng 500 triệu.
                  Tổng mức trừ không quá 500 triệu cho tất cả hoạt động.
                </p>
                <p className="text-yellow-600 mt-1">
                  Ngưỡng đã sử dụng: {formatCurrency(result.summary.thresholdUsed)} / {formatCurrency(threshold)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">
          Kết quả tính thuế năm {year}
          {year === 2026 && <span className="text-sm font-normal text-gray-500 ml-2">({TAX_METHOD_LABELS[taxMethod]})</span>}
        </h3>

        {/* Business results */}
        <div className="space-y-3 mb-6">
          {result.businesses.map((b, index) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border ${
                b.isAboveThreshold
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">
                  {b.name || `Hoạt động #${index + 1}`} ({BUSINESS_CATEGORY_LABELS[b.category]})
                </span>
                <span className={`font-bold ${b.isAboveThreshold ? 'text-red-600' : 'text-green-600'}`}>
                  {b.isAboveThreshold ? formatCurrency(b.totalTax) : 'Không thuế'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Doanh thu năm:</span>
                  <div className="font-medium">{formatCurrency(b.annualRevenue)}</div>
                </div>
                {year === 2026 && taxMethod === 'income' && (
                  <div>
                    <span className="text-gray-500">Chi phí năm:</span>
                    <div className="font-medium">{formatCurrency(b.annualExpenses)}</div>
                  </div>
                )}
                {b.isAboveThreshold && (
                  <div>
                    <span className="text-gray-500">
                      {taxMethod === 'income' ? 'Thu nhập chịu thuế:' : 'DT chịu thuế (sau trừ ngưỡng):'}
                    </span>
                    <div className="font-medium">{formatCurrency(b.taxableIncome)}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Thuế TNCN:</span>
                  <div className="font-medium">{formatCurrency(b.pitAmount)} ({b.taxRate}%)</div>
                </div>
                <div>
                  <span className="text-gray-500">Thuế GTGT:</span>
                  <div className="font-medium">{formatCurrency(b.vatAmount)} ({b.vatRate}%)</div>
                </div>
                <div>
                  <span className="text-gray-500">Thu nhập ròng:</span>
                  <div className="font-medium text-green-600">{formatCurrency(b.netIncome)}</div>
                </div>
              </div>

              {b.isAboveThreshold && year === 2026 && taxMethod === 'khoan' && b.thresholdDeduction > 0 && (
                <div className="text-xs text-orange-600 mb-2">
                  Ngưỡng được trừ: {formatCurrency(b.thresholdDeduction)}
                </div>
              )}

              <div className={`text-sm p-2 rounded-lg ${
                b.isAboveThreshold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {b.recommendation}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Tổng kết năm {year}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Tổng doanh thu</div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(result.summary.totalAnnualRevenue)}
              </div>
            </div>
            {year === 2026 && taxMethod === 'income' && (
              <div>
                <div className="text-sm text-gray-500">Tổng chi phí</div>
                <div className="text-xl font-bold text-gray-700">
                  {formatCurrency(result.summary.totalAnnualExpenses)}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-500">Thuế TNCN</div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(result.summary.totalPIT)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Thuế GTGT</div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(result.summary.totalVAT)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tổng thuế</div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(result.summary.totalTax)}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Trạng thái</div>
              <div className={`text-lg font-semibold ${isAboveThreshold ? 'text-red-600' : 'text-green-600'}`}>
                {isAboveThreshold ? 'Trên ngưỡng - Phải nộp thuế' : 'Dưới ngưỡng - Miễn thuế'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Thu nhập ròng</div>
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(result.summary.totalNetIncome)}
              </div>
            </div>
            {year === 2026 && taxMethod === 'khoan' && isAboveThreshold && (
              <div>
                <div className="text-sm text-gray-500">Ngưỡng đã trừ</div>
                <div className="text-lg font-semibold text-orange-600">
                  {formatCurrency(result.summary.thresholdUsed)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Method comparison for 2026 */}
      {year === 2026 && methodComparison && isAboveThreshold && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">So sánh phương pháp tính thuế 2026</h3>
            <button
              onClick={() => setShowMethodComparison(!showMethodComparison)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showMethodComparison ? 'Ẩn' : 'Hiện'}
            </button>
          </div>

          {showMethodComparison && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-xl border ${
                  methodComparison.recommendedMethod === 'khoan'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    Phương pháp Khoán
                    {methodComparison.recommendedMethod === 'khoan' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Khuyên dùng</span>
                    )}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Thuế TNCN:</span>
                      <span className="font-medium">{formatCurrency(methodComparison.khoanResult.summary.totalPIT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Thuế GTGT:</span>
                      <span className="font-medium">{formatCurrency(methodComparison.khoanResult.summary.totalVAT)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-700 font-medium">Tổng thuế:</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(methodComparison.khoanResult.summary.totalTax)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  methodComparison.recommendedMethod === 'income'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    Phương pháp Thu nhập
                    {methodComparison.recommendedMethod === 'income' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Khuyên dùng</span>
                    )}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Thuế TNCN:</span>
                      <span className="font-medium">{formatCurrency(methodComparison.incomeResult.summary.totalPIT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Thuế GTGT:</span>
                      <span className="font-medium">{formatCurrency(methodComparison.incomeResult.summary.totalVAT)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-700 font-medium">Tổng thuế:</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(methodComparison.incomeResult.summary.totalTax)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="font-medium text-blue-900">{methodComparison.explanation}</div>
                    {methodComparison.savings > 0 && (
                      <div className="text-sm text-blue-700 mt-1">
                        Chênh lệch: {formatCurrency(methodComparison.savings)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Year comparison */}
      {businesses.some(b => b.monthlyRevenue > 0) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">So sánh với năm 2025</h3>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showComparison ? 'Ẩn' : 'Hiện'}
            </button>
          </div>

          {showComparison && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Năm 2025</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ngưỡng:</span>
                    <span className="font-medium">{formatCurrency(getRevenueThreshold(2025))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tổng thuế:</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(
                        calculateHouseholdBusinessTax({ businesses, year: 2025, taxMethod: 'khoan' }).summary.totalTax
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <h4 className="font-medium text-green-700 mb-3">Năm 2026</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ngưỡng:</span>
                    <span className="font-medium">{formatCurrency(getRevenueThreshold(2026))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tổng thuế (khoán):</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(
                        calculateHouseholdBusinessTax({ businesses, year: 2026, taxMethod: 'khoan' }).summary.totalTax
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info section */}
      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>ℹ️</span>
          Lưu ý về thuế hộ kinh doanh năm 2026
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Ngưỡng mới:</strong> {formatCurrency(getRevenueThreshold(2026))}/năm (tăng từ {formatCurrency(getRevenueThreshold(2025))})
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Phương pháp khoán:</strong> TNCN = (Doanh thu - 500tr) × Thuế suất ngành. Không cần chứng từ chi phí.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Phương pháp thu nhập:</strong> TNCN = (Doanh thu - Chi phí) × 15%/17%/20%. Cần hóa đơn chi phí hợp lệ.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Thuế GTGT:</strong> Tính trên toàn bộ doanh thu khi vượt ngưỡng (không được trừ 500tr).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Nhiều hoạt động:</strong> Có thể chọn hoạt động nào được trừ ngưỡng 500tr (tổng không quá 500tr).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Grab, Be, Shipper:</strong> Thuộc nhóm &quot;Sản xuất, vận tải&quot; - Thuế khoán 1.5% + 3% GTGT.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default HouseholdBusinessTaxCalculator;
