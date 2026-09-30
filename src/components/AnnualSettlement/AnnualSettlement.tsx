"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  SharedTaxState,
  formatNumber,
  formatCurrency,
  formatDate,
  DEFAULT_INSURANCE_OPTIONS,
  CASUAL_INCOME_NO_SETTLEMENT_LIMIT,
  DEPENDENT_INCOME_LIMIT,
  RegionType,
  InsuranceOptions,
} from "@/lib/taxCalculator";
import {
  CurrencyInputIssues,
  MAX_MONTHLY_INCOME,
  parseCurrencyInput,
} from "@/utils/inputSanitizers";
import {
  SettlementYear,
  MonthlyIncomeEntry,
  DependentInfo,
  AnnualSettlementResult,
  calculateAnnualSettlement,
  createDefaultMonthlyIncome,
  generateDependentId,
  estimateMonthlyTax,
  getLawForMonth,
  getAnnualPensionCap,
  MEDICAL_DEDUCTION_CAP,
  EDUCATION_DEDUCTION_CAP,
} from "@/lib/annualSettlementCalculator";
import { AnnualSettlementTabState } from "@/lib/snapshotTypes";
import { annualDeadline, HOLIDAYS_OFFICIAL_UNTIL } from "@/lib/taxDeadlines";
import { getInsuranceDetailed } from "@/lib/taxCalculator";
import Tooltip from "@/components/ui/Tooltip";

interface AnnualSettlementProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
  tabState?: AnnualSettlementTabState;
  onTabStateChange?: (state: AnnualSettlementTabState) => void;
}

const MONTH_NAMES = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

const FULL_MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

// Info icon component for tooltips
function InfoIcon() {
  return (
    <span className="inline-flex items-center justify-center w-[44px] h-[44px] -m-3 text-gray-500 hover:text-gray-700 cursor-help rounded-full hover:bg-gray-100 transition-colors">
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </span>
  );
}

