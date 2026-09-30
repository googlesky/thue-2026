/**
 * Thuế TNCN đối với cổ phiếu ESOP / cổ phiếu thưởng của người lao động
 *
 * Căn cứ: NĐ 253/2026/NĐ-CP Điều 50 khoản 3 điểm a (hiệu lực 01/7/2026), Điều 54;
 * Luật Thuế TNCN số 109/2025/QH15 Điều 9 (biểu lũy tiến), Điều 13 khoản 2 (0,1%).
 * - Khi NHẬN cổ phiếu ESOP / cổ phiếu thưởng: chưa tính vào thu nhập tiền lương, tiền công.
 * - Khi CHUYỂN NHƯỢNG:
 *   (1) Thu nhập tiền lương = số tiền chi cho người lao động ghi trên sổ kế toán của công ty; nếu không
 *       xác định được: ESOP = số lượng × mệnh giá − số tiền đã bỏ ra mua (âm -> không nộp);
 *       cổ phiếu thưởng = số lượng × mệnh giá (giá chuyển nhượng thấp hơn mệnh giá -> theo giá thị trường
 *       tại thời điểm chuyển nhượng). Công ty chứng khoán/ngân hàng lưu ký khấu trừ 10%; cá nhân cộng vào
 *       thu nhập tiền lương để quyết toán năm theo biểu lũy tiến.
 *   (2) Thuế chuyển nhượng chứng khoán 0,1% × giá bán (kể cả khi lỗ).
 */

import { calculateNewTax, type TaxInputWithDate } from './taxCalculator';

export type ESOPShareType = 'esop' | 'bonus';

export const ESOP_WITHHOLDING_RATE = 0.10; // CTCK/ngân hàng lưu ký khấu trừ
export const SECURITIES_TRANSFER_RATE = 0.001; // 0,1% giá chuyển nhượng
export const DEFAULT_PAR_VALUE = 10_000; // Mệnh giá cổ phiếu phổ biến

export interface ESOPInput {
  shareType: ESOPShareType;
  numberOfShares: number; // Số cổ phiếu chuyển nhượng
  purchasePrice: number; // Giá người lao động đã trả/cổ phiếu (ESOP; cổ phiếu thưởng bỏ qua)
  parValue: number; // Mệnh giá/cổ phiếu (0 -> mặc định 10.000)
  bookAmount: number; // Số tiền ghi sổ kế toán cho số cổ phiếu này (0 = không xác định)
  sellPrice: number; // Giá bán/cổ phiếu
  salary: TaxInputWithDate; // Tiền lương tháng - để ước tính thuế quyết toán năm
}

// Cách xác định thu nhập tiền lương từ ESOP
export type ESOPIncomeBasis = 'book' | 'par' | 'market';

export interface ESOPResult {
  saleValue: number; // Giá trị bán
  purchaseCost: number; // Số tiền người lao động đã bỏ ra
  salaryIncome: number; // Thu nhập chịu thuế từ tiền lương, tiền công
  incomeBasis: ESOPIncomeBasis;
  withheldTax: number; // CTCK khấu trừ 10%
  transferTax: number; // Thuế chuyển nhượng chứng khoán 0,1%
  annualTaxWithout: number; // Thuế TNCN năm từ tiền lương (không có ESOP)
  annualTaxWith: number; // Thuế TNCN năm từ tiền lương (có ESOP)
  settlementTax: number; // Thuế lũy tiến tăng thêm do ESOP khi quyết toán năm
  settlementBalance: number; // settlementTax − withheldTax: > 0 nộp thêm, < 0 được hoàn/bù trừ
  totalTax: number; // settlementTax + transferTax
  netProfit: number; // saleValue − purchaseCost − totalTax
}

const pos = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

export function calculateESOPTax(input: ESOPInput): ESOPResult {
  const qty = Math.floor(pos(input.numberOfShares));
  const par = pos(input.parValue) || DEFAULT_PAR_VALUE;
  const sellPrice = pos(input.sellPrice);
  const isBonus = input.shareType === 'bonus';

  const saleValue = qty * sellPrice;
  const purchaseCost = isBonus ? 0 : qty * pos(input.purchasePrice);

  let salaryIncome: number;
  let incomeBasis: ESOPIncomeBasis;
  if (pos(input.bookAmount) > 0) {
    salaryIncome = pos(input.bookAmount);
    incomeBasis = 'book';
  } else if (isBonus && sellPrice < par) {
    salaryIncome = saleValue;
    incomeBasis = 'market';
  } else {
    salaryIncome = Math.max(0, qty * par - purchaseCost);
    incomeBasis = 'par';
  }

  const withheldTax = Math.round(salaryIncome * ESOP_WITHHOLDING_RATE);
  const transferTax = Math.round(saleValue * SECURITIES_TRANSFER_RATE);

  // Quyết toán năm: biểu năm = biểu tháng × 12 nên thuế năm = 12 × thuế tháng bình quân
  // (giả định lương đều các tháng). Bảo hiểm giữ theo lương - ESOP không đóng bảo hiểm.
  const insuranceBase = input.salary.declaredSalary ?? input.salary.grossIncome;
  const annualTax = (extraIncome: number) => Math.round(12 * calculateNewTax({
    ...input.salary,
    grossIncome: input.salary.grossIncome + extraIncome / 12,
    declaredSalary: insuranceBase,
  }).taxAmount);
  const annualTaxWithout = annualTax(0);
  const annualTaxWith = annualTax(salaryIncome);
  const settlementTax = annualTaxWith - annualTaxWithout;
  const totalTax = settlementTax + transferTax;

  return {
    saleValue,
    purchaseCost,
    salaryIncome,
    incomeBasis,
    withheldTax,
    transferTax,
    annualTaxWithout,
    annualTaxWith,
    settlementTax,
    settlementBalance: settlementTax - withheldTax,
    totalTax,
    netProfit: saleValue - purchaseCost - totalTax,
  };
}
