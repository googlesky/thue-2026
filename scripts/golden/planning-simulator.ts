// Golden test MISC-B1 nhóm 1: taxPlanningSimulator (A1, A2, A22, A23)
// Chạy: npm run test:golden (hoặc node --import tsx scripts/golden/<file> từ thư mục gốc)
import assert from 'node:assert/strict';
import * as sim from '@/lib/taxPlanningSimulator';
import {
  calculateBonusTaxScenarios,
  generateMultiYearProjection,
  generateSalaryAdjustmentScenarios,
  runSimulation,
  SimulationBaseInput,
} from '@/lib/taxPlanningSimulator';
import { DEFAULT_INSURANCE_OPTIONS } from '@/lib/taxCalculator';

const base: SimulationBaseInput = {
  grossIncome: 30_000_000,
  dependents: 0,
  hasInsurance: true,
  insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
  region: 1,
  otherDeductions: 0,
  pensionContribution: 0,
};

// ---- A1: lương 30tr, thưởng 60tr, 0 NPT ----
// BH chỉ trên lương: 30tr × 10,5% = 3.150.000
// Quyết toán năm: tháng bình quân 35tr → TNTT 35 - 3,15 - 15,5 = 16,35tr
//   thuế = 10tr×5% + 6,35tr×10% = 1.135.000/tháng → năm 13.620.000
const r = calculateBonusTaxScenarios(base, { annualBonus: 60_000_000 });
assert.equal(r.annualTax, 13_620_000);
assert.equal(r.annualNetIncome, 12 * (35_000_000 - 3_150_000 - 1_135_000)); // 368.580.000
const [once, split12, split2, split4] = r.scenarios;
// Nhận 1 lần T12: 11 × 635.000 + thuế(90tr, BH trên 30tr)
//   TNTT T12 = 90 - 3,15 - 15,5 = 71,35tr → 0,5 + 2 + 6 + 11,35×30% = 11.905.000
assert.equal(once.monthlyTaxes[0].tax, 635_000);
assert.equal(once.monthlyTaxes[11].tax, 11_905_000);
assert.equal(once.withheldTax, 18_890_000);
assert.equal(once.settlementDiff, 5_270_000); // được hoàn khi quyết toán
// Chia 12: 12 × 1.135.000 = 13.620.000 (không chênh)
assert.equal(split12.withheldTax, 13_620_000);
assert.equal(split12.settlementDiff, 0);
// Chia 2 (T6, T12): thuế(60tr) = TNTT 41,35tr → 0,5 + 2 + 11,35×20% = 4.770.000
//   10 × 635.000 + 2 × 4.770.000 = 15.890.000 → hoàn 2.270.000
assert.equal(split2.withheldTax, 15_890_000);
assert.equal(split2.settlementDiff, 2_270_000);
// Chia 4 (quý): thuế(45tr) = TNTT 26,35tr → 0,5 + 16,35×10% = 2.135.000
//   8 × 635.000 + 4 × 2.135.000 = 13.620.000
assert.equal(split4.withheldTax, 13_620_000);
assert.equal(split4.settlementDiff, 0);
// Không còn nhãn "tối ưu"/"tiết kiệm" ảo
assert.equal((sim as Record<string, unknown>).findOptimalBonusStrategy, undefined);

// Lương thấp 10tr + thưởng 60tr: năm TNTT = 12×(10 - 1,05 - 15,5) + 60 = -18,6tr → thuế năm 0
// nhưng T12 (70tr) bị tạm khấu trừ: TNTT 53,45tr → 0,5 + 2 + 23,45×20% = 7.190.000 → hoàn toàn bộ
const low = calculateBonusTaxScenarios({ ...base, grossIncome: 10_000_000 }, { annualBonus: 60_000_000 });
assert.equal(low.annualTax, 0);
assert.equal(low.scenarios[0].withheldTax, 7_190_000);
assert.equal(low.scenarios[0].settlementDiff, 7_190_000);

