import assert from 'node:assert/strict';
import {
  calculateMultiSourceTax, createIncomeSource, allocate, calculateBusinessTaxable, formatPercent,
  type IncomeSource, type MultiSourceInput,
} from '@/lib/multiSourceIncomeCalculator';
import { calculateNewTax, calculateOldTax } from '@/lib/taxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const ok = (c: boolean, msg: string) => { assert.ok(c, msg); n++; };

const src = (s: Partial<IncomeSource>, i = 0): IncomeSource =>
  ({ id: 'x' + i + Math.random(), type: 'salary', amount: 0, frequency: 'monthly', ...s } as IncomeSource);
const run = (sources: Partial<IncomeSource>[], over: Partial<MultiSourceInput> = {}) =>
  calculateMultiSourceTax({
    incomeSources: sources.map(src), dependents: 0, hasInsurance: true, pensionContribution: 0,
    charitableContribution: 0, taxYear: 2026, isSecondHalf2026: true, ...over,
  });
const consistent = (r: ReturnType<typeof run>, label: string) => {
  eq(r.sourceResults.reduce((s, x) => s + x.taxAmount, 0), r.totalTax, `${label}: Σ nguồn = tổng thuế`);
  eq(r.progressiveTax + r.flatTax, r.totalTax, `${label}: lũy tiến + cố định = tổng`);
  eq(r.totalNetIncome, r.totalGrossIncome - r.totalInsurance - r.totalTax, `${label}: net = gross − BH − thuế`);
};

// C1: 2 nguồn lương 30tr = 1 nguồn 60tr. BH theo tháng: H1 trần 46,8tr (5.046.000/th), H2 50,6tr (5.407.000/th)
// TNTT = 720 − 62,718 − 186 = 471,282tr → /12 = 39.273.500 → 500k + 2tr + 9.273.500×20% = 4.354.700 → ×12
const two = run([{ amount: 30e6 }, { amount: 30e6 }]);
const one = run([{ amount: 60e6 }]);
eq(two.totalInsurance, 62_718_000, 'C1 BH năm 60tr (tách H1/H2)');
eq(two.totalTax, 52_256_400, 'C1 2×30tr');
eq(one.totalTax, 52_256_400, 'C1 1×60tr');
eq(two.sourceResults.map(r => r.taxAmount), [26_128_200, 26_128_200], 'C1 chia đều');
consistent(two, 'C1');

// Khớp engine khi trần không đổi (lương ≤ 46,8tr)
eq(run([{ amount: 30e6 }]).totalTax, 7_620_000, '2026 30tr');
eq(Math.round(calculateNewTax({ grossIncome: 30e6, dependents: 0, calculationDate: new Date(2026, 11, 31) }).taxAmount * 12), 7_620_000, 'engine 30tr ×12');

// C2: 2025 luật cũ: TNTT = 360 − 37,8 − 132 = 190,2 → /12 = 15,85 → 250k+500k+5,85tr×15% = 1.627.500 ×12
eq(run([{ amount: 30e6 }], { taxYear: 2025 }).totalTax, 19_530_000, 'C2 2025 30tr');
eq(Math.round(calculateOldTax({ grossIncome: 30e6, dependents: 0, calculationDate: new Date(2025, 5, 1) }).taxAmount * 12), 19_530_000, 'engine cũ ×12');

// C5: kinh doanh / cho thuê
eq(run([{ type: 'rental', amount: 240e6, frequency: 'yearly' }]).totalTax, 0, 'C5 cho thuê 240tr → 0');
eq(run([{ type: 'rental', amount: 1.5e9, frequency: 'yearly' }]).totalTax, 25_000_000, 'C5 cho thuê 1,5 tỷ → (1,5−1)×5%');
const twoRent = run([{ type: 'rental', amount: 800e6, frequency: 'yearly' }, { type: 'rental', amount: 800e6, frequency: 'yearly' }]);
eq(twoRent.sourceResults.map(r => r.taxAmount), [0, 30_000_000], 'C5 2 hợp đồng 800tr: trừ 1 tỷ một lần → 600tr×5%');
eq(run([{ type: 'rental', amount: 240e6, frequency: 'yearly' }], { taxYear: 2025 }).totalTax, 12_000_000, 'C5 2025 >100tr tính toàn bộ 5%');
const mix = run([{ type: 'freelance', isBusiness: true, amount: 1.2e9, frequency: 'yearly' }, { type: 'rental', amount: 900e6, frequency: 'yearly' }]);
eq(mix.sourceResults.map(r => r.taxAmount), [22_000_000, 0], 'C5 trừ 1 tỷ vào cho thuê 5% trước, còn 100tr trừ KD 2% → 1,1 tỷ×2%');
eq(calculateBusinessTaxable([{ revenue: 600e6, rate: 0.015 }, { revenue: 700e6, rate: 0.05 }], 2026), [300e6, 0], 'ưu tiên trừ thuế suất cao');

