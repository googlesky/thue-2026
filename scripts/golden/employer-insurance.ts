import assert from 'node:assert/strict';
import { getFullEmployerCostResult, calculateNewTax, getInsuranceDetailed, calculateEmployerInsurance, DEFAULT_INSURANCE_OPTIONS } from '@/lib/taxCalculator';
import { encodeSnapshot, decodeSnapshot } from '@/lib/snapshotCodec';
import { createSnapshot, DEFAULT_OVERTIME_STATE, DEFAULT_VAT_STATE, DEFAULT_SEVERANCE_STATE } from '@/lib/snapshotTypes';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const near = (a: number, b: number, msg: string, eps = 1e-6) => { assert.ok(Math.abs(a - b) < eps, `${msg}: ${a} vs ${b}`); n++; };
const opts = DEFAULT_INSURANCE_OPTIONS;

// 5) Chi phí nhà tuyển dụng (engine): lương 60tr, kinh phí công đoàn 2% trên lương đóng BHXH có trần 50,6tr
let c = getFullEmployerCostResult({ grossIncome: 60_000_000, dependents: 0, region: 1, insuranceOptions: opts, includeUnionFee: true });
near(c.employerInsurance.unionFee, 1_012_000, 'KPCĐ 2% × 50,6tr');
near(c.employerInsurance.total, 50_600_000 * 0.205 + 60_000_000 * 0.01 + 1_012_000, 'DN đóng 17,5% + 3% (trần) + 1% BHTN + KPCĐ');
near(c.totalEmployerCost, 60_000_000 + c.employerInsurance.total, 'tổng chi phí');
near(c.employeeTax, calculateNewTax({ grossIncome: 60_000_000, dependents: 0 }).taxAmount, 'thuế NLĐ = engine');
// Lương khai báo 10tr: KPCĐ 200.000, BH trên 10tr, thuế trên lương thực 30tr
c = getFullEmployerCostResult({ grossIncome: 30_000_000, declaredSalary: 10_000_000, dependents: 1, region: 1, insuranceOptions: opts, includeUnionFee: true });
near(c.employerInsurance.unionFee, 200_000, 'KPCĐ trên lương khai báo');
near(c.employeeInsurance.total, 1_050_000, 'BH NLĐ 10,5% × 10tr');
near(c.employeeTax, (30_000_000 - 1_050_000 - 15_500_000 - 6_200_000) * 0.05, 'thuế 7,25tr × 5%');

// 6) Bảng bảo hiểm: công ty đóng thêm chỉ phần DN (không cộng phần NLĐ)
const emp = getInsuranceDetailed(20_000_000, 1, opts);
const com = calculateEmployerInsurance(20_000_000, 1, opts, false);
near(emp.total, 2_100_000, 'NLĐ 10,5%');
near(com.total, 4_300_000, 'DN 21,5%');

// 7) So sánh vùng: 30tr NET như nhau; 120tr khác do trần BHTN (106,2tr vùng I, 74tr vùng IV)
const net = (g: number, region: 1 | 2 | 3 | 4) => calculateNewTax({ grossIncome: g, dependents: 0, insuranceOptions: opts, region }).netIncome;
eq(net(30_000_000, 1), net(30_000_000, 4), '30tr: NET như nhau');
near(net(120_000_000, 4) - net(120_000_000, 1), (106_200_000 - 74_000_000) * 0.01 * (1 - 0.30), 'chênh BHTN 322.000 × (1 − 30%) = 225.400 (TNTT ~98,6tr bậc 30%)');
const noBhtn = (region: 1 | 4) => calculateNewTax({ grossIncome: 120_000_000, dependents: 0, insuranceOptions: { ...opts, bhtn: false }, region }).netIncome;
eq(noBhtn(1), noBhtn(4), 'tắt BHTN: NET như nhau mọi vùng');

// Snapshot: overtime includeHolidayBasePay mặc định false, round-trip giữ true/false và cờ afterDayOvertime
const rt = (overtime: typeof DEFAULT_OVERTIME_STATE) => decodeSnapshot(encodeSnapshot(createSnapshot({}, 'overtime', { overtime })))!.tabs.overtime;
eq(DEFAULT_OVERTIME_STATE.includeHolidayBasePay, false, 'mặc định false');
eq(rt({ ...DEFAULT_OVERTIME_STATE, includeHolidayBasePay: true }).includeHolidayBasePay, true, 'round-trip true');
eq(rt({ ...DEFAULT_OVERTIME_STATE }).includeHolidayBasePay, false, 'round-trip false');
const entries = [{ id: 'a', type: 'weekday' as const, shift: 'night' as const, hours: 2, afterDayOvertime: true }];
eq(rt({ ...DEFAULT_OVERTIME_STATE, monthlySalary: 20_000_000, entries }).entries, entries, 'round-trip entry có cờ 210%');
// VAT/severance default: ngày local YYYY-MM-DD, field mới có default
const now = new Date();
eq(DEFAULT_VAT_STATE.customDate, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, 'customDate local');
eq([DEFAULT_VAT_STATE.taxpayerType, DEFAULT_VAT_STATE.outputNotReduced], ['business', false], 'VAT default mới');
eq([DEFAULT_SEVERANCE_STATE.unemploymentInsuranceYears, DEFAULT_SEVERANCE_STATE.paidYears], [0, 0], 'severance default mới');
const oldSev = createSnapshot({}, 'severance', { severance: { type: 'severance', totalAmount: 1, averageSalary: 1, yearsWorked: 1 } as never });
eq(oldSev.tabs.severance.paidYears, 0, 'state cũ thiếu field mới → default');
console.log(`MISC OK: ${n} assertions`);
