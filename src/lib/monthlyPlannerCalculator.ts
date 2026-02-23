import {
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
} from './taxCalculator';
import { grossToNet, GrossNetResult } from './grossNetCalculator';

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
}

export interface MonthResult {
  month: number;           // 1-12
  label: string;           // "T1", "T2"...
  gross: number;           // baseSalary + bonus + overtime + other
  net: number;
  tax: number;
  insurance: number;
  taxableIncome: number;
  detail: GrossNetResult;
}

export interface YearSummary {
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalInsurance: number;
  effectiveRate: number;          // thuế suất thực tế cả năm
  averageMonthlyNet: number;
  // So sánh với lương đều đặn
  uniformTotalTax: number;        // thuế nếu đều 12 tháng như nhau
  uniformTotalNet: number;
  taxDifference: number;          // chênh lệch thuế (thực tế - đều đặn)
  taxDifferencePercent: number;
}

export interface MonthlyPlannerResult {
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

/**
 * Tính thuế TNCN cho từng tháng riêng biệt
 * Mỗi tháng tính thuế lũy tiến trên thu nhập tháng đó
 */
export function calculateMonthlyPlan(input: MonthlyPlannerInput): MonthlyPlannerResult {
  const { baseSalary, months, dependents, hasInsurance, region } = input;

  // Ensure we have exactly 12 months
  const entries = months.length >= 12
    ? months.slice(0, 12)
    : [...months, ...createDefaultMonths().slice(months.length)];

  // Calculate each month
  const monthResults: MonthResult[] = entries.map((entry, index) => {
    const gross = baseSalary + entry.bonus + entry.overtime + entry.otherIncome;

    const result = grossToNet({
      amount: gross,
      type: 'gross',
      dependents,
      hasInsurance,
      useNewLaw: true,
      region,
    });

    return {
      month: index + 1,
      label: MONTH_LABELS[index],
      gross,
      net: result.net,
      tax: result.tax,
      insurance: result.insurance,
      taxableIncome: result.taxableIncome,
      detail: result,
    };
  });

  // Calculate totals
  const totalGross = monthResults.reduce((sum, m) => sum + m.gross, 0);
  const totalNet = monthResults.reduce((sum, m) => sum + m.net, 0);
  const totalTax = monthResults.reduce((sum, m) => sum + m.tax, 0);
  const totalInsurance = monthResults.reduce((sum, m) => sum + m.insurance, 0);

  // Calculate uniform tax (if same salary every month)
  const uniformMonthlyGross = totalGross / 12;
  const uniformResult = grossToNet({
    amount: uniformMonthlyGross,
    type: 'gross',
    dependents,
    hasInsurance,
    useNewLaw: true,
    region,
  });
  const uniformTotalTax = uniformResult.tax * 12;
  const uniformTotalNet = uniformResult.net * 12;

  const taxDifference = totalTax - uniformTotalTax;

  return {
    months: monthResults,
    summary: {
      totalGross,
      totalNet,
      totalTax,
      totalInsurance,
      effectiveRate: totalGross > 0 ? (totalTax / totalGross) * 100 : 0,
      averageMonthlyNet: totalNet / 12,
      uniformTotalTax,
      uniformTotalNet,
      taxDifference,
      taxDifferencePercent: uniformTotalTax > 0 ? (taxDifference / uniformTotalTax) * 100 : 0,
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
    description: 'Tự nhập bonus/OT cho từng tháng',
    applyToMonths: () => createDefaultMonths(),
  },
];
