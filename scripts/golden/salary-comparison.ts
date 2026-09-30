import assert from 'node:assert/strict';
import { calculateCompanyOffer, createDefaultCompanyOffer, compareCompanyOffers } from '@/lib/salaryComparisonCalculator';
import { calculateNewTax } from '@/lib/taxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
// Chạy ngày 29/09/2026: trần BHXH 50,6tr, vùng I
const offer = (gross: number, bonusMonths: number, over = {}) =>
  calculateCompanyOffer({ ...createDefaultCompanyOffer('a', 'A'), grossSalary: gross, bonusMonths, ...over }, 0, true);

// Quyết toán năm: TN bình quân tháng = lương + thưởng/12; BH 3,15tr (30tr); giảm trừ 15,5tr
// 1 tháng: 30 + 2,5 − 3,15 − 15,5 = 13,85 → 500k + 385k = 885k × 12
eq(offer(30e6, 1).annualTax, 10_620_000, 'C14 30tr + 1 tháng thưởng');
// C11 thưởng lẻ: 0,5 → 30 + 1,25 − 18,65 = 12,6 → 760k × 12; 1,5 → 15,1 → 1,01tr × 12
eq(offer(30e6, 0.5).annualTax, 9_120_000, 'C11 0,5 tháng');
eq(offer(30e6, 1.5).annualTax, 12_120_000, 'C11 1,5 tháng');
eq(offer(30e6, 3).annualTax, 16_620_000, 'C14 3 tháng');
// 60tr + 2 tháng: BH 50,6×9,5% + 0,6 = 5,407tr; 60 + 10 − 5,407 − 15,5 = 49,093 → 2,5tr + 3,8186tr → ×12
eq(offer(60e6, 2).annualTax, 75_823_200, 'C14 60tr + 2 tháng');
// Không thưởng = thuế tháng × 12
eq(offer(30e6, 0).annualTax, Math.round(calculateNewTax({ grossIncome: 30e6, dependents: 0 }).taxAmount * 12), 'không thưởng');
// NET năm = tổng gross − BH − thuế: 30tr + 1: 390 − 37,8 − 10,62 = 341,58tr
const r = offer(30e6, 1);
eq([r.annualTotalGross, r.annualInsurance, r.annualNet], [390e6, 37_800_000, 341_580_000], 'NET năm');
// Lương khai báo BH thấp hơn: BH trên 10tr (1,05tr), thưởng không vào BH
// 30 + 2,5 − 1,05 − 15,5 = 15,95 → 500k + 595k = 1,095tr × 12
eq(offer(30e6, 1, { declaredSalary: 10e6 }).annualTax, 13_140_000, 'lương đóng BH riêng');

// So sánh: offer lương cao hơn nhưng thưởng ít vẫn xếp đúng theo NET năm
const cmp = compareCompanyOffers([
  { ...createDefaultCompanyOffer('a', 'A'), grossSalary: 30e6, bonusMonths: 0.5 },
  { ...createDefaultCompanyOffer('b', 'B'), grossSalary: 30e6, bonusMonths: 1 },
], 0, true);
eq(cmp.bestOffer.byAnnualNet, 1, 'B thưởng nhiều hơn NET năm cao hơn');
eq(cmp.companies[1].annualNet - cmp.companies[0].annualNet, 15e6 - (10_620_000 - 9_120_000), 'chênh NET = thưởng thêm − thuế thêm');

console.log(`salarycmp: ${n} assert OK`);
