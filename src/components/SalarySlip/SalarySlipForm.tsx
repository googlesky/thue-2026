'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Tooltip from '@/components/ui/Tooltip';
import {
  SalarySlipData,
  CompanyInfo,
  EmployeeInfo,
  PayPeriod,
  EarningsSection,
  DeductionsSection,
  EarningsItem,
  ALLOWANCE_PRESETS,
  VIETNAMESE_MONTHS,
  STORAGE_KEYS,
  DEFAULT_COMPANY_INFO,
  DEFAULT_EMPLOYEE_INFO,
} from './types';

interface SalarySlipFormProps {
  data: SalarySlipData;
  onChange: (data: SalarySlipData) => void;
  grossIncome?: number; // Pre-filled from calculator
  insuranceDeductions?: {
    bhxh: number;
    bhyt: number;
    bhtn: number;
  };
  taxAmount?: number;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function parseMoney(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
}

export default function SalarySlipForm({
  data,
  onChange,
  grossIncome,
  insuranceDeductions,
  taxAmount,
}: SalarySlipFormProps) {
  // Local input states for formatted display
  const [localInputs, setLocalInputs] = useState<Record<string, string>>({});
  const [showAllowanceSelector, setShowAllowanceSelector] = useState(false);
  const [newAllowanceLabel, setNewAllowanceLabel] = useState('');

  // Generate year options (current year - 2 to current year + 1)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Load saved company info on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCompany = localStorage.getItem(STORAGE_KEYS.COMPANY_INFO);
      const savedEmployee = localStorage.getItem(STORAGE_KEYS.EMPLOYEE_INFO);

      if (savedCompany && !data.company.name) {
        try {
          const parsedCompany = JSON.parse(savedCompany) as CompanyInfo;
          onChange({ ...data, company: { ...data.company, ...parsedCompany } });
        } catch {
          // Ignore parse errors
        }
      }

      if (savedEmployee && !data.employee.name) {
        try {
          const parsedEmployee = JSON.parse(savedEmployee) as EmployeeInfo;
          onChange({ ...data, employee: { ...data.employee, ...parsedEmployee } });
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Pre-fill from calculator when available
  useEffect(() => {
    if (grossIncome !== undefined && data.earnings.basicSalary === 0) {
      const newEarnings = { ...data.earnings, basicSalary: grossIncome };
      onChange({ ...data, earnings: newEarnings });
    }
    if (insuranceDeductions) {
      const newDeductions = {
        ...data.deductions,
        bhxh: insuranceDeductions.bhxh,
        bhyt: insuranceDeductions.bhyt,
        bhtn: insuranceDeductions.bhtn,
      };
      onChange({ ...data, deductions: newDeductions });
    }
    if (taxAmount !== undefined) {
      const newDeductions = { ...data.deductions, personalIncomeTax: taxAmount };
      onChange({ ...data, deductions: newDeductions });
    }
  }, [grossIncome, insuranceDeductions, taxAmount]);

  // Save company info to localStorage
  const saveCompanyInfo = useCallback(() => {
    if (typeof window !== 'undefined' && data.company.name) {
      localStorage.setItem(STORAGE_KEYS.COMPANY_INFO, JSON.stringify(data.company));
    }
  }, [data.company]);

  // Save employee info to localStorage
  const saveEmployeeInfo = useCallback(() => {
    if (typeof window !== 'undefined' && data.employee.name) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEE_INFO, JSON.stringify(data.employee));
    }
  }, [data.employee]);

  // Handle company info changes
  const handleCompanyChange = useCallback(
    (field: keyof CompanyInfo, value: string) => {
      const newCompany = { ...data.company, [field]: value };
      onChange({ ...data, company: newCompany });
    },
    [data, onChange]
  );

  // Handle employee info changes
  const handleEmployeeChange = useCallback(
    (field: keyof EmployeeInfo, value: string) => {
      const newEmployee = { ...data.employee, [field]: value };
      onChange({ ...data, employee: newEmployee });
    },
    [data, onChange]
  );

  // Handle pay period changes
  const handlePayPeriodChange = useCallback(
    (field: keyof PayPeriod, value: number) => {
      const newPayPeriod = { ...data.payPeriod, [field]: value };
      onChange({ ...data, payPeriod: newPayPeriod });
    },
    [data, onChange]
  );

  // Handle earnings changes
  const handleEarningsChange = useCallback(
    (field: keyof Omit<EarningsSection, 'allowances'>, value: number) => {
      const newEarnings = { ...data.earnings, [field]: value };
      onChange({ ...data, earnings: newEarnings });
    },
    [data, onChange]
  );

  // Handle deductions changes
  const handleDeductionsChange = useCallback(
    (field: keyof DeductionsSection, value: number) => {
      const newDeductions = { ...data.deductions, [field]: value };
      onChange({ ...data, deductions: newDeductions });
    },
    [data, onChange]
  );

  // Handle allowance add
  const handleAddAllowance = useCallback(
    (preset?: { id: string; label: string }) => {
      const newAllowance: EarningsItem = {
        id: preset?.id || `custom-${Date.now()}`,
        label: preset?.label || newAllowanceLabel || 'Phụ cấp mới',
        amount: 0,
      };
      const newAllowances = [...data.earnings.allowances, newAllowance];
      const newEarnings = { ...data.earnings, allowances: newAllowances };
      onChange({ ...data, earnings: newEarnings });
      setShowAllowanceSelector(false);
      setNewAllowanceLabel('');
    },
    [data, onChange, newAllowanceLabel]
  );

  // Handle allowance update
  const handleUpdateAllowance = useCallback(
    (id: string, field: 'label' | 'amount', value: string | number) => {
      const newAllowances = data.earnings.allowances.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      );
      const newEarnings = { ...data.earnings, allowances: newAllowances };
      onChange({ ...data, earnings: newEarnings });
    },
    [data, onChange]
  );

