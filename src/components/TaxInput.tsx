'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { formatNumber, RegionType, getRegionalMinimumWages, formatCurrency, InsuranceOptions, DEFAULT_INSURANCE_OPTIONS, AllowancesState, DEFAULT_ALLOWANCES, ALLOWANCE_LIMITS, calculateAllowancesBreakdown } from '@/lib/taxCalculator';
import { CurrencyInputIssues, MAX_MONTHLY_INCOME, parseCurrencyInput } from '@/utils/inputSanitizers';
import Tooltip from '@/components/ui/Tooltip';

// Helper: hiển thị giá trị currency, cho phép rỗng khi user xóa hết (thay vì lock ở "0")
function displayCurrency(rawValue: string): string {
  const num = parseInt(rawValue, 10);
  if (rawValue === '' || isNaN(num)) return '';
  return formatNumber(num);
}

interface TaxInputProps {
  onCalculate: (input: {
    grossIncome: number;
    declaredSalary?: number;
    dependents: number;
    otherDeductions: number;
    hasInsurance: boolean;
    insuranceOptions: InsuranceOptions;
    region: RegionType;
    pensionContribution: number;
    allowances?: AllowancesState;
  }) => void;
  initialValues?: {
    grossIncome: number;
    declaredSalary?: number;
    dependents: number;
    otherDeductions: number;
    hasInsurance: boolean;
    insuranceOptions: InsuranceOptions;
    region: RegionType;
    pensionContribution: number;
    allowances?: AllowancesState;
  };
}

