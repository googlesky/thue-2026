/**
 * Business Form Comparison Calculator
 * So sánh 3 hình thức: Lương vs Freelancer vs Hộ kinh doanh
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 109/2025/QH15 (sửa đổi bởi Luật 09/2026/QH16): biểu lũy tiến 5 bậc (Điều 9),
 *   thu nhập từ kinh doanh (Điều 7)
 * - NQ 110/2025/UBTVQH15: giảm trừ gia cảnh 15,5 triệu/6,2 triệu đồng/tháng
 * - NĐ 253/2026/NĐ-CP: thù lao dịch vụ của cá nhân không đăng ký kinh doanh là tiền công
 *   (Điều 8.2.c), khấu trừ 10% khoản chi từ 5 triệu đồng/lần (Điều 50.2)
 * - NĐ 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP), TT 18/2026/TT-BTC: hộ, cá nhân kinh doanh
 */

import {
  calculateNewTax,
  calculateEmployerInsurance,
  DEFAULT_INSURANCE_OPTIONS,
  RegionType,
} from './taxCalculator';
import {
  calculateBusinessLinesTax,
  BusinessCategory,
  BUSINESS_CATEGORY_LABELS,
  TaxMethod,
} from './householdBusinessTaxCalculator';
import { calculateFreelancerTax, getSelfHealthInsuranceAnnual } from './freelancerCalculator';

/**
 * Business categories for dropdown
 */
export const BUSINESS_CATEGORIES = (Object.entries(BUSINESS_CATEGORY_LABELS) as [BusinessCategory, string][])
  .map(([id, name]) => ({ id, name }));

/**
 * Hình thức kinh doanh
 */
export type BusinessForm = 'employee' | 'freelancer' | 'household';

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
  taxableIncome: number;      // Thu nhập tính thuế
  taxAmount: number;          // Thuế TNCN
  netIncome: number;          // Thu nhập thực nhận
  totalCost: number;          // Tổng chi phí (góc nhìn DN)
  effectiveTaxRate: number;   // Thuế suất thực tế
  prosCons: ProsCons;
}

/**
 * Kết quả tính thuế cho Freelancer (tiền công, không đăng ký kinh doanh)
 */
export interface FreelancerResult {
  grossIncome: number;        // Thu nhập gộp
  expenses: number;           // Chi phí tự chịu (không được trừ khi tính thuế)
  withholdingTax: number;     // Đã tạm khấu trừ 10% trong năm
  finalTax: number;           // Thuế cả năm theo biểu lũy tiến (quyết toán)
  settlement: number;         // > 0: nộp thêm; < 0: được hoàn khi quyết toán
  selfInsurance: number;      // Tự mua BHYT
  netIncome: number;          // Thu nhập thực nhận
  effectiveTaxRate: number;   // Thuế suất thực tế
  prosCons: ProsCons;
}

/**
 * Kết quả tính thuế cho Hộ kinh doanh
 */
export interface HouseholdBusinessResult {
  grossIncome: number;        // Doanh thu
  expenses: number;           // Chi phí
  pitTax: number;             // Thuế TNCN
  vatTax: number;             // Thuế GTGT
  totalTax: number;           // Tổng thuế
  selfInsurance: number;      // Tự mua BHYT
  netIncome: number;          // Thu nhập sau thuế
  effectiveTaxRate: number;   // Thuế suất thực tế
  isExempt: boolean;          // Doanh thu không vượt ngưỡng
  method: TaxMethod;          // Phương pháp TNCN có lợi hơn / bắt buộc
  prosCons: ProsCons;
}

/**
 * Input so sánh hình thức kinh doanh
 */
export interface BusinessFormComparisonInput {
  annualRevenue: number;              // Doanh thu/thu nhập năm
  expenseRatio: number;               // Tỷ lệ chi phí tự chịu của freelancer, hộ KD (0-1)
  businessCategory: BusinessCategory; // Ngành nghề
  region: RegionType;                 // Vùng (cho bảo hiểm)
  dependents: number;                 // Số người phụ thuộc
  hasSelfInsurance: boolean;          // Tự mua BHYT?
}

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

const safeRate = (tax: number, base: number) => (base > 0 ? tax / base : 0);

/**
 * Tính thuế cho nhân viên (lương)
 */
