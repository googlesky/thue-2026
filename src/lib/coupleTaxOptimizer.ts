/**
 * Couple Tax Optimizer - Tối ưu thuế cho vợ chồng
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 2007 (sửa đổi 2012, 2014, 2024)
 * - Thông tư 111/2013/TT-BTC
 * - Nghị quyết 954/2020/UBTVQH14
 *
 * Strategies:
 * 1. Phân bổ người phụ thuộc tối ưu
 * 2. Tối ưu giảm trừ (BHXH tự nguyện, hưu trí tự nguyện, từ thiện)
 * 3. Cân bằng thu nhập khi có thể
 */

import {
  calculateNewTax,
  NEW_TAX_BRACKETS,
  NEW_DEDUCTIONS,
  type TaxResult,
} from './taxCalculator';

// Person income info
export interface PersonIncome {
  name: string;
  grossIncome: number;
  hasInsurance: boolean;
  pensionContribution: number;
  otherDeductions: number;
}

// Couple input
export interface CoupleInput {
  person1: PersonIncome;
  person2: PersonIncome;
  totalDependents: number;
  charitableContribution: number;
  voluntaryPension: number;
}

// Allocation scenario
export interface AllocationScenario {
  id: string;
  description: string;
  person1Dependents: number;
  person2Dependents: number;
  person1Tax: number;
  person2Tax: number;
  totalTax: number;
  savings: number;
}

// Optimization tip
export interface OptimizationTip {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  category: 'dependent' | 'deduction' | 'timing' | 'structure';
}

// Couple optimization result
export interface CoupleOptimizationResult {
  currentScenario: AllocationScenario;
  optimalScenario: AllocationScenario;
  allScenarios: AllocationScenario[];
  tips: OptimizationTip[];
  combinedGrossIncome: number;
  combinedNetIncome: number;
  effectiveTaxRate: number;
}

/**
 * Calculate tax for a person with given dependents
 */
function calculatePersonTax(
  person: PersonIncome,
  dependents: number,
  useNewLaw: boolean = true
): TaxResult {
  return calculateNewTax({
    grossIncome: person.grossIncome,
    dependents,
    otherDeductions: person.otherDeductions + person.pensionContribution,
    hasInsurance: person.hasInsurance,
    region: 1, // Default region
  });
}

/**
 * Get marginal tax rate for income level
 */
function getMarginalRate(taxableIncome: number): number {
  for (const bracket of NEW_TAX_BRACKETS) {
    if (taxableIncome <= bracket.max) {
      return bracket.rate;
    }
  }
  return NEW_TAX_BRACKETS[NEW_TAX_BRACKETS.length - 1].rate;
}

/**
 * Calculate all possible dependent allocation scenarios
 */
function generateAllocationScenarios(
  person1: PersonIncome,
  person2: PersonIncome,
  totalDependents: number
): AllocationScenario[] {
  const scenarios: AllocationScenario[] = [];

  for (let p1Deps = 0; p1Deps <= totalDependents; p1Deps++) {
    const p2Deps = totalDependents - p1Deps;

    const p1Result = calculatePersonTax(person1, p1Deps);
    const p2Result = calculatePersonTax(person2, p2Deps);

    const totalTax = p1Result.taxAmount + p2Result.taxAmount;

    scenarios.push({
      id: `scenario-${p1Deps}-${p2Deps}`,
      description: `${person1.name}: ${p1Deps} NPT, ${person2.name}: ${p2Deps} NPT`,
      person1Dependents: p1Deps,
      person2Dependents: p2Deps,
      person1Tax: p1Result.taxAmount,
      person2Tax: p2Result.taxAmount,
      totalTax,
      savings: 0, // Will be calculated relative to current
    });
  }

  return scenarios;
}

/**
 * Generate optimization tips based on couple's situation
 */
