'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  HouseholdBusiness,
  calculateHouseholdBusinessTax,
  createEmptyBusiness,
  getRevenueThreshold,
  getMonthlyThreshold,
  compareTaxMethods2026,
  formatCurrency,
  formatRate,
  formatTy,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_DESCRIPTIONS,
  COMMON_BUSINESS_EXAMPLES,
  PIT_RATES,
  PIT_RATES_2025,
  VAT_RATES,
  INCOME_TAX_BRACKETS_2026,
  PERCENTAGE_METHOD_MAX_REVENUE,
  TAX_METHOD_LABELS,
  TAX_METHOD_DESCRIPTIONS,
  BusinessCategory,
  TaxMethod,
} from '@/lib/householdBusinessTaxCalculator';

export function HouseholdBusinessTaxCalculator() {
  const [businesses, setBusinesses] = useState<HouseholdBusiness[]>([
    createEmptyBusiness(),
  ]);
  const [year, setYear] = useState<2025 | 2026>(2026);
  const [taxMethod, setTaxMethod] = useState<TaxMethod>('khoan');
  const [showComparison, setShowComparison] = useState(false);
  const [showMethodComparison, setShowMethodComparison] = useState(false);

  const result = useMemo(
    () => calculateHouseholdBusinessTax({ businesses, year, taxMethod }),
    [businesses, year, taxMethod]
  );

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
  // Phương pháp thực tế áp dụng (DT > 3 tỷ: bắt buộc phương pháp thu nhập)
  const effectiveMethod = result.summary.taxMethod;
  const percentageLocked = year === 2026 && result.summary.totalAnnualRevenue > PERCENTAGE_METHOD_MAX_REVENUE;
  const isPercentage2026 = year === 2026 && effectiveMethod === 'khoan';
  const pitRates = year === 2026 ? PIT_RATES : PIT_RATES_2025;
  const threshold2026 = formatTy(getRevenueThreshold(2026));
  const maxPercentage = formatTy(PERCENTAGE_METHOD_MAX_REVENUE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Thuế hộ kinh doanh, cá nhân kinh doanh
        </h2>
        <p className="text-gray-600 text-sm">
          Theo Luật Thuế TNCN 109/2025/QH15 (sửa đổi bởi Luật 09/2026/QH16) và NĐ 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP).
          Từ kỳ tính thuế 2026, doanh thu năm từ {formatCurrency(getRevenueThreshold(2026))} trở xuống không phải nộp TNCN, GTGT; bỏ thuế khoán từ 01/01/2026.
        </p>

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
                  disabled={percentageLocked}
                  title={percentageLocked ? `Doanh thu trên ${maxPercentage}: không được chọn tỷ lệ % trên doanh thu` : undefined}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    effectiveMethod === 'khoan'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tỷ lệ %
                </button>
                <button
                  onClick={() => setTaxMethod('income')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    effectiveMethod === 'income'
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
            <div className="font-medium text-orange-900">{TAX_METHOD_LABELS[effectiveMethod]}</div>
            <div className="text-orange-700 mt-1">{TAX_METHOD_DESCRIPTIONS[effectiveMethod]}</div>
            {percentageLocked && (
              <div className="text-orange-800 mt-1 font-medium">
                Tổng doanh thu trên {maxPercentage}: bắt buộc phương pháp thu nhập (NĐ 68/2026 Điều 4.5).
              </div>
            )}
          </div>
        )}

        {/* Threshold info */}
        <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-200">
          <div className="font-semibold text-orange-900">
            Ngưỡng doanh thu năm {year}: {formatCurrency(threshold)}/năm
          </div>
          <div className="text-sm text-orange-700">
            Tương đương ~{formatCurrency(monthlyThreshold)}/tháng
          </div>
          <div className="mt-2 text-sm text-orange-800 space-y-1">
            {year === 2026 ? (
              <>
                <p><strong>Từ ngưỡng trở xuống:</strong> không nộp TNCN, GTGT; vẫn phải thông báo doanh thu (Mẫu 01/TKN-CNKD) chậm nhất ngày 31/01 năm sau.</p>
                <p><strong>Trên ngưỡng:</strong> khai GTGT, TNCN theo quý từ quý có doanh thu lũy kế vượt ngưỡng; bắt buộc dùng hóa đơn điện tử.</p>
                <p className="text-orange-700">
                  TNCN tính trên phần doanh thu vượt ngưỡng (tỷ lệ %) hoặc trên lợi nhuận (phương pháp thu nhập); GTGT tính trên toàn bộ doanh thu.
                </p>
              </>
            ) : (
              <>
                <p><strong>Từ ngưỡng trở xuống:</strong> không nộp TNCN, GTGT.</p>
                <p><strong>Trên ngưỡng:</strong> nộp thuế khoán hoặc kê khai theo quy định năm 2025, tính trên toàn bộ doanh thu.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tax rates reference */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">
          {year === 2025
            ? 'Biểu thuế khoán năm 2025 (trên toàn bộ doanh thu)'
            : effectiveMethod === 'income'
              ? 'Biểu thuế suất phương pháp thu nhập'
              : `Biểu thuế: ${TAX_METHOD_LABELS.khoan}`}
        </h3>

        {year === 2026 && effectiveMethod === 'income' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Doanh thu năm</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Thuế TNCN</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-3 font-medium">Từ {threshold2026} trở xuống</td>
                  <td className="text-center py-3 px-3">
                    <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-medium">0%</span>
                  </td>
                  <td className="py-3 px-3 text-gray-500">Không nộp TNCN, GTGT</td>
                </tr>
                {INCOME_TAX_BRACKETS_2026.map((bracket, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-3 font-medium">
                      Trên {formatTy(bracket.min)}{bracket.max === Infinity ? '' : ` đến ${formatTy(bracket.max)}`}
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">
                        {formatRate(bracket.rate)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">
                      Tính trên (Doanh thu − Chi phí)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">
              Lưu ý: Thuế GTGT tính riêng theo tỷ lệ ngành nghề trên toàn bộ doanh thu. Nhiều hoạt động: thu nhập tính thuế là tổng (Doanh thu − Chi phí) của mọi hoạt động, lỗ hoạt động này bù lãi hoạt động khác (diễn giải Luật 109/2025 Điều 7.2.a).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Ngành nghề</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Thuế TNCN</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Thuế GTGT</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(BUSINESS_CATEGORY_LABELS).map(([key, label]) => {
                  const category = key as BusinessCategory;
                  return (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-3 px-3">
                        <div className="font-medium text-gray-900">{label}</div>
                        <div className="text-xs text-gray-500">
                          {COMMON_BUSINESS_EXAMPLES.find(e => e.category === category)?.examples.slice(0, 2).join(', ')}
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium whitespace-nowrap">
                          {formatRate(pitRates[category])}
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-medium whitespace-nowrap">
                          {formatRate(VAT_RATES[category])}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {year === 2026 && (
              <p className="mt-2 text-xs text-gray-500">
                Năm 2026: TNCN tính trên (Doanh thu − {threshold2026}), GTGT tính trên toàn bộ doanh thu. Nhiều ngành: mức trừ {threshold2026} được trừ vào ngành có tỷ lệ cao nhất trước, phần chưa trừ hết trừ tiếp vào ngành khác (NĐ 68/2026 Điều 4.3).
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
                    placeholder="VD: 50.000.000"
                    className="input-field w-full"
                  />
                </div>

                {/* Monthly expenses */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Chi phí/tháng (có hóa đơn)
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
                    placeholder="VD: 30.000.000"
                    className="input-field w-full"
                  />
                </div>

                {/* Operating months */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Số tháng hoạt động
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={business.operatingMonths || ''}
                    onChange={(e) =>
                      updateBusiness(business.id, {
                        operatingMonths: Math.max(0, Math.min(12, parseInt(e.target.value) || 0)),
                      })
                    }
                    onBlur={() => {
                      if (!business.operatingMonths) updateBusiness(business.id, { operatingMonths: 12 });
                    }}
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
        {isPercentage2026 && businesses.length > 1 && isAboveThreshold && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm">
            <strong className="text-yellow-800">Phân bổ mức trừ {threshold2026}:</strong>
            <p className="text-yellow-700 mt-1">
              Theo NĐ 68/2026 Điều 4.3, mức trừ được áp dụng theo phương án có lợi nhất: trừ vào ngành có tỷ lệ cao nhất trước,
              phần chưa trừ hết trừ tiếp vào ngành khác; tổng mức trừ không quá {threshold2026}/năm.
            </p>
            <p className="text-yellow-600 mt-1">
              Ngưỡng đã trừ: {formatCurrency(result.summary.thresholdUsed)} / {formatCurrency(threshold)}
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">
          Kết quả tính thuế năm {year}
          {year === 2026 && <span className="text-sm font-normal text-gray-500 ml-2">({TAX_METHOD_LABELS[effectiveMethod]})</span>}
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
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-medium text-gray-800">
                  {b.name || `Hoạt động #${index + 1}`} ({BUSINESS_CATEGORY_LABELS[b.category]})
                </span>
                <span className={`font-bold whitespace-nowrap ${b.isAboveThreshold ? 'text-red-600' : 'text-green-600'}`}>
                  {b.isAboveThreshold ? formatCurrency(b.totalTax) : 'Không thuế'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Doanh thu năm:</span>
                  <div className="font-medium">{formatCurrency(b.annualRevenue)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Chi phí năm:</span>
                  <div className="font-medium">{formatCurrency(b.annualExpenses)}</div>
                </div>
                {b.isAboveThreshold && (
                  <div>
                    <span className="text-gray-500">
                      {year === 2025
                        ? 'DT tính thuế:'
                        : effectiveMethod === 'income' ? 'Thu nhập tính thuế:' : 'DT tính thuế (sau trừ ngưỡng):'}
                    </span>
                    <div className="font-medium">{formatCurrency(b.taxableIncome)}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Thuế TNCN:</span>
                  <div className="font-medium">{formatCurrency(b.pitAmount)} ({formatRate(b.taxRate / 100)})</div>
                </div>
                <div>
                  <span className="text-gray-500">Thuế GTGT:</span>
                  <div className="font-medium">{formatCurrency(b.vatAmount)} ({formatRate(b.vatRate / 100)})</div>
                </div>
                <div>
                  <span className="text-gray-500">Thu nhập ròng:</span>
                  <div className="font-medium text-green-600">{formatCurrency(b.netIncome)}</div>
                </div>
              </div>

              {b.isAboveThreshold && isPercentage2026 && b.thresholdDeduction > 0 && (
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
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Tổng kết năm {year}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Tổng doanh thu</div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(result.summary.totalAnnualRevenue)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tổng chi phí</div>
              <div className="text-xl font-bold text-gray-700">
                {formatCurrency(result.summary.totalAnnualExpenses)}
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
              <div className="text-sm text-gray-500">Trạng thái</div>
              <div className={`text-lg font-semibold ${isAboveThreshold ? 'text-red-600' : 'text-green-600'}`}>
                {isAboveThreshold ? 'Trên ngưỡng - Phải nộp thuế' : 'Không vượt ngưỡng - Không nộp thuế'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Thu nhập ròng</div>
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(result.summary.totalNetIncome)}
              </div>
            </div>
            {isPercentage2026 && isAboveThreshold && (
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
                    Tỷ lệ % trên doanh thu
                    {methodComparison.recommendedMethod === 'khoan' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Có lợi hơn</span>
                    )}
                  </h4>
                  {methodComparison.khoanResult ? (
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
                  ) : (
                    <p className="text-sm text-gray-500">
                      Không áp dụng: doanh thu năm trên {maxPercentage}.
                    </p>
                  )}
                </div>

                <div className={`p-4 rounded-xl border ${
                  methodComparison.recommendedMethod === 'income'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    Phương pháp thu nhập
                    {methodComparison.recommendedMethod === 'income' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                        {methodComparison.khoanResult ? 'Có lợi hơn' : 'Bắt buộc'}
                      </span>
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

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="font-medium text-blue-900">{methodComparison.explanation}</div>
                {methodComparison.savings > 0 && (
                  <div className="text-sm text-blue-700 mt-1">
                    Chênh lệch: {formatCurrency(methodComparison.savings)}
                  </div>
                )}
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
                <h4 className="font-medium text-gray-700 mb-3">Năm 2025 (thuế khoán)</h4>
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
                    <span className="text-gray-500">Tổng thuế:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(
                        calculateHouseholdBusinessTax({ businesses, year: 2026, taxMethod }).summary.totalTax
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
        <h3 className="font-semibold text-blue-900 mb-3">
          Lưu ý về thuế hộ kinh doanh từ năm 2026
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Ngưỡng:</strong> {formatCurrency(getRevenueThreshold(2026))}/năm (trước đây {formatCurrency(getRevenueThreshold(2025))}), xét trên tổng doanh thu mọi hoạt động, kể cả doanh thu bán trên sàn TMĐT đã được khấu trừ thay. Cả năm không vượt ngưỡng thì được hoàn hoặc bù trừ số thuế đã khấu trừ, đã nộp (NĐ 68/2026 Điều 12).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Tỷ lệ % trên doanh thu:</strong> TNCN = (Doanh thu − {threshold2026}) × tỷ lệ ngành; chỉ được chọn khi doanh thu năm không quá {maxPercentage}. Không cần chứng từ chi phí.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Phương pháp thu nhập:</strong> TNCN = (Doanh thu − Chi phí) × {INCOME_TAX_BRACKETS_2026.map((b) => formatRate(b.rate)).join('/')}; bắt buộc khi doanh thu năm trên {maxPercentage}; áp dụng ổn định 2 năm liên tục (NĐ 68/2026 Điều 4.5.d).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Thuế GTGT:</strong> Tính trên toàn bộ doanh thu khi vượt ngưỡng (không trừ {threshold2026}). Mức giảm 20% tỷ lệ % tính GTGT đến hết 31/12/2026 (NQ 204/2025/QH15, NĐ 174/2025/NĐ-CP; trừ viễn thông, tài chính, ngân hàng, chứng khoán, bảo hiểm, bất động sản, kim loại, khai khoáng, hàng chịu thuế TTĐB) chưa được tự động áp dụng trong công cụ này.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Kê khai:</strong> Doanh thu năm đến 50 tỷ khai GTGT, TNCN theo quý, hạn ngày cuối cùng của tháng đầu quý sau (30/4, 31/7, 31/10, 31/01); trên 50 tỷ khai theo tháng, hạn ngày 20 tháng sau; quyết toán TNCN phương pháp thu nhập chậm nhất 31/3 năm sau (Mẫu 02/CNKD-TNCN-QTT).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Grab, Be, shipper:</strong> Thuộc nhóm &quot;Sản xuất, vận tải&quot; – TNCN {formatRate(PIT_RATES.production)} trên phần doanh thu vượt {threshold2026}; GTGT {formatRate(VAT_RATES.production)} trên toàn bộ doanh thu.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default HouseholdBusinessTaxCalculator;
