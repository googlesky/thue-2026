import {
  RegionType,
  InsuranceOptions,
  InsuranceDetail,
  DEFAULT_INSURANCE_OPTIONS,
  calculateOldTax,
  calculateNewTax,
  getInsuranceDetailed,
} from './taxCalculator';

export interface CompanyOffer {
  id: string;
  name: string;
  grossSalary: number;
  hasInsurance: boolean;
  insuranceOptions?: InsuranceOptions;
  region: RegionType;
  bonusMonths: number;        // 1 = tháng 13, 2 = 13+14, etc.
  otherBenefits: number;      // Phụ cấp hàng tháng (VND)
  declaredSalary?: number;    // Lương khai báo (nếu khác lương thực)
}

export interface CompanyResult {
  companyId: string;
  companyName: string;

  // Tính toán hàng tháng
  monthlyGross: number;
  monthlyInsurance: number;
  monthlyInsuranceDetail: InsuranceDetail;
  monthlyTax: number;
  monthlyNet: number;
  monthlyBenefits: number;
  monthlyTotal: number;       // NET + benefits

  // Tính toán hàng năm
  annualGross: number;        // 12 * gross
  annualBonus: number;        // bonusMonths * gross
  annualBenefits: number;     // 12 * otherBenefits
  annualTotalGross: number;   // annualGross + annualBonus + annualBenefits

  annualInsurance: number;
  annualTax: number;
  annualNet: number;          // Sau thuế & bảo hiểm

  // Chỉ số
  effectiveRate: number;      // Thuế tính trên tổng thu nhập
  insuranceRate: number;      // Bảo hiểm tính trên gross
}

export interface ComparisonResult {
  companies: CompanyResult[];
  bestOffer: {
    byMonthlyNet: number;     // Index của công ty có NET tháng cao nhất
    byAnnualNet: number;      // Index của công ty có NET năm cao nhất
    byLowestTax: number;      // Index của công ty có thuế thấp nhất
  };
  differences: {
    maxMonthlyDiff: number;   // Chênh lệch NET tháng cao nhất - thấp nhất
    maxAnnualDiff: number;    // Chênh lệch NET năm cao nhất - thấp nhất
  };
}

// Tạo company offer mặc định
export function createDefaultCompanyOffer(id: string, name: string): CompanyOffer {
  return {
    id,
    name,
    grossSalary: 0,
    hasInsurance: true,
    insuranceOptions: { ...DEFAULT_INSURANCE_OPTIONS },
    region: 1,
    bonusMonths: 1,
    otherBenefits: 0,
  };
}

