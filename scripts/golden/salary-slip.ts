// Golden test phiếu lương (MISC-C). Chạy: cd repo && npx tsx --tsconfig tsconfig.json <file>
import assert from 'node:assert/strict';
import { DEFAULT_INSURANCE_OPTIONS, DEFAULT_OTHER_INCOME, SharedTaxState } from '@/lib/taxCalculator';
import { computeSlipTax, createInitialSlipData } from '@/components/SalarySlip/SalarySlipGenerator';
import { numberToVietnameseWords, escapeHtml, generatePDFHTML } from '@/components/SalarySlip/SalarySlipPDF';
import { DEFAULT_SALARY_SLIP_DATA, SalarySlipData } from '@/components/SalarySlip/types';

const shared: SharedTaxState = {
  grossIncome: 60_000_000, dependents: 0, otherDeductions: 0, hasInsurance: true,
  insuranceOptions: DEFAULT_INSURANCE_OPTIONS, region: 1, pensionContribution: 0, otherIncome: DEFAULT_OTHER_INCOME,
};
const slip = (month: number, year: number, patch: Partial<SalarySlipData['earnings']> = {}): SalarySlipData => ({
  ...DEFAULT_SALARY_SLIP_DATA,
  payPeriod: { month, year },
  earnings: { ...DEFAULT_SALARY_SLIP_DATA.earnings, basicSalary: 60_000_000, ...patch },
});

// 1) Kỳ lương quyết định luật + trần BH (tính tay)
// 12/2025: BH trần 46,8tr → 3.744.000 + 702.000 + 600.000 = 5.046.000; TNTT 60 − 5,046 − 11 = 43.954.000 → ×25% − 3.250.000 = 7.738.500
let r = computeSlipTax(slip(12, 2025), shared);
assert.equal(r.insuranceDeduction, 5_046_000);
assert.equal(r.taxAmount, 7_738_500);
// 03/2026: 5 bậc, trần 46,8tr: TNTT 60 − 5,046 − 15,5 = 39.454.000 → ×20% − 3.500.000 = 4.390.800
r = computeSlipTax(slip(3, 2026), shared);
assert.equal(r.insuranceDetail.bhxh, 3_744_000);
assert.equal(r.insuranceDetail.bhyt, 702_000);
assert.equal(r.taxAmount, 4_390_800);
// 09/2026: trần 50,6tr → 4.048.000 + 759.000 + 600.000 = 5.407.000; TNTT 39.093.000 → 4.318.600
r = computeSlipTax(slip(9, 2026), shared);
assert.equal(r.insuranceDetail.bhxh, 4_048_000);
assert.equal(r.insuranceDetail.bhyt, 759_000);
assert.equal(r.taxAmount, 4_318_600);

// 2) Thưởng chịu thuế nhưng không vào lương đóng BH: 09/2026 + thưởng 10tr → BH giữ 5.407.000, TNTT 49.093.000 → 9.818.600 − 3.500.000 = 6.318.600
r = computeSlipTax(slip(9, 2026, { bonus: 10_000_000 }), shared);
assert.equal(r.insuranceDeduction, 5_407_000);
assert.equal(r.taxAmount, 6_318_600);

// 3) Tăng ca: miễn toàn bộ từ kỳ 2026; kỳ 2025 cộng vào TN chịu thuế
assert.equal(computeSlipTax(slip(9, 2026, { overtime: 6_000_000 }), shared).taxAmount, 4_318_600);
// 12/2025: TNTT 43.954.000 + 6.000.000 = 49.954.000 → ×25% − 3.250.000 = 9.238.500
assert.equal(computeSlipTax(slip(12, 2025, { overtime: 6_000_000 }), shared).taxAmount, 9_238_500);

// 4) Phụ cấp: ăn trưa 2tr (miễn 1,2tr từ 01/7/2026 → chịu 0,8tr), điện thoại 0,5tr miễn, phụ cấp tự đặt 1tr chịu thuế
// TNTT = 60 + 0,8 + 1 − 5,407 − 15,5 = 40.893.000 → ×20% − 3.500.000 = 4.678.600
r = computeSlipTax(slip(9, 2026, { allowances: [
  { id: 'meal', label: 'Ăn trưa', amount: 2_000_000 },
  { id: 'phone', label: 'Điện thoại', amount: 500_000 },
  { id: 'custom-1', label: 'Hỗ trợ', amount: 1_000_000 },
] }), shared);
assert.equal(r.taxAmount, 4_678_600);

// 5) Lương đóng BH khai báo 5tr (từ tab Tính thuế): BH 525.000; TNTT 60 − 0,525 − 15,5 = 43.975.000 → 8.795.000 − 3.500.000 = 5.295.000
r = computeSlipTax(slip(9, 2026), { ...shared, declaredSalary: 5_000_000 });
assert.equal(r.insuranceDeduction, 525_000);
assert.equal(r.taxAmount, 5_295_000);

