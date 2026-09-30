import {
  SharedTaxState,
  DEFAULT_INSURANCE_OPTIONS,
  DEFAULT_OTHER_INCOME,
  DEFAULT_ALLOWANCES,
  InsuranceOptions,
  RegionType,
} from './taxCalculator';
import { CompanyOffer } from './salaryComparisonCalculator';
import { IncomeFrequency, CreatorIncomeSource, DEFAULT_USD_EXCHANGE_RATE } from './freelancerCalculator';
import { SeveranceType } from './severanceCalculator';
import { OvertimeEntry, DEFAULT_WORKING_DAYS, DEFAULT_HOURS_PER_DAY } from './overtimeCalculator';
import {
  SettlementYear,
  MonthlyIncomeEntry,
  DependentInfo,
  createDefaultMonthlyIncome,
} from './annualSettlementCalculator';
import type { VATMethod, BusinessCategory, VATTaxpayerType } from './vatCalculator';
import type { IncomeType, ResidencyStatus, ForeignContractorType } from './withholdingTaxCalculator';
import type { IncomeSource, IncomeSourceType } from './multiSourceIncomeCalculator';
import type { CryptoAssetType, TransactionType } from './cryptoTaxCalculator';
import type { MonthlyEntry } from './monthlyPlannerCalculator';
import { DEFAULT_INCOME_SUMMARY_INPUT, type IncomeSummaryInput } from './incomeSummaryCalculator';
import { createDefaultMonths } from './monthlyPlannerCalculator';
import { annualDeadline } from './taxDeadlines';

// Withholding Tax Tab State - defined here to avoid Turbopack import issues
export interface WithholdingTaxTabState {
  // Individual WHT fields
  paymentAmount: number;
  incomeType: IncomeType;
  residencyStatus: ResidencyStatus;
  isFamilyMember: boolean;
  showComparison: boolean;
  // FCT fields
  contractValue: number;
  contractType: ForeignContractorType;
  hasVATRegistration: boolean;
}

export const DEFAULT_WITHHOLDING_TAX_STATE: WithholdingTaxTabState = {
  paymentAmount: 0,
  incomeType: 'salary_with_contract',
  residencyStatus: 'resident',
  isFamilyMember: false,
  showComparison: false,
  contractValue: 0,
  contractType: 'service',
  hasVATRegistration: false,
};

// Multi-source Income Tab State - defined here to avoid Turbopack import issues
export interface MultiSourceIncomeTabState {
  incomeSources: IncomeSource[];
  dependents: number;
  hasInsurance: boolean;
  pensionContribution: number;
  charitableContribution: number;
  taxYear: 2025 | 2026;
  isSecondHalf2026: boolean;
}

export const DEFAULT_MULTI_SOURCE_INCOME_STATE: MultiSourceIncomeTabState = {
  incomeSources: [],
  dependents: 0,
  hasInsurance: true,
  pensionContribution: 0,
  charitableContribution: 0,
  taxYear: 2026,
  isSecondHalf2026: true,
};

// Tax Treaty Tab State - defined here to avoid Turbopack import issues
export type TreatyIncomeType = 'dividends' | 'interest' | 'royalties';

export interface TaxTreatyTabState {
  selectedCountry: string;
  daysInVietnam: number;
  incomeType: TreatyIncomeType;
  incomeAmount: number;
  isQualifiedDividend: boolean;
}

export const DEFAULT_TAX_TREATY_STATE: TaxTreatyTabState = {
  selectedCountry: '',
  daysInVietnam: 0,
  incomeType: 'dividends',
  incomeAmount: 0,
  isQualifiedDividend: false,
};

// Couple Optimizer Tab State - defined here to avoid Turbopack import issues
export interface CoupleOptimizerTabState {
  person1Name: string;
  person1Income: number;
  person1HasInsurance: boolean;
  person1Pension: number;
  person1OtherDeductions: number;
  person2Name: string;
  person2Income: number;
  person2HasInsurance: boolean;
  person2Pension: number;
  person2OtherDeductions: number;
  totalDependents: number;
  charitableContribution: number;
  voluntaryPension: number;
}

