/**
 * Withholding Tax Calculator - Thuế khấu trừ tại nguồn
 *
 * Căn cứ pháp lý:
 * - Điều 25, Luật Thuế TNCN 2007 (sửa đổi 2012, 2014)
 * - Thông tư 111/2013/TT-BTC
 * - Nghị định 65/2013/NĐ-CP
 */

// ===== CONSTANTS =====

/**
 * Ngưỡng khấu trừ thuế TNCN
 */
export const WHT_THRESHOLDS = {
  perPayment: 2_000_000,       // 2 triệu/lần chi trả
  annualExempt: 100_000_000,   // 100 triệu/năm (dưới ngưỡng không phải nộp)
};

/**
 * Thuế suất khấu trừ cho cá nhân cư trú
 */
export const RESIDENT_WHT_RATES = {
  // Có hợp đồng lao động >= 3 tháng
  salaryWithContract: 'progressive' as const, // Biểu lũy tiến 7 bậc (hoặc 5 bậc từ 2026)

  // Không có hợp đồng hoặc < 3 tháng
  salaryWithoutContract: {
    rate: 0.10,        // 10% trên thu nhập từ 2 triệu trở lên
    threshold: 2_000_000,
  },

  // Thu nhập từ kinh doanh (freelance, tư vấn)
  freelance: 0.10,     // 10%

  // Cho thuê tài sản
  rental: 0.05,        // 5%

  // Đầu tư - cổ tức
  dividend: 0.05,      // 5%

  // Đầu tư - lãi tiền gửi, trái phiếu
  interest: {
    regular: 0.05,     // 5%
    govBond: 0,        // 0% - trái phiếu chính phủ
  },

  // Chuyển nhượng chứng khoán
  securities: 0.001,   // 0.1%

  // Chuyển nhượng bất động sản
  realEstate: 0.02,    // 2%

  // Trúng thưởng
  lottery: {
    rate: 0.10,        // 10%
    threshold: 10_000_000, // Trên 10 triệu
  },

  // Thừa kế, quà tặng (không phải gia đình)
  inheritance: {
    rate: 0.10,        // 10%
    threshold: 10_000_000, // Trên 10 triệu
  },
};

/**
 * Thuế suất khấu trừ cho cá nhân không cư trú
 */
export const NON_RESIDENT_WHT_RATES = {
  salary: 0.20,        // 20%
  freelance: 0.20,     // 20%
  rental: 0.05,        // 5%
  dividend: 0.05,      // 5%
  interest: 0.05,      // 5%
  securities: 0.001,   // 0.1%
  realEstate: 0.02,    // 2%
  lottery: 0.10,       // 10%
  inheritance: 0.10,   // 10%
  royalty: 0.05,       // 5%
};

/**
 * Thuế suất nhà thầu nước ngoài (FCT)
 * Phần TNCN (thuế suất trên doanh thu)
 */
export const FOREIGN_CONTRACTOR_TAX_RATES = {
  // Loại dịch vụ
  service: {
    pit: 0.05,         // 5% TNCN
    vat: 0.05,         // 5% GTGT
    total: 0.10,       // 10% tổng
  },

  // Hàng hóa kèm dịch vụ
  goodsWithService: {
    pit: 0.01,         // 1% TNCN
    vat: 0.03,         // 3% GTGT
    total: 0.04,       // 4% tổng
  },

  // Chỉ hàng hóa
  goodsOnly: {
    pit: 0.01,         // 1% TNCN
    vat: 0.02,         // 2% GTGT (nếu có)
    total: 0.03,       // 3% tổng
  },

  // Thuê máy móc, thiết bị
  equipmentRental: {
    pit: 0.05,         // 5% TNCN
    vat: 0.05,         // 5% GTGT
    total: 0.10,       // 10% tổng
  },

  // Cho thuê BĐS
  propertyRental: {
    pit: 0.05,         // 5% TNCN
    vat: 0.05,         // 5% GTGT
    total: 0.10,       // 10% tổng
  },

  // Bảo hiểm
  insurance: {
    pit: 0.05,         // 5% TNCN
    vat: 0.05,         // 5% GTGT
    total: 0.10,       // 10% tổng
  },
};

