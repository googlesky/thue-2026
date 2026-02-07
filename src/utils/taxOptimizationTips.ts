/**
 * Tax Optimization Tips Generator
 * Generates personalized tax optimization suggestions based on user's input data
 * Based on Vietnamese Personal Income Tax Law (Luật Thuế TNCN)
 */

import {
  OLD_DEDUCTIONS,
  NEW_DEDUCTIONS,
  OLD_TAX_BRACKETS,
  NEW_TAX_BRACKETS,
  calculateOldTax,
  calculateNewTax,
  formatNumber,
  InsuranceOptions,
  RegionType,
  AllowancesState,
} from '@/lib/taxCalculator';

// ===== TYPES =====

export interface TaxOptimizationInput {
  grossIncome: number;
  dependents: number;
  hasInsurance: boolean;
  insuranceOptions: InsuranceOptions;
  region: RegionType;
  otherDeductions: number;
  pensionContribution: number;
  allowances?: AllowancesState;
  declaredSalary?: number;
}

export type TipPriority = 'critical' | 'high' | 'medium' | 'low';
export type TipCategory = 'deduction' | 'timing' | 'structure' | 'compliance' | 'allowance' | 'investment';

// Priority thresholds for automatic upgrade to critical
const CRITICAL_SAVINGS_THRESHOLD = 500_000; // >500k/month savings = critical
const CRITICAL_YEARLY_SAVINGS_THRESHOLD = 6_000_000; // >6M/year savings = critical

export interface TaxTip {
  id: string;
  title: string;
  description: string;
  potentialSavings?: number; // estimated savings in VND per month
  potentialSavingsYearly?: number; // estimated savings in VND per year
  priority: TipPriority;
  category: TipCategory;
  icon?: string; // icon identifier for UI
  actionable: boolean; // whether user can act on this tip now
}

// ===== CONSTANTS =====

// Maximum voluntary pension contribution deductible (per month)
const MAX_PENSION_DEDUCTION = 1_000_000;

// Threshold for considering business structure
const HIGH_INCOME_THRESHOLD = 100_000_000; // 100M/month

// Threshold for dependent registration reminder
const INCOME_THRESHOLD_FOR_DEPENDENT_TIP = 20_000_000; // 20M/month

// Threshold for income splitting tip (married couple)
const INCOME_SPLITTING_THRESHOLD = 50_000_000; // 50M/month

// Threshold for household business conversion
const HOUSEHOLD_BUSINESS_ANNUAL_THRESHOLD = 500_000_000; // 500M/year (2026)

// Threshold for investment tip
const INVESTMENT_TIP_THRESHOLD = 40_000_000; // 40M/month

// New tax law effective date for salary/wage income (thu nhập từ tiền lương, tiền công)
// Note: Theo điều khoản chuyển tiếp Luật Thuế TNCN sửa đổi 2025, áp dụng từ kỳ tính thuế năm 2026
const NEW_TAX_LAW_EFFECTIVE_DATE = new Date('2026-01-01');

// ===== HELPER FUNCTIONS =====

/**
 * Get current date (can be mocked for testing)
 */
function getCurrentDate(): Date {
  return new Date();
}

/**
 * Get current month (1-12)
 */
function getCurrentMonth(): number {
  return getCurrentDate().getMonth() + 1;
}

/**
 * Get current year
 */
function getCurrentYear(): number {
  return getCurrentDate().getFullYear();
}

/**
 * Check if we're in Q1 (January - March)
 */
function isQ1(): boolean {
  const month = getCurrentMonth();
  return month >= 1 && month <= 3;
}

/**
 * Check if we're in 2025 (before new tax law)
 */
function isYear2025(): boolean {
  return getCurrentYear() === 2025;
}

// Note: isFirstHalf2026 removed - no longer needed since new law applies from 01/01/2026 for salary income

/**
 * Calculate tax savings from adding dependents
 */
function calculateDependentSavings(
  grossIncome: number,
  currentDependents: number,
  additionalDependents: number,
  useNewLaw: boolean
): number {
  const calculate = useNewLaw ? calculateNewTax : calculateOldTax;

  const currentTax = calculate({
    grossIncome,
    dependents: currentDependents,
    hasInsurance: true,
  });

  const newTax = calculate({
    grossIncome,
    dependents: currentDependents + additionalDependents,
    hasInsurance: true,
  });

  return currentTax.taxAmount - newTax.taxAmount;
}

/**
 * Calculate tax savings from pension contribution
 */
