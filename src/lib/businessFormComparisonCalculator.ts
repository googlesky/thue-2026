/**
 * Business Form Comparison Calculator
 * So sánh 3 hình thức kinh doanh: Lương vs Freelancer vs Hộ kinh doanh
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 04/2007/QH12 (sửa đổi 2012, 2014)
 * - Nghị quyết 954/2020/UBTVQH14 - Biểu thuế TNCN mới từ 1/7/2026
 * - Thông tư 40/2021/TT-BTC - Thuế khoán hộ kinh doanh
 * - Thông tư 100/2021/TT-BTC - Thuế với cá nhân kinh doanh
 */

import { calculateNewTax, InsuranceOptions, DEFAULT_INSURANCE_OPTIONS, RegionType, getMaxSocialInsuranceSalary } from './taxCalculator';
import { calculateHouseholdBusinessTax, BusinessCategory, BUSINESS_CATEGORY_LABELS } from './householdBusinessTaxCalculator';

/**
 * Business categories for dropdown
 */
export const BUSINESS_CATEGORIES: Array<{ id: BusinessCategory; name: string }> = [
  { id: 'distribution', name: BUSINESS_CATEGORY_LABELS.distribution },
  { id: 'services', name: BUSINESS_CATEGORY_LABELS.services },
  { id: 'production', name: BUSINESS_CATEGORY_LABELS.production },
  { id: 'other', name: BUSINESS_CATEGORY_LABELS.other },
];

/**
 * Hình thức kinh doanh
 */
export type BusinessForm = 'employee' | 'freelancer' | 'household';

/**
 * Thông tin ưu/nhược điểm
 */
export interface ProsCons {
  pros: string[];
  cons: string[];
}

/**
 * Kết quả tính thuế cho nhân viên (làm công ăn lương)
 */
export interface EmployeeResult {
  grossIncome: number;        // Thu nhập gộp
  insuranceEmployee: number;  // Bảo hiểm phần người lao động
  insuranceEmployer: number;  // Bảo hiểm phần công ty
  taxableIncome: number;      // Thu nhập chịu thuế
  taxAmount: number;          // Thuế TNCN
  netIncome: number;          // Thu nhập thực nhận
  totalCost: number;          // Tổng chi phí (góc nhìn DN)
  effectiveTaxRate: number;   // Thuế suất thực tế
  prosCons: ProsCons;
}

/**
 * Kết quả tính thuế cho Freelancer
 */
export interface FreelancerResult {
  grossIncome: number;        // Thu nhập gộp
  withholdingTax: number;     // Thuế khấu trừ tại nguồn (10%)
  netIncome: number;          // Thu nhập thực nhận
  selfInsurance: number;      // Tự mua BHYT (ước tính)
  effectiveTaxRate: number;   // Thuế suất thực tế
  prosCons: ProsCons;
}

/**
 * Kết quả tính thuế cho Hộ kinh doanh
 */
export interface HouseholdBusinessResult {
  grossIncome: number;        // Doanh thu
  pitTax: number;             // Thuế TNCN (0.5-2%)
  vatTax: number;             // Thuế VAT (1-5%)
  totalTax: number;           // Tổng thuế
  netIncome: number;          // Thu nhập sau thuế
  effectiveTaxRate: number;   // Thuế suất thực tế
  isExempt: boolean;          // Có được miễn thuế không
  prosCons: ProsCons;
}

/**
 * Input so sánh hình thức kinh doanh
 */
export interface BusinessFormComparisonInput {
  annualRevenue: number;              // Doanh thu/thu nhập năm
  expenseRatio: number;               // Tỷ lệ chi phí (0-1)
  businessCategory: BusinessCategory; // Ngành nghề
  region: RegionType;                 // Vùng (cho bảo hiểm)
  dependents: number;                 // Số người phụ thuộc
  hasSelfInsurance: boolean;          // Tự mua BHYT?
}

/**
 * Kết quả so sánh tổng hợp
 */
