import assert from 'node:assert/strict';
import {
  calculateSecuritiesTax, calculateTransactionTax, calculateDividendTax, calculateBondInterestTax,
  isOpenFundExempt, type SecuritiesTransaction, type DividendEntry, type BondInterestEntry,
} from '@/lib/securitiesTaxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const TODAY = D(2026, 9, 29);
const t = (p: Partial<SecuritiesTransaction>): SecuritiesTransaction => ({
  id: Math.random().toString(36), type: 'listed', symbol: 'X', quantity: 0, buyPrice: 0, sellPrice: 0,
  buyDate: '', sellDate: '', buyFee: 0, sellFee: 0, ...p,
});
const div = (p: Partial<DividendEntry>): DividendEntry => ({
  id: 'd', symbol: 'X', company: '', dividendPerShare: 1_500, shares: 1_000, exDate: '', taxWithheld: 0, ...p,
});
const bond = (bondType: BondInterestEntry['bondType']): BondInterestEntry => ({
  id: bondType, bondName: bondType, bondType, principal: 0, interestRate: 0, interestPeriod: 'annual', interestReceived: 10_000_000,
});

// Niêm yết: 1.000 CP mua 50.000 bán 60.000, phí 100k+100k -> 0,1% × 60tr = 60.000
const l = calculateTransactionTax(t({ quantity: 1_000, buyPrice: 50_000, sellPrice: 60_000, buyFee: 100_000, sellFee: 100_000 }), TODAY);
eq([l.sellValue, l.tax, l.taxRate, l.capitalGain, l.netProfit], [60_000_000, 60_000, 0.1, 9_800_000, 9_740_000], 'niêm yết 0,1%');
// Chưa niêm yết: luôn 0,1% giá bán, kể cả lỗ (không còn 20% lãi)
const u = calculateTransactionTax(t({ type: 'unlisted', quantity: 500, buyPrice: 30_000, sellPrice: 20_000 }), TODAY);
eq([u.tax, u.taxRate, u.capitalGain], [10_000, 0.1, -5_000_000], 'chưa niêm yết 0,1% dù lỗ');
// Bán trái phiếu: 0,1% (trước đây code = 0)
const b = calculateTransactionTax(t({ type: 'bond', quantity: 100, buyPrice: 1_000_000, sellPrice: 1_050_000 }), TODAY);
eq([b.tax, b.taxableAmount], [105_000, 105_000_000], 'bán trái phiếu 0,1%');
// netProfit dùng thuế đã làm tròn
const r = calculateTransactionTax(t({ quantity: 1, buyPrice: 1_000_000, sellPrice: 1_234_567 }), TODAY);
eq([r.tax, r.netProfit], [1_235, 234_567 - 1_235], 'làm tròn thuế trước khi trừ');

// Chứng chỉ quỹ mở: đủ 2 năm & bán từ 01/7/2026 -> miễn
eq(isOpenFundExempt('2024-07-01', D(2026, 7, 1)), true, 'đúng 2 năm, bán 01/7/2026 -> miễn');
eq(isOpenFundExempt('2024-07-02', D(2026, 7, 1)), false, 'thiếu 1 ngày -> 0,1%');
eq(isOpenFundExempt('2023-01-01', D(2026, 6, 30)), false, 'bán trước 01/7/2026 -> chưa miễn');
eq(isOpenFundExempt('', D(2026, 9, 29)), false, 'không có ngày mua -> không miễn');
const f1 = calculateTransactionTax(t({ type: 'fund', quantity: 1_000, buyPrice: 10_000, sellPrice: 15_000, buyDate: '2024-09-29' }), TODAY);
eq([f1.tax, f1.taxRate, f1.taxableAmount, f1.netProfit], [0, 0, 0, 5_000_000], 'quỹ mở ≥2 năm (ngày bán trống = hôm nay) -> miễn');
assert.match(f1.note ?? '', /Điều 43/); n++;
const f2 = calculateTransactionTax(t({ type: 'fund', quantity: 1_000, buyPrice: 10_000, sellPrice: 15_000, buyDate: '2024-09-30' }), TODAY);
eq([f2.tax, f2.note], [15_000, undefined], 'quỹ mở 1 năm 364 ngày -> 0,1%');
const f3 = calculateTransactionTax(t({ type: 'listed', quantity: 1_000, sellPrice: 15_000, buyDate: '2020-01-01' }), TODAY);
eq(f3.tax, 15_000, 'cổ phiếu niêm yết giữ lâu vẫn 0,1% (miễn chỉ cho quỹ mở)');

// Cổ tức 5%; lợi tức quỹ 2,5% trong 01/7/2026 - 30/6/2031
eq(calculateDividendTax(div({}), TODAY).tax, 75_000, 'cổ tức 5%');
eq(calculateDividendTax(div({ fromFund: true }), TODAY).tax, 37_500, 'lợi tức quỹ 2,5%');
eq(calculateDividendTax(div({ fromFund: true }), D(2026, 6, 30)).tax, 75_000, 'trước 01/7/2026: 5%');
eq(calculateDividendTax(div({ fromFund: true }), new Date(2031, 5, 30, 15)).tax, 37_500, 'ngày 30/6/2031 còn giảm');
eq(calculateDividendTax(div({ fromFund: true }), D(2031, 7, 1)).tax, 75_000, 'từ 01/7/2031: 5%');

// Lãi trái phiếu: CP, địa phương, xanh miễn; DN 5%
eq(['government', 'localGovernment', 'green', 'corporate'].map(k => calculateBondInterestTax(bond(k as BondInterestEntry['bondType'])).tax),
  [0, 0, 0, 500_000], 'lãi trái phiếu');

// Tổng hợp: thuế suất hiệu dụng trên tổng tiền nhận, không âm dù lỗ
const all = calculateSecuritiesTax({
  transactions: [t({ type: 'unlisted', quantity: 500, buyPrice: 30_000, sellPrice: 20_000 })],
  dividends: [], bonds: [], calculationDate: TODAY,
});
eq([all.summary.totalIncome, all.summary.totalTax, all.summary.effectiveTaxRate], [-5_000_000, 10_000, 0.1], 'lỗ: tỷ lệ 0,1% (không âm)');
const mix = calculateSecuritiesTax({
  transactions: [t({ quantity: 1_000, buyPrice: 50_000, sellPrice: 60_000 })],
  dividends: [div({})], bonds: [bond('corporate')], calculationDate: TODAY,
});
// thuế = 60.000 + 75.000 + 500.000 = 635.000; tiền nhận = 60tr + 1,5tr + 10tr = 71,5tr -> 0,89%
eq([mix.summary.totalTax, mix.summary.effectiveTaxRate], [635_000, 0.89], 'tổng hợp');
eq(mix.summary.totalNet, 10_000_000 + 1_500_000 + 10_000_000 - 635_000, 'thực nhận');

console.log(`SECURITIES OK: ${n} assertions`);
