// Golden: engine thuế tiền lương (taxCalculator) — ma trận hồi quy + các mốc hiệu lực theo ngày.
// Luật đổi có chủ đích → chạy `GOLDEN_UPDATE=1 node --import tsx scripts/golden/engine.ts` để ghi lại
// số chuẩn (fixtures/engine-matrix.json), rồi soát diff của file JSON trước khi commit.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import * as cur from '@/lib/taxCalculator';
import { grossToNet, netToGross } from '@/lib/grossNetCalculator';

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
let n = 0;
const ok = (c: boolean, msg: string) => { assert.ok(c, msg); n++; };

// 1) Ma trận hồi quy: 11 mức lương × 3 mức NPT × 4 vùng × luật cũ/mới, chốt tại 30/09/2026
const FIXTURE = `${process.cwd()}/scripts/golden/fixtures/engine-matrix.json`;
const FIELDS = ['taxAmount', 'netIncome', 'insuranceDeduction', 'taxableIncome', 'totalIncome'] as const;
const incomes = [0, 5e6, 15.5e6, 20e6, 30e6, 46.8e6, 50.6e6, 60e6, 99.2e6, 120e6, 250e6];
const rows: Array<Record<string, number | string>> = [];
for (const g of incomes) for (const dep of [0, 1, 3]) for (const region of [1, 2, 3, 4] as const) {
  const input = { grossIncome: g, dependents: dep, region, otherDeductions: 1e6, calculationDate: D(2026, 9, 30),
    allowances: { ...cur.DEFAULT_ALLOWANCES, phone: 500e3, clothing: 600e3, housing: 2e6 } };
  for (const fn of ['calculateNewTax', 'calculateOldTax'] as const) {
    const r = cur[fn](input);
    rows.push({ key: `${fn} ${g} dep${dep} r${region}`, ...Object.fromEntries(FIELDS.map((k) => [k, r[k]])) });
  }
}
if (process.env.GOLDEN_UPDATE) {
  writeFileSync(FIXTURE, `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`);
  console.log(`Đã ghi ${rows.length} dòng vào ${FIXTURE}`);
}
const expected = JSON.parse(readFileSync(FIXTURE, 'utf8')) as typeof rows;
assert.equal(rows.length, expected.length, 'số dòng ma trận');
rows.forEach((r, i) => {
  assert.equal(r.key, expected[i].key, 'thứ tự dòng');
  for (const k of FIELDS) ok(Math.abs((r[k] as number) - (expected[i][k] as number)) < 1e-6, `${r.key} ${k}: ${r[k]} ≠ ${expected[i][k]}`);
});

// 2) Tiền ăn ca theo ngày
const meal = { ...cur.DEFAULT_ALLOWANCES, meal: 2_000_000 };
const bd = (d: Date) => cur.calculateAllowancesBreakdown(meal, d);
ok(bd(D(2025, 6, 14)).mealTaxable === 1_270_000, 'ăn ca 14/6/2025 → trần 730k');
ok(bd(D(2025, 6, 15)).mealTaxable === 0, 'ăn ca 15/6/2025 → không trần');
ok(bd(D(2026, 6, 30)).mealTaxable === 0, 'ăn ca 30/6/2026 → không trần');
ok(bd(D(2026, 7, 1)).mealTaxable === 800_000 && bd(D(2026, 7, 1)).mealExempt === 1_200_000, 'ăn ca 01/7/2026 → trần 1,2tr');
ok(bd(D(2026, 7, 1)).taxable === 800_000 && bd(D(2026, 7, 1)).total === 2_000_000, 'ăn ca: tổng và phần chịu thuế');

