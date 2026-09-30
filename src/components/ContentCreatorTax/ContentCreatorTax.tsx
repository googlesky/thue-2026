'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  PLATFORMS,
  calculateContentCreatorTax,
  formatCurrency,
  getPlatformById,
  spreadAnnual,
  type Platform,
  type ContentCreatorInput,
  type ContentCreatorTaxResult,
} from '@/lib/contentCreatorTaxCalculator';
import {
  getRevenueThreshold,
  formatRate,
  formatTy,
  PERCENTAGE_METHOD_MAX_REVENUE,
  TAX_METHOD_LABELS,
} from '@/lib/householdBusinessTaxCalculator';
import { formatNumber } from '@/lib/taxCalculator';
import { parseCurrencyInput } from '@/utils/inputSanitizers';

interface ContentCreatorTaxProps {
  year?: number;
  onYearChange?: (year: number) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [2025, 2026, 2027];
const MAX_AMOUNT = 100_000_000_000; // 100 tỷ
const EMPTY_MONTHS = Array(12).fill(0) as number[];
const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);

export default function ContentCreatorTax({
  year: externalYear,
  onYearChange,
}: ContentCreatorTaxProps) {
  const [internalYear, setInternalYear] = useState(CURRENT_YEAR >= 2026 ? 2026 : 2025);
  const year = externalYear ?? internalYear;

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  // Thu nhập 12 tháng theo nền tảng (nguồn dữ liệu duy nhất; thu nhập năm = tổng 12 tháng)
  const [platformIncomes, setPlatformIncomes] = useState<Record<string, number[]>>({});
  const [isRegisteredBusiness, setIsRegisteredBusiness] = useState(false);
  const [annualExpenses, setAnnualExpenses] = useState(0);
  const [showMonthlyInput, setShowMonthlyInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'result'>('input');
  const [inputWarning, setInputWarning] = useState<string | null>(null);

  // Handle year change
  const handleYearChange = useCallback((newYear: number) => {
    if (onYearChange) {
      onYearChange(newYear);
    } else {
      setInternalYear(newYear);
    }
  }, [onYearChange]);

  // Toggle platform selection
  const togglePlatform = useCallback((platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId) ? prev.filter(id => id !== platformId) : [...prev, platformId]
    );
    setPlatformIncomes(prev => (prev[platformId] ? prev : { ...prev, [platformId]: EMPTY_MONTHS }));
  }, []);

  const parseAmount = (raw: string): number => {
    const parsed = parseCurrencyInput(raw, { max: MAX_AMOUNT });
    const issues: string[] = [];
    if (parsed.issues.negative) issues.push('Không hỗ trợ số âm.');
    if (parsed.issues.decimal) issues.push('Không hỗ trợ số thập phân, đã bỏ phần lẻ.');
    if (parsed.issues.overflow) issues.push(`Giá trị tối đa ${formatNumber(MAX_AMOUNT)} VNĐ.`);
    setInputWarning(issues.length ? issues.join(' ') : null);
    return parsed.value;
  };

  // Nhập thu nhập năm: chia đều 12 tháng, tổng khớp chính xác
  const updateAnnualIncome = (platformId: string, raw: string) => {
    const value = parseAmount(raw);
    setPlatformIncomes(prev => ({ ...prev, [platformId]: spreadAnnual(value) }));
  };

  const updateMonthlyIncome = (platformId: string, month: number, raw: string) => {
    const value = parseAmount(raw);
    setPlatformIncomes(prev => {
      const months = [...(prev[platformId] ?? EMPTY_MONTHS)];
      months[month] = value;
      return { ...prev, [platformId]: months };
    });
  };

  // Build input for calculation
  const calculatorInput = useMemo((): ContentCreatorInput => ({
    year,
    platforms: selectedPlatforms.map(platformId => ({
      platformId,
      monthlyIncome: platformIncomes[platformId] ?? EMPTY_MONTHS,
    })),
    isRegisteredBusiness,
    annualExpenses,
  }), [year, selectedPlatforms, platformIncomes, isRegisteredBusiness, annualExpenses]);

  const totalIncome = selectedPlatforms.reduce((s, id) => s + sum(platformIncomes[id] ?? EMPTY_MONTHS), 0);

  // Calculate result
  const result = useMemo((): ContentCreatorTaxResult | null => {
    if (totalIncome === 0) return null;
    return calculateContentCreatorTax(calculatorInput);
  }, [calculatorInput, totalIncome]);

  const shownTab = result ? activeTab : 'input';
  const threshold = getRevenueThreshold(year);
  const needsExpenses = year >= 2026 && totalIncome > PERCENTAGE_METHOD_MAX_REVENUE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Thuế Content Creator</h2>
        <p className="opacity-90">
          Tính thuế cho YouTuber, TikToker, KOL, Affiliate Marketing
        </p>
      </div>

      {/* Year Selection */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Năm tính thuế
        </label>
        <div className="flex gap-2">
          {AVAILABLE_YEARS.map(y => (
            <button
              key={y}
              onClick={() => handleYearChange(y)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                year === y
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Doanh thu năm {year} không phải nộp thuế: đến <strong>{formatCurrency(threshold)}/năm</strong>
          {year >= 2026 && ' (thu nhập kinh doanh, áp dụng từ kỳ tính thuế 2026)'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('input')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            shownTab === 'input'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Nhập thu nhập
        </button>
        <button
          onClick={() => setActiveTab('result')}
          disabled={!result}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            shownTab === 'result'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-50'
          }`}
        >
          Kết quả tính thuế
        </button>
      </div>

      {shownTab === 'input' && (
        <>
          {/* Platform Selection */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">
              Chọn nền tảng hoạt động
            </h3>

            {/* Foreign Platforms */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                Nền tảng nước ngoài: nội dung số, quảng cáo số (tự kê khai)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {PLATFORMS.filter(p => p.type === 'foreign').map(platform => (
                  <PlatformButton
                    key={platform.id}
                    platform={platform}
                    selected={selectedPlatforms.includes(platform.id)}
                    onClick={() => togglePlatform(platform.id)}
                  />
                ))}
              </div>
            </div>

            {/* Domestic Platforms */}
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Tiếp thị liên kết trong nước: hoa hồng
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {PLATFORMS.filter(p => p.type === 'domestic').map(platform => (
                  <PlatformButton
                    key={platform.id}
                    platform={platform}
                    selected={selectedPlatforms.includes(platform.id)}
                    onClick={() => togglePlatform(platform.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Income Input */}
          {selectedPlatforms.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <h3 className="font-semibold text-gray-900">
                  Nhập thu nhập
                </h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showMonthlyInput}
                    onChange={e => setShowMonthlyInput(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-600">Nhập theo tháng</span>
                </label>
              </div>

              {inputWarning && (
                <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {inputWarning}
                </p>
              )}

              <div className="space-y-4">
                {selectedPlatforms.map(platformId => {
                  const platform = getPlatformById(platformId);
                  const months = platformIncomes[platformId] ?? EMPTY_MONTHS;
                  const annualIncome = sum(months);
                  if (!platform) return null;

                  return (
                    <div key={platformId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="font-medium text-gray-900">
                          {platform.name}
                        </span>
                        {platform.type === 'domestic' && !isRegisteredBusiness && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                            Có thể bị khấu trừ 10%
                          </span>
                        )}
                      </div>

                      {showMonthlyInput ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {months.map((value, i) => (
                            <div key={i}>
                              <label className="text-xs text-gray-500">
                                T{i + 1}
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={value ? formatNumber(value) : ''}
                                onChange={e => updateMonthlyIncome(platformId, i, e.target.value)}
                                placeholder="0"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <label className="text-sm text-gray-500">
                            Thu nhập cả năm (VND)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={annualIncome ? formatNumber(annualIncome) : ''}
                            onChange={e => updateAnnualIncome(platformId, e.target.value)}
                            placeholder="Nhập thu nhập năm..."
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                          />
                        </div>
                      )}

                      {annualIncome > 0 && (
                        <p className="mt-2 text-sm text-gray-500">
                          Tổng: <strong>{formatCurrency(annualIncome)}</strong>
                          {showMonthlyInput && ` (TB: ${formatCurrency(annualIncome / 12)}/tháng)`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {needsExpenses && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <label className="text-sm text-gray-700">
                    Chi phí có hóa đơn cả năm (VND): doanh thu trên {formatTy(PERCENTAGE_METHOD_MAX_REVENUE)} bắt buộc phương pháp thu nhập
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={annualExpenses ? formatNumber(annualExpenses) : ''}
                    onChange={e => setAnnualExpenses(parseAmount(e.target.value))}
                    placeholder="0"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
              )}
            </div>
          )}

          {/* Business Registration */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isRegisteredBusiness}
                onChange={e => setIsRegisteredBusiness(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="font-medium text-gray-900">
                  Đã đăng ký kinh doanh/đăng ký thuế
                </span>
                <p className="text-sm text-gray-500">
                  Có mã số thuế cho hoạt động kinh doanh: tự kê khai, không bị bên trả thu nhập khấu trừ 10% theo chế độ tiền công
                </p>
              </div>
            </label>
          </div>

          {/* Quick Summary */}
          {result && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tổng thu nhập</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(result.totalIncome)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trạng thái</p>
                  <p className={`text-lg font-bold ${result.isExempt ? 'text-green-600' : 'text-orange-600'}`}>
                    {result.isExempt ? 'Không nộp thuế' : 'Chịu thuế'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Thuế phải nộp</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(result.totalTaxDue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Đã bị khấu trừ 10%</p>
                  <p className="text-lg font-bold text-gray-700">
                    {formatCurrency(result.totalWithheld)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('result')}
                className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Xem chi tiết kết quả
              </button>
            </div>
          )}
        </>
      )}

      {shownTab === 'result' && result && (
        <>
          {/* Result Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">
              Kết quả tính thuế năm {year}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Income */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 uppercase">
                  Thu nhập
                </h4>
                {result.totalIncomeByPlatform.map(item => (
                  <div key={item.platformId}>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-700">{item.platformName}</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    {!result.isExempt && result.method === 'khoan' && (
                      <p className="text-xs text-gray-500">
                        TNCN {formatRate(item.pitRate)}
                        {year >= 2026 && ` · trừ ngưỡng ${formatCurrency(item.thresholdDeduction)}`}
                      </p>
                    )}
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between gap-2">
                  <span className="font-medium text-gray-900">Tổng thu nhập</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(result.totalIncome)}
                  </span>
                </div>
              </div>

              {/* Right: Tax */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 uppercase">
                  Thuế
                </h4>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-700">
                    Ngưỡng không phải nộp thuế
                  </span>
                  <span className={`font-medium ${result.isExempt ? 'text-green-600' : 'text-gray-900'}`}>
                    {formatCurrency(result.threshold)}
                  </span>
                </div>
                {!result.isExempt && (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-700">Thuế GTGT (toàn bộ doanh thu)</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(result.vatAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-700">
                        Thuế TNCN ({year >= 2026 ? TAX_METHOD_LABELS[result.method] : 'thuế khoán 2025'})
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(result.pitAmount)}
                      </span>
                    </div>
                  </>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between gap-2">
                  <span className="font-medium text-gray-900">Tổng thuế phải nộp</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(result.totalTaxDue)}
                  </span>
                </div>
                {result.totalWithheld > 0 && (
                  <div className="flex justify-between gap-2 text-gray-600">
                    <span>Đã bị khấu trừ 10% (tiền công, quyết toán riêng)</span>
                    <span className="font-medium">{formatCurrency(result.totalWithheld)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Effective Rate */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Thuế suất thực tế</span>
                <span className="text-2xl font-bold text-purple-600">
                  {result.effectiveTaxRate.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                </span>
              </div>
            </div>
          </div>

          {/* Quarterly Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              Kê khai theo quý
            </h3>
            {result.isExempt ? (
              <p className="text-sm text-gray-600">
                Không vượt ngưỡng: không phải khai thuế theo quý
                {year >= 2026 && '; thông báo doanh thu (Mẫu 01/TKN-CNKD) chậm nhất 31/01 năm sau'}.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Nghĩa vụ phát sinh từ quý doanh thu lũy kế vượt ngưỡng; quý đó kê khai cả phần doanh thu từ đầu năm.
                  Hạn nộp: ngày cuối cùng của tháng đầu quý sau. Số theo quý là ước tính (phương pháp thu nhập tạm tính trên lợi nhuận lũy kế, quyết toán năm mới chốt).
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-gray-500">Quý</th>
                        <th className="text-right py-2 text-gray-500">Thu nhập</th>
                        <th className="text-right py-2 text-gray-500">Thuế</th>
                        <th className="text-right py-2 text-gray-500">Khấu trừ 10%</th>
                        <th className="text-right py-2 text-gray-500">Hạn nộp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.quarters.map(q => (
                        <tr key={q.quarter} className="border-b border-gray-100">
                          <td className="py-3 font-medium text-gray-900">
                            Quý {q.quarter}
                          </td>
                          <td className="py-3 pl-2 text-right text-gray-700">
                            {formatCurrency(q.income)}
                          </td>
                          <td className="py-3 pl-2 text-right text-red-600">
                            {formatCurrency(q.tax)}
                          </td>
                          <td className="py-3 pl-2 text-right text-gray-600">
                            {formatCurrency(q.withheld)}
                          </td>
                          <td className="py-3 pl-2 text-right text-gray-500 whitespace-nowrap">
                            {q.deadline}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Lưu ý và khuyến nghị
              </h3>
              <div className="space-y-3">
                {result.recommendations.map(rec => (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-lg ${
                      rec.type === 'warning'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : rec.type === 'tip'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <h4 className={`font-medium ${
                      rec.type === 'warning'
                        ? 'text-yellow-800'
                        : rec.type === 'tip'
                        ? 'text-green-800'
                        : 'text-blue-800'
                    }`}>
                      {rec.title}
                    </h4>
                    <p className={`mt-1 text-sm ${
                      rec.type === 'warning'
                        ? 'text-yellow-700'
                        : rec.type === 'tip'
                        ? 'text-green-700'
                        : 'text-blue-700'
                    }`}>
                      {rec.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legal Reference */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <h4 className="font-medium text-gray-900 mb-2">Căn cứ pháp lý</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Luật Thuế TNCN 109/2025/QH15 (sửa đổi bởi Luật 09/2026/QH16): thu nhập từ kinh doanh dựa trên nền tảng số là thu nhập kinh doanh (Điều 3.1.d), áp dụng từ kỳ tính thuế 2026</li>
              <li>NĐ 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP), TT 18/2026/TT-BTC về hộ, cá nhân kinh doanh</li>
              <li>NĐ 253/2026/NĐ-CP: danh mục ngành nghề, khấu trừ 10% thu nhập tiền công</li>
              <li>Ngưỡng doanh thu không phải nộp thuế: {formatCurrency(getRevenueThreshold(2026))}/năm (từ 2026), {formatCurrency(getRevenueThreshold(2025))}/năm (2025)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// Platform button component
function PlatformButton({
  platform,
  selected,
  onClick,
}: {
  platform: Platform;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={platform.description}
      className={`p-3 rounded-lg border-2 transition-all text-left ${
        selected
          ? 'border-purple-600 bg-purple-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className={`text-sm font-medium ${
        selected ? 'text-purple-700' : 'text-gray-700'
      }`}>
        {platform.name}
      </span>
    </button>
  );
}
