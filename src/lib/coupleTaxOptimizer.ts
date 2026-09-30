/**
 * Couple Tax Optimizer - Tối ưu thuế cho vợ chồng
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 109/2025/QH15 (sửa đổi bởi Luật 09/2026/QH16): Điều 9, 10
 * - NĐ 253/2026/NĐ-CP: Điều 46 (trần hưu trí/BH nhân thọ 3tr/tháng), Điều 47, 49
 * - TT 87/2026/TT-BTC (người phụ thuộc thu nhập bình quân ≤ 3tr/tháng)
 *
 * Strategies:
 * 1. Phân bổ người phụ thuộc tối ưu (mỗi NPT chỉ tính cho 1 người nộp thuế)
 * 2. Tối ưu giảm trừ (hưu trí tự nguyện, BH nhân thọ, từ thiện)
 * 3. Cân bằng thu nhập khi có thể
 */

import {
  calculateNewTax,
  getVoluntaryPensionCap,
  NEW_TAX_BRACKETS,
  type TaxResult,
} from './taxCalculator';

// Số người phụ thuộc tối đa xét phân bổ (chặn dữ liệu nhập tay/snapshot)
export const MAX_COUPLE_DEPENDENTS = 10;

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
 * (engine tự chặn trần hưu trí tự nguyện + BH nhân thọ theo kỳ tính thuế)
 */
function calculatePersonTax(person: PersonIncome, dependents: number): TaxResult {
  return calculateNewTax({
    grossIncome: person.grossIncome,
    dependents,
    otherDeductions: person.otherDeductions,
    pensionContribution: person.pensionContribution,
    hasInsurance: person.hasInsurance,
    region: 1, // Default region
  });
}

/**
 * Get marginal tax rate for income level (0 khi chưa phải nộp thuế)
 */
function getMarginalRate(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
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
 * (số tiết kiệm tính bằng chính engine thuế, không ước lượng)
 */
function generateTips(
  person1: PersonIncome,
  person2: PersonIncome,
  totalDependents: number,
  optimalScenario: AllocationScenario,
  currentScenario: AllocationScenario
): OptimizationTip[] {
  const tips: OptimizationTip[] = [];
  const p1Deps = optimalScenario.person1Dependents;
  const p2Deps = optimalScenario.person2Dependents;
  const p1MarginalRate = getMarginalRate(calculatePersonTax(person1, p1Deps).taxableIncome);
  const p2MarginalRate = getMarginalRate(calculatePersonTax(person2, p2Deps).taxableIncome);

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

  // Tip 2: NPT giảm thuế cho ai nhiều hơn (chênh thuế khi đăng ký 1 NPT)
  if (totalDependents > 0) {
    const gain = (p: PersonIncome) => calculatePersonTax(p, 0).taxAmount - calculatePersonTax(p, 1).taxAmount;
    const [g1, g2] = [gain(person1), gain(person2)];
    if (Math.abs(g1 - g2) >= 1000) {
      const [hi, lo, gHi, gLo] = g1 > g2 ? [person1, person2, g1, g2] : [person2, person1, g2, g1];
      tips.push({
        id: 'tip-higher-earner',
        title: 'Người thu nhập cao đăng ký NPT',
        description: `Đăng ký 1 NPT cho ${hi.name} giảm ${formatCurrency(gHi)}/tháng tiền thuế, cho ${lo.name} chỉ giảm ${formatCurrency(gLo)}/tháng. Phương án phân bổ tối ưu ở trên đã tính cho toàn bộ NPT.`,
        potentialSavings: 0, // Đã tính trong tip phân bổ NPT
        category: 'dependent',
      });
    }
  }

  // Tip 3: Hưu trí tự nguyện, BH nhân thọ (tổng tối đa 3tr/tháng/người, NĐ 253/2026 Điều 46.2.a)
  const pensionCap = getVoluntaryPensionCap();
  const pensionGain = (p: PersonIncome, deps: number) =>
    p.pensionContribution >= pensionCap
      ? 0
      : calculatePersonTax(p, deps).taxAmount - calculatePersonTax({ ...p, pensionContribution: pensionCap }, deps).taxAmount;
  const [pg1, pg2] = [pensionGain(person1, p1Deps), pensionGain(person2, p2Deps)];
  if (Math.max(pg1, pg2) > 0) {
    const [who, savings] = pg1 >= pg2 ? [person1, pg1] : [person2, pg2];
    tips.push({
      id: 'tip-voluntary-pension',
      title: 'Hưu trí tự nguyện, bảo hiểm nhân thọ',
      description: `Đóng đủ ${formatCurrency(pensionCap)}/tháng cho ${who.name} (đang đóng ${formatCurrency(who.pensionContribution)}) giúp giảm ${formatCurrency(savings)}/tháng tiền thuế. Mức trừ tối đa ${formatCurrency(pensionCap)}/tháng/người, tính gộp hưu trí bổ sung, hưu trí tự nguyện, bảo hiểm nhân thọ (kể cả phần công ty đóng).`,
      potentialSavings: savings,
      category: 'deduction',
    });
  }

  // Tip 4: Charitable contributions
  if (person1.otherDeductions === 0 && person2.otherDeductions === 0) {
    tips.push({
      id: 'tip-charity',
      title: 'Đóng góp từ thiện qua tổ chức hợp pháp',
      description: 'Khoản đóng góp từ thiện, nhân đạo qua tổ chức được công nhận sẽ được giảm trừ khỏi thu nhập chịu thuế của người đóng góp.',
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

  // Tip 6: Thời điểm nhận thưởng (thuế tiền lương quyết toán theo năm)
  tips.push({
    id: 'tip-timing',
    title: 'Thời điểm nhận thưởng',
    description: 'Thưởng được cộng vào thu nhập tiền lương của tháng chi trả để tạm khấu trừ; nghĩa vụ cuối cùng xác định khi quyết toán năm, nên thời điểm nhận thưởng trong cùng năm không làm thay đổi thuế năm.',
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
  const { person1, person2 } = input;
  // Chặn [0, MAX]: số âm/NaN làm mảng phương án rỗng, số quá lớn làm treo trang
  const totalDependents = Math.max(0, Math.min(MAX_COUPLE_DEPENDENTS, Math.floor(input.totalDependents || 0)));

  // Generate all allocation scenarios (luôn ≥ 1 phương án sau khi chặn)
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
    optimalScenario,
    currentScenario
  );

  // Calculate combined metrics (thực nhận = GROSS − BH − thuế)
  const combinedGrossIncome = person1.grossIncome + person2.grossIncome;
  const combinedNetIncome =
    calculatePersonTax(person1, optimalScenario.person1Dependents).netIncome +
    calculatePersonTax(person2, optimalScenario.person2Dependents).netIncome;
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
