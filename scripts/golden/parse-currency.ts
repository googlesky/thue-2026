// Golden: parseCurrencyInput — dán en-US "30,000,000" và giữ fix 1aa0095 ("7.0000" → 70000, "." luôn là dấu nghìn).
import assert from 'node:assert/strict';
import { parseCurrencyInput, MAX_MONTHLY_INCOME } from '@/utils/inputSanitizers';

const cases: Array<[string, number, boolean]> = [
  // [chuỗi nhập, giá trị, cờ thập phân]
  ['30,000,000', 30_000_000, false],   // en-US dán vào: "," là dấu nghìn (trước đây ra 30.000 + cảnh báo)
  ['1,500,000', 1_500_000, false],
  ['12,345', 12_345, false],           // nhóm cuối 3 chữ số → dấu nghìn
  ['30,000,000.50', 30_000_000, true], // en-US có phần lẻ
  ['1,000.5', 1_000, true],
  ['30,000,000 VND', 30_000_000, false],
  ['7.0000', 70_000, false],           // fix 1aa0095: gõ tăng dần "7.000" + "0"
  ['30.000.000', 30_000_000, false],
  ['100.5', 1_005, false],             // "." luôn là dấu nghìn
  ['1,5', 1, true],                    // vi-VN thập phân
  ['1,23', 1, true],
  ['1.234,56', 1_234, true],
  ['30.000.000,', 30_000_000, false],  // đang gõ dấu phẩy
  ['30 000 000', 30_000_000, false],
  ['30.000.000 đ', 30_000_000, false],
  ['', 0, false],
];
for (const [raw, value, decimal] of cases) {
  const r = parseCurrencyInput(raw);
  assert.equal(r.value, value, `"${raw}" → ${r.value}`);
  assert.equal(r.issues.decimal, decimal, `"${raw}" cờ thập phân`);
  assert.equal(r.issues.overflow, false);
}
const neg = parseCurrencyInput('-5.000.000');
assert.equal(neg.value, 5_000_000);
assert.equal(neg.issues.negative, true);
const over = parseCurrencyInput('99999999999', { max: MAX_MONTHLY_INCOME });
assert.equal(over.value, 10_000_000_000);
assert.equal(over.issues.overflow, true);
console.log('PARSE CURRENCY OK');
