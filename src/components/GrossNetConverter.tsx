"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  formatCurrency,
  formatNumber,
  RegionType,
  getRegionalMinimumWages,
  SharedTaxState,
  DEFAULT_INSURANCE_OPTIONS,
  TaxInput,
  TaxResult,
  calculateNewTax,
  DEPENDENT_INCOME_LIMIT,
} from "@/lib/taxCalculator";
import {
  CurrencyInputIssues,
  MAX_MONTHLY_INCOME,
  parseCurrencyInput,
} from "@/utils/inputSanitizers";
import Tooltip from "@/components/ui/Tooltip";

interface GrossNetConverterProps {
  sharedState: SharedTaxState;
  onStateChange: (updates: Partial<SharedTaxState>) => void;
}

const MAX_DEPENDENTS = 20; // = giới hạn khi nạp snapshot (sanitizeSharedState)

// Cùng đầu vào engine với tab Tính thuế: BH từng loại, giảm trừ khác, hưu trí (engine tự chặn trần), phụ cấp
export function toEngineInput(state: SharedTaxState): TaxInput {
  return {
    grossIncome: state.grossIncome,
    declaredSalary: state.declaredSalary,
    dependents: state.dependents,
    otherDeductions: state.otherDeductions,
    pensionContribution: state.pensionContribution,
    hasInsurance: state.hasInsurance,
    insuranceOptions: state.insuranceOptions,
    region: state.region,
    allowances: state.allowances,
  };
}

// NET → GROSS: tìm nhị phân trên engine (NET tăng theo GROSS), GROSS làm tròn đồng.
// Không có GROSS cho đúng NET (NET nhỏ hơn phụ cấp miễn thuế, vượt giới hạn) → trả kết quả gần nhất.
export function netToGrossResult(targetNet: number, base: TaxInput): TaxResult {
  const calc = (gross: number) => calculateNewTax({ ...base, grossIncome: gross });
  const current = calc(base.grossIncome);
  // GROSS hiện tại đã cho đúng NET (VD vừa đổi chế độ GROSS → NET): giữ nguyên, không trôi 1đ
  if (Math.round(current.netIncome) === targetNet) return current;

  let low = 0;
  let high = Math.max(targetNet, 1);
  while (high < MAX_MONTHLY_INCOME && calc(high).netIncome < targetNet) high *= 2;
  high = Math.min(high, MAX_MONTHLY_INCOME);
  for (let i = 0; i < 100 && high - low > 0.5; i++) {
    const mid = (low + high) / 2;
    if (calc(mid).netIncome < targetNet) low = mid;
    else high = mid;
  }
  const [a, b] = [Math.floor(high), Math.ceil(high)].map(calc);
  return Math.abs(a.netIncome - targetNet) <= Math.abs(b.netIncome - targetNet) ? a : b;
}

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

