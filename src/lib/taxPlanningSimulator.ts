/**
 * Tax Planning Simulator
 * What-If Analysis tool for Vietnamese Personal Income Tax
 *
 * Features:
 * 1. Salary Adjustment - "Nếu lương tăng X%?"
 * 2. Dependent Changes - "Nếu thêm 1 người phụ thuộc?"
 * 3. Bonus Scenarios - Chia thưởng vs nhận 1 lần
 * 4. Multi-year Projection - Dự báo thuế 1-5 năm
 */

import {
  TaxInput,
  TaxResult,
  calculateOldTax,
  calculateNewTax,
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  formatNumber,
  RegionType,
  InsuranceOptions,
  AllowancesState,
} from '@/lib/taxCalculator';

// "Luật cũ" (7 bậc) được so sánh theo kỳ tính thuế 2025: trần hưu trí tự nguyện 1tr,
// trần BHXH 46,8tr, lương tối thiểu vùng 2025
const OLD_LAW_DATE = new Date(2025, 11, 31);

// ===== TYPES =====

export interface SimulationBaseInput {
  grossIncome: number;
  dependents: number;
  hasInsurance: boolean;
  insuranceOptions?: InsuranceOptions;
  region: RegionType;
  otherDeductions: number;
  pensionContribution: number;
  allowances?: AllowancesState;
  declaredSalary?: number;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  input: Partial<SimulationBaseInput>;
}

export interface SimulationResult {
  scenario: SimulationScenario;
  oldTax: TaxResult;
  newTax: TaxResult;
  difference: {
    taxAmount: number;
    netIncome: number;
    effectiveRate: number;
  };
}

// ===== SALARY ADJUSTMENT SCENARIOS =====

export interface SalaryAdjustmentParams {
  adjustmentType: 'percentage' | 'amount';
  value: number; // percentage (e.g., 10 for 10%) or absolute amount
}

/**
 * Generate salary adjustment scenarios
 * "Nếu lương tăng X%?"
 */
export function generateSalaryAdjustmentScenarios(
  baseInput: SimulationBaseInput,
  adjustments: SalaryAdjustmentParams[]
): SimulationScenario[] {
  return adjustments.map((adj, index) => {
    let newSalary: number;
    let name: string;
    let description: string;

    if (adj.adjustmentType === 'percentage') {
      newSalary = baseInput.grossIncome * (1 + adj.value / 100);
      const sign = adj.value >= 0 ? '+' : '';
      name = `Lương ${sign}${adj.value}%`;
      description = `Nếu lương ${adj.value >= 0 ? 'tăng' : 'giảm'} ${Math.abs(adj.value)}%: ${formatNumber(Math.round(newSalary))} VND/tháng`;
    } else {
      newSalary = baseInput.grossIncome + adj.value;
      const sign = adj.value >= 0 ? '+' : '';
      name = `Lương ${sign}${formatNumber(adj.value)} VND`;
      description = `Nếu lương ${adj.value >= 0 ? 'tăng' : 'giảm'} ${formatNumber(Math.abs(adj.value))} VND: ${formatNumber(Math.round(newSalary))} VND/tháng`;
    }

    return {
      id: `salary-adjustment-${index}`,
      name,
      description,
      input: { grossIncome: Math.max(0, newSalary) },
    };
  });
}

/**
 * Quick salary adjustment presets
 */
export function getSalaryAdjustmentPresets(): SalaryAdjustmentParams[] {
  return [
    { adjustmentType: 'percentage', value: 10 },
    { adjustmentType: 'percentage', value: 20 },
    { adjustmentType: 'percentage', value: 30 },
    { adjustmentType: 'percentage', value: 50 },
    { adjustmentType: 'percentage', value: -10 },
  ];
}

// ===== DEPENDENT CHANGE SCENARIOS =====

export interface DependentChangeParams {
  changeType: 'add' | 'remove';
  count: number;
}

/**
 * Generate dependent change scenarios
 * "Nếu thêm/bớt người phụ thuộc?"
 */
export function generateDependentChangeScenarios(
  baseInput: SimulationBaseInput,
  changes: DependentChangeParams[]
): SimulationScenario[] {
  return changes.map((change, index) => {
    const newDependents =
      change.changeType === 'add'
        ? baseInput.dependents + change.count
        : Math.max(0, baseInput.dependents - change.count);

    const action = change.changeType === 'add' ? 'thêm' : 'bớt';
    const oldDeduction = OLD_DEDUCTIONS.dependent * change.count;
    const newDeduction = NEW_DEDUCTIONS.dependent * change.count;

    return {
      id: `dependent-change-${index}`,
      name: `${change.count} người phụ thuộc ${action === 'thêm' ? '+' : '-'}`,
      description: `Nếu ${action} ${change.count} người phụ thuộc (${newDependents} tổng). Giảm trừ: ${formatNumber(oldDeduction)}/tháng (cũ), ${formatNumber(newDeduction)}/tháng (mới)`,
      input: { dependents: newDependents },
    };
  });
}

