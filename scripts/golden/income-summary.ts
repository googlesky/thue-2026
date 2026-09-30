import assert from 'node:assert/strict';
import {
  calculateIncomeSummary, formatTaxMethod, formatShortCurrency, formatPercent, getCategoryConfig,
  type IncomeEntry, type IncomeCategory,
} from '@/lib/incomeSummaryCalculator';
import { mergeSnapshotWithDefaults } from '@/lib/snapshotTypes';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const ok = (c: boolean, msg: string) => { assert.ok(c, msg); n++; };

let id = 0;
const e = (category: IncomeCategory, amount: number, month = 9): IncomeEntry =>
  ({ id: String(++id), category, description: category, amount, month });
const run = (entries: IncomeEntry[], year = 2026, dependents = 0, hasInsurance = true) => {
  const r = calculateIncomeSummary({ year, entries, dependents, hasInsurance });
  const sumEntries = r.entries.reduce((s, x) => s + x.taxAmount, 0);
  const sumMonths = r.byMonth.reduce((s, m) => s + m.totalTax, 0);
  const sumCats = r.byCategory.reduce((s, c) => s + c.totalTax, 0);
  assert.ok(sumEntries === r.totalTax && sumMonths === r.totalTax && sumCats === r.totalTax, 'Σ khoản = Σ tháng = Σ loại = tổng thuế');
  n++;
  return r;
};
const salary12 = (amount = 30e6) => Array.from({ length: 12 }, (_, i) => e('salary', amount, i + 1));

// C25 + khớp engine: 12×30tr → (360 − 37,8 − 186)/12 = 11,35tr → 635.000/tháng
const s = run(salary12());
eq(s.totalTax, 7_620_000, '12×30tr');
eq(s.byMonth.map(m => m.totalTax), Array(12).fill(635_000), 'C25 thuế từng tháng');
eq([s.deductions.insurance, s.totalNetIncome], [37_800_000, 314_580_000], 'BH + net (trừ BH)');

// C3: năm 2025 dùng luật cũ
eq(run(salary12(), 2025).totalTax, 19_530_000, 'C3 2025');
// NPT 1: (360 − 37,8 − 186 − 74,4)/12 = 5,15tr → 5%
eq(run(salary12(), 2026, 1).totalTax, 3_090_000, 'NPT 1');
eq(run(salary12(), 2026, -2).totalTax, 7_620_000, 'NPT âm = 0');

// C7: theo từng lần, ngưỡng theo tháng phát sinh
eq(run([e('lottery', 15e6, 9)]).totalTax, 0, 'C7 trúng thưởng 15tr T9 → 0');
eq(run([e('lottery', 15e6, 3)]).totalTax, 500_000, 'C7 trúng thưởng 15tr T3/2026 (ngưỡng 10tr)');
eq(run([e('lottery', 50e6, 9)]).totalTax, 3_000_000, 'C7 50tr → 3tr');
eq(run([e('inheritance', 15e6, 9)]).totalTax, 0, 'C7 thừa kế 15tr → 0');

// C24: thu nhập khác 5% phần vượt; chỉ từ 01/7/2026 (cùng tài sản số)
eq(run([e('other', 30e6, 9)]).totalTax, 500_000, 'C24 khác 30tr → 10tr×5%');
eq(run([e('other', 30e6, 3)]).totalTax, 0, 'C24 trước 01/7/2026 chưa chịu thuế');
eq(run([e('crypto', 1e9, 9)]).totalTax, 1_000_000, 'tài sản số 0,1%');
eq(run([e('crypto', 1e9, 3)]).totalTax, 0, 'tài sản số trước 01/7/2026');

// C4: đầu tư 5% (cổ tức, lãi cho vay)
eq(run([e('investment', 50e6)]).totalTax, 2_500_000, 'đầu tư 5%');

// C5: ngưỡng 1 tỷ chung, trừ vào tỷ lệ cao trước
eq(run([e('rental', 240e6)]).totalTax, 0, 'C5 cho thuê 240tr');
eq(run([e('business', 800e6)]).totalTax, 0, 'C5 kinh doanh 800tr');
eq(run([e('content_creator', 500e6)]).totalTax, 0, 'C5 creator 500tr');
eq(run([e('content_creator', 1.5e9)]).totalTax, 25_000_000, 'C5 creator 1,5 tỷ → 500tr×5%');
const mixed = run([e('business', 700e6, 5), e('rental', 600e6, 2)]);
eq(mixed.totalTax, 4_500_000, 'C5 cho thuê 600tr + KD 700tr → (1,3 tỷ − 1 tỷ) trừ vào KD: 300tr×1,5%');
eq(run([e('rental', 240e6)], 2025).totalTax, 12_000_000, 'C5 2025 > 100tr: 5% toàn bộ');
const twelveRent = run(Array.from({ length: 12 }, (_, i) => e('rental', 100e6, i + 1)));
eq(twelveRent.totalTax, 10_000_000, 'cho thuê 1,2 tỷ → 200tr×5%');
eq(twelveRent.byMonth.map(m => m.totalTax), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5_000_000, 5_000_000], 'ngưỡng trừ vào tháng sớm trước (lũy kế)');

