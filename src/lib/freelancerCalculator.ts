import {
  RegionType,
  InsuranceOptions,
  InsuranceDetail,
  DEFAULT_INSURANCE_OPTIONS,
  calculateOldTax,
  calculateNewTax,
  getInsuranceDetailed,
} from './taxCalculator';

// Thuế suất khấu trừ cho thu nhập vãng lai (freelancer/contractor)
export const FREELANCER_TAX_RATE = 0.10; // 10%

export type IncomeFrequency = 'monthly' | 'project' | 'annual';

export interface FreelancerInput {
  grossIncome: number;
  frequency: IncomeFrequency;
  // Cho so sánh với nhân viên
  dependents: number;
  hasInsurance: boolean;
  insuranceOptions?: InsuranceOptions;
  region: RegionType;
  // Phiên bản luật thuế
  useNewLaw: boolean;
}

export interface FreelancerResult {
  gross: number;           // Tương đương tháng
  annualGross: number;

  // Tính toán cho Freelancer
  freelancer: {
    tax: number;           // 10% của gross
    net: number;           // gross - tax
    annualTax: number;
    annualNet: number;
    effectiveRate: number;
  };

  // Tính toán cho nhân viên (sử dụng logic hiện có)
  employee: {
    tax: number;
    insurance: number;
    net: number;
    annualTax: number;
    annualInsurance: number;
    annualNet: number;
    effectiveRate: number;
    insuranceDetail: InsuranceDetail;
  };

  // So sánh
  comparison: {
    netDifference: number;        // freelancer.net - employee.net
    annualDifference: number;
    freelancerBetter: boolean;
    breakEvenGross: number;       // Mức thu nhập mà 2 bên bằng nhau
  };
}

// Chuẩn hóa về tháng
function normalizeToMonthly(amount: number, frequency: IncomeFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amount;
    case 'project':
      return amount; // Mỗi dự án coi như 1 tháng
    case 'annual':
      return amount / 12;
  }
}

// Chuẩn hóa về năm
function normalizeToAnnual(amount: number, frequency: IncomeFrequency): number {
  switch (frequency) {
    case 'monthly':
      return amount * 12;
    case 'project':
      return amount; // Dự án đơn lẻ
    case 'annual':
      return amount;
  }
}

