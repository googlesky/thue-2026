// Mục 5 — quyết toán năm
import assert from 'node:assert/strict';
import {
  calculateAnnualSettlement, createDefaultMonthlyIncome, estimateMonthlyTax, getAnnualPensionCap,
  calculateAnnualTax, AnnualSettlementInput, getLawForMonth,
} from '@/lib/annualSettlementCalculator';
import { DEFAULT_INSURANCE_OPTIONS, getInsuranceDetailed } from '@/lib/taxCalculator';
import { DEFAULT_ANNUAL_SETTLEMENT_STATE, mergeSnapshotWithDefaults } from '@/lib/snapshotTypes';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.equal(a, b, msg); n++; };
const near = (a: number, b: number, msg: string) => { assert.ok(Math.abs(a - b) < 1, `${msg}: ${a} vs ${b}`); n++; };
const run = (over: Partial<AnnualSettlementInput> & { gross?: number }) => calculateAnnualSettlement({
  year: 2026,
  monthlyIncome: createDefaultMonthlyIncome(over.gross ?? 30_000_000),
  dependents: [],
  charitableContributions: 0,
  voluntaryPension: 0,
  insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
  region: 1,
  ...over,
});

// A. 2026, 30tr/tháng: BH 3,15tr/tháng (37,8tr/năm); TNTT = 360 − 186 − 37,8 = 136,2tr
//    Biểu năm: 120tr × 5% + 16,2tr × 10% = 7,62tr (= 12 × 635.000). Trước khi sửa: 33,17tr (áp biểu tháng).
let r = run({});
near(r.totalInsuranceDeduction, 37_800_000, 'BH cả năm');
near(r.totalAssessableIncome, 136_200_000, 'TN tính thuế năm');
eq(r.annualTaxDue, 7_620_000, 'thuế năm theo biểu năm (×12)');
eq(Math.round(estimateMonthlyTax(30_000_000, 0, 3_150_000, 'new')), 635_000, 'thuế tháng ước tính');
eq(calculateAnnualTax(136_200_000, 'new'), 7_620_000, 'calculateAnnualTax mới');

// B. Giảm trừ khác 2026: từ thiện 1tr + hưu trí 50tr→36tr + y tế 30tr→23tr + học phí 10tr = 70tr
r = run({ charitableContributions: 1_000_000, voluntaryPension: 50_000_000, medicalExpenses: 30_000_000, educationExpenses: 10_000_000 });
eq(r.otherDeductionDetail.pension, 36_000_000, 'trần hưu trí 2026 = 36tr');
eq(r.otherDeductionDetail.medical, 23_000_000, 'trần y tế 23tr');
eq(r.otherDeductionDetail.education, 10_000_000, 'học phí dưới trần');
eq(r.totalOtherDeduction, 70_000_000, 'tổng giảm trừ khác');
eq(r.annualTaxDue, 3_310_000, '136,2 − 70 = 66,2tr × 5% = 3,31tr');
r = run({ educationExpenses: 99_000_000 });
eq(r.otherDeductionDetail.education, 24_000_000, 'trần học phí 24tr');

// C. 2025: biểu 7 bậc năm, giảm trừ 11tr; TNTT = 360 − 132 − 37,8 = 190,2tr
//    60tr × 5% + 60tr × 10% + 70,2tr × 15% = 3 + 6 + 10,53 = 19,53tr
r = run({ year: 2025, voluntaryPension: 20_000_000, medicalExpenses: 10_000_000 });
eq(r.otherDeductionDetail.pension, 12_000_000, 'trần hưu trí 2025 = 12tr');
eq(r.otherDeductionDetail.medical, 0, 'năm 2025 không có giảm trừ y tế');
r = run({ year: 2025 });
near(r.totalAssessableIncome, 190_200_000, 'TNTT 2025');
eq(r.annualTaxDue, 19_530_000, 'thuế 2025 theo biểu năm');
eq(getAnnualPensionCap(2025), 12_000_000, 'getAnnualPensionCap 2025');
eq(getAnnualPensionCap(2026), 36_000_000, 'getAnnualPensionCap 2026');

