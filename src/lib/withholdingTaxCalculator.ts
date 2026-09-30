/**
 * Withholding Tax Calculator - Thuế TNCN khấu trừ tại nguồn
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 109/2025/QH15: Điều 4.6 (miễn lãi tiền gửi, trái phiếu Chính phủ), Điều 7 (kinh doanh,
 *   cho thuê tài sản), 12 (đầu tư vốn), 13 (chuyển nhượng vốn, chứng khoán), 14 (BĐS), 15 (trúng thưởng),
 *   16 (bản quyền), 17 (nhượng quyền), 18 (thừa kế, quà tặng), 20–27 (cá nhân không cư trú)
 * - NĐ 253/2026/NĐ-CP: Điều 8.2.c (thù lao dịch vụ của cá nhân không đăng ký kinh doanh là tiền công),
 *   Điều 50 (khấu trừ thuế), Điều 67 (khấu trừ, khai thay; khoản 4: thu nhập không khấu trừ)
 * - NĐ 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP): cho thuê tài sản, mức doanh thu 1 tỷ/năm
 * - TT 89/2026/TT-BTC: hồ sơ khai thuế, mẫu cam kết
 */

import {
  CASUAL_WITHHOLDING_RATE,
  getCasualWithholdingThreshold,
  getPerTransactionThreshold,
  getRentalIncomeThreshold,
} from './taxCalculator';

// ===== CONSTANTS =====

/** Thuế suất cá nhân cư trú (các ngưỡng theo ngày lấy từ taxCalculator) */
const RESIDENT_RATES = {
  casual: CASUAL_WITHHOLDING_RATE, // 10% tiền lương, tiền công không HĐLĐ / HĐLĐ < 3 tháng
  rental: 0.05, // 5% phần doanh thu cho thuê cả năm vượt ngưỡng
  investment: 0.05, // cổ tức, lãi cho vay, lãi trái phiếu doanh nghiệp
  securities: 0.001, // 0,1% giá chuyển nhượng
  realEstate: 0.02, // 2% giá chuyển nhượng
  lottery: 0.10, // 10% phần vượt ngưỡng mỗi lần
  royalty: 0.05, // 5% phần vượt ngưỡng mỗi hợp đồng
};

/** Thuế suất cá nhân không cư trú (Luật 109/2025/QH15 Điều 20–27) */
const NON_RESIDENT_RATES = {
  salary: 0.20, // Điều 21: 20% toàn bộ tiền lương, tiền công
  rental: 0.05, // Điều 20.3: doanh thu cho thuê (nhóm dịch vụ)
  investment: 0.05, // Điều 22
  securities: 0.001, // Điều 23.2
  realEstate: 0.02, // Điều 24
  lottery: 0.10, // Điều 26: phần vượt ngưỡng mỗi lần
  royalty: 0.05, // Điều 25: phần vượt ngưỡng mỗi hợp đồng
};

/**
 * Nhà thầu nước ngoài là cá nhân: TNCN theo tỷ lệ trên doanh thu (Luật 109/2025/QH15 Điều 20.3:
 * hàng hóa 1%, dịch vụ 5%, dịch vụ gắn với hàng hóa 2%); GTGT theo quy định hiện hành về thuế nhà thầu.
 */
export const FOREIGN_CONTRACTOR_TAX_RATES: Record<ForeignContractorType, { pit: number; vat: number }> = {
  service: { pit: 0.05, vat: 0.05 },
  goods_with_service: { pit: 0.02, vat: 0.03 },
  goods_only: { pit: 0.01, vat: 0.02 },
  equipment_rental: { pit: 0.05, vat: 0.05 },
  property_rental: { pit: 0.05, vat: 0.05 },
  insurance: { pit: 0.05, vat: 0.05 },
  digital_content: { pit: 0.05, vat: 0.05 },
  other_business: { pit: 0.02, vat: 0.02 },
};

