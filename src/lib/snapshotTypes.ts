import {
  SharedTaxState,
  DEFAULT_INSURANCE_OPTIONS,
  DEFAULT_OTHER_INCOME,
  DEFAULT_ALLOWANCES,
  InsuranceOptions,
  RegionType,
} from './taxCalculator';
import { CompanyOffer } from './salaryComparisonCalculator';
import { IncomeFrequency } from './freelancerCalculator';
import { OvertimeEntry, DEFAULT_WORKING_DAYS, DEFAULT_HOURS_PER_DAY } from './overtimeCalculator';
import {
  SettlementYear,
  MonthlyIncomeEntry,
  DependentInfo,
  createDefaultMonthlyIncome,
} from './annualSettlementCalculator';

/**
 * Tab-specific state types for each calculator tab
 */

// Employer Cost Calculator tab state
export interface EmployerCostTabState {
  includeUnionFee: boolean;
  useNewLaw: boolean;
}

// Freelancer Comparison tab state
export interface FreelancerTabState {
  frequency: IncomeFrequency;
  useNewLaw: boolean;
}

// Salary Comparison tab state
export interface SalaryComparisonTabState {
  companies: CompanyOffer[];
  useNewLaw: boolean;
}

// Yearly Comparison tab state
export interface YearlyComparisonTabState {
  selectedPresetId: string | null;
  bonusAmount: number;
}

// Overtime Calculator tab state
export interface OvertimeTabState {
  monthlySalary: number;
  workingDaysPerMonth: number;
  hoursPerDay: number;
  entries: OvertimeEntry[];
  includeHolidayBasePay: boolean;
  useNewLaw: boolean;
}

// Annual Settlement tab state
export interface AnnualSettlementTabState {
  year: SettlementYear;
  useAverageSalary: boolean;
  averageSalary: number;
  monthlyIncome: MonthlyIncomeEntry[];
  dependents: DependentInfo[];
  charitableContributions: number;
  voluntaryPension: number;
  insuranceOptions: InsuranceOptions;
  region: RegionType;
  manualTaxPaidMode: boolean;
  manualTaxPaid: number;
}

// Bonus Calculator tab state (Lương 13 / Thưởng Tết)
export interface BonusTabState {
  thirteenthMonthSalary: number;
  tetBonus: number;
  otherBonuses: number;
  selectedScenarioId: string | null;
}

// ESOP/Stock Options Calculator tab state
export interface ESOPTabState {
  grantPrice: number;
  exercisePrice: number;
  numberOfShares: number;
  exerciseDate: string;
  selectedPeriodId: string | null;
}

// Pension Calculator tab state
export interface PensionTabState {
  gender: 'male' | 'female';
  birthYear: number;
  birthMonth: number;
  contributionStartYear: number;
  contributionYears: number;
  contributionMonths: number;
  currentMonthlySalary: number;
  earlyRetirementYears: number;
  isHazardousWork: boolean;
}

/**
 * Combined snapshot state for all tabs
 */
export interface TabStates {
  employerCost: EmployerCostTabState;
  freelancer: FreelancerTabState;
  salaryComparison: SalaryComparisonTabState;
  yearlyComparison: YearlyComparisonTabState;
  overtime: OvertimeTabState;
  annualSettlement: AnnualSettlementTabState;
  bonus: BonusTabState;
  esop: ESOPTabState;
  pension: PensionTabState;
}

/**
 * Complete calculator snapshot with all tab states
 */
export interface CalculatorSnapshot {
  version: number;
  sharedState: SharedTaxState;
  activeTab: string;
  tabs: TabStates;
  meta: {
    createdAt: number;
    label?: string;
    description?: string;
  };
  // Legacy fields for backward compatibility
  state?: SharedTaxState;
  timestamp?: number;
}

// A named save with metadata
export interface NamedSave {
  id: string;
  label: string;
  description?: string;
  snapshot: CalculatorSnapshot;
  createdAt: number;
  updatedAt: number;
}

// Export data structure for JSON import/export
export interface SaveExportData {
  version: number;
  exportedAt: number;
  saves: NamedSave[];
}

/**
 * Default tab states
 */
export const DEFAULT_EMPLOYER_COST_STATE: EmployerCostTabState = {
  includeUnionFee: false,
  useNewLaw: true,
};

export const DEFAULT_FREELANCER_STATE: FreelancerTabState = {
  frequency: 'monthly',
  useNewLaw: true,
};

export const DEFAULT_SALARY_COMPARISON_STATE: SalaryComparisonTabState = {
  companies: [],
  useNewLaw: true,
};

export const DEFAULT_YEARLY_COMPARISON_STATE: YearlyComparisonTabState = {
  selectedPresetId: null,
  bonusAmount: 0,
};

