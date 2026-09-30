'use client';

import { useState, useCallback, useMemo } from 'react';
import Tooltip from '@/components/ui/Tooltip';
import { parseCurrency } from '@/lib/taxCalculator';
import { MAX_MONTHLY_INCOME } from '@/utils/inputSanitizers';
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
  autoDeductions: boolean; // BH + thuế TNCN tự tính (chỉ đọc)
  onAutoDeductionsChange: (auto: boolean) => void;
  deductionNotes: string[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function InfoIcon() {
  return (
    <span className="text-gray-400 cursor-help">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  );
}

// Ô tiền: khi đang gõ giữ chuỗi riêng (cho phép xóa trống), rời ô thì hiển thị lại giá trị thật
function MoneyInput({
  id,
  value,
  onValue,
  readOnly = false,
  small = false,
}: {
  id?: string;
  value: number;
  onValue: (value: number) => void;
  readOnly?: boolean;
  small?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);

  return (
    <div className="relative flex-1 min-w-0">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={text ?? formatMoney(value)}
        readOnly={readOnly}
        onFocus={() => {
          if (!readOnly) setText(value ? formatMoney(value) : '');
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          const amount = Math.min(parseCurrency(digits), MAX_MONTHLY_INCOME);
          setText(digits && formatMoney(amount));
          onValue(amount);
        }}
        onBlur={() => setText(null)}
        className={`input-field pr-10 ${small ? 'text-sm' : ''} ${readOnly ? 'bg-gray-50 text-gray-600' : ''}`}
        placeholder="0"
      />
      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 ${small ? 'text-xs' : 'text-sm'}`}>đ</span>
    </div>
  );
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Trình duyệt chặn localStorage (chế độ riêng tư, hết dung lượng): bỏ qua
  }
}

export default function SalarySlipForm({
  data,
  onChange,
  autoDeductions,
  onAutoDeductionsChange,
  deductionNotes,
}: SalarySlipFormProps) {
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

  // Save company info to localStorage
  const saveCompanyInfo = useCallback(() => {
    if (data.company.name) saveToStorage(STORAGE_KEYS.COMPANY_INFO, data.company);
  }, [data.company]);

  // Save employee info to localStorage
  const saveEmployeeInfo = useCallback(() => {
    if (data.employee.name) saveToStorage(STORAGE_KEYS.EMPLOYEE_INFO, data.employee);
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

  // Clear saved data
  const handleClearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.COMPANY_INFO);
      localStorage.removeItem(STORAGE_KEYS.EMPLOYEE_INFO);
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
    onChange({
      ...data,
      company: DEFAULT_COMPANY_INFO,
      employee: DEFAULT_EMPLOYEE_INFO,
    });
  }, [data, onChange]);

  // BH + thuế: chỉ đọc khi tự tính
  const deductionFields: Array<{
    field: 'bhxh' | 'bhyt' | 'bhtn' | 'personalIncomeTax';
    id: string;
    label: string;
    tooltip: string;
  }> = [
    { field: 'bhxh', id: 'bhxh', label: 'BHXH (8%)', tooltip: 'Bảo hiểm xã hội: 8% lương đóng BH, tối đa 20 lần lương cơ sở' },
    { field: 'bhyt', id: 'bhyt', label: 'BHYT (1,5%)', tooltip: 'Bảo hiểm y tế: 1,5% lương đóng BH, tối đa 20 lần lương cơ sở' },
    { field: 'bhtn', id: 'bhtn', label: 'BHTN (1%)', tooltip: 'Bảo hiểm thất nghiệp: 1% lương đóng BH, tối đa 20 lần lương tối thiểu vùng' },
    { field: 'personalIncomeTax', id: 'pit', label: 'Thuế TNCN', tooltip: 'Tính theo biểu lũy tiến của kỳ lương trên các khoản chịu thuế của phiếu (tiền làm thêm giờ đúng luật được miễn từ kỳ 2026)' },
  ];

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Thông tin công ty</h3>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              placeholder="Số nhà, đường, xã/phường, tỉnh/thành phố"
            />
          </div>
        </div>
      </div>

      {/* Employee Information */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Thông tin nhân viên</h3>
          <button
            type="button"
            onClick={saveEmployeeInfo}
            className="text-xs px-2 py-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="Lưu thông tin nhân viên"
          >
            Lưu
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <h3 className="font-semibold text-gray-900 mb-4">Kỳ lương</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <h3 className="font-semibold text-gray-900 mb-4">Thu nhập</h3>

        <div className="space-y-4">
          {/* Basic Salary */}
          <div>
            <label htmlFor="basic-salary" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Lương cơ bản <span className="text-red-500">*</span>
              <Tooltip content="Mức lương hàng tháng trước thuế, dùng làm lương đóng BH nếu tab Tính thuế không khai báo lương đóng BH riêng">
                <InfoIcon />
              </Tooltip>
            </label>
            <MoneyInput
              id="basic-salary"
              value={data.earnings.basicSalary}
              onValue={(v) => handleEarningsChange('basicSalary', v)}
            />
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
                    className="input-field text-sm flex-1 min-w-0"
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
                <p className="text-xs text-gray-500 mt-2">
                  Phụ cấp tự đặt tên và &quot;Phụ cấp khác&quot; được tính là thu nhập chịu thuế.
                </p>
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
                    className="input-field text-sm flex-1 min-w-0"
                    placeholder="Tên phụ cấp"
                  />
                  <MoneyInput
                    value={allowance.amount}
                    onValue={(v) => handleUpdateAllowance(allowance.id, 'amount', v)}
                    small
                  />
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
            <MoneyInput
              id="overtime"
              value={data.earnings.overtime}
              onValue={(v) => handleEarningsChange('overtime', v)}
            />
          </div>

          {/* Bonus */}
          <div>
            <label htmlFor="bonus" className="block text-sm font-medium text-gray-700 mb-1">
              Thưởng
            </label>
            <MoneyInput
              id="bonus"
              value={data.earnings.bonus}
              onValue={(v) => handleEarningsChange('bonus', v)}
            />
          </div>

          {/* Other Earnings */}
          <div>
            <label htmlFor="other-earnings" className="block text-sm font-medium text-gray-700 mb-1">
              Thu nhập khác
            </label>
            <MoneyInput
              id="other-earnings"
              value={data.earnings.otherEarnings}
              onValue={(v) => handleEarningsChange('otherEarnings', v)}
            />
          </div>
        </div>
      </div>

      {/* Deductions Section */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Các khoản khấu trừ</h3>

        <label htmlFor="auto-deductions" className="flex items-start gap-3 cursor-pointer min-h-[44px] mb-2">
          <input
            id="auto-deductions"
            type="checkbox"
            checked={autoDeductions}
            onChange={(e) => onAutoDeductionsChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 text-primary-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">
            Tự tính BH và thuế TNCN theo kỳ lương
            <span className="block text-xs font-normal text-gray-500">
              Bỏ chọn để nhập tay theo bảng lương của công ty
            </span>
          </span>
        </label>

        {deductionNotes.length > 0 && (
          <ul className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1 list-disc list-inside">
            {deductionNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        <div className="space-y-4">
          {deductionFields.map(({ field, id, label, tooltip }) => (
            <div key={field}>
              <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                {label}
                <Tooltip content={tooltip}>
                  <InfoIcon />
                </Tooltip>
              </label>
              <MoneyInput
                id={id}
                value={data.deductions[field]}
                onValue={(v) => handleDeductionsChange(field, v)}
                readOnly={autoDeductions}
              />
            </div>
          ))}

          {/* Other Deductions */}
          <div>
            <label htmlFor="other-deductions" className="block text-sm font-medium text-gray-700 mb-1">
              Khấu trừ khác
            </label>
            <MoneyInput
              id="other-deductions"
              value={data.deductions.otherDeductions}
              onValue={(v) => handleDeductionsChange('otherDeductions', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