/**
 * Loại thu nhập để khấu trừ
 */
export type IncomeType =
  | 'salary_with_contract'
  | 'salary_without_contract'
  | 'freelance'
  | 'rental'
  | 'dividend'
  | 'interest_regular'
  | 'interest_govbond'
  | 'securities'
  | 'real_estate'
  | 'lottery'
  | 'inheritance'
  | 'royalty';

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salary_with_contract: 'Lương (có HĐLĐ ≥ 3 tháng)',
  salary_without_contract: 'Lương (không HĐLĐ hoặc < 3 tháng)',
  freelance: 'Thu nhập tự do / Dịch vụ',
  rental: 'Cho thuê tài sản',
  dividend: 'Cổ tức',
  interest_regular: 'Lãi tiền gửi / Trái phiếu DN',
  interest_govbond: 'Lãi trái phiếu Chính phủ',
  securities: 'Chuyển nhượng chứng khoán',
  real_estate: 'Chuyển nhượng bất động sản',
  lottery: 'Trúng thưởng',
  inheritance: 'Thừa kế / Quà tặng (ngoài gia đình)',
  royalty: 'Bản quyền / Nhượng quyền',
};

export type ResidencyStatus = 'resident' | 'non_resident';

export type ForeignContractorType =
  | 'service'
  | 'goods_with_service'
  | 'goods_only'
  | 'equipment_rental'
  | 'property_rental'
  | 'insurance';

// ===== TYPES =====

export interface WHTInput {
  // Số tiền chi trả
  paymentAmount: number;

  // Loại thu nhập
  incomeType: IncomeType;

  // Tình trạng cư trú
  residencyStatus: ResidencyStatus;

  // Có hợp đồng lao động không (cho lương)
  hasLaborContract?: boolean;

  // Thời hạn hợp đồng (tháng)
  contractDuration?: number;

  // Là thành viên gia đình không (cho thừa kế)
  isFamilyMember?: boolean;
}

export interface WHTResult {
  // Số tiền chi trả
  paymentAmount: number;

  // Thuế suất áp dụng
  appliedRate: number | 'progressive';

  // Số tiền thuế khấu trừ
  withholdingAmount: number;

  // Số tiền thực nhận
  netAmount: number;

  // Có cần khấu trừ không
  requiresWithholding: boolean;

  // Lý do không khấu trừ (nếu có)
  exemptReason?: string;

  // Ghi chú pháp lý
  legalNote: string;
}

export interface ForeignContractorTaxInput {
  // Doanh thu hợp đồng
  contractValue: number;

  // Loại hợp đồng
  contractType: ForeignContractorType;

  // Có đăng ký thuế GTGT VN không
  hasVATRegistration: boolean;
}

export interface ForeignContractorTaxResult {
  // Doanh thu
  contractValue: number;

  // Thuế TNCN
  pitAmount: number;
  pitRate: number;

  // Thuế GTGT
  vatAmount: number;
  vatRate: number;

  // Tổng thuế
  totalTax: number;
  totalRate: number;

  // Số tiền thực nhận
  netAmount: number;

  // Ghi chú
  notes: string[];
}

export interface WHTComparison {
  resident: WHTResult;
  nonResident: WHTResult;
  difference: number;
  recommendation: string;
}

// ===== FUNCTIONS =====

/**
 * Tính thuế khấu trừ tại nguồn
 */