// 6) Hưu trí tự nguyện truyền riêng, engine chặn 3tr: 5tr → trừ 3tr → TNTT 36.093.000 → 7.218.600 − 3.500.000 = 3.718.600
assert.equal(computeSlipTax(slip(9, 2026), { ...shared, pensionContribution: 5_000_000 }).taxAmount, 3_718_600);

// 7) Khôi phục dữ liệu đã lưu + điền sẵn phụ cấp từ tab Tính thuế
const store: Record<string, string> = {
  'salary-slip-company-info': JSON.stringify({ name: 'CÔNG TY ĐÃ LƯU', address: 'HN', logoUrl: 1 }),
  'salary-slip-employee-info': JSON.stringify({ name: 'NHÂN VIÊN ĐÃ LƯU' }),
};
(globalThis as Record<string, unknown>).window = { localStorage: { getItem: (k: string) => store[k] ?? null } };
const init = createInitialSlipData({ ...shared, allowances: { meal: 1_000_000, phone: 0, transport: 0, hazardous: 0, clothing: 300_000, housing: 0, position: 2_000_000 } });
assert.equal(init.company.name, 'CÔNG TY ĐÃ LƯU');
assert.equal(init.company.address, 'HN');
assert.equal('logoUrl' in init.company, false); // bỏ trường không phải chuỗi
assert.equal(init.employee.name, 'NHÂN VIÊN ĐÃ LƯU');
assert.equal(init.earnings.basicSalary, 60_000_000);
assert.deepEqual(init.earnings.allowances.map((a) => [a.id, a.amount]), [['meal', 1_000_000], ['clothing', 300_000], ['position', 2_000_000]]);
store['salary-slip-company-info'] = '{hỏng';
assert.equal(createInitialSlipData(shared).company.name, '');
delete (globalThis as Record<string, unknown>).window;

// 8) Đọc số thành chữ
const words: Array<[number, string]> = [
  [0, 'Không đồng'],
  [0.4, 'Không đồng'],
  [5, 'Năm đồng'],
  [15, 'Mười lăm đồng'],
  [21, 'Hai mươi mốt đồng'],
  [105, 'Một trăm lẻ năm đồng'],
  [1_005_000, 'Một triệu không trăm lẻ năm nghìn đồng'],
  [25_000_005, 'Hai mươi lăm triệu không trăm lẻ năm đồng'],
  [25_500_000, 'Hai mươi lăm triệu năm trăm nghìn đồng'],
  [26_114_600, 'Hai mươi sáu triệu một trăm mười bốn nghìn sáu trăm đồng'],
  [1_010_000, 'Một triệu không trăm mười nghìn đồng'],
  [2_000_000_005, 'Hai tỷ không trăm lẻ năm đồng'],
  [1_000_000_000_000, 'Một nghìn tỷ đồng'],
  [-1_500_000, 'Âm một triệu năm trăm nghìn đồng'],
];
for (const [n, w] of words) assert.equal(numberToVietnameseWords(n), w, String(n));

// 9) Escape HTML + CSS không rò ra toàn trang + STT liên tục
assert.equal(escapeHtml(`<img src=x onerror="a('1')">&`), '&lt;img src=x onerror=&quot;a(&#39;1&#39;)&quot;&gt;&amp;');
const html = generatePDFHTML(
  {
    ...slip(9, 2026, { allowances: [{ id: 'x', label: '<script>1</script>', amount: 100 }] }),
    company: { name: '<img src=x onerror=alert(1)>', address: 'A & B' },
    employee: { name: 'Nguyễn <b>A</b>', bankAccount: '123', bankName: '"VCB"' },
    deductions: { bhxh: 0, bhyt: 759_000, bhtn: 0, personalIncomeTax: 4_318_600, otherDeductions: 0 },
  },
  { grossIncome: 60_000_100, totalDeductions: 5_077_600, netPay: 54_922_500 }
);
assert.ok(!/<img|<script|<b>/.test(html), 'không còn thẻ người dùng chưa escape');
assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;') && html.includes('A &amp; B') && html.includes('&quot;VCB&quot;'));
// mọi rule CSS đều bắt đầu bằng .slip-root (không có *, body, @import)
const css = html.match(/<style>([\s\S]*?)<\/style>/)![1];
for (const rule of css.split('}').map((s) => s.split('{')[0].trim()).filter(Boolean)) {
  for (const sel of rule.split(',')) assert.ok(sel.trim().startsWith('.slip-root'), `selector: ${sel}`);
}
assert.ok(!html.includes('@import') && !/<body|<html/.test(html));
// BHXH = 0 bị ẩn → BHYT là STT 1, thuế là STT 2
assert.ok(html.includes('<tr><td>1</td><td>BHYT (1,5%)</td>'));
assert.ok(html.includes('<tr><td>2</td><td>Thuế TNCN</td>'));
assert.ok(html.includes('Năm mươi tư triệu chín trăm hai mươi hai nghìn năm trăm đồng') === false); // dùng "bốn"
assert.ok(html.includes('Năm mươi bốn triệu chín trăm hai mươi hai nghìn năm trăm đồng'));

console.log('salary-slip golden OK');