// C6: thù lao không ĐKKD = tiền công. 500tr: (500 − 186)/12 = 26.166.666,67 → 500k + 1.616.666,67 → ×12
const fl = run([{ type: 'freelance', amount: 500e6, frequency: 'yearly' }]);
eq(fl.totalTax, 25_400_000, 'C6 freelance 500tr lũy tiến');
eq(fl.totalInsurance, 0, 'C6 thù lao không tính BH');
ok(fl.sourceResults[0].notes.some(x => x.includes('50.000.000')), 'C6 note tạm khấu trừ 10% = 50tr');
ok(fl.sourceResults[0].appliedRate === 'progressive', 'C6 progressive');
// lương 30tr + thù lao 100tr: (460 − 37,8 − 186)/12 = 19.683.333,33 → 500k + 968.333,33 → ×12 = 17.620.000
const salFl = run([{ amount: 30e6 }, { type: 'freelance', amount: 100e6, frequency: 'yearly' }]);
eq(salFl.totalTax, 17_620_000, 'C6 gộp lương + thù lao');
eq(salFl.sourceResults.map(r => r.taxAmount), [13_789_565, 3_830_435], 'C6 chia theo tỷ lệ 360:100');
eq(salFl.categoryBreakdown.salary.gross, 460e6, 'thù lao tiền công vào nhóm lương');
consistent(salFl, 'C6');
// thù lao 4tr/tháng < 5tr/lần: không bị khấu trừ
ok(!run([{ type: 'freelance', amount: 4e6, frequency: 'monthly' }]).sourceResults[0].notes[0].includes(': '), 'C6 < 5tr/lần không khấu trừ');

// C4: lãi
ok(createIncomeSource('interest').isGovBond === true, 'C4 lãi mới mặc định miễn (tiền gửi)');
eq(run([{ type: 'interest', amount: 50e6, frequency: 'yearly', isGovBond: true }]).totalTax, 0, 'C4 lãi tiền gửi miễn');
eq(run([{ type: 'interest', amount: 50e6, frequency: 'yearly' }]).totalTax, 2_500_000, 'C4 lãi cho vay 5%');

// C8: bản quyền theo hợp đồng
eq(run([{ type: 'royalty', amount: 15e6, frequency: 'one_time' }]).totalTax, 0, 'C8 15tr → 0');
eq(run([{ type: 'royalty', amount: 50e6, frequency: 'one_time' }]).totalTax, 1_500_000, 'C8 50tr → 30tr×5%');
eq(run([{ type: 'royalty', amount: 5e6, frequency: 'monthly' }]).totalTax, 2_000_000, 'C8 hợp đồng 60tr/năm → 40tr×5%');

// C17: trúng thưởng theo từng lần
eq(run([{ type: 'lottery', amount: 15e6, frequency: 'monthly' }]).totalTax, 0, 'C17 15tr × 12 lần → 0');
eq(run([{ type: 'lottery', amount: 30e6, frequency: 'monthly' }]).totalTax, 12_000_000, 'C17 30tr × 12 lần → 12×1tr');
eq(run([{ type: 'lottery', amount: 50e6, frequency: 'one_time' }]).totalTax, 3_000_000, 'C7 50tr → 3tr');
eq(run([{ type: 'lottery', amount: 15e6, frequency: 'one_time' }], { isSecondHalf2026: false }).totalTax, 500_000, 'H1/2026 ngưỡng 10tr');
eq(run([{ type: 'inheritance', amount: 15e6, frequency: 'one_time' }]).totalTax, 0, 'thừa kế 15tr → 0');
eq(run([{ type: 'inheritance', amount: 500e6, frequency: 'one_time', isFromFamily: true }]).totalTax, 0, 'C18 BĐS người thân miễn');