export default function AnnualSettlement({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: AnnualSettlementProps) {
  const isLocalChange = useRef(false);

  // Local state
  const [year, setYear] = useState<SettlementYear>(tabState?.year ?? 2026);
  const [useAverageSalary, setUseAverageSalary] = useState(
    tabState?.useAverageSalary ?? true,
  );
  const [averageSalary, setAverageSalary] = useState(
    tabState?.averageSalary ?? sharedState?.grossIncome ?? 0,
  );
  const [monthlyIncome, setMonthlyIncome] = useState<MonthlyIncomeEntry[]>(
    tabState?.monthlyIncome ?? createDefaultMonthlyIncome(0, 0, 0),
  );
  const [dependents, setDependents] = useState<DependentInfo[]>(
    tabState?.dependents ?? [],
  );
  const [charitableContributions, setCharitableContributions] = useState(
    tabState?.charitableContributions ?? 0,
  );
  const [voluntaryPension, setVoluntaryPension] = useState(
    tabState?.voluntaryPension ?? 0,
  );
  const [medicalExpenses, setMedicalExpenses] = useState(
    tabState?.medicalExpenses ?? 0,
  );
  const [educationExpenses, setEducationExpenses] = useState(
    tabState?.educationExpenses ?? 0,
  );
  const [insuranceOptions, setInsuranceOptions] = useState<InsuranceOptions>(
    tabState?.insuranceOptions ??
      sharedState?.insuranceOptions ??
      DEFAULT_INSURANCE_OPTIONS,
  );
  const [region, setRegion] = useState<RegionType>(
    tabState?.region ?? sharedState?.region ?? 1,
  );
  const [manualTaxPaidMode, setManualTaxPaidMode] = useState(
    tabState?.manualTaxPaidMode ?? false,
  );
  const [manualTaxPaid, setManualTaxPaid] = useState(
    tabState?.manualTaxPaid ?? 0,
  );
  const [showMonthlyDetails, setShowMonthlyDetails] = useState(false);
  const [inputWarning, setInputWarning] = useState<string | null>(null);

  // Sync from shared state
  useEffect(() => {
    if (sharedState && !isLocalChange.current) {
      if (averageSalary === 0 && sharedState.grossIncome > 0) {
        setAverageSalary(sharedState.grossIncome);
      }
      if (sharedState.insuranceOptions) {
        setInsuranceOptions(sharedState.insuranceOptions);
      }
      if (sharedState.region) {
        setRegion(sharedState.region);
      }
    }
    isLocalChange.current = false;
  }, [sharedState, averageSalary]);

  // Sync from tab state (only when it's an external change, not from local edits)
  const prevTabStateRef = useRef(tabState);
  useEffect(() => {
    // Skip if this is a local change propagating back
    if (isLocalChange.current) {
      prevTabStateRef.current = tabState;
      return;
    }
    // Only sync if tabState actually changed from external source
    if (tabState && tabState !== prevTabStateRef.current) {
      setYear(tabState.year);
      setUseAverageSalary(tabState.useAverageSalary);
      setAverageSalary(tabState.averageSalary);
      setMonthlyIncome(tabState.monthlyIncome);
      setDependents(tabState.dependents);
      setCharitableContributions(tabState.charitableContributions);
      setVoluntaryPension(tabState.voluntaryPension);
      setMedicalExpenses(tabState.medicalExpenses ?? 0);
      setEducationExpenses(tabState.educationExpenses ?? 0);
      setInsuranceOptions(tabState.insuranceOptions);
      setRegion(tabState.region);
      setManualTaxPaidMode(tabState.manualTaxPaidMode);
      setManualTaxPaid(tabState.manualTaxPaid);
      prevTabStateRef.current = tabState;
    }
  }, [tabState]);

  // Notify parent of tab state changes
  const updateTabState = useCallback(
    (updates: Partial<AnnualSettlementTabState>) => {
      onTabStateChange?.({
        year,
        useAverageSalary,
        averageSalary,
        monthlyIncome,
        dependents,
        charitableContributions,
        voluntaryPension,
        medicalExpenses,
        educationExpenses,
        insuranceOptions,
        region,
        manualTaxPaidMode,
        manualTaxPaid,
        ...updates,
      });
    },
    [
      year,
      useAverageSalary,
      averageSalary,
      monthlyIncome,
      dependents,
      charitableContributions,
      voluntaryPension,
      medicalExpenses,
      educationExpenses,
      insuranceOptions,
      region,
      manualTaxPaidMode,
      manualTaxPaid,
      onTabStateChange,
    ],
  );

  // Helper function to count dependents for a specific month
  const getDependentCountForMonth = useCallback(
    (month: number): number => {
      return dependents.filter(
        (d) => d.fromMonth <= month && d.toMonth >= month,
      ).length;
    },
    [dependents],
  );

  // When averageSalary changes, update monthly income
  useEffect(() => {
    if (useAverageSalary && averageSalary > 0) {
      const newMonthlyIncome = createDefaultMonthlyIncome(averageSalary, 0, 0);
      newMonthlyIncome.forEach((entry) => {
        // Calculate estimated tax for each month (date-aware for insurance caps)
        const insurance = getInsuranceDetailed(
          entry.grossSalary,
          region,
          insuranceOptions,
          new Date(year, entry.month - 1, 1),
        );
        const law = getLawForMonth(year, entry.month);
        const dependentCountForMonth = getDependentCountForMonth(entry.month);
        const taxableForMonth =
          entry.grossSalary + entry.bonus - entry.taxExempt;
        entry.taxPaid = estimateMonthlyTax(
          taxableForMonth,
          dependentCountForMonth,
          insurance.total,
          law,
        );
      });
      setMonthlyIncome(newMonthlyIncome);
    }
  }, [
    useAverageSalary,
    averageSalary,
    year,
    region,
    insuranceOptions,
    dependents,
    getDependentCountForMonth,
  ]);

  // Calculate result
  const result = useMemo<AnnualSettlementResult | null>(() => {
    const totalIncome = monthlyIncome.reduce(
      (sum, m) => sum + m.grossSalary,
      0,
    );
    if (totalIncome <= 0) return null;

    return calculateAnnualSettlement({
      year,
      monthlyIncome,
      dependents,
      charitableContributions,
      voluntaryPension,
      medicalExpenses,
      educationExpenses,
      insuranceOptions,
      region,
      manualTaxPaid: manualTaxPaidMode ? manualTaxPaid : undefined,
    });
  }, [
    year,
    monthlyIncome,
    dependents,
    charitableContributions,
    voluntaryPension,
    medicalExpenses,
    educationExpenses,
    insuranceOptions,
    region,
    manualTaxPaidMode,
    manualTaxPaid,
  ]);

  // Handle year change
  const handleYearChange = (newYear: SettlementYear) => {
    setYear(newYear);
    updateTabState({ year: newYear });
  };

  const isNewLaw = year >= 2026;
  const pensionCap = getAnnualPensionCap(year);
  const individualDue = annualDeadline(year, "individual");
  const orgDue = annualDeadline(year, "org");
  const tentative = (d: Date) =>
    d.getFullYear() > HOLIDAYS_OFFICIAL_UNTIL ? " (dự kiến, chờ lịch nghỉ lễ chính thức)" : "";

  const buildWarning = (
    issues: CurrencyInputIssues,
    max?: number,
  ): string | null => {
    const messages: string[] = [];
    if (issues.negative) {
      messages.push("Không hỗ trợ số âm.");
    }
    if (issues.decimal) {
      messages.push("Không hỗ trợ số thập phân, đã bỏ phần lẻ.");
    }
    if (issues.overflow && max) {
      messages.push(
        `Giá trị quá lớn, giới hạn tối đa ${formatNumber(max)} VNĐ.`,
      );
    }
    return messages.length ? messages.join(" ") : null;
  };

  const parseCurrencyWithWarning = (raw: string, max: number) => {
    const parsed = parseCurrencyInput(raw, { max });
    setInputWarning(buildWarning(parsed.issues, max));
    return parsed.value;
  };

  // Handle average salary change
  const handleAverageSalaryChange = (value: string) => {
    const numValue = parseCurrencyWithWarning(value, MAX_MONTHLY_INCOME);
    isLocalChange.current = true;
    setAverageSalary(numValue);
    updateTabState({ averageSalary: numValue });
    onStateChange?.({ grossIncome: numValue });
  };

  // Handle monthly income change
  const handleMonthlyIncomeChange = (
    month: number,
    field: keyof MonthlyIncomeEntry,
    value: number,
  ) => {
    const newMonthlyIncome = monthlyIncome.map((entry) =>
      entry.month === month ? { ...entry, [field]: value } : entry,
    );
    setMonthlyIncome(newMonthlyIncome);
    updateTabState({ monthlyIncome: newMonthlyIncome });
  };

  // Add dependent
  const addDependent = () => {
    const newDep: DependentInfo = {
      id: generateDependentId(),
      name: `NPT ${dependents.length + 1}`,
      fromMonth: 1,
      toMonth: 12,
    };
    const newDependents = [...dependents, newDep];
    setDependents(newDependents);
    updateTabState({ dependents: newDependents });
  };

  // Update dependent
  const updateDependent = (id: string, updates: Partial<DependentInfo>) => {
    const newDependents = dependents.map((d) =>
      d.id === id ? { ...d, ...updates } : d,
    );
    setDependents(newDependents);
    updateTabState({ dependents: newDependents });
  };

  // Remove dependent
  const removeDependent = (id: string) => {
    const newDependents = dependents.filter((d) => d.id !== id);
    setDependents(newDependents);
    updateTabState({ dependents: newDependents });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Quyết toán thuế năm
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Tính thuế phải nộp hoặc được hoàn khi quyết toán
              </p>
            </div>
          </div>
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <Tooltip content="Năm 2025: biểu 7 bậc, giảm trừ 11 triệu/4,4 triệu. Năm 2026: biểu 5 bậc, giảm trừ 15,5 triệu/6,2 triệu cho cả 12 tháng">
              <InfoIcon />
            </Tooltip>
            <div className="flex gap-2">
              <button
                onClick={() => handleYearChange(2025)}
                className={`px-3 sm:px-4 py-2.5 sm:py-2 min-h-[44px] rounded-lg font-medium text-sm sm:text-base transition-all ${
                  year === 2025
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                2025
              </button>
              <button
                onClick={() => handleYearChange(2026)}
                className={`px-3 sm:px-4 py-2.5 sm:py-2 min-h-[44px] rounded-lg font-medium text-sm sm:text-base transition-all ${
                  year === 2026
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                2026
              </button>
            </div>
          </div>
        </div>

        {/* Year info */}
        {isNewLaw && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 space-y-1">
            <p>
              <strong>Năm 2026:</strong> biểu thuế 5 bậc, giảm trừ bản thân 15,5 triệu/tháng,
              người phụ thuộc 6,2 triệu/tháng cho cả 12 tháng (NĐ 253/2026/NĐ-CP Điều 69).
            </p>
            <p>
              Bổ sung: hưu trí bổ sung, hưu trí tự nguyện, bảo hiểm nhân thọ tổng tối đa 3 triệu/tháng;
              giảm trừ chi y tế (tối đa 23 triệu/năm) và học phí (tối đa 24 triệu/năm);
              người phụ thuộc có thu nhập bình quân không quá {formatNumber(DEPENDENT_INCOME_LIMIT / 1_000_000)} triệu/tháng.
            </p>
            <p>
              Thuế đã khấu trừ 6 tháng đầu năm theo quy định cũ được điều chỉnh khi quyết toán
              (NĐ 253/2026 Điều 70.2): nên nhập số thuế thực tế trên chứng từ khấu trừ.
            </p>
          </div>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Input */}
        <div className="space-y-6">
          {inputWarning && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {inputWarning}
            </div>
          )}
          {/* Income input */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Thu nhập
            </h3>

            {/* Input mode toggle */}
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useAverageSalary}
                  onChange={() => {
                    setUseAverageSalary(true);
                    updateTabState({ useAverageSalary: true });
                  }}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">Lương trung bình</span>
                <Tooltip content="Nhập lương trung bình tháng thay vì từng tháng riêng biệt">
                  <InfoIcon />
                </Tooltip>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useAverageSalary}
                  onChange={() => {
                    setUseAverageSalary(false);
                    updateTabState({ useAverageSalary: false });
                  }}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">Nhập từng tháng</span>
                <Tooltip content="Nhập chi tiết lương, thưởng, thuế đã nộp mỗi tháng">
                  <InfoIcon />
                </Tooltip>
              </label>
            </div>

            {useAverageSalary ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lương GROSS trung bình/tháng
                </label>
                <input
                  type="text"
                  value={formatNumber(averageSalary)}
                  onChange={(e) => handleAverageSalaryChange(e.target.value)}
                  className="input-field"
                  placeholder="30,000,000"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-2">Tháng</th>
                      <th className="py-2 px-2">Lương GROSS</th>
                      <th className="py-2 px-2">Thưởng</th>
                      <th className="py-2 pl-2">Thuế đã nộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyIncome.map((entry) => (
                      <tr
                        key={entry.month}
                        className="border-t border-gray-100"
                      >
                        <td className="py-2 pr-2 font-medium">
                          {MONTH_NAMES[entry.month - 1]}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={formatNumber(entry.grossSalary)}
                            onChange={(e) =>
                              handleMonthlyIncomeChange(
                                entry.month,
                                "grossSalary",
                                parseCurrencyWithWarning(
                                  e.target.value,
                                  MAX_MONTHLY_INCOME,
                                ),
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={formatNumber(entry.bonus)}
                            onChange={(e) =>
                              handleMonthlyIncomeChange(
                                entry.month,
                                "bonus",
                                parseCurrencyWithWarning(
                                  e.target.value,
                                  MAX_MONTHLY_INCOME,
                                ),
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right"
                          />
                        </td>
                        <td className="py-2 pl-2">
                          <input
                            type="text"
                            value={formatNumber(entry.taxPaid)}
                            onChange={(e) =>
                              handleMonthlyIncomeChange(
                                entry.month,
                                "taxPaid",
                                parseCurrencyWithWarning(
                                  e.target.value,
                                  MAX_MONTHLY_INCOME,
                                ),
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Dependents */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  Người phụ thuộc
                </h3>
                <Tooltip content={`NPT được giảm trừ theo từng tháng đăng ký; thu nhập bình quân tháng không quá ${isNewLaw ? formatNumber(DEPENDENT_INCOME_LIMIT / 1_000_000) : 1} triệu đồng`}>
                  <InfoIcon />
                </Tooltip>
              </div>
              <button
                onClick={addDependent}
                className="px-3 py-2.5 sm:py-1.5 min-h-[44px] text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                + Thêm NPT
              </button>
            </div>

            {dependents.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Chưa có người phụ thuộc
              </p>
            ) : (
              <div className="space-y-3">
                {dependents.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={dep.name}
                        onChange={(e) =>
                          updateDependent(dep.id, { name: e.target.value })
                        }
                        className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                        placeholder="Tên NPT"
                      />
                      <button
                        onClick={() => removeDependent(dep.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded sm:hidden"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Từ</span>
                      <select
                        value={dep.fromMonth}
                        onChange={(e) =>
                          updateDependent(dep.id, {
                            fromMonth: Number(e.target.value),
                          })
                        }
                        className="px-2 py-1 border border-gray-200 rounded"
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i} value={i + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500">đến</span>
                      <select
                        value={dep.toMonth}
                        onChange={(e) =>
                          updateDependent(dep.id, {
                            toMonth: Number(e.target.value),
                          })
                        }
                        className="px-2 py-1 border border-gray-200 rounded"
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i} value={i + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => removeDependent(dep.id)}
                      className="hidden sm:block p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other deductions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Giảm trừ khác
            </h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <span>Từ thiện, nhân đạo (VND/năm)</span>
                  <Tooltip content="Khoản đóng góp được giảm trừ không giới hạn">
                    <InfoIcon />
                  </Tooltip>
                </label>
                <input
                  type="text"
                  value={formatNumber(charitableContributions)}
                  onChange={(e) => {
                    const value = parseCurrencyWithWarning(
                      e.target.value,
                      MAX_MONTHLY_INCOME * 12,
                    );
                    setCharitableContributions(value);
                    updateTabState({ charitableContributions: value });
                  }}
                  className="input-field"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <span>
                    {isNewLaw
                      ? "Hưu trí bổ sung, tự nguyện, BH nhân thọ"
                      : "Quỹ hưu trí tự nguyện"}{" "}
                    (VND/năm, tối đa {formatNumber(pensionCap / 1_000_000)} triệu)
                  </span>
                  <Tooltip
                    content={
                      isNewLaw
                        ? "Từ năm 2026: hưu trí bổ sung, hưu trí tự nguyện và bảo hiểm nhân thọ tổng tối đa 3 triệu/tháng (36 triệu/năm), gồm cả phần công ty đóng"
                        : "Năm 2025: quỹ hưu trí tự nguyện tối đa 1 triệu/tháng (12 triệu/năm)"
                    }
                  >
                    <InfoIcon />
                  </Tooltip>
                </label>
                <input
                  type="text"
                  value={formatNumber(voluntaryPension)}
                  onChange={(e) => {
                    const value = parseCurrencyWithWarning(
                      e.target.value,
                      pensionCap,
                    );
                    setVoluntaryPension(value);
                    updateTabState({ voluntaryPension: value });
                  }}
                  className="input-field"
                  placeholder="0"
                />
              </div>
              {isNewLaw && (
                <>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <span>Chi khám chữa bệnh (VND/năm, tối đa {formatNumber(MEDICAL_DEDUCTION_CAP / 1_000_000)} triệu)</span>
                      <Tooltip content="Khám, chữa bệnh tại cơ sở y tế trong nước thuộc danh mục BHYT chi trả, cho bản thân và người phụ thuộc; cần hóa đơn và bảng kê chi phí (NĐ 253/2026 Điều 49.2.a)">
                        <InfoIcon />
                      </Tooltip>
                    </label>
                    <input
                      type="text"
                      value={formatNumber(medicalExpenses)}
                      onChange={(e) => {
                        const value = parseCurrencyWithWarning(
                          e.target.value,
                          MEDICAL_DEDUCTION_CAP,
                        );
                        setMedicalExpenses(value);
                        updateTabState({ medicalExpenses: value });
                      }}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <span>Học phí, đào tạo (VND/năm, tối đa {formatNumber(EDUCATION_DEDUCTION_CAP / 1_000_000)} triệu)</span>
                      <Tooltip content="Học phí mầm non, phổ thông, giáo dục nghề nghiệp, đại học và kỹ năng chuyên môn tại cơ sở trong nước, cho bản thân và người phụ thuộc (NĐ 253/2026 Điều 49.2.b)">
                        <InfoIcon />
                      </Tooltip>
                    </label>
                    <input
                      type="text"
                      value={formatNumber(educationExpenses)}
                      onChange={(e) => {
                        const value = parseCurrencyWithWarning(
                          e.target.value,
                          EDUCATION_DEDUCTION_CAP,
                        );
                        setEducationExpenses(value);
                        updateTabState({ educationExpenses: value });
                      }}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                  {charitableContributions + medicalExpenses + educationExpenses > 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Muốn trừ chi y tế, học phí thì phải tự quyết toán, không ủy quyền; theo câu chữ NĐ 253/2026 Điều 51.3, khoản từ thiện (Điều 49) cũng có thể phải tự quyết toán
                      cho tổ chức trả thu nhập (Điều 51.3). Cần hóa đơn, chứng từ ghi tên người nộp thuế hoặc người phụ
                      thuộc; chi y tế, học phí không được chi trả từ nguồn khác (BHYT, tài trợ...).
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Manual tax paid override */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  Thuế đã tạm nộp
                </h3>
                <Tooltip content="Tổng thuế khấu trừ hàng tháng, so sánh với thuế thực tế cả năm">
                  <InfoIcon />
                </Tooltip>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualTaxPaidMode}
                  onChange={(e) => {
                    setManualTaxPaidMode(e.target.checked);
                    updateTabState({ manualTaxPaidMode: e.target.checked });
                  }}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-600">Nhập thủ công</span>
                <Tooltip content="Nhập tổng thuế đã nộp thay vì tính từ bảng chi tiết">
                  <InfoIcon />
                </Tooltip>
              </label>
            </div>

            {manualTaxPaidMode ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tổng thuế đã tạm nộp cả năm
                </label>
                <input
                  type="text"
                  value={formatNumber(manualTaxPaid)}
                  onChange={(e) => {
                    const value = parseCurrencyWithWarning(
                      e.target.value,
                      MAX_MONTHLY_INCOME * 12,
                    );
                    setManualTaxPaid(value);
                    updateTabState({ manualTaxPaid: value });
                  }}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Tự động tính từ thuế khấu trừ hàng tháng:{" "}
                <span className="font-medium text-gray-700">
                  {formatCurrency(
                    monthlyIncome.reduce((sum, m) => sum + m.taxPaid, 0),
                  )}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Right column - Result */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Summary */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Kết quả quyết toán
                </h3>

                <div className="space-y-4">
                  {/* Income summary */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tổng thu nhập GROSS</span>
                      <span className="font-medium">
                        {formatCurrency(result.totalGrossIncome)}
                      </span>
                    </div>
                    {result.totalBonusIncome > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Thưởng</span>
                        <span className="font-medium">
                          {formatCurrency(result.totalBonusIncome)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Tổng thu nhập chịu thuế</span>
                      <span>{formatCurrency(result.totalTaxableIncome)}</span>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Giảm trừ bản thân</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(result.totalPersonalDeduction)}
                      </span>
                    </div>
                    {result.totalDependentDeduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Giảm trừ người phụ thuộc
                        </span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(result.totalDependentDeduction)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bảo hiểm bắt buộc</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(result.totalInsuranceDeduction)}
                      </span>
                    </div>
                    {[
                      { label: "Từ thiện, nhân đạo", value: result.otherDeductionDetail.charity },
                      { label: isNewLaw ? "Hưu trí bổ sung, tự nguyện, BH nhân thọ" : "Quỹ hưu trí tự nguyện", value: result.otherDeductionDetail.pension },
                      { label: "Chi khám chữa bệnh", value: result.otherDeductionDetail.medical },
                      { label: "Học phí, đào tạo", value: result.otherDeductionDetail.education },
                    ]
                      .filter((row) => row.value > 0)
                      .map((row) => (
                        <div key={row.label} className="flex justify-between gap-3">
                          <span className="text-gray-600">{row.label}</span>
                          <span className="font-medium text-red-600">
                            -{formatCurrency(row.value)}
                          </span>
                        </div>
                      ))}
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Tổng giảm trừ</span>
                      <span className="text-red-600">
                        -{formatCurrency(result.totalDeductions)}
                      </span>
                    </div>
                  </div>

                  {/* Tax calculation */}
                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Thu nhập tính thuế</span>
                      <span>
                        {formatCurrency(result.totalAssessableIncome)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium text-lg">
                      <span>Thuế TNCN phải nộp cả năm</span>
                      <span className="text-primary-600">
                        {formatCurrency(result.annualTaxDue)}
                      </span>
                    </div>
                  </div>

                  {/* Comparison */}
                  <div className="space-y-2 text-sm border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thuế đã tạm nộp</span>
                      <span className="font-medium">
                        {formatCurrency(result.totalTaxPaid)}
                      </span>
                    </div>
                  </div>

                  {/* Settlement result */}
                  <div
                    className={`p-4 rounded-lg ${
                      result.settlementType === "pay"
                        ? "bg-red-50 border border-red-200"
                        : result.settlementType === "refund"
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">
                        {result.settlementType === "pay"
                          ? "Số thuế còn phải nộp thêm"
                          : result.settlementType === "refund"
                            ? "Số thuế được hoàn lại"
                            : "Không phát sinh chênh lệch"}
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          result.settlementType === "pay"
                            ? "text-red-600"
                            : result.settlementType === "refund"
                              ? "text-green-600"
                              : "text-gray-600"
                        }`}
                      >
                        {result.settlementType === "even"
                          ? "0 VND"
                          : formatCurrency(Math.abs(result.difference))}
                      </div>
                      {result.isSmallDifference && (
                        <p className="mt-2 text-xs text-gray-600">
                          {result.settlementType === "pay"
                            ? "Từ 50.000đ trở xuống: được miễn, không phải nộp (NĐ 252/2026/NĐ-CP Điều 32.2.a)."
                            : "Từ 50.000đ trở xuống: không hoàn, được bù trừ vào kỳ sau (NĐ 252/2026/NĐ-CP Điều 29.4.a)."}
                        </p>
                      )}
                      {result.settlementType === "refund" && !result.isSmallDifference && (
                        <p className="mt-2 text-xs text-gray-600">
                          Không bắt buộc quyết toán nếu không đề nghị hoàn hoặc bù trừ vào kỳ sau
                          (NĐ 253/2026/NĐ-CP Điều 51.1.a).
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly details toggle */}
              <div className="card">
                <button
                  onClick={() => setShowMonthlyDetails(!showMonthlyDetails)}
                  className="flex items-center justify-between w-full"
                >
                  <h3 className="text-lg font-semibold text-gray-800">
                    Chi tiết hàng tháng
                  </h3>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${showMonthlyDetails ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showMonthlyDetails && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="py-2 pr-2">Tháng</th>
                          <th className="py-2 px-2 text-right">GROSS</th>
                          <th className="py-2 px-2 text-right">Giảm trừ</th>
                          <th className="py-2 px-2 text-right">TN tính thuế</th>
                          <th className="py-2 pl-2 text-right">Thuế nộp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.monthlyBreakdown.map((month) => (
                          <tr
                            key={month.month}
                            className="border-b border-gray-100"
                          >
                            <td className="py-2 pr-2">
                              <span className="font-medium">
                                {month.monthName}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right">
                              {formatNumber(month.gross + month.bonus)}
                            </td>
                            <td className="py-2 px-2 text-right text-red-600">
                              -
                              {formatNumber(
                                month.insurance +
                                  month.personalDeduction +
                                  month.dependentDeduction,
                              )}
                            </td>
                            <td className="py-2 px-2 text-right">
                              {formatNumber(
                                Math.max(
                                  0,
                                  month.taxableIncome -
                                    month.insurance -
                                    month.personalDeduction -
                                    month.dependentDeduction,
                                ),
                              )}
                            </td>
                            <td className="py-2 pl-2 text-right font-medium">
                              {formatNumber(month.taxPaid)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium bg-gray-50">
                          <td className="py-2 pr-2">Tổng</td>
                          <td className="py-2 px-2 text-right">
                            {formatCurrency(result.totalTaxableIncome)}
                          </td>
                          <td className="py-2 px-2 text-right text-red-600">
                            -{formatCurrency(result.totalDeductions)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatCurrency(result.totalAssessableIncome)}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            {formatCurrency(result.totalTaxPaid)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Settlement info */}
              <div className="card bg-blue-50 border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">
                  Lưu ý về quyết toán thuế
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>
                    • Cá nhân tự quyết toán năm {year}: hạn{" "}
                    <span className="font-data">{formatDate(individualDue)}</span>
                    {tentative(individualDue)} (ngày cuối cùng của tháng 4, trùng ngày nghỉ thì dời sang ngày làm việc tiếp theo)
                  </li>
                  <li>
                    • Ủy quyền cho tổ chức trả thu nhập quyết toán thay: tổ chức nộp chậm nhất{" "}
                    <span className="font-data">{formatDate(orgDue)}</span>. Được ủy quyền nếu chỉ có một nguồn tiền lương
                    ký hợp đồng lao động từ 3 tháng trở lên và đang làm việc tại đó khi quyết toán
                    {isNewLaw && " (NĐ 253/2026/NĐ-CP Điều 51.2)"}
                  </li>
                  <li>
                    • Không phải quyết toán nếu số thuế phải nộp nhỏ hơn số đã nộp mà không đề nghị hoàn; phần thu nhập
                    vãng lai thêm bình quân không quá{" "}
                    {formatNumber((isNewLaw ? CASUAL_INCOME_NO_SETTLEMENT_LIMIT : 10_000_000) / 1_000_000)} triệu/tháng
                    đã khấu trừ 10% thì không phải quyết toán
                  </li>
                  {isNewLaw && (
                    <li>
                      • Có giảm trừ từ thiện, chi y tế, học phí hoặc đề nghị giảm thuế do thiên tai, bệnh hiểm nghèo:
                      phải tự quyết toán (NĐ 253/2026 Điều 51.3)
                    </li>
                  )}
                  <li>• Nếu có nhiều nguồn thu nhập, cần khai báo tất cả</li>
                  <li>
                    • Thuế hoàn lại sẽ được chuyển vào tài khoản ngân hàng đã
                    đăng ký
                  </li>
                  <li>
                    • Cần lưu giữ chứng từ trong 5 năm để đối chiếu khi cần
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-500">
                Nhập thông tin thu nhập để xem kết quả quyết toán
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