export const DEFAULT_OVERTIME_STATE: OvertimeTabState = {
  monthlySalary: 0,
  workingDaysPerMonth: DEFAULT_WORKING_DAYS,
  hoursPerDay: DEFAULT_HOURS_PER_DAY,
  entries: [],
  includeHolidayBasePay: true,
  useNewLaw: true,
};

export const DEFAULT_ANNUAL_SETTLEMENT_STATE: AnnualSettlementTabState = {
  year: 2025,
  useAverageSalary: true,
  averageSalary: 0,
  monthlyIncome: createDefaultMonthlyIncome(0, 0, 0),
  dependents: [],
  charitableContributions: 0,
  voluntaryPension: 0,
  insuranceOptions: { ...DEFAULT_INSURANCE_OPTIONS },
  region: 1,
  manualTaxPaidMode: false,
  manualTaxPaid: 0,
};

export const DEFAULT_BONUS_STATE: BonusTabState = {
  thirteenthMonthSalary: 0,
  tetBonus: 0,
  otherBonuses: 0,
  selectedScenarioId: null,
};

export const DEFAULT_ESOP_STATE: ESOPTabState = {
  grantPrice: 0,
  exercisePrice: 0,
  numberOfShares: 0,
  exerciseDate: '',
  selectedPeriodId: null,
};

export const DEFAULT_PENSION_STATE: PensionTabState = {
  gender: 'male',
  birthYear: 1970,
  birthMonth: 1,
  contributionStartYear: 2000,
  contributionYears: 20,
  contributionMonths: 0,
  currentMonthlySalary: 0,
  earlyRetirementYears: 0,
  isHazardousWork: false,
};

export const DEFAULT_TAB_STATES: TabStates = {
  employerCost: DEFAULT_EMPLOYER_COST_STATE,
  freelancer: DEFAULT_FREELANCER_STATE,
  salaryComparison: DEFAULT_SALARY_COMPARISON_STATE,
  yearlyComparison: DEFAULT_YEARLY_COMPARISON_STATE,
  overtime: DEFAULT_OVERTIME_STATE,
  annualSettlement: DEFAULT_ANNUAL_SETTLEMENT_STATE,
  bonus: DEFAULT_BONUS_STATE,
  esop: DEFAULT_ESOP_STATE,
  pension: DEFAULT_PENSION_STATE,
};

/**
 * Default shared state
 */
export const DEFAULT_SHARED_STATE: SharedTaxState = {
  grossIncome: 30_000_000,
  declaredSalary: undefined,
  dependents: 0,
  otherDeductions: 0,
  hasInsurance: true,
  insuranceOptions: { ...DEFAULT_INSURANCE_OPTIONS },
  region: 1,
  pensionContribution: 0,
  otherIncome: { ...DEFAULT_OTHER_INCOME },
  allowances: { ...DEFAULT_ALLOWANCES },
};

/**
 * Default complete snapshot
 */
export const DEFAULT_SNAPSHOT: CalculatorSnapshot = {
  version: 1,
  sharedState: DEFAULT_SHARED_STATE,
  activeTab: 'calculator',
  tabs: DEFAULT_TAB_STATES,
  meta: {
    createdAt: Date.now(),
  },
};

/**
 * Create a snapshot from current state
 * This is the main function to capture calculator state for saving/sharing
 */
export function createSnapshot(
  sharedState: Partial<SharedTaxState>,
  activeTab: string = 'calculator',
  tabStates?: Partial<TabStates>,
  meta?: Partial<CalculatorSnapshot['meta']>
): CalculatorSnapshot {
  return {
    version: 1,
    sharedState: {
      ...DEFAULT_SHARED_STATE,
      ...sharedState,
      insuranceOptions: {
        ...DEFAULT_INSURANCE_OPTIONS,
        ...(sharedState.insuranceOptions || {}),
      },
      otherIncome: {
        ...DEFAULT_OTHER_INCOME,
        ...(sharedState.otherIncome || {}),
      },
      allowances: {
        ...DEFAULT_ALLOWANCES,
        ...(sharedState.allowances || {}),
      },
    },
    activeTab,
    tabs: {
      employerCost: {
        ...DEFAULT_EMPLOYER_COST_STATE,
        ...(tabStates?.employerCost || {}),
      },
      freelancer: {
        ...DEFAULT_FREELANCER_STATE,
        ...(tabStates?.freelancer || {}),
      },
      salaryComparison: {
        ...DEFAULT_SALARY_COMPARISON_STATE,
        ...(tabStates?.salaryComparison || {}),
      },
      yearlyComparison: {
        ...DEFAULT_YEARLY_COMPARISON_STATE,
        ...(tabStates?.yearlyComparison || {}),
      },
      overtime: {
        ...DEFAULT_OVERTIME_STATE,
        ...(tabStates?.overtime || {}),
      },
      annualSettlement: {
        ...DEFAULT_ANNUAL_SETTLEMENT_STATE,
        ...(tabStates?.annualSettlement || {}),
        insuranceOptions: {
          ...DEFAULT_ANNUAL_SETTLEMENT_STATE.insuranceOptions,
          ...(tabStates?.annualSettlement?.insuranceOptions || {}),
        },
        monthlyIncome: tabStates?.annualSettlement?.monthlyIncome?.map(m => ({ ...m }))
          || DEFAULT_ANNUAL_SETTLEMENT_STATE.monthlyIncome.map(m => ({ ...m })),
        dependents: tabStates?.annualSettlement?.dependents?.map(d => ({ ...d }))
          || [],
      },
      bonus: {
        ...DEFAULT_BONUS_STATE,
        ...(tabStates?.bonus || {}),
      },
      esop: {
        ...DEFAULT_ESOP_STATE,
        ...(tabStates?.esop || {}),
      },
      pension: {
        ...DEFAULT_PENSION_STATE,
        ...(tabStates?.pension || {}),
      },
    },
    meta: {
      createdAt: Date.now(),
      ...meta,
    },
  };
}

