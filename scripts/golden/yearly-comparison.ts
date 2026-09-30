import assert from 'node:assert/strict';
import {
  calculateYearlyTax, calculateTwoYearStrategy, compareStrategies,
  createUniformMonths, createBonusMonth, PRESETS, PRESET_NORMAL, PRESET_DEFER_BONUS, findPreset, YearScenario,
} from '@/lib/yearlyTaxCalculator';
import { OLD_TAX_BRACKETS, calculateAnnualSalaryTax as calculateAnnualTax } from '@/lib/taxCalculator';

let n = 0;
const eq = (a: number, b: number, msg: string) => { assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} vs ${b}`); n++; };
const sc = (year: 2025 | 2026, salary: number, bonuses: number[], extra: Partial<YearScenario> = {}): YearScenario => ({
  id: 'x', name: 'x', year, months: createUniformMonths(salary),
  bonusMonths: bonuses.map((b, i) => createBonusMonth(13 + i, b)), dependents: 0, hasInsurance: true, region: 1, ...extra,
});

// Biểu năm = biểu tháng × 12 (Luật 109 Điều 9: 120/360/720/1.200tr)
eq(calculateAnnualTax(120_000_000), 6_000_000, 'bậc 1 năm 120tr @5%');
eq(calculateAnnualTax(166_200_000), 10_620_000, '166,2tr: 6tr + 46,2tr×10%');
eq(calculateAnnualTax(-5), 0, 'âm -> 0');
eq(calculateAnnualTax(220_200_000, OLD_TAX_BRACKETS), 24_240_000, 'biểu 2025: 3+6+14,4+0,84');

// Y1: 2026, 12×30tr + thưởng 30tr, 0 NPT -> quyết toán năm (không phải 13 "tháng")
const y1 = calculateYearlyTax(sc(2026, 30e6, [30e6]));
eq(y1.totalGross, 390e6, 'Y1 gross');
eq(y1.totalInsurance, 37_800_000, 'Y1 BH chỉ trên 12 tháng lương');
eq(y1.taxableIncome, 166_200_000, 'Y1 TNTT = 390 − 37,8 − 12×15,5');
eq(y1.totalTax, 10_620_000, 'Y1 thuế năm');
eq(y1.totalNet, 390e6 - 37.8e6 - 10.62e6, 'Y1 net');
assert.equal(y1.newLawMonths, 12); assert.equal(y1.oldLawMonths, 0); n += 2;
assert.equal(y1.monthlyBreakdown.filter(m => m.isBonus).length, 1); n++;
eq(y1.monthlyBreakdown.find(m => m.isBonus)!.insurance, 0, 'dòng thưởng không đóng BH');

// Y2: declaredSalary 10tr -> BH 12 × 1,05tr (không phải 13)
const y2 = calculateYearlyTax(sc(2026, 30e6, [30e6], { declaredSalary: 10e6 }));
eq(y2.totalInsurance, 12_600_000, 'Y2 BH 12 lần');
eq(y2.totalTax, 13_140_000, 'Y2 thuế: TNTT 191,4tr');

// Y3: 2025 luật cũ 11tr, 7 bậc
const y3 = calculateYearlyTax(sc(2025, 30e6, [30e6]));
eq(y3.totalTax, 24_240_000, 'Y3 2025');
assert.equal(y3.oldLawMonths, 12); n++;

// 1 NPT 2026: 390 − 37,8 − 12×21,7 = 91,8tr -> 4,59tr
eq(calculateYearlyTax(sc(2026, 30e6, [30e6], { dependents: 1 })).totalTax, 4_590_000, '1 NPT');
// NPT âm/NaN -> 0 (không làm tăng thuế)
eq(calculateYearlyTax(sc(2026, 30e6, [30e6], { dependents: -3 })).totalTax, 10_620_000, 'NPT âm -> 0');
eq(calculateYearlyTax(sc(2026, 30e6, [30e6], { dependents: NaN })).totalTax, 10_620_000, 'NPT NaN -> 0');
// gross âm -> 0, không BH âm
const neg = calculateYearlyTax({ ...sc(2026, 30e6, []), months: createUniformMonths(-1e6) });
eq(neg.totalInsurance, 0, 'gross âm -> BH 0'); eq(neg.totalGross, 0, 'gross âm -> 0');

// Lương thấp: 12×10tr + thưởng 30tr -> TNTT năm âm -> thuế 0 (giảm trừ tháng chưa dùng bù cho thưởng)
eq(calculateYearlyTax(sc(2026, 10e6, [30e6])).totalTax, 0, 'lương thấp + thưởng -> 0');

// Trần BH theo tháng 2026 (60tr): T1–T6 46,8tr, T7–T12 50,6tr; BHTN 1% × 60tr
const y60 = calculateYearlyTax(sc(2026, 60e6, []));
eq(y60.monthlyBreakdown[5].insurance, 46.8e6 * 0.095 + 600_000, 'T6/2026 5.046.000');
eq(y60.monthlyBreakdown[6].insurance, 50.6e6 * 0.095 + 600_000, 'T7/2026 5.407.000');
eq(y60.totalInsurance, 62_718_000, 'BH năm 60tr');
// Không BH
eq(calculateYearlyTax(sc(2026, 30e6, [30e6], { hasInsurance: false })).totalInsurance, 0, 'không BH');

// Preset: cùng tổng thu nhập 2 năm; dời thưởng T13/2025 sang 2026 rẻ hơn 1,71tr (30tr, 0 NPT)
assert.deepEqual(PRESETS.map(p => p.id), ['normal', 'defer-bonus']); n++;
const strat = PRESETS.map(p => { const c = p.create(30e6, 0, true, 1, 30e6); return calculateTwoYearStrategy(c.scenario2025, c.scenario2026); });
eq(strat[0].combinedGross, 780e6, 'normal gross'); eq(strat[1].combinedGross, 780e6, 'defer gross');
eq(strat[0].combinedTax, 24_240_000 + 10_620_000, 'normal thuế 2 năm');
eq(strat[1].year2025.totalTax, 19_530_000, 'defer 2025: TNTT 190,2tr');
eq(strat[1].year2026.totalTax, 13_620_000, 'defer 2026: TNTT 196,2tr');
const cmp = compareStrategies(strat);
assert.equal(cmp.bestStrategy, 1); n++;
eq(cmp.maxSavings, 1_710_000, 'tiết kiệm hồi cứu');

// Chiến lược tùy chỉnh khác tổng thu nhập: không được chọn là "thấp nhất" dù thuế thấp hơn
const lowIncome = calculateTwoYearStrategy(sc(2025, 10e6, []), sc(2026, 10e6, []));
const cmp2 = compareStrategies([...strat, lowIncome]);
assert.equal(cmp2.bestStrategy, 1); n++;
eq(cmp2.maxSavings, 1_710_000, 'không so với thu nhập khác');
// Thu nhập khác, CL1 vẫn là mốc: không có chiến lược cùng thu nhập nào -> không tiết kiệm
eq(compareStrategies([strat[0], lowIncome]).maxSavings, 0, 'chỉ khác thu nhập -> 0');

// Snapshot cũ: 'optimize' -> defer-bonus; id lạ -> normal; null (tùy chỉnh) giữ null
assert.equal(findPreset('optimize'), PRESET_DEFER_BONUS); n++;
assert.equal(findPreset('abc'), PRESET_NORMAL); n++;
assert.equal(findPreset(null), null); n++;

console.log(`yearly golden OK: ${n} asserts`);