export const DEFAULT_COUPLE_OPTIMIZER_STATE: CoupleOptimizerTabState = {
  person1Name: '',
  person1Income: 0,
  person1HasInsurance: true,
  person1Pension: 0,
  person1OtherDeductions: 0,
  person2Name: '',
  person2Income: 0,
  person2HasInsurance: true,
  person2Pension: 0,
  person2OtherDeductions: 0,
  totalDependents: 0,
  charitableContribution: 0,
  voluntaryPension: 0,
};

// Content Creator Tab State - defined here to avoid Turbopack import issues
export interface ContentCreatorIncomeSource {
  id: string;
  platformId: string;
  monthlyIncome: number;
}

export interface ContentCreatorTabState {
  incomeSources: ContentCreatorIncomeSource[];
  taxYear: 2025 | 2026;
  isSecondHalf2026: boolean;
}

export const DEFAULT_CONTENT_CREATOR_STATE: ContentCreatorTabState = {
  incomeSources: [],
  taxYear: 2026,
  isSecondHalf2026: true,
};

// Crypto Tax Tab State - defined here to avoid Turbopack import issues
export interface CryptoTransactionSnapshot {
  id: string;
  date: string; // ISO string for serialization
  type: TransactionType;
  assetType: CryptoAssetType;
  assetName: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  fee: number;
  notes?: string;
}

export interface CryptoTaxTabState {
  transactions: CryptoTransactionSnapshot[];
  taxYear: number;
}

export const DEFAULT_CRYPTO_TAX_STATE: CryptoTaxTabState = {
  transactions: [],
  taxYear: 2026,
};

// Gold Tax Tab State
export type GoldTransactionSnapshotType = 'buy' | 'sell';
export type GoldClassificationSnapshot = 'bar' | 'ring' | 'jewelry';
export type GoldWeightUnitSnapshot = 'luong' | 'chi' | 'gram';

export interface GoldTransactionSnapshot {
  id: string;
  date: string; // ISO string for serialization
  type: GoldTransactionSnapshotType;
  classification: GoldClassificationSnapshot;
  goldTypeCode?: string;
  goldTypeName: string;
  weight: number;
  weightUnit: GoldWeightUnitSnapshot;
  pricePerLuong: number;
  totalValue: number;
  notes?: string;
}

export interface GoldTaxTabState {
  transactions: GoldTransactionSnapshot[];
}

export const DEFAULT_GOLD_TAX_STATE: GoldTaxTabState = {
  transactions: [],
};

// Monthly Planner Tab State
export interface MonthlyPlannerTabState {
  baseSalary: number;
  months: MonthlyEntry[];
  selectedPreset: string;
}

export const DEFAULT_MONTHLY_PLANNER_STATE: MonthlyPlannerTabState = {
  baseSalary: 0,
  months: createDefaultMonths(),
  selectedPreset: 'uniform',
};

// Mortgage Calculator Tab State
export type MortgagePropertyType = 'secondary' | 'primary_developer';
export type MortgageRepaymentMethod = 'annuity' | 'straight_line';

export interface MortgageTabState {
  propertyPrice: number;
  downPaymentPercent: number;
  loanTermYears: number;
  preferentialRate: number;
  preferentialMonths: number;
  floatingRate: number;
  monthlyIncome: number;
  otherDebtPayments: number;
  gracePeriodMonths: number;
  propertyType: MortgagePropertyType;
  repaymentMethod: MortgageRepaymentMethod;
}

export const DEFAULT_MORTGAGE_STATE: MortgageTabState = {
  propertyPrice: 3_000_000_000,
  downPaymentPercent: 30,
  loanTermYears: 20,
  preferentialRate: 7.0,
  preferentialMonths: 12,
  floatingRate: 10.5,
  monthlyIncome: 30_000_000,
  otherDebtPayments: 0,
  gracePeriodMonths: 0,
  propertyType: 'secondary',
  repaymentMethod: 'annuity',
};

// VAT Tab State - defined here to avoid Turbopack import issues
export interface VATTabState {
  method: VATMethod;
  businessCategory: BusinessCategory;
  salesRevenue: number;
  purchaseValue: number;
  outputRate: number; // thuế suất theo luật (0,1 = nhóm 10%, tự giảm còn 8% khi đủ điều kiện)
  inputRate: number;
  useCurrentDate: boolean;
  customDate: string;
  outputNotReduced?: boolean; // hàng bán ra thuộc nhóm không được giảm thuế GTGT
  inputNotReduced?: boolean;
  taxpayerType?: VATTaxpayerType;
}