export function calculateWithholdingTax(input: WHTInput): WHTResult {
  const { paymentAmount, incomeType, residencyStatus, isFamilyMember } = input;

  // Mặc định
  let appliedRate: number | 'progressive' = 0;
  let withholdingAmount = 0;
  let requiresWithholding = true;
  let exemptReason: string | undefined;
  let legalNote = '';

  if (residencyStatus === 'resident') {
    // Cá nhân cư trú
    switch (incomeType) {
      case 'salary_with_contract':
        appliedRate = 'progressive';
        withholdingAmount = 0; // Tính theo biểu lũy tiến
        legalNote = 'Khấu trừ theo biểu thuế lũy tiến, trừ giảm trừ gia cảnh (Điều 25 Luật Thuế TNCN).';
        break;

      case 'salary_without_contract':
        if (paymentAmount < WHT_THRESHOLDS.perPayment) {
          requiresWithholding = false;
          exemptReason = `Thu nhập dưới ${formatCurrency(WHT_THRESHOLDS.perPayment)}/lần - không khấu trừ.`;
          appliedRate = 0;
        } else {
          appliedRate = RESIDENT_WHT_RATES.salaryWithoutContract.rate;
          withholdingAmount = Math.round(paymentAmount * appliedRate);
        }
        legalNote = 'Không có HĐLĐ hoặc HĐLĐ < 3 tháng: khấu trừ 10% nếu ≥ 2 triệu/lần (Điều 25 Luật Thuế TNCN).';
        break;

      case 'freelance':
        if (paymentAmount < WHT_THRESHOLDS.perPayment) {
          requiresWithholding = false;
          exemptReason = `Thu nhập dưới ${formatCurrency(WHT_THRESHOLDS.perPayment)}/lần - không khấu trừ.`;
          appliedRate = 0;
        } else {
          appliedRate = RESIDENT_WHT_RATES.freelance;
          withholdingAmount = Math.round(paymentAmount * appliedRate);
        }
        legalNote = 'Thu nhập từ kinh doanh: khấu trừ 10% nếu ≥ 2 triệu/lần (Thông tư 111/2013/TT-BTC).';
        break;

      case 'rental':
        appliedRate = RESIDENT_WHT_RATES.rental;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Cho thuê tài sản: khấu trừ 5% trên thu nhập (Điều 4 Thông tư 92/2015/TT-BTC).';
        break;

      case 'dividend':
        appliedRate = RESIDENT_WHT_RATES.dividend;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Cổ tức: khấu trừ 5% tại nguồn (Điều 10 Luật Thuế TNCN).';
        break;

      case 'interest_regular':
        appliedRate = RESIDENT_WHT_RATES.interest.regular;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Lãi tiền gửi, trái phiếu DN: khấu trừ 5% (Điều 10 Luật Thuế TNCN).';
        break;

      case 'interest_govbond':
        appliedRate = RESIDENT_WHT_RATES.interest.govBond;
        withholdingAmount = 0;
        requiresWithholding = false;
        exemptReason = 'Lãi trái phiếu Chính phủ được miễn thuế TNCN.';
        legalNote = 'Miễn thuế theo Điều 4 Luật Thuế TNCN.';
        break;

      case 'securities':
        appliedRate = RESIDENT_WHT_RATES.securities;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Chuyển nhượng chứng khoán: khấu trừ 0.1% trên giá trị chuyển nhượng (Điều 11 Luật Thuế TNCN).';
        break;

      case 'real_estate':
        appliedRate = RESIDENT_WHT_RATES.realEstate;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Chuyển nhượng BĐS: 2% trên giá chuyển nhượng (Điều 12 Luật Thuế TNCN).';
        break;

      case 'lottery':
        if (paymentAmount <= RESIDENT_WHT_RATES.lottery.threshold) {
          requiresWithholding = false;
          exemptReason = `Trúng thưởng ≤ ${formatCurrency(RESIDENT_WHT_RATES.lottery.threshold)} - không khấu trừ.`;
          appliedRate = 0;
        } else {
          appliedRate = RESIDENT_WHT_RATES.lottery.rate;
          const taxableAmount = paymentAmount - RESIDENT_WHT_RATES.lottery.threshold;
          withholdingAmount = Math.round(taxableAmount * appliedRate);
        }
        legalNote = 'Trúng thưởng: 10% trên phần vượt 10 triệu (Điều 15 Luật Thuế TNCN).';
        break;

      case 'inheritance':
        if (isFamilyMember) {
          requiresWithholding = false;
          exemptReason = 'Thừa kế từ thành viên gia đình được miễn thuế.';
          appliedRate = 0;
          legalNote = 'Miễn thuế theo Điều 4 Luật Thuế TNCN.';
        } else if (paymentAmount <= RESIDENT_WHT_RATES.inheritance.threshold) {
          requiresWithholding = false;
          exemptReason = `Thừa kế ≤ ${formatCurrency(RESIDENT_WHT_RATES.inheritance.threshold)} - không khấu trừ.`;
          appliedRate = 0;
          legalNote = 'Dưới ngưỡng chịu thuế (Điều 16 Luật Thuế TNCN).';
        } else {
          appliedRate = RESIDENT_WHT_RATES.inheritance.rate;
          const taxableAmount = paymentAmount - RESIDENT_WHT_RATES.inheritance.threshold;
          withholdingAmount = Math.round(taxableAmount * appliedRate);
          legalNote = 'Thừa kế từ người ngoài gia đình: 10% trên phần vượt 10 triệu (Điều 16 Luật Thuế TNCN).';
        }
        break;

      case 'royalty':
        if (paymentAmount < WHT_THRESHOLDS.perPayment) {
          requiresWithholding = false;
          exemptReason = `Thu nhập dưới ${formatCurrency(WHT_THRESHOLDS.perPayment)}/lần - không khấu trừ.`;
          appliedRate = 0;
        } else {
          appliedRate = 0.05;
          withholdingAmount = Math.round(paymentAmount * appliedRate);
        }
        legalNote = 'Bản quyền, nhượng quyền: 5% trên thu nhập (Thông tư 111/2013/TT-BTC).';
        break;
    }
  } else {
    // Cá nhân không cư trú
    switch (incomeType) {
      case 'salary_with_contract':
      case 'salary_without_contract':
        appliedRate = NON_RESIDENT_WHT_RATES.salary;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Không cư trú: 20% trên tổng thu nhập từ tiền lương (Điều 18 Luật Thuế TNCN).';
        break;

      case 'freelance':
        appliedRate = NON_RESIDENT_WHT_RATES.freelance;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Không cư trú: 20% trên thu nhập từ kinh doanh (Điều 18 Luật Thuế TNCN).';
        break;

      case 'rental':
        appliedRate = NON_RESIDENT_WHT_RATES.rental;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Không cư trú: 5% cho thuê tài sản (Điều 18 Luật Thuế TNCN).';
        break;

      case 'dividend':
        appliedRate = NON_RESIDENT_WHT_RATES.dividend;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Không cư trú: 5% cổ tức (Điều 18 Luật Thuế TNCN).';
        break;

      case 'interest_regular':
        appliedRate = NON_RESIDENT_WHT_RATES.interest;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Không cư trú: 5% lãi (Điều 18 Luật Thuế TNCN).';
        break;

      case 'interest_govbond':
        appliedRate = 0;
        withholdingAmount = 0;
        requiresWithholding = false;
        exemptReason = 'Lãi trái phiếu Chính phủ được miễn thuế.';
        legalNote = 'Miễn thuế theo Điều 4 Luật Thuế TNCN.';
        break;

      case 'securities':
        appliedRate = NON_RESIDENT_WHT_RATES.securities;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Không cư trú: 0.1% trên giá trị chứng khoán (Điều 18 Luật Thuế TNCN).';
        break;

      case 'real_estate':
        appliedRate = NON_RESIDENT_WHT_RATES.realEstate;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Không cư trú: 2% chuyển nhượng BĐS (Điều 18 Luật Thuế TNCN).';
        break;

      case 'lottery':
        appliedRate = NON_RESIDENT_WHT_RATES.lottery;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Không cư trú: 10% trúng thưởng (Điều 18 Luật Thuế TNCN).';
        break;

      case 'inheritance':
        if (isFamilyMember) {
          requiresWithholding = false;
          exemptReason = 'Thừa kế từ thành viên gia đình được miễn thuế.';
          appliedRate = 0;
          legalNote = 'Miễn thuế theo Điều 4 Luật Thuế TNCN.';
        } else {
          appliedRate = NON_RESIDENT_WHT_RATES.inheritance;
          withholdingAmount = Math.round(paymentAmount * appliedRate);
          legalNote = 'Không cư trú: 10% thừa kế (Điều 18 Luật Thuế TNCN).';
        }
        break;

      case 'royalty':
        appliedRate = NON_RESIDENT_WHT_RATES.royalty;
        withholdingAmount = Math.round(paymentAmount * appliedRate);
        legalNote = 'Không cư trú: 5% bản quyền (Điều 18 Luật Thuế TNCN).';
        break;
    }
  }

  return {
    paymentAmount,
    appliedRate,
    withholdingAmount,
    netAmount: paymentAmount - withholdingAmount,
    requiresWithholding,
    exemptReason,
    legalNote,
  };
}