/**
 * Quick dependent change presets
 */
export function getDependentChangePresets(currentDependents: number): DependentChangeParams[] {
  const presets: DependentChangeParams[] = [
    { changeType: 'add', count: 1 },
    { changeType: 'add', count: 2 },
  ];

  if (currentDependents >= 1) {
    presets.push({ changeType: 'remove', count: 1 });
  }
  if (currentDependents >= 2) {
    presets.push({ changeType: 'remove', count: 2 });
  }

  return presets;
}

// ===== BONUS SCENARIOS =====

export interface BonusScenarioParams {
  annualBonus: number; // Tổng thưởng năm
}

// Một cách chia thưởng: chỉ khác nhau ở số thuế TẠM khấu trừ hằng tháng
export interface BonusTaxResult {
  scenario: string;
  description: string;
  monthlyTaxes: {
    month: number;
    income: number;
    tax: number;
    netIncome: number;
  }[];
  withheldTax: number; // Tổng thuế tạm khấu trừ trong năm (biểu tháng)
  settlementDiff: number; // withheldTax - annualTax: > 0 được hoàn, < 0 nộp thêm khi quyết toán
}

export interface BonusScenariosResult {
  annualTax: number; // Thuế năm sau quyết toán - như nhau với mọi cách chia thưởng
  annualNetIncome: number; // Thực nhận cả năm sau quyết toán
  scenarios: BonusTaxResult[];
}

/**
 * "Chia thưởng vs nhận 1 lần".
 * Thuế tiền lương của cá nhân cư trú tính theo kỳ năm và quyết toán (Luật Thuế TNCN
 * Điều 6, 9; NĐ 253/2026/NĐ-CP Điều 51) nên thuế năm KHÔNG phụ thuộc cách chia thưởng
 * trong năm; khác biệt chỉ là số tạm khấu trừ hằng tháng, được hoàn/bù trừ khi quyết toán.
 * Thưởng không thuộc tiền lương đóng BHXH nên bảo hiểm chỉ tính trên lương.
 */
export function calculateBonusTaxScenarios(
  baseInput: SimulationBaseInput,
  bonusParams: BonusScenarioParams
): BonusScenariosResult {
  const bonus = Math.max(0, bonusParams.annualBonus);
  const input: TaxInput = {
    ...baseInput,
    declaredSalary: baseInput.declaredSalary ?? baseInput.grossIncome,
  };

  // Các tháng có cùng mức giảm trừ nên thuế theo biểu năm (= biểu tháng × 12)
  // trên tổng thu nhập tính thuế cả năm = 12 × thuế của "tháng bình quân".
  const averageMonth = calculateNewTax({ ...input, grossIncome: input.grossIncome + bonus / 12 });
  const annualTax = Math.round(averageMonth.taxAmount * 12);

  const withholding = (scenario: string, description: string, bonusMonths: number[]): BonusTaxResult => {
    const perPayment = bonus / bonusMonths.length;
    const monthlyTaxes = Array.from({ length: 12 }, (_, i) => {
      const income = input.grossIncome + (bonusMonths.includes(i + 1) ? perPayment : 0);
      const result = calculateNewTax({ ...input, grossIncome: income });
      return { month: i + 1, income, tax: result.taxAmount, netIncome: result.netIncome };
    });
    const withheldTax = Math.round(monthlyTaxes.reduce((sum, m) => sum + m.tax, 0));
    return { scenario, description, monthlyTaxes, withheldTax, settlementDiff: withheldTax - annualTax };
  };

  return {
    annualTax,
    annualNetIncome: Math.round(averageMonth.netIncome * 12),
    scenarios: [
      withholding('Nhận 1 lần (tháng 12)', `Nhận toàn bộ ${formatNumber(bonus)} VND vào tháng 12`, [12]),
      withholding(
        'Chia đều 12 tháng',
        `Mỗi tháng thêm ${formatNumber(bonus / 12)} VND`,
        Array.from({ length: 12 }, (_, i) => i + 1)
      ),
      withholding('Chia 2 lần (tháng 6 & 12)', `Mỗi lần ${formatNumber(bonus / 2)} VND`, [6, 12]),
      withholding('Chia 4 lần (mỗi quý)', `Mỗi quý ${formatNumber(bonus / 4)} VND`, [3, 6, 9, 12]),
    ],
  };
}

