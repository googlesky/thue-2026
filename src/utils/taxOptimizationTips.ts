/**
 * Tax Optimization Tips Generator
 * Generates personalized tax optimization suggestions based on user's input data
 * Căn cứ: Luật Thuế TNCN 109/2025/QH15, NĐ 253/2026/NĐ-CP (kỳ tính thuế 2026)
 */

import {
  NEW_DEDUCTIONS,
  DEPENDENT_INCOME_LIMIT,
  MEAL_ALLOWANCE_LIMIT_2026,
  calculateNewTax,
  formatNumber,
  InsuranceOptions,
  RegionType,
  AllowancesState,
  TaxResult,
  getVoluntaryPensionCap,
  MEDICAL_DEDUCTION_CAP,
  EDUCATION_DEDUCTION_CAP,
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

// Mức hưu trí tự nguyện + BH nhân thọ được trừ tối đa/tháng (NĐ 253/2026: 3tr)
const MAX_PENSION_DEDUCTION = getVoluntaryPensionCap();

// Chi y tế, giáo dục - đào tạo của người nộp thuế và người phụ thuộc (NĐ 253/2026 Điều 49.2)

// Cổ tức: thuế TNDN (thường 20%) + 5% TNCN trên phần lợi nhuận còn lại ≈ 24%
const DIVIDEND_ROUTE_RATE = 0.24;

// Threshold for considering business structure
const HIGH_INCOME_THRESHOLD = 100_000_000; // 100M/month

// Threshold for dependent registration reminder
const INCOME_THRESHOLD_FOR_DEPENDENT_TIP = 20_000_000; // 20M/month

// Threshold for investment tip
const INVESTMENT_TIP_THRESHOLD = 40_000_000; // 40M/month

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
 * Thuế tháng theo luật hiện hành với ĐỦ input thật của người dùng
 * (bảo hiểm, vùng, lương đóng BH, phụ cấp, giảm trừ khác), có thể ghi đè vài trường.
 */
function taxWith(input: TaxOptimizationInput, override: Partial<TaxOptimizationInput> = {}): TaxResult {
  return calculateNewTax({ ...input, ...override });
}

/**
 * Thuế suất biên: thuế suất của bậc cao nhất đang chịu (0 nếu chưa phải nộp thuế)
 */
function marginalRate(result: TaxResult): number {
  const breakdown = result.taxBreakdown;
  return breakdown.length > 0 ? breakdown[breakdown.length - 1].rate : 0;
}

/**
 * Calculate tax savings from adding dependents
 */
function calculateDependentSavings(input: TaxOptimizationInput, additionalDependents: number): number {
  return taxWith(input).taxAmount - taxWith(input, { dependents: input.dependents + additionalDependents }).taxAmount;
}

/**
 * Calculate tax savings from pension contribution
 */
function calculatePensionSavings(input: TaxOptimizationInput, newPension: number): number {
  return taxWith(input).taxAmount - taxWith(input, { pensionContribution: newPension }).taxAmount;
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

  // Tiết kiệm khi thêm 1 người phụ thuộc (chỉ luật hiện hành - kỳ tính thuế 2026)
  const savings = Math.round(calculateDependentSavings(input, 1));

  if (savings <= 0) {
    return null;
  }

  if (dependents === 0) {
    return {
      id: 'dependent-registration',
      title: 'Đăng ký người phụ thuộc',
      description: `Người phụ thuộc gồm: con dưới 18 tuổi hoặc con khuyết tật, không có khả năng lao động; con đang học đại học, cao đẳng, trung học chuyên nghiệp, học nghề; vợ/chồng, cha mẹ ngoài độ tuổi lao động hoặc không có khả năng lao động; người thân không nơi nương tựa bạn trực tiếp nuôi dưỡng. Trừ con dưới 18 tuổi và con khuyết tật, người phụ thuộc phải không có thu nhập hoặc thu nhập bình quân không quá ${formatNumber(DEPENDENT_INCOME_LIMIT)} VNĐ/tháng. Mỗi người phụ thuộc giảm ${formatNumber(NEW_DEDUCTIONS.dependent)} VNĐ/tháng thu nhập tính thuế.`,
      potentialSavings: savings,
      potentialSavingsYearly: savings * 12,
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
      description: `Bạn đã đăng ký ${dependents} người phụ thuộc. Hãy kiểm tra xem còn người thân nào đủ điều kiện không (con nhỏ hoặc đang đi học, cha mẹ ngoài độ tuổi lao động có thu nhập bình quân không quá ${formatNumber(DEPENDENT_INCOME_LIMIT)} VNĐ/tháng, người khuyết tật...). Mỗi người thêm giảm ${formatNumber(NEW_DEDUCTIONS.dependent)} VNĐ/tháng thu nhập tính thuế.`,
      potentialSavings: savings,
      potentialSavingsYearly: savings * 12,
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
  const { grossIncome, pensionContribution } = input;

  // Only relevant for people with taxable income
  if (grossIncome < 15_000_000) {
    return null;
  }

  // Already maxed out
  if (pensionContribution >= MAX_PENSION_DEDUCTION) {
    return null;
  }

  const remainingDeduction = MAX_PENSION_DEDUCTION - pensionContribution;
  const savings = Math.round(calculatePensionSavings(input, MAX_PENSION_DEDUCTION));

  if (savings <= 0) {
    return null;
  }

  if (pensionContribution === 0) {
    return {
      id: 'pension-fund',
      title: 'Đóng quỹ hưu trí tự nguyện',
      description: `Hưu trí bổ sung, hưu trí tự nguyện và bảo hiểm nhân thọ được trừ tổng tối đa ${formatNumber(MAX_PENSION_DEDUCTION)} VNĐ/tháng khi tính thuế. Vừa tiết kiệm cho tuổi già, vừa giảm thuế hiện tại.`,
      potentialSavings: savings,
      potentialSavingsYearly: savings * 12,
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
    potentialSavings: savings,
    potentialSavingsYearly: savings * 12,
    priority: 'low',
    category: 'deduction',
    icon: 'piggy-bank',
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
    description: 'Khoản đóng góp từ thiện, nhân đạo, khuyến học vào tổ chức, quỹ được cơ quan nhà nước cho phép thành lập hoặc công nhận được giảm trừ vào thu nhập chịu thuế trước khi tính thuế. Cần chứng từ thu của tổ chức, quỹ hoặc chứng từ chuyển khoản; theo câu chữ NĐ 253/2026/NĐ-CP Điều 51 khoản 3, có thể phải tự quyết toán thuế để được trừ (Điều 49).',
    priority: 'medium',
    category: 'deduction',
    icon: 'heart',
    actionable: true,
  };
}

/**
 * Generate year-end settlement reminder (tháng 1 - 4)
 */
function generateSettlementTip(input: TaxOptimizationInput): TaxTip | null {
  const { grossIncome } = input;

  // Hạn tự quyết toán là cuối tháng 4 nên nhắc từ tháng 1 đến tháng 4
  if (getCurrentMonth() > 4) {
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
    description: `Tổ chức trả thu nhập quyết toán thay chậm nhất ngày 31/3/${year}. Nếu bạn tự quyết toán (có nhiều nguồn thu nhập, có khoản giảm trừ chi y tế, giáo dục, từ thiện hoặc muốn được hoàn thuế), hạn nộp hồ sơ là ngày cuối cùng của tháng 4/${year}; nếu trùng ngày nghỉ thì lùi sang ngày làm việc tiếp theo.`,
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
    description: `Với thu nhập trên ${formatNumber(HIGH_INCOME_THRESHOLD)} VNĐ/tháng, việc thành lập doanh nghiệp cá nhân hoặc công ty có thể giúp tối ưu thuế. Thuế TNDN (thường 20%) tính trên lợi nhuận sau khi trừ các chi phí hợp lý. Hãy tham khảo chuyên gia thuế.`,
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
      title: 'Tận dụng các khoản không tính thuế',
      description: `Một số khoản không tính vào thu nhập chịu thuế (NĐ 253/2026/NĐ-CP Điều 8): tiền ăn giữa ca bằng tiền tới ${formatNumber(MEAL_ALLOWANCE_LIMIT_2026)} VNĐ/tháng (công ty tự nấu, mua suất ăn, phát phiếu ăn thì không giới hạn); khoán điện thoại, công tác phí, văn phòng phẩm, trang phục trong mức khoán của công ty (phù hợp mức chi được trừ khi tính thuế TNDN; phần vượt vẫn chịu thuế); xe đưa đón người lao động theo quy chế. Hãy kiểm tra quy chế lương của công ty bạn.`,
      priority: 'medium',
      category: 'allowance',
      icon: 'receipt',
      actionable: true,
    };
  }

  return null;
}

/**
 * Giảm trừ chi y tế, giáo dục - đào tạo (mới từ kỳ tính thuế 2026)
 */
function generateMedicalEducationTip(input: TaxOptimizationInput): TaxTip | null {
  const rate = marginalRate(taxWith(input));

  // Chưa phải nộp thuế thì giảm trừ không có tác dụng
  if (rate === 0) {
    return null;
  }

  return {
    id: 'medical-education-deduction',
    title: 'Giảm trừ chi phí y tế, học phí',
    description: `Từ kỳ tính thuế 2026, chi khám chữa bệnh tại cơ sở trong nước thuộc danh mục BHYT chi trả (tối đa ${formatNumber(MEDICAL_DEDUCTION_CAP)} VNĐ/năm) và học phí từ mầm non đến đại học, giáo dục nghề nghiệp (tối đa ${formatNumber(EDUCATION_DEDUCTION_CAP)} VNĐ/năm) của bạn và người phụ thuộc được trừ khi tính thuế. Ở bậc thuế ${Math.round(rate * 100)}% hiện tại, mỗi 1.000.000 VNĐ chi hợp lệ giảm khoảng ${formatNumber(1_000_000 * rate)} VNĐ thuế. Cần hóa đơn, chứng từ ghi tên bạn hoặc người phụ thuộc, không được chi trả từ nguồn khác; muốn được trừ phải tự quyết toán thuế; khoản phát sinh năm nào trừ năm đó.`,
    priority: 'medium',
    category: 'deduction',
    icon: 'receipt',
    actionable: true,
  };
}

/**
 * Generate tip for tax-advantaged investments
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
    description: 'Được miễn thuế TNCN: lãi tiền gửi tại tổ chức tín dụng, lãi trái phiếu Chính phủ, trái phiếu chính quyền địa phương, lãi từ hợp đồng bảo hiểm nhân thọ, lãi trái phiếu xanh; chuyển nhượng chứng chỉ quỹ mở nắm giữ từ 02 năm (Luật Thuế TNCN 109/2025/QH15 Điều 4, Điều 5). Lợi tức từ quỹ đầu tư chứng khoán, quỹ đầu tư bất động sản được giảm 50% thuế đến hết 30/6/2031. Lãi trái phiếu doanh nghiệp, cổ tức chịu thuế 5%. Hãy cân nhắc rủi ro trước khi đầu tư.',
    priority: 'low',
    category: 'investment',
    icon: 'trending-up',
    actionable: false,
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
  if (grossIncome < 20_000_000 || marginalRate(taxWith(input)) === 0) {
    return null;
  }

  const year = getCurrentYear();
  const monthsLeft = 12 - month + 1;
  const suggestions: string[] = [];
  let potentialSavings = 0;

  if (pensionContribution < MAX_PENSION_DEDUCTION) {
    const remaining = MAX_PENSION_DEDUCTION - pensionContribution;
    potentialSavings = Math.round(calculatePensionSavings(input, MAX_PENSION_DEDUCTION) * monthsLeft);
    suggestions.push(`Hưu trí tự nguyện, bảo hiểm nhân thọ: còn ${formatNumber(remaining)} VNĐ/tháng chưa tận dụng`);
  }

  if (otherDeductions === 0) {
    suggestions.push('Từ thiện, nhân đạo: chưa có khoản đóng góp nào');
  }

  suggestions.push('Chi y tế, học phí của bạn và người phụ thuộc: gom đủ hóa đơn, chứng từ để tự quyết toán');
  // Hạn đăng ký người phụ thuộc kèm hồ sơ: trước 31/12 của năm tính thuế (NĐ 253/2026 Điều 48.2.a)
  suggestions.push(`Người phụ thuộc: đăng ký kèm hồ sơ chứng minh trước 31/12/${year}`);

  return {
    id: 'year-end-spending',
    title: `Tối đa giảm trừ trước 31/12/${year}`,
    description: `Còn ${monthsLeft} tháng để tối ưu thuế năm ${year}. ${suggestions.join('. ')}. Các khoản chi được khấu trừ trong năm không được cộng dồn sang năm sau.`,
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
  const { grossIncome } = input;

  // Only relevant for high income (likely business owners)
  if (grossIncome < HIGH_INCOME_THRESHOLD) {
    return null;
  }

  const salaryTax = taxWith(input);
  const topRate = marginalRate(salaryTax);

  // Chỉ có lợi khi thuế suất biên của tiền lương cao hơn tổng thuế đi đường cổ tức
  if (topRate <= DIVIDEND_ROUTE_RATE) {
    return null;
  }

  // Chỉ phần thu nhập nằm ở bậc thuế suất cao hơn 24% mới giảm thuế khi chuyển sang cổ tức
  const monthlySavings = Math.round(
    salaryTax.taxBreakdown.reduce(
      (sum, bracket) => sum + bracket.taxableAmount * Math.max(0, bracket.rate - DIVIDEND_ROUTE_RATE),
      0
    )
  );

  return {
    id: 'dividend-vs-salary',
    title: 'Cổ tức hay tiền lương cho chủ doanh nghiệp',
    description: `Thuế suất biên (bậc cao nhất) của bạn là ${Math.round(topRate * 100)}%, thuế suất thực tế ${salaryTax.effectiveRate.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%. Nếu bạn là chủ doanh nghiệp, lợi nhuận chia dưới dạng cổ tức chịu thuế TNDN (thường 20%) và 5% thuế TNCN, tổng khoảng 24%; thu nhập sau thuế TNDN của chủ doanh nghiệp tư nhân, chủ công ty TNHH một thành viên được miễn thuế TNCN (Luật Thuế TNCN Điều 4 khoản 21). Cần cân nhắc BHXH, chi phí được trừ và các yếu tố khác.`,
    potentialSavings: monthlySavings > 0 ? monthlySavings : undefined,
    potentialSavingsYearly: monthlySavings > 0 ? monthlySavings * 12 : undefined,
    priority: 'medium',
    category: 'structure',
    icon: 'building',
    actionable: false,
  };
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
    generateCharityTip,
    generateSettlementTip,
    generateBusinessStructureTip,
    generateInsuranceTip,
    generateAllowancesTip,
    generateMedicalEducationTip,
    generateInvestmentTip,
    generateYearEndSpendingTip,
    generateDividendVsSalaryTip,
  ];

  for (const generator of tipGenerators) {
    const tip = generator(input);
    if (tip) {
      tips.push(tip);
    }
  }

  // Auto-upgrade priority based on savings thresholds (chỉ với gợi ý người dùng tự làm được)
  tips.forEach(tip => {
    if (!tip.actionable) return;

    const monthlySavings = tip.potentialSavings ?? 0;
    const yearlySavings = tip.potentialSavingsYearly ?? 0;

    // Upgrade to critical if savings exceed thresholds
    if (monthlySavings >= CRITICAL_SAVINGS_THRESHOLD || yearlySavings >= CRITICAL_YEARLY_SAVINGS_THRESHOLD) {
      tip.priority = 'critical';
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