// C16: hưu trí chặn 3tr/tháng. (720 − 62,718 − 186 − 36)/12 = 36.273.500 → 2,5tr + 1.254.700 → ×12
eq(run([{ amount: 60e6 }], { pensionContribution: 100e6 }).totalTax, 45_056_400, 'C16 hưu trí 100tr chặn 36tr');
eq(run([{ amount: 60e6 }], { pensionContribution: 36e6 }).totalTax, 45_056_400, 'C16 hưu trí 36tr');
// 2025: chặn 1tr/tháng: (360 − 37,8 − 132 − 12)/12 = 14,85 → 250k+500k+727.500 → ×12
eq(run([{ amount: 30e6 }], { taxYear: 2025, pensionContribution: 100e6 }).totalTax, 17_730_000, 'C16 2025 chặn 12tr/năm');

// C32: NPT âm → 0; NPT 1: (360 − 37,8 − 186 − 74,4)/12 = 5,15 → 5% → ×12
eq(run([{ amount: 30e6 }], { dependents: -3 }).totalTax, 7_620_000, 'C32 NPT âm = 0');
eq(run([{ amount: 30e6 }], { dependents: 1 }).totalTax, 3_090_000, 'NPT 1');

// Từ thiện 12tr/năm: (136,2 − 12)/12 = 10,35 → 500k + 35k → ×12
eq(run([{ amount: 30e6 }], { charitableContribution: 12e6 }).totalTax, 6_420_000, 'từ thiện');
// Không BH: (360 − 186)/12 = 14,5 → 500k + 450k → ×12
const noIns = run([{ amount: 30e6 }], { hasInsurance: false });
eq([noIns.totalTax, noIns.totalInsurance], [11_400_000, 0], 'không BH');
// Thưởng "Một lần" không tính BH: lương 30tr + thưởng 60tr: (420 − 37,8 − 186)/12 = 16,35 → 500k + 635k → ×12
const bonus = run([{ amount: 30e6 }, { amount: 60e6, frequency: 'one_time' }]);
eq([bonus.totalTax, bonus.totalInsurance], [13_620_000, 37_800_000], 'thưởng không vào BH');
eq(bonus.sourceResults.map(r => r.insuranceAmount), [37_800_000, 0], 'BH phân bổ cho lương tháng');

// C28: net trừ BH. 30tr: 360 − 37,8 − 7,62 = 314,58tr
const net = run([{ amount: 30e6 }]);
eq([net.totalInsurance, net.totalNetIncome], [37_800_000, 314_580_000], 'C28 net 30tr');

// C9: tips
const tips = run([{ amount: 30e6 }]).optimizationTips.join(' | ');
ok(tips.includes('6,2 triệu') && tips.includes('3 triệu') && !tips.includes('7.2') && !tips.includes('1 triệu/tháng'), 'C9 tips: ' + tips);
ok(!run([{ type: 'interest', amount: 50e6, frequency: 'yearly', isGovBond: true }]).optimizationTips.some(t => t.includes('trái phiếu')), 'C4 không gợi ý TPCP khi đã miễn');

// C27: BĐS
const re = run([{ type: 'real_estate', amount: 3e9, frequency: 'one_time' }]);
eq(re.totalTax, 60_000_000, 'BĐS 2%');
ok(!re.sourceResults[0].notes.join().includes('25%'), 'C27 bỏ 25% lợi nhuận');

// NaN / rỗng
const bad = run([{ amount: NaN as unknown as number }, { type: 'lottery', amount: -5 }]);
ok(Number.isFinite(bad.totalTax) && bad.totalTax === 0 && Number.isFinite(bad.totalNetIncome), 'NaN/âm an toàn');
const empty = run([]);
eq([empty.totalTax, empty.totalGrossIncome, empty.optimizationTips.length], [0, 0, 0], 'rỗng');

// Tiện ích
eq(allocate(100, [1, 1, 1]), [33, 33, 34], 'allocate dồn phần lẻ');
eq([formatPercent(0.001), formatPercent(0.05), formatPercent(0.12345)], ['0,1%', '5%', '12,3%'], 'formatPercent vi-VN');

console.log(`multisource: ${n} assert OK`);