  // Handle allowance remove
  const handleRemoveAllowance = useCallback(
    (id: string) => {
      const newAllowances = data.earnings.allowances.filter((a) => a.id !== id);
      const newEarnings = { ...data.earnings, allowances: newAllowances };
      onChange({ ...data, earnings: newEarnings });
    },
    [data, onChange]
  );

  // Handle money input with formatting
  const handleMoneyInput = useCallback(
    (
      inputId: string,
      value: string,
      updateFn: (val: number) => void
    ) => {
      const numericValue = value.replace(/[^\d]/g, '');
      setLocalInputs((prev) => ({ ...prev, [inputId]: numericValue }));
      updateFn(parseInt(numericValue) || 0);
    },
    []
  );

  const handleMoneyBlur = useCallback((inputId: string, value: number) => {
    setLocalInputs((prev) => ({ ...prev, [inputId]: formatMoney(value) }));
  }, []);

  const handleMoneyFocus = useCallback((inputId: string, value: number) => {
    setLocalInputs((prev) => ({ ...prev, [inputId]: value.toString() }));
  }, []);

  const getInputValue = useCallback(
    (inputId: string, actualValue: number): string => {
      return localInputs[inputId] ?? formatMoney(actualValue);
    },
    [localInputs]
  );

  // Clear saved data
  const handleClearSavedData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.COMPANY_INFO);
      localStorage.removeItem(STORAGE_KEYS.EMPLOYEE_INFO);
    }
    onChange({
      ...data,
      company: DEFAULT_COMPANY_INFO,
      employee: DEFAULT_EMPLOYEE_INFO,
    });
  }, [data, onChange]);

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-lg">🏢</span>
            Thông tin công ty
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveCompanyInfo}
              className="text-xs px-2 py-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
              title="Lưu thông tin công ty"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={handleClearSavedData}
              className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
              title="Xóa dữ liệu đã lưu"
            >
              Xóa
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
              Tên công ty <span className="text-red-500">*</span>
            </label>
            <input
              id="company-name"
              type="text"
              value={data.company.name}
              onChange={(e) => handleCompanyChange('name', e.target.value)}
              className="input-field"
              placeholder="Ví dụ: Công ty TNHH ABC"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="company-address" className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ <span className="text-red-500">*</span>
            </label>
            <input
              id="company-address"
              type="text"
              value={data.company.address}
              onChange={(e) => handleCompanyChange('address', e.target.value)}
              className="input-field"
              placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
            />
          </div>
        </div>
      </div>

      {/* Employee Information */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-lg">👤</span>
            Thông tin nhân viên
          </h3>
          <button
            type="button"
            onClick={saveEmployeeInfo}
            className="text-xs px-2 py-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="Lưu thông tin nhân viên"
          >
            Lưu
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="employee-name" className="block text-sm font-medium text-gray-700 mb-1">
              Họ tên nhân viên <span className="text-red-500">*</span>
            </label>
            <input
              id="employee-name"
              type="text"
              value={data.employee.name}
              onChange={(e) => handleEmployeeChange('name', e.target.value)}
              className="input-field"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <label htmlFor="employee-id" className="block text-sm font-medium text-gray-700 mb-1">
              Mã nhân viên
            </label>
            <input
              id="employee-id"
              type="text"
              value={data.employee.employeeId || ''}
              onChange={(e) => handleEmployeeChange('employeeId', e.target.value)}
              className="input-field"
              placeholder="NV001"
            />
          </div>
          <div>
            <label htmlFor="employee-position" className="block text-sm font-medium text-gray-700 mb-1">
              Chức vụ
            </label>
            <input
              id="employee-position"
              type="text"
              value={data.employee.position || ''}
              onChange={(e) => handleEmployeeChange('position', e.target.value)}
              className="input-field"
              placeholder="Nhân viên / Trưởng phòng"
            />
          </div>
          <div>
            <label htmlFor="employee-department" className="block text-sm font-medium text-gray-700 mb-1">
              Phòng ban
            </label>
            <input
              id="employee-department"
              type="text"
              value={data.employee.department || ''}
              onChange={(e) => handleEmployeeChange('department', e.target.value)}
              className="input-field"
              placeholder="Phòng IT / Phòng Kinh doanh"
            />
          </div>
          <div>
            <label htmlFor="bank-account" className="block text-sm font-medium text-gray-700 mb-1">
              Số tài khoản
            </label>
            <input
              id="bank-account"
              type="text"
              value={data.employee.bankAccount || ''}
              onChange={(e) => handleEmployeeChange('bankAccount', e.target.value)}
              className="input-field"
              placeholder="0123456789"
            />
          </div>
          <div>
            <label htmlFor="bank-name" className="block text-sm font-medium text-gray-700 mb-1">
              Ngân hàng
            </label>
            <input
              id="bank-name"
              type="text"
              value={data.employee.bankName || ''}
              onChange={(e) => handleEmployeeChange('bankName', e.target.value)}
              className="input-field"
              placeholder="Vietcombank / BIDV / Techcombank"
            />
          </div>
        </div>
      </div>

      {/* Pay Period */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">📅</span>
          Kỳ lương
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pay-month" className="block text-sm font-medium text-gray-700 mb-1">
              Tháng <span className="text-red-500">*</span>
            </label>
            <select
              id="pay-month"
              value={data.payPeriod.month}
              onChange={(e) => handlePayPeriodChange('month', parseInt(e.target.value))}
              className="input-field"
            >
              {VIETNAMESE_MONTHS.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pay-year" className="block text-sm font-medium text-gray-700 mb-1">
              Năm <span className="text-red-500">*</span>
            </label>
            <select
              id="pay-year"
              value={data.payPeriod.year}
              onChange={(e) => handlePayPeriodChange('year', parseInt(e.target.value))}
              className="input-field"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Earnings Section */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">💵</span>
          Thu nhập
        </h3>

        <div className="space-y-4">
          {/* Basic Salary */}
          <div>
            <label htmlFor="basic-salary" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Lương cơ bản <span className="text-red-500">*</span>
              <Tooltip content="Mức lương cơ bản hàng tháng trước thuế">
                <span className="text-gray-400 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="basic-salary"
                type="text"
                value={getInputValue('basicSalary', data.earnings.basicSalary)}
                onChange={(e) =>
                  handleMoneyInput('basicSalary', e.target.value, (v) =>
                    handleEarningsChange('basicSalary', v)
                  )
                }
                onBlur={() => handleMoneyBlur('basicSalary', data.earnings.basicSalary)}
                onFocus={() => handleMoneyFocus('basicSalary', data.earnings.basicSalary)}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          {/* Allowances */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Phụ cấp</label>
              <button
                type="button"
                onClick={() => setShowAllowanceSelector(!showAllowanceSelector)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Thêm phụ cấp
              </button>
            </div>

            {/* Allowance Selector Dropdown */}
            {showAllowanceSelector && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-2">Chọn loại phụ cấp:</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {ALLOWANCE_PRESETS.filter(
                    (p) => !data.earnings.allowances.some((a) => a.id === p.id)
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleAddAllowance(preset)}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAllowanceLabel}
                    onChange={(e) => setNewAllowanceLabel(e.target.value)}
                    placeholder="Hoặc nhập tên phụ cấp tùy chỉnh..."
                    className="input-field text-sm flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddAllowance()}
                    disabled={!newAllowanceLabel}
                    className="px-3 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Thêm
                  </button>
                </div>
              </div>
            )}

            {/* Allowance List */}
            <div className="space-y-2">
              {data.earnings.allowances.map((allowance) => (
                <div key={allowance.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={allowance.label}
                    onChange={(e) => handleUpdateAllowance(allowance.id, 'label', e.target.value)}
                    className="input-field text-sm flex-1"
                    placeholder="Tên phụ cấp"
                  />
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={getInputValue(`allowance-${allowance.id}`, allowance.amount)}
                      onChange={(e) =>
                        handleMoneyInput(`allowance-${allowance.id}`, e.target.value, (v) =>
                          handleUpdateAllowance(allowance.id, 'amount', v)
                        )
                      }
                      onBlur={() => handleMoneyBlur(`allowance-${allowance.id}`, allowance.amount)}
                      onFocus={() => handleMoneyFocus(`allowance-${allowance.id}`, allowance.amount)}
                      className="input-field text-sm pr-10"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">đ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllowance(allowance.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Xóa phụ cấp"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {data.earnings.allowances.length === 0 && (
                <p className="text-sm text-gray-400 italic">Chưa có phụ cấp nào</p>
              )}
            </div>
          </div>

          {/* Overtime */}
          <div>
            <label htmlFor="overtime" className="block text-sm font-medium text-gray-700 mb-1">
              Làm thêm giờ
            </label>
            <div className="relative">
              <input
                id="overtime"
                type="text"
                value={getInputValue('overtime', data.earnings.overtime)}
                onChange={(e) =>
                  handleMoneyInput('overtime', e.target.value, (v) =>
                    handleEarningsChange('overtime', v)
                  )
                }
                onBlur={() => handleMoneyBlur('overtime', data.earnings.overtime)}
                onFocus={() => handleMoneyFocus('overtime', data.earnings.overtime)}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          {/* Bonus */}
          <div>
            <label htmlFor="bonus" className="block text-sm font-medium text-gray-700 mb-1">
              Thưởng
            </label>
            <div className="relative">
              <input
                id="bonus"
                type="text"
                value={getInputValue('bonus', data.earnings.bonus)}
                onChange={(e) =>
                  handleMoneyInput('bonus', e.target.value, (v) =>
                    handleEarningsChange('bonus', v)
                  )
                }
                onBlur={() => handleMoneyBlur('bonus', data.earnings.bonus)}
                onFocus={() => handleMoneyFocus('bonus', data.earnings.bonus)}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          {/* Other Earnings */}
          <div>
            <label htmlFor="other-earnings" className="block text-sm font-medium text-gray-700 mb-1">
              Thu nhập khác
            </label>
            <div className="relative">
              <input
                id="other-earnings"
                type="text"
                value={getInputValue('otherEarnings', data.earnings.otherEarnings)}
                onChange={(e) =>
                  handleMoneyInput('otherEarnings', e.target.value, (v) =>
                    handleEarningsChange('otherEarnings', v)
                  )
                }
                onBlur={() => handleMoneyBlur('otherEarnings', data.earnings.otherEarnings)}
                onFocus={() => handleMoneyFocus('otherEarnings', data.earnings.otherEarnings)}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deductions Section */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">📉</span>
          Các khoản khấu trừ
        </h3>

        <div className="space-y-4">
          {/* BHXH */}
          <div>
            <label htmlFor="bhxh" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              BHXH (8%)
              <Tooltip content="Bảo hiểm xã hội: 8% lương đóng BH">
                <span className="text-gray-400 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="bhxh"
                type="text"
                value={getInputValue('bhxh', data.deductions.bhxh)}
                onChange={(e) =>
                  handleMoneyInput('bhxh', e.target.value, (v) =>
                    handleDeductionsChange('bhxh', v)
                  )
                }
                onBlur={() => handleMoneyBlur('bhxh', data.deductions.bhxh)}
                onFocus={() => handleMoneyFocus('bhxh', data.deductions.bhxh)}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          {/* BHYT */}
          <div>
            <label htmlFor="bhyt" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              BHYT (1.5%)
              <Tooltip content="Bảo hiểm y tế: 1.5% lương đóng BH">
                <span className="text-gray-400 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="bhyt"
                type="text"
                value={getInputValue('bhyt', data.deductions.bhyt)}
                onChange={(e) =>
                  handleMoneyInput('bhyt', e.target.value, (v) =>
                    handleDeductionsChange('bhyt', v)
                  )
                }
                onBlur={() => handleMoneyBlur('bhyt', data.deductions.bhyt)}
                onFocus={() => handleMoneyFocus('bhyt', data.deductions.bhyt)}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          {/* BHTN */}
          <div>
            <label htmlFor="bhtn" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              BHTN (1%)
              <Tooltip content="Bảo hiểm thất nghiệp: 1% lương đóng BH">
                <span className="text-gray-400 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="bhtn"
                type="text"
                value={getInputValue('bhtn', data.deductions.bhtn)}
                onChange={(e) =>
                  handleMoneyInput('bhtn', e.target.value, (v) =>
                    handleDeductionsChange('bhtn', v)
                  )
                }
                onBlur={() => handleMoneyBlur('bhtn', data.deductions.bhtn)}
                onFocus={() => handleMoneyFocus('bhtn', data.deductions.bhtn)}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          {/* Personal Income Tax */}
          <div>
            <label htmlFor="pit" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Thuế TNCN
              <Tooltip content="Thuế thu nhập cá nhân theo biểu thuế lũy tiến">
                <span className="text-gray-400 cursor-help">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="pit"
                type="text"
                value={getInputValue('personalIncomeTax', data.deductions.personalIncomeTax)}
                onChange={(e) =>
                  handleMoneyInput('personalIncomeTax', e.target.value, (v) =>
                    handleDeductionsChange('personalIncomeTax', v)
                  )
                }
                onBlur={() => handleMoneyBlur('personalIncomeTax', data.deductions.personalIncomeTax)}
                onFocus={() => handleMoneyFocus('personalIncomeTax', data.deductions.personalIncomeTax)}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>

          {/* Other Deductions */}
          <div>
            <label htmlFor="other-deductions" className="block text-sm font-medium text-gray-700 mb-1">
              Khấu trừ khác
            </label>
            <div className="relative">
              <input
                id="other-deductions"
                type="text"
                value={getInputValue('otherDeductions', data.deductions.otherDeductions)}
                onChange={(e) =>
                  handleMoneyInput('otherDeductions', e.target.value, (v) =>
                    handleDeductionsChange('otherDeductions', v)
                  )
                }
                onBlur={() => handleMoneyBlur('otherDeductions', data.deductions.otherDeductions)}
                onFocus={() => handleMoneyFocus('otherDeductions', data.deductions.otherDeductions)}
                className="input-field pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">đ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