export const DEFAULT_VAT_STATE: VATTabState = {
  method: 'deduction',
  businessCategory: 'services',
  salesRevenue: 0,
  purchaseValue: 0,
  outputRate: 0.10,
  inputRate: 0.10,
  useCurrentDate: true,
  customDate: getCurrentDateString(),
  outputNotReduced: false,
  inputNotReduced: false,
  taxpayerType: 'business',
};

/**
 * Tab-specific state types for each calculator tab
 */

// Employer Cost Calculator tab state
export interface EmployerCostTabState {
  includeUnionFee: boolean;
  useNewLaw: boolean;
}

// Freelancer Comparison tab state
export type FreelancerMode = 'simple' | 'creator';

export interface FreelancerTabState {
  mode: FreelancerMode;
  frequency: IncomeFrequency;
  useNewLaw: boolean;
  // Creator mode specific fields
  creatorIncomeSources: CreatorIncomeSource[];
  exchangeRate: number;
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
  medicalExpenses?: number; // Chi y tế (năm 2026+), optional để snapshot cũ vẫn đọc được
  educationExpenses?: number; // Học phí (năm 2026+)
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

// ESOP / cổ phiếu thưởng tab state (NĐ 253/2026 Điều 50.3.a: tính thuế khi chuyển nhượng).
// Link cũ (mô hình "giá thực hiện") còn exercisePrice/exerciseDate/selectedPeriodId - bị bỏ qua.
export interface ESOPTabState {
  shareType: 'esop' | 'bonus';
  grantPrice: number; // Giá người lao động đã trả/cổ phiếu (ESOP)
  numberOfShares: number; // Số cổ phiếu chuyển nhượng
  parValue: number; // Mệnh giá/cổ phiếu
  bookAmount: number; // Số tiền ghi sổ kế toán (0 = không xác định)
  sellPrice: number; // Giá bán/cổ phiếu
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

// Foreigner Tax Calculator tab state
export interface ForeignerTaxTabState {
  nationality: string;
  daysInVietnam: number;
  hasPermanentResidence: boolean;
  foreignIncome: number;
  allowances: {
    housing: number;
    schoolFees: number;
    homeLeaveFare: number;
    relocation: number;
    languageTraining: number;
    other: number;
  };
  hasVietnameseInsurance: boolean;
  taxYear: 2025 | 2026;
  // Đào tạo phù hợp công việc/theo kế hoạch công ty: không tính vào TN chịu thuế (NĐ 253 Điều 8.4.i)
  languageTrainingJobRelated?: boolean;
}

// Late Payment Interest Calculator tab state
export interface LatePaymentTabState {
  taxType: 'annual_pit' | 'quarterly_pit' | 'monthly_vat' | 'quarterly_vat' | 'property_transfer' | 'rental_income' | 'household_business' | 'other';
  taxAmount: number;
  dueDate: string;      // YYYY-MM-DD format
  paymentDate: string;  // YYYY-MM-DD format
}

// Business Form Comparison tab state
export interface BusinessFormComparisonTabState {
  annualRevenue: number;
  businessCategory: import('./householdBusinessTaxCalculator').BusinessCategory;
  region: RegionType;
  dependents: number;
  hasSelfInsurance: boolean;
  expenseRatio?: number; // Tỷ lệ chi phí tự chịu của freelancer, hộ KD (0-1); link cũ không có -> 0,3
}

// Severance/Retirement Pay Calculator tab state
export interface SeveranceTabState {
  type: SeveranceType;
  totalAmount: number;
  averageSalary: number;
  yearsWorked: number;
  unemploymentInsuranceYears?: number; // thời gian đã đóng BHTN (năm) - trừ khi tính trợ cấp
  paidYears?: number; // thời gian đã được chi trả trợ cấp thôi việc, mất việc (năm)
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
  foreignerTax: ForeignerTaxTabState;
  latePayment: LatePaymentTabState;
  businessFormComparison: BusinessFormComparisonTabState;
  severance: SeveranceTabState;
  vat: VATTabState;
  withholdingTax: WithholdingTaxTabState;
  multiSourceIncome: MultiSourceIncomeTabState;
  taxTreaty: TaxTreatyTabState;
  coupleOptimizer: CoupleOptimizerTabState;
  contentCreator: ContentCreatorTabState;
  cryptoTax: CryptoTaxTabState;
  goldTax: GoldTaxTabState;
  monthlyPlanner: MonthlyPlannerTabState;
  mortgage: MortgageTabState;
  incomeSummary?: IncomeSummaryInput; // Tổng hợp thu nhập (snapshot cũ không có)
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
  mode: 'simple',
  frequency: 'monthly',
  useNewLaw: true,
  creatorIncomeSources: [],
  exchangeRate: DEFAULT_USD_EXCHANGE_RATE,
};

export const DEFAULT_SALARY_COMPARISON_STATE: SalaryComparisonTabState = {
  companies: [],
  useNewLaw: true,
};

export const DEFAULT_YEARLY_COMPARISON_STATE: YearlyComparisonTabState = {
  selectedPresetId: 'normal',
  bonusAmount: 30_000_000,
};

export const DEFAULT_OVERTIME_STATE: OvertimeTabState = {
  monthlySalary: 0,
  workingDaysPerMonth: DEFAULT_WORKING_DAYS,
  hoursPerDay: DEFAULT_HOURS_PER_DAY,
  entries: [],
  includeHolidayBasePay: false, // lương ngày lễ chỉ cộng thêm cho người hưởng lương ngày (BLLĐ Điều 98.1.c)
  useNewLaw: true,
};

export const DEFAULT_ANNUAL_SETTLEMENT_STATE: AnnualSettlementTabState = {
  year: 2026, // lần quyết toán sắp tới
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
  shareType: 'esop',
  grantPrice: 0,
  numberOfShares: 0,
  parValue: 10_000,
  bookAmount: 0,
  sellPrice: 0,
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

export const DEFAULT_FOREIGNER_TAX_STATE: ForeignerTaxTabState = {
  nationality: '',
  daysInVietnam: 0,
  hasPermanentResidence: false,
  foreignIncome: 0,
  allowances: {
    housing: 0,
    schoolFees: 0,
    homeLeaveFare: 0,
    relocation: 0,
    languageTraining: 0,
    other: 0,
  },
  hasVietnameseInsurance: false,
  taxYear: 2026,
  languageTrainingJobRelated: false,
};

// Helper: ngày local dạng YYYY-MM-DD (mặc định hôm nay)
function getCurrentDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DEFAULT_LATE_PAYMENT_STATE: LatePaymentTabState = {
  taxType: 'annual_pit',
  taxAmount: 10_000_000,
  // Hạn cá nhân tự quyết toán TNCN năm trước (cuối tháng 4, đã dời ngày nghỉ)
  dueDate: getCurrentDateString(annualDeadline(new Date().getFullYear() - 1, 'individual')),
  paymentDate: getCurrentDateString(),
};

export const DEFAULT_BUSINESS_FORM_COMPARISON_STATE: BusinessFormComparisonTabState = {
  annualRevenue: 500_000_000,
  businessCategory: 'services', // Dịch vụ - phổ biến nhất
  region: 1,
  dependents: 0,
  hasSelfInsurance: true,
  expenseRatio: 0.3, // % chi phí trên doanh thu (tab tự điền nếu thiếu)
};

export const DEFAULT_SEVERANCE_STATE: SeveranceTabState = {
  type: 'severance',
  totalAmount: 100_000_000,
  averageSalary: 20_000_000,
  yearsWorked: 5,
  unemploymentInsuranceYears: 0,
  paidYears: 0,
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
  foreignerTax: DEFAULT_FOREIGNER_TAX_STATE,
  latePayment: DEFAULT_LATE_PAYMENT_STATE,
  businessFormComparison: DEFAULT_BUSINESS_FORM_COMPARISON_STATE,
  severance: DEFAULT_SEVERANCE_STATE,
  vat: DEFAULT_VAT_STATE,
  withholdingTax: DEFAULT_WITHHOLDING_TAX_STATE,
  multiSourceIncome: DEFAULT_MULTI_SOURCE_INCOME_STATE,
  taxTreaty: DEFAULT_TAX_TREATY_STATE,
  coupleOptimizer: DEFAULT_COUPLE_OPTIMIZER_STATE,
  contentCreator: DEFAULT_CONTENT_CREATOR_STATE,
  cryptoTax: DEFAULT_CRYPTO_TAX_STATE,
  goldTax: DEFAULT_GOLD_TAX_STATE,
  monthlyPlanner: DEFAULT_MONTHLY_PLANNER_STATE,
  mortgage: DEFAULT_MORTGAGE_STATE,
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
      foreignerTax: {
        ...DEFAULT_FOREIGNER_TAX_STATE,
        ...(tabStates?.foreignerTax || {}),
        allowances: {
          ...DEFAULT_FOREIGNER_TAX_STATE.allowances,
          ...(tabStates?.foreignerTax?.allowances || {}),
        },
      },
      latePayment: {
        ...DEFAULT_LATE_PAYMENT_STATE,
        ...(tabStates?.latePayment || {}),
      },
      businessFormComparison: {
        ...DEFAULT_BUSINESS_FORM_COMPARISON_STATE,
        ...(tabStates?.businessFormComparison || {}),
      },
      severance: {
        ...DEFAULT_SEVERANCE_STATE,
        ...(tabStates?.severance || {}),
      },
      vat: {
        ...DEFAULT_VAT_STATE,
        ...(tabStates?.vat || {}),
      },
      withholdingTax: {
        ...DEFAULT_WITHHOLDING_TAX_STATE,
        ...(tabStates?.withholdingTax || {}),
      },
      multiSourceIncome: {
        ...DEFAULT_MULTI_SOURCE_INCOME_STATE,
        ...(tabStates?.multiSourceIncome || {}),
        incomeSources: tabStates?.multiSourceIncome?.incomeSources?.map(s => ({ ...s })) || [],
      },
      taxTreaty: {
        ...DEFAULT_TAX_TREATY_STATE,
        ...(tabStates?.taxTreaty || {}),
      },
      coupleOptimizer: {
        ...DEFAULT_COUPLE_OPTIMIZER_STATE,
        ...(tabStates?.coupleOptimizer || {}),
      },
      contentCreator: {
        ...DEFAULT_CONTENT_CREATOR_STATE,
        ...(tabStates?.contentCreator || {}),
        incomeSources: tabStates?.contentCreator?.incomeSources?.map(s => ({ ...s })) || [],
      },
      cryptoTax: {
        ...DEFAULT_CRYPTO_TAX_STATE,
        ...(tabStates?.cryptoTax || {}),
        transactions: tabStates?.cryptoTax?.transactions?.map(t => ({ ...t })) || [],
      },
      goldTax: {
        ...DEFAULT_GOLD_TAX_STATE,
        ...(tabStates?.goldTax || {}),
        transactions: tabStates?.goldTax?.transactions?.map(t => ({ ...t })) || [],
      },
      monthlyPlanner: {
        ...DEFAULT_MONTHLY_PLANNER_STATE,
        ...(tabStates?.monthlyPlanner || {}),
        months: tabStates?.monthlyPlanner?.months?.map(m => ({ ...m })) || createDefaultMonths(),
      },
      mortgage: {
        ...DEFAULT_MORTGAGE_STATE,
        ...(tabStates?.mortgage || {}),
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
      foreignerTax: {
        ...DEFAULT_FOREIGNER_TAX_STATE,
        ...(partial.tabs?.foreignerTax || {}),
        allowances: {
          ...DEFAULT_FOREIGNER_TAX_STATE.allowances,
          ...(partial.tabs?.foreignerTax?.allowances || {}),
        },
      },
      latePayment: {
        ...DEFAULT_LATE_PAYMENT_STATE,
        ...(partial.tabs?.latePayment || {}),
      },
      businessFormComparison: {
        ...DEFAULT_BUSINESS_FORM_COMPARISON_STATE,
        ...(partial.tabs?.businessFormComparison || {}),
      },
      severance: {
        ...DEFAULT_SEVERANCE_STATE,
        ...(partial.tabs?.severance || {}),
      },
      vat: {
        ...DEFAULT_VAT_STATE,
        ...(partial.tabs?.vat || {}),
      },
      withholdingTax: {
        ...DEFAULT_WITHHOLDING_TAX_STATE,
        ...(partial.tabs?.withholdingTax || {}),
      },
      multiSourceIncome: {
        ...DEFAULT_MULTI_SOURCE_INCOME_STATE,
        ...(partial.tabs?.multiSourceIncome || {}),
        incomeSources: partial.tabs?.multiSourceIncome?.incomeSources?.map(s => ({ ...s })) || [],
      },
      taxTreaty: {
        ...DEFAULT_TAX_TREATY_STATE,
        ...(partial.tabs?.taxTreaty || {}),
      },
      coupleOptimizer: {
        ...DEFAULT_COUPLE_OPTIMIZER_STATE,
        ...(partial.tabs?.coupleOptimizer || {}),
      },
      contentCreator: {
        ...DEFAULT_CONTENT_CREATOR_STATE,
        ...(partial.tabs?.contentCreator || {}),
        incomeSources: partial.tabs?.contentCreator?.incomeSources?.map(s => ({ ...s })) || [],
      },
      cryptoTax: {
        ...DEFAULT_CRYPTO_TAX_STATE,
        ...(partial.tabs?.cryptoTax || {}),
        transactions: partial.tabs?.cryptoTax?.transactions?.map(t => ({ ...t })) || [],
      },
      goldTax: {
        ...DEFAULT_GOLD_TAX_STATE,
        ...(partial.tabs?.goldTax || {}),
        transactions: partial.tabs?.goldTax?.transactions?.map(t => ({ ...t })) || [],
      },
      monthlyPlanner: {
        ...DEFAULT_MONTHLY_PLANNER_STATE,
        ...(partial.tabs?.monthlyPlanner || {}),
        months: partial.tabs?.monthlyPlanner?.months?.map(m => ({ ...m })) || createDefaultMonths(),
      },
      mortgage: {
        ...DEFAULT_MORTGAGE_STATE,
        ...(partial.tabs?.mortgage || {}),
      },
      ...(partial.tabs?.incomeSummary && {
        incomeSummary: {
          ...DEFAULT_INCOME_SUMMARY_INPUT,
          ...partial.tabs.incomeSummary,
          entries: partial.tabs.incomeSummary.entries?.map(e => ({ ...e })) || [],
        },
      }),
    },
    meta: {
      createdAt: partial.meta?.createdAt || Date.now(),
      label: partial.meta?.label,
      description: partial.meta?.description,
    },
  };
}

/**
 * Chặn giá trị bất thường của sharedState đến từ URL/localStorage (link sửa tay, dữ liệu cũ):
 * số không hữu hạn/chuỗi → mặc định, tiền kẹp [0, MAX_MONTHLY_INCOME], người phụ thuộc [0, 20],
 * vùng ngoài 1–4 → vùng I.
 */
export function sanitizeSharedState(s: SharedTaxState): SharedTaxState {
  const MAX = 10_000_000_000; // = MAX_MONTHLY_INCOME (utils/inputSanitizers)
  const num = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v);
  const money = (v: unknown, fallback = 0) => {
    const n = num(v);
    return typeof n === 'number' && Number.isFinite(n) ? Math.min(Math.max(0, Math.round(n)), MAX) : fallback;
  };
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  const moneyFields = <T extends object>(o: unknown, defaults: T): T =>
    Object.fromEntries(
      Object.keys(defaults).map((k) => [k, money((o as Record<string, unknown> | undefined)?.[k])])
    ) as T;
  const deps = num(s.dependents);
  const region = num(s.region);
  // Link cũ chỉ có hasInsurance: các loại BH mặc định theo cờ này
  const hasInsurance = bool(s.hasInsurance, true);
  return {
    ...s,
    grossIncome: money(s.grossIncome, DEFAULT_SHARED_STATE.grossIncome),
    declaredSalary: s.declaredSalary === undefined ? undefined : money(s.declaredSalary),
    dependents:
      typeof deps === 'number' && Number.isFinite(deps) ? Math.min(Math.max(0, Math.floor(deps)), 20) : 0,
    otherDeductions: money(s.otherDeductions),
    pensionContribution: money(s.pensionContribution),
    region: region === 1 || region === 2 || region === 3 || region === 4 ? region : 1,
    hasInsurance,
    insuranceOptions: {
      bhxh: bool(s.insuranceOptions?.bhxh, hasInsurance),
      bhyt: bool(s.insuranceOptions?.bhyt, hasInsurance),
      bhtn: bool(s.insuranceOptions?.bhtn, hasInsurance),
    },
    otherIncome: s.otherIncome && moneyFields(s.otherIncome, DEFAULT_OTHER_INCOME),
    allowances: s.allowances && moneyFields(s.allowances, DEFAULT_ALLOWANCES),
  };
}
