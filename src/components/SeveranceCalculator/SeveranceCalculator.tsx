'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculateSeveranceTax,
  getSeveranceTypes,
  estimateSeveranceAmount,
  estimateJobLossAmount,
  SeveranceType,
  SeveranceResult,
  SEVERANCE_TYPE_INFO,
} from '@/lib/severanceCalculator';
import { formatNumber, parseCurrency } from '@/lib/taxCalculator';
import { parseCurrencyInput, CurrencyInputIssues } from '@/utils/inputSanitizers';
import Tooltip from '@/components/ui/Tooltip';
import { SeveranceTabState } from '@/lib/snapshotTypes';

interface SeveranceCalculatorProps {
  tabState?: SeveranceTabState;
  onTabStateChange?: (state: SeveranceTabState) => void;
}

// Info icon component for tooltips
function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function SeveranceCalculator({ tabState, onTabStateChange }: SeveranceCalculatorProps) {
  // Initialize state from tabState or defaults
  const [severanceType, setSeveranceType] = useState<SeveranceType>(
    tabState?.type ?? 'severance'
  );
  const [totalAmountInput, setTotalAmountInput] = useState<string>(
    tabState?.totalAmount?.toString() ?? '100000000'
  );
  const [averageSalaryInput, setAverageSalaryInput] = useState<string>(
    tabState?.averageSalary?.toString() ?? '20000000'
  );
  const [yearsWorkedInput, setYearsWorkedInput] = useState<string>(
    tabState?.yearsWorked?.toString() ?? '5'
  );
  const [contributionAmountInput, setContributionAmountInput] = useState<string>(
    tabState?.contributionAmount?.toString() ?? '0'
  );

  const [totalAmountWarning, setTotalAmountWarning] = useState<string | null>(null);
  const [averageSalaryWarning, setAverageSalaryWarning] = useState<string | null>(null);
  const [contributionWarning, setContributionWarning] = useState<string | null>(null);
  const [showEstimator, setShowEstimator] = useState(false);

  const [result, setResult] = useState<SeveranceResult | null>(null);

  // Get severance types for dropdown
  const severanceTypes = useMemo(() => getSeveranceTypes(), []);

  // Get current type info
  const currentTypeInfo = useMemo(() => SEVERANCE_TYPE_INFO[severanceType], [severanceType]);

  // Check if this is a voluntary pension type
  const isVoluntaryPension = severanceType === 'voluntary_pension_lump_sum';

  // Update parent state when local state changes
  const updateTabState = useCallback(() => {
    if (onTabStateChange) {
      onTabStateChange({
        type: severanceType,
        totalAmount: parseCurrency(totalAmountInput),
        averageSalary: parseCurrency(averageSalaryInput),
        yearsWorked: parseFloat(yearsWorkedInput) || 0,
        contributionAmount: parseCurrency(contributionAmountInput),
      });
    }
  }, [severanceType, totalAmountInput, averageSalaryInput, yearsWorkedInput, contributionAmountInput, onTabStateChange]);

  // Calculate result when inputs change
  useEffect(() => {
    const totalAmount = parseCurrency(totalAmountInput);
    const averageSalary = parseCurrency(averageSalaryInput);
    const yearsWorked = parseFloat(yearsWorkedInput) || 0;
    const contributionAmount = parseCurrency(contributionAmountInput);

    if (totalAmount > 0) {
      const calculated = calculateSeveranceTax({
        type: severanceType,
        totalAmount,
        averageSalary,
        yearsWorked,
        contributionAmount,
      });
      setResult(calculated);
    } else {
      setResult(null);
    }

    updateTabState();
  }, [severanceType, totalAmountInput, averageSalaryInput, yearsWorkedInput, contributionAmountInput, updateTabState]);

  // Build warning message from issues
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

  // Handle input changes
  const handleTotalAmountChange = (value: string) => {
    const MAX = 100_000_000_000; // 100 tỷ
    const parsed = parseCurrencyInput(value, { max: MAX });
    setTotalAmountInput(parsed.value.toString());
    setTotalAmountWarning(buildWarning(parsed.issues, MAX));
  };

  const handleAverageSalaryChange = (value: string) => {
    const MAX = 1_000_000_000; // 1 tỷ
    const parsed = parseCurrencyInput(value, { max: MAX });
    setAverageSalaryInput(parsed.value.toString());
    setAverageSalaryWarning(buildWarning(parsed.issues, MAX));
  };

  const handleContributionAmountChange = (value: string) => {
    const MAX = 100_000_000_000; // 100 tỷ
    const parsed = parseCurrencyInput(value, { max: MAX });
    setContributionAmountInput(parsed.value.toString());
    setContributionWarning(buildWarning(parsed.issues, MAX));
  };

  const handleYearsWorkedChange = (value: string) => {
    // Allow only positive numbers and decimals
    const num = parseFloat(value);
    if (value === '' || (!isNaN(num) && num >= 0 && num <= 50)) {
      setYearsWorkedInput(value);
    }
  };

  // Estimate severance/job loss amount based on years and salary
  const handleEstimate = () => {
    const averageSalary = parseCurrency(averageSalaryInput);
    const yearsWorked = parseFloat(yearsWorkedInput) || 0;

    if (averageSalary <= 0 || yearsWorked <= 0) return;

    let estimated: number;
    if (severanceType === 'job_loss') {
      estimated = estimateJobLossAmount(yearsWorked, averageSalary);
    } else {
      estimated = estimateSeveranceAmount(yearsWorked, averageSalary);
    }

    setTotalAmountInput(estimated.toString());
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl">💼</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Thuế trợ cấp thôi việc, BHXH một lần</h2>
          <p className="text-sm text-gray-500">Tính thuế TNCN cho các khoản trợ cấp khi nghỉ việc</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Thông tin trợ cấp</h3>

          {/* Severance Type */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Loại trợ cấp</span>
              <Tooltip content="Chọn loại trợ cấp để áp dụng quy định tính thuế phù hợp">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <select
              value={severanceType}
              onChange={(e) => setSeveranceType(e.target.value as SeveranceType)}
              className="input-field"
            >
              {severanceTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {currentTypeInfo.description}
            </p>
          </div>

          {/* Total Amount */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Tổng số tiền trợ cấp (VNĐ)</span>
              <Tooltip content={isVoluntaryPension
                ? "Tổng số tiền rút từ quỹ hưu trí tự nguyện"
                : "Tổng số tiền trợ cấp bạn nhận được"}>
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(parseCurrency(totalAmountInput))}
              onChange={(e) => handleTotalAmountChange(e.target.value)}
              className="input-field text-lg font-semibold"
              placeholder="Nhập số tiền trợ cấp"
            />
            {totalAmountWarning && (
              <p className="text-xs text-amber-600 mt-1">{totalAmountWarning}</p>
            )}
          </div>

          {/* Show different fields based on type */}
          {isVoluntaryPension ? (
            /* Voluntary Pension: Show contribution amount */
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Số tiền đã đóng góp (VNĐ)</span>
                <Tooltip content="Tổng số tiền bạn đã đóng vào quỹ hưu trí (không tính lãi)">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumber(parseCurrency(contributionAmountInput))}
                onChange={(e) => handleContributionAmountChange(e.target.value)}
                className="input-field"
                placeholder="Nhập số tiền đã đóng"
              />
              {contributionWarning && (
                <p className="text-xs text-amber-600 mt-1">{contributionWarning}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Phần lãi/lợi nhuận = Tổng rút - Số đã đóng
              </p>
            </div>
          ) : (
            /* Other types: Show average salary and years worked */
            <>
              {/* Average Salary */}
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                  <span>Lương bình quân 6 tháng cuối (VNĐ)</span>
                  <Tooltip content="Lương bình quân 6 tháng cuối trước khi nghỉ việc. Dùng để tính mức miễn thuế.">
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      <InfoIcon />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(parseCurrency(averageSalaryInput))}
                  onChange={(e) => handleAverageSalaryChange(e.target.value)}
                  className="input-field"
                  placeholder="Nhập lương bình quân"
                />
                {averageSalaryWarning && (
                  <p className="text-xs text-amber-600 mt-1">{averageSalaryWarning}</p>
                )}
              </div>

              {/* Years Worked */}
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                  <span>Số năm làm việc</span>
                  <Tooltip content="Số năm làm việc tại công ty (dùng để ước tính trợ cấp)">
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      <InfoIcon />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="50"
                  step="0.5"
                  value={yearsWorkedInput}
                  onChange={(e) => handleYearsWorkedChange(e.target.value)}
                  className="input-field"
                  placeholder="Nhập số năm"
                />
              </div>

              {/* Estimator Toggle */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowEstimator(!showEstimator)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    showEstimator
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🧮 Ước tính trợ cấp
                </button>
              </div>
            </>
          )}
        </div>

        {/* Result Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Kết quả tính thuế</h3>

          {result && (
            <>
              {/* Type Info Badge */}
              <div className="rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💼</span>
                  <h4 className="font-semibold text-indigo-900">{result.typeInfo.label}</h4>
                </div>
                <p className="text-sm text-indigo-700">{result.typeInfo.description}</p>
              </div>

              {/* Calculation Steps */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-semibold text-gray-900">Chi tiết tính toán</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-white rounded border border-gray-100">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Bước 1</span>
                    <span className="text-gray-700">{result.calculation.step1}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-100">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Bước 2</span>
                    <span className="text-gray-700">{result.calculation.step2}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-100">
                    <span className="text-xs font-medium text-gray-500 block mb-1">Bước 3</span>
                    <span className="text-gray-700">{result.calculation.step3}</span>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <span className="text-xs text-blue-600 font-medium">Tổng trợ cấp</span>
                  <div className="text-lg font-bold text-blue-800">
                    {formatNumber(result.totalAmount)}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <span className="text-xs text-green-600 font-medium">Được miễn thuế</span>
                  <div className="text-lg font-bold text-green-800">
                    {formatNumber(result.taxExemptAmount)}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <span className="text-xs text-orange-600 font-medium">Chịu thuế</span>
                  <div className="text-lg font-bold text-orange-800">
                    {formatNumber(result.taxableIncome)}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <span className="text-xs text-red-600 font-medium">Thuế TNCN (10%)</span>
                  <div className="text-lg font-bold text-red-800">
                    {formatNumber(result.taxAmount)}
                  </div>
                </div>
              </div>

              {/* Net Amount */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-300">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="font-semibold text-green-900">Số tiền thực nhận</h4>
                </div>
                <div className="text-3xl font-bold text-green-700">
                  {formatNumber(result.netAmount)} VNĐ
                </div>
                {result.effectiveRate > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    Thuế suất thực tế: {result.effectiveRate.toFixed(2)}%
                  </p>
                )}
              </div>

              {/* Notes */}
              {result.notes.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800 space-y-1">
                      {result.notes.map((note, i) => (
                        <p key={i}>{note}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!result && (
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">Nhập thông tin để tính thuế trợ cấp</p>
            </div>
          )}
        </div>
      </div>

      {/* Estimator Section */}
      {showEstimator && !isVoluntaryPension && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Ước tính trợ cấp theo BLLĐ
          </h3>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Trợ cấp thôi việc (Điều 46 BLLĐ)</h4>
                <p className="text-sm text-purple-700 mb-2">
                  = Số năm làm việc × 1/2 tháng lương
                </p>
                <p className="text-lg font-bold text-purple-800">
                  ≈ {formatNumber(estimateSeveranceAmount(parseFloat(yearsWorkedInput) || 0, parseCurrency(averageSalaryInput)))} VNĐ
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Trợ cấp mất việc (Điều 47 BLLĐ)</h4>
                <p className="text-sm text-purple-700 mb-2">
                  = Số năm làm việc × 1 tháng lương (tối thiểu 2 tháng)
                </p>
                <p className="text-lg font-bold text-purple-800">
                  ≈ {formatNumber(estimateJobLossAmount(parseFloat(yearsWorkedInput) || 0, parseCurrency(averageSalaryInput)))} VNĐ
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  handleEstimate();
                  setShowEstimator(false);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Áp dụng ước tính {severanceType === 'job_loss' ? 'mất việc' : 'thôi việc'}
              </button>
            </div>
            <p className="text-xs text-purple-600 mt-3">
              * Số liệu ước tính theo quy định BLLĐ. Số thực tế có thể khác tùy theo hợp đồng lao động và thỏa thuận.
            </p>
          </div>
        </div>
      )}

      {/* Legal Info */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Căn cứ pháp lý
        </h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Điều 8 Thông tư 111/2013/TT-BTC</strong>: Thuế TNCN từ trợ cấp thôi việc</li>
          <li>• <strong>Điều 46, 47 Bộ luật Lao động 2019</strong>: Trợ cấp thôi việc, mất việc</li>
          <li>• <strong>Điều 14 Luật Thuế TNCN sửa đổi 2024</strong>: Thuế từ quỹ hưu trí tự nguyện</li>
          <li>• <strong>Luật BHXH 2024</strong>: Quy định về BHXH một lần</li>
        </ul>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Mức miễn thuế:</strong> Trợ cấp thôi việc được miễn thuế nếu không vượt quá
            10 lần lương bình quân 6 tháng cuối. Phần vượt quá chịu thuế 10%.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SeveranceCalculator;
