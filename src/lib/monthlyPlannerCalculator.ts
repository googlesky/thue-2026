import {
  RegionType,
  InsuranceOptions,
  calculateNewTax,
} from './taxCalculator';
import { calculateAnnualSalaryTax as calculateAnnualTax } from './taxCalculator';

export interface MonthlyEntry {
  bonus: number;
  overtime: number;
  otherIncome: number;
}

export interface MonthlyPlannerInput {
  baseSalary: number;
  months: MonthlyEntry[];
  dependents: number;
  hasInsurance: boolean;
  region: RegionType;
  insuranceOptions?: InsuranceOptions; // Như tab chính (ưu tiên hơn hasInsurance)
  declaredSalary?: number;             // Lương đóng BH (mặc định = lương cơ bản)
  year?: number;                       // Kỳ tính thuế (mặc định năm hiện tại, từ 2026)
}

export interface MonthResult {
  month: number;           // 1-12
  label: string;           // "T1", "T2"...
  gross: number;           // baseSalary + bonus + overtime + other
  net: number;             // Thực nhận trong tháng (sau thuế tạm khấu trừ)
  tax: number;             // Thuế tạm khấu trừ của tháng
  insurance: number;
  taxableIncome: number;
}

export interface YearSummary {
  totalGross: number;
  totalNet: number;               // Thực nhận cả năm sau quyết toán
  totalTax: number;               // Thuế phải nộp cả năm (sau quyết toán)
  totalWithholding: number;       // Tổng thuế tạm khấu trừ theo tháng
  settlementRefund: number;       // Tạm khấu trừ − thuế năm: phần được hoàn/bù trừ khi quyết toán
  totalInsurance: number;
  effectiveRate: number;          // thuế suất thực tế cả năm
  averageMonthlyNet: number;
}

export interface MonthlyPlannerResult {
  year: number;
  months: MonthResult[];
  summary: YearSummary;
}

const MONTH_LABELS = [
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
  'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
];

const MONTH_FULL_LABELS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

export { MONTH_LABELS, MONTH_FULL_LABELS };

export function createDefaultMonths(): MonthlyEntry[] {
  return Array.from({ length: 12 }, () => ({
    bonus: 0,
    overtime: 0,
    otherIncome: 0,
  }));
}

// Số tiền hợp lệ (snapshot cũ có thể chứa NaN/số âm)
const money = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

/**
 * Kế hoạch 12 tháng của một kỳ tính thuế (luật mới, từ 2026):
 * - Từng tháng: thuế tạm khấu trừ theo biểu tháng (trần BH theo ngày của tháng).
 * - Cả năm: thuế sau quyết toán = biểu năm trên tổng thu nhập năm (Luật 109/2025 Điều 8, 9);
 *   biến động giữa các tháng chỉ làm tạm khấu trừ cao hơn, không làm tăng thuế năm.
 * - Thưởng, phụ cấp khác chịu thuế nhưng không đóng BH; tăng ca đúng luật miễn toàn bộ
 *   (Luật 109/2025 Điều 4.8; NĐ 253/2026 Điều 26) nên không vào thu nhập chịu thuế.
 */
export function calculateMonthlyPlan(input: MonthlyPlannerInput): MonthlyPlannerResult {
  const { months, hasInsurance, region, insuranceOptions } = input;
  const year = input.year ?? Math.max(2026, new Date().getFullYear());
  const baseSalary = money(input.baseSalary);
  const dependents = Math.max(0, Math.floor(input.dependents || 0));
  const declaredSalary = input.declaredSalary ?? baseSalary;

  // Ensure we have exactly 12 months
  const entries = months.length >= 12
    ? months.slice(0, 12)
    : [...months, ...createDefaultMonths().slice(months.length)];

  let annualTaxableIncome = 0; // chưa chặn 0 từng tháng

  const monthResults: MonthResult[] = entries.map((entry, index) => {
    const bonus = money(entry.bonus);
    const overtime = money(entry.overtime);
    const otherIncome = money(entry.otherIncome);

    const result = calculateNewTax({
      grossIncome: baseSalary + bonus + otherIncome,
      declaredSalary,
      dependents,
      hasInsurance,
      insuranceOptions,
      region,
      calculationDate: new Date(year, index, 1),
    });
    annualTaxableIncome += result.grossIncome - result.totalDeductions;

    return {
      month: index + 1,
      label: MONTH_LABELS[index],
      gross: baseSalary + bonus + overtime + otherIncome,
      net: result.netIncome + overtime,
      tax: result.taxAmount,
      insurance: result.insuranceDeduction,
      taxableIncome: result.taxableIncome,
    };
  });

  // Calculate totals
  const totalGross = monthResults.reduce((sum, m) => sum + m.gross, 0);
  const totalWithholding = monthResults.reduce((sum, m) => sum + m.tax, 0);
  const totalInsurance = monthResults.reduce((sum, m) => sum + m.insurance, 0);
  const totalTax = calculateAnnualTax(annualTaxableIncome);
  const totalNet = totalGross - totalInsurance - totalTax;

  return {
    year,
    months: monthResults,
    summary: {
      totalGross,
      totalNet,
      totalTax,
      totalWithholding,
      settlementRefund: totalWithholding - totalTax,
      totalInsurance,
      effectiveRate: totalGross > 0 ? (totalTax / totalGross) * 100 : 0,
      averageMonthlyNet: totalNet / 12,
    },
  };
}

// Preset scenarios
export interface PresetScenario {
  id: string;
  label: string;
  description: string;
  applyToMonths: (baseSalary: number) => MonthlyEntry[];
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'uniform',
    label: 'Đều đặn',
    description: 'Lương cố định 12 tháng, không thưởng',
    applyToMonths: () => createDefaultMonths(),
  },
  {
    id: 'tet-bonus',
    label: 'Thưởng Tết T1',
    description: 'Thưởng Tết = 1 tháng lương vào tháng 1',
    applyToMonths: (baseSalary) => {
      const months = createDefaultMonths();
      months[0].bonus = baseSalary; // T1 thưởng Tết
      return months;
    },
  },
  {
    id: 'mid-year-tet',
    label: 'Thưởng T6 + T12',
    description: 'Thưởng giữa năm (T6) + cuối năm (T12) mỗi lần 0,5 tháng',
    applyToMonths: (baseSalary) => {
      const months = createDefaultMonths();
      months[5].bonus = baseSalary * 0.5;   // T6
      months[11].bonus = baseSalary * 0.5;  // T12
      return months;
    },
  },
  {
    id: '13th-month',
    label: 'Lương tháng 13',
    description: 'Thưởng tháng 13 vào tháng 12',
    applyToMonths: (baseSalary) => {
      const months = createDefaultMonths();
      months[11].bonus = baseSalary; // T12 thưởng lương 13
      return months;
    },
  },
  {
    id: 'custom',
    label: 'Tự nhập',
    description: 'Tự nhập thưởng, tăng ca, phụ cấp khác cho từng tháng',
    applyToMonths: () => createDefaultMonths(),
  },
];
