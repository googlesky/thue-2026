import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { calculateNewTax, DEFAULT_ALLOWANCES } from '@/lib/taxCalculator';
import { DEFAULT_SHARED_STATE, mergeSnapshotWithDefaults, DEFAULT_SNAPSHOT } from '@/lib/snapshotTypes';
import { createInitialSlipData, computeSlipTax } from '@/components/SalarySlip/SalarySlipGenerator';
import ESOPCalculator from '@/components/ESOPCalculator/ESOPCalculator';
import AnnualSettlement from '@/components/AnnualSettlement/AnnualSettlement';

// 1) Phiếu lương kỳ 09/2026 khớp tab chính khi có ăn ca vượt trần + hưu trí + từ thiện
const state = { ...DEFAULT_SHARED_STATE, grossIncome: 40_000_000, dependents: 1, otherDeductions: 500_000, pensionContribution: 4_000_000,
  allowances: { ...DEFAULT_ALLOWANCES, meal: 2_000_000, phone: 300_000, housing: 1_000_000 } };
const main = calculateNewTax({ grossIncome: state.grossIncome, dependents: state.dependents, otherDeductions: state.otherDeductions,
  pensionContribution: state.pensionContribution, insuranceOptions: state.insuranceOptions, region: state.region, allowances: state.allowances });
const slip = createInitialSlipData(state);
slip.payPeriod = { ...slip.payPeriod, month: 9, year: 2026 };
const r = computeSlipTax(slip, state);
assert.equal(Math.round(r.taxAmount), Math.round(main.taxAmount), `slip tax ${r.taxAmount} vs main ${main.taxAmount}`);
assert.equal(main.allowancesBreakdown!.mealTaxable, 800_000);
assert.equal(main.otherDeductions, 3_500_000, 'hưu trí chặn 3tr + từ thiện 500k');

// 2) Snapshot sửa tay: tab ESOP/Quyết toán nhận số âm/khổng lồ -> render SSR không throw, không NaN
const bad: any = mergeSnapshotWithDefaults({ ...DEFAULT_SNAPSHOT, tabs: { ...DEFAULT_SNAPSHOT.tabs,
  esop: { ...(DEFAULT_SNAPSHOT.tabs as any).esop, numberOfShares: -5, sellPrice: 'abc', grantPrice: 1e15 },
  annualSettlement: { ...(DEFAULT_SNAPSHOT.tabs as any).annualSettlement, medicalExpenses: 1e12, educationExpenses: -7 } } } as any);
for (const [name, el] of [
  ['esop', <ESOPCalculator key="e" sharedState={bad.sharedState} onStateChange={() => {}} tabState={bad.tabs.esop} onTabStateChange={() => {}} />],
  ['settlement', <AnnualSettlement key="a" sharedState={bad.sharedState} tabState={bad.tabs.annualSettlement} onTabStateChange={() => {}} />],
] as const) {
  const html = renderToString(el as any);
  assert.ok(!/NaN|Infinity|undefined/.test(html.replace(/<[^>]+>/g, ' ')), `${name}: NaN/Infinity/undefined trong HTML`);
}
console.log('INTEGRATION OK');