// Tính điểm hòa vốn bằng binary search
export function calculateBreakEven(
  dependents: number,
  hasInsurance: boolean,
  region: RegionType,
  useNewLaw: boolean,
  insuranceOptions: InsuranceOptions = DEFAULT_INSURANCE_OPTIONS
): number {
  let low = 0;
  let high = 500_000_000; // 500 triệu
  const tolerance = 10_000; // 10k

  while (high - low > tolerance) {
    const mid = Math.floor((low + high) / 2);

    // Freelancer NET
    const freelancerNet = mid * (1 - FREELANCER_TAX_RATE);

    // Employee NET
    const taxResult = useNewLaw
      ? calculateNewTax({
          grossIncome: mid,
          dependents,
          hasInsurance,
          insuranceOptions,
          region,
        })
      : calculateOldTax({
          grossIncome: mid,
          dependents,
          hasInsurance,
          insuranceOptions,
          region,
        });
    const employeeNet = taxResult.netIncome;

    if (freelancerNet > employeeNet) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return Math.round((low + high) / 2);
}

// Hàm tính chính
export function calculateFreelancerComparison(input: FreelancerInput): FreelancerResult {
  const {
    grossIncome: rawGrossIncome,
    frequency,
    dependents: rawDependents,
    hasInsurance,
    insuranceOptions = DEFAULT_INSURANCE_OPTIONS,
    region,
    useNewLaw,
  } = input;

  // Input validation - ensure non-negative values
  const grossIncome = Math.max(0, rawGrossIncome || 0);
  const dependents = Math.max(0, rawDependents || 0);

  // 1. Chuẩn hóa về tháng
  const monthlyGross = normalizeToMonthly(grossIncome, frequency);
  const annualGross = normalizeToAnnual(grossIncome, frequency);

  // 2. Tính thuế freelancer (đơn giản 10%)
  const freelancerMonthlyTax = monthlyGross * FREELANCER_TAX_RATE;
  const freelancerMonthlyNet = monthlyGross - freelancerMonthlyTax;
  const freelancerAnnualTax = annualGross * FREELANCER_TAX_RATE;
  const freelancerAnnualNet = annualGross - freelancerAnnualTax;

  // 3. Tính thuế nhân viên
  const taxResult = useNewLaw
    ? calculateNewTax({
        grossIncome: monthlyGross,
        dependents,
        hasInsurance,
        insuranceOptions,
        region,
      })
    : calculateOldTax({
        grossIncome: monthlyGross,
        dependents,
        hasInsurance,
        insuranceOptions,
        region,
      });

  const insuranceDetail = getInsuranceDetailed(monthlyGross, region, insuranceOptions);
  const employeeMonthlyInsurance = hasInsurance ? insuranceDetail.total : 0;
  const employeeMonthlyTax = taxResult.taxAmount;
  const employeeMonthlyNet = taxResult.netIncome;

  const employeeAnnualInsurance = employeeMonthlyInsurance * 12;
  const employeeAnnualTax = employeeMonthlyTax * 12;
  const employeeAnnualNet = employeeMonthlyNet * 12;

  // 4. Tính điểm hòa vốn
  const breakEvenGross = calculateBreakEven(
    dependents,
    hasInsurance,
    region,
    useNewLaw,
    insuranceOptions
  );

  // 5. So sánh
  const netDifference = freelancerMonthlyNet - employeeMonthlyNet;
  const annualDifference = freelancerAnnualNet - employeeAnnualNet;

  return {
    gross: monthlyGross,
    annualGross,
    freelancer: {
      tax: freelancerMonthlyTax,
      net: freelancerMonthlyNet,
      annualTax: freelancerAnnualTax,
      annualNet: freelancerAnnualNet,
      effectiveRate: FREELANCER_TAX_RATE * 100,
    },
    employee: {
      tax: employeeMonthlyTax,
      insurance: employeeMonthlyInsurance,
      net: employeeMonthlyNet,
      annualTax: employeeAnnualTax,
      annualInsurance: employeeAnnualInsurance,
      annualNet: employeeAnnualNet,
      effectiveRate: monthlyGross > 0 ? (employeeMonthlyTax / monthlyGross) * 100 : 0,
      insuranceDetail,
    },
    comparison: {
      netDifference,
      annualDifference,
      freelancerBetter: netDifference > 0,
      breakEvenGross,
    },
  };
}

// Tạo dữ liệu cho biểu đồ so sánh
export function generateComparisonRange(
  minGross: number,
  maxGross: number,
  step: number,
  dependents: number,
  hasInsurance: boolean,
  region: RegionType,
  useNewLaw: boolean
): { gross: number; freelancerNet: number; employeeNet: number; difference: number }[] {
  const result = [];

  for (let gross = minGross; gross <= maxGross; gross += step) {
    const freelancerNet = gross * (1 - FREELANCER_TAX_RATE);

    const taxResult = useNewLaw
      ? calculateNewTax({ grossIncome: gross, dependents, hasInsurance, region })
      : calculateOldTax({ grossIncome: gross, dependents, hasInsurance, region });

    const employeeNet = taxResult.netIncome;

    result.push({
      gross,
      freelancerNet,
      employeeNet,
      difference: freelancerNet - employeeNet,
    });
  }

  return result;
}

// Ưu và nhược điểm
export const FREELANCER_PROS = [
  'Linh hoạt về thời gian và địa điểm làm việc',
  'Không phụ thuộc vào một công ty',
  'Có thể nhận nhiều dự án cùng lúc',
  'Thu nhập thực nhận cao hơn (ở mức lương cao)',
  'Thuế suất cố định 10%, không lũy tiến',
];

export const FREELANCER_CONS = [
  'Không được đóng BHXH, không có lương hưu từ nhà nước',
  'Phải tự mua BHYT (~1-2 triệu/tháng)',
  'Không được nghỉ phép có lương, không phép năm',
  'Thu nhập không ổn định, phụ thuộc vào dự án',
  'Tự chịu trách nhiệm thuế, hóa đơn, kế toán',
  'Không có thưởng tháng 13, trợ cấp thôi việc',
  'Khó vay ngân hàng (chứng minh thu nhập khó)',
];

export const EMPLOYEE_PROS = [
  'Doanh nghiệp đóng 21.5% bảo hiểm cho bạn',
  'Được đóng BHXH (lương hưu, thai sản, ốm đau)',
  'Được BHYT với mức đóng thấp (1.5%)',
  'Thu nhập ổn định, được nghỉ phép có lương',
  'Có thưởng tháng 13, trợ cấp thôi việc',
  'Thuế suất thấp hơn ở mức thu nhập trung bình',
  'Dễ vay ngân hàng (có hợp đồng lao động)',
];

export const EMPLOYEE_CONS = [
  'Thu nhập thực nhận thấp hơn (ở mức lương cao)',
  'Bị ràng buộc bởi hợp đồng lao động',
  'Phải làm việc theo giờ hành chính',
  'Khó nhận nhiều công việc cùng lúc',
];
