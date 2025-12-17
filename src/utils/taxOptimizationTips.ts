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

export type TipPriority = 'high' | 'medium' | 'low';
export type TipCategory = 'deduction' | 'timing' | 'structure' | 'compliance' | 'allowance';

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

// New tax law effective date
const NEW_TAX_LAW_EFFECTIVE_DATE = new Date('2026-07-01');

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

/**
 * Check if we're in first half of 2026 (before July 1st)
 */
function isFirstHalf2026(): boolean {
  const now = getCurrentDate();
  return now.getFullYear() === 2026 && now.getMonth() < 6; // 0-5 is Jan-Jun
}

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
 * Generate tip for bonus timing (relevant for 2025-2026 transition)
 */
function generateBonusTimingTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome, dependents, otherDeductions } = input;

  // Only show in 2025 or first half of 2026
  if (!isYear2025() && !isFirstHalf2026()) {
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

  if (isYear2025()) {
    return {
      id: 'bonus-timing-2025',
      title: 'Cân nhắc thời điểm nhận thưởng',
      description: `Luật thuế mới (5 bậc) có hiệu lực từ 1/7/2026 với biểu thuế ưu đãi hơn. Nếu có thể, bạn có thể trao đổi với công ty về việc nhận thưởng sau thời điểm này để tiết kiệm thuế.`,
      potentialSavings: bonusSavings,
      priority: 'high',
      category: 'timing',
      icon: 'calendar',
      actionable: true,
    };
  }

  if (isFirstHalf2026()) {
    return {
      id: 'bonus-timing-2026-h1',
      title: 'Hoãn nhận thưởng đến tháng 7/2026',
      description: `Luật thuế mới có hiệu lực từ 1/7/2026. Các khoản thưởng nhận sau thời điểm này sẽ được áp dụng biểu thuế mới ưu đãi hơn. Ước tính tiết kiệm với thưởng 1 tháng lương:`,
      potentialSavings: bonusSavings,
      priority: 'high',
      category: 'timing',
      icon: 'calendar',
      actionable: true,
    };
  }

  return null;
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
      description: `Từ 1/7/2026, luật thuế mới sẽ giúp bạn tiết kiệm ${formatNumber(savings)} VNĐ/tháng (${formatNumber(savings * 12)} VNĐ/năm). Giảm trừ bản thân tăng từ 11tr lên 15.5tr, người phụ thuộc từ 4.4tr lên 6.2tr.`,
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
  ];

  for (const generator of tipGenerators) {
    const tip = generator(input);
    if (tip) {
      tips.push(tip);
    }
  }

  // Sort by priority
  const priorityOrder: Record<TipPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
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
  };

  return iconMap[icon || 'info'] || 'InfoIcon';
}

/**
 * Get CSS class for priority badge
 */
export function getPriorityClass(priority: TipPriority): string {
  switch (priority) {
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
    default:
      return '';
  }
}
