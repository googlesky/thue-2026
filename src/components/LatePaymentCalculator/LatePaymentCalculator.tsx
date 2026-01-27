'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculateLatePayment,
  TAX_TYPES,
  TaxType,
  TaxTypeInfo,
  LatePaymentResult,
  generateInterestMilestones,
  getUpcomingDeadlines,
  INTEREST_RATE_PER_DAY,
  INTEREST_RATE_PER_YEAR,
  formatCurrency,
  formatPercent,
  formatDate,
} from '@/lib/latePaymentCalculator';
import { formatNumber, parseCurrency } from '@/lib/taxCalculator';
import { parseCurrencyInput, CurrencyInputIssues } from '@/utils/inputSanitizers';
import Tooltip from '@/components/ui/Tooltip';
import { LatePaymentTabState } from '@/lib/snapshotTypes';

interface LatePaymentCalculatorProps {
  tabState?: LatePaymentTabState;
  onTabStateChange?: (state: LatePaymentTabState) => void;
}

// Info icon component for tooltips
function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Format date for input element (YYYY-MM-DD)
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse date from input element
function parseDateFromInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export function LatePaymentCalculator({ tabState, onTabStateChange }: LatePaymentCalculatorProps) {
  // Initialize state from tabState or defaults
  const [taxType, setTaxType] = useState<TaxType>(tabState?.taxType ?? 'annual_pit');
  const [taxAmountInput, setTaxAmountInput] = useState<string>(
    tabState?.taxAmount?.toString() ?? '10000000'
  );
  const [dueDateInput, setDueDateInput] = useState<string>(
    tabState?.dueDate ?? formatDateForInput(new Date(new Date().getFullYear(), 2, 31)) // Default: 31/3
  );
  const [paymentDateInput, setPaymentDateInput] = useState<string>(
    tabState?.paymentDate ?? formatDateForInput(new Date())
  );
  const [taxAmountWarning, setTaxAmountWarning] = useState<string | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showDeadlines, setShowDeadlines] = useState(false);

  const [result, setResult] = useState<LatePaymentResult | null>(null);

  // Get tax type info
  const selectedTaxType = useMemo(() => {
    return TAX_TYPES.find(t => t.id === taxType) ?? TAX_TYPES[0];
  }, [taxType]);

  // Update parent state when local state changes
  const updateTabState = useCallback(() => {
    if (onTabStateChange) {
      onTabStateChange({
        taxType,
        taxAmount: parseCurrency(taxAmountInput),
        dueDate: dueDateInput,
        paymentDate: paymentDateInput,
      });
    }
  }, [taxType, taxAmountInput, dueDateInput, paymentDateInput, onTabStateChange]);

  // Calculate result when inputs change
  useEffect(() => {
    const taxAmount = parseCurrency(taxAmountInput);
    const dueDate = parseDateFromInput(dueDateInput);
    const paymentDate = parseDateFromInput(paymentDateInput);

    if (taxAmount > 0 && dueDate && paymentDate) {
      const calculated = calculateLatePayment({
        taxType,
        taxAmount,
        dueDate,
        paymentDate,
      });
      setResult(calculated);
    } else {
      setResult(null);
    }

    updateTabState();
  }, [taxType, taxAmountInput, dueDateInput, paymentDateInput, updateTabState]);

  // Handle tax type change - auto-update due date
  const handleTaxTypeChange = (newType: TaxType) => {
    setTaxType(newType);
    // Optionally update due date based on tax type
    // For now, keep the current due date
  };

  // Handle tax amount input
  const handleTaxAmountChange = (value: string) => {
    const MAX_TAX = 100_000_000_000; // 100 tỷ
    const parsed = parseCurrencyInput(value, { max: MAX_TAX });
    setTaxAmountInput(parsed.value.toString());
    setTaxAmountWarning(buildWarning(parsed.issues, MAX_TAX));
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

  // Generate milestones for current tax amount
  const milestones = useMemo(() => {
    const amount = parseCurrency(taxAmountInput);
    return amount > 0 ? generateInterestMilestones(amount) : [];
  }, [taxAmountInput]);

  // Get upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    return getUpcomingDeadlines();
  }, []);

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl">⏰</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tính lãi chậm nộp thuế</h2>
          <p className="text-sm text-gray-500">Lãi suất 0.03%/ngày theo Luật Quản lý thuế 2019</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Thông tin nộp thuế</h3>

          {/* Tax Type */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Loại thuế</span>
              <Tooltip content="Chọn loại thuế để xem deadline mặc định">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <select
              value={taxType}
              onChange={(e) => handleTaxTypeChange(e.target.value as TaxType)}
              className="input-field"
            >
              {TAX_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedTaxType.defaultDeadlineDescription}
            </p>
          </div>

          {/* Tax Amount */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Số tiền thuế phải nộp (VNĐ)</span>
              <Tooltip content="Số tiền thuế gốc chưa bao gồm lãi chậm nộp">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              type="text"
              value={formatNumber(parseCurrency(taxAmountInput))}
              onChange={(e) => handleTaxAmountChange(e.target.value)}
              className="input-field text-lg font-semibold"
              placeholder="Nhập số tiền thuế"
            />
            {taxAmountWarning && (
              <p className="text-xs text-amber-600 mt-1">{taxAmountWarning}</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Ngày hết hạn nộp</span>
              <Tooltip content="Ngày cuối cùng phải nộp thuế theo quy định">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              type="date"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
              <span>Ngày dự kiến nộp</span>
              <Tooltip content="Ngày bạn dự định nộp thuế (hoặc ngày đã nộp thực tế)">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              type="date"
              value={paymentDateInput}
              onChange={(e) => setPaymentDateInput(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowMilestones(!showMilestones)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showMilestones
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Bảng lãi theo thời gian
            </button>
            <button
              onClick={() => setShowDeadlines(!showDeadlines)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showDeadlines
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📅 Deadline sắp tới
            </button>
          </div>
        </div>

        {/* Result Section */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Kết quả tính toán</h3>

          {result && (
            <>
              {/* Status Badge */}
              <div className={`rounded-lg p-4 border ${
                result.isLate
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.isLate ? (
                    <>
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h4 className="font-semibold text-red-900">Chậm nộp thuế</h4>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h4 className="font-semibold text-green-900">Nộp đúng hạn</h4>
                    </>
                  )}
                </div>
                <p className={`text-sm ${result.isLate ? 'text-red-700' : 'text-green-700'}`}>
                  {result.isLate
                    ? `Chậm ${result.daysLate} ngày so với deadline`
                    : 'Không phát sinh lãi chậm nộp'
                  }
                </p>
              </div>

              {/* Calculation Details */}
              {result.isLate && (
                <>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <h4 className="font-semibold text-orange-900">Chi tiết tính lãi</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Số tiền thuế gốc:</span>
                        <span className="font-medium">{formatCurrency(result.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Số ngày chậm:</span>
                        <span className="font-semibold text-orange-700">{result.daysLate} ngày</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lãi suất:</span>
                        <span className="font-medium">{formatPercent(result.interestRatePerDay)}/ngày</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lãi mỗi ngày:</span>
                        <span className="font-medium">{formatCurrency(result.dailyInterest)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-orange-200">
                        <span className="text-gray-700 font-medium">Tiền lãi phải trả:</span>
                        <span className="font-bold text-orange-700">{formatCurrency(result.interestAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 border-2 border-red-300">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h4 className="font-semibold text-red-900">Tổng tiền phải nộp</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold text-red-700">
                        {formatCurrency(result.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-600">
                        = {formatCurrency(result.taxAmount)} (thuế) + {formatCurrency(result.interestAmount)} (lãi)
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Warning */}
              {result.warning && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-amber-800">{result.warning}</p>
                  </div>
                </div>
              )}

              {/* Legal Note */}
              {result.legalNote && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-blue-800">{result.legalNote}</p>
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
              <p className="text-gray-500">Nhập thông tin để tính lãi chậm nộp</p>
            </div>
          )}
        </div>
      </div>

      {/* Milestones Table */}
      {showMilestones && milestones.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Bảng lãi chậm nộp theo thời gian
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Thời gian chậm</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Số ngày</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Tỷ lệ lãi</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Tiền lãi</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Tổng phải nộp</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m, i) => (
                  <tr key={m.days} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-gray-800">{m.label}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{m.days}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{formatPercent(m.interestPercent)}</td>
                    <td className="px-4 py-2 text-right text-orange-600 font-medium">
                      {formatCurrency(m.interestAmount)}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold">
                      {formatCurrency(m.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Bảng tính dựa trên số tiền thuế: {formatCurrency(parseCurrency(taxAmountInput))}
          </p>
        </div>
      )}

      {/* Upcoming Deadlines */}
      {showDeadlines && upcomingDeadlines.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Deadline thuế sắp tới
          </h3>
          <div className="space-y-3">
            {upcomingDeadlines.map((deadline, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
              >
                <div>
                  <h4 className="font-medium text-blue-900">{deadline.name}</h4>
                  <p className="text-sm text-blue-700">{deadline.description}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-800">{formatDate(deadline.date)}</div>
                  <button
                    onClick={() => setDueDateInput(formatDateForInput(deadline.date))}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            ))}
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
          <li>• <strong>Điều 59 Luật Quản lý thuế 2019</strong>: Lãi chậm nộp = 0.03%/ngày</li>
          <li>• <strong>Nghị định 125/2020/NĐ-CP</strong>: Xử phạt vi phạm hành chính về thuế</li>
          <li>• <strong>Thông tư 80/2021/TT-BTC</strong>: Hướng dẫn thi hành Luật Quản lý thuế</li>
        </ul>
        <div className="mt-3 p-3 bg-amber-50 rounded border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Lưu ý:</strong> Ngoài tiền lãi, việc chậm nộp thuế có thể bị xử phạt hành chính
            từ 500.000 VNĐ đến 3 lần số tiền thuế trốn (nếu có hành vi trốn thuế).
          </p>
        </div>
      </div>
    </div>
  );
}

export default LatePaymentCalculator;
