// Golden test GROSS ⇄ NET đồng bộ engine (MISC-C)
import assert from 'node:assert/strict';
import {
  calculateNewTax, DEFAULT_INSURANCE_OPTIONS, DEFAULT_OTHER_INCOME, DEFAULT_ALLOWANCES, SharedTaxState,
} from '@/lib/taxCalculator';
import { toEngineInput, netToGrossResult } from '@/components/GrossNetConverter';

// State part-ME: 40tr, 1 NPT, không BHTN, giảm trừ khác 2tr, hưu trí 1tr (ngày hôm nay ≥ 01/7/2026)
const s: SharedTaxState = {
  grossIncome: 40_000_000, dependents: 1, otherDeductions: 2_000_000, hasInsurance: true,
  insuranceOptions: { bhxh: true, bhyt: true, bhtn: false }, region: 1, pensionContribution: 1_000_000,
  otherIncome: DEFAULT_OTHER_INCOME,
};
// BH 3.200.000 + 600.000; TNTT 40 − 3,8 − 15,5 − 6,2 − 2 − 1 = 11.500.000 → 500.000 + 150.000 = 650.000; NET 35.550.000
const g = calculateNewTax(toEngineInput(s));
assert.equal(g.insuranceDeduction, 3_800_000);
assert.equal(g.taxAmount, 650_000);
assert.equal(g.netIncome, 35_550_000);

// Hưu trí truyền riêng, engine chặn 3tr: 5tr → TNTT 9.500.000 → 475.000
assert.equal(calculateNewTax(toEngineInput({ ...s, pensionContribution: 5_000_000 })).taxAmount, 475_000);

// NET → GROSS: GROSS hiện tại đã khớp → giữ nguyên (không trôi khi đổi chế độ)
assert.equal(netToGrossResult(35_550_000, toEngineInput(s)).grossIncome, 40_000_000);
// Từ GROSS khác → tìm lại đúng 40.000.000
const back = netToGrossResult(35_550_000, toEngineInput({ ...s, grossIncome: 30_000_000 }));
assert.equal(back.grossIncome, 40_000_000);
assert.equal(back.netIncome, 35_550_000);

// Quét: GROSS luôn nguyên, NET lệch mục tiêu ≤ 1đ (có phụ cấp, lương khai báo, vượt trần BH)
const states: SharedTaxState[] = [
  s,
  { ...s, insuranceOptions: DEFAULT_INSURANCE_OPTIONS, otherDeductions: 0, pensionContribution: 0, dependents: 0 },
  { ...s, declaredSalary: 5_000_000, allowances: { ...DEFAULT_ALLOWANCES, meal: 2_000_000, phone: 500_000, position: 3_000_000 } },
  { ...s, region: 4, dependents: 3, hasInsurance: false, insuranceOptions: { bhxh: false, bhyt: false, bhtn: false } },
];
for (const st of states) {
  for (const net of [3_000_000, 12_345_678, 25_000_000, 48_000_000, 99_999_999, 350_000_000, 2_000_000_000]) {
    const r = netToGrossResult(net, toEngineInput({ ...st, grossIncome: 1 }));
    const minNet = calculateNewTax(toEngineInput({ ...st, grossIncome: 0 })).netIncome;
    if (net < minNet) { assert.equal(r.grossIncome, 0); continue; } // NET nhỏ hơn phụ cấp miễn thuế − BH: vô nghiệm
    assert.ok(Number.isInteger(r.grossIncome), `gross nguyên: ${r.grossIncome}`);
    assert.ok(Math.abs(r.netIncome - net) <= 1, `net ${net} → ${r.netIncome} (gross ${r.grossIncome})`);
    // GROSS → NET của chính GROSS đó khớp engine
    assert.equal(calculateNewTax(toEngineInput({ ...st, grossIncome: r.grossIncome })).netIncome, r.netIncome);
  }
}

// Không có nghiệm: phụ cấp miễn thuế 3tr > NET 2tr → GROSS 0, NET 3tr (UI báo không khớp)
const noSol = netToGrossResult(2_000_000, toEngineInput({ ...s, allowances: { ...DEFAULT_ALLOWANCES, phone: 3_000_000 } }));
assert.equal(noSol.grossIncome, 0);
assert.ok(Math.abs(noSol.netIncome - 2_000_000) > 1);
// Vượt giới hạn nhập: GROSS chặn ở 10 tỷ
assert.ok(netToGrossResult(100_000_000_000, toEngineInput(s)).grossIncome <= 10_000_000_000);

console.log('gross-net golden OK');