/**
 * Tính thuế nhà thầu nước ngoài (FCT)
 */
export function calculateForeignContractorTax(input: ForeignContractorTaxInput): ForeignContractorTaxResult {
  const { contractValue, contractType, hasVATRegistration } = input;

  let rates;
  switch (contractType) {
    case 'service':
      rates = FOREIGN_CONTRACTOR_TAX_RATES.service;
      break;
    case 'goods_with_service':
      rates = FOREIGN_CONTRACTOR_TAX_RATES.goodsWithService;
      break;
    case 'goods_only':
      rates = FOREIGN_CONTRACTOR_TAX_RATES.goodsOnly;
      break;
    case 'equipment_rental':
      rates = FOREIGN_CONTRACTOR_TAX_RATES.equipmentRental;
      break;
    case 'property_rental':
      rates = FOREIGN_CONTRACTOR_TAX_RATES.propertyRental;
      break;
    case 'insurance':
      rates = FOREIGN_CONTRACTOR_TAX_RATES.insurance;
      break;
    default:
      rates = FOREIGN_CONTRACTOR_TAX_RATES.service;
  }

  const pitAmount = Math.round(contractValue * rates.pit);
  const vatAmount = hasVATRegistration ? 0 : Math.round(contractValue * rates.vat);
  const totalTax = pitAmount + vatAmount;

  const notes: string[] = [];
  notes.push(`Thuế suất TNCN: ${(rates.pit * 100).toFixed(0)}% trên doanh thu.`);

  if (hasVATRegistration) {
    notes.push('Nhà thầu đã đăng ký thuế GTGT tại VN - không tính FCT GTGT.');
  } else {
    notes.push(`Thuế suất GTGT: ${(rates.vat * 100).toFixed(0)}% trên doanh thu.`);
  }

  notes.push('Căn cứ: Thông tư 103/2014/TT-BTC về thuế nhà thầu nước ngoài.');

  return {
    contractValue,
    pitAmount,
    pitRate: rates.pit,
    vatAmount,
    vatRate: hasVATRegistration ? 0 : rates.vat,
    totalTax,
    totalRate: rates.pit + (hasVATRegistration ? 0 : rates.vat),
    netAmount: contractValue - totalTax,
    notes,
  };
}