// Tính kết quả cho một công ty
export function calculateCompanyOffer(
  offer: CompanyOffer,
  dependents: number,
  useNewLaw: boolean = true
): CompanyResult {
  const {
    id,
    name,
    grossSalary: rawGrossSalary,
    hasInsurance,
    insuranceOptions = DEFAULT_INSURANCE_OPTIONS,
    region,
    bonusMonths: rawBonusMonths,
    otherBenefits: rawOtherBenefits,
    declaredSalary: rawDeclaredSalary,
  } = offer;

  // Input validation - ensure non-negative values
  const grossSalary = Math.max(0, rawGrossSalary || 0);
  const bonusMonths = Math.max(0, Math.min(12, rawBonusMonths || 0)); // Max 12 bonus months
  const otherBenefits = Math.max(0, rawOtherBenefits || 0);
  const declaredSalary = rawDeclaredSalary ? Math.max(0, rawDeclaredSalary) : undefined;

  // Tính bảo hiểm hàng tháng
  const insOptions = hasInsurance ? insuranceOptions : { bhxh: false, bhyt: false, bhtn: false };
  const insuranceBase = declaredSalary ?? grossSalary;
  const monthlyInsuranceDetail = getInsuranceDetailed(insuranceBase, region, insOptions);
  const monthlyInsurance = monthlyInsuranceDetail.total;

  // Tính thuế hàng tháng
  const taxResult = useNewLaw
    ? calculateNewTax({
        grossIncome: grossSalary,
        declaredSalary,
        dependents,
        hasInsurance,
        insuranceOptions: insOptions,
        region,
      })
    : calculateOldTax({
        grossIncome: grossSalary,
        declaredSalary,
        dependents,
        hasInsurance,
        insuranceOptions: insOptions,
        region,
      });

  const monthlyTax = taxResult.taxAmount;
  const monthlyNet = taxResult.netIncome;
  const monthlyTotal = monthlyNet + otherBenefits;

  // Tính năm
  const annualGross = grossSalary * 12;
  const annualBonus = grossSalary * bonusMonths;
  const annualBenefits = otherBenefits * 12;
  const annualTotalGross = annualGross + annualBonus + annualBenefits;

  // Bảo hiểm năm (chỉ tính trên lương cơ bản, không tính thưởng)
  const annualInsurance = monthlyInsurance * 12;

  // Thuế năm - cần tính cả thưởng
  // Thưởng được tính thuế như thu nhập tháng nhận thưởng
  let annualTax = monthlyTax * 12;

  // Tính thuế cho từng tháng thưởng
  for (let i = 0; i < bonusMonths; i++) {
    // Tháng có thưởng: thu nhập = lương + thưởng
    const bonusMonthIncome = grossSalary + grossSalary; // lương + 1 tháng thưởng
    const bonusTaxResult = useNewLaw
      ? calculateNewTax({
          grossIncome: bonusMonthIncome,
          declaredSalary: declaredSalary ? declaredSalary * 2 : undefined,
          dependents,
          hasInsurance,
          insuranceOptions: insOptions,
          region,
        })
      : calculateOldTax({
          grossIncome: bonusMonthIncome,
          declaredSalary: declaredSalary ? declaredSalary * 2 : undefined,
          dependents,
          hasInsurance,
          insuranceOptions: insOptions,
          region,
        });

    // Thuế thêm từ thưởng = thuế tháng có thưởng - thuế tháng bình thường
    const bonusTax = bonusTaxResult.taxAmount - monthlyTax;
    annualTax += bonusTax;
  }

  const annualNet = annualTotalGross - annualInsurance - annualTax;

  return {
    companyId: id,
    companyName: name,
    monthlyGross: grossSalary,
    monthlyInsurance,
    monthlyInsuranceDetail,
    monthlyTax,
    monthlyNet,
    monthlyBenefits: otherBenefits,
    monthlyTotal,
    annualGross,
    annualBonus,
    annualBenefits,
    annualTotalGross,
    annualInsurance,
    annualTax,
    annualNet,
    effectiveRate: annualTotalGross > 0 ? (annualTax / annualTotalGross) * 100 : 0,
    insuranceRate: grossSalary > 0 ? (monthlyInsurance / grossSalary) * 100 : 0,
  };
}

// So sánh nhiều công ty
export function compareCompanyOffers(
  offers: CompanyOffer[],
  dependents: number,
  useNewLaw: boolean = true
): ComparisonResult {
  const companies = offers.map(offer => calculateCompanyOffer(offer, dependents, useNewLaw));

  // Tìm công ty tốt nhất
  let bestMonthlyNetIndex = 0;
  let bestAnnualNetIndex = 0;
  let lowestTaxIndex = 0;

  for (let i = 1; i < companies.length; i++) {
    if (companies[i].monthlyNet > companies[bestMonthlyNetIndex].monthlyNet) {
      bestMonthlyNetIndex = i;
    }
    if (companies[i].annualNet > companies[bestAnnualNetIndex].annualNet) {
      bestAnnualNetIndex = i;
    }
    if (companies[i].annualTax < companies[lowestTaxIndex].annualTax) {
      lowestTaxIndex = i;
    }
  }

  // Tính chênh lệch
  const monthlyNets = companies.map(c => c.monthlyNet);
  const annualNets = companies.map(c => c.annualNet);

  const maxMonthlyDiff = Math.max(...monthlyNets) - Math.min(...monthlyNets);
  const maxAnnualDiff = Math.max(...annualNets) - Math.min(...annualNets);

  return {
    companies,
    bestOffer: {
      byMonthlyNet: bestMonthlyNetIndex,
      byAnnualNet: bestAnnualNetIndex,
      byLowestTax: lowestTaxIndex,
    },
    differences: {
      maxMonthlyDiff,
      maxAnnualDiff,
    },
  };
}