// Ăn ca vào thuế: GROSS 30tr, ăn ca 2tr, sau 01/7/2026 → TNTT tăng 800k
const t0 = cur.calculateNewTax({ grossIncome: 30e6, dependents: 0, calculationDate: D(2026, 9, 29) });
const t1 = cur.calculateNewTax({ grossIncome: 30e6, dependents: 0, allowances: meal, calculationDate: D(2026, 9, 29) });
ok(t1.taxableIncome - t0.taxableIncome === 800_000, 'ăn ca vượt 800k vào TNTT');
ok(Math.abs(t1.taxAmount - t0.taxAmount - 80_000) < 1e-6, 'thuế tăng 80k (bậc 10%)');
ok(t1.netIncome - t0.netIncome === 2_000_000 - 80_000, 'NET tăng 2tr − 80k');

// 3) Trần bảo hiểm theo ngày
const ins = (d: Date) => cur.calculateTaxForDate({ grossIncome: 60e6, dependents: 0, calculationDate: d }).insuranceDeduction;
ok(Math.abs(ins(D(2025, 6, 15)) - (46.8e6 * 0.095 + 60e6 * 0.01)) < 1e-6, 'BH 2025 trần 46,8tr');
ok(Math.abs(ins(D(2026, 6, 30)) - (46.8e6 * 0.095 + 60e6 * 0.01)) < 1e-6, 'BH 30/6/2026 trần 46,8tr');
ok(Math.abs(ins(D(2026, 7, 1)) - (50.6e6 * 0.095 + 60e6 * 0.01)) < 1e-6, 'BH 01/7/2026 trần 50,6tr');
ok(cur.calculateTaxForDate({ grossIncome: 60e6, dependents: 0, calculationDate: D(2025, 6, 15) }).taxConfig.isNew2026 === false, '2025 dùng luật cũ');
const hi = cur.calculateTaxForDate({ grossIncome: 150e6, dependents: 0, calculationDate: D(2025, 6, 15) });
ok(Math.abs(hi.insuranceDetail.bhtn - 992_000) < 1e-6, 'BHTN 2025 vùng I trần 99,2tr');

// 4) Trần hưu trí tự nguyện + BH nhân thọ
ok(cur.getVoluntaryPensionCap(D(2025, 12, 31)) === 1_000_000, 'hưu trí 2025: 1tr');
ok(cur.getVoluntaryPensionCap(D(2026, 1, 1)) === 3_000_000, 'hưu trí 2026: 3tr');

// 5) GROSS ⇄ NET hội tụ khi ăn ca vượt trần
for (const g of [15e6, 30e6, 45e6, 80e6]) {
  const common = { dependents: 1, hasInsurance: true, useNewLaw: true, region: 1 as const, allowances: meal };
  const fwd = grossToNet({ amount: g, type: 'gross', ...common });
  const back = netToGross({ amount: fwd.net, type: 'net', ...common });
  ok(Math.abs(back.gross - g) <= 2, `GROSS ⇄ NET ${g}: ${back.gross}`);
}

// 6) Engine tự chặn trần hưu trí (pensionContribution), cộng vào otherDeductions
const p0 = cur.calculateNewTax({ grossIncome: 40e6, dependents: 0, otherDeductions: 500e3, calculationDate: D(2026, 9, 29) });
const p5 = cur.calculateNewTax({ grossIncome: 40e6, dependents: 0, otherDeductions: 500e3, pensionContribution: 5e6, calculationDate: D(2026, 9, 29) });
ok(p5.otherDeductions === 3_500_000, 'hưu trí 5tr → trừ 3tr + từ thiện 500k');
ok(p0.taxableIncome - p5.taxableIncome === 3_000_000, 'TNTT giảm đúng 3tr');
const p25 = cur.calculateTaxForDate({ grossIncome: 40e6, dependents: 0, pensionContribution: 5e6, calculationDate: D(2025, 6, 15) });
ok(p25.otherDeductions === 1_000_000, 'năm 2025 trần 1tr');
const pneg = cur.calculateNewTax({ grossIncome: 40e6, dependents: 0, pensionContribution: -2e6 });
ok(pneg.otherDeductions === 0, 'hưu trí âm → 0');

console.log(`ENGINE OK: ${n} assertions`);
