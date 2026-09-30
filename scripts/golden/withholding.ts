import assert from 'node:assert/strict';
import {
  calculateWithholdingTax,
  calculateForeignContractorTax,
  compareWHTByResidency,
  getWHTRate,
  formatPercent,
  type IncomeType,
} from '@/lib/withholdingTaxCalculator';

// Chạy ngày 29/9/2026: ngưỡng vãng lai 5tr, từng lần 20tr, cho thuê 1 tỷ/năm
let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const W = (incomeType: IncomeType, paymentAmount: number, res: 'resident' | 'non_resident' = 'resident') =>
  calculateWithholdingTax({ incomeType, paymentAmount, residencyStatus: res });

// 1) Vãng lai cư trú: từ 5tr/lần khấu trừ 10%
eq(W('salary_without_contract', 5e6).withholdingAmount, 500_000, '5tr -> 500k');
let r = W('salary_without_contract', 4_999_999);
eq([r.withholdingAmount, r.requiresWithholding], [0, false], 'dưới 5tr không bắt buộc');
assert.ok(r.exemptReason?.includes('khi cá nhân yêu cầu')); n++;
assert.ok(W('salary_without_contract', 6e6).legalNote.includes('TT 89/2026')); n++;
// Thù lao dịch vụ = tiền công: cư trú 10%, không cư trú 20%
eq(W('freelance', 10e6).withholdingAmount, 1e6, 'freelance cư trú 10%');
eq(W('freelance', 10e6, 'non_resident').withholdingAmount, 2e6, 'freelance không cư trú 20%');
assert.ok(W('freelance', 10e6).legalNote.includes('Điều 8.2.c')); n++;
eq(W('salary_with_contract', 50e6, 'non_resident').withholdingAmount, 10e6, 'lương không cư trú 20%');
eq(W('salary_with_contract', 50e6).appliedRate, 'progressive', 'HĐLĐ từ 3 tháng: lũy tiến');

// 2) Cho thuê tài sản: 5% × phần doanh thu năm vượt 1 tỷ
eq(W('rental', 1.2e9).withholdingAmount, 10e6, 'cho thuê 1,2 tỷ → 10tr');
r = W('rental', 9e8);
eq([r.withholdingAmount, r.requiresWithholding], [0, false], 'cho thuê 900tr không nộp');
eq(W('rental', 1e8, 'non_resident').withholdingAmount, 5e6, 'không cư trú 5% doanh thu');

// 3) Đầu tư vốn 5%, lãi tiền gửi/TPCP miễn
eq(W('dividend', 100e6).withholdingAmount, 5e6, 'cổ tức 5%');
eq(W('interest_regular', 100e6, 'non_resident').withholdingAmount, 5e6, 'lãi cho vay 5%');
r = W('interest_govbond', 100e6);
eq([r.withholdingAmount, r.requiresWithholding], [0, false], 'lãi tiền gửi miễn');
assert.ok(r.legalNote.includes('Điều 4.6')); n++;

// 4) Chứng khoán 0,1%
eq(W('securities', 1e9).withholdingAmount, 1e6, 'CK 0,1%');

// 5) BĐS: không khấu trừ tại nguồn, người bán tự khai 2%
r = W('real_estate', 3e9);
eq([r.withholdingAmount, r.requiresWithholding, r.netAmount], [0, false, 3e9], 'BĐS tự khai');
assert.ok(r.exemptReason?.includes('60.000.000')); n++;

// 6) Trúng thưởng: 10% phần vượt 20tr (cả không cư trú — Điều 26)
eq(W('lottery', 100e6).withholdingAmount, 8e6, 'trúng thưởng cư trú 8tr');
eq(W('lottery', 100e6, 'non_resident').withholdingAmount, 8e6, 'trúng thưởng không cư trú 8tr (không phải 10tr)');
eq(W('lottery', 20e6).withholdingAmount, 0, 'trúng thưởng 20tr = ngưỡng');

// 7) Bản quyền/nhượng quyền: 5% phần vượt 20tr/hợp đồng (cả không cư trú — Điều 25)
eq(W('royalty', 50e6).withholdingAmount, 1_500_000, 'bản quyền cư trú');
eq(W('royalty', 50e6, 'non_resident').withholdingAmount, 1_500_000, 'bản quyền không cư trú');
eq(W('royalty', 20e6).requiresWithholding, false, 'bản quyền 20tr');
eq(compareWHTByResidency(50e6, 'royalty').difference, 0, 'so sánh bản quyền');

// 8) Thừa kế, quà tặng: không khấu trừ, người nhận tự khai
r = W('inheritance', 500e6);
eq([r.withholdingAmount, r.requiresWithholding], [0, false], 'thừa kế không khấu trừ');
assert.ok(r.exemptReason?.includes('Điều 67.4.d')); n++;
eq(W('inheritance', 500e6, 'non_resident').withholdingAmount, 0, 'thừa kế không cư trú');

// 9) Nhà thầu: hàng hóa kèm dịch vụ TNCN 2%
let f = calculateForeignContractorTax({ contractValue: 1e9, contractType: 'goods_with_service', hasVATRegistration: false });
eq([f.pitAmount, f.vatAmount, f.totalTax, f.totalRate], [20e6, 30e6, 50e6, 0.05], 'FCT hang kem DV');
f = calculateForeignContractorTax({ contractValue: 1e9, contractType: 'goods_with_service', hasVATRegistration: true });
eq([f.pitAmount, f.vatAmount], [20e6, 0], 'FCT da dang ky GTGT');
eq(calculateForeignContractorTax({ contractValue: 1e9, contractType: 'goods_only', hasVATRegistration: true }).pitAmount, 10e6, 'hang hoa 1%');
eq(calculateForeignContractorTax({ contractValue: 1e9, contractType: 'service', hasVATRegistration: true }).pitAmount, 50e6, 'dich vu 5%');

eq(calculateForeignContractorTax({ contractValue: 1e9, contractType: 'other_business', hasVATRegistration: true }).pitAmount, 20e6, 'kinh doanh khác 2%');
eq(calculateForeignContractorTax({ contractValue: 1e9, contractType: 'digital_content', hasVATRegistration: true }).pitAmount, 50e6, 'nội dung số 5%');

// 10) Định dạng + mô tả
eq([formatPercent(0.001), formatPercent(0.1), formatPercent(0.05), formatPercent(null)], ['0,1%', '10%', '5%', 'Miễn thuế'], 'formatPercent VN');
assert.ok(getWHTRate('lottery', 'non_resident').description.includes('20.000.000')); n++;
assert.ok(getWHTRate('salary_without_contract', 'resident').description.includes('5.000.000')); n++;
assert.ok(!getWHTRate('inheritance', 'non_resident').description.includes('toàn bộ')); n++;

console.log(`WITHHOLDING OK: ${n} assertions`);