function calculatePensionSavings(
  grossIncome: number,
  dependents: number,
  currentPension: number,
  newPension: number,
  useNewLaw: boolean
): number {
  const calculate = useNewLaw ? calculateNewTax : calculateOldTax;

  const currentTax = calculate({
    grossIncome,
    dependents,
    otherDeductions: currentPension,
    hasInsurance: true,
  });

  const newTax = calculate({
    grossIncome,
    dependents,
    otherDeductions: newPension,
    hasInsurance: true,
  });

  return currentTax.taxAmount - newTax.taxAmount;
}

/**
 * Calculate tax difference between old and new law
 */
function calculateNewLawSavings(
  grossIncome: number,
  dependents: number,
  otherDeductions: number
): number {
  const oldTax = calculateOldTax({
    grossIncome,
    dependents,
    otherDeductions,
    hasInsurance: true,
  });

  const newTax = calculateNewTax({
    grossIncome,
    dependents,
    otherDeductions,
    hasInsurance: true,
  });

  return oldTax.taxAmount - newTax.taxAmount;
}

/**
 * Find the highest tax bracket for given taxable income
 */
function getHighestBracketRate(taxableIncome: number, useNewLaw: boolean): number {
  const brackets = useNewLaw ? NEW_TAX_BRACKETS : OLD_TAX_BRACKETS;

  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].min) {
      return brackets[i].rate;
    }
  }
  return 0;
}

// ===== TIP GENERATORS =====

/**
 * Generate tip for dependent registration
 */
function generateDependentTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, dependents } = input;

  // Only show if income is significant and no dependents registered
  if (grossIncome < INCOME_THRESHOLD_FOR_DEPENDENT_TIP) {
    return null;
  }

  // Calculate potential savings for 1 dependent
  const savingsNewLaw = calculateDependentSavings(grossIncome, dependents, 1, true);
  const savingsOldLaw = calculateDependentSavings(grossIncome, dependents, 1, false);
  const avgSavings = Math.round((savingsNewLaw + savingsOldLaw) / 2);

  if (dependents === 0) {
    return {
      id: 'dependent-registration',
      title: 'Đăng ký người phụ thuộc',
      description: `Nếu bạn có con dưới 18 tuổi, cha mẹ trên 60 tuổi không có thu nhập, hoặc người thân khuyết tật, hãy đăng ký người phụ thuộc. Mỗi người phụ thuộc giúp giảm ${formatNumber(NEW_DEDUCTIONS.dependent)} VNĐ thu nhập tính thuế (luật mới).`,
      potentialSavings: avgSavings,
      potentialSavingsYearly: avgSavings * 12,
      priority: 'high',
      category: 'deduction',
      icon: 'users',
      actionable: true,
    };
  }

  // If already has dependents, suggest reviewing if there are more eligible
  if (dependents > 0 && dependents < 3 && grossIncome > 50_000_000) {
    return {
      id: 'dependent-review',
      title: 'Kiểm tra người phụ thuộc bổ sung',
      description: `Bạn đã đăng ký ${dependents} người phụ thuộc. Hãy kiểm tra xem còn người thân nào đủ điều kiện không (cha mẹ già, con nhỏ, người khuyết tật...). Mỗi người thêm giảm ${formatNumber(NEW_DEDUCTIONS.dependent)} VNĐ/tháng thu nhập tính thuế.`,
      potentialSavings: avgSavings,
      potentialSavingsYearly: avgSavings * 12,
      priority: 'medium',
      category: 'deduction',
      icon: 'user-plus',
      actionable: true,
    };
  }

  return null;
}

/**
 * Generate tip for voluntary pension fund
 */
function generatePensionTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, dependents, pensionContribution } = input;

  // Only relevant for people with taxable income
  if (grossIncome < 15_000_000) {
    return null;
  }

  // Already maxed out
  if (pensionContribution >= MAX_PENSION_DEDUCTION) {
    return null;
  }

  const remainingDeduction = MAX_PENSION_DEDUCTION - pensionContribution;
  const savingsNewLaw = calculatePensionSavings(
    grossIncome,
    dependents,
    pensionContribution,
    MAX_PENSION_DEDUCTION,
    true
  );
  const savingsOldLaw = calculatePensionSavings(
    grossIncome,
    dependents,
    pensionContribution,
    MAX_PENSION_DEDUCTION,
    false
  );
  const avgSavings = Math.round((savingsNewLaw + savingsOldLaw) / 2);

  if (avgSavings <= 0) {
    return null;
  }

  if (pensionContribution === 0) {
    return {
      id: 'pension-fund',
      title: 'Đóng quỹ hưu trí tự nguyện',
      description: `Đóng tối đa ${formatNumber(MAX_PENSION_DEDUCTION)} VNĐ/tháng vào quỹ hưu trí tự nguyện được khấu trừ thuế. Vừa tiết kiệm cho tuổi già, vừa giảm thuế hiện tại.`,
      potentialSavings: avgSavings,
      potentialSavingsYearly: avgSavings * 12,
      priority: 'medium',
      category: 'deduction',
      icon: 'piggy-bank',
      actionable: true,
    };
  }

  // Suggest increasing to max
  return {
    id: 'pension-fund-max',
    title: 'Tăng mức đóng quỹ hưu trí',
    description: `Bạn đang đóng ${formatNumber(pensionContribution)} VNĐ/tháng. Tăng thêm ${formatNumber(remainingDeduction)} VNĐ để đạt mức tối đa được khấu trừ.`,
    potentialSavings: avgSavings,
    potentialSavingsYearly: avgSavings * 12,
    priority: 'low',
    category: 'deduction',
    icon: 'piggy-bank',
    actionable: true,
  };
}

/**
 * Generate tip for bonus timing (relevant for 2025 only)
 * Note: Từ 01/01/2026, luật mới đã áp dụng cho toàn bộ thu nhập tiền lương, tiền công
 */
function generateBonusTimingTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, dependents, otherDeductions } = input;

  // Only show in 2025 (before new law takes effect)
  // From 2026, new law applies to all salary/wage income for the entire year
  if (!isYear2025()) {
    return null;
  }

  // Only relevant for higher income
  if (grossIncome < 30_000_000) {
    return null;
  }

  // Calculate monthly savings under new law
  const monthlySavings = calculateNewLawSavings(grossIncome, dependents, otherDeductions);

  if (monthlySavings <= 0) {
    return null;
  }

  // Estimate bonus timing savings (assume typical 13th month bonus)
  const typicalBonus = grossIncome; // 1 month salary as bonus
  const bonusTaxOld = calculateOldTax({
    grossIncome: typicalBonus,
    dependents: 0, // Bonus usually taxed separately
    hasInsurance: false,
  }).taxAmount;

  const bonusTaxNew = calculateNewTax({
    grossIncome: typicalBonus,
    dependents: 0,
    hasInsurance: false,
  }).taxAmount;

  const bonusSavings = bonusTaxOld - bonusTaxNew;

  if (bonusSavings <= 0) {
    return null;
  }

  return {
    id: 'bonus-timing-2025',
    title: 'Cân nhắc thời điểm nhận thưởng',
    description: `Luật thuế mới (5 bậc) có hiệu lực từ 01/01/2026 với biểu thuế ưu đãi hơn. Nếu có thể, bạn có thể trao đổi với công ty về việc nhận thưởng sau thời điểm này để tiết kiệm thuế.`,
    potentialSavings: bonusSavings,
    priority: 'high',
    category: 'timing',
    icon: 'calendar',
    actionable: true,
  };
}

/**
 * Generate tip for charitable donations
 */
function generateCharityTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, otherDeductions } = input;

  // Only relevant for higher income with no deductions yet
  if (grossIncome < 30_000_000 || otherDeductions > 0) {
    return null;
  }

  return {
    id: 'charity-donation',
    title: 'Đóng góp từ thiện được khấu trừ thuế',
    description: 'Các khoản đóng góp từ thiện, nhân đạo qua tổ chức được công nhận sẽ được khấu trừ vào thu nhập tính thuế. Vừa làm việc thiện, vừa giảm thuế.',
    priority: 'medium',
    category: 'deduction',
    icon: 'heart',
    actionable: true,
  };
}

/**
 * Generate year-end settlement reminder
 */
function generateSettlementTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome } = input;

  // Only show in Q1
  if (!isQ1()) {
    return null;
  }

  // Only relevant if actually paying tax
  if (grossIncome < 15_000_000) {
    return null;
  }

  const year = getCurrentYear();
  const previousYear = year - 1;

  return {
    id: 'annual-settlement',
    title: `Quyết toán thuế TNCN năm ${previousYear}`,
    description: `Hạn quyết toán thuế TNCN năm ${previousYear} là 31/3/${year}. Nếu bạn có nhiều nguồn thu nhập hoặc muốn được hoàn thuế, hãy nộp hồ sơ quyết toán thuế trước thời hạn.`,
    priority: 'high',
    category: 'compliance',
    icon: 'file-check',
    actionable: true,
  };
}

