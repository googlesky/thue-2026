// Golden test Waterfall + exportUtils (MISC-C)
import assert from 'node:assert/strict';
import { calculateNewTax, DEFAULT_ALLOWANCES } from '@/lib/taxCalculator';
import { buildWaterfallData } from '@/components/IncomeWaterfallChart';
import { csvCell } from '@/lib/exportUtils';

// GROSS 20tr + ăn ca 1,5tr (miễn 1,2tr, chịu 0,3tr) + chức vụ 3tr → phụ cấp chịu thuế 3,3tr, miễn 1,2tr
const r = calculateNewTax({
  grossIncome: 20_000_000, dependents: 0,
  allowances: { ...DEFAULT_ALLOWANCES, meal: 1_500_000, position: 3_000_000 },
  calculationDate: new Date(2026, 8, 29),
});
// BH 2.100.000; TNTT 20 + 3,3 − 2,1 − 15,5 = 5.700.000; thuế 285.000; NET 24.500.000 − 2.100.000 − 285.000 = 22.115.000
assert.equal(r.taxableIncome, 5_700_000);
assert.equal(r.taxAmount, 285_000);
assert.equal(r.netIncome, 22_115_000);
const d = buildWaterfallData(r);
const by = (name: string) => d.find((x) => x.shortName === name)!;
assert.equal(by('Phụ cấp').value, 3_300_000);
// Chuỗi GROSS + phụ cấp chịu thuế − BH − giảm trừ = TN tính thuế (trước đây lệch đúng phần phụ cấp)
assert.equal(by('GROSS').value + by('Phụ cấp').value - by('Bảo hiểm').value - by('Giảm trừ').value, by('TN thuế').value);
// % trên tổng thu nhập 24,5tr: BH + Thuế + NET = 100%, NET < 100%
const pct = (n: string) => by(n).percentOfGross!;
assert.ok(Math.abs(pct('Bảo hiểm') + pct('Thuế') + pct('NET') - 100) < 1e-9);
assert.ok(pct('NET') < 100);
assert.equal(by('Bảo hiểm').name, 'Bảo hiểm bắt buộc');
// Chỉ có phụ cấp miễn thuế (10tr + 5,2tr): không có bước Phụ cấp, NET 142% → nay 15.200.000 − 1.050.000 = 14.150.000 / 15,2tr ≈ 93%
const r2 = calculateNewTax({ grossIncome: 10_000_000, dependents: 0, allowances: { ...DEFAULT_ALLOWANCES, phone: 5_200_000 } });
const d2 = buildWaterfallData(r2);
assert.equal(d2.some((x) => x.shortName === 'Phụ cấp'), false);
assert.ok(Math.abs(d2.find((x) => x.shortName === 'NET')!.percentOfGross! - (14_150_000 / 15_200_000) * 100) < 1e-9);

// CSV: chống formula injection, số giữ nguyên
assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
assert.equal(csvCell('+84 912'), `"'+84 912"`);
assert.equal(csvCell('@SUM(A1)'), `"'@SUM(A1)"`);
assert.equal(csvCell('Nguyễn Văn A'), '"Nguyễn Văn A"');
assert.equal(csvCell(-5), '-5');
assert.equal(csvCell(undefined), '""');

console.log('charts-export golden OK');