export interface BusinessFormComparisonResult {
  employee: EmployeeResult;
  freelancer: FreelancerResult;
  householdBusiness: HouseholdBusinessResult;
  recommendation: BusinessForm;
  savingsVsEmployee: {
    freelancer: number;
    householdBusiness: number;
  };
  summary: string;
}

/**
 * Thuế suất khấu trừ freelancer
 */
const FREELANCER_WITHHOLDING_RATE = 0.10; // 10%

/**
 * Chi phí tự mua BHYT (năm)
 */
const SELF_INSURANCE_ANNUAL = 1_500_000; // ~1.5 triệu/năm

/**
 * Tính thuế cho nhân viên (lương)
 */
function calculateEmployeeTax(
  annualRevenue: number,
  region: RegionType,
  dependents: number
): EmployeeResult {
  // Tính lương tháng
  const monthlyGross = annualRevenue / 12;

  // Tính thuế với biểu lũy tiến
  const taxResult = calculateNewTax({
    grossIncome: monthlyGross,
    dependents,
    otherDeductions: 0,
    hasInsurance: true,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region,
  });

  const monthlyTax = taxResult.taxAmount;
  const annualTax = monthlyTax * 12;

  // Bảo hiểm nhân viên đóng (tháng)
  const monthlyInsuranceEmployee = taxResult.insuranceDetail?.total || 0;
  const annualInsuranceEmployee = monthlyInsuranceEmployee * 12;

  // Bảo hiểm công ty đóng (ước tính 21.5% lương đóng BH)
  const insurableSalary = Math.min(monthlyGross, getMaxSocialInsuranceSalary()); // Trần BHXH (date-aware: 46.8M, 50.6M từ 01/7/2026)
  const employerInsuranceRate = 0.215; // 17.5% BHXH + 3% BHYT + 1% BHTN
  const annualInsuranceEmployer = insurableSalary * employerInsuranceRate * 12;

  // Thu nhập thực nhận
  const annualNetIncome = annualRevenue - annualInsuranceEmployee - annualTax;

  // Tổng chi phí công ty
  const totalCost = annualRevenue + annualInsuranceEmployer;

  // Thuế suất thực tế
  const effectiveTaxRate = annualTax / annualRevenue;

  return {
    grossIncome: annualRevenue,
    insuranceEmployee: annualInsuranceEmployee,
    insuranceEmployer: annualInsuranceEmployer,
    taxableIncome: taxResult.taxableIncome * 12,
    taxAmount: annualTax,
    netIncome: annualNetIncome,
    totalCost,
    effectiveTaxRate,
    prosCons: {
      pros: [
        'Có BHXH, BHYT, BHTN đầy đủ',
        'Được hưởng lương hưu sau này',
        'Ổn định, ít rủi ro pháp lý',
        'Được bảo vệ bởi Luật Lao động',
        'Công ty chịu phần lớn chi phí bảo hiểm',
      ],
      cons: [
        'Thuế suất lũy tiến có thể lên tới 35%',
        'Ít linh hoạt về thời gian làm việc',
        'Không được khấu trừ chi phí kinh doanh',
        'Thu nhập bị giới hạn bởi mức lương',
      ],
    },
  };
}

/**
 * Tính thuế cho Freelancer
 */
function calculateFreelancerTax(
  annualRevenue: number,
  hasSelfInsurance: boolean
): FreelancerResult {
  // Thuế khấu trừ 10% tại nguồn
  const withholdingTax = annualRevenue * FREELANCER_WITHHOLDING_RATE;

  // Tự mua BHYT
  const selfInsurance = hasSelfInsurance ? SELF_INSURANCE_ANNUAL : 0;

  // Thu nhập thực nhận
  const netIncome = annualRevenue - withholdingTax - selfInsurance;

  // Thuế suất thực tế
  const effectiveTaxRate = withholdingTax / annualRevenue;

  return {
    grossIncome: annualRevenue,
    withholdingTax,
    netIncome,
    selfInsurance,
    effectiveTaxRate,
    prosCons: {
      pros: [
        'Thuế suất cố định 10% (có thể thấp hơn lũy tiến)',
        'Linh hoạt về thời gian và địa điểm làm việc',
        'Có thể làm nhiều dự án cùng lúc',
        'Thủ tục đơn giản, không cần đăng ký kinh doanh',
        'Được khấu trừ chi phí khi quyết toán (nếu có chứng từ)',
      ],
      cons: [
        'Không có BHXH, BHTN',
        'Phải tự mua BHYT hoặc không có bảo hiểm',
        'Không có lương hưu từ BHXH',
        'Thu nhập không ổn định',
        'Rủi ro pháp lý nếu hợp đồng không rõ ràng',
      ],
    },
  };
}

