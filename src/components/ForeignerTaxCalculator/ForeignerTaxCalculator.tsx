'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  calculateForeignerTax,
  DOUBLE_TAX_TREATY_COUNTRIES,
  NON_RESIDENT_TAX_RATE,
  RESIDENCY_DAYS_THRESHOLD,
  ForeignerAllowances,
  DEFAULT_FOREIGNER_ALLOWANCES,
  ForeignerTaxResult,
  formatMoney,
} from '@/lib/foreignerTaxCalculator';
import { SharedTaxState, RegionType, DEFAULT_INSURANCE_OPTIONS } from '@/lib/taxCalculator';
import { ForeignerTaxTabState } from '@/lib/snapshotTypes';
import Tooltip from '@/components/ui/Tooltip';

interface ForeignerTaxCalculatorProps {
  sharedState: SharedTaxState;
  onStateChange: (updates: Partial<SharedTaxState>) => void;
  tabState: ForeignerTaxTabState;
  onTabStateChange: (state: ForeignerTaxTabState) => void;
}

// Popular countries for quick selection
const POPULAR_COUNTRIES = ['JP', 'KR', 'SG', 'US', 'GB', 'DE', 'FR', 'AU', 'CN', 'TW'];

function formatInputMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export default function ForeignerTaxCalculator({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: ForeignerTaxCalculatorProps) {
  // Local input states for formatted display
  const [localInputs, setLocalInputs] = useState({
    grossIncome: formatInputMoney(sharedState.grossIncome),
    foreignIncome: formatInputMoney(tabState.foreignIncome || 0),
    housing: formatInputMoney(tabState.allowances?.housing || 0),
    schoolFees: formatInputMoney(tabState.allowances?.schoolFees || 0),
    homeLeaveFare: formatInputMoney(tabState.allowances?.homeLeaveFare || 0),
    relocation: formatInputMoney(tabState.allowances?.relocation || 0),
    languageTraining: formatInputMoney(tabState.allowances?.languageTraining || 0),
    other: formatInputMoney(tabState.allowances?.other || 0),
  });

  // Sync localInputs when props change
  useEffect(() => {
    setLocalInputs({
      grossIncome: formatInputMoney(sharedState.grossIncome),
      foreignIncome: formatInputMoney(tabState.foreignIncome || 0),
      housing: formatInputMoney(tabState.allowances?.housing || 0),
      schoolFees: formatInputMoney(tabState.allowances?.schoolFees || 0),
      homeLeaveFare: formatInputMoney(tabState.allowances?.homeLeaveFare || 0),
      relocation: formatInputMoney(tabState.allowances?.relocation || 0),
      languageTraining: formatInputMoney(tabState.allowances?.languageTraining || 0),
      other: formatInputMoney(tabState.allowances?.other || 0),
    });
  }, [sharedState.grossIncome, tabState.foreignIncome, tabState.allowances]);

  // Handle input change
  const handleInputChange = useCallback((field: keyof typeof localInputs, value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setLocalInputs(prev => ({ ...prev, [field]: numericValue }));

    const numValue = parseInt(numericValue) || 0;

    if (field === 'grossIncome') {
      onStateChange({ grossIncome: numValue });
    } else if (field === 'foreignIncome') {
      onTabStateChange({ ...tabState, foreignIncome: numValue });
    } else {
      // Allowance fields
      const allowanceField = field as keyof ForeignerAllowances;
      onTabStateChange({
        ...tabState,
        allowances: {
          ...(tabState.allowances || DEFAULT_FOREIGNER_ALLOWANCES),
          [allowanceField]: numValue,
        },
      });
    }
  }, [onStateChange, onTabStateChange, tabState]);

  const handleBlur = useCallback((field: keyof typeof localInputs) => {
    setLocalInputs(prev => {
      const numValue = parseInt(prev[field].replace(/[^\d]/g, '')) || 0;
      return { ...prev, [field]: formatInputMoney(numValue) };
    });
  }, []);

  const handleFocus = useCallback((field: keyof typeof localInputs) => {
    setLocalInputs(prev => {
      const numValue = parseInt(prev[field].replace(/[^\d]/g, '')) || 0;
      return { ...prev, [field]: numValue.toString() };
    });
  }, []);

  // Calculate tax result
  const result = useMemo<ForeignerTaxResult>(() => {
    return calculateForeignerTax({
      nationality: tabState.nationality || '',
      daysInVietnam: tabState.daysInVietnam || 0,
      hasPermanentResidence: tabState.hasPermanentResidence || false,
      grossIncome: sharedState.grossIncome,
      foreignIncome: tabState.foreignIncome || 0,
      allowances: tabState.allowances || DEFAULT_FOREIGNER_ALLOWANCES,
      hasVietnameseInsurance: tabState.hasVietnameseInsurance ?? false,
      insuranceOptions: sharedState.insuranceOptions || DEFAULT_INSURANCE_OPTIONS,
      region: sharedState.region || 1,
      dependents: sharedState.dependents || 0,
      taxYear: tabState.taxYear || 2026,
      isSecondHalf2026: tabState.isSecondHalf2026 ?? true,
    });
  }, [sharedState, tabState]);

  // Check if country has treaty
  const selectedCountry = DOUBLE_TAX_TREATY_COUNTRIES.find(
    c => c.code === tabState.nationality
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl">🌏</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Thuế TNCN cho người nước ngoài</h2>
            <p className="text-sm text-gray-500">
              Tính thuế thu nhập cá nhân cho người nước ngoài tại Việt Nam (Expatriate Tax)
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-indigo-500 text-lg">💡</span>
            <div className="text-sm text-indigo-800">
              <p className="font-medium mb-1">Quy tắc xác định cư trú thuế:</p>
              <ul className="list-disc list-inside space-y-1 text-indigo-700">
                <li><strong>Cư trú:</strong> Ở VN ≥ 183 ngày/năm hoặc có nơi ở thường trú → Thuế lũy tiến 5-35%</li>
                <li><strong>Không cư trú:</strong> Ở VN &lt; 183 ngày, không có nơi ở thường trú → Thuế 20% cố định</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Input Section */}
        <div className="space-y-6">
          {/* Residency Status */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">1</span>
              Thông tin cư trú
            </h3>

            {/* Nationality */}
            <div className="mb-4">
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                Quốc tịch
                <Tooltip content="Chọn quốc tịch để kiểm tra Hiệp định tránh đánh thuế hai lần">
                  <span className="text-gray-400 hover:text-gray-600 cursor-help">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </Tooltip>
              </label>

              {/* Popular countries quick select */}
              <div className="flex flex-wrap gap-2 mb-3">
                {POPULAR_COUNTRIES.map(code => {
                  const country = DOUBLE_TAX_TREATY_COUNTRIES.find(c => c.code === code);
                  if (!country) return null;
                  return (
                    <button
                      key={code}
                      onClick={() => onTabStateChange({ ...tabState, nationality: code })}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        tabState.nationality === code
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {country.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>

              <select
                id="nationality"
                value={tabState.nationality || ''}
                onChange={(e) => onTabStateChange({ ...tabState, nationality: e.target.value })}
                className="input-field"
              >
                <option value="">-- Chọn quốc tịch --</option>
                <optgroup label="Các nước có Hiệp định thuế">
                  {DOUBLE_TAX_TREATY_COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name} (từ {country.year})
                    </option>
                  ))}
                </optgroup>
              </select>

              {selectedCountry && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      <strong>{selectedCountry.name}</strong> có Hiệp định thuế với Việt Nam (từ năm {selectedCountry.year})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Days in Vietnam */}
            <div className="mb-4">
              <label htmlFor="days-in-vietnam" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Số ngày ở Việt Nam trong năm
                <Tooltip content="Số ngày có mặt tại Việt Nam trong năm tính thuế">
                  <span className="text-gray-400 hover:text-gray-600 cursor-help">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </Tooltip>
              </label>
              <div className="relative">
                <input
                  id="days-in-vietnam"
                  type="number"
                  min="0"
                  max="365"
                  value={tabState.daysInVietnam || 0}
                  onChange={(e) => onTabStateChange({ ...tabState, daysInVietnam: parseInt(e.target.value) || 0 })}
                  className="input-field pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ngày</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className={`h-2 flex-1 rounded-full ${
                  (tabState.daysInVietnam || 0) >= RESIDENCY_DAYS_THRESHOLD
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}>
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((tabState.daysInVietnam || 0) / 365) * 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  (tabState.daysInVietnam || 0) >= RESIDENCY_DAYS_THRESHOLD
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}>
                  {tabState.daysInVietnam || 0}/{RESIDENCY_DAYS_THRESHOLD}
                </span>
              </div>
            </div>

            {/* Permanent Residence */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tabState.hasPermanentResidence || false}
                  onChange={(e) => onTabStateChange({ ...tabState, hasPermanentResidence: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Có nơi ở thường trú tại Việt Nam
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-8">
                Thuê nhà ≥ 183 ngày hoặc đăng ký thường trú
              </p>
            </div>

            {/* Residency Status Display */}
            <div className={`p-4 rounded-xl border-2 ${
              result.residencyStatus === 'resident'
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  result.residencyStatus === 'resident' ? 'bg-green-500' : 'bg-amber-500'
                }`}>
                  <span className="text-white text-lg">
                    {result.residencyStatus === 'resident' ? '🏠' : '✈️'}
                  </span>
                </div>
                <div>
                  <p className={`font-semibold ${
                    result.residencyStatus === 'resident' ? 'text-green-800' : 'text-amber-800'
                  }`}>
                    {result.residencyStatus === 'resident' ? 'Cư trú thuế' : 'Không cư trú thuế'}
                  </p>
                  <p className={`text-sm ${
                    result.residencyStatus === 'resident' ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {result.residencyStatus === 'resident'
                      ? 'Áp dụng thuế lũy tiến 5% - 35%'
                      : `Áp dụng thuế cố định ${NON_RESIDENT_TAX_RATE * 100}%`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Income Section */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">2</span>
              Thu nhập
            </h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="gross-income" className="block text-sm font-medium text-gray-700 mb-1">
                  Thu nhập từ Việt Nam (GROSS/tháng)
                </label>
                <div className="relative">
                  <input
                    id="gross-income"
                    type="text"
                    value={localInputs.grossIncome}
                    onChange={(e) => handleInputChange('grossIncome', e.target.value)}
                    onBlur={() => handleBlur('grossIncome')}
                    onFocus={() => handleFocus('grossIncome')}
                    className="input-field pr-10"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                </div>
              </div>

              {result.residencyStatus === 'resident' && (
                <div>
                  <label htmlFor="foreign-income" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Thu nhập từ nước ngoài (nếu có)
                    <Tooltip content="Người cư trú phải kê khai thu nhập phát sinh ngoài Việt Nam">
                      <span className="text-gray-400 hover:text-gray-600 cursor-help">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      id="foreign-income"
                      type="text"
                      value={localInputs.foreignIncome}
                      onChange={(e) => handleInputChange('foreignIncome', e.target.value)}
                      onBlur={() => handleBlur('foreignIncome')}
                      onFocus={() => handleFocus('foreignIncome')}
                      className="input-field pr-10"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Allowances Section */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">3</span>
              Phụ cấp người nước ngoài
            </h3>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="housing" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Phụ cấp nhà ở
                    <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">Chịu thuế</span>
                  </label>
                  <div className="relative">
                    <input
                      id="housing"
                      type="text"
                      value={localInputs.housing}
                      onChange={(e) => handleInputChange('housing', e.target.value)}
                      onBlur={() => handleBlur('housing')}
                      onFocus={() => handleFocus('housing')}
                      className="input-field pr-10"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="schoolFees" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Học phí cho con
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-600 rounded">Miễn thuế</span>
                  </label>
                  <div className="relative">
                    <input
                      id="schoolFees"
                      type="text"
                      value={localInputs.schoolFees}
                      onChange={(e) => handleInputChange('schoolFees', e.target.value)}
                      onBlur={() => handleBlur('schoolFees')}
                      onFocus={() => handleFocus('schoolFees')}
                      className="input-field pr-10"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="homeLeaveFare" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Vé máy bay về nước
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-600 rounded">Miễn thuế</span>
                  </label>
                  <div className="relative">
                    <input
                      id="homeLeaveFare"
                      type="text"
                      value={localInputs.homeLeaveFare}
                      onChange={(e) => handleInputChange('homeLeaveFare', e.target.value)}
                      onBlur={() => handleBlur('homeLeaveFare')}
                      onFocus={() => handleFocus('homeLeaveFare')}
                      className="input-field pr-10"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="relocation" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Chi phí chuyển chỗ ở
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-600 rounded">Miễn thuế</span>
                  </label>
                  <div className="relative">
                    <input
                      id="relocation"
                      type="text"
                      value={localInputs.relocation}
                      onChange={(e) => handleInputChange('relocation', e.target.value)}
                      onBlur={() => handleBlur('relocation')}
                      onFocus={() => handleFocus('relocation')}
                      className="input-field pr-10"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="languageTraining" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Đào tạo ngôn ngữ
                    <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">Chịu thuế</span>
                  </label>
                  <div className="relative">
                    <input
                      id="languageTraining"
                      type="text"
                      value={localInputs.languageTraining}
                      onChange={(e) => handleInputChange('languageTraining', e.target.value)}
                      onBlur={() => handleBlur('languageTraining')}
                      onFocus={() => handleFocus('languageTraining')}
                      className="input-field pr-10"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="other-allowances" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    Phụ cấp khác
                    <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">Chịu thuế</span>
                  </label>
                  <div className="relative">
                    <input
                      id="other-allowances"
                      type="text"
                      value={localInputs.other}
                      onChange={(e) => handleInputChange('other', e.target.value)}
                      onBlur={() => handleBlur('other')}
                      onFocus={() => handleFocus('other')}
                      className="input-field pr-10"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
                  </div>
                </div>
              </div>

              {/* Allowances summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tổng phụ cấp:</span>
                  <span className="font-medium">{formatMoney(result.totalAllowances)} đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Phụ cấp miễn thuế:</span>
                  <span className="font-medium text-green-600">{formatMoney(result.exemptAllowances)} đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Phụ cấp chịu thuế:</span>
                  <span className="font-medium text-red-600">{formatMoney(result.taxableAllowances)} đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          {result.residencyStatus === 'resident' && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">4</span>
                Tùy chọn khác
              </h3>

              <div className="space-y-4">
                {/* Dependents */}
                <div>
                  <label htmlFor="dependents" className="block text-sm font-medium text-gray-700 mb-1">
                    Số người phụ thuộc
                  </label>
                  <input
                    id="dependents"
                    type="number"
                    min="0"
                    max="10"
                    value={sharedState.dependents || 0}
                    onChange={(e) => onStateChange({ dependents: parseInt(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>

                {/* Insurance */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tabState.hasVietnameseInsurance || false}
                      onChange={(e) => onTabStateChange({ ...tabState, hasVietnameseInsurance: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Tham gia BHXH, BHYT, BHTN Việt Nam
                    </span>
                  </label>
                </div>

                {/* Tax Year */}
                <div>
                  <label htmlFor="tax-year" className="block text-sm font-medium text-gray-700 mb-1">
                    Năm tính thuế
                  </label>
                  <select
                    id="tax-year"
                    value={tabState.taxYear || 2026}
                    onChange={(e) => onTabStateChange({
                      ...tabState,
                      taxYear: parseInt(e.target.value) as 2025 | 2026
                    })}
                    className="input-field"
                  >
                    <option value={2025}>2025 (Luật cũ - 7 bậc)</option>
                    <option value={2026}>2026 (Luật mới - 5 bậc từ 1/7/2026)</option>
                  </select>
                </div>

                {tabState.taxYear === 2026 && (
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tabState.isSecondHalf2026 ?? true}
                        onChange={(e) => onTabStateChange({ ...tabState, isSecondHalf2026: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Áp dụng luật mới (nửa sau 2026)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Main Result Card */}
          <div className="card bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Kết quả tính thuế</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                result.residencyStatus === 'resident'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-400 text-amber-900'
              }`}>
                {result.residencyStatus === 'resident' ? 'Cư trú' : 'Không cư trú'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Total Income */}
              <div className="flex justify-between items-center py-2 border-b border-white/20">
                <span className="text-white/80">Tổng thu nhập:</span>
                <span className="font-semibold">{formatMoney(result.totalIncome)} đ</span>
              </div>

              {/* Deductions (for residents) */}
              {result.residencyStatus === 'resident' && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-white/20">
                    <span className="text-white/80">Giảm trừ bản thân:</span>
                    <span className="font-semibold">-{formatMoney(result.personalDeduction)} đ</span>
                  </div>
                  {result.dependentDeduction > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-white/20">
                      <span className="text-white/80">Giảm trừ phụ thuộc:</span>
                      <span className="font-semibold">-{formatMoney(result.dependentDeduction)} đ</span>
                    </div>
                  )}
                  {result.insuranceDeduction > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-white/20">
                      <span className="text-white/80">Bảo hiểm bắt buộc:</span>
                      <span className="font-semibold">-{formatMoney(result.insuranceDeduction)} đ</span>
                    </div>
                  )}
                </>
              )}

              {/* Taxable Income */}
              <div className="flex justify-between items-center py-2 border-b border-white/20">
                <span className="text-white/80">Thu nhập chịu thuế:</span>
                <span className="font-semibold">{formatMoney(result.taxableIncome)} đ</span>
              </div>

              {/* Tax Amount */}
              <div className="flex justify-between items-center py-3 bg-white/10 -mx-4 px-4 rounded-lg">
                <span className="font-medium">Thuế TNCN phải nộp:</span>
                <span className="text-2xl font-bold">{formatMoney(result.taxAmount)} đ</span>
              </div>

              {/* Net Income */}
              <div className="flex justify-between items-center py-2">
                <span className="text-white/80">Thu nhập thực nhận:</span>
                <span className="text-xl font-bold text-emerald-300">{formatMoney(result.netIncome)} đ</span>
              </div>

              {/* Effective Tax Rate */}
              <div className="flex justify-between items-center py-2">
                <span className="text-white/80">Thuế suất hiệu quả:</span>
                <span className="font-semibold">{result.effectiveTaxRate.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Tax Breakdown (for residents) */}
          {result.residencyStatus === 'resident' && result.taxBreakdown && result.taxBreakdown.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Chi tiết thuế theo bậc</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Bậc</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Thu nhập</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Thuế suất</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Thuế</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.taxBreakdown.map((bracket) => (
                      <tr key={bracket.bracket} className="border-b border-gray-100">
                        <td className="py-2 px-2 text-gray-600">Bậc {bracket.bracket}</td>
                        <td className="text-right py-2 px-2">{formatMoney(bracket.taxableAmount)} đ</td>
                        <td className="text-right py-2 px-2">{(bracket.rate * 100)}%</td>
                        <td className="text-right py-2 px-2 font-medium text-red-600">{formatMoney(bracket.taxAmount)} đ</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="py-2 px-2 font-medium text-gray-900">Tổng thuế</td>
                      <td className="text-right py-2 px-2 font-bold text-red-600">{formatMoney(result.taxAmount)} đ</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comparison (for 2026) */}
          {result.savings !== undefined && result.savings > 0 && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">💰</span>
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">Tiết kiệm với luật mới 2026</h4>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatMoney(result.savings)} đ/tháng</p>
                  <div className="mt-2 text-sm text-green-700 space-y-1">
                    <p>Thuế theo luật cũ: {formatMoney(result.taxUnderOldLaw || 0)} đ</p>
                    <p>Thuế theo luật mới: {formatMoney(result.taxUnderNewLaw || 0)} đ</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {result.notes.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-lg">📝</span>
                Lưu ý
              </h3>
              <ul className="space-y-2">
                {result.notes.map((note, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Treaty Info */}
          {result.hasTreatyWithCountry && result.treatyInfo && (
            <div className="card bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">🤝</span>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800">Hiệp định tránh đánh thuế hai lần</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Việt Nam và {result.treatyInfo.name} đã ký Hiệp định từ năm {result.treatyInfo.year}.
                    Thuế đã nộp ở một trong hai nước có thể được khấu trừ để tránh đánh thuế hai lần.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