// D. NPT 6 tháng (T7–T12) năm 2026: 6 × 6,2tr = 37,2tr → TNTT 99tr → 4,95tr
r = run({ dependents: [{ id: 'd', name: 'Con', fromMonth: 7, toMonth: 12 }] });
eq(r.totalDependentDeduction, 37_200_000, 'NPT 6 tháng');
eq(r.annualTaxDue, 4_950_000, '99tr × 5%');

// E. Quy tắc 50.000đ
r = run({ manualTaxPaid: 7_580_000 });
eq(r.settlementType, 'pay', 'nộp thêm 40.000');
eq(r.isSmallDifference, true, '≤ 50.000 → miễn');
r = run({ manualTaxPaid: 7_670_000 });
eq(r.settlementType, 'refund', 'thừa 50.000');
eq(r.isSmallDifference, true, 'thừa đúng 50.000 → không hoàn, bù trừ');
r = run({ manualTaxPaid: 7_670_001 });
eq(r.isSmallDifference, false, 'thừa 50.001 → được hoàn');
r = run({ manualTaxPaid: 7_620_000 });
eq(r.settlementType, 'even', 'không chênh lệch');
eq(r.isSmallDifference, false, 'bằng 0 không tính là chênh nhỏ');

// F. Thu nhập cao 2026 (200tr/tháng): BHXH+BHYT 9,5% × trần 46,8tr (T1–T6) / 50,6tr (T7–T12), BHTN 1% × 106,2tr
//    BH năm = 6 × (4,446 + 1,062) + 6 × (4,807 + 1,062) = 68,262tr; TNTT = 2.400 − 186 − 68,262 = 2.145,738tr
//    Thuế = 2.145,738tr × 35% − 174tr = 577,0083tr
r = run({ gross: 200_000_000 });
near(r.totalInsuranceDeduction, 68_262_000, 'BH năm theo trần từng nửa năm');
eq(r.annualTaxDue, 577_008_300, 'thuế năm bậc 35%');

// G. Đường đi của component (lương TB): thuế đã nộp = Σ thuế tháng ước tính (có phần lẻ đồng)
//    → không được báo "phải nộp thêm 0 đ" do lệch làm tròn
for (const gross of [23_456_789, 31_234_567, 47_777_777, 123_456_789]) {
  for (const year of [2025, 2026] as const) {
    const monthlyIncome = createDefaultMonthlyIncome(gross);
    monthlyIncome.forEach((e) => {
      const ins = getInsuranceDetailed(e.grossSalary, 1, DEFAULT_INSURANCE_OPTIONS, new Date(year, e.month - 1, 1));
      e.taxPaid = estimateMonthlyTax(e.grossSalary + e.bonus - e.taxExempt, 0, ins.total, getLawForMonth(year, e.month));
    });
    const s = run({ year, monthlyIncome });
    eq(s.settlementType, 'even', `${year} lương ${gross}: không chênh lệch (difference=${s.difference})`);
    eq(s.isSmallDifference, false, `${year} lương ${gross}: không báo chênh nhỏ`);
  }
}

// Snapshot: năm mặc định 2026, snapshot cũ thiếu field mới vẫn hợp lệ
eq(DEFAULT_ANNUAL_SETTLEMENT_STATE.year, 2026, 'năm mặc định 2026');
const merged = mergeSnapshotWithDefaults({ tabs: { annualSettlement: { year: 2025, voluntaryPension: 5_000_000 } } } as never);
eq(merged.tabs.annualSettlement.year, 2025, 'snapshot cũ giữ năm');
eq(merged.tabs.annualSettlement.medicalExpenses ?? 0, 0, 'field mới mặc định 0');

console.log(`OK annualSettlement: ${n} assert`);
