import assert from 'node:assert/strict';
import { grossToNet, netToGross } from '@/lib/grossNetCalculator';
import { calculateNewTax, DEFAULT_ALLOWANCES } from '@/lib/taxCalculator';
let n = 0;
const opts = [{ bhxh: true, bhyt: true, bhtn: true }, { bhxh: true, bhyt: true, bhtn: false }, { bhxh: false, bhyt: false, bhtn: false }];
for (const g of [8e6, 20e6, 40e6, 55e6, 120e6]) for (const io of opts) for (const dep of [0, 2]) for (const od of [0, 2e6]) for (const pc of [0, 1e6, 5e6]) {
  const base = { dependents: dep, hasInsurance: io.bhxh, insuranceOptions: io, useNewLaw: true, region: 2 as const,
    otherDeductions: od, pensionContribution: pc, allowances: { ...DEFAULT_ALLOWANCES, meal: 1.5e6, housing: 1e6 } };
  const fwd = grossToNet({ ...base, amount: g, type: 'gross' });
  const eng = calculateNewTax({ grossIncome: g, dependents: dep, hasInsurance: io.bhxh, insuranceOptions: io, region: 2,
    otherDeductions: od, pensionContribution: pc, allowances: base.allowances });
  assert.ok(Math.abs(fwd.net - eng.netIncome) < 1e-6, `grossToNet == engine ${g}`); n++;
  const back = netToGross({ ...base, amount: fwd.net, type: 'net' });
  assert.ok(Math.abs(back.gross - g) <= 2, `roundtrip ${g} ${JSON.stringify(io)} od${od} pc${pc}: ${back.gross}`); n++;
}
console.log(`GROSSNET-ENGINE OK: ${n} assertions`);
