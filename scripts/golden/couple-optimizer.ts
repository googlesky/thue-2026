import assert from 'node:assert/strict';
import { optimizeCoupleTax, PersonIncome, MAX_COUPLE_DEPENDENTS } from '@/lib/coupleTaxOptimizer';

// Hôm nay (29/09/2026): trần BHXH/BHYT 50,6tr, BHTN vùng I 106,2tr, trần hưu trí 3tr/tháng
let n = 0;
const eq = (a: number, b: number, msg: string) => { assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} vs ${b}`); n++; };
const P = (name: string, grossIncome: number, extra: Partial<PersonIncome> = {}): PersonIncome =>
  ({ name, grossIncome, hasInsurance: true, pensionContribution: 0, otherDeductions: 0, ...extra });

// C1: hưu trí 10tr/tháng chỉ được trừ 3tr (NĐ 253/2026 Điều 46.2.a)
const c1 = optimizeCoupleTax({ person1: P('A', 60e6, { pensionContribution: 10e6 }), person2: P('B', 0), totalDependents: 0 });
eq(c1.optimalScenario.person1Tax, 3_718_600, 'C1 TNTT 60 − 5,407 − 15,5 − 3 = 36,093tr');
assert.ok(!c1.tips.some(t => t.id === 'tip-voluntary-pension' && t.description.includes('A (')), 'C1 đã đóng đủ trần -> không gợi ý cho A'); n++;

// C2: NPT âm / quá lớn / NaN không làm sập, không treo
assert.doesNotThrow(() => optimizeCoupleTax({ person1: P('A', 30e6), person2: P('B', 20e6), totalDependents: -1 })); n++;
assert.equal(optimizeCoupleTax({ person1: P('A', 30e6), person2: P('B', 20e6), totalDependents: -1 }).allScenarios.length, 1); n++;
assert.equal(optimizeCoupleTax({ person1: P('A', 30e6), person2: P('B', 20e6), totalDependents: 999_999_999 }).allScenarios.length, MAX_COUPLE_DEPENDENTS + 1); n++;
assert.equal(optimizeCoupleTax({ person1: P('A', 30e6), person2: P('B', 20e6), totalDependents: NaN }).allScenarios.length, 1); n++;
assert.equal(MAX_COUPLE_DEPENDENTS, 10); n++;

// C3: A 60tr / B 20tr / 2 NPT (số tay: A 0/1/2 NPT = 4,3186/3,0786/2,1693tr; B 0 NPT = 0,12tr)
const c3 = optimizeCoupleTax({ person1: P('A', 60e6), person2: P('B', 20e6), totalDependents: 2 });
assert.equal(c3.optimalScenario.id, 'scenario-2-0'); n++;
eq(c3.optimalScenario.totalTax, 2_169_300 + 120_000, 'C3 tối ưu 2/0');
eq(c3.currentScenario.totalTax, 3_078_600, 'C3 chia đều 1/1');
eq(c3.tips.find(t => t.id === 'tip-dependent-allocation')!.potentialSavings, 789_300, 'C3 tiết kiệm khớp bảng');
const hi = c3.tips.find(t => t.id === 'tip-higher-earner')!;
assert.ok(hi.description.includes('1.240.000') && hi.description.includes('120.000'), hi.description); n++;
eq(hi.potentialSavings, 0, 'C3 tip NPT không cộng trùng tiết kiệm');
const pen = c3.tips.find(t => t.id === 'tip-voluntary-pension')!;
eq(pen.potentialSavings, 300_000, 'C3 hưu trí 3tr cho A (bậc 10%)');
assert.ok(pen.description.includes('3.000.000'), pen.description); n++;
eq(c3.combinedNetIncome, (60e6 - 5_407_000 - 2_169_300) + (20e6 - 2_100_000 - 120_000), 'C3 thực nhận trừ BH');

// C4: không còn tip sai "thưởng Tết tính thuế riêng"
assert.ok(c3.tips.every(t => !/riêng biệt|tính thuế riêng/.test(t.description))); n++;
assert.ok(c3.tips.find(t => t.id === 'tip-timing')!.description.includes('quyết toán năm')); n++;

// C5: giảm trừ khác (từ thiện) từng người đi vào thuế; có từ thiện thì không gợi ý từ thiện
const c5 = optimizeCoupleTax({ person1: P('A', 60e6, { otherDeductions: 5e6 }), person2: P('B', 20e6), totalDependents: 0 });
eq(c5.optimalScenario.person1Tax, 4_318_600 - 5e6 * 0.2, 'C5 từ thiện 5tr ở bậc 20%');
assert.ok(!c5.tips.some(t => t.id === 'tip-charity')); n++;
// Không BH: engine không trừ BH
eq(optimizeCoupleTax({ person1: P('A', 30e6, { hasInsurance: false }), person2: P('B', 0), totalDependents: 0 }).optimalScenario.person1Tax,
  500_000 + 4.5e6 * 0.1, 'C5 không BH: TNTT 14,5tr');

console.log(`couple golden OK: ${n} asserts`);
