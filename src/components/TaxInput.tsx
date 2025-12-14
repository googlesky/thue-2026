'use client';

import { useState, useEffect, useRef } from 'react';
import { formatNumber, RegionType, REGIONAL_MINIMUM_WAGES, formatCurrency, InsuranceOptions, DEFAULT_INSURANCE_OPTIONS, AllowancesState, DEFAULT_ALLOWANCES, ALLOWANCE_LIMITS, calculateAllowancesBreakdown } from '@/lib/taxCalculator';
import Tooltip from '@/components/ui/Tooltip';

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

export default function TaxInput({ onCalculate, initialValues }: TaxInputProps) {
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
    const numericValue = value.replace(/[^\d]/g, '');
    setGrossIncome(numericValue);
  };

  const handleDeclaredSalaryChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setDeclaredSalary(numericValue);
  };

  const handleOtherDeductionsChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setOtherDeductions(numericValue);
  };

  const handlePensionChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    // Giới hạn tối đa 1 triệu/tháng
    const amount = Math.min(parseInt(numericValue, 10) || 0, 1_000_000);
    setPensionContribution(amount.toString());
  };

  const handleInsuranceToggle = (type: keyof InsuranceOptions) => {
    setInsuranceOptions(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleAllowanceChange = (field: keyof AllowancesState, value: string) => {
    const numericValue = parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
    setAllowances(prev => ({
      ...prev,
      [field]: numericValue,
    }));
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
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <span>Thu nhập thực tế hàng tháng (VNĐ)</span>
            <Tooltip content="Lương tổng trước khi trừ bảo hiểm và thuế">
              <span className="text-gray-400 hover:text-gray-600 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </label>
          <input
            type="text"
            value={formatNumber(parseInt(grossIncome, 10) || 0)}
            onChange={(e) => handleIncomeChange(e.target.value)}
            className="input-field text-lg font-semibold"
            placeholder="Nhập thu nhập"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {presetIncomes.map((income) => (
              <button
                key={income}
                onClick={() => setGrossIncome(income.toString())}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
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
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={useDeclaredSalary}
              onChange={(e) => setUseDeclaredSalary(e.target.checked)}
              className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Lương đóng BH khác lương thực
            </span>
          </label>
          {useDeclaredSalary && (
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Lương đóng BHXH, BHYT, BHTN (VNĐ)</span>
                <Tooltip content="Mức lương công ty đăng ký đóng bảo hiểm. Bảo hiểm sẽ tính trên mức này, còn thuế TNCN vẫn tính trên lương thực nhận.">
                  <span className="text-gray-400 hover:text-gray-600 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                type="text"
                value={declaredSalary ? formatNumber(parseInt(declaredSalary, 10) || 0) : ''}
                onChange={(e) => handleDeclaredSalaryChange(e.target.value)}
                className="input-field"
                placeholder="Ví dụ: lương thực 30tr, đóng BH trên 5tr"
              />
              <p className="text-xs text-amber-600 mt-1">
                Bảo hiểm tính trên mức này • Thuế tính trên lương thực ({grossIncome ? formatNumber(parseInt(grossIncome, 10)) : '0'}đ)
              </p>
            </div>
          )}
        </div>

        {/* Số người phụ thuộc */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <span>Số người phụ thuộc</span>
            <Tooltip content="Con cái dưới 18 tuổi, cha mẹ trên 60 tuổi không có thu nhập, v.v.">
              <span className="text-gray-400 hover:text-gray-600 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDependents(Math.max(0, dependents - 1))}
              className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700 transition-colors"
            >
              -
            </button>
            <span className="text-3xl font-bold text-gray-800 w-16 text-center">
              {dependents}
            </span>
            <button
              onClick={() => setDependents(dependents + 1)}
              className="w-12 h-12 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center text-xl font-bold text-primary-700 transition-colors"
            >
              +
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Người phụ thuộc: con cái, cha mẹ không có thu nhập...
          </p>
        </div>

        {/* Vùng lương */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <span>Vùng lương tối thiểu</span>
            <Tooltip content="Vùng lương tối thiểu ảnh hưởng đến mức đóng BHTN">
              <span className="text-gray-400 hover:text-gray-600 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([1, 2, 3, 4] as RegionType[]).map((r) => {
              const info = REGIONAL_MINIMUM_WAGES[r];
              const isSelected = region === r;
              return (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`p-2.5 rounded-lg border-2 text-left transition-all ${
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
            {REGIONAL_MINIMUM_WAGES[region].description}
          </p>
        </div>

        {/* Bảo hiểm - Individual toggles */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-3">
            <span>Các khoản bảo hiểm bắt buộc</span>
            <Tooltip content="Bảo hiểm xã hội, y tế, thất nghiệp theo quy định">
              <span className="text-gray-400 hover:text-gray-600 cursor-help">
                <InfoIcon />
              </span>
            </Tooltip>
          </label>
          <div className="space-y-2">
            {insuranceItems.map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={insuranceOptions[item.key]}
                  onChange={() => handleInsuranceToggle(item.key)}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  {item.label} <span className="text-gray-500">({item.rate})</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tổng: {((insuranceOptions.bhxh ? 8 : 0) + (insuranceOptions.bhyt ? 1.5 : 0) + (insuranceOptions.bhtn ? 1 : 0)).toFixed(1)}%
          </p>
        </div>

        {/* Toggle advanced options */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Các khoản giảm trừ khác
        </button>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-primary-100">
            {/* Quỹ hưu trí tự nguyện */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Quỹ hưu trí tự nguyện (VNĐ/tháng)</span>
                <Tooltip content="Tối đa 1 triệu/tháng được giảm trừ">
                  <span className="text-gray-400 hover:text-gray-600 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                type="text"
                value={formatNumber(parseInt(pensionContribution, 10) || 0)}
                onChange={(e) => handlePensionChange(e.target.value)}
                className="input-field"
                placeholder="Tối đa 1.000.000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tối đa 1.000.000 VNĐ/tháng được giảm trừ
              </p>
            </div>

            {/* Đóng góp từ thiện */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                <span>Đóng góp từ thiện, nhân đạo (VNĐ)</span>
                <Tooltip content="Các khoản giảm trừ bổ sung như từ thiện, nhân đạo">
                  <span className="text-gray-400 hover:text-gray-600 cursor-help">
                    <InfoIcon />
                  </span>
                </Tooltip>
              </label>
              <input
                type="text"
                value={formatNumber(parseInt(otherDeductions, 10) || 0)}
                onChange={(e) => handleOtherDeductionsChange(e.target.value)}
                className="input-field"
                placeholder="Đóng góp từ thiện..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Đóng góp qua các tổ chức từ thiện được công nhận
              </p>
            </div>
          </div>
        )}

        {/* Toggle allowances section */}
        <button
          onClick={() => setShowAllowances(!showAllowances)}
          className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAllowances ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Phụ cấp (ăn trưa, điện thoại, độc hại...)
        </button>

        {showAllowances && (
          <div className="space-y-4 bg-green-50 rounded-lg p-4 border border-green-200">
            {/* Tax-exempt allowances */}
            <div>
              <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Phụ cấp MIỄN THUẾ
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Meal allowance */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <span>Tiền ăn trưa/ăn ca</span>
                    <Tooltip content="Không giới hạn (từ 15/6/2025). Phải ghi trong HĐLĐ hoặc quy chế công ty.">
                      <span className="text-gray-400 hover:text-gray-600 cursor-help">
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
                      <span className="text-gray-400 hover:text-gray-600 cursor-help">
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
                      <span className="text-gray-400 hover:text-gray-600 cursor-help">
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
                      <span className="text-gray-400 hover:text-gray-600 cursor-help">
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
                      <span className="text-gray-400 hover:text-gray-600 cursor-help">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Housing allowance */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <span>Tiền thuê nhà</span>
                    <Tooltip content="Chịu thuế như lương. Cộng vào thu nhập tính thuế.">
                      <span className="text-gray-400 hover:text-gray-600 cursor-help">
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
                      <span className="text-gray-400 hover:text-gray-600 cursor-help">
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
