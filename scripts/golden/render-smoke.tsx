// Smoke SSR: render 3 component với dữ liệu biên (lương 0, 300tr) để bắt lỗi runtime/NaN
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TaxExemptionChecker } from '@/components/TaxExemptionChecker';
import { TaxPlanningSimulator } from '@/components/TaxPlanningSimulator';
import { TaxOptimizationTips } from '@/components/TaxOptimizationTips';
import { DEFAULT_INSURANCE_OPTIONS } from '@/lib/taxCalculator';

const html1 = renderToStaticMarkup(<TaxExemptionChecker />);
assert.ok(html1.includes('Khoản tra cứu') && !html1.includes('100%'));
assert.ok(html1.includes('khoản miễn thuế mới hoặc mở rộng theo Luật 109/2025/QH15'));
for (const gross of [0, 30_000_000, 300_000_000]) {
  const input = {
    grossIncome: gross, dependents: 1, hasInsurance: true, insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
    region: 1 as const, otherDeductions: 0, pensionContribution: 0,
  };
  const html2 = renderToStaticMarkup(<TaxPlanningSimulator input={input} />);
  const html3 = renderToStaticMarkup(<TaxOptimizationTips input={input} />);
  for (const h of [html2, html3]) assert.ok(!/NaN|Infinity|undefined/.test(h), `gross ${gross}`);
}
console.log('misc-b1 render: OK');
