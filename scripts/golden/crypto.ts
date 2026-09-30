import assert from 'node:assert/strict';
import { calculateCryptoTax, formatPercent, CRYPTO_TAX_CONFIG, type CryptoTransaction } from '@/lib/cryptoTaxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const tx = (p: Partial<CryptoTransaction>): CryptoTransaction => ({
  id: Math.random().toString(36), date: D(2026, 9, 1), type: 'sell', assetType: 'btc', assetName: 'Bitcoin',
  quantity: 1, pricePerUnit: 0, totalValue: 0, fee: 0, ...p,
});

eq(CRYPTO_TAX_CONFIG.effectiveDate.getTime(), D(2026, 7, 1).getTime(), 'mốc 01/7/2026 giờ địa phương');

const txs = [
  tx({ type: 'buy', date: D(2026, 3, 1), totalValue: 500_000_000 }),        // mua trước mốc
  tx({ type: 'sell', date: D(2026, 6, 30), totalValue: 200_000_000 }),      // bán trước mốc
  tx({ type: 'sell', date: D(2026, 7, 1), totalValue: 123_456_789 }),       // bán đúng ngày hiệu lực
  tx({ type: 'swap', date: D(2026, 8, 15), totalValue: 50_000_000, assetType: 'eth', assetName: 'Ethereum' }),
  tx({ type: 'transfer', date: D(2026, 8, 20), totalValue: 70_000_000 }),
  tx({ type: 'buy', date: D(2026, 9, 1), totalValue: 10_000_000 }),
];
const r = calculateCryptoTax({ transactions: txs });
const w = r.transactionsWithTax;
eq(w.map(t => t.isTaxable), [false, false, true, true, false, false], 'chỉ bán/hoán đổi từ 01/7/2026');
eq(w[0].taxNote, 'Mua vào không chịu thuế', 'lệnh MUA trước mốc KHÔNG bị ghi "trước ngày luật có hiệu lực"');
assert.match(w[1].taxNote, /trước 01\/7\/2026/); n++;
eq(w[2].taxAmount, 123_457, '0,1% × 123.456.789 = 123.456,789 -> làm tròn 123.457');
eq(w[3].taxAmount, 50_000, 'hoán đổi 0,1%');
eq(w[4].taxNote, 'Chuyển ví của chính mình không chịu thuế', 'chuyển ví');
eq(r.totalTax, 173_457, 'tổng thuế');
eq(r.totalTaxableValue, 173_456_789, 'giá trị chịu thuế');
eq(r.effectiveTaxRate, 173_457 / (200_000_000 + 123_456_789 + 50_000_000) * 100, 'thuế suất chia giá chuyển nhượng (bán + hoán đổi), không cộng giá mua');
eq(r.taxComparison.map(c => c.taxAmount), [173_457, 173_457, 173_457, 3_469_136], 'so sánh làm tròn đồng');
eq(r.taxByAsset.find(a => a.assetType === 'eth')?.taxAmount, 50_000, 'theo tài sản');
eq('monthlyBreakdown' in r, false, 'bỏ bảng tháng (gộp nhiều năm)');
eq([formatPercent(0.001), formatPercent(0.02)], ['0,1%', '2%'], 'định dạng % kiểu Việt Nam');
eq(calculateCryptoTax({ transactions: [] }).effectiveTaxRate, 0, 'không giao dịch');

console.log(`CRYPTO OK: ${n} assertions`);
