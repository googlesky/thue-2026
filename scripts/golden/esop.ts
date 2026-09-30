import assert from 'node:assert/strict';
import { calculateESOPTax, type ESOPInput } from '@/lib/esopCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const salary = (g: number) => ({ grossIncome: g, dependents: 0, calculationDate: D(2026, 9, 29) });
const esop = (p: Partial<ESOPInput>): ESOPInput => ({
  shareType: 'esop', numberOfShares: 0, purchasePrice: 0, parValue: 10_000, bookAmount: 0, sellPrice: 0,
  salary: salary(60_000_000), ...p,
});

// A) ESOP 20.000 CP, mua 4.000, mệnh giá 10.000, bán 50.000; lương 60tr (bậc 20%)
//    TN tiền lương = 20.000×10.000 − 20.000×4.000 = 120tr; khấu trừ 10% = 12tr; 0,1% × 1 tỷ = 1tr
//    Tháng: BH = 50,6tr×9,5% + 60tr×1% = 5.407.000; TNTT = 60 − 5,407 − 15,5 = 39,093tr
//    Thuế tháng = 0,5 + 2 + 9,093×20% = 4.318.600 -> năm 51.823.200
//    Có ESOP: +10tr/tháng -> TNTT 49,093tr -> 6.318.600 -> năm 75.823.200; tăng 24tr (20%)
const a = calculateESOPTax(esop({ numberOfShares: 20_000, purchasePrice: 4_000, sellPrice: 50_000 }));
eq(a.saleValue, 1_000_000_000, 'A giá trị bán');
eq(a.purchaseCost, 80_000_000, 'A tiền mua');
eq([a.salaryIncome, a.incomeBasis], [120_000_000, 'par'], 'A TN tiền lương = SL×mệnh giá − tiền mua');
eq(a.withheldTax, 12_000_000, 'A khấu trừ 10%');
eq(a.transferTax, 1_000_000, 'A 0,1% giá bán');
eq(a.annualTaxWithout, 51_823_200, 'A thuế năm không ESOP');
eq(a.annualTaxWith, 75_823_200, 'A thuế năm có ESOP');
eq(a.settlementTax, 24_000_000, 'A quyết toán tăng 24tr (bậc 20%)');
eq(a.settlementBalance, 12_000_000, 'A nộp thêm 12tr so với 10% đã khấu trừ');
eq(a.totalTax, 25_000_000, 'A tổng thuế');
eq(a.netProfit, 1_000_000_000 - 80_000_000 - 25_000_000, 'A lãi ròng (không trừ 10% - là tạm nộp)');

// B) Vượt bậc: TN ESOP 480tr (+40tr/tháng): 39,093 -> 79,093tr
//    tăng/tháng = 20,907×20% + 19,093×30% = 4,1814 + 5,7279 = 9,9093tr -> năm 118.911.600
const b = calculateESOPTax(esop({ numberOfShares: 48_000, purchasePrice: 0, sellPrice: 30_000 }));
eq(b.salaryIncome, 480_000_000, 'B TN tiền lương');
eq(b.settlementTax, 118_911_600, 'B quyết toán lũy tiến qua 2 bậc');
eq(b.settlementBalance, 118_911_600 - 48_000_000, 'B nộp thêm');

// C) Lương 30tr (bậc 10%): TN ESOP 120tr -> tăng đúng 10% = khấu trừ -> không nộp thêm
const c = calculateESOPTax(esop({ numberOfShares: 20_000, purchasePrice: 4_000, sellPrice: 50_000, salary: salary(30_000_000) }));
eq([c.annualTaxWithout, c.annualTaxWith, c.settlementBalance], [7_620_000, 19_620_000, 0], 'C bậc 10%');

// D) Lương thấp (10tr): chưa đến mức nộp thuế -> được hoàn phần đã khấu trừ vượt
//    TNTT tháng = 10 − 1,05 − 15,5 < 0; có ESOP 12tr (+1tr/tháng) vẫn < 0 -> thuế 0 -> hoàn 1,2tr
const d = calculateESOPTax(esop({ numberOfShares: 2_000, purchasePrice: 4_000, sellPrice: 20_000, salary: salary(10_000_000) }));
eq([d.salaryIncome, d.withheldTax, d.settlementTax, d.settlementBalance], [12_000_000, 1_200_000, 0, -1_200_000], 'D được hoàn');

// E) Cổ phiếu thưởng bán dưới mệnh giá -> theo giá thị trường; trên mệnh giá -> SL × mệnh giá
const e1 = calculateESOPTax(esop({ shareType: 'bonus', numberOfShares: 1_000, purchasePrice: 9_999, sellPrice: 8_000 }));
eq([e1.salaryIncome, e1.incomeBasis, e1.purchaseCost], [8_000_000, 'market', 0], 'E1 thưởng < mệnh giá: 1.000×8.000');
eq([e1.withheldTax, e1.transferTax], [800_000, 8_000], 'E1 khấu trừ 10% + 0,1%');
const e2 = calculateESOPTax(esop({ shareType: 'bonus', numberOfShares: 1_000, sellPrice: 15_000 }));
eq([e2.salaryIncome, e2.incomeBasis], [10_000_000, 'par'], 'E2 thưởng >= mệnh giá: 1.000×10.000');

// F) Số tiền ghi sổ ưu tiên; ESOP mua trên mệnh giá -> không có TN tiền lương, vẫn 0,1% khi lỗ
const f1 = calculateESOPTax(esop({ numberOfShares: 1_000, purchasePrice: 5_000, bookAmount: 7_777_000, sellPrice: 20_000 }));
eq([f1.salaryIncome, f1.incomeBasis], [7_777_000, 'book'], 'F1 theo sổ kế toán');
const f2 = calculateESOPTax(esop({ numberOfShares: 1_000, purchasePrice: 12_000, sellPrice: 11_000 }));
eq([f2.salaryIncome, f2.withheldTax, f2.settlementTax, f2.transferTax], [0, 0, 0, 11_000], 'F2 âm -> 0; 0,1% dù lỗ');
eq(f2.netProfit, 11_000_000 - 12_000_000 - 11_000, 'F2 lãi ròng âm');

// G) Dữ liệu hỏng/thiếu: mệnh giá 0 -> 10.000; NaN -> 0; không crash
const g = calculateESOPTax(esop({ numberOfShares: 1_000, parValue: 0, sellPrice: 20_000, purchasePrice: Number.NaN }));
eq(g.salaryIncome, 10_000_000, 'G mệnh giá mặc định 10.000, giá mua NaN -> 0');
const g2 = calculateESOPTax(esop({ numberOfShares: Number.NaN, sellPrice: -5 }));
eq([g2.saleValue, g2.totalTax], [0, 0], 'G2 NaN/âm -> 0');

console.log(`ESOP OK: ${n} assertions`);