function generateTips(
  person1: PersonIncome,
  person2: PersonIncome,
  totalDependents: number,
  charitableContribution: number,
  voluntaryPension: number,
  optimalScenario: AllocationScenario,
  currentScenario: AllocationScenario
): OptimizationTip[] {
  const tips: OptimizationTip[] = [];

  // Get taxable income estimates
  const p1TaxableEstimate = person1.grossIncome - NEW_DEDUCTIONS.personal -
    (person1.grossIncome * 0.105); // Approximate insurance
  const p2TaxableEstimate = person2.grossIncome - NEW_DEDUCTIONS.personal -
    (person2.grossIncome * 0.105);

  const p1MarginalRate = getMarginalRate(p1TaxableEstimate);
  const p2MarginalRate = getMarginalRate(p2TaxableEstimate);

  // Tip 1: Dependent allocation
  if (optimalScenario.totalTax < currentScenario.totalTax) {
    tips.push({
      id: 'tip-dependent-allocation',
      title: 'Phân bổ người phụ thuộc tối ưu',
      description: `Đăng ký ${optimalScenario.person1Dependents} NPT cho ${person1.name} và ${optimalScenario.person2Dependents} NPT cho ${person2.name} để tiết kiệm thuế tối đa.`,
      potentialSavings: currentScenario.totalTax - optimalScenario.totalTax,
      category: 'dependent',
    });
  }

  // Tip 2: Assign dependents to higher earner
  if (p1MarginalRate > p2MarginalRate && totalDependents > 0) {
    const savingsPerDependent = NEW_DEDUCTIONS.dependent * (p1MarginalRate - p2MarginalRate);
    if (savingsPerDependent > 0) {
      tips.push({
        id: 'tip-higher-earner',
        title: 'Người thu nhập cao đăng ký NPT',
        description: `${person1.name} có thuế suất biên ${(p1MarginalRate * 100).toFixed(0)}% cao hơn ${person2.name} (${(p2MarginalRate * 100).toFixed(0)}%). Mỗi NPT đăng ký cho ${person1.name} tiết kiệm thêm ${formatCurrency(savingsPerDependent)}/tháng so với ${person2.name}.`,
        potentialSavings: savingsPerDependent * totalDependents,
        category: 'dependent',
      });
    }
  } else if (p2MarginalRate > p1MarginalRate && totalDependents > 0) {
    const savingsPerDependent = NEW_DEDUCTIONS.dependent * (p2MarginalRate - p1MarginalRate);
    if (savingsPerDependent > 0) {
      tips.push({
        id: 'tip-higher-earner',
        title: 'Người thu nhập cao đăng ký NPT',
        description: `${person2.name} có thuế suất biên ${(p2MarginalRate * 100).toFixed(0)}% cao hơn ${person1.name} (${(p1MarginalRate * 100).toFixed(0)}%). Mỗi NPT đăng ký cho ${person2.name} tiết kiệm thêm ${formatCurrency(savingsPerDependent)}/tháng so với ${person1.name}.`,
        potentialSavings: savingsPerDependent * totalDependents,
        category: 'dependent',
      });
    }
  }

  // Tip 3: Voluntary pension
  const maxVoluntaryPension = 1_000_000; // 1 triệu/tháng mỗi người
  if (voluntaryPension === 0) {
    const higherEarner = person1.grossIncome > person2.grossIncome ? person1 : person2;
    const higherRate = Math.max(p1MarginalRate, p2MarginalRate);
    const potentialSavings = maxVoluntaryPension * higherRate;

    tips.push({
      id: 'tip-voluntary-pension',
      title: 'Tham gia bảo hiểm hưu trí tự nguyện',
      description: `Đóng hưu trí tự nguyện tối đa ${formatCurrency(maxVoluntaryPension)}/tháng cho ${higherEarner.name} để giảm thuế suất ${(higherRate * 100).toFixed(0)}%.`,
      potentialSavings,
      category: 'deduction',
    });
  }

  // Tip 4: Charitable contributions
  if (charitableContribution === 0) {
    const higherRate = Math.max(p1MarginalRate, p2MarginalRate);
    tips.push({
      id: 'tip-charity',
      title: 'Đóng góp từ thiện qua tổ chức hợp pháp',
      description: 'Khoản đóng góp từ thiện, nhân đạo qua tổ chức được công nhận sẽ được giảm trừ khỏi thu nhập chịu thuế.',
      potentialSavings: 0, // Variable
      category: 'deduction',
    });
  }

  // Tip 5: Income splitting (if applicable)
  const incomeGap = Math.abs(person1.grossIncome - person2.grossIncome);
  if (incomeGap > 20_000_000 && p1MarginalRate !== p2MarginalRate) {
    tips.push({
      id: 'tip-income-structure',
      title: 'Cân nhắc cấu trúc thu nhập',
      description: 'Khi một người có thu nhập cao hơn nhiều, có thể cân nhắc các phương án hợp pháp như: thuê người phối ngẫu làm việc, cho thuê tài sản, góp vốn kinh doanh hộ gia đình.',
      potentialSavings: 0, // Complex to calculate
      category: 'structure',
    });
  }

  // Tip 6: Timing for bonus/income
  tips.push({
    id: 'tip-timing',
    title: 'Thời điểm nhận thu nhập',
    description: 'Nếu có thể, tránh nhận thưởng/thu nhập đột biến trong cùng một tháng để không bị đẩy lên bậc thuế cao. Thưởng Tết được tính thuế riêng biệt.',
    potentialSavings: 0,
    category: 'timing',
  });

  // Sort by potential savings (highest first)
  tips.sort((a, b) => b.potentialSavings - a.potentialSavings);

  return tips;
}