function TaxInputComponent({ onCalculate, initialValues }: TaxInputProps) {
  const [grossIncome, setGrossIncome] = useState<string>(
    initialValues?.grossIncome?.toString() ?? '30000000'
  );
  const [useDeclaredSalary, setUseDeclaredSalary] = useState<boolean>(
    initialValues?.declaredSalary !== undefined
  );
  const [declaredSalary, setDeclaredSalary] = useState<string>(
    initialValues?.declaredSalary?.toString() ?? ''
  );
  const [dependents, setDependents] = useState<number>(initialValues?.dependents ?? 0);
  const [otherDeductions, setOtherDeductions] = useState<string>(
    initialValues?.otherDeductions?.toString() ?? '0'
  );
  const [hasInsurance, setHasInsurance] = useState<boolean>(initialValues?.hasInsurance ?? true);
  const [insuranceOptions, setInsuranceOptions] = useState<InsuranceOptions>(
    initialValues?.insuranceOptions ?? DEFAULT_INSURANCE_OPTIONS
  );
  const [region, setRegion] = useState<RegionType>(initialValues?.region ?? 1);
  const [pensionContribution, setPensionContribution] = useState<string>(
    initialValues?.pensionContribution?.toString() ?? '0'
  );
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showAllowances, setShowAllowances] = useState<boolean>(false);
  const [allowances, setAllowances] = useState<AllowancesState>(
    initialValues?.allowances ?? { ...DEFAULT_ALLOWANCES }
  );
  const [grossWarning, setGrossWarning] = useState<string | null>(null);
  const [declaredWarning, setDeclaredWarning] = useState<string | null>(null);
  const [otherDeductionWarning, setOtherDeductionWarning] = useState<string | null>(null);
  const [pensionWarning, setPensionWarning] = useState<string | null>(null);
  const [allowanceWarning, setAllowanceWarning] = useState<string | null>(null);

  // Get date-aware regional minimum wages
  const regionalMinimumWages = useMemo(() => getRegionalMinimumWages(new Date()), []);

  // Track if we're syncing from external changes
  const isExternalUpdate = useRef(false);

  // Sync with initialValues when they change from other tabs
  useEffect(() => {
    if (initialValues && !isExternalUpdate.current) {
      isExternalUpdate.current = true;
      setGrossIncome(initialValues.grossIncome.toString());
      setUseDeclaredSalary(initialValues.declaredSalary !== undefined);
      setDeclaredSalary(initialValues.declaredSalary?.toString() ?? '');
      setDependents(initialValues.dependents);
      setOtherDeductions(initialValues.otherDeductions.toString());
      setHasInsurance(initialValues.hasInsurance);
      setInsuranceOptions(initialValues.insuranceOptions);
      setRegion(initialValues.region);
      setPensionContribution(initialValues.pensionContribution.toString());
      if (initialValues.allowances) {
        setAllowances(initialValues.allowances);
        // Only auto-open if there are non-zero allowances (e.g., from URL)
        // Never auto-close if user manually opened
        const hasAnyAllowance = Object.values(initialValues.allowances).some(v => v !== 0);
        if (hasAnyAllowance) {
          setShowAllowances(true);
        }
      }
      setTimeout(() => {
        isExternalUpdate.current = false;
      }, 0);
    }
  }, [initialValues]);

  const handleIncomeChange = (value: string) => {
    const stripped = value.replace(/[^\d]/g, '');
    if (stripped === '') {
      setGrossIncome('');
      setGrossWarning(null);
      return;
    }
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    setGrossIncome(parsed.value.toString());
    setGrossWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
  };

  const handleDeclaredSalaryChange = (value: string) => {
    const stripped = value.replace(/[^\d]/g, '');
    if (stripped === '') {
      setDeclaredSalary('');
      setDeclaredWarning(null);
      return;
    }
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    setDeclaredSalary(parsed.value.toString());
    setDeclaredWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
  };

  const handleOtherDeductionsChange = (value: string) => {
    const stripped = value.replace(/[^\d]/g, '');
    if (stripped === '') {
      setOtherDeductions('');
      setOtherDeductionWarning(null);
      return;
    }
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    setOtherDeductions(parsed.value.toString());
    setOtherDeductionWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
  };

  const handlePensionChange = (value: string) => {
    const stripped = value.replace(/[^\d]/g, '');
    if (stripped === '') {
      setPensionContribution('');
      setPensionWarning(null);
      return;
    }
    const parsed = parseCurrencyInput(value, { max: 1_000_000 });
    setPensionContribution(parsed.value.toString());
    setPensionWarning(buildWarning(parsed.issues, 1_000_000));
  };

  const handleInsuranceToggle = (type: keyof InsuranceOptions) => {
    setInsuranceOptions(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleAllowanceChange = (field: keyof AllowancesState, value: string) => {
    const parsed = parseCurrencyInput(value, { max: MAX_MONTHLY_INCOME });
    setAllowances(prev => ({
      ...prev,
      [field]: parsed.value,
    }));
    setAllowanceWarning(buildWarning(parsed.issues, MAX_MONTHLY_INCOME));
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

  // Sync hasInsurance with individual options
  useEffect(() => {
    const allEnabled = insuranceOptions.bhxh && insuranceOptions.bhyt && insuranceOptions.bhtn;
    const allDisabled = !insuranceOptions.bhxh && !insuranceOptions.bhyt && !insuranceOptions.bhtn;
    if (allDisabled && hasInsurance) {
      setHasInsurance(false);
    } else if (allEnabled && !hasInsurance) {
      setHasInsurance(true);
    }
  }, [insuranceOptions, hasInsurance]);

  useEffect(() => {
    const income = parseInt(grossIncome, 10) || 0;
    const declared = useDeclaredSalary ? (parseInt(declaredSalary, 10) || income) : undefined;
    const other = parseInt(otherDeductions, 10) || 0;
    const pension = parseInt(pensionContribution, 10) || 0;
    // Only include allowances if showAllowances is enabled
    const effectiveAllowances = showAllowances ? allowances : undefined;
    onCalculate({
      grossIncome: income,
      declaredSalary: declared,
      dependents,
      otherDeductions: other,
      hasInsurance,
      insuranceOptions,
      region,
      pensionContribution: pension,
      allowances: effectiveAllowances,
    });
  }, [grossIncome, useDeclaredSalary, declaredSalary, dependents, otherDeductions, hasInsurance, insuranceOptions, region, pensionContribution, showAllowances, allowances, onCalculate]);

  const presetIncomes = [15_000_000, 20_000_000, 30_000_000, 50_000_000, 80_000_000, 100_000_000];

  const insuranceItems = [
    { key: 'bhxh' as const, label: 'BHXH', rate: '8%' },
    { key: 'bhyt' as const, label: 'BHYT', rate: '1.5%' },
    { key: 'bhtn' as const, label: 'BHTN', rate: '1%' },
  ];

  const InfoIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Thông tin thu nhập
      </h2>

      <div className="space-y-6">
        {/* Thu nhập thực tế */}
        <div>
          <label htmlFor="gross-income" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <span>Thu nhập thực tế hàng tháng (VNĐ)</span>
            <span className="text-red-500" aria-hidden="true">*</span>
            <Tooltip content="Lương tổng trước khi trừ bảo hiểm và thuế">
              <span className="text-gray-500 hover:text-gray-700 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </label>
          <input
            id="gross-income"
            type="text"
            value={displayCurrency(grossIncome)}
            onChange={(e) => handleIncomeChange(e.target.value)}
            onBlur={() => { if (grossIncome === '') setGrossIncome('0'); }}
            className="input-field text-lg font-semibold"
            placeholder="Nhập thu nhập"
            aria-required="true"
            aria-describedby="gross-income-presets"
          />
          {grossWarning && (
            <p className="text-xs text-amber-600 mt-2">{grossWarning}</p>
          )}
          <div id="gross-income-presets" className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Mức thu nhập mẫu">
            {presetIncomes.map((income) => (
              <button
                key={income}
                onClick={() => {
                  setGrossIncome(income.toString());
                  setGrossWarning(null);
                }}
                aria-label={`Chọn mức thu nhập ${formatNumber(income)} VNĐ`}
                aria-pressed={parseInt(grossIncome, 10) === income}
                className={`px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-sm rounded-full transition-colors ${
                  parseInt(grossIncome, 10) === income
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {formatNumber(income)}
              </button>
            ))}
          </div>
        </div>

        {/* Lương đóng bảo hiểm */}
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <label htmlFor="use-declared-salary" className="flex items-center gap-3 cursor-pointer mb-3 min-h-[44px] py-2">
            <span className="relative flex items-center justify-center w-[44px] h-[44px] -m-2">
              <input
                id="use-declared-salary"
                type="checkbox"
                checked={useDeclaredSalary}
                onChange={(e) => setUseDeclaredSalary(e.target.checked)}
                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
              />
            </span>
            <span className="text-sm font-medium text-gray-700">
              Lương đóng BH khác lương thực
            </span>
          </label>
          {useDeclaredSalary && (
            <div>
              <label htmlFor="declared-salary" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Lương đóng BHXH, BHYT, BHTN (VNĐ)</span>
                <Tooltip content="Mức lương công ty đăng ký đóng bảo hiểm. Bảo hiểm sẽ tính trên mức này, còn thuế TNCN vẫn tính trên lương thực nhận.">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                id="declared-salary"
                type="text"
                value={displayCurrency(declaredSalary)}
                onChange={(e) => handleDeclaredSalaryChange(e.target.value)}
                className="input-field"
                placeholder="Ví dụ: lương thực 30tr, đóng BH trên 5tr"
                aria-describedby="declared-salary-hint"
              />
              {declaredWarning && (
                <p className="text-xs text-amber-600 mt-1">{declaredWarning}</p>
              )}
              <p id="declared-salary-hint" className="text-xs text-amber-600 mt-1">
                Bảo hiểm tính trên mức này • Thuế tính trên lương thực ({grossIncome ? formatNumber(parseInt(grossIncome, 10)) : '0'}đ)
              </p>
            </div>
          )}
        </div>

        {/* Số người phụ thuộc */}
        <div>
          <label id="dependents-label" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <span>Số người phụ thuộc</span>
            <Tooltip content="Con cái dưới 18 tuổi, cha mẹ trên 60 tuổi không có thu nhập, v.v.">
              <span className="text-gray-500 hover:text-gray-700 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </label>
          <div className="flex items-center gap-4" role="group" aria-labelledby="dependents-label">
            <button
              onClick={() => setDependents(Math.max(0, dependents - 1))}
              aria-label="Giảm số người phụ thuộc"
              disabled={dependents === 0}
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold text-gray-700 transition-colors"
            >
              -
            </button>
            <span className="text-3xl font-bold text-gray-800 w-16 text-center" aria-live="polite" aria-atomic="true">
              {dependents}
            </span>
            <button
              onClick={() => setDependents(dependents + 1)}
              aria-label="Tăng số người phụ thuộc"
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center text-xl font-bold text-primary-700 transition-colors"
            >
              +
            </button>
          </div>
          <p id="dependents-hint" className="text-sm text-gray-500 mt-2">
            Người phụ thuộc: con cái, cha mẹ không có thu nhập...
          </p>
        </div>

        {/* Vùng lương */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <span>Vùng lương tối thiểu</span>
            <Tooltip content="Vùng lương tối thiểu ảnh hưởng đến mức đóng BHTN">
              <span className="text-gray-500 hover:text-gray-700 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </label>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2" role="group" aria-label="Chọn vùng lương">
            {([1, 2, 3, 4] as RegionType[]).map((r) => {
              const info = regionalMinimumWages[r];
              const isSelected = region === r;
              return (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  aria-pressed={isSelected}
                  className={`p-2.5 min-h-[44px] rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-xs text-gray-800">{info.name}</div>
                  <div className="text-xs text-primary-600 font-medium">
                    {formatCurrency(info.wage)}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {regionalMinimumWages[region].description}
          </p>
        </div>

        {/* Bảo hiểm - Individual toggles */}
        <fieldset>
          <legend className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-3">
            <span>Các khoản bảo hiểm bắt buộc</span>
            <Tooltip content="Bảo hiểm xã hội, y tế, thất nghiệp theo quy định">
              <span className="text-gray-500 hover:text-gray-700 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </legend>
          <div className="space-y-1">
            {insuranceItems.map(item => (
              <label key={item.key} htmlFor={`insurance-${item.key}`} className="flex items-center gap-3 cursor-pointer min-h-[44px] py-1">
                <span className="relative flex items-center justify-center w-[44px] h-[44px] -m-2">
                  <input
                    id={`insurance-${item.key}`}
                    type="checkbox"
                    checked={insuranceOptions[item.key]}
                    onChange={() => handleInsuranceToggle(item.key)}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                </span>
                <span className="text-sm text-gray-700">
                  {item.label} <span className="text-gray-500">({item.rate})</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2" aria-live="polite">
            Tổng: {((insuranceOptions.bhxh ? 8 : 0) + (insuranceOptions.bhyt ? 1.5 : 0) + (insuranceOptions.bhtn ? 1 : 0)).toFixed(1)}%
          </p>
        </fieldset>

        {/* Toggle advanced options */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 min-h-[44px] py-2"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Các khoản giảm trừ khác
        </button>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-primary-100" role="region" aria-label="Các khoản giảm trừ khác">
            {/* Quỹ hưu trí tự nguyện */}
            <div>
              <label htmlFor="pension-contribution" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Quỹ hưu trí tự nguyện (VNĐ/tháng)</span>
                <Tooltip content="Tối đa 1 triệu/tháng được giảm trừ">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                id="pension-contribution"
                type="text"
                value={displayCurrency(pensionContribution)}
                onBlur={() => { if (pensionContribution === '') setPensionContribution('0'); }}
                onChange={(e) => handlePensionChange(e.target.value)}
                className="input-field"
                placeholder="Tối đa 1.000.000"
                aria-describedby="pension-contribution-hint"
              />
              {pensionWarning && (
                <p className="text-xs text-amber-600 mt-1">{pensionWarning}</p>
              )}
              <p id="pension-contribution-hint" className="text-xs text-gray-500 mt-1">
                Tối đa 1.000.000 VNĐ/tháng được giảm trừ
              </p>
            </div>

            {/* Đóng góp từ thiện */}
            <div>
              <label htmlFor="other-deductions" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Đóng góp từ thiện, nhân đạo (VNĐ)</span>
                <Tooltip content="Các khoản giảm trừ bổ sung như từ thiện, nhân đạo">
                  <span className="text-gray-500 hover:text-gray-700 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                id="other-deductions"
                type="text"
                value={displayCurrency(otherDeductions)}
                onBlur={() => { if (otherDeductions === '') setOtherDeductions('0'); }}
                onChange={(e) => handleOtherDeductionsChange(e.target.value)}
                className="input-field"
                placeholder="Đóng góp từ thiện..."
                aria-describedby="other-deductions-hint"
              />
              {otherDeductionWarning && (
                <p className="text-xs text-amber-600 mt-1">{otherDeductionWarning}</p>
              )}
              <p id="other-deductions-hint" className="text-xs text-gray-500 mt-1">
                Đóng góp qua các tổ chức từ thiện được công nhận
              </p>
            </div>
          </div>
        )}

        {/* Toggle allowances section */}
        <button
          onClick={() => setShowAllowances(!showAllowances)}
          aria-expanded={showAllowances}
          className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 min-h-[44px] py-2"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAllowances ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Phụ cấp (ăn trưa, điện thoại, độc hại...)
        </button>

        {showAllowances && (
          <div className="space-y-4 bg-green-50 rounded-lg p-4 border border-green-200">
            {allowanceWarning && (
              <p className="text-xs text-amber-600">{allowanceWarning}</p>
            )}
            {/* Tax-exempt allowances */}
            <div>
              <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Phụ cấp MIỄN THUẾ
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
                {/* Meal allowance */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <span>Tiền ăn trưa/ăn ca</span>
                    <Tooltip content="Không giới hạn (từ 15/6/2025). Phải ghi trong HĐLĐ hoặc quy chế công ty.">
                      <span className="text-gray-500 hover:text-gray-700 cursor-help">
                        <InfoIcon />
                      </span>
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    value={allowances.meal ? formatNumber(allowances.meal) : ''}
                    onChange={(e) => handleAllowanceChange('meal', e.target.value)}
                    className="input-field text-sm"
                    placeholder="VNĐ/tháng"
                  />
                </div>

                {/* Phone allowance */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <span>Phụ cấp điện thoại</span>
                    <Tooltip content="Không giới hạn. Phục vụ công việc, cần có hóa đơn.">
                      <span className="text-gray-500 hover:text-gray-700 cursor-help">
                        <InfoIcon />
                      </span>
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    value={allowances.phone ? formatNumber(allowances.phone) : ''}
                    onChange={(e) => handleAllowanceChange('phone', e.target.value)}
                    className="input-field text-sm"
                    placeholder="VNĐ/tháng"
                  />
                </div>

                {/* Transport allowance */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <span>Xăng xe, đi lại</span>
                    <Tooltip content="Không giới hạn. Phục vụ công việc, cần chứng từ.">
                      <span className="text-gray-500 hover:text-gray-700 cursor-help">
                        <InfoIcon />
                      </span>
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    value={allowances.transport ? formatNumber(allowances.transport) : ''}
                    onChange={(e) => handleAllowanceChange('transport', e.target.value)}
                    className="input-field text-sm"
                    placeholder="VNĐ/tháng"
                  />
                </div>

                {/* Clothing allowance */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <span>Phụ cấp trang phục</span>
                    <Tooltip content={`Miễn thuế tối đa ${formatNumber(ALLOWANCE_LIMITS.clothingMonthlyMax)}đ/tháng (5tr/năm). Phần vượt chịu thuế.`}>
                      <span className="text-gray-500 hover:text-gray-700 cursor-help">
                        <InfoIcon />
                      </span>
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    value={allowances.clothing ? formatNumber(allowances.clothing) : ''}
                    onChange={(e) => handleAllowanceChange('clothing', e.target.value)}
                    className="input-field text-sm"
                    placeholder="VNĐ/tháng"
                  />
                  {allowances.clothing > ALLOWANCE_LIMITS.clothingMonthlyMax && (
                    <p className="text-xs text-amber-600 mt-1">
                      Vượt {formatNumber(allowances.clothing - ALLOWANCE_LIMITS.clothingMonthlyMax)}đ sẽ chịu thuế
                    </p>
                  )}
                </div>

                {/* Hazardous allowance */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <span>Phụ cấp độc hại, nguy hiểm</span>
                    <Tooltip content="Miễn thuế nếu thuộc danh mục nghề độc hại (TT 11/2020). Mức 5-15% lương cơ sở.">
                      <span className="text-gray-500 hover:text-gray-700 cursor-help">
                        <InfoIcon />
                      </span>
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    value={allowances.hazardous ? formatNumber(allowances.hazardous) : ''}
                    onChange={(e) => handleAllowanceChange('hazardous', e.target.value)}
                    className="input-field text-sm"
                    placeholder="VNĐ/tháng (nếu đủ điều kiện)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cần thuộc danh mục nghề độc hại theo Thông tư 11/2020
                  </p>
                </div>
              </div>
            </div>

            {/* Taxable allowances */}
            <div className="pt-3 border-t border-green-200">
              <h4 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Phụ cấp CHỊU THUẾ (như lương)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
                {/* Housing allowance */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <span>Tiền thuê nhà</span>
                    <Tooltip content="Chịu thuế như lương. Cộng vào thu nhập tính thuế.">
                      <span className="text-gray-500 hover:text-gray-700 cursor-help">
                        <InfoIcon />
                      </span>
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    value={allowances.housing ? formatNumber(allowances.housing) : ''}
                    onChange={(e) => handleAllowanceChange('housing', e.target.value)}
                    className="input-field text-sm"
                    placeholder="VNĐ/tháng"
                  />
                </div>

                {/* Position allowance */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <span>Phụ cấp chức vụ/trách nhiệm</span>
                    <Tooltip content="Chịu thuế như lương. Cộng vào thu nhập tính thuế.">
                      <span className="text-gray-500 hover:text-gray-700 cursor-help">
                        <InfoIcon />
                      </span>
                    </Tooltip>
                  </label>
                  <input
                    type="text"
                    value={allowances.position ? formatNumber(allowances.position) : ''}
                    onChange={(e) => handleAllowanceChange('position', e.target.value)}
                    className="input-field text-sm"
                    placeholder="VNĐ/tháng"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            {(() => {
              const breakdown = calculateAllowancesBreakdown(allowances);
              if (breakdown.total === 0) return null;
              return (
                <div className="pt-3 border-t border-green-200 bg-white rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-800 mb-2">
                    Tổng phụ cấp: {formatCurrency(breakdown.total)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-green-700">
                      Miễn thuế: {formatCurrency(breakdown.taxExempt)}
                    </div>
                    <div className="text-amber-700">
                      Chịu thuế: {formatCurrency(breakdown.taxable)}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize TaxInput to prevent unnecessary re-renders when parent state changes
export default memo(TaxInputComponent);
