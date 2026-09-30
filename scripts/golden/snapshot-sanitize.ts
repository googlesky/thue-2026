import assert from 'node:assert/strict';
import { sanitizeSharedState, DEFAULT_SHARED_STATE } from '@/lib/snapshotTypes';
const bad: any = { ...DEFAULT_SHARED_STATE, grossIncome: '30000000', dependents: -3, region: 99,
  otherDeductions: -2e7, pensionContribution: Infinity, declaredSalary: 1e20,
  insuranceOptions: { bhxh: 'no', bhyt: true, bhtn: false }, allowances: { meal: 'abc', transport: 800000 } };
const s = sanitizeSharedState(bad);
assert.equal(s.grossIncome, 30_000_000);
assert.equal(s.dependents, 0);
assert.equal(s.region, 1);
assert.equal(s.otherDeductions, 0);
assert.equal(s.pensionContribution, 0);
assert.equal(s.declaredSalary, 10_000_000_000);
assert.deepEqual(s.insuranceOptions, { bhxh: true, bhyt: true, bhtn: false });
assert.equal(s.allowances!.meal, 0);
assert.equal(s.allowances!.transport, 800_000);
assert.equal(s.allowances!.housing, 0);
const good = sanitizeSharedState({ ...DEFAULT_SHARED_STATE, grossIncome: 42_500_000, dependents: 2, region: 3 });
assert.equal(good.grossIncome, 42_500_000); assert.equal(good.dependents, 2); assert.equal(good.region, 3);
assert.equal(good.declaredSalary, undefined);
console.log('SANITIZE OK');
const legacy: any = { ...DEFAULT_SHARED_STATE, hasInsurance: false, insuranceOptions: undefined };
const l = sanitizeSharedState(legacy);
assert.deepEqual(l.insuranceOptions, { bhxh: false, bhyt: false, bhtn: false }, 'legacy hasInsurance=false');
console.log('SANITIZE LEGACY OK');