// ---- A2: hưu trí tự nguyện 3tr qua engine (như màn hình chính) ----
// TNTT = 30 - 3,15 - 15,5 - 3 = 8,35tr → 5% = 417.500
const withPension = { ...base, pensionContribution: 3_000_000 };
const baseline = runSimulation(
  withPension,
  generateSalaryAdjustmentScenarios(withPension, [{ adjustmentType: 'percentage', value: 0 }])[0]
);
assert.equal(baseline.newTax.taxAmount, 417_500);
const pensionBonus = calculateBonusTaxScenarios(withPension, { annualBonus: 0 });
assert.equal(pensionBonus.annualTax, 12 * 417_500);
assert.equal(pensionBonus.scenarios[0].monthlyTaxes[0].tax, 417_500);
assert.equal(generateMultiYearProjection(withPension, { yearsToProject: 1, annualSalaryIncrease: 0 })[0].newTax.monthly, 417_500);
// Trần 3tr/tháng: đóng 5tr vẫn chỉ trừ 3tr
assert.equal(calculateBonusTaxScenarios({ ...base, pensionContribution: 5_000_000 }, { annualBonus: 0 }).annualTax, 12 * 417_500);

// ---- A2: phụ cấp + lương đóng BH giữ nguyên ở mọi tab ----
// BH trên 10tr = 1.050.000; phụ cấp chịu thuế 10tr → TNTT 30 + 10 - 1,05 - 15,5 = 23,45tr
//   thuế = 0,5 + 13,45×10% = 1.845.000
const withAllowances: SimulationBaseInput = {
  ...base,
  declaredSalary: 10_000_000,
  allowances: { meal: 0, phone: 0, transport: 0, hazardous: 0, clothing: 0, housing: 5_000_000, position: 5_000_000 },
};
const b2 = runSimulation(withAllowances, generateSalaryAdjustmentScenarios(withAllowances, [{ adjustmentType: 'percentage', value: 0 }])[0]);
assert.equal(b2.newTax.taxAmount, 1_845_000);
assert.equal(calculateBonusTaxScenarios(withAllowances, { annualBonus: 0 }).scenarios[0].monthlyTaxes[0].tax, 1_845_000);
assert.equal(generateMultiYearProjection(withAllowances, { yearsToProject: 1, annualSalaryIncrease: 0 })[0].newTax.monthly, 1_845_000);

// ---- Review TB1: "luật cũ" so theo kỳ 2025 (trần hưu trí 1tr, ăn ca không trần) ----
// Hưu trí 3tr: luật cũ chỉ trừ 1tr → TNTT 30 - 3,15 - 11 - 1 = 14,85tr
//   → 5tr×5% + 5tr×10% + 4,85tr×15% = 1.477.500; luật mới 417.500 → tiết kiệm năm 12.720.000
const proj = generateMultiYearProjection(withPension, { yearsToProject: 1, annualSalaryIncrease: 0 })[0];
assert.equal(proj.oldTax.monthly, 1_477_500);
assert.equal(proj.taxSavings, 12_720_000);
assert.equal(baseline.oldTax.taxAmount, 1_477_500);
// Ăn ca 2tr: kỳ 2025 miễn toàn bộ → TNTT 30 - 3,15 - 11 = 15,85tr → 0,25 + 0,5 + 5,85×15% = 1.627.500
const meal = { ...base, allowances: { meal: 2_000_000, phone: 0, transport: 0, hazardous: 0, clothing: 0, housing: 0, position: 0 } };
assert.equal(generateMultiYearProjection(meal, { yearsToProject: 1, annualSalaryIncrease: 0 })[0].oldTax.monthly, 1_627_500);

// ---- A23: tăng lương âm không làm lương âm ----
const neg = generateMultiYearProjection(base, { yearsToProject: 3, annualSalaryIncrease: -200 });
assert.ok(neg.every((y) => y.grossIncome >= 0));
assert.equal(neg[1].grossIncome, 0);

// ---- A22: code chết đã xóa ----
for (const dead of ['calculateBreakEvenSalary', 'compareSimulations', 'generateSimulationSummary']) {
  assert.equal((sim as Record<string, unknown>)[dead], undefined, dead);
}

console.log('misc-b1 simulator: OK');
