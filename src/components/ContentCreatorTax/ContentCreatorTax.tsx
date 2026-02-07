'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  PLATFORMS,
  CONTENT_CREATOR_TAX_CONFIG,
  calculateContentCreatorTax,
  formatCurrency,
  getQuarterlySummary,
  getPlatformById,
  type Platform,
  type PlatformIncome,
  type ContentCreatorInput,
  type ContentCreatorTaxResult,
} from '@/lib/contentCreatorTaxCalculator';

interface ContentCreatorTaxProps {
  year?: number;
  onYearChange?: (year: number) => void;
}

interface PlatformIncomeState {
  platformId: string;
  monthlyIncome: number[];
  useMonthly: boolean;
  annualIncome: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [2025, 2026, 2027];

export default function ContentCreatorTax({
  year: externalYear,
  onYearChange,
}: ContentCreatorTaxProps) {
  const [internalYear, setInternalYear] = useState(CURRENT_YEAR >= 2026 ? 2026 : 2025);
  const year = externalYear ?? internalYear;

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformIncomes, setPlatformIncomes] = useState<Record<string, PlatformIncomeState>>({});
  const [isRegisteredBusiness, setIsRegisteredBusiness] = useState(false);
  const [showMonthlyInput, setShowMonthlyInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'result'>('input');

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
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(id => id !== platformId);
      }
      return [...prev, platformId];
    });

    // Initialize income state for new platform
    if (!platformIncomes[platformId]) {
      setPlatformIncomes(prev => ({
        ...prev,
        [platformId]: {
          platformId,
          monthlyIncome: Array(12).fill(0),
          useMonthly: false,
          annualIncome: 0,
        },
      }));
    }
  }, [platformIncomes]);

  // Update annual income
  const updateAnnualIncome = useCallback((platformId: string, value: number) => {
    setPlatformIncomes(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        annualIncome: value,
        // Distribute evenly if using annual
        monthlyIncome: prev[platformId].useMonthly
          ? prev[platformId].monthlyIncome
          : Array(12).fill(Math.round(value / 12)),
      },
    }));
  }, []);

  // Update monthly income
  const updateMonthlyIncome = useCallback((platformId: string, month: number, value: number) => {
    setPlatformIncomes(prev => {
      const newMonthly = [...prev[platformId].monthlyIncome];
      newMonthly[month] = value;
      return {
        ...prev,
        [platformId]: {
          ...prev[platformId],
          monthlyIncome: newMonthly,
          annualIncome: newMonthly.reduce((sum, v) => sum + v, 0),
        },
      };
    });
  }, []);

  // Toggle monthly input mode
  const toggleMonthlyInput = useCallback((platformId: string) => {
    setPlatformIncomes(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        useMonthly: !prev[platformId].useMonthly,
      },
    }));
  }, []);

  // Build input for calculation
  const calculatorInput = useMemo((): ContentCreatorInput => {
    const platforms: PlatformIncome[] = selectedPlatforms.map(platformId => {
      const state = platformIncomes[platformId];
      const platform = getPlatformById(platformId);
      const totalIncome = state?.annualIncome || 0;

      // Calculate withheld tax for domestic platforms
      let withheldTax = 0;
      if (platform?.type === 'domestic' && platform.withholdingRate) {
        const monthlyIncomes = state?.monthlyIncome || Array(12).fill(totalIncome / 12);
        withheldTax = monthlyIncomes
          .filter(income => income >= CONTENT_CREATOR_TAX_CONFIG.withholding.threshold)
          .reduce((sum, income) => sum + income * platform.withholdingRate!, 0);
      }

      return {
        platformId,
        monthlyIncome: state?.monthlyIncome || Array(12).fill(0),
        totalIncome,
        withheldTax,
      };
    });

    return {
      year,
      platforms,
      hasOtherIncome: false,
      isRegisteredBusiness,
    };
  }, [year, selectedPlatforms, platformIncomes, isRegisteredBusiness]);

  // Calculate result
  const result = useMemo((): ContentCreatorTaxResult | null => {
    if (selectedPlatforms.length === 0) return null;
    const totalIncome = selectedPlatforms.reduce(
      (sum, id) => sum + (platformIncomes[id]?.annualIncome || 0),
      0
    );
    if (totalIncome === 0) return null;
    return calculateContentCreatorTax(calculatorInput);
  }, [calculatorInput, selectedPlatforms, platformIncomes]);

  // Quarterly summary
  const quarterlySummary = useMemo(() => {
    if (!result) return [];
    return getQuarterlySummary(result.monthlyBreakdown);
  }, [result]);

  // Threshold for current year
  const threshold = year >= 2026
    ? CONTENT_CREATOR_TAX_CONFIG.thresholds.year2026
    : CONTENT_CREATOR_TAX_CONFIG.thresholds.year2025;

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
          Ngưỡng miễn thuế {year}: <strong>{formatCurrency(threshold)}/năm</strong>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('input')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'input'
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
            activeTab === 'result'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-50'
          }`}
        >
          Kết quả tính thuế
        </button>
      </div>

      {activeTab === 'input' && (
        <>
          {/* Platform Selection */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">
              Chọn nền tảng hoạt động
            </h3>

            {/* Foreign Platforms */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                Nền tảng nước ngoài (tự kê khai)
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
                Nền tảng Việt Nam (khấu trừ 10% tại nguồn)
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
              <div className="flex justify-between items-center mb-4">
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

              <div className="space-y-4">
                {selectedPlatforms.map(platformId => {
                  const platform = getPlatformById(platformId);
                  const state = platformIncomes[platformId];
                  if (!platform || !state) return null;

                  return (
                    <div key={platformId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{platform.icon}</span>
                        <span className="font-medium text-gray-900">
                          {platform.name}
                        </span>
                        {platform.type === 'domestic' && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                            Khấu trừ 10%
                          </span>
                        )}
                      </div>

                      {showMonthlyInput ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {Array.from({ length: 12 }, (_, i) => (
                            <div key={i}>
                              <label className="text-xs text-gray-500">
                                T{i + 1}
                              </label>
                              <input
                                type="number"
                                value={state.monthlyIncome[i] || ''}
                                onChange={e => updateMonthlyIncome(platformId, i, Number(e.target.value) || 0)}
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
                            type="number"
                            value={state.annualIncome || ''}
                            onChange={e => updateAnnualIncome(platformId, Number(e.target.value) || 0)}
                            placeholder="Nhập thu nhập năm..."
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                          />
                        </div>
                      )}

                      {state.annualIncome > 0 && (
                        <p className="mt-2 text-sm text-gray-500">
                          Tổng: <strong>{formatCurrency(state.annualIncome)}</strong>
                          {showMonthlyInput && ` (TB: ${formatCurrency(state.annualIncome / 12)}/tháng)`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
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
                  Đã đăng ký hộ kinh doanh
                </span>
                <p className="text-sm text-gray-500">
                  Nếu đã đăng ký, bạn có MST 13 số và kê khai thuế định kỳ
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
                    {result.isExempt ? 'Miễn thuế' : 'Chịu thuế'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Thuế phải nộp</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(result.totalTaxDue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Còn phải nộp</p>
                  <p className={`text-lg font-bold ${result.remainingTax <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.max(0, result.remainingTax))}
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

      {activeTab === 'result' && result && (
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
                  <div key={item.platformId} className="flex justify-between">
                    <span className="text-gray-700">{item.platformName}</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
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
                <div className="flex justify-between">
                  <span className="text-gray-700">
                    Ngưỡng miễn thuế
                  </span>
                  <span className={`font-medium ${result.isExempt ? 'text-green-600' : 'text-gray-900'}`}>
                    {formatCurrency(result.threshold)}
                  </span>
                </div>
                {!result.isExempt && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Thuế GTGT (5%)</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(result.vatAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Thuế TNCN (2%)</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(result.pitAmount)}
                      </span>
                    </div>
                  </>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-medium text-gray-900">Tổng thuế</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(result.totalTaxDue)}
                  </span>
                </div>
                {result.totalWithheld > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Đã khấu trừ tại nguồn</span>
                      <span className="font-medium">-{formatCurrency(result.totalWithheld)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                      <span className="font-medium text-gray-900">Còn phải nộp</span>
                      <span className={`font-bold ${result.remainingTax <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {result.remainingTax <= 0
                          ? `Hoàn ${formatCurrency(Math.abs(result.remainingTax))}`
                          : formatCurrency(result.remainingTax)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Effective Rate */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Thuế suất thực tế</span>
                <span className="text-2xl font-bold text-purple-600">
                  {result.effectiveTaxRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Quarterly Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">
              Kê khai theo quý
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500">Quý</th>
                    <th className="text-right py-2 text-gray-500">Thu nhập</th>
                    <th className="text-right py-2 text-gray-500">Thuế</th>
                    <th className="text-right py-2 text-gray-500">Đã khấu trừ</th>
                    <th className="text-right py-2 text-gray-500">Hạn kê khai</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterlySummary.map(q => (
                    <tr key={q.quarter} className="border-b border-gray-100">
                      <td className="py-3 font-medium text-gray-900">
                        Quý {q.quarter}
                      </td>
                      <td className="py-3 text-right text-gray-700">
                        {formatCurrency(q.income)}
                      </td>
                      <td className="py-3 text-right text-red-600">
                        {formatCurrency(q.tax)}
                      </td>
                      <td className="py-3 text-right text-green-600">
                        {formatCurrency(q.withheld)}
                      </td>
                      <td className="py-3 text-right text-gray-500">
                        {q.deadline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                      {rec.type === 'warning' && '⚠️ '}
                      {rec.type === 'tip' && '💡 '}
                      {rec.type === 'info' && 'ℹ️ '}
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
              <li>Luật Thuế TNCN 2025 (có hiệu lực từ 1/7/2026)</li>
              <li>Thông tư 111/2013/TT-BTC về thuế TNCN</li>
              <li>Nghị định 125/2020/NĐ-CP về xử phạt vi phạm thuế</li>
              <li>Ngưỡng miễn thuế: 500 triệu/năm (từ 2026), 100 triệu/năm (2025)</li>
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
      className={`p-3 rounded-lg border-2 transition-all text-left ${
        selected
          ? 'border-purple-600 bg-purple-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{platform.icon}</span>
        <span className={`text-sm font-medium ${
          selected ? 'text-purple-700' : 'text-gray-700'
        }`}>
          {platform.name}
        </span>
      </div>
    </button>
  );
}
