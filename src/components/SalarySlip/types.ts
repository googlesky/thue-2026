// Types for Salary Slip Generator

export interface CompanyInfo {
  name: string;
  address: string;
  logoUrl?: string; // Optional logo URL
}

export interface EmployeeInfo {
  name: string;
  employeeId?: string;
  position?: string;
  department?: string;
  bankAccount?: string;
  bankName?: string;
}

export interface PayPeriod {
  month: number; // 1-12
  year: number;
}

export interface EarningsItem {
  id: string;
  label: string;
  amount: number;
}

export interface EarningsSection {
  basicSalary: number;
  allowances: EarningsItem[];
  overtime: number;
  bonus: number;
  otherEarnings: number;
}

export interface DeductionsSection {
  bhxh: number; // 8%
  bhyt: number; // 1.5%
  bhtn: number; // 1%
  personalIncomeTax: number;
  otherDeductions: number;
}

export interface SalarySlipData {
  company: CompanyInfo;
  employee: EmployeeInfo;
  payPeriod: PayPeriod;
  earnings: EarningsSection;
  deductions: DeductionsSection;
}

// Computed summary
export interface SalarySlipSummary {
  grossIncome: number;       // Total earnings
  totalDeductions: number;   // Total deductions
  netPay: number;           // Net pay (thực lĩnh)
}

// Default values
export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: '',
  address: '',
};

export const DEFAULT_EMPLOYEE_INFO: EmployeeInfo = {
  name: '',
  employeeId: '',
  position: '',
  department: '',
  bankAccount: '',
  bankName: '',
};

export const DEFAULT_PAY_PERIOD: PayPeriod = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
};

export const DEFAULT_EARNINGS: EarningsSection = {
  basicSalary: 0,
  allowances: [],
  overtime: 0,
  bonus: 0,
  otherEarnings: 0,
};

export const DEFAULT_DEDUCTIONS: DeductionsSection = {
  bhxh: 0,
  bhyt: 0,
  bhtn: 0,
  personalIncomeTax: 0,
  otherDeductions: 0,
};

export const DEFAULT_SALARY_SLIP_DATA: SalarySlipData = {
  company: DEFAULT_COMPANY_INFO,
  employee: DEFAULT_EMPLOYEE_INFO,
  payPeriod: DEFAULT_PAY_PERIOD,
  earnings: DEFAULT_EARNINGS,
  deductions: DEFAULT_DEDUCTIONS,
};

// Allowance presets
export const ALLOWANCE_PRESETS = [
  { id: 'meal', label: 'Phụ cấp ăn trưa' },
  { id: 'phone', label: 'Phụ cấp điện thoại' },
  { id: 'transport', label: 'Phụ cấp xăng xe' },
  { id: 'housing', label: 'Phụ cấp nhà ở' },
  { id: 'position', label: 'Phụ cấp chức vụ' },
  { id: 'responsibility', label: 'Phụ cấp trách nhiệm' },
  { id: 'hazardous', label: 'Phụ cấp độc hại' },
  { id: 'other', label: 'Phụ cấp khác' },
];

// Month names in Vietnamese
export const VIETNAMESE_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

// localStorage keys
export const STORAGE_KEYS = {
  COMPANY_INFO: 'salary-slip-company-info',
  EMPLOYEE_INFO: 'salary-slip-employee-info',
};