// C39: chỉ cho thuê → không giảm trừ gia cảnh
const rentOnly = run([e('rental', 100e6)]);
eq(rentOnly.deductions, { personal: 0, dependent: 0, insurance: 0, total: 0 }, 'C39 không lương → không giảm trừ');
eq(rentOnly.totalTaxableIncome, 0, 'C39 TN tính thuế theo phần chịu thuế');

// C15: thưởng không vào BH: (420 − 37,8 − 186)/12 = 16,35tr → 1.135.000 ×12
const withBonus = run([...salary12(), e('bonus', 60e6, 12)]);
eq([withBonus.totalTax, withBonus.deductions.insurance], [13_620_000, 37_800_000], 'C15 thưởng không tính BH');
// freelance = tiền công: (460 − 37,8 − 186)/12 → ×12
eq(run([...salary12(), e('freelance', 100e6, 5)]).totalTax, 17_620_000, 'C6 thù lao gộp lũy tiến');

// BH theo từng tháng: 6 tháng × 80tr (T7–T12/2026): BH = 6 × (50,6×9,5% + 0,8) = 33.642.000
// (480 − 33,642 − 186)/12 = 21.696.500 → 500k + 1.169.650 → ×12 = 20.035.800
const half = run(Array.from({ length: 6 }, (_, i) => e('salary', 80e6, i + 7)));
eq([half.deductions.insurance, half.totalTax], [33_642_000, 20_035_800], 'lương 6 tháng: BH từng tháng');
eq(half.byMonth.slice(0, 6).map(m => m.totalTax), Array(6).fill(0), 'tháng không lương không có thuế');

// C38: không làm đổi thứ tự mảng đầu vào
const input = [e('salary', 1e6, 12), e('salary', 1e6, 1)];
calculateIncomeSummary({ year: 2026, entries: input, dependents: 0, hasInsurance: true });
eq(input.map(x => x.month), [12, 1], 'không mutate input');

// C31, C40: hiển thị
eq(formatTaxMethod(getCategoryConfig('content_creator')), '5% phần doanh thu vượt ngưỡng năm', 'C31 creator');
eq(formatTaxMethod(getCategoryConfig('securities')), '0,1%', 'C31 CK');
eq(formatTaxMethod(getCategoryConfig('lottery')), '10% phần vượt ngưỡng mỗi lần', 'C31 trúng thưởng');
eq([formatShortCurrency(360e6), formatShortCurrency(1.5e9), formatShortCurrency(635_000), formatShortCurrency(NaN)],
  ['360 tr', '1,5 tỷ', '635 nghìn', '0'], 'C40 rút gọn tiền');
eq(formatPercent(2.1166), '2,12%', 'C40 phần trăm');

// C26 (phần trong phạm vi): snapshot mang state tab Tổng hợp thu nhập, snapshot cũ không có vẫn hợp lệ
const merged = mergeSnapshotWithDefaults({ tabs: { incomeSummary: { year: 2025, entries: [e('salary', 30e6, 1)] } } } as never);
eq([merged.tabs.incomeSummary?.year, merged.tabs.incomeSummary?.entries.length, merged.tabs.incomeSummary?.hasInsurance], [2025, 1, true], 'C26 merge có default');
eq(mergeSnapshotWithDefaults({}).tabs.incomeSummary, undefined, 'C26 snapshot cũ không có tab');

console.log(`summary: ${n} assert OK`);
// Tháng lệch từ snapshot không làm vỡ tính toán
const badMonth = calculateIncomeSummary({ year: 2026, entries: [e('lottery', 50e6, 13), e('lottery', 50e6, NaN as unknown as number)], dependents: 0, hasInsurance: true });
assert.deepEqual([badMonth.totalTax, badMonth.byMonth[11].entries, badMonth.byMonth[0].entries], [3_000_000 + 4_000_000, 1, 1], 'month 13 → T12 (20tr), NaN → T1 (10tr)');
console.log('summary: month clamp OK');