export default function GrossNetConverter({
  sharedState,
  onStateChange,
}: GrossNetConverterProps) {
  // Get date-aware regional minimum wages
  const regionalMinimumWages = useMemo(
    () => getRegionalMinimumWages(new Date()),
    [],
  );

  // GROSS luôn nằm ở sharedState; chế độ NET giữ số NET người dùng gõ (chuỗi, cho phép rỗng)
  const [type, setType] = useState<"gross" | "net">("gross");
  const [grossEmpty, setGrossEmpty] = useState(false);
  const [netText, setNetText] = useState("");
  const [declaredEmpty, setDeclaredEmpty] = useState(false);
  const [amountWarning, setAmountWarning] = useState<string | null>(null);
  const [declaredWarning, setDeclaredWarning] = useState<string | null>(null);

  const { dependents, hasInsurance, region, declaredSalary } = sharedState;
  const useDeclaredSalary = declaredSalary !== undefined;
  const insuranceOptions = sharedState.insuranceOptions ?? DEFAULT_INSURANCE_OPTIONS;
  const netTarget = netText === "" ? 0 : Number(netText);

  // Nhập 0/xóa trống → không có kết quả (không hiện số cũ)
  const result = useMemo<TaxResult | null>(() => {
    const input = toEngineInput(sharedState);
    if (type === "gross") {
      return sharedState.grossIncome > 0 ? calculateNewTax(input) : null;
    }
    return netTarget > 0 ? netToGrossResult(netTarget, input) : null;
  }, [type, netTarget, sharedState]);

  const netMismatch =
    type === "net" && result !== null && Math.abs(result.netIncome - netTarget) > 1;

  // Chế độ NET: đẩy GROSS tìm được sang các tab khác.
  // GROSS bị tab khác/snapshot đổi (khác số mình đã đẩy) → quay về chế độ GROSS.
  const syncedGross = useRef(sharedState.grossIncome);
  useEffect(() => {
    if (type !== "net") {
      syncedGross.current = sharedState.grossIncome;
      return;
    }
    if (sharedState.grossIncome !== syncedGross.current) {
      syncedGross.current = sharedState.grossIncome;
      setType("gross");
      return;
    }
    if (result && result.grossIncome !== sharedState.grossIncome) {
      syncedGross.current = result.grossIncome;
      onStateChange({ grossIncome: result.grossIncome });
    }
  }, [type, result, sharedState.grossIncome, onStateChange]);

  const handleAmountChange = (value: string) => {
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    setAmountWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
    const empty = !/\d/.test(value);

    if (type === "gross") {
      setGrossEmpty(empty);
      onStateChange({ grossIncome: parsed.value });
    } else {
      setNetText(empty ? "" : String(parsed.value));
    }
  };

  const handleAmountBlur = () => {
    setGrossEmpty(false);
    if (type === "net" && netText === "") setNetText("0");
  };

  // Đổi chế độ: ô NET nhận NET hiện tại, không tính lại GROSS
  const handleTypeChange = (newType: "gross" | "net") => {
    if (newType === type) return;
    if (newType === "net") {
      setNetText(result ? String(Math.round(result.netIncome)) : "");
    }
    setGrossEmpty(false);
    setAmountWarning(null);
    setType(newType);
  };

  const handleDependentsChange = (newDependents: number) => {
    onStateChange({
      dependents: Math.min(Math.max(0, newDependents), MAX_DEPENDENTS),
    });
  };

  const handleInsuranceChange = (newHasInsurance: boolean) => {
    onStateChange({
      hasInsurance: newHasInsurance,
      insuranceOptions: newHasInsurance
        ? DEFAULT_INSURANCE_OPTIONS
        : { bhxh: false, bhyt: false, bhtn: false },
    });
  };

  const handleRegionChange = (newRegion: RegionType) => {
    onStateChange({ region: newRegion });
  };

  const handleUseDeclaredSalaryChange = (use: boolean) => {
    setDeclaredEmpty(false);
    setDeclaredWarning(null);
    onStateChange({
      declaredSalary: use ? sharedState.grossIncome : undefined,
    });
  };

  const handleDeclaredSalaryChange = (value: string) => {
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    setDeclaredEmpty(!/\d/.test(value));
    setDeclaredWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
    onStateChange({ declaredSalary: parsed.value });
  };

  // Current display value based on type (rỗng khi người dùng xóa hết)
  const displayValue =
    type === "gross"
      ? grossEmpty
        ? ""
        : formatNumber(sharedState.grossIncome)
      : netText === ""
        ? ""
        : formatNumber(netTarget);

  const partialInsurance =
    hasInsurance &&
    !(insuranceOptions.bhxh && insuranceOptions.bhyt && insuranceOptions.bhtn);
  const allowancesTotal = result?.allowancesBreakdown?.total ?? 0;

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Quy đổi GROSS ↔ NET
          </h2>
          <p className="text-sm text-gray-500">
            Chuyển đổi giữa lương GROSS và NET
          </p>
        </div>
      </div>

      {/* Sync indicator */}
      <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        Dữ liệu được đồng bộ với các tab khác (gồm phụ cấp, giảm trừ khác, hưu trí tự nguyện)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          {/* Loại lương */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Loại lương đầu vào
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
              <Tooltip content="Chuyển đổi giữa tính từ lương GROSS sang NET hoặc ngược lại">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </legend>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-label="Chọn loại lương đầu vào"
            >
              <button
                onClick={() => handleTypeChange("gross")}
                role="radio"
                aria-checked={type === "gross"}
                className={`flex-1 py-2 px-4 min-h-[44px] rounded-lg font-medium transition-colors ${
                  type === "gross"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                GROSS (Lương gộp)
              </button>
              <button
                onClick={() => handleTypeChange("net")}
                role="radio"
                aria-checked={type === "net"}
                className={`flex-1 py-2 px-4 min-h-[44px] rounded-lg font-medium transition-colors ${
                  type === "net"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                NET (Thực nhận)
              </button>
            </div>
          </fieldset>

          {/* Số tiền */}
          <div>
            <label
              htmlFor="salary-amount"
              className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
            >
              {type === "gross" ? "Lương GROSS" : "Lương NET"} (VNĐ/tháng)
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
              <Tooltip content="Số tiền cần chuyển đổi">
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              id="salary-amount"
              type="text"
              inputMode="numeric"
              value={displayValue}
              onChange={(e) => handleAmountChange(e.target.value)}
              onBlur={handleAmountBlur}
              className="input-field text-lg font-semibold"
              aria-required="true"
            />
            {amountWarning && (
              <p className="text-xs text-amber-600 mt-2">{amountWarning}</p>
            )}
          </div>

          {/* Lương đóng bảo hiểm */}
          {hasInsurance && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <label
                htmlFor="gn-use-declared-salary"
                className="flex items-center gap-3 cursor-pointer min-h-[44px]"
              >
                <input
                  id="gn-use-declared-salary"
                  type="checkbox"
                  checked={useDeclaredSalary}
                  onChange={(e) =>
                    handleUseDeclaredSalaryChange(e.target.checked)
                  }
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Lương đóng BH khác lương thực
                  <Tooltip content="Mức lương công ty đăng ký đóng bảo hiểm. Bảo hiểm tính trên mức này, thuế TNCN vẫn tính trên lương thực.">
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      <InfoIcon />
                    </span>
                  </Tooltip>
                </span>
              </label>
              {useDeclaredSalary && (
                <div className="mt-3">
                  <label
                    htmlFor="gn-declared-salary"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Lương đóng BHXH, BHYT, BHTN (VNĐ)
                  </label>
                  <input
                    id="gn-declared-salary"
                    type="text"
                    inputMode="numeric"
                    value={declaredEmpty ? "" : formatNumber(declaredSalary)}
                    onChange={(e) => handleDeclaredSalaryChange(e.target.value)}
                    onBlur={() => setDeclaredEmpty(false)}
                    className="input-field text-sm"
                    placeholder="Ví dụ: 5.000.000"
                    aria-describedby="gn-declared-salary-hint"
                  />
                  {declaredWarning && (
                    <p className="text-xs text-amber-600 mt-1">
                      {declaredWarning}
                    </p>
                  )}
                  <p
                    id="gn-declared-salary-hint"
                    className="text-xs text-amber-600 mt-1"
                  >
                    BH tính trên mức này - Thuế tính trên lương thực
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Người phụ thuộc */}
          <div>
            <label
              id="gn-dependents-label"
              className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
            >
              Số người phụ thuộc
              <Tooltip content={`Con, vợ/chồng, cha mẹ... có thu nhập bình quân không quá ${formatNumber(DEPENDENT_INCOME_LIMIT)}đ/tháng`}>
                <span className="text-gray-500 hover:text-gray-700 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <div
              className="flex items-center gap-4"
              role="group"
              aria-labelledby="gn-dependents-label"
            >
              <button
                onClick={() => handleDependentsChange(dependents - 1)}
                aria-label="Giảm số người phụ thuộc"
                disabled={dependents === 0}
                className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-bold"
              >
                -
              </button>
              <span
                className="text-2xl font-bold w-12 text-center"
                aria-live="polite"
              >
                {dependents}
              </span>
              <button
                onClick={() => handleDependentsChange(dependents + 1)}
                aria-label="Tăng số người phụ thuộc"
                disabled={dependents >= MAX_DEPENDENTS}
                className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-primary-100 hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-bold text-primary-700"
              >
                +
              </button>
            </div>
          </div>

          {/* Bảo hiểm */}
          <div>
            <label
              htmlFor="gn-has-insurance"
              className="flex items-center gap-3 cursor-pointer min-h-[44px]"
            >
              <input
                id="gn-has-insurance"
                type="checkbox"
                checked={hasInsurance}
                onChange={(e) => handleInsuranceChange(e.target.checked)}
                className="w-5 h-5 text-primary-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Có đóng BHXH, BHYT, BHTN
                <Tooltip content="Các loại bảo hiểm bắt buộc: BHXH 8%, BHYT 1,5%, BHTN 1%">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </span>
            </label>
            {partialInsurance && (
              <p className="text-xs text-gray-500 ml-8">
                Theo tab Tính thuế: không đóng{" "}
                {[
                  !insuranceOptions.bhxh && "BHXH",
                  !insuranceOptions.bhyt && "BHYT",
                  !insuranceOptions.bhtn && "BHTN",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          {/* Vùng lương */}
          {hasInsurance && (
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-2">
                Vùng lương tối thiểu
              </legend>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Chọn vùng lương tối thiểu"
              >
                {([1, 2, 3, 4] as RegionType[]).map((r) => {
                  const info = regionalMinimumWages[r];
                  const isSelected = region === r;
                  return (
                    <button
                      key={r}
                      onClick={() => handleRegionChange(r)}
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${info.name}, mức lương ${formatCurrency(info.wage)}`}
                      className={`p-2 min-h-[44px] rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-xs text-gray-800">
                        {info.name}
                      </div>
                      <div className="text-xs text-primary-600 font-medium">
                        {formatCurrency(info.wage)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <>
              {netMismatch && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Không có mức GROSS cho ra đúng NET {formatCurrency(netTarget)}
                  {" "}(phụ cấp miễn thuế hoặc giới hạn nhập). Dưới đây là kết quả gần nhất.
                </p>
              )}
              {/* Kết quả */}
              <div className="bg-primary-50 rounded-lg p-4">
                <div className="text-xs text-primary-600 font-medium mb-2">
                  KẾT QUẢ
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">GROSS:</span>
                    <span className="font-medium">
                      {formatCurrency(result.grossIncome)}
                    </span>
                  </div>
                  {allowancesTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phụ cấp:</span>
                      <span className="text-gray-500">
                        +{formatCurrency(allowancesTotal)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bảo hiểm:</span>
                    <span className="text-gray-500">
                      -{formatCurrency(result.insuranceDeduction)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thuế TNCN:</span>
                    <span className="text-primary-600 font-medium">
                      -{formatCurrency(result.taxAmount)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-medium">NET:</span>
                    <span className="font-bold text-gray-800 font-mono tabular-nums">
                      {formatCurrency(result.netIncome)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chi tiết giảm trừ */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Chi tiết các khoản giảm trừ
                </div>
                {useDeclaredSalary && (
                  <div className="mb-2 px-2 py-1 bg-amber-100 rounded text-xs text-amber-700">
                    Bảo hiểm tính trên lương khai báo:{" "}
                    {formatCurrency(declaredSalary)}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">Giảm trừ bản thân:</span>
                    <span>{formatCurrency(result.personalDeduction)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">Giảm trừ NPT:</span>
                    <span>{formatCurrency(result.dependentDeduction)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">BHXH, BHYT, BHTN:</span>
                    <span>{formatCurrency(result.insuranceDeduction)}</span>
                  </div>
                  {result.otherDeductions > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">Giảm trừ khác, hưu trí:</span>
                      <span>{formatCurrency(result.otherDeductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">Thu nhập tính thuế:</span>
                    <span className="font-medium">
                      {formatCurrency(result.taxableIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
              Nhập số tiền lớn hơn 0 để xem kết quả quy đổi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
