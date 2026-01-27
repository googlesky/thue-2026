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

export interface ComparisonResult {
  baseline: SimulationResult;
  comparison: SimulationResult;
  impact: {
    taxChange: number;
    netIncomeChange: number;
    taxChangePercent: number;
    netIncomeChangePercent: number;
    monthlyBenefit: number;
    yearlyBenefit: number;
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
  splitMonths?: number; // Số tháng chia thưởng (0 = nhận 1 lần)
}

export interface BonusTaxResult {
  scenario: string;
  description: string;
  monthlyTaxes: {
    month: number;
    income: number;
    tax: number;
    netIncome: number;
  }[];
  totalTax: number;
  totalNetIncome: number;
  averageMonthlyTax: number;
}

/**
 * Calculate bonus tax with different distribution strategies
 * "Chia thưởng vs nhận 1 lần"
 */
export function calculateBonusTaxScenarios(
  baseInput: SimulationBaseInput,
  bonusParams: BonusScenarioParams,
  useTax2026: boolean = true
): BonusTaxResult[] {
  const calculateTax = useTax2026 ? calculateNewTax : calculateOldTax;
  const results: BonusTaxResult[] = [];

  // Scenario 1: Nhận thưởng 1 lần (tháng thưởng)
  const oneTimeResult = calculateOneTimeBonusTax(baseInput, bonusParams.annualBonus, calculateTax);
  results.push(oneTimeResult);

  // Scenario 2: Chia đều 12 tháng
  const splitResult = calculateSplitBonusTax(baseInput, bonusParams.annualBonus, 12, calculateTax);
  results.push(splitResult);

  // Scenario 3: Chia 2 lần (6 tháng/lần)
  const halfYearResult = calculateSplitBonusTax(baseInput, bonusParams.annualBonus, 2, calculateTax);
  results.push(halfYearResult);

  // Scenario 4: Chia 4 lần (quý)
  const quarterlyResult = calculateSplitBonusTax(baseInput, bonusParams.annualBonus, 4, calculateTax);
  results.push(quarterlyResult);

  return results;
}

function calculateOneTimeBonusTax(
  baseInput: SimulationBaseInput,
  bonus: number,
  calculateTax: (input: TaxInput) => TaxResult
): BonusTaxResult {
  const monthlyTaxes: BonusTaxResult['monthlyTaxes'] = [];
  let totalTax = 0;
  let totalNetIncome = 0;

  // 11 tháng bình thường
  for (let month = 1; month <= 11; month++) {
    const result = calculateTax({
      grossIncome: baseInput.grossIncome,
      dependents: baseInput.dependents,
      hasInsurance: baseInput.hasInsurance,
      insuranceOptions: baseInput.insuranceOptions,
      region: baseInput.region,
      otherDeductions: baseInput.otherDeductions,
    });
    monthlyTaxes.push({
      month,
      income: baseInput.grossIncome,
      tax: result.taxAmount,
      netIncome: result.netIncome,
    });
    totalTax += result.taxAmount;
    totalNetIncome += result.netIncome;
  }

  // Tháng 12: Lương + thưởng
  const month12Result = calculateTax({
    grossIncome: baseInput.grossIncome + bonus,
    dependents: baseInput.dependents,
    hasInsurance: baseInput.hasInsurance,
    insuranceOptions: baseInput.insuranceOptions,
    region: baseInput.region,
    otherDeductions: baseInput.otherDeductions,
  });
  monthlyTaxes.push({
    month: 12,
    income: baseInput.grossIncome + bonus,
    tax: month12Result.taxAmount,
    netIncome: month12Result.netIncome,
  });
  totalTax += month12Result.taxAmount;
  totalNetIncome += month12Result.netIncome;

  return {
    scenario: 'Nhận thưởng 1 lần',
    description: `Nhận toàn bộ ${formatNumber(bonus)} VND vào tháng 12`,
    monthlyTaxes,
    totalTax,
    totalNetIncome,
    averageMonthlyTax: totalTax / 12,
  };
}

function calculateSplitBonusTax(
  baseInput: SimulationBaseInput,
  bonus: number,
  splitCount: number,
  calculateTax: (input: TaxInput) => TaxResult
): BonusTaxResult {
  const monthlyTaxes: BonusTaxResult['monthlyTaxes'] = [];
  let totalTax = 0;
  let totalNetIncome = 0;

  const bonusPerSplit = bonus / splitCount;
  const splitMonths =
    splitCount === 12
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : splitCount === 2
        ? [6, 12]
        : splitCount === 4
          ? [3, 6, 9, 12]
          : [12];

  for (let month = 1; month <= 12; month++) {
    const isBonusMonth = splitMonths.includes(month);
    const income = baseInput.grossIncome + (isBonusMonth ? bonusPerSplit : 0);

    const result = calculateTax({
      grossIncome: income,
      dependents: baseInput.dependents,
      hasInsurance: baseInput.hasInsurance,
      insuranceOptions: baseInput.insuranceOptions,
      region: baseInput.region,
      otherDeductions: baseInput.otherDeductions,
    });

    monthlyTaxes.push({
      month,
      income,
      tax: result.taxAmount,
      netIncome: result.netIncome,
    });
    totalTax += result.taxAmount;
    totalNetIncome += result.netIncome;
  }

  let scenarioName: string;
  let description: string;

  if (splitCount === 12) {
    scenarioName = 'Chia đều 12 tháng';
    description = `Mỗi tháng thêm ${formatNumber(Math.round(bonusPerSplit))} VND`;
  } else if (splitCount === 2) {
    scenarioName = 'Chia 2 lần (tháng 6 & 12)';
    description = `Mỗi lần ${formatNumber(Math.round(bonusPerSplit))} VND`;
  } else if (splitCount === 4) {
    scenarioName = 'Chia 4 lần (mỗi quý)';
    description = `Mỗi quý ${formatNumber(Math.round(bonusPerSplit))} VND`;
  } else {
    scenarioName = `Chia ${splitCount} lần`;
    description = `Mỗi lần ${formatNumber(Math.round(bonusPerSplit))} VND`;
  }

  return {
    scenario: scenarioName,
    description,
    monthlyTaxes,
    totalTax,
    totalNetIncome,
    averageMonthlyTax: totalTax / 12,
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
      currentSalary = currentSalary * (1 + params.annualSalaryIncrease / 100);
    }

    // Check for dependent changes
    const dependentChange = params.expectedDependentChanges?.find((dc) => dc.year === year);
    if (dependentChange) {
      currentDependents = Math.max(0, currentDependents + dependentChange.change);
    }

    // Calculate taxes
    const taxInput: TaxInput = {
      grossIncome: Math.round(currentSalary),
      dependents: currentDependents,
      hasInsurance: baseInput.hasInsurance,
      insuranceOptions: baseInput.insuranceOptions,
      region: baseInput.region,
      otherDeductions: baseInput.otherDeductions,
    };

    const oldResult = calculateOldTax(taxInput);
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

  const oldTax = calculateOldTax(simulationInput);
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
 * Compare two simulation results
 */
export function compareSimulations(
  baseline: SimulationResult,
  comparison: SimulationResult,
  useTax2026: boolean = true
): ComparisonResult {
  const baselineTax = useTax2026 ? baseline.newTax : baseline.oldTax;
  const comparisonTax = useTax2026 ? comparison.newTax : comparison.oldTax;

  const taxChange = comparisonTax.taxAmount - baselineTax.taxAmount;
  const netIncomeChange = comparisonTax.netIncome - baselineTax.netIncome;

  const taxChangePercent = baselineTax.taxAmount > 0
    ? (taxChange / baselineTax.taxAmount) * 100
    : 0;

  const netIncomeChangePercent = baselineTax.netIncome > 0
    ? (netIncomeChange / baselineTax.netIncome) * 100
    : 0;

  return {
    baseline,
    comparison,
    impact: {
      taxChange,
      netIncomeChange,
      taxChangePercent,
      netIncomeChangePercent,
      monthlyBenefit: -taxChange, // Positive if saving money
      yearlyBenefit: -taxChange * 12,
    },
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Find the optimal bonus distribution strategy
 */
export function findOptimalBonusStrategy(
  results: BonusTaxResult[]
): BonusTaxResult | null {
  if (results.length === 0) return null;

  return results.reduce((best, current) =>
    current.totalTax < best.totalTax ? current : best
  );
}

/**
 * Calculate break-even salary for tax bracket
 * "Lương bao nhiêu thì chịu thuế bậc tiếp theo?"
 */
export function calculateBreakEvenSalary(
  baseInput: SimulationBaseInput,
  useTax2026: boolean = true
): {
  currentBracket: number;
  nextBracketThreshold: number;
  additionalSalaryNeeded: number;
  marginalRate: number;
} {
  const calculateTax = useTax2026 ? calculateNewTax : calculateOldTax;
  const result = calculateTax({
    grossIncome: baseInput.grossIncome,
    dependents: baseInput.dependents,
    hasInsurance: baseInput.hasInsurance,
    insuranceOptions: baseInput.insuranceOptions,
    region: baseInput.region,
    otherDeductions: baseInput.otherDeductions,
  });

  // Find current bracket from breakdown
  const currentBracket = result.taxBreakdown.length;
  const lastBracket = result.taxBreakdown[result.taxBreakdown.length - 1];

  if (!lastBracket) {
    return {
      currentBracket: 0,
      nextBracketThreshold: 0,
      additionalSalaryNeeded: 0,
      marginalRate: 0,
    };
  }

  // Calculate how much more income needed to hit next bracket
  const totalDeductions = result.totalDeductions;
  const taxableIncome = result.taxableIncome;
  const nextBracketStart = lastBracket.to;

  const additionalTaxableNeeded =
    nextBracketStart === Infinity ? 0 : nextBracketStart - taxableIncome;

  return {
    currentBracket,
    nextBracketThreshold: nextBracketStart + totalDeductions,
    additionalSalaryNeeded: Math.max(0, additionalTaxableNeeded),
    marginalRate: lastBracket.rate * 100,
  };
}

/**
 * Generate summary text for simulation results
 */
export function generateSimulationSummary(result: SimulationResult, useTax2026: boolean = true): string {
  const tax = useTax2026 ? result.newTax : result.oldTax;
  const taxName = useTax2026 ? 'Luật 2026' : 'Luật hiện hành';

  return `${result.scenario.name}: Thu nhập ${formatNumber(tax.grossIncome)} VND → Thuế ${formatNumber(tax.taxAmount)} VND/tháng (${tax.effectiveRate.toFixed(1)}%) → Thực nhận ${formatNumber(tax.netIncome)} VND`;
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