/**
 * Loại thu nhập để khấu trừ (giá trị được lưu trong snapshot — không đổi tên)
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
  salary_without_contract: 'Lương, tiền công (không HĐLĐ hoặc HĐLĐ < 3 tháng)',
  freelance: 'Thù lao dịch vụ (cá nhân không đăng ký kinh doanh)',
  rental: 'Cho thuê tài sản (doanh thu cả năm)',
  dividend: 'Cổ tức',
  interest_regular: 'Lãi cho vay / trái phiếu doanh nghiệp',
  interest_govbond: 'Lãi tiền gửi TCTD / trái phiếu Chính phủ (miễn)',
  securities: 'Chuyển nhượng chứng khoán',
  real_estate: 'Chuyển nhượng bất động sản',
  lottery: 'Trúng thưởng',
  inheritance: 'Thừa kế / quà tặng (người nhận tự khai)',
  royalty: 'Bản quyền / nhượng quyền thương mại',
};

export type ResidencyStatus = 'resident' | 'non_resident';

export type ForeignContractorType =
  | 'service'
  | 'goods_with_service'
  | 'goods_only'
  | 'equipment_rental'
  | 'property_rental'
  | 'insurance'
  | 'digital_content'
  | 'other_business';

// ===== TYPES =====

export interface WHTInput {
  /** Số tiền chi trả (với cho thuê tài sản: doanh thu cho thuê cả năm) */
  paymentAmount: number;
  incomeType: IncomeType;
  residencyStatus: ResidencyStatus;
}

export interface WHTResult {
  paymentAmount: number;
  appliedRate: number | 'progressive';
  withholdingAmount: number;
  netAmount: number;
  requiresWithholding: boolean;
  exemptReason?: string;
  legalNote: string;
}

export interface ForeignContractorTaxInput {
  contractValue: number;
  contractType: ForeignContractorType;
  hasVATRegistration: boolean;
}

export interface ForeignContractorTaxResult {
  contractValue: number;
  pitAmount: number;
  pitRate: number;
  vatAmount: number;
  vatRate: number;
  totalTax: number;
  totalRate: number;
  netAmount: number;
  notes: string[];
}

export interface WHTComparison {
  resident: WHTResult;
  nonResident: WHTResult;
  difference: number;
  recommendation: string;
}

// ===== FUNCTIONS =====

const COMMITMENT_NOTE =
  'Nếu ước tính tổng thu nhập sau giảm trừ gia cảnh chưa đến mức nộp thuế, cá nhân làm cam kết (mẫu theo TT 89/2026/TT-BTC) để tạm chưa khấu trừ.';

/**
 * Tính thuế khấu trừ tại nguồn cho một lần chi trả (theo quy định tại ngày hiện tại)
 */