// ===== MULTI-YEAR PROJECTION =====

export interface YearlyProjectionParams {
  yearsToProject: number; // 1-5 năm
  annualSalaryIncrease: number; // % tăng lương hàng năm
  inflationRate?: number; // % lạm phát (để tính giá trị thực)
  expectedDependentChanges?: {
    year: number;
    change: number; // số người phụ thuộc thay đổi (+/-)
  }[];
}

export interface YearlyProjectionResult {
  year: number;
  grossIncome: number;
  dependents: number;
  oldTax: {
    annual: number;
    monthly: number;
    effectiveRate: number;
  };
  newTax: {
    annual: number;
    monthly: number;
    effectiveRate: number;
  };
  taxSavings: number; // So sánh luật mới vs cũ
  realValue?: number; // Giá trị thực sau lạm phát
}

/**
 * Generate multi-year tax projection
 * "Dự báo thuế 1-5 năm"
 */
export function generateMultiYearProjection(
  baseInput: SimulationBaseInput,
  params: YearlyProjectionParams
): YearlyProjectionResult[] {
  const results: YearlyProjectionResult[] = [];
  const currentYear = new Date().getFullYear();

  let currentSalary = baseInput.grossIncome;
  let currentDependents = baseInput.dependents;
  let cumulativeInflation = 1;

  for (let i = 0; i < params.yearsToProject; i++) {
    const year = currentYear + i;

    // Apply salary increase (skip first year)
    if (i > 0) {
      currentSalary = Math.max(0, currentSalary * (1 + params.annualSalaryIncrease / 100));
    }

    // Check for dependent changes
    const dependentChange = params.expectedDependentChanges?.find((dc) => dc.year === year);
    if (dependentChange) {
      currentDependents = Math.max(0, currentDependents + dependentChange.change);
    }

    // Giữ đủ input thật (phụ cấp, lương đóng BH, hưu trí tự nguyện) như màn hình chính
    const taxInput: TaxInput = {
      ...baseInput,
      grossIncome: Math.round(currentSalary),
      dependents: currentDependents,
    };

    const oldResult = calculateOldTax({ ...taxInput, calculationDate: OLD_LAW_DATE });
    const newResult = calculateNewTax(taxInput);

    // Calculate real value if inflation rate provided
    if (params.inflationRate && i > 0) {
      cumulativeInflation = cumulativeInflation * (1 + params.inflationRate / 100);
    }

    results.push({
      year,
      grossIncome: Math.round(currentSalary),
      dependents: currentDependents,
      oldTax: {
        annual: oldResult.taxAmount * 12,
        monthly: oldResult.taxAmount,
        effectiveRate: oldResult.effectiveRate,
      },
      newTax: {
        annual: newResult.taxAmount * 12,
        monthly: newResult.taxAmount,
        effectiveRate: newResult.effectiveRate,
      },
      taxSavings: (oldResult.taxAmount - newResult.taxAmount) * 12,
      realValue: params.inflationRate
        ? Math.round(newResult.netIncome / cumulativeInflation)
        : undefined,
    });
  }

  return results;
}

// ===== SIMULATION RUNNER =====

/**
 * Run a simulation scenario and return comparison results
 */
export function runSimulation(
  baseInput: SimulationBaseInput,
  scenario: SimulationScenario
): SimulationResult {
  // Merge scenario input with base input
  const simulationInput: TaxInput = {
    ...baseInput,
    ...scenario.input,
  };

  const oldTax = calculateOldTax({ ...simulationInput, calculationDate: OLD_LAW_DATE });
  const newTax = calculateNewTax(simulationInput);

  return {
    scenario,
    oldTax,
    newTax,
    difference: {
      taxAmount: newTax.taxAmount - oldTax.taxAmount,
      netIncome: newTax.netIncome - oldTax.netIncome,
      effectiveRate: newTax.effectiveRate - oldTax.effectiveRate,
    },
  };
}

/**
 * Run multiple simulations and return all results
 */
export function runSimulations(
  baseInput: SimulationBaseInput,
  scenarios: SimulationScenario[]
): SimulationResult[] {
  return scenarios.map((scenario) => runSimulation(baseInput, scenario));
}

/**
 * Export types for external use
 */
export type {
  TaxInput,
  TaxResult,
  RegionType,
  InsuranceOptions,
  AllowancesState,
};
