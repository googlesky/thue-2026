import assert from 'node:assert/strict';
import { compareBusinessForms, BUSINESS_CATEGORIES, formatPercent } from '@/lib/businessFormComparisonCalculator';
import { calculateFreelancerTax, getSelfHealthInsuranceAnnual } from '@/lib/freelancerCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const near = (a: number, b: number, msg: string) => { assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`); n++; };
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const base = { expenseRatio: 0.3, businessCategory: 'services' as const, region: 1 as const, dependents: 0, hasSelfInsurance: false };

// Freelancer 600tr/năm, 0 NPT, không BH: 50tr/tháng - 15,5tr = 34,5tr -> 0,5 + 2 + 0,9 = 3,4tr/tháng = 40,8tr/năm
// Tạm khấu trừ 10% = 60tr (mỗi lần 50tr >= 5tr) -> quyết toán được hoàn 19,2tr
eq(calculateFreelancerTax(600e6, 0, { date: D(2026, 9, 29) }), { withheld: 60_000_000, finalTax: 40_800_000, settlement: -19_200_000 }, 'FL 600tr');
eq(calculateFreelancerTax(48e6, 0, { date: D(2026, 9, 29) }), { withheld: 0, finalTax: 0, settlement: 0 }, 'FL 4tr/lần < 5tr: không khấu trừ');
eq(calculateFreelancerTax(48e6, 0, { date: D(2026, 6, 30) }).withheld, 4_800_000, 'FL trước 01/7/2026 ngưỡng 2tr');
eq(getSelfHealthInsuranceAnnual(D(2026, 9, 29)), 1_366_200, 'BHYT tự mua 4,5% x 2,53tr x 12');

// A: 600tr, chi phí 30%, dịch vụ, vùng 1 (hôm nay 29/9/2026)
const a = compareBusinessForms({ annualRevenue: 600e6, ...base });
eq([a.freelancer.expenses, a.freelancer.finalTax, a.freelancer.withholdingTax, a.freelancer.settlement], [180e6, 40_800_000, 60_000_000, -19_200_000], 'A freelancer');
eq(a.freelancer.netIncome, 600e6 - 180e6 - 40_800_000, 'A freelancer net trừ chi phí');
near(a.freelancer.effectiveTaxRate, 0.068, 'A freelancer thuế suất thực tế');
eq([a.householdBusiness.isExempt, a.householdBusiness.totalTax, a.householdBusiness.netIncome], [true, 0, 420e6], 'A hộ KD <= 1 tỷ');
// NV: BH 8% + 1,5% + 1% x 50tr = 5,25tr; TNTT = 50 - 5,25 - 15,5 = 29,25tr -> 0,5 + 1,925 = 2,425tr/tháng
eq([a.employee.insuranceEmployee, a.employee.taxAmount, a.employee.netIncome], [63e6, 29_100_000, 507_900_000], 'A nhân viên');
eq(a.employee.insuranceEmployer, 129_000_000, 'A BH công ty 21,5% x 50tr x 12');
eq(a.recommendation, 'employee', 'A khuyến nghị');

// B: BHTN phía công ty dùng trần 20 x lương tối thiểu vùng: 150tr/tháng vùng 4
// BHXH 17,5% + BHYT 3% x 50,6tr = 10.373.000; BHTN 1% x 74tr = 740.000 -> 11.113.000/tháng
const b = compareBusinessForms({ annualRevenue: 1.8e9, ...base, region: 4 });
eq(b.employee.insuranceEmployer, 11_113_000 * 12, 'B BH công ty đúng trần BHTN');

// C: hộ KD 2 tỷ dịch vụ: tỷ lệ (2-1) tỷ x 2% = 20tr < thu nhập (2-0,6) x 15% = 210tr -> chọn tỷ lệ
const c = compareBusinessForms({ annualRevenue: 2e9, ...base });
eq([c.householdBusiness.method, c.householdBusiness.pitTax, c.householdBusiness.vatTax], ['khoan', 20_000_000, 100_000_000], 'C tỷ lệ có lợi');
const c2 = compareBusinessForms({ annualRevenue: 2e9, ...base, expenseRatio: 0.95 });
eq([c2.householdBusiness.method, c2.householdBusiness.pitTax], ['income', 15_000_000], 'C2 chi phí 95% -> thu nhập (2-1,9) x 15% = 15tr');

// D: > 3 tỷ bắt buộc thu nhập: 5 tỷ, CP 30% -> 3,5 tỷ x 17% = 595tr
const d = compareBusinessForms({ annualRevenue: 5e9, ...base });
eq([d.householdBusiness.method, d.householdBusiness.pitTax, d.householdBusiness.vatTax], ['income', 595_000_000, 250_000_000], 'D > 3 tỷ');

// E: DT = 0 không NaN
const e = compareBusinessForms({ annualRevenue: 0, ...base });
eq([e.employee.effectiveTaxRate, e.freelancer.effectiveTaxRate, e.householdBusiness.effectiveTaxRate], [0, 0, 0], 'E không NaN');

// F: BHYT tự mua được trừ khi quyết toán freelancer: TNTT 34,5tr - 113.850 -> 2,5tr + 20% x 4.386.150 = 3.377.230/tháng
const f = compareBusinessForms({ annualRevenue: 600e6, ...base, hasSelfInsurance: true });
eq([f.freelancer.finalTax, f.freelancer.netIncome], [40_526_760, 600e6 - 180e6 - 40_526_760 - 1_366_200], 'F BHYT');
eq(f.householdBusiness.netIncome, 420e6 - 1_366_200, 'F hộ KD trừ BHYT');

eq(BUSINESS_CATEGORIES.length, 6, 'dropdown đủ 6 nhóm');
eq(formatPercent(0.105), '10,5%', 'định dạng %');
console.log(`BUS businessForm OK: ${n} assertions`);