export function calculateWithholdingTax(input: WHTInput): WHTResult {
  const { paymentAmount, incomeType, residencyStatus } = input;
  const resident = residencyStatus === 'resident';
  const perTx = getPerTransactionThreshold(); // 20tr từ 01/7/2026
  const casual = getCasualWithholdingThreshold(); // 5tr từ 01/7/2026
  const rentalThreshold = getRentalIncomeThreshold(); // 1 tỷ/năm từ kỳ tính thuế 2026
  const rates = resident ? RESIDENT_RATES : NON_RESIDENT_RATES;

  let appliedRate: number | 'progressive' = 0;
  let taxBase = 0;
  let requiresWithholding = true;
  let exemptReason: string | undefined;
  let legalNote = '';

  // Thuế suất × phần vượt ngưỡng; không vượt → không phát sinh thuế
  const overThreshold = (rate: number, threshold: number, belowReason: string) => {
    taxBase = Math.max(0, paymentAmount - threshold);
    if (taxBase === 0) {
      requiresWithholding = false;
      exemptReason = belowReason;
    } else {
      appliedRate = rate;
    }
  };
  const flat = (rate: number) => {
    appliedRate = rate;
    taxBase = paymentAmount;
  };

  switch (incomeType) {
    case 'salary_with_contract':
    case 'salary_without_contract':
    case 'freelance':
      if (!resident) {
        flat(NON_RESIDENT_RATES.salary);
        legalNote =
          incomeType === 'freelance'
            ? 'Thù lao dịch vụ của cá nhân không đăng ký kinh doanh là tiền công (NĐ 253/2026/NĐ-CP Điều 8.2.c): cá nhân không cư trú chịu 20% trên toàn bộ thu nhập (Luật 109/2025/QH15 Điều 21). Cá nhân có đăng ký kinh doanh: xem chế độ Nhà thầu nước ngoài.'
            : 'Cá nhân không cư trú: 20% trên tổng tiền lương, tiền công nhận được do làm việc tại Việt Nam, không phân biệt nơi trả (Luật 109/2025/QH15 Điều 21).';
      } else if (incomeType === 'salary_with_contract') {
        appliedRate = 'progressive';
        legalNote =
          'HĐLĐ từ 3 tháng trở lên: khấu trừ theo biểu thuế lũy tiến từng phần sau giảm trừ gia cảnh (NĐ 253/2026/NĐ-CP Điều 50.1). Dùng tab Tính thuế để tính số khấu trừ hàng tháng.';
      } else {
        if (paymentAmount < casual) {
          requiresWithholding = false;
          exemptReason = `Chi trả dưới ${formatCurrency(casual)}/lần: không bắt buộc khấu trừ (chỉ khấu trừ 10% khi cá nhân yêu cầu).`;
        } else {
          flat(RESIDENT_RATES.casual);
        }
        legalNote = `${
          incomeType === 'freelance'
            ? 'Thù lao dịch vụ của cá nhân không đăng ký kinh doanh là tiền công (NĐ 253/2026/NĐ-CP Điều 8.2.c). '
            : ''
        }Cá nhân cư trú không ký HĐLĐ hoặc HĐLĐ dưới 3 tháng: khấu trừ 10% nếu chi trả từ ${formatCurrency(casual)}/lần (NĐ 253/2026/NĐ-CP Điều 50.2). ${COMMITMENT_NOTE}`;
      }
      break;

    case 'rental':
      if (resident) {
        overThreshold(
          RESIDENT_RATES.rental,
          rentalThreshold,
          `Doanh thu cho thuê cả năm không quá ${formatCurrency(rentalThreshold)}: không phải nộp thuế TNCN.`
        );
        legalNote = `Cho thuê tài sản: thuế TNCN = 5% × phần doanh thu cả năm vượt ${formatCurrency(rentalThreshold)} (Luật 109/2025/QH15 Điều 7; NĐ 68/2026/NĐ-CP, sửa đổi bởi NĐ 141/2026/NĐ-CP). Mức trừ áp dụng một lần/năm cho tất cả hợp đồng; tổ chức thuê khai thay, nộp thay nếu hợp đồng có thỏa thuận.`;
      } else {
        flat(NON_RESIDENT_RATES.rental);
        legalNote = 'Cá nhân không cư trú: 5% trên doanh thu cho thuê (nhóm dịch vụ, Luật 109/2025/QH15 Điều 20.3), không áp dụng mức doanh thu không chịu thuế.';
      }
      break;

    case 'dividend':
      flat(rates.investment);
      legalNote = `Cổ tức: khấu trừ 5% (Luật 109/2025/QH15 ${resident ? 'Điều 12' : 'Điều 22'}).`;
      break;

    case 'interest_regular':
      flat(rates.investment);
      legalNote = `Lãi cho vay, lãi trái phiếu doanh nghiệp: khấu trừ 5% (Luật 109/2025/QH15 ${resident ? 'Điều 12' : 'Điều 22'}). Lãi tiền gửi tại tổ chức tín dụng, lãi trái phiếu Chính phủ được miễn (Điều 4.6).`;
      break;

    case 'interest_govbond':
      requiresWithholding = false;
      exemptReason = 'Lãi tiền gửi tại tổ chức tín dụng, lãi trái phiếu Chính phủ được miễn thuế TNCN.';
      legalNote =
        'Miễn thuế: lãi trái phiếu Chính phủ, trái phiếu chính quyền địa phương, lãi tiền gửi tại tổ chức tín dụng, lãi từ hợp đồng bảo hiểm nhân thọ (Luật 109/2025/QH15 Điều 4.6).';
      break;

    case 'securities':
      flat(rates.securities);
      legalNote = `Chuyển nhượng chứng khoán: 0,1% giá chuyển nhượng từng lần, công ty chứng khoán khấu trừ (Luật 109/2025/QH15 ${resident ? 'Điều 13.2' : 'Điều 23.2'}).`;
      break;

    case 'real_estate': {
      // Không khấu trừ tại nguồn (NĐ 253 Điều 67.4.c): người chuyển nhượng tự khai, nộp
      const tax = Math.round(paymentAmount * rates.realEstate);
      requiresWithholding = false;
      exemptReason = `Chuyển nhượng bất động sản không thuộc diện khấu trừ tại nguồn: người chuyển nhượng tự khai, nộp thuế 2% = ${formatCurrency(tax)} (hoặc bên mua nộp thay nếu hợp đồng thỏa thuận).`;
      legalNote = `Chuyển nhượng BĐS: 2% × giá chuyển nhượng (Luật 109/2025/QH15 ${resident ? 'Điều 14' : 'Điều 24'}); không khấu trừ tại nguồn (NĐ 253/2026/NĐ-CP Điều 67.4.c). Xem tab Chuyển nhượng BĐS.`;
      break;
    }

    case 'lottery':
      overThreshold(
        rates.lottery,
        perTx,
        `Giải thưởng không vượt ${formatCurrency(perTx)}/lần: không phải nộp thuế.`
      );
      legalNote = `Trúng thưởng: 10% × phần giá trị giải thưởng vượt ${formatCurrency(perTx)} mỗi lần (Luật 109/2025/QH15 ${resident ? 'Điều 15' : 'Điều 26'}).`;
      break;

    case 'inheritance':
      requiresWithholding = false;
      exemptReason =
        'Thừa kế, quà tặng không thuộc diện khấu trừ tại nguồn: người nhận tự khai, nộp thuế (NĐ 253/2026/NĐ-CP Điều 67.4.d).';
      legalNote = `Chỉ chứng khoán, phần vốn góp, bất động sản và tài sản phải đăng ký mới chịu thuế: 10% × phần giá trị vượt ${formatCurrency(perTx)} mỗi lần nhận (Luật 109/2025/QH15 ${resident ? 'Điều 18' : 'Điều 26'}); tiền mặt, tiền gửi không chịu thuế.`;
      break;

    case 'royalty':
      overThreshold(
        rates.royalty,
        perTx,
        `Thu nhập không vượt ${formatCurrency(perTx)}/hợp đồng: không phải nộp thuế.`
      );
      legalNote = `Bản quyền, nhượng quyền thương mại: 5% × phần thu nhập vượt ${formatCurrency(perTx)} theo từng hợp đồng (Luật 109/2025/QH15 ${resident ? 'Điều 16, 17' : 'Điều 25'}).`;
      break;
  }

  const withholdingAmount = typeof appliedRate === 'number' ? Math.round(taxBase * appliedRate) : 0;

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
 * Tính thuế nhà thầu nước ngoài là cá nhân (phần TNCN + GTGT tham khảo)
 */
export function calculateForeignContractorTax(input: ForeignContractorTaxInput): ForeignContractorTaxResult {
  const { contractValue, contractType, hasVATRegistration } = input;
  const rates = FOREIGN_CONTRACTOR_TAX_RATES[contractType] ?? FOREIGN_CONTRACTOR_TAX_RATES.service;
  const vatRate = hasVATRegistration ? 0 : rates.vat;

  const pitAmount = Math.round(contractValue * rates.pit);
  const vatAmount = Math.round(contractValue * vatRate);
  const totalTax = pitAmount + vatAmount;

  const notes: string[] = [
    `Thuế suất TNCN: ${formatPercent(rates.pit)} trên doanh thu (Luật 109/2025/QH15 Điều 20.3: hàng hóa 1%; dịch vụ, nội dung số 5%; sản xuất, vận tải, dịch vụ gắn với hàng hóa 2%; khác 2%).`,
    hasVATRegistration
      ? 'Nhà thầu đã đăng ký nộp thuế GTGT tại Việt Nam: không tính GTGT theo tỷ lệ trên doanh thu.'
      : `Thuế suất GTGT: ${formatPercent(rates.vat)} trên doanh thu.`,
    'Tỷ lệ GTGT tham khảo theo quy định hiện hành về thuế nhà thầu.',
  ];

  return {
    contractValue,
    pitAmount,
    pitRate: rates.pit,
    vatAmount,
    vatRate,
    totalTax,
    totalRate: rates.pit + vatRate,
    netAmount: contractValue - totalTax,
    notes,
  };
}

/**
 * So sánh thuế khấu trừ giữa cư trú và không cư trú
 */
export function compareWHTByResidency(paymentAmount: number, incomeType: IncomeType): WHTComparison {
  const resident = calculateWithholdingTax({ paymentAmount, incomeType, residencyStatus: 'resident' });
  const nonResident = calculateWithholdingTax({ paymentAmount, incomeType, residencyStatus: 'non_resident' });
  const difference = nonResident.withholdingAmount - resident.withholdingAmount;

  let recommendation = '';
  if (difference > 0) {
    recommendation = `Cá nhân cư trú bị khấu trừ ít hơn ${formatCurrency(difference)}.`;
  } else if (difference < 0) {
    recommendation = `Cá nhân không cư trú bị khấu trừ ít hơn ${formatCurrency(Math.abs(difference))}.`;
  } else {
    recommendation = 'Thuế khấu trừ bằng nhau cho cả hai trường hợp.';
  }

  return { resident, nonResident, difference, recommendation };
}

/**
 * Tra cứu thuế suất khấu trừ (mô tả theo ngưỡng hiện hành)
 */
export function getWHTRate(
  incomeType: IncomeType,
  residencyStatus: ResidencyStatus
): { rate: number | 'progressive' | null; description: string } {
  const perTx = formatCurrency(getPerTransactionThreshold());
  const resident = residencyStatus === 'resident';

  switch (incomeType) {
    case 'salary_with_contract':
      return resident
        ? { rate: 'progressive', description: 'Theo biểu thuế lũy tiến 5 bậc, sau giảm trừ gia cảnh' }
        : { rate: 0.20, description: '20% trên tổng thu nhập' };
    case 'salary_without_contract':
    case 'freelance':
      return resident
        ? { rate: CASUAL_WITHHOLDING_RATE, description: `10% nếu chi trả từ ${formatCurrency(getCasualWithholdingThreshold())}/lần` }
        : { rate: 0.20, description: '20% trên tổng thu nhập (tiền công)' };
    case 'rental':
      return resident
        ? { rate: 0.05, description: `5% phần doanh thu cả năm vượt ${formatCurrency(getRentalIncomeThreshold())}` }
        : { rate: 0.05, description: '5% trên doanh thu cho thuê' };
    case 'dividend':
      return { rate: 0.05, description: '5% trên cổ tức' };
    case 'interest_regular':
      return { rate: 0.05, description: '5% trên tiền lãi cho vay, lãi trái phiếu doanh nghiệp' };
    case 'interest_govbond':
      return { rate: null, description: 'Miễn thuế (Luật 109/2025/QH15 Điều 4.6)' };
    case 'securities':
      return { rate: 0.001, description: '0,1% giá chuyển nhượng từng lần' };
    case 'real_estate':
      return { rate: 0.02, description: '2% giá chuyển nhượng — người bán tự khai, không khấu trừ tại nguồn' };
    case 'lottery':
      return { rate: 0.10, description: `10% phần vượt ${perTx}/lần` };
    case 'inheritance':
      return { rate: 0.10, description: `10% phần vượt ${perTx}/lần — người nhận tự khai, không khấu trừ tại nguồn` };
    case 'royalty':
      return { rate: 0.05, description: `5% phần vượt ${perTx}/hợp đồng` };
  }
}

export function getIncomeTypeOptions(): Array<{ value: IncomeType; label: string }> {
  return Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => ({
    value: value as IncomeType,
    label,
  }));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Định dạng phần trăm kiểu Việt Nam: 0.001 → "0,1%", 0.1 → "10%" */
export function formatPercent(rate: number | 'progressive' | null): string {
  if (rate === null) return 'Miễn thuế';
  if (rate === 'progressive') return 'Lũy tiến';
  return `${(rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}
