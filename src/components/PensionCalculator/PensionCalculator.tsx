'use client';

import { useState, useEffect, useCallback } from 'react';
import { calculatePension, PensionInput, PensionResult } from '@/lib/pensionCalculator';
import { formatCurrency, formatNumber, parseCurrency } from '@/lib/taxCalculator';
import { CurrencyInputIssues, MAX_MONTHLY_INCOME, parseCurrencyInput } from '@/utils/inputSanitizers';
import Tooltip from '@/components/ui/Tooltip';
import { PensionTabState } from '@/lib/snapshotTypes';

interface PensionCalculatorProps {
  tabState?: PensionTabState;
  onTabStateChange?: (state: PensionTabState) => void;
}

// Info icon component for tooltips
function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function PensionCalculator({ tabState, onTabStateChange }: PensionCalculatorProps) {
  // Initialize state from tabState or defaults
  const [gender, setGender] = useState<'male' | 'female'>(tabState?.gender ?? 'male');
  const [birthYear, setBirthYear] = useState<number>(tabState?.birthYear ?? 1985);
  const [birthMonth, setBirthMonth] = useState<number>(tabState?.birthMonth ?? 1);
  const [contributionStartYear, setContributionStartYear] = useState<number>(tabState?.contributionStartYear ?? 2010);
  const [contributionYears, setContributionYears] = useState<number>(tabState?.contributionYears ?? 20);
  const [contributionMonths, setContributionMonths] = useState<number>(tabState?.contributionMonths ?? 0);
  const [currentMonthlySalary, setCurrentMonthlySalary] = useState<string>(
    tabState?.currentMonthlySalary?.toString() ?? '10000000'
  );
  const [earlyRetirementYears, setEarlyRetirementYears] = useState<number>(tabState?.earlyRetirementYears ?? 0);
  const [isHazardousWork, setIsHazardousWork] = useState<boolean>(tabState?.isHazardousWork ?? false);
  const [salaryWarning, setSalaryWarning] = useState<string | null>(null);

  const [result, setResult] = useState<PensionResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Update parent state when local state changes
  const updateTabState = useCallback(() => {
    if (onTabStateChange) {
      onTabStateChange({
        gender,
        birthYear,
        birthMonth,
        contributionStartYear,
        contributionYears,
        contributionMonths,
        currentMonthlySalary: parseCurrency(currentMonthlySalary),
        earlyRetirementYears,
        isHazardousWork,
      });
    }
  }, [
    gender,
    birthYear,
    birthMonth,
    contributionStartYear,
    contributionYears,
    contributionMonths,
    currentMonthlySalary,
    earlyRetirementYears,
    isHazardousWork,
    onTabStateChange,
  ]);

  // Calculate pension whenever inputs change
  useEffect(() => {
    try {
      const salary = parseCurrency(currentMonthlySalary);
      const input: PensionInput = {
        gender,
        birthYear,
        birthMonth,
        contributionStartYear,
        contributionYears,
        contributionMonths,
        currentMonthlySalary: salary,
        earlyRetirementYears,
        isHazardousWork,
      };

      const calculated = calculatePension(input);
      setResult(calculated);
      setErrors([]);
      updateTabState();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Có lỗi xảy ra']);
      setResult(null);
    }
  }, [
    gender,
    birthYear,
    birthMonth,
    contributionStartYear,
    contributionYears,
    contributionMonths,
    currentMonthlySalary,
    earlyRetirementYears,
    isHazardousWork,
    updateTabState,
  ]);

  const handleSalaryChange = (value: string) => {
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    setCurrentMonthlySalary(parsed.value.toString());
    setSalaryWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
  };

  const buildWarning = (issues: CurrencyInputIssues, max?: number): string | null => {
    const messages: string[] = [];
    if (issues.negative) {
      messages.push('Không hỗ trợ số âm.');
    }
    if (issues.decimal) {
      messages.push('Không hỗ trợ số thập phân, đã bỏ phần lẻ.');
    }
    if (issues.overflow && max) {
      messages.push(`Giá trị quá lớn, giới hạn tối đa ${formatNumber(max)} VNĐ.`);
    }
    return messages.length ? messages.join(' ') : null;
  };

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear;

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl">👴</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tính lương hưu BHXH</h2>
          <p className="text-sm text-gray-500">Ước tính lương hưu dựa trên thời gian đóng bảo hiểm</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-red-600">• {error}</p>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Thông tin cá nhân</h3>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giới tính
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  gender === 'male'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Nam
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  gender === 'female'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Nữ
              </button>
            </div>
          </div>

          {/* Birth Year and Month */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Năm sinh</span>
                <Tooltip content="Năm sinh của bạn để tính tuổi nghỉ hưu">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(parseInt(e.target.value) || 1985)}
                className="input-field"
                min="1940"
                max={currentYear}
              />
              <p className="text-xs text-gray-500 mt-1">
                Tuổi hiện tại: {currentAge}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tháng sinh
              </label>
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(parseInt(e.target.value))}
                className="input-field"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    Tháng {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contribution Period */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Năm bắt đầu đóng BHXH</span>
              <Tooltip content="Năm bạn bắt đầu tham gia bảo hiểm xã hội">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              type="number"
              value={contributionStartYear}
              onChange={(e) => setContributionStartYear(parseInt(e.target.value) || 2000)}
              className="input-field"
              min="1980"
              max={currentYear}
            />
          </div>

          {/* Contribution Years and Months */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Thời gian đã đóng BHXH</span>
              <Tooltip content="Tổng số năm và tháng đã đóng bảo hiểm xã hội">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Số năm</label>
                <input
                  type="number"
                  value={contributionYears}
                  onChange={(e) => setContributionYears(Math.max(0, parseInt(e.target.value) || 0))}
                  className="input-field"
                  min="0"
                  max="50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Số tháng</label>
                <input
                  type="number"
                  value={contributionMonths}
                  onChange={(e) => setContributionMonths(Math.max(0, Math.min(11, parseInt(e.target.value) || 0)))}
                  className="input-field"
                  min="0"
                  max="11"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Tổng: {contributionYears} năm {contributionMonths} tháng
            </p>
          </div>

          {/* Current Monthly Salary */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Lương đóng BHXH hiện tại (VNĐ/tháng)</span>
              <Tooltip content="Mức lương hiện tại bạn đang đóng bảo hiểm xã hội">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              type="text"
              value={formatNumber(parseCurrency(currentMonthlySalary))}
              onChange={(e) => handleSalaryChange(e.target.value)}
              className="input-field text-lg font-semibold"
              placeholder="Nhập lương đóng BHXH"
            />
            {salaryWarning && (
              <p className="text-xs text-amber-600 mt-1">{salaryWarning}</p>
            )}
          </div>

          {/* Early Retirement */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Nghỉ hưu sớm (số năm)</span>
              <Tooltip content="Số năm bạn muốn nghỉ hưu sớm hơn tuổi quy định (0-5 năm). Lương hưu sẽ giảm 2% mỗi năm nghỉ sớm.">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <select
              value={earlyRetirementYears}
              onChange={(e) => setEarlyRetirementYears(parseInt(e.target.value))}
              className="input-field"
            >
              <option value="0">Không nghỉ sớm</option>
              <option value="1">1 năm</option>
              <option value="2">2 năm</option>
              <option value="3">3 năm</option>
              <option value="4">4 năm</option>
              <option value="5">5 năm</option>
            </select>
            {earlyRetirementYears > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Lương hưu sẽ giảm {earlyRetirementYears * 2}% do nghỉ sớm
              </p>
            )}
          </div>

          {/* Hazardous Work */}
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isHazardousWork}
                onChange={(e) => setIsHazardousWork(e.target.checked)}
                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Làm nghề độc hại, nguy hiểm
                <Tooltip content="Nghề độc hại được nghỉ hưu sớm hơn. Nam: 57 tuổi, Nữ: 55 tuổi.">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </span>
            </label>
          </div>
        </div>

        {/* Result Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Kết quả tính toán</h3>

          {result && (
            <>
              {/* Retirement Age and Date */}
              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-semibold text-primary-900">Tuổi và thời điểm nghỉ hưu</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tuổi nghỉ hưu:</span>
                    <span className="font-semibold text-primary-700">
                      {result.retirementAge.years} năm {result.retirementAge.months} tháng
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thời điểm nghỉ hưu:</span>
                    <span className="font-semibold text-primary-700">
                      Tháng {result.retirementMonth}/{result.retirementYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contribution Summary */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h4 className="font-semibold text-blue-900">Thông tin đóng góp</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thời gian đóng:</span>
                    <span className="font-medium">
                      {result.totalContributionYears} năm {result.totalContributionMonths} tháng
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tổng đã đóng:</span>
                    <span className="font-semibold text-blue-700">
                      {formatCurrency(result.totalContributed)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Benefit Rate Calculation */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-semibold text-green-900">Tỷ lệ hưởng lương hưu</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tỷ lệ cơ bản:</span>
                    <span className="font-medium">{(result.baseRate * 100).toFixed(1)}%</span>
                  </div>
                  {result.deductionRate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Giảm trừ nghỉ sớm:</span>
                      <span className="text-amber-600 font-medium">-{(result.deductionRate * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <span className="text-gray-600 font-medium">Tỷ lệ cuối cùng:</span>
                    <span className="font-bold text-green-700">{(result.finalRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Monthly and Yearly Pension */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border-2 border-purple-300">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="font-semibold text-purple-900">Lương hưu dự kiến</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Hàng tháng</div>
                    <div className="text-2xl font-bold text-purple-700">
                      {formatCurrency(result.monthlyPension)}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-purple-200">
                    <div className="text-xs text-gray-600 mb-1">Hàng năm</div>
                    <div className="text-lg font-semibold text-purple-600">
                      {formatCurrency(result.yearlyPension)}
                    </div>
                  </div>
                </div>
              </div>

              {/* One-time Allowance */}
              {result.oneTimeAllowance > 0 && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <h4 className="font-semibold text-amber-900">Trợ cấp thêm một lần</h4>
                  </div>
                  <div className="text-lg font-bold text-amber-700">
                    {formatCurrency(result.oneTimeAllowance)}
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Cho thời gian đóng vượt mức tối đa hưởng lương
                  </p>
                </div>
              )}

              {/* Analysis: Breakeven */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h4 className="font-semibold text-gray-900">Phân tích hòa vốn</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thời gian hòa vốn:</span>
                    <span className="font-semibold text-gray-800">
                      ~{result.yearsToBreakeven.toFixed(1)} năm
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Sau khoảng {result.yearsToBreakeven.toFixed(1)} năm nghỉ hưu, tổng lương hưu nhận được sẽ bằng tổng số tiền đã đóng.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Lưu ý quan trọng
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Đây là ước tính dựa trên quy định BHXH Việt Nam hiện hành (2024-2025)</li>
          <li>• Lương hưu thực tế phụ thuộc vào lương bình quân của những năm cuối cùng đóng BHXH</li>
          <li>• Tuổi nghỉ hưu có thể thay đổi theo lộ trình tăng dần đến năm 2028 (nam) và 2035 (nữ)</li>
          <li>• Nam cần tối thiểu 15 năm đóng BHXH, nữ cần 15 năm để được hưởng lương hưu</li>
          <li>• Nghỉ hưu sớm: giảm 2% lương hưu cho mỗi năm nghỉ sớm (tối đa 5 năm)</li>
        </ul>
      </div>
    </div>
  );
}