/**
 * Generate tip for self-employment/business consideration
 */
function generateBusinessStructureTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome } = input;

  if (grossIncome < HIGH_INCOME_THRESHOLD) {
    return null;
  }

  return {
    id: 'business-structure',
    title: 'Cân nhắc thành lập doanh nghiệp',
    description: `Với thu nhập trên ${formatNumber(HIGH_INCOME_THRESHOLD)} VNĐ/tháng, việc thành lập doanh nghiệp cá nhân hoặc công ty có thể giúp tối ưu thuế. Thuế TNDN 20% và các chi phí hợp lý được khấu trừ. Hãy tham khảo chuyên gia thuế.`,
    priority: 'medium',
    category: 'structure',
    icon: 'building',
    actionable: false,
  };
}

/**
 * Generate tip for insurance optimization
 */
function generateInsuranceTip(input: TaxOptimizationInput): TaxTip | null {
  const { hasInsurance, insuranceOptions, declaredSalary, grossIncome } = input;

  // If using declared salary that's much lower than actual
  if (declaredSalary && declaredSalary < grossIncome * 0.5) {
    return {
      id: 'insurance-declared-salary',
      title: 'Lưu ý về lương đóng bảo hiểm',
      description: `Lương đóng bảo hiểm (${formatNumber(declaredSalary)} VNĐ) thấp hơn nhiều so với lương thực (${formatNumber(grossIncome)} VNĐ). Điều này giảm bảo hiểm phải đóng nhưng cũng giảm quyền lợi BHXH, BHYT sau này. Hãy cân nhắc kỹ.`,
      priority: 'low',
      category: 'structure',
      icon: 'shield-alert',
      actionable: false,
    };
  }

  // If not paying full insurance
  if (!hasInsurance || !insuranceOptions.bhxh || !insuranceOptions.bhyt || !insuranceOptions.bhtn) {
    const missingTypes: string[] = [];
    if (!insuranceOptions.bhxh) missingTypes.push('BHXH');
    if (!insuranceOptions.bhyt) missingTypes.push('BHYT');
    if (!insuranceOptions.bhtn) missingTypes.push('BHTN');

    if (missingTypes.length > 0) {
      return {
        id: 'insurance-coverage',
        title: 'Đảm bảo đóng đủ bảo hiểm bắt buộc',
        description: `Bạn chưa đóng ${missingTypes.join(', ')}. Việc đóng đầy đủ bảo hiểm bắt buộc không chỉ là nghĩa vụ pháp lý mà còn là quyền lợi của bạn (lương hưu, ốm đau, thai sản...). Các khoản này cũng được khấu trừ trước khi tính thuế.`,
        priority: 'medium',
        category: 'compliance',
        icon: 'shield',
        actionable: true,
      };
    }
  }

  return null;
}

/**
 * Generate tip about tax-exempt allowances
 */
function generateAllowancesTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, allowances } = input;

  if (grossIncome < 20_000_000) {
    return null;
  }

  // Check if user has entered any allowances
  const hasAllowances = allowances && (
    allowances.meal > 0 ||
    allowances.phone > 0 ||
    allowances.transport > 0 ||
    allowances.clothing > 0 ||
    allowances.hazardous > 0
  );

  if (!hasAllowances) {
    return {
      id: 'tax-exempt-allowances',
      title: 'Tận dụng các phụ cấp miễn thuế',
      description: 'Một số phụ cấp được miễn thuế: tiền ăn trưa/ăn ca, phụ cấp điện thoại (công việc), xăng xe đi lại, trang phục (tối đa 5tr/năm). Hãy kiểm tra xem công ty bạn có chi trả những khoản này không.',
      priority: 'medium',
      category: 'allowance',
      icon: 'receipt',
      actionable: true,
    };
  }

  return null;
}

/**
 * Generate tip for income splitting with spouse
 * Applicable for married couples where one spouse has very high income
 */
function generateIncomeSplittingTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, dependents } = input;

  // Only relevant for very high income
  if (grossIncome < INCOME_SPLITTING_THRESHOLD) {
    return null;
  }

  // Calculate tax at current income
  const currentTax = calculateNewTax({
    grossIncome,
    dependents,
    hasInsurance: true,
  });

  // Calculate tax if income split 50-50 between two people
  const splitIncome = grossIncome / 2;
  const splitTax = calculateNewTax({
    grossIncome: splitIncome,
    dependents: Math.floor(dependents / 2),
    hasInsurance: true,
  });

  // Total tax if split (both spouses)
  const totalSplitTax = splitTax.taxAmount * 2;
  const savings = currentTax.taxAmount - totalSplitTax;

  if (savings <= 0) {
    return null;
  }

  return {
    id: 'income-splitting',
    title: 'Cân nhắc phân bổ thu nhập',
    description: `Với thu nhập cao (${formatNumber(grossIncome)} VNĐ/tháng), nếu vợ/chồng làm cùng công ty hoặc kinh doanh chung, việc phân bổ thu nhập hợp lý giữa hai người có thể giảm tổng thuế phải nộp do tận dụng các bậc thuế thấp hơn.`,
    potentialSavings: savings,
    potentialSavingsYearly: savings * 12,
    priority: 'medium',
    category: 'structure',
    icon: 'users',
    actionable: false,
  };
}

/**
 * Generate tip for deduction stacking
 * Remind users to maximize all available deductions
 */
function generateDeductionStackingTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, dependents, pensionContribution, otherDeductions, allowances } = input;

  // Only relevant if paying meaningful tax
  if (grossIncome < 25_000_000) {
    return null;
  }

  // Check what deductions are already used
  const hasFullDependents = dependents >= 2;
  const hasFullPension = pensionContribution >= MAX_PENSION_DEDUCTION;
  const hasOtherDeductions = otherDeductions > 0;
  const hasAllowances = allowances && (
    allowances.meal > 0 ||
    allowances.phone > 0 ||
    allowances.transport > 0
  );

  // If already maximizing, don't show tip
  if (hasFullDependents && hasFullPension && hasOtherDeductions && hasAllowances) {
    return null;
  }

  // Count unused deduction types
  const unusedDeductions: string[] = [];
  if (!hasFullPension) unusedDeductions.push('quỹ hưu trí tự nguyện (tối đa 1tr/tháng)');
  if (!hasOtherDeductions) unusedDeductions.push('đóng góp từ thiện');
  if (!hasAllowances) unusedDeductions.push('phụ cấp miễn thuế (ăn trưa, xăng xe, điện thoại)');

  if (unusedDeductions.length === 0) {
    return null;
  }

  // Estimate potential savings
  const maxPotentialDeduction = (!hasFullPension ? MAX_PENSION_DEDUCTION : 0) +
    (!hasAllowances ? 2_000_000 : 0); // Assume 2M allowances
  const bracketRate = getHighestBracketRate(grossIncome, true);
  const estimatedSavings = Math.round(maxPotentialDeduction * bracketRate);

  return {
    id: 'deduction-stacking',
    title: 'Tối đa hóa các khoản giảm trừ',
    description: `Bạn có thể kết hợp nhiều khoản giảm trừ để tối ưu thuế: ${unusedDeductions.join(', ')}. Mỗi khoản giảm trừ đều làm giảm thu nhập tính thuế, đặc biệt hiệu quả khi bạn đang ở bậc thuế cao (${(bracketRate * 100).toFixed(0)}%).`,
    potentialSavings: estimatedSavings > 0 ? estimatedSavings : undefined,
    potentialSavingsYearly: estimatedSavings > 0 ? estimatedSavings * 12 : undefined,
    priority: 'high',
    category: 'deduction',
    icon: 'stack',
    actionable: true,
  };
}

/**
 * Generate tip for tax-advantaged investments
 * Government bonds and certain investment funds have tax benefits
 */
function generateInvestmentTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome } = input;

  // Only relevant for higher income earners with savings capacity
  if (grossIncome < INVESTMENT_TIP_THRESHOLD) {
    return null;
  }

  return {
    id: 'tax-advantaged-investment',
    title: 'Đầu tư có ưu đãi thuế',
    description: `Một số khoản đầu tư có ưu đãi thuế: (1) Trái phiếu Chính phủ: lãi suất được miễn thuế TNCN; (2) Góp vốn vào doanh nghiệp: chỉ chịu thuế khi có cổ tức/lợi nhuận chia; (3) Bảo hiểm nhân thọ: một số sản phẩm có lợi ích thuế. Tuy nhiên, hãy cân nhắc rủi ro đầu tư trước khi quyết định.`,
    priority: 'low',
    category: 'investment',
    icon: 'trending-up',
    actionable: false,
  };
}

/**
 * Generate tip for household business conversion
 * For freelancers/contractors with high income
 */
function generateHouseholdBusinessTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome } = input;

  // Annual income estimate
  const annualIncome = grossIncome * 12;

  // Only relevant if annual income is significant but below HKD threshold
  // Above threshold needs company structure
  if (annualIncome < 200_000_000 || annualIncome > HOUSEHOLD_BUSINESS_ANNUAL_THRESHOLD) {
    return null;
  }

  // Freelancer pays 10% flat tax
  // HKD pays ~1.5-3% (VAT 1-2% + PIT 0.5-1.5%) depending on business type
  const freelancerTax = annualIncome * 0.10;
  const hkdTax = annualIncome * 0.03; // Assume services (2% VAT + 1% PIT with threshold deduction)
  const savings = freelancerTax - hkdTax;

  if (savings <= 0) {
    return null;
  }

  return {
    id: 'household-business-conversion',
    title: 'Cân nhắc đăng ký Hộ kinh doanh',
    description: `Với thu nhập ${formatNumber(annualIncome)} VNĐ/năm từ hoạt động tự do, việc đăng ký Hộ kinh doanh có thể tiết kiệm thuế đáng kể. Hộ KD chịu thuế khoán khoảng 1.5-3% thay vì 10% thuế khấu trừ. Ngưỡng miễn thuế 2026 là 500 triệu/năm cho Hộ KD.`,
    potentialSavingsYearly: Math.round(savings),
    priority: 'high',
    category: 'structure',
    icon: 'store',
    actionable: true,
  };
}

/**
 * Generate tip for year-end spending optimization
 * Remind users to maximize deductions before year end
 */
function generateYearEndSpendingTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, pensionContribution, otherDeductions } = input;

  // Only show in Q4 (October - December)
  const month = getCurrentMonth();
  if (month < 10) {
    return null;
  }

  // Only relevant for taxpayers
  if (grossIncome < 20_000_000) {
    return null;
  }

  const hasUnusedDeductions =
    pensionContribution < MAX_PENSION_DEDUCTION || otherDeductions === 0;

  if (!hasUnusedDeductions) {
    return null;
  }

  const suggestions: string[] = [];
  let potentialSavings = 0;

  if (pensionContribution < MAX_PENSION_DEDUCTION) {
    const remaining = MAX_PENSION_DEDUCTION - pensionContribution;
    const months = 12 - month + 1;
    const totalContribution = remaining * months;
    const rate = getHighestBracketRate(grossIncome - (NEW_DEDUCTIONS.personal + input.dependents * NEW_DEDUCTIONS.dependent), true);
    const savings = Math.round(totalContribution * rate);
    suggestions.push(`Hưu trí tự nguyện: còn ${formatNumber(remaining)} VNĐ/tháng chưa tận dụng`);
    potentialSavings += savings;
  }

  if (otherDeductions === 0) {
    suggestions.push('Từ thiện/nhân đạo: chưa có khoản đóng góp nào');
  }

  if (suggestions.length === 0) {
    return null;
  }

  const year = getCurrentYear();

  return {
    id: 'year-end-spending',
    title: `Tối đa giảm trừ trước 31/12/${year}`,
    description: `Còn ${12 - month + 1} tháng để tối ưu thuế năm ${year}. ${suggestions.join('. ')}. Các khoản chi được khấu trừ trong năm không được cộng dồn sang năm sau.`,
    potentialSavingsYearly: potentialSavings > 0 ? potentialSavings : undefined,
    priority: 'high',
    category: 'timing',
    icon: 'calendar',
    actionable: true,
  };
}

/**
 * Generate tip for dividend vs salary optimization
 * For business owners who can choose how to receive income
 */
function generateDividendVsSalaryTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, dependents } = input;

  // Only relevant for high income (likely business owners)
  if (grossIncome < HIGH_INCOME_THRESHOLD) {
    return null;
  }

  // Calculate current salary tax
  const salaryTax = calculateNewTax({
    grossIncome,
    dependents,
    hasInsurance: true,
  });

  // Dividend tax is flat 5% (after 20% corporate tax)
  // Effective rate on profit distributed as dividend:
  // Corporate tax: 20% -> remaining 80%
  // Dividend tax: 5% of 80% = 4%
  // Total: 20% + 4% = 24%
  // But salary also has insurance contributions

  // Compare effective rates
  const salaryEffectiveRate = salaryTax.effectiveRate;
  const dividendEffectiveRate = 24; // 20% CIT + 5% PIT on remainder

  // Only suggest if salary tax is higher
  if (salaryEffectiveRate <= dividendEffectiveRate) {
    return null;
  }

  const rateAdvantage = salaryEffectiveRate - dividendEffectiveRate;
  const monthlySavings = Math.round(grossIncome * (rateAdvantage / 100));

  return {
    id: 'dividend-vs-salary',
    title: 'Cổ tức vs Lương cho chủ doanh nghiệp',
    description: `Với thu nhập cao (${formatNumber(grossIncome)} VNĐ/tháng), thuế suất biên của bạn là ${salaryTax.effectiveRate.toFixed(1)}%. Nếu bạn là chủ doanh nghiệp, việc nhận thu nhập qua cổ tức (5% sau thuế TNDN 20%) có thể hiệu quả hơn về thuế. Tuy nhiên, cần cân nhắc về BHXH và các yếu tố khác.`,
    potentialSavings: monthlySavings,
    potentialSavingsYearly: monthlySavings * 12,
    priority: 'medium',
    category: 'structure',
    icon: 'building',
    actionable: false,
  };
}

/**
 * Generate tip for government bond investment
 * Interest from government bonds is tax-exempt
 */
function generateGovernmentBondTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome } = input;

  // Only relevant for people with savings capacity
  if (grossIncome < 40_000_000) {
    return null;
  }

  // Estimate monthly savings capacity (30% of net income)
  const netEstimate = grossIncome * 0.75; // rough estimate after tax
  const savingsCapacity = netEstimate * 0.3;

  // Government bond interest rate ~6-7%/year, compared to bank deposit ~5%/year (taxed 5%)
  // Effective bank rate: 5% * (1 - 5%) = 4.75%
  // Advantage: 6.5% - 4.75% = 1.75% per year
  const annualSavings = savingsCapacity * 12;
  const taxAdvantage = Math.round(annualSavings * 0.05 * 0.05); // 5% on interest, at 5% rate

  return {
    id: 'government-bond',
    title: 'Trái phiếu Chính phủ - Lãi miễn thuế',
    description: `Lãi từ trái phiếu Chính phủ được miễn thuế TNCN hoàn toàn (Điều 4 Luật Thuế TNCN). So với gửi tiết kiệm ngân hàng (lãi chịu thuế 5%), trái phiếu CP có lợi thế thuế. Phù hợp cho khoản tiết kiệm dài hạn, an toàn.`,
    potentialSavingsYearly: taxAdvantage > 0 ? taxAdvantage : undefined,
    priority: 'low',
    category: 'investment',
    icon: 'shield',
    actionable: true,
  };
}

/**
 * Generate tip for maximizing voluntary pension contribution
 * Specifically targets the 1M/month deduction limit
 */
function generateVoluntaryPensionMaxTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, dependents, pensionContribution } = input;

  // Only show if partially contributing (not 0, not maxed)
  if (pensionContribution === 0 || pensionContribution >= MAX_PENSION_DEDUCTION) {
    return null;
  }

  // Only relevant for higher income
  if (grossIncome < 25_000_000) {
    return null;
  }

  const remaining = MAX_PENSION_DEDUCTION - pensionContribution;
  const savingsNewLaw = calculatePensionSavings(
    grossIncome,
    dependents,
    pensionContribution,
    MAX_PENSION_DEDUCTION,
    true
  );

  if (savingsNewLaw <= 0) {
    return null;
  }

  return {
    id: 'pension-maximize',
    title: 'Tối đa hóa hưu trí tự nguyện',
    description: `Bạn đang đóng ${formatNumber(pensionContribution)} VNĐ/tháng vào quỹ hưu trí tự nguyện. Nếu tăng thêm ${formatNumber(remaining)} VNĐ/tháng (lên tối đa 1 triệu), bạn tiết kiệm thêm ${formatNumber(savingsNewLaw)} VNĐ thuế/tháng. Đây cũng là khoản tiết kiệm cho tương lai.`,
    potentialSavings: savingsNewLaw,
    potentialSavingsYearly: savingsNewLaw * 12,
    priority: 'high',
    category: 'deduction',
    icon: 'piggy-bank',
    actionable: true,
  };
}

/**
 * Generate tip about new tax law comparison
 */
function generateNewLawComparisonTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, dependents, otherDeductions } = input;

  // Calculate the difference
  const savings = calculateNewLawSavings(grossIncome, dependents, otherDeductions);

  if (savings <= 0) {
    return null;
  }

  const now = getCurrentDate();

  if (now < NEW_TAX_LAW_EFFECTIVE_DATE) {
    return {
      id: 'new-law-preview',
      title: 'Luật thuế mới có lợi cho bạn',
      description: `Từ 01/01/2026, luật thuế mới sẽ giúp bạn tiết kiệm ${formatNumber(savings)} VNĐ/tháng (${formatNumber(savings * 12)} VNĐ/năm). Giảm trừ bản thân tăng từ 11tr lên 15.5tr, người phụ thuộc từ 4.4tr lên 6.2tr.`,
      potentialSavings: savings,
      potentialSavingsYearly: savings * 12,
      priority: 'low',
      category: 'timing',
      icon: 'info',
      actionable: false,
    };
  }

  return null;
}

// ===== MAIN FUNCTION =====

/**
 * Generate all applicable tax optimization tips
 * @param input Tax input data from user
 * @returns Array of tax tips sorted by priority
 */
export function generateTaxOptimizationTips(input: TaxOptimizationInput): TaxTip[] {
  const tips: TaxTip[] = [];

  // Generate tips from all generators
  const tipGenerators = [
    generateDependentTip,
    generatePensionTip,
    generateBonusTimingTip,
    generateCharityTip,
    generateSettlementTip,
    generateBusinessStructureTip,
    generateInsuranceTip,
    generateAllowancesTip,
    generateNewLawComparisonTip,
    // New enhanced tips
    generateIncomeSplittingTip,
    generateDeductionStackingTip,
    generateInvestmentTip,
    generateHouseholdBusinessTip,
    // Phase 3B-2: New timing & strategy tips
    generateYearEndSpendingTip,
    generateDividendVsSalaryTip,
    generateGovernmentBondTip,
    generateVoluntaryPensionMaxTip,
  ];

  for (const generator of tipGenerators) {
    const tip = generator(input);
    if (tip) {
      tips.push(tip);
    }
  }

  // Auto-upgrade priority based on savings thresholds
  tips.forEach(tip => {
    const monthlySavings = tip.potentialSavings ?? 0;
    const yearlySavings = tip.potentialSavingsYearly ?? 0;

    // Upgrade to critical if savings exceed thresholds
    if (monthlySavings >= CRITICAL_SAVINGS_THRESHOLD || yearlySavings >= CRITICAL_YEARLY_SAVINGS_THRESHOLD) {
      if (tip.priority !== 'critical') {
        tip.priority = 'critical';
      }
    }
  });

  // Sort by priority
  const priorityOrder: Record<TipPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  tips.sort((a, b) => {
    // First by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by potential savings (higher first)
    const savingsA = a.potentialSavings ?? 0;
    const savingsB = b.potentialSavings ?? 0;
    return savingsB - savingsA;
  });

  return tips;
}

/**
 * Get icon component name for a tip
 */
export function getTipIconName(icon?: string): string {
  const iconMap: Record<string, string> = {
    'users': 'UsersIcon',
    'user-plus': 'UserPlusIcon',
    'piggy-bank': 'PiggyBankIcon',
    'calendar': 'CalendarIcon',
    'heart': 'HeartIcon',
    'file-check': 'FileCheckIcon',
    'building': 'BuildingIcon',
    'shield': 'ShieldIcon',
    'shield-alert': 'ShieldAlertIcon',
    'receipt': 'ReceiptIcon',
    'info': 'InfoIcon',
    'stack': 'StackIcon',
    'trending-up': 'TrendingUpIcon',
    'store': 'StoreIcon',
  };

  return iconMap[icon || 'info'] || 'InfoIcon';
}

/**
 * Get CSS class for priority badge
 */
export function getPriorityClass(priority: TipPriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

/**
 * Get Vietnamese label for priority
 */
export function getPriorityLabel(priority: TipPriority): string {
  switch (priority) {
    case 'critical':
      return 'Cần hành động ngay';
    case 'high':
      return 'Quan trọng';
    case 'medium':
      return 'Nên xem xét';
    case 'low':
      return 'Tham khảo';
    default:
      return '';
  }
}

/**
 * Get Vietnamese label for category
 */
export function getCategoryLabel(category: TipCategory): string {
  switch (category) {
    case 'deduction':
      return 'Giảm trừ';
    case 'timing':
      return 'Thời điểm';
    case 'structure':
      return 'Cơ cấu';
    case 'compliance':
      return 'Tuân thủ';
    case 'allowance':
      return 'Phụ cấp';
    case 'investment':
      return 'Đầu tư';
    default:
      return '';
  }
}
