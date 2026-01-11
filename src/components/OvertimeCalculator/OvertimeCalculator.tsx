'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  SharedTaxState,
  formatNumber,
  formatCurrency,
  DEFAULT_INSURANCE_OPTIONS,
  isCurrentlyIn2026,
} from '@/lib/taxCalculator';
import { CurrencyInputIssues, MAX_MONTHLY_INCOME, parseCurrencyInput } from '@/utils/inputSanitizers';
import {
  calculateOvertime,
  OvertimeEntry,
  OvertimeType,
  ShiftType,
  generateEntryId,
  getOvertimeTypeLabel,
  getShiftTypeLabel,
  getOvertimeRate,
  calculateHourlyRate,
  OVERTIME_RATES,
  DEFAULT_WORKING_DAYS,
  DEFAULT_HOURS_PER_DAY,
} from '@/lib/overtimeCalculator';
import { OvertimeTabState, DEFAULT_OVERTIME_STATE } from '@/lib/snapshotTypes';
import Tooltip from '@/components/ui/Tooltip';

interface OvertimeCalculatorProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
  tabState?: OvertimeTabState;
  onTabStateChange?: (state: OvertimeTabState) => void;
}

export default function OvertimeCalculator({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: OvertimeCalculatorProps) {
  const isLocalChange = useRef(false);

  // Local state
  const [monthlySalary, setMonthlySalary] = useState(
    tabState?.monthlySalary ?? sharedState?.grossIncome ?? 0
  );
  const [workingDays, setWorkingDays] = useState(
    tabState?.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS
  );
  const [hoursPerDay, setHoursPerDay] = useState(
    tabState?.hoursPerDay ?? DEFAULT_HOURS_PER_DAY
  );
  const [entries, setEntries] = useState<OvertimeEntry[]>(tabState?.entries ?? []);
  const [includeHolidayBasePay, setIncludeHolidayBasePay] = useState(
    tabState?.includeHolidayBasePay ?? true
  );
  const [salaryWarning, setSalaryWarning] = useState<string | null>(null);
  // Auto-detect based on current date (if in 2026, default to new law)
  const [useNewLaw, setUseNewLaw] = useState(() => tabState?.useNewLaw ?? isCurrentlyIn2026());

  // Sync from shared state (grossIncome)
  useEffect(() => {
    if (sharedState && !isLocalChange.current) {
      // Only sync if monthlySalary is 0 (not yet set)
      if (monthlySalary === 0 && sharedState.grossIncome > 0) {
        setMonthlySalary(sharedState.grossIncome);
      }
    }
    isLocalChange.current = false;
  }, [sharedState, monthlySalary]);

  // Sync from tab state
  useEffect(() => {
    if (tabState) {
      setMonthlySalary(tabState.monthlySalary);
      setWorkingDays(tabState.workingDaysPerMonth);
      setHoursPerDay(tabState.hoursPerDay);
      setEntries(tabState.entries);
      setIncludeHolidayBasePay(tabState.includeHolidayBasePay);
      setUseNewLaw(tabState.useNewLaw);
    }
  }, [tabState]);

  // Notify parent of tab state changes
  const updateTabState = useCallback(
    (updates: Partial<OvertimeTabState>) => {
      onTabStateChange?.({
        monthlySalary,
        workingDaysPerMonth: workingDays,
        hoursPerDay,
        entries,
        includeHolidayBasePay,
        useNewLaw,
        ...updates,
      });
    },
    [monthlySalary, workingDays, hoursPerDay, entries, includeHolidayBasePay, useNewLaw, onTabStateChange]
  );

  // Handle salary change
  const handleSalaryChange = (value: string) => {
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    const numValue = parsed.value;
    setSalaryWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
    isLocalChange.current = true;
    setMonthlySalary(numValue);
    updateTabState({ monthlySalary: numValue });
    // Also update shared state
    onStateChange?.({ grossIncome: numValue });
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

  // Add new overtime entry
  const addEntry = (type: OvertimeType, shift: ShiftType = 'day') => {
    const newEntry: OvertimeEntry = {
      id: generateEntryId(),
      type,
      shift,
      hours: type === 'weekday' ? 2 : 8,
    };
    const newEntries = [...entries, newEntry];
    setEntries(newEntries);
    updateTabState({ entries: newEntries });
  };

  // Update entry
  const updateEntry = (id: string, updates: Partial<OvertimeEntry>) => {
    const newEntries = entries.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    );
    setEntries(newEntries);
    updateTabState({ entries: newEntries });
  };

  // Remove entry
  const removeEntry = (id: string) => {
    const newEntries = entries.filter((e) => e.id !== id);
    setEntries(newEntries);
    updateTabState({ entries: newEntries });
  };

  // Calculate result
  const result = useMemo(() => {
    if (monthlySalary <= 0) return null;

    return calculateOvertime({
      monthlySalary,
      workingDaysPerMonth: workingDays,
      hoursPerDay,
      entries,
      includeHolidayBasePay,
      dependents: sharedState?.dependents ?? 0,
      otherDeductions: sharedState?.otherDeductions ?? 0,
      hasInsurance: sharedState?.hasInsurance ?? true,
      insuranceOptions: sharedState?.insuranceOptions ?? DEFAULT_INSURANCE_OPTIONS,
      region: sharedState?.region ?? 1,
      useNewLaw,
    });
  }, [
    monthlySalary,
    workingDays,
    hoursPerDay,
    entries,
    includeHolidayBasePay,
    sharedState,
    useNewLaw,
  ]);

  const hourlyRate = calculateHourlyRate(monthlySalary, workingDays, hoursPerDay);

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl">⏰</span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">Tính lương tăng ca</h2>
          <p className="text-sm text-gray-500">Tính thu nhập và thuế từ làm thêm giờ</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Luật thuế:</span>
          <button
            onClick={() => {
              setUseNewLaw(!useNewLaw);
              updateTabState({ useNewLaw: !useNewLaw });
            }}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              useNewLaw
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {useNewLaw ? 'Mới 2026' : 'Hiện hành'}
          </button>
        </div>
      </div>

      {/* Sync indicator */}
      {sharedState && (
        <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Số người phụ thuộc và bảo hiểm được đồng bộ từ các tab khác
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column - Inputs */}
        <div className="space-y-4">
          {/* Monthly Salary */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              Lương cơ bản/tháng
              <Tooltip content="Lương tháng dùng để tính lương giờ cơ bản">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                type="text"
                value={monthlySalary > 0 ? formatNumber(monthlySalary) : ''}
                onChange={(e) => handleSalaryChange(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                VND
              </span>
            </div>
            {salaryWarning && (
              <p className="text-xs text-amber-600 mt-2">{salaryWarning}</p>
            )}
            {hourlyRate > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Lương giờ: {formatNumber(hourlyRate)} VND/giờ
              </p>
            )}
          </div>

          {/* Working days and hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                Số ngày làm việc/tháng
                <Tooltip content="Thường là 22-26 ngày tùy theo công ty">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </Tooltip>
              </label>
              <input
                type="number"
                value={workingDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || DEFAULT_WORKING_DAYS;
                  setWorkingDays(val);
                  updateTabState({ workingDaysPerMonth: val });
                }}
                min={20}
                max={31}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                Số giờ làm việc/ngày
                <Tooltip content="Thường là 8 giờ theo quy định">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </Tooltip>
              </label>
              <input
                type="number"
                value={hoursPerDay}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || DEFAULT_HOURS_PER_DAY;
                  setHoursPerDay(val);
                  updateTabState({ hoursPerDay: val });
                }}
                min={4}
                max={12}
                step={0.5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Quick add buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thêm giờ tăng ca
            </label>
            <div className="flex flex-wrap gap-2">
              <Tooltip content="Tăng ca ngoài giờ hành chính (150% lương giờ)">
                <button
                  onClick={() => addEntry('weekday', 'day')}
                  className="px-3 py-2.5 sm:py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  + Ngày thường
                </button>
              </Tooltip>
              <Tooltip content="Làm việc thứ 7, Chủ nhật (200% lương giờ)">
                <button
                  onClick={() => addEntry('weekend', 'day')}
                  className="px-3 py-2.5 sm:py-1.5 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  + Cuối tuần
                </button>
              </Tooltip>
              <Tooltip content="Làm việc ngày lễ, tết (300% lương giờ + lương ngày nếu được chọn)">
                <button
                  onClick={() => addEntry('holiday', 'day')}
                  className="px-3 py-2.5 sm:py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  + Ngày lễ
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Overtime entries */}
          {entries.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Danh sách tăng ca ({entries.length})
              </label>
              {entries.map((entry) => (
                <OvertimeEntryCard
                  key={entry.id}
                  entry={entry}
                  hourlyRate={hourlyRate}
                  onUpdate={(updates) => updateEntry(entry.id, updates)}
                  onRemove={() => removeEntry(entry.id)}
                />
              ))}
            </div>
          )}

          {entries.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có lịch tăng ca</h3>
              <p className="text-gray-500">Thêm ca làm thêm để tính thu nhập</p>
            </div>
          )}

          {/* Holiday base pay option */}
          {entries.some((e) => e.type === 'holiday') && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeHolidayBasePay}
                onChange={(e) => {
                  setIncludeHolidayBasePay(e.target.checked);
                  updateTabState({ includeHolidayBasePay: e.target.checked });
                }}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700 flex items-center gap-2">
                Bao gồm lương ngày lễ
                <Tooltip content="Ngày lễ được nghỉ có lương, nếu đi làm thêm được 300% + 100% = 400%">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </Tooltip>
              </span>
            </label>
          )}
        </div>

        {/* Right column - Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Total income card */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
                <div className="text-sm opacity-90 mb-1">Tổng thu nhập</div>
                <div className="text-3xl font-bold">
                  {formatCurrency(result.totalGrossIncome)}
                </div>
              </div>
              {entries.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  Chưa có giờ tăng ca. Kết quả hiện tại chỉ tính lương cơ bản.
                </div>
              )}

              {/* Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-800">Chi tiết</h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lương cơ bản</span>
                    <span className="font-medium">{formatCurrency(result.regularMonthlyPay)}</span>
                  </div>

                  {result.totalOvertimeGross > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Lương tăng ca ({result.totalOvertimeHours}h)
                        </span>
                        <span className="font-medium text-blue-600">
                          +{formatCurrency(result.totalOvertimeGross)}
                        </span>
                      </div>
                      <div className="ml-4 text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>- Phần miễn thuế</span>
                          <span className="text-green-600">
                            {formatCurrency(result.totalTaxExemptOvertime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Phần chịu thuế</span>
                          <span>{formatCurrency(result.totalTaxableOvertime)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {result.holidayBasePay > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lương ngày lễ ({result.holidayHours}h)</span>
                      <span className="font-medium text-orange-600">
                        +{formatCurrency(result.holidayBasePay)}
                      </span>
                    </div>
                  )}

                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bảo hiểm (10.5%)</span>
                      <span className="text-red-600">-{formatCurrency(result.insuranceAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thuế TNCN</span>
                      <span className="text-red-600">-{formatCurrency(result.taxAmount)}</span>
                    </div>
                  </div>

                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-800">Thực nhận</span>
                      <span className="text-green-600">{formatCurrency(result.netIncome)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      {result.warnings.map((w, i) => (
                        <p key={i}>{w}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tax exemption info */}
              {result.taxExemptPercentage > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm text-green-800">
                      <p className="font-medium">
                        {result.taxExemptPercentage.toFixed(1)}% lương tăng ca được miễn thuế
                      </p>
                      <p className="text-xs mt-1 opacity-75">
                        Theo Thông tư 111/2013/TT-BTC
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <p>Nhập lương tháng để tính toán</p>
            </div>
          )}
        </div>
      </div>

      {/* Rate reference table */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">Bảng hệ số tăng ca (Điều 98, BLLĐ 2019)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="pb-2">Loại</th>
                <th className="pb-2 text-center">Ca ngày</th>
                <th className="pb-2 text-center">Ca đêm (22h-6h)</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              <tr>
                <td className="py-1">Ngày thường</td>
                <td className="py-1 text-center font-medium">150%</td>
                <td className="py-1 text-center font-medium">210%</td>
              </tr>
              <tr>
                <td className="py-1">Ngày nghỉ tuần</td>
                <td className="py-1 text-center font-medium">200%</td>
                <td className="py-1 text-center font-medium">270%</td>
              </tr>
              <tr>
                <td className="py-1">Ngày lễ, Tết</td>
                <td className="py-1 text-center font-medium">300%</td>
                <td className="py-1 text-center font-medium">390%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          * Ca đêm = Hệ số ngày + 30% phụ cấp đêm + 20% tăng ca đêm
        </p>
      </div>
    </div>
  );
}

