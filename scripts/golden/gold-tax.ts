import assert from 'node:assert/strict';
import {
  GOLD_TAX_CONFIG, GOLD_CLASSIFICATIONS, calculateGoldTax, calculateGoldTransactionTax,
  calculateTotalValue, type GoldTransaction,
} from '@/lib/goldTaxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const tx = (p: Partial<GoldTransaction>): GoldTransaction => ({
  id: Math.random().toString(36), date: D(2026, 9, 1), type: 'sell', classification: 'bar',
  goldTypeName: 'SJC 1L - 10L', weight: 1, weightUnit: 'luong', pricePerLuong: 0, totalValue: 0, ...p,
});

// Mặc định: CHƯA thu
eq(GOLD_TAX_CONFIG.collected, false, 'mặc định chưa thu');
eq(GOLD_TAX_CONFIG.transferRate, 0.001, 'thuế suất luật định 0,1%');
eq(GOLD_CLASSIFICATIONS.find(c => c.id === 'ring')?.isTaxable, false, 'nhẫn trơn không phải vàng miếng');
eq(GOLD_CLASSIFICATIONS.find(c => c.id === 'jewelry')?.isTaxable, false, 'trang sức không thuộc diện');
eq(GOLD_CLASSIFICATIONS.find(c => c.id === 'bar')?.isTaxable, true, 'vàng miếng thuộc diện');

const txs = [
  tx({ type: 'buy', totalValue: 120_000_000, pricePerLuong: 120_000_000 }),
  tx({ totalValue: 125_000_000, pricePerLuong: 125_000_000 }),                                   // bán vàng miếng
  tx({ classification: 'ring', goldTypeName: 'SJC 9999 (nhẫn)', weight: 2, weightUnit: 'chi', pricePerLuong: 110_000_000, totalValue: 22_000_000 }),
  tx({ classification: 'jewelry', goldTypeName: 'Trang sức', totalValue: 8_000_000 }),
  tx({ date: D(2026, 3, 1), totalValue: 10_000_000 }),                                          // trước 01/7/2026: không còn mốc cứng
];
const r = calculateGoldTax({ transactions: txs });
eq(r.totalTax, 0, 'thuế phải nộp = 0 (chưa thu)');
eq(r.totalStatutoryTax, 125_000 + 10_000, 'nếu 0,1%: 125.000 + 10.000');
eq(r.totalTaxableValue, 135_000_000, 'giá trị bán vàng miếng thuộc diện');
eq(r.totalTaxableTransactions, 2, '2 GD bán vàng miếng');
eq(r.totalSellValue, 125_000_000 + 22_000_000 + 8_000_000 + 10_000_000, 'tổng bán');
eq(r.effectiveTaxRate, 0, 'thuế suất thực tế 0 khi chưa thu');
eq(r.transactionsWithTax.map(t => t.taxAmount), [0, 0, 0, 0, 0], 'từng GD thuế 0');
eq(r.transactionsWithTax.map(t => t.statutoryTax), [0, 125_000, 0, 0, 10_000], 'ước tính 0,1% chỉ cho bán vàng miếng');
eq(r.transactionsWithTax[0].taxNote, 'Mua vào không chịu thuế', 'note mua');
assert.match(r.transactionsWithTax[1].taxNote, /Chưa thu thuế – nếu áp dụng mức luật định 0,1%: 125\.000 đ/); n++;
assert.match(r.transactionsWithTax[2].taxNote, /Không phải vàng miếng/); n++;
eq(r.taxComparison.map(c => c.taxAmount), [135_000, 135_000, 135_000, 2_700_000], 'so sánh trên giá trị vàng miếng');
eq(r.taxByGoldType.find(g => g.goldTypeName === 'SJC 1L - 10L')?.statutoryTax, 135_000, 'nhóm theo loại vàng');
eq(r.estimatedProfitLoss, 165_000_000 - 120_000_000, 'lãi/lỗ ước tính');

// Làm tròn: 1 chỉ @ 12.345.678/lượng -> 1.234.568 đ -> 0,1% = 1.234,568 -> 1.235
const v = calculateTotalValue(1, 'chi', 12_345_678);
eq(v, 1_234_568, 'giá trị 1 chỉ');
eq(calculateGoldTransactionTax(tx({ totalValue: v })).statutoryTax, 1_235, 'làm tròn đồng');

// Khi Chính phủ bắt đầu thu (bật cờ): thuế = 0,1%, thuế suất thực tế / giá trị bán
GOLD_TAX_CONFIG.collected = true;
const r2 = calculateGoldTax({ transactions: txs });
eq(r2.totalTax, 135_000, 'bật thu: thuế = 0,1%');
eq(r2.effectiveTaxRate, 135_000 / 165_000_000 * 100, 'thuế suất thực tế chia giá trị bán (không cộng giá mua)');
GOLD_TAX_CONFIG.collected = false;

console.log(`GOLD OK: ${n} assertions`);
