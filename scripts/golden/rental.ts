import assert from 'node:assert/strict';
import { calculateRentalIncomeTax, createDefaultExpenses, RentalProperty, PROPERTY_TYPE_LABELS } from '@/lib/rentalIncomeTaxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const prop = (id: string, monthlyRent: number, occupiedMonths = 12, expenses = createDefaultExpenses()): RentalProperty =>
  ({ id, name: id, type: 'residential', address: '', monthlyRent, occupiedMonths, expenses });

// R1 (2026): A 960tr + B 600tr = 1,56 tỷ -> TNCN (1,56 - 1) tỷ x 5% = 28tr; GTGT 1,56 tỷ x 5% = 78tr
const r1 = calculateRentalIncomeTax({ properties: [prop('A', 80e6), prop('B', 50e6)], useActualExpenses: false, year: 2026 });
eq([r1.summary.totalPIT, r1.summary.totalVAT, r1.summary.totalTax], [28_000_000, 78_000_000, 106_000_000], 'R1 BĐS 5% phần vượt 1 tỷ');
eq(r1.properties.map(p => p.thresholdDeduction), [960e6, 40e6], 'R1 trừ ngưỡng theo hợp đồng, tổng 1 tỷ');
eq(r1.summary.thresholdUsed, 1e9, 'R1 ngưỡng đã trừ');
eq(r1.summary.effectiveTaxRate, 6.79, 'R1 thuế suất thực tế');
// Chi phí ước tính 10% chỉ ảnh hưởng thu nhập ròng: A = 960 - 48 (GTGT) - 96 = 816tr
eq(r1.properties[0].deemedNetIncome, 816e6, 'R1 thu nhập ròng ước tính');

// R2 (2026): 900tr -> không thuế
const r2 = calculateRentalIncomeTax({ properties: [prop('A', 75e6)], useActualExpenses: false, year: 2026 });
eq([r2.summary.isTaxable, r2.summary.totalTax], [false, 0], 'R2 dưới ngưỡng');

// R3 (2025): 240tr > 100tr -> 5% + 5% trên toàn bộ doanh thu
const r3 = calculateRentalIncomeTax({ properties: [prop('A', 20e6)], useActualExpenses: false, year: 2025 });
eq([r3.summary.totalPIT, r3.summary.totalVAT], [12_000_000, 12_000_000], 'R3 năm 2025');

// R4: chi phí thực tế không đổi số thuế
const exp = { ...createDefaultExpenses(), maintenance: 30e6, management: 20e6 };
const r4 = calculateRentalIncomeTax({ properties: [prop('A', 100e6, 12, exp)], useActualExpenses: true, year: 2026 });
eq([r4.summary.totalTax, r4.properties[0].actualExpenses, r4.properties[0].actualNetIncome], [10_000_000 + 60_000_000, 50e6, 1.2e9 - 70e6 - 50e6], 'R4 chi phí thực tế');

// R5: 0 tháng (ô đang xóa) không NaN
const r5 = calculateRentalIncomeTax({ properties: [prop('A', 10e6, 0)], useActualExpenses: false, year: 2026 });
eq([r5.summary.totalTax, r5.summary.effectiveTaxRate], [0, 0], 'R5 0 tháng');
eq(Object.keys(PROPERTY_TYPE_LABELS), ['residential', 'commercial', 'land'], 'R6 chỉ còn BĐS');
console.log(`BUS rental OK: ${n} assertions`);
