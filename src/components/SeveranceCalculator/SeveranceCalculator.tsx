'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculateSeveranceTax,
  getSeveranceTypes,
  getSeveranceServiceYears,
  estimateSeveranceAmount,
  estimateJobLossAmount,
  SeveranceType,
  SEVERANCE_TYPE_INFO,
} from '@/lib/severanceCalculator';
import { formatNumber } from '@/lib/taxCalculator';
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

// Số năm (cho phép số lẻ, 0–50); chuỗi rỗng = 0
const parseYears = (value: string) => parseFloat(value) || 0;

export function SeveranceCalculator({ tabState, onTabStateChange }: SeveranceCalculatorProps) {
  // Initialize state from tabState or defaults
  const [severanceType, setSeveranceType] = useState<SeveranceType>(tabState?.type ?? 'severance');
  const [totalAmount, setTotalAmount] = useState<number>(tabState?.totalAmount ?? 100_000_000);
  const [averageSalary, setAverageSalary] = useState<number>(tabState?.averageSalary ?? 20_000_000);
  const [yearsWorkedInput, setYearsWorkedInput] = useState<string>(
    tabState?.yearsWorked?.toString() ?? '5'
  );
  const [bhtnYearsInput, setBhtnYearsInput] = useState<string>(
    tabState?.unemploymentInsuranceYears?.toString() ?? '0'
  );
  const [paidYearsInput, setPaidYearsInput] = useState<string>(
    tabState?.paidYears?.toString() ?? '0'
  );

  const [totalAmountWarning, setTotalAmountWarning] = useState<string | null>(null);
  const [averageSalaryWarning, setAverageSalaryWarning] = useState<string | null>(null);
  const [showEstimator, setShowEstimator] = useState(false);

  // Get severance types for dropdown
  const severanceTypes = useMemo(() => getSeveranceTypes(), []);

  const currentTypeInfo = SEVERANCE_TYPE_INFO[severanceType];

  // Trợ cấp thôi việc, mất việc làm: có phần ước tính theo BLLĐ
  const isLaborAllowance = severanceType === 'severance' || severanceType === 'job_loss';

  const yearsWorked = parseYears(yearsWorkedInput);
  const bhtnYears = parseYears(bhtnYearsInput);
  const paidYears = parseYears(paidYearsInput);

  const result = useMemo(
    () => (totalAmount > 0 ? calculateSeveranceTax({ type: severanceType, totalAmount }) : null),
    [severanceType, totalAmount]
  );

  // Update parent state when local state changes
  const updateTabState = useCallback(() => {
    onTabStateChange?.({
      type: severanceType,
      totalAmount,
      averageSalary,
      yearsWorked,
      unemploymentInsuranceYears: bhtnYears,
      paidYears,
    });
  }, [severanceType, totalAmount, averageSalary, yearsWorked, bhtnYears, paidYears, onTabStateChange]);

  useEffect(() => {
    updateTabState();
  }, [updateTabState]);

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
    setTotalAmount(parsed.value);
    setTotalAmountWarning(buildWarning(parsed.issues, MAX));
  };

  const handleAverageSalaryChange = (value: string) => {
    const MAX = 1_000_000_000; // 1 tỷ
    const parsed = parseCurrencyInput(value, { max: MAX });
    setAverageSalary(parsed.value);
    setAverageSalaryWarning(buildWarning(parsed.issues, MAX));
  };

  const handleYearsChange = (value: string, setter: (v: string) => void) => {
    const num = parseFloat(value);
    if (value === '' || (!isNaN(num) && num >= 0 && num <= 50)) {
      setter(value);
    }
  };

  const serviceYears = getSeveranceServiceYears(yearsWorked, bhtnYears, paidYears);
  const estimatedSeverance = estimateSeveranceAmount(yearsWorked, averageSalary, bhtnYears, paidYears);
  const estimatedJobLoss = estimateJobLossAmount(yearsWorked, averageSalary, bhtnYears, paidYears);

  // Áp dụng số ước tính vào tổng tiền trợ cấp
  const handleEstimate = () => {
    setTotalAmount(severanceType === 'job_loss' ? estimatedJobLoss : estimatedSeverance);
  };

  const yearsFields: Array<{ label: string; tooltip: string; value: string; setter: (v: string) => void }> = [
    {
      label: 'Thời gian làm việc thực tế (năm)',
      tooltip: 'Tổng thời gian làm việc thực tế cho người sử dụng lao động, kể cả thử việc, thời gian nghỉ hưởng chế độ ốm đau, thai sản (VD: 5,5 năm)',
      value: yearsWorkedInput,
      setter: setYearsWorkedInput,
    },
    {
      label: 'Thời gian đã đóng BHTN (năm)',
      tooltip: 'Thời gian đã tham gia bảo hiểm thất nghiệp tại doanh nghiệp này: không được tính trợ cấp thôi việc, mất việc làm',
      value: bhtnYearsInput,
      setter: setBhtnYearsInput,
    },
    {
      label: 'Thời gian đã được chi trả trợ cấp (năm)',
      tooltip: 'Thời gian làm việc đã được doanh nghiệp trả trợ cấp thôi việc, mất việc làm trước đây',
      value: paidYearsInput,
      setter: setPaidYearsInput,
    },
  ];

  return (
    <div className="card">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Thuế trợ cấp thôi việc, BHXH một lần</h2>
        <p className="text-sm text-gray-500">Thuế TNCN đối với các khoản nhận khi nghỉ việc, nghỉ hưu (kỳ tính thuế 2026)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Thông tin khoản nhận</h3>

          {/* Severance Type */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Loại khoản</span>
              <Tooltip content="Chọn đúng loại để áp dụng quy định thuế phù hợp">
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
              <span>Tổng số tiền nhận (VNĐ)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={totalAmount > 0 ? formatNumber(totalAmount) : ''}
              onChange={(e) => handleTotalAmountChange(e.target.value)}
              className="input-field text-lg font-semibold"
              placeholder="0"
            />
            {totalAmountWarning && (
              <p className="text-xs text-amber-600 mt-1">{totalAmountWarning}</p>
            )}
          </div>

          {/* Ước tính trợ cấp theo BLLĐ (thôi việc, mất việc) */}
          {isLaborAllowance && (
            <>
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                  <span>Lương bình quân 6 tháng liền kề (VNĐ)</span>
                  <Tooltip content="Tiền lương bình quân theo hợp đồng lao động của 6 tháng liền kề trước khi nghỉ việc (NĐ 145/2020 Điều 8.5)">
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      <InfoIcon />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={averageSalary > 0 ? formatNumber(averageSalary) : ''}
                  onChange={(e) => handleAverageSalaryChange(e.target.value)}
                  className="input-field"
                  placeholder="0"
                />
                {averageSalaryWarning && (
                  <p className="text-xs text-amber-600 mt-1">{averageSalaryWarning}</p>
                )}
              </div>

              {yearsFields.map((field) => (
                <div key={field.label}>
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                    <span>{field.label}</span>
                    <Tooltip content={field.tooltip}>
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
                    value={field.value}
                    onChange={(e) => handleYearsChange(e.target.value, field.setter)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              ))}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowEstimator(!showEstimator)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    showEstimator
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ước tính trợ cấp theo BLLĐ
                </button>
              </div>
            </>
          )}
        </div>

        {/* Result Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Kết quả</h3>

          {result && (
            <>
              {/* Type Info */}
              <div className="rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
                <h4 className="font-semibold text-indigo-900 mb-1">{result.typeInfo.label}</h4>
                <p className="text-sm text-indigo-700">{result.typeInfo.description}</p>
              </div>

              {/* Calculation Steps */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-semibold text-gray-900">Chi tiết xác định</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {[result.calculation.step1, result.calculation.step2, result.calculation.step3].map((step, i) => (
                    <div key={i} className="p-2 bg-white rounded border border-gray-100">
                      <span className="text-xs font-medium text-gray-500 block mb-1">Bước {i + 1}</span>
                      <span className="text-gray-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <span className="text-xs text-blue-600 font-medium">Tổng số tiền nhận</span>
                  <div className="text-lg font-bold text-blue-800">
                    {formatNumber(result.totalAmount)}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <span className="text-xs text-green-600 font-medium">Không tính thuế</span>
                  <div className="text-lg font-bold text-green-800">
                    {formatNumber(result.taxExemptAmount)}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <span className="text-xs text-orange-600 font-medium">Tính vào thu nhập chịu thuế</span>
                  <div className="text-lg font-bold text-orange-800">
                    {formatNumber(result.taxableIncome)}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <span className="text-xs text-red-600 font-medium">Thuế TNCN</span>
                  <div className="text-lg font-bold text-red-800">
                    {result.typeInfo.taxable ? 'Theo biểu lũy tiến' : formatNumber(result.taxAmount)}
                  </div>
                </div>
              </div>

              {/* Net Amount */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-300">
                <h4 className="font-semibold text-green-900 mb-2">Số tiền nhận</h4>
                <div className="text-3xl font-bold text-green-700">
                  {formatNumber(result.netAmount)} VNĐ
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {result.typeInfo.taxable
                    ? 'Chưa trừ thuế TNCN (tính cùng tiền lương)'
                    : 'Không bị khấu trừ thuế TNCN'}
                </p>
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
              <p className="text-gray-500">Nhập số tiền để xem thuế TNCN</p>
            </div>
          )}
        </div>
      </div>

      {/* Estimator Section */}
      {showEstimator && isLaborAllowance && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Ước tính trợ cấp theo BLLĐ
          </h3>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm text-purple-800 mb-4">
              Thời gian tính trợ cấp: <strong>{serviceYears.toLocaleString('vi-VN')} năm</strong>{' '}
              (= làm việc thực tế − đã đóng BHTN − đã được chi trả; tháng lẻ đến 6 tháng tính 1/2 năm, trên 6 tháng tính 1 năm)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Trợ cấp thôi việc (Điều 46 BLLĐ)</h4>
                <p className="text-sm text-purple-700 mb-2">
                  = Thời gian tính trợ cấp × 1/2 tháng lương
                </p>
                <p className="text-lg font-bold text-purple-800">
                  ≈ {formatNumber(estimatedSeverance)} VNĐ
                </p>
              </div>
              <div>
                <h4 className="font-medium text-purple-900 mb-2">Trợ cấp mất việc làm (Điều 47 BLLĐ)</h4>
                <p className="text-sm text-purple-700 mb-2">
                  = Thời gian tính trợ cấp × 1 tháng lương, ít nhất 2 tháng lương
                </p>
                <p className="text-lg font-bold text-purple-800">
                  ≈ {formatNumber(estimatedJobLoss)} VNĐ
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
              * Chỉ áp dụng khi đã làm việc thường xuyên từ đủ 12 tháng (NĐ 145/2020/NĐ-CP Điều 8). Thời gian đóng
              BHTN được bù bằng trợ cấp thất nghiệp nên không tính trợ cấp thôi việc. Số thực tế có thể cao hơn theo
              hợp đồng lao động, thỏa ước lao động.
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
          <li>• <strong>Luật Thuế TNCN 109/2025/QH15</strong> Điều 3.2.c, Điều 4.9: trợ cấp thôi việc, mất việc làm, trợ cấp BHXH không tính thuế; miễn thuế thu nhập từ quỹ hưu trí tự nguyện</li>
          <li>• <strong>Nghị định 253/2026/NĐ-CP</strong> Điều 8.3.g, h và Điều 27.2</li>
          <li>• <strong>Bộ luật Lao động 2019</strong> Điều 46, 47; <strong>Nghị định 145/2020/NĐ-CP</strong> Điều 8: mức trợ cấp thôi việc, mất việc làm</li>
          <li>• <strong>Luật BHXH 2024</strong> Điều 70: điều kiện, mức hưởng BHXH một lần</li>
        </ul>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Không chịu thuế:</strong> trợ cấp thôi việc, mất việc làm theo luật, kể cả phần doanh nghiệp chi cao hơn
            nếu có trong quy chế, hợp đồng lao động, thỏa ước lao động; BHXH một lần; tiền rút từ quỹ hưu trí tự nguyện.
          </p>
          <p className="text-xs text-green-700 mt-1">
            Trước kỳ tính thuế 2026 (TT 111/2013/TT-BTC): trợ cấp thôi việc, mất việc làm theo BLLĐ không tính thuế,
            phần chi cao hơn mức luật định phải tính vào thu nhập chịu thuế.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SeveranceCalculator;
