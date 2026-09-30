import assert from 'node:assert/strict';
import { calculateSpecialIncomeTax as calc } from '@/lib/specialIncomeTaxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const pick = (r: ReturnType<typeof calc>) => [r.deduction, r.taxableAmount, r.taxAmount, r.netAmount, r.isExempt];

// Tên miền .vn: (100tr − 20tr) × 5% = 4tr
eq(pick(calc({ incomeType: 'domain', amount: 100_000_000 })), [0, 80_000_000, 4_000_000, 96_000_000, false], '.vn 100tr');
eq(pick(calc({ incomeType: 'domain', amount: 20_000_000 })), [0, 0, 0, 20_000_000, true], '.vn đúng 20tr -> không nộp');
eq(calc({ incomeType: 'domain', amount: 20_000_021 }).taxAmount, 1, 'phần vượt 21 đ × 5% = 1,05 -> 1 đ');
eq(calc({ incomeType: 'domain', amount: 100_000_000, vehicleResidualValue: 50_000_000 }).deduction, 0, 'giá trị xe chỉ trừ cho biển số');

// Biển số: (1,5 tỷ − 1,2 tỷ giá trị còn lại của xe − 20tr) × 5% = 280tr × 5% = 14tr
eq(pick(calc({ incomeType: 'license_plate', amount: 1_500_000_000, vehicleResidualValue: 1_200_000_000 })),
  [1_200_000_000, 280_000_000, 14_000_000, 1_486_000_000, false], 'biển số trừ giá trị còn lại của xe');
eq(pick(calc({ incomeType: 'license_plate', amount: 800_000_000 })),
  [0, 780_000_000, 39_000_000, 761_000_000, false], 'biển số không nhập giá trị xe (mặc định 0)');
eq(pick(calc({ incomeType: 'license_plate', amount: 500_000_000, vehicleResidualValue: 900_000_000 })),
  [500_000_000, 0, 0, 500_000_000, true], 'giá trị xe > giá chuyển nhượng -> không âm');

// Tín chỉ các-bon: lần đầu bởi cá nhân được cấp -> miễn; lần sau 5%
const c1 = calc({ incomeType: 'carbon', amount: 500_000_000, carbonFirstTransfer: true });
eq([c1.taxableAmount, c1.taxAmount, c1.isExempt], [0, 0, true], 'các-bon lần đầu miễn');
assert.match(c1.exemptReason ?? '', /Điều 34 khoản 1/); n++;
const c2 = calc({ incomeType: 'carbon', amount: 500_000_000 });
eq([c2.taxableAmount, c2.taxAmount, c2.exemptReason], [480_000_000, 24_000_000, undefined], 'các-bon chuyển nhượng lại 5%');
eq(calc({ incomeType: 'domain', amount: 500_000_000, carbonFirstTransfer: true }).taxAmount, 24_000_000, 'cờ các-bon không áp cho loại khác');
eq(calc({ incomeType: 'domain', amount: 1 }).threshold, 20_000_000, 'ngưỡng 20tr/lần');

console.log(`SPECIAL OK: ${n} assertions`);