// Overtime Entry Card Component
interface OvertimeEntryCardProps {
  entry: OvertimeEntry;
  hourlyRate: number;
  onUpdate: (updates: Partial<OvertimeEntry>) => void;
  onRemove: () => void;
}

function OvertimeEntryCard({ entry, hourlyRate, onUpdate, onRemove }: OvertimeEntryCardProps) {
  const rate = getOvertimeRate(entry.type, entry.shift);
  const amount = hourlyRate * rate * entry.hours;

  const typeColors: Record<OvertimeType, string> = {
    weekday: 'border-blue-200 bg-blue-50',
    weekend: 'border-orange-200 bg-orange-50',
    holiday: 'border-red-200 bg-red-50',
  };

  return (
    <div className={`border rounded-lg p-3 ${typeColors[entry.type]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm">{getOvertimeTypeLabel(entry.type)}</span>
            <span className="text-xs px-2 py-0.5 bg-white rounded-full">
              {(rate * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Shift toggle */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => onUpdate({ shift: 'day' })}
                className={`px-2 py-1 rounded ${
                  entry.shift === 'day'
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                Ca ngày
              </button>
              <button
                onClick={() => onUpdate({ shift: 'night' })}
                className={`px-2 py-1 rounded ${
                  entry.shift === 'night'
                    ? 'bg-white shadow-sm font-medium'
                    : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                Ca đêm
              </button>
            </div>

            {/* Hours input */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={entry.hours}
                onChange={(e) => onUpdate({ hours: Math.max(0.5, parseFloat(e.target.value) || 0) })}
                min={0.5}
                max={12}
                step={0.5}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-xs text-gray-500">giờ</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-medium text-sm">{formatCurrency(amount)}</div>
          <button
            onClick={onRemove}
            className="text-xs text-red-600 hover:text-red-800 mt-1"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