function calculateEmployeeTax(
  annualRevenue: number,
  region: RegionType,
  dependents: number
): EmployeeResult {
  const monthlyGross = annualRevenue / 12;

  const taxResult = calculateNewTax({
    grossIncome: monthlyGross,
    dependents,
    otherDeductions: 0,
    hasInsurance: true,
    insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region,
  });

  const annualTax = taxResult.taxAmount * 12;
  const annualInsuranceEmployee = (taxResult.insuranceDetail?.total || 0) * 12;
  // Công ty đóng BHXH 17,5% + BHYT 3% (trần 20 lần lương cơ sở), BHTN 1% (trần 20 lần lương tối thiểu vùng)
  const annualInsuranceEmployer = calculateEmployerInsurance(monthlyGross, region).total * 12;

  return {
    grossIncome: annualRevenue,
    insuranceEmployee: annualInsuranceEmployee,
    insuranceEmployer: annualInsuranceEmployer,
    taxableIncome: taxResult.taxableIncome * 12,
    taxAmount: annualTax,
    netIncome: annualRevenue - annualInsuranceEmployee - annualTax,
    totalCost: annualRevenue + annualInsuranceEmployer,
    effectiveTaxRate: safeRate(annualTax, annualRevenue),
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
 * Freelancer: tạm khấu trừ 10%, quyết toán theo biểu lũy tiến, không trừ chi phí
 */
function calculateFreelancerOption(
  annualRevenue: number,
  expenseRatio: number,
  dependents: number,
  hasSelfInsurance: boolean
): FreelancerResult {
  const expenses = annualRevenue * expenseRatio;
  const selfInsurance = hasSelfInsurance ? getSelfHealthInsuranceAnnual() : 0;
  // BHYT tự đóng được trừ khi quyết toán (NĐ 253/2026 Điều 46.2.a)
  const tax = calculateFreelancerTax(annualRevenue, dependents, { annualDeductions: selfInsurance });

  return {
    grossIncome: annualRevenue,
    expenses,
    withholdingTax: tax.withheld,
    finalTax: tax.finalTax,
    settlement: tax.settlement,
    selfInsurance,
    netIncome: annualRevenue - expenses - tax.finalTax - selfInsurance,
    effectiveTaxRate: safeRate(tax.finalTax, annualRevenue),
    prosCons: {
      pros: [
        'Linh hoạt về thời gian và địa điểm làm việc',
        'Được giảm trừ gia cảnh khi quyết toán theo biểu lũy tiến',
        'Thủ tục đơn giản, không cần đăng ký kinh doanh',
        'Có thể làm nhiều dự án cùng lúc',
        'Nộp thừa (đã khấu trừ 10%) được hoàn khi quyết toán',
      ],
      cons: [
        'Không có BHXH, BHTN; phải tự mua BHYT',
        'Không được trừ chi phí khi tính thuế',
        'Bị tạm khấu trừ 10% khoản chi từ 5 triệu đồng/lần',
        'Thu nhập không ổn định',
        'Rủi ro pháp lý nếu hợp đồng không rõ ràng',
      ],
    },
  };
}

/**
 * Hộ kinh doanh: DT ≤ 1 tỷ không nộp thuế; 1–3 tỷ lấy phương pháp có lợi hơn;
 * trên 3 tỷ bắt buộc phương pháp thu nhập
 */
function calculateHouseholdTax(
  annualRevenue: number,
  expenseRatio: number,
  businessCategory: BusinessCategory,
  hasSelfInsurance: boolean
): HouseholdBusinessResult {
  const expenses = annualRevenue * expenseRatio;
  const selfInsurance = hasSelfInsurance ? getSelfHealthInsuranceAnnual() : 0;
  const lines = [{ category: businessCategory, revenue: annualRevenue, expenses }];
  const percentage = calculateBusinessLinesTax(lines, 2026, 'khoan');
  const income = calculateBusinessLinesTax(lines, 2026, 'income');
  const best = percentage.pit <= income.pit ? percentage : income;
  const totalTax = best.pit + best.vat;
  const isExempt = !best.isAboveThreshold;

  return {
    grossIncome: annualRevenue,
    expenses,
    pitTax: best.pit,
    vatTax: best.vat,
    totalTax,
    selfInsurance,
    netIncome: annualRevenue - expenses - totalTax - selfInsurance,
    effectiveTaxRate: safeRate(totalTax, annualRevenue),
    isExempt,
    method: best.method,
    prosCons: isExempt
      ? {
          pros: [
            'Không nộp TNCN, GTGT (doanh thu ≤ 1 tỷ/năm)',
            'Chỉ thông báo doanh thu 1 lần/năm (Mẫu 01/TKN-CNKD, hạn 31/01 năm sau)',
            'Được xuất hóa đơn, ký hợp đồng chính thức',
            'Phù hợp kinh doanh nhỏ lẻ',
          ],
          cons: [
            'Không có BHXH, BHTN',
            'Vượt 1 tỷ phải khai thuế theo quý và dùng hóa đơn điện tử',
            'Khó mở rộng, khó vay vốn',
            'Không xuất hóa đơn GTGT (chỉ hóa đơn bán hàng)',
          ],
        }
      : {
          pros: [
            'TNCN chỉ tính trên phần doanh thu vượt 1 tỷ (tỷ lệ %) hoặc trên lợi nhuận',
            'Được xuất hóa đơn, ký hợp đồng chính thức',
            'Tự chủ kinh doanh hoàn toàn',
            'Có thể thuê nhân viên',
            'Chi phí tuân thủ thấp hơn công ty',
          ],
          cons: [
            'Không có BHXH, BHTN tự động',
            'Kê khai GTGT, TNCN theo quý từ quý doanh thu lũy kế vượt 1 tỷ',
            'Trách nhiệm vô hạn với nợ',
            'Khó huy động vốn từ bên ngoài',
            'Phải dùng hóa đơn điện tử, tự quản lý sổ sách',
          ],
        },
  };
}

/**
 * Xác định hình thức tối ưu (thu nhập thực nhận cao nhất)
 */
function determineRecommendation(
  employee: EmployeeResult,
  freelancer: FreelancerResult,
  household: HouseholdBusinessResult
): BusinessForm {
  const maxNet = Math.max(employee.netIncome, freelancer.netIncome, household.netIncome);
  if (maxNet === household.netIncome) return 'household';
  if (maxNet === freelancer.netIncome) return 'freelancer';
  return 'employee';
}

function generateSummary(
  recommendation: BusinessForm,
  annualRevenue: number,
  employee: EmployeeResult,
  freelancer: FreelancerResult,
  household: HouseholdBusinessResult
): string {
  const formatMoney = (n: number) => Math.round(n / 1_000_000).toLocaleString('vi-VN') + ' triệu';

  switch (recommendation) {
    case 'household':
      if (household.isExempt) {
        return `Với doanh thu ${formatMoney(annualRevenue)}/năm, hộ kinh doanh không phải nộp TNCN, GTGT (doanh thu ≤ 1 tỷ/năm), chỉ cần thông báo doanh thu. Thu nhập thực nhận cao hơn làm công ăn lương ${formatMoney(household.netIncome - employee.netIncome)}.`;
      }
      return `Với doanh thu ${formatMoney(annualRevenue)}/năm, hộ kinh doanh có lợi nhất. Thu nhập thực nhận cao hơn làm công ăn lương ${formatMoney(household.netIncome - employee.netIncome)}.`;

    case 'freelancer':
      return `Với thu nhập ${formatMoney(annualRevenue)}/năm, làm freelancer có lợi hơn ${formatMoney(freelancer.netIncome - employee.netIncome)} so với làm công ăn lương, nhưng cần cân nhắc việc không có BHXH.`;

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
  const { annualRevenue, businessCategory, region, dependents, hasSelfInsurance } = input;
  const expenseRatio = Math.min(1, Math.max(0, input.expenseRatio || 0));

  const employee = calculateEmployeeTax(annualRevenue, region, dependents);
  const freelancer = calculateFreelancerOption(annualRevenue, expenseRatio, dependents, hasSelfInsurance);
  const householdBusiness = calculateHouseholdTax(annualRevenue, expenseRatio, businessCategory, hasSelfInsurance);

  const recommendation = determineRecommendation(employee, freelancer, householdBusiness);

  return {
    employee,
    freelancer,
    householdBusiness,
    recommendation,
    savingsVsEmployee: {
      freelancer: freelancer.netIncome - employee.netIncome,
      householdBusiness: householdBusiness.netIncome - employee.netIncome,
    },
    summary: generateSummary(recommendation, annualRevenue, employee, freelancer, householdBusiness),
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
 * Format percent: 0.105 -> "10,5%"
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/**
 * Mô tả hình thức kinh doanh
 */
export const BUSINESS_FORM_INFO: Record<BusinessForm, { name: string; description: string }> = {
  employee: {
    name: 'Làm công ăn lương',
    description: 'Ký hợp đồng lao động, có BHXH đầy đủ, thuế lũy tiến 5–35%',
  },
  freelancer: {
    name: 'Freelancer',
    description: 'Hợp đồng dịch vụ, tạm khấu trừ 10%, quyết toán theo biểu lũy tiến, không có BHXH',
  },
  household: {
    name: 'Hộ kinh doanh',
    description: 'Doanh thu ≤ 1 tỷ/năm không nộp TNCN, GTGT; trên 1 tỷ nộp TNCN theo tỷ lệ % hoặc 15–20% lợi nhuận',
  },
};

// Re-export business category type
export type { BusinessCategory };