/**
 * So sánh thuế khấu trừ giữa cư trú và không cư trú
 */
export function compareWHTByResidency(
  paymentAmount: number,
  incomeType: IncomeType
): WHTComparison {
  const resident = calculateWithholdingTax({
    paymentAmount,
    incomeType,
    residencyStatus: 'resident',
  });

  const nonResident = calculateWithholdingTax({
    paymentAmount,
    incomeType,
    residencyStatus: 'non_resident',
  });

  const difference = nonResident.withholdingAmount - resident.withholdingAmount;

  let recommendation = '';
  if (difference > 0) {
    recommendation = `Cá nhân cư trú tiết kiệm ${formatCurrency(difference)} thuế.`;
  } else if (difference < 0) {
    recommendation = `Cá nhân không cư trú tiết kiệm ${formatCurrency(Math.abs(difference))} thuế.`;
  } else {
    recommendation = 'Thuế khấu trừ bằng nhau cho cả hai trường hợp.';
  }

  return {
    resident,
    nonResident,
    difference,
    recommendation,
  };
}

/**
 * Tra cứu thuế suất khấu trừ
 */
export function getWHTRate(
  incomeType: IncomeType,
  residencyStatus: ResidencyStatus
): { rate: number | 'progressive' | null; description: string } {
  if (residencyStatus === 'resident') {
    switch (incomeType) {
      case 'salary_with_contract':
        return { rate: 'progressive', description: 'Theo biểu thuế lũy tiến, có giảm trừ gia cảnh' };
      case 'salary_without_contract':
        return { rate: 0.10, description: '10% nếu ≥ 2 triệu/lần' };
      case 'freelance':
        return { rate: 0.10, description: '10% nếu ≥ 2 triệu/lần' };
      case 'rental':
        return { rate: 0.05, description: '5% trên thu nhập' };
      case 'dividend':
        return { rate: 0.05, description: '5% tại nguồn' };
      case 'interest_regular':
        return { rate: 0.05, description: '5% tại nguồn' };
      case 'interest_govbond':
        return { rate: null, description: 'Miễn thuế' };
      case 'securities':
        return { rate: 0.001, description: '0.1% trên giá trị chuyển nhượng' };
      case 'real_estate':
        return { rate: 0.02, description: '2% trên giá chuyển nhượng' };
      case 'lottery':
        return { rate: 0.10, description: '10% trên phần > 10 triệu' };
      case 'inheritance':
        return { rate: 0.10, description: '10% trên phần > 10 triệu (ngoài gia đình)' };
      case 'royalty':
        return { rate: 0.05, description: '5% trên thu nhập' };
    }
  } else {
    switch (incomeType) {
      case 'salary_with_contract':
      case 'salary_without_contract':
        return { rate: 0.20, description: '20% trên tổng thu nhập' };
      case 'freelance':
        return { rate: 0.20, description: '20% trên tổng thu nhập' };
      case 'rental':
        return { rate: 0.05, description: '5% trên thu nhập' };
      case 'dividend':
        return { rate: 0.05, description: '5% tại nguồn' };
      case 'interest_regular':
        return { rate: 0.05, description: '5% tại nguồn' };
      case 'interest_govbond':
        return { rate: null, description: 'Miễn thuế' };
      case 'securities':
        return { rate: 0.001, description: '0.1% trên giá trị' };
      case 'real_estate':
        return { rate: 0.02, description: '2% trên giá chuyển nhượng' };
      case 'lottery':
        return { rate: 0.10, description: '10% toàn bộ' };
      case 'inheritance':
        return { rate: 0.10, description: '10% toàn bộ (ngoài gia đình)' };
      case 'royalty':
        return { rate: 0.05, description: '5% trên thu nhập' };
    }
  }
}

/**
 * Lấy danh sách loại thu nhập
 */
export function getIncomeTypeOptions(): Array<{ value: IncomeType; label: string }> {
  return Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => ({
    value: value as IncomeType,
    label,
  }));
}

/**
 * Format số tiền theo chuẩn VN
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format phần trăm
 */
export function formatPercent(rate: number | 'progressive' | null): string {
  if (rate === null) return 'Miễn thuế';
  if (rate === 'progressive') return 'Lũy tiến';
  return `${(rate * 100).toFixed(1)}%`;
}