/**
 * Validate snapshot version and structure
 */
export function isValidSnapshot(snapshot: unknown): snapshot is CalculatorSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const s = snapshot as Partial<CalculatorSnapshot>;

  return !!(
    s.version &&
    s.sharedState &&
    s.activeTab &&
    s.tabs &&
    s.meta &&
    typeof s.version === 'number' &&
    typeof s.sharedState === 'object' &&
    typeof s.activeTab === 'string' &&
    typeof s.tabs === 'object' &&
    typeof s.meta === 'object'
  );
}

/**
 * Merge partial snapshot with defaults
 * Used when loading snapshots that may have missing fields
 */
export function mergeSnapshotWithDefaults(
  partial: Partial<CalculatorSnapshot>
): CalculatorSnapshot {
  return {
    version: partial.version || 1,
    sharedState: {
      ...DEFAULT_SHARED_STATE,
      ...(partial.sharedState || {}),
      insuranceOptions: {
        ...DEFAULT_INSURANCE_OPTIONS,
        ...(partial.sharedState?.insuranceOptions || {}),
      },
      otherIncome: {
        ...DEFAULT_OTHER_INCOME,
        ...(partial.sharedState?.otherIncome || {}),
      },
      allowances: {
        ...DEFAULT_ALLOWANCES,
        ...(partial.sharedState?.allowances || {}),
      },
    },
    activeTab: partial.activeTab || 'calculator',
    tabs: {
      employerCost: {
        ...DEFAULT_EMPLOYER_COST_STATE,
        ...(partial.tabs?.employerCost || {}),
      },
      freelancer: {
        ...DEFAULT_FREELANCER_STATE,
        ...(partial.tabs?.freelancer || {}),
      },
      salaryComparison: {
        ...DEFAULT_SALARY_COMPARISON_STATE,
        ...(partial.tabs?.salaryComparison || {}),
      },
      yearlyComparison: {
        ...DEFAULT_YEARLY_COMPARISON_STATE,
        ...(partial.tabs?.yearlyComparison || {}),
      },
      overtime: {
        ...DEFAULT_OVERTIME_STATE,
        ...(partial.tabs?.overtime || {}),
      },
      annualSettlement: {
        ...DEFAULT_ANNUAL_SETTLEMENT_STATE,
        ...(partial.tabs?.annualSettlement || {}),
        insuranceOptions: {
          ...DEFAULT_ANNUAL_SETTLEMENT_STATE.insuranceOptions,
          ...(partial.tabs?.annualSettlement?.insuranceOptions || {}),
        },
        monthlyIncome: partial.tabs?.annualSettlement?.monthlyIncome?.map(m => ({ ...m }))
          || DEFAULT_ANNUAL_SETTLEMENT_STATE.monthlyIncome.map(m => ({ ...m })),
        dependents: partial.tabs?.annualSettlement?.dependents?.map(d => ({ ...d }))
          || [],
      },
      bonus: {
        ...DEFAULT_BONUS_STATE,
        ...(partial.tabs?.bonus || {}),
      },
      esop: {
        ...DEFAULT_ESOP_STATE,
        ...(partial.tabs?.esop || {}),
      },
      pension: {
        ...DEFAULT_PENSION_STATE,
        ...(partial.tabs?.pension || {}),
      },
    },
    meta: {
      createdAt: partial.meta?.createdAt || Date.now(),
      label: partial.meta?.label,
      description: partial.meta?.description,
    },
  };
}
