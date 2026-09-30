import assert from 'node:assert/strict';
import * as fl from '@/lib/freelancerCalculator';
import { calculateNewTax } from '@/lib/taxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const today = D(2026, 9, 29);

// 600tr/năm, 0 NPT: 3,4tr/tháng -> 40,8tr; tạm khấu trừ 60tr -> được hoàn 19,2tr; NET/tháng 46,6tr
const a = fl.calculateFreelancerTax(600e6, 0, { date: today });
eq(a, { withheld: 60_000_000, finalTax: 40_800_000, settlement: -19_200_000 }, 'FL 600tr');
eq(50_000_000 - a.finalTax / 12, 46_600_000, 'FL NET tháng');
// 1 NPT: 50 - 15,5 - 6,2 = 28,3tr -> 0,5 + 1,83 = 2,33tr/tháng -> 27,96tr/năm
eq(fl.calculateFreelancerTax(600e6, 1, { date: today }).finalTax, 27_960_000, 'FL 1 NPT');
// 200tr/tháng: TNTT 184,5tr -> 184,5 x 35% - 14,5 = 50,075tr/tháng -> 600,9tr/năm; khấu trừ 240tr -> nộp thêm 360,9tr
eq(fl.calculateFreelancerTax(2.4e9, 0, { date: today }), { withheld: 240_000_000, finalTax: 600_900_000, settlement: 360_900_000 }, 'FL cao nộp thêm');
// Lũy tiến theo năm = biểu tháng x 12 (không dùng thuế cố định 10%)
eq(fl.calculateFreelancerTax(360e6, 0, { date: today }).finalTax, calculateNewTax({ grossIncome: 30e6, dependents: 0, hasInsurance: false }).taxAmount * 12, 'FL = biểu lũy tiến');
// Ngưỡng khấu trừ theo ngày: 3tr/lần: trước 1/7/2026 (2tr) bị khấu trừ, từ 1/7/2026 (5tr) không
eq([fl.calculateFreelancerTax(36e6, 0, { date: D(2026, 6, 30) }).withheld, fl.calculateFreelancerTax(36e6, 0, { date: D(2026, 7, 1) }).withheld], [3_600_000, 0], 'FL ngưỡng 2tr -> 5tr');
// Dead code đã xóa
for (const k of ['calculateFreelancerComparison', 'generateComparisonRange', 'calculateBreakEven', 'WITHHOLDING_THRESHOLD', 'calculateCreatorTax', 'FREELANCER_PROS', 'FREELANCER_TAX_RATE']) {
  eq(k in fl, false, `đã xóa ${k}`);
}
eq(fl.DEFAULT_USD_EXCHANGE_RATE, 25_400, 'giữ hằng cho snapshot cũ');
console.log(`BUS freelancer OK: ${n} assertions`);
