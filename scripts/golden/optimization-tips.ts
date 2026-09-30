// Golden test MISC-B1 nhóm 3: taxOptimizationTips (A7–A9, A12–A16, A18–A21)
import assert from 'node:assert/strict';
import { generateTaxOptimizationTips, TaxOptimizationInput, TaxTip } from '@/utils/taxOptimizationTips';
import { DEFAULT_INSURANCE_OPTIONS } from '@/lib/taxCalculator';

const RealDate = Date;
function at<T>(d: Date, fn: () => T): T {
  class MockDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(d.getTime());
      else super(...(args as [number]));
    }
    static now() {
      return d.getTime();
    }
  }
  globalThis.Date = MockDate as DateConstructor;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

const SEP = new Date(2026, 8, 29); // hôm nay: không có tip theo mùa
const tips = (over: Partial<TaxOptimizationInput> = {}, date = SEP): TaxTip[] =>
  at(date, () =>
    generateTaxOptimizationTips({
      grossIncome: 30_000_000,
      dependents: 0,
      hasInsurance: true,
      insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
      region: 1,
      otherDeductions: 0,
      pensionContribution: 0,
      ...over,
    })
  );
const find = (list: TaxTip[], id: string) => list.find((t) => t.id === id);

// ---- Mặc định 30tr, 0 NPT: thuế 635.000 (TNTT 30 - 3,15 - 15,5 = 11,35tr) ----
const d = tips();
const ids = d.map((t) => t.id);
// A7, A8, A13, A20, A21: bỏ các tip sai luật / trùng lặp / code chết
for (const removed of [
  'household-business-conversion',
  'government-bond',
  'deduction-stacking',
  'income-splitting',
  'bonus-timing-2025',
  'new-law-preview',
  'pension-maximize',
]) {
  assert.ok(!ids.includes(removed), removed);
}
// A9: chỉ luật mới: thêm 1 NPT → TNTT 5,15tr → 257.500; tiết kiệm 377.500 (không phải 518.750)
const dep = find(d, 'dependent-registration')!;
assert.equal(dep.potentialSavings, 377_500);
assert.equal(dep.potentialSavingsYearly, 4_530_000);
assert.equal(dep.priority, 'high');
// A12: điều kiện NPT mới (≤ 3 triệu/tháng), bỏ "trên 60 tuổi"
assert.ok(dep.description.includes('3.000.000'));
assert.ok(!dep.description.includes('60 tuổi'));
// Hưu trí 3tr: TNTT 8,35tr → 417.500 → tiết kiệm 217.500
assert.equal(find(d, 'pension-fund')!.potentialSavings, 217_500);
// A14: ăn ca 1,2tr, bỏ "xăng xe"
const allow = find(d, 'tax-exempt-allowances')!;
assert.ok(allow.description.includes('1.200.000'));
assert.ok(!allow.description.includes('xăng xe'));
// A15: tip y tế/giáo dục, bậc biên thật 10%
const med = find(d, 'medical-education-deduction')!;
assert.ok(med.description.includes('23.000.000') && med.description.includes('24.000.000'));
assert.ok(med.description.includes('bậc thuế 10%'));
assert.ok(med.description.includes('giảm khoảng 100.000 VNĐ'));
assert.ok(med.description.includes('tự quyết toán'));
assert.equal(med.potentialSavings, undefined);

// ---- A13: 25tr: bậc biên thật 5% (TNTT 25 - 2,625 - 15,5 = 6,875tr), hưu trí 3tr tiết kiệm 150.000 ----
const t25 = tips({ grossIncome: 25_000_000 });
assert.ok(find(t25, 'medical-education-deduction')!.description.includes('bậc thuế 5%'));
assert.equal(find(t25, 'pension-fund')!.potentialSavings, 150_000);

// ---- A18: 45tr + hưu trí 1tr: chỉ 1 tip hưu trí, tiết kiệm 200.000 ----
// TNTT 45 - 4,725 - 15,5 - 1 = 23,775tr → 1.877.500; lên 3tr: 21,775tr → 1.677.500
const t45 = tips({ grossIncome: 45_000_000, pensionContribution: 1_000_000 });
assert.equal(t45.filter((t) => t.icon === 'piggy-bank').length, 1);
assert.equal(find(t45, 'pension-fund-max')!.potentialSavings, 200_000);
// A8: tip đầu tư: tiền gửi TCTD miễn thuế, không còn "lãi chịu thuế 5%" cho tiết kiệm ngân hàng
const inv = find(t45, 'tax-advantaged-investment')!;
assert.ok(inv.description.includes('lãi tiền gửi tại tổ chức tín dụng'));
assert.ok(!t45.some((t) => t.description.includes('gửi tiết kiệm ngân hàng (lãi chịu thuế')));
// Tự động nâng "critical": 45tr thêm 1 NPT tiết kiệm 620.000 (TNTT 24,775 → 18,575tr, bậc 10%)
const t45b = tips({ grossIncome: 45_000_000 });
assert.equal(find(t45b, 'dependent-registration')!.potentialSavings, 620_000);
assert.equal(find(t45b, 'dependent-registration')!.priority, 'critical');