/**
 * Main optimization function
 */
export function optimizeCoupleTax(input: CoupleInput): CoupleOptimizationResult {
  const { person1, person2, totalDependents, charitableContribution, voluntaryPension } = input;

  // Generate all allocation scenarios
  const scenarios = generateAllocationScenarios(person1, person2, totalDependents);

  // Find optimal scenario (lowest total tax)
  let optimalScenario = scenarios[0];
  for (const scenario of scenarios) {
    if (scenario.totalTax < optimalScenario.totalTax) {
      optimalScenario = scenario;
    }
  }

  // Assume current scenario is equal split
  const equalSplit = Math.floor(totalDependents / 2);
  const currentScenario = scenarios.find(
    s => s.person1Dependents === equalSplit
  ) || scenarios[0];

  // Calculate savings for each scenario relative to current
  for (const scenario of scenarios) {
    scenario.savings = currentScenario.totalTax - scenario.totalTax;
  }

  // Generate tips
  const tips = generateTips(
    person1,
    person2,
    totalDependents,
    charitableContribution,
    voluntaryPension,
    optimalScenario,
    currentScenario
  );

  // Calculate combined metrics
  const combinedGrossIncome = person1.grossIncome + person2.grossIncome;
  const combinedNetIncome = combinedGrossIncome - optimalScenario.totalTax;
  const effectiveTaxRate = combinedGrossIncome > 0
    ? (optimalScenario.totalTax / combinedGrossIncome) * 100
    : 0;

  return {
    currentScenario,
    optimalScenario,
    allScenarios: scenarios,
    tips,
    combinedGrossIncome,
    combinedNetIncome,
    effectiveTaxRate,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get category label
 */
export function getCategoryLabel(category: OptimizationTip['category']): string {
  const labels: Record<typeof category, string> = {
    dependent: 'Người phụ thuộc',
    deduction: 'Giảm trừ',
    timing: 'Thời điểm',
    structure: 'Cấu trúc thu nhập',
  };
  return labels[category];
}

/**
 * Get category color
 */
export function getCategoryColor(category: OptimizationTip['category']): string {
  const colors: Record<typeof category, string> = {
    dependent: 'blue',
    deduction: 'green',
    timing: 'yellow',
    structure: 'purple',
  };
  return colors[category];
}