/**
 * Ngưỡng miễn thuế hộ kinh doanh năm 2026 (Nghị định 141/2026/NĐ-CP: 1 tỷ)
 */
const HOUSEHOLD_EXEMPT_THRESHOLD_2026 = 1_000_000_000;

/**
 * Tính thuế cho Hộ kinh doanh
 */
function calculateHouseholdTax(
  annualRevenue: number,
  businessCategory: BusinessCategory,
  hasSelfInsurance: boolean
): HouseholdBusinessResult {
  const selfInsurance = hasSelfInsurance ? SELF_INSURANCE_ANNUAL : 0;

  // Kiểm tra miễn thuế (dưới ngưỡng 1 tỷ năm 2026 - Nghị định 141/2026)
  const isExempt = annualRevenue <= HOUSEHOLD_EXEMPT_THRESHOLD_2026;

  if (isExempt) {
    return {
      grossIncome: annualRevenue,
      pitTax: 0,
      vatTax: 0,
      totalTax: 0,
      netIncome: annualRevenue - selfInsurance,
      effectiveTaxRate: 0,
      isExempt: true,
      prosCons: {
        pros: [
          'Miễn thuế hoàn toàn (doanh thu ≤ 1 tỷ/năm)',
          'Thủ tục đơn giản',
          'Không cần kế toán phức tạp',
          'Phù hợp kinh doanh nhỏ lẻ',
        ],
        cons: [
          'Không có BHXH, BHTN',
          'Giới hạn quy mô kinh doanh',
          'Khó mở rộng, khó vay vốn',
          'Không xuất được hóa đơn VAT',
        ],
      },
    };
  }

  // Tính thuế theo hộ kinh doanh với API mới
  // Tạo business object để tính thuế
  const business = {
    id: 'temp',
    name: 'Hoạt động kinh doanh',
    category: businessCategory,
    monthlyRevenue: annualRevenue / 12,
    monthlyExpenses: 0,
    operatingMonths: 12,
    hasBusinessLicense: true,
    applyThresholdDeduction: true,
  };

  const householdResult = calculateHouseholdBusinessTax({
    businesses: [business],
    year: 2026,
    taxMethod: 'khoan', // Phương pháp khoán đơn giản
  });

  const totalTax = householdResult.summary.totalTax;
  const netIncome = annualRevenue - totalTax - selfInsurance;
  const effectiveTaxRate = totalTax / annualRevenue;

  return {
    grossIncome: annualRevenue,
    pitTax: householdResult.summary.totalPIT,
    vatTax: householdResult.summary.totalVAT,
    totalTax,
    netIncome,
    effectiveTaxRate,
    isExempt: false,
    prosCons: {
      pros: [
        'Thuế suất thấp (chỉ đóng trên phần vượt ngưỡng 1 tỷ)',
        'Được xuất hóa đơn, ký hợp đồng chính thức',
        'Tự chủ kinh doanh hoàn toàn',
        'Có thể thuê nhân viên',
        'Chi phí tuân thủ thấp hơn công ty',
      ],
      cons: [
        'Không có BHXH, BHTN tự động',
        'Phải đóng thuế khoán hàng quý',
        'Trách nhiệm vô hạn với nợ',
        'Khó huy động vốn từ bên ngoài',
        'Phải tự quản lý sổ sách, thuế',
      ],
    },
  };
}

/**
 * Xác định hình thức tối ưu
 */