// ---- A16: 300tr, 1 NPT ----
// BH: 9,5% × 50,6tr + 1% × 106,2tr = 4.807.000 + 1.062.000 = 5.869.000
// TNTT = 300 - 5,869 - 15,5 - 6,2 = 272,431tr → thuế 20,5tr + 172,431tr × 35% = 80.850.850 (thực tế 26,95%)
const t300 = tips({ grossIncome: 300_000_000, dependents: 1 });
const div = find(t300, 'dividend-vs-salary')!;
assert.ok(div.description.includes('Thuế suất biên (bậc cao nhất) của bạn là 35%'));
assert.ok(div.description.includes('thuế suất thực tế 27%'));
assert.ok(div.description.includes('Điều 4 khoản 21'));
// Chỉ phần ở bậc > 24%: 40tr × 6% + 172,431tr × 11% = 2.400.000 + 18.967.410
assert.equal(div.potentialSavings, 21_367_410);
// A21: tip không tự làm được thì không bị nâng "Cần hành động ngay"
assert.equal(div.priority, 'medium');
assert.equal(find(t300, 'business-structure')!.priority, 'medium');
// 100tr: TNTT 100 - 5,807 - 15,5 = 78,693tr, bậc 30% → 18,693tr × 6% = 1.121.580
assert.equal(find(tips({ grossIncome: 100_000_000 }), 'dividend-vs-salary')!.potentialSavings, 1_121_580);

// ---- A21: dùng đủ input thật ----
// Lương đóng BH 5tr: BH 525.000 → TNTT 13,975tr (897.500) → thêm NPT 7,775tr (388.750) → 508.750
assert.equal(find(tips({ declaredSalary: 5_000_000 }), 'dependent-registration')!.potentialSavings, 508_750);
// Giảm trừ khác 20tr → không còn thuế → không gợi ý NPT/hưu trí/y tế
const noTax = tips({ otherDeductions: 20_000_000 });
for (const id of ['dependent-registration', 'pension-fund', 'medical-education-deduction']) {
  assert.ok(!find(noTax, id), id);
}

// ---- A19: quyết toán: 2 hạn, hiện tháng 1–4 ----
const apr = find(tips({}, new Date(2027, 3, 15)), 'annual-settlement')!;
assert.equal(apr.title, 'Quyết toán thuế TNCN năm 2026');
assert.ok(apr.description.includes('31/3/2027'));
assert.ok(apr.description.includes('ngày cuối cùng của tháng 4/2027'));
assert.ok(!find(tips({}, new Date(2027, 4, 15)), 'annual-settlement'));
assert.ok(!find(d, 'annual-settlement'));

// ---- A15 + cuối năm: 15/10/2026 còn 3 tháng: 217.500 × 3 = 652.500 ----
const oct = find(tips({}, new Date(2026, 9, 15)), 'year-end-spending')!;
assert.equal(oct.potentialSavingsYearly, 652_500);
assert.ok(oct.description.includes('Chi y tế, học phí'));
assert.ok(!find(d, 'year-end-spending'));

// ---- A20: năm 2025 không còn tip "chờ luật mới" ----
const y2025 = tips({ grossIncome: 60_000_000 }, new Date(2025, 5, 15)).map((t) => t.id);
assert.ok(!y2025.includes('bonus-timing-2025') && !y2025.includes('new-law-preview'));

// ---- Review THẤP 7–9 ----
const charity = find(d, 'charity-donation')!;
assert.ok(charity.description.includes('giảm trừ vào thu nhập chịu thuế'));
assert.ok(charity.description.includes('tự quyết toán'));
assert.ok(oct.description.includes('đăng ký kèm hồ sơ chứng minh trước 31/12/2026'));
assert.ok(find(t300, 'business-structure')!.description.includes('thường 20%'));

console.log('misc-b1 tips: OK');
