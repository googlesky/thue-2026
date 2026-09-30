import assert from 'node:assert/strict';
import { calculateBonusComparison, BonusInput, BONUS_SCENARIOS } from '@/lib/bonusCalculator';

let n = 0;
const eq = (a: number, b: number, msg: string) => { assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} vs ${b}`); n++; };
const base: BonusInput = { monthlySalary: 30e6, thirteenthMonthSalary: 30e6, tetBonus: 0, otherBonuses: 0, dependents: 0, region: 1, hasInsurance: true };
const run = (extra: Partial<BonusInput> = {}) => {
  const r = calculateBonusComparison({ ...base, ...extra });
  const get = (id: string) => r.scenarios.find(s => s.scenario.id === id)!;
  return { r, y26: get('h2-2026'), y27: get('jan-2027'), y25: get('dec-2025') };
};

// Kịch bản hiện hành: không còn 'h1-2026' (đã qua)
assert.deepEqual(BONUS_SCENARIOS.map(s => s.id), ['h2-2026', 'jan-2027', 'dec-2025']); n++;

// B1: lương 30tr + thưởng 30tr, kỳ 2026
const b1 = run();
eq(b1.y26.withholdingTax, 4_135_000, 'B1 tạm khấu trừ T12: 4,77tr − 0,635tr (BH chỉ trên lương)');
eq(b1.y26.finalTax, 3_000_000, 'B1 sau quyết toán: F(166,2tr) − F(136,2tr)');
eq(b1.y26.netBonus, 27_000_000, 'B1 thưởng thực nhận');
eq(b1.y26.effectiveTaxRate, 10, 'B1 thuế suất hiệu quả');
eq(b1.y27.finalTax, 3_000_000, 'B1 đầu 2027: cùng luật -> như nhau');
eq(b1.y27.withholdingTax, 4_135_000, 'B1 đầu 2027 tạm khấu trừ');
// Hồi cứu luật cũ: TNTT năm 190,2tr -> 220,2tr
eq(b1.y25.finalTax, 4_710_000, 'B1 T12/2025 luật cũ');
eq(b1.y25.withholdingTax, 6_585_000, 'B1 T12/2025 tạm khấu trừ (7 bậc)');
eq(b1.r.maxSavings, 1_710_000, 'B1 chênh so với luật cũ');
assert.ok(b1.r.savingsDetails.includes('T12/2025 (luật cũ)')); n++;

// B2: không đóng BH (hasInsurance=false) -> phải có tác dụng
const b2 = run({ hasInsurance: false });
eq(b2.y26.withholdingTax, 4_450_000, 'B2 tạm khấu trừ không BH');
eq(b2.y26.finalTax, 3_000_000, 'B2 sau quyết toán (vẫn bậc 10%)');
// insuranceOptions của tab chính thắng hasInsurance
eq(run({ insuranceOptions: { bhxh: false, bhyt: false, bhtn: false } }).y26.withholdingTax, 4_450_000, 'B2 insuranceOptions tắt');

// B3: thưởng 90tr: sau quyết toán 9tr (tạm khấu trừ tháng cao hơn nhiều)
const b3 = run({ thirteenthMonthSalary: 90e6 });
eq(b3.y26.finalTax, 9_000_000, 'B3 sau quyết toán');
eq(b3.y26.withholdingTax, 20_972_500 - 635_000, 'B3 tạm khấu trừ T12: TNTT 101,35tr');

// B4: lương khai báo đóng BH 10tr
const b4 = run({ declaredSalary: 10e6 });
eq(b4.y26.withholdingTax, 4_345_000, 'B4 tạm khấu trừ: TNTT 43,45tr vs 13,45tr');
eq(b4.y26.finalTax, 3_000_000, 'B4 sau quyết toán');

// B5: lương thấp 10tr + thưởng 30tr: tạm khấu trừ nhưng quyết toán 0
const b5 = run({ monthlySalary: 10e6 });
eq(b5.y26.withholdingTax, 1_845_000, 'B5 tạm khấu trừ');
eq(b5.y26.finalTax, 0, 'B5 sau quyết toán 0 (TNTT năm âm)');
eq(b5.y26.netBonus, 30e6, 'B5 nhận đủ thưởng');

// B6: hưu trí tự nguyện 10tr/tháng: engine chặn 3tr (2026), 1tr (2025)
const b6 = run({ pensionContribution: 10e6 });
eq(b6.y26.finalTax, 7_020_000 - 5_010_000, 'B6 2026: TNTT 100,2tr -> 130,2tr');
eq(b6.y25.finalTax, 22_230_000 - 17_730_000, 'B6 2025: trần 1tr');

// B7: 3 khoản thưởng cộng dồn; NPT âm -> 0; dữ liệu hỏng
eq(run({ thirteenthMonthSalary: 10e6, tetBonus: 15e6, otherBonuses: 5e6 }).y26.finalTax, 3_000_000, 'B7 tổng 3 khoản');
eq(run({ dependents: -2 }).y26.finalTax, 3_000_000, 'B7 NPT âm');
eq(run({ dependents: 1 }).y26.finalTax, 1_500_000, 'B7 1 NPT: TNTT năm 61,8tr -> 91,8tr, cả khoản thưởng ở bậc 5%');
eq(run({ tetBonus: NaN }).y26.totalBonus, 30e6, 'B7 NaN -> 0');
const zero = run({ thirteenthMonthSalary: 0 });
eq(zero.r.maxSavings, 0, 'không thưởng'); eq(zero.y26.effectiveTaxRate, 0, 'không chia 0');

console.log(`bonus golden OK: ${n} asserts`);
