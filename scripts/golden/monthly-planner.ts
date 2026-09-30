import assert from 'node:assert/strict';
import { calculateMonthlyPlan, PRESET_SCENARIOS, createDefaultMonths, MonthlyPlannerInput } from '@/lib/monthlyPlannerCalculator';

let n = 0;
const eq = (a: number, b: number, msg: string) => { assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} vs ${b}`); n++; };
const base = (extra: Partial<MonthlyPlannerInput> = {}): MonthlyPlannerInput => ({
  baseSalary: 30e6, months: createDefaultMonths(), dependents: 0, hasInsurance: true, region: 1, year: 2026, ...extra,
});

// P1: Thưởng Tết T1 = 1 tháng lương (30tr), kỳ 2026
const tet = PRESET_SCENARIOS.find(p => p.id === 'tet-bonus')!;
const p1 = calculateMonthlyPlan(base({ months: tet.applyToMonths(30e6) }));
eq(p1.months[0].insurance, 3_150_000, 'P1 BH T1 chỉ trên lương (không trên thưởng)');
eq(p1.summary.totalInsurance, 37_800_000, 'P1 BH năm');
eq(p1.months[0].tax, 4_770_000, 'P1 tạm khấu trừ T1: TNTT 41,35tr');
eq(p1.months[1].tax, 635_000, 'P1 tạm khấu trừ T2: TNTT 11,35tr');
eq(p1.summary.totalWithholding, 4_770_000 + 11 * 635_000, 'P1 tổng tạm khấu trừ 11.755.000');
eq(p1.summary.totalTax, 10_620_000, 'P1 thuế sau quyết toán năm');
eq(p1.summary.settlementRefund, 1_135_000, 'P1 được hoàn/bù trừ');
eq(p1.summary.totalNet, 390e6 - 37.8e6 - 10.62e6, 'P1 NET năm sau quyết toán');
eq(p1.summary.averageMonthlyNet, (390e6 - 37.8e6 - 10.62e6) / 12, 'P1 NET TB');
assert.equal(p1.year, 2026); n++;

// Thuế năm không phụ thuộc cách chia thưởng trong năm
const p13 = calculateMonthlyPlan(base({ months: PRESET_SCENARIOS.find(p => p.id === '13th-month')!.applyToMonths(30e6) }));
const pMid = calculateMonthlyPlan(base({ months: PRESET_SCENARIOS.find(p => p.id === 'mid-year-tet')!.applyToMonths(30e6) }));
eq(p13.summary.totalTax, 10_620_000, 'T13 vào T12: cùng thuế năm');
eq(pMid.summary.totalTax, 10_620_000, 'T6+T12: cùng thuế năm');
const uni = calculateMonthlyPlan(base());
eq(uni.summary.settlementRefund, 0, 'đều đặn: tạm khấu trừ = thuế năm');
eq(uni.summary.totalTax, 7_620_000, 'đều đặn 30tr: 12 × 635.000');

// P2: tăng ca 10tr/tháng miễn toàn bộ, không đóng BH
const p2 = calculateMonthlyPlan(base({ months: createDefaultMonths().map(m => ({ ...m, overtime: 10e6 })) }));
eq(p2.months[0].tax, 635_000, 'P2 tăng ca không làm tăng thuế');
eq(p2.months[0].insurance, 3_150_000, 'P2 tăng ca không đóng BH');
eq(p2.months[0].gross, 40e6, 'P2 GROSS gồm tăng ca');
eq(p2.months[0].net, 40e6 - 3_150_000 - 635_000, 'P2 NET gồm tăng ca');
eq(p2.summary.totalTax, 7_620_000, 'P2 thuế năm');

// P3: trần BH theo tháng (lương 60tr): 2026 T1–T6 46,8tr, T7–T12 50,6tr; 2027 cả năm 50,6tr
const p3 = calculateMonthlyPlan(base({ baseSalary: 60e6 }));
eq(p3.months[0].insurance, 5_046_000, 'P3 BH T1/2026');
eq(p3.months[6].insurance, 5_407_000, 'P3 BH T7/2026');
eq(calculateMonthlyPlan(base({ baseSalary: 60e6, year: 2027 })).months[0].insurance, 5_407_000, 'P3 BH T1/2027');

// P4: lương thấp 10tr + thưởng 30tr T1: tạm khấu trừ T1 nhưng thuế năm 0
const p4 = calculateMonthlyPlan(base({ baseSalary: 10e6, months: tet.applyToMonths(30e6) }));
eq(p4.months[0].tax, 1_845_000, 'P4 tạm khấu trừ T1: TNTT 23,45tr');
eq(p4.summary.totalTax, 0, 'P4 thuế năm 0 (TNTT năm âm)');
eq(p4.summary.settlementRefund, 1_845_000, 'P4 hoàn toàn bộ');

// P5: lương đóng BH khai báo, tùy chọn BH như tab chính, NPT âm, dữ liệu hỏng
eq(calculateMonthlyPlan(base({ declaredSalary: 10e6 })).months[0].insurance, 1_050_000, 'P5 BH trên lương khai báo');
eq(calculateMonthlyPlan(base({ insuranceOptions: { bhxh: false, bhyt: false, bhtn: false } })).summary.totalInsurance, 0, 'P5 insuranceOptions tắt');
eq(calculateMonthlyPlan(base({ dependents: -2 })).summary.totalTax, 7_620_000, 'P5 NPT âm -> 0');
eq(calculateMonthlyPlan(base({ dependents: 1 })).summary.totalTax, 12 * (30e6 - 3.15e6 - 15.5e6 - 6.2e6) * 0.05, 'P5 1 NPT: TNTT 5,15tr/tháng');
const p5 = calculateMonthlyPlan(base({ months: [{ bonus: NaN, overtime: -5, otherIncome: 0 }] }));
eq(p5.summary.totalTax, 7_620_000, 'P5 NaN/âm -> 0');
assert.equal(p5.months.length, 12); n++;
const p0 = calculateMonthlyPlan(base({ baseSalary: 0, months: [] }));
eq(p0.summary.effectiveRate, 0, 'P5 base 0 không chia 0');
// Phụ cấp khác: chịu thuế, không đóng BH
const pOther = calculateMonthlyPlan(base({ months: createDefaultMonths().map(m => ({ ...m, otherIncome: 2e6 })) }));
eq(pOther.months[0].insurance, 3_150_000, 'phụ cấp không đóng BH');
eq(pOther.months[0].tax, 635_000 + 200_000, 'phụ cấp chịu thuế 10%');

console.log(`planner golden OK: ${n} asserts`);
