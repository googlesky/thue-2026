'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  HouseholdBusiness,
  HouseholdBusinessTaxInput,
  calculateHouseholdBusinessTax,
  createEmptyBusiness,
  getRevenueThreshold,
  getMonthlyThreshold,
  compareTaxBetweenYears,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_DESCRIPTIONS,
  COMMON_BUSINESS_EXAMPLES,
  PIT_RATES,
  VAT_RATES,
  BusinessCategory,
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
  const [showComparison, setShowComparison] = useState(false);

  // Calculate tax
  const input: HouseholdBusinessTaxInput = useMemo(
    () => ({ businesses, year }),
    [businesses, year]
  );

  const result = useMemo(() => calculateHouseholdBusinessTax(input), [input]);

  // Year comparison for first business
  const comparison = useMemo(() => {
    if (businesses.length > 0 && businesses[0].monthlyRevenue > 0) {
      return compareTaxBetweenYears(businesses[0]);
    }
    return null;
  }, [businesses]);

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
              Tính thuế cho hộ kinh doanh cá thể, cá nhân kinh doanh nhỏ lẻ.
              Từ 2026, ngưỡng doanh thu được nâng lên {formatCurrency(getRevenueThreshold(2026))}/năm.
            </p>
          </div>
        </div>

        {/* Year selector */}
        <div className="mt-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Năm tính thuế:</label>
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
          <p className="mt-2 text-sm text-orange-800">
            <strong>Dưới ngưỡng:</strong> Không cần đăng ký kinh doanh, không đóng thuế.
            <br />
            <strong>Trên ngưỡng:</strong> Phải đăng ký kinh doanh và nộp thuế theo quy định.
            <br />
            <span className="text-orange-700">
              Ngưỡng áp dụng theo tổng doanh thu của tất cả hoạt động trong năm.
            </span>
            {year === 2026 && (
              <>
                <br />
                <span className="text-orange-700">
                  Lưu ý: TNCN tính trên phần doanh thu vượt ngưỡng, VAT tính trên toàn bộ doanh thu khi vượt ngưỡng.
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Tax rates reference */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Biểu thuế suất theo ngành nghề</h3>
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
        </div>
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

                {/* Has business license */}
                <div className="flex items-center gap-2 pt-6">
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

                {/* Monthly revenue */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Doanh thu trung bình/tháng
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={business.monthlyRevenue}
                    onChange={(e) =>
                      updateBusiness(business.id, {
                        monthlyRevenue: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="VD: 15000000"
                    className="input-field w-full"
                  />
                </div>

                {/* Operating months */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Số tháng hoạt động/năm
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
              </div>

              {/* Category description */}
              <div className="mt-3 p-3 rounded-lg bg-blue-50 text-sm text-blue-700">
                <strong>Mô tả:</strong> {BUSINESS_CATEGORY_DESCRIPTIONS[business.category]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Kết quả tính thuế năm {year}</h3>

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
              <div className="text-sm text-gray-500">Dưới ngưỡng</div>
              <div className="text-lg font-semibold text-green-600">
                {result.summary.businessesBelowThreshold} hoạt động
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Trên ngưỡng</div>
              <div className="text-lg font-semibold text-red-600">
                {result.summary.businessesAboveThreshold} hoạt động
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Thu nhập ròng</div>
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(result.summary.totalNetIncome)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Year comparison */}
      {comparison && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">So sánh giữa các năm</h3>
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
                      {formatCurrency(comparison.tax2025.totalTax)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Thu nhập ròng:</span>
                    <span className="font-medium">{formatCurrency(comparison.tax2025.netIncome)}</span>
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
                    <span className="text-gray-500">Tổng thuế:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(comparison.tax2026.totalTax)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Thu nhập ròng:</span>
                    <span className="font-medium">{formatCurrency(comparison.tax2026.netIncome)}</span>
                  </div>
                </div>
              </div>

              {comparison.savings > 0 && (
                <div className="sm:col-span-2 p-4 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-700">
                      Tiết kiệm {formatCurrency(comparison.savings)} với luật mới 2026
                    </div>
                    <div className="text-sm text-green-600">
                      Giảm {comparison.savingsPercentage}% so với năm 2025
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info section */}
      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>ℹ️</span>
          Lưu ý về thuế hộ kinh doanh
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Năm 2026:</strong> Ngưỡng doanh thu nâng lên {formatCurrency(getRevenueThreshold(2026))}/năm (từ {formatCurrency(getRevenueThreshold(2025))})
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Thuế khoán:</strong> Nộp thuế theo tỷ lệ % trên doanh thu, không cần hóa đơn chi phí
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Phương pháp lợi nhuận (2026):</strong> Nếu đủ điều kiện xác định chi phí, có thể áp dụng thuế trên lợi nhuận (15-20%). Công cụ này chưa tính theo phương pháp đó.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Kê khai:</strong> Kê khai thuế theo quý hoặc theo năm tùy quy mô
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Grab, Be, Shipper:</strong> Thuộc nhóm &quot;Sản xuất, vận tải&quot; - Thuế 1.5% + 3% GTGT
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default HouseholdBusinessTaxCalculator;