function determineRecommendation(
  employee: EmployeeResult,
  freelancer: FreelancerResult,
  household: HouseholdBusinessResult
): BusinessForm {
  // So sánh thu nhập thực nhận
  const netIncomes = {
    employee: employee.netIncome,
    freelancer: freelancer.netIncome,
    household: household.netIncome,
  };

  // Tìm max
  const maxNet = Math.max(netIncomes.employee, netIncomes.freelancer, netIncomes.household);

  if (maxNet === netIncomes.household) return 'household';
  if (maxNet === netIncomes.freelancer) return 'freelancer';
  return 'employee';
}

/**
 * Tạo summary text
 */
function generateSummary(
  recommendation: BusinessForm,
  annualRevenue: number,
  employee: EmployeeResult,
  freelancer: FreelancerResult,
  household: HouseholdBusinessResult
): string {
  const formatMoney = (n: number) => Math.round(n / 1_000_000) + ' triệu';

  const savings = {
    freelancer: freelancer.netIncome - employee.netIncome,
    household: household.netIncome - employee.netIncome,
  };

  switch (recommendation) {
    case 'household':
      if (household.isExempt) {
        return `Với doanh thu ${formatMoney(annualRevenue)}/năm, bạn được miễn thuế nếu đăng ký Hộ kinh doanh. Đây là lựa chọn tối ưu nhất.`;
      }
      return `Với doanh thu ${formatMoney(annualRevenue)}/năm, Hộ kinh doanh có lợi nhất. Bạn tiết kiệm được ${formatMoney(savings.household)} so với làm công ăn lương.`;

    case 'freelancer':
      return `Với thu nhập ${formatMoney(annualRevenue)}/năm, làm Freelancer có lợi hơn. Bạn tiết kiệm được ${formatMoney(savings.freelancer)} so với làm công ăn lương, nhưng cần cân nhắc việc không có BHXH.`;

    case 'employee':
    default:
      return `Với thu nhập ${formatMoney(annualRevenue)}/năm, làm công ăn lương có thể là lựa chọn tốt nhờ các quyền lợi BHXH. Tuy nhiên, bạn có thể cân nhắc các hình thức khác nếu ưu tiên thu nhập cao hơn.`;
  }
}

/**
 * So sánh 3 hình thức kinh doanh
 */
export function compareBusinessForms(
  input: BusinessFormComparisonInput
): BusinessFormComparisonResult {
  const {
    annualRevenue,
    businessCategory,
    region,
    dependents,
    hasSelfInsurance,
  } = input;

  // Tính cho từng hình thức
  const employee = calculateEmployeeTax(annualRevenue, region, dependents);
  const freelancer = calculateFreelancerTax(annualRevenue, hasSelfInsurance);
  const householdBusiness = calculateHouseholdTax(annualRevenue, businessCategory, hasSelfInsurance);

  // Xác định khuyến nghị
  const recommendation = determineRecommendation(employee, freelancer, householdBusiness);

  // Tính số tiền tiết kiệm
  const savingsVsEmployee = {
    freelancer: freelancer.netIncome - employee.netIncome,
    householdBusiness: householdBusiness.netIncome - employee.netIncome,
  };

  // Tạo summary
  const summary = generateSummary(
    recommendation,
    annualRevenue,
    employee,
    freelancer,
    householdBusiness
  );

  return {
    employee,
    freelancer,
    householdBusiness,
    recommendation,
    savingsVsEmployee,
    summary,
  };
}

/**
 * Format currency VND
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percent
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Mô tả hình thức kinh doanh
 */
export const BUSINESS_FORM_INFO: Record<BusinessForm, { name: string; icon: string; description: string }> = {
  employee: {
    name: 'Làm công ăn lương',
    icon: '👔',
    description: 'Ký hợp đồng lao động, có BHXH đầy đủ, thuế lũy tiến 5-35%',
  },
  freelancer: {
    name: 'Freelancer',
    icon: '💻',
    description: 'Hợp đồng dịch vụ, thuế khoán 10%, không có BHXH',
  },
  household: {
    name: 'Hộ kinh doanh',
    icon: '🏪',
    description: 'Đăng ký kinh doanh, thuế khoán 1.5-7%, miễn thuế nếu ≤ 100tr/năm',
  },
};

// Re-export business category type
export type { BusinessCategory };
