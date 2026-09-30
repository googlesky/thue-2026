import assert from 'node:assert/strict';
import {
  calculateForeignerTax,
  calculateForeignerAllowances,
  determineResidencyStatus,
  checkDoubleTaxTreaty,
  DEFAULT_FOREIGNER_ALLOWANCES as A0,
  type ForeignerTaxInput,
} from '@/lib/foreignerTaxCalculator';
import {
  getTreaty,
  getTreatyCountries,
  check183DayRule,
  calculateWithholdingWithTreaty,
  getRequiredDocuments,
} from '@/lib/taxTreatyData';
import { DEFAULT_FOREIGNER_TAX_STATE } from '@/lib/snapshotTypes';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const base: ForeignerTaxInput = {
  nationality: 'JP', daysInVietnam: 100, hasPermanentResidence: false, grossIncome: 100e6,
  allowances: { ...A0 }, hasVietnameseInsurance: false, dependents: 0, taxYear: 2026,
};

// 1) Không cư trú: tiền nhà 30tr, trần 15% × 100tr = 15tr → TNCT 115tr × 20% = 23tr
let r = calculateForeignerTax({ ...base, allowances: { ...A0, housing: 30e6 } });
eq([r.residencyStatus, r.taxableAllowances, r.exemptAllowances, r.taxableIncome, r.taxAmount], ['non-resident', 15e6, 15e6, 115e6, 23e6], 'không cư trú + trần 15%');
assert.ok(r.notes.some((x) => x.includes('Điều 8.2.h'))); n++;
assert.ok(!r.notes.some((x) => x.includes('khấu trừ thuế đã nộp'))); n++;
assert.ok(r.notes.some((x) => x.includes('không quá 183 ngày'))); n++;
// Làm tròn: 33.333.333 × 20% = 6.666.666,6 → 6.666.667
eq(calculateForeignerTax({ ...base, grossIncome: 33_333_333 }).taxAmount, 6_666_667, 'làm tròn, không cư trú');

// 2) Cư trú: 100tr + nhà 10tr (dưới trần 15tr), không BH, 0 NPT → TNTT 94,5tr
//    thuế = 10×5% + 20×10% + 30×20% + 34,5×30% = 18,85tr
r = calculateForeignerTax({ ...base, daysInVietnam: 200, allowances: { ...A0, housing: 10e6 } });
eq([r.residencyStatus, r.taxableIncome, r.taxAmount], ['resident', 94.5e6, 18_850_000], 'cư trú, tiền nhà dưới trần');
// Nhà 30tr → chỉ tính 15tr → TNTT 99,5tr → 0,5 + 2 + 6 + 39,5×30% = 20,35tr
r = calculateForeignerTax({ ...base, daysInVietnam: 200, allowances: { ...A0, housing: 30e6 } });
eq([r.taxableIncome, r.taxAmount], [99.5e6, 20_350_000], 'cư trú, tiền nhà vượt trần');

// 3) Đào tạo ngôn ngữ: cờ phù hợp công việc → không tính; trần nhà tính trên TN chịu thuế khác
let c = calculateForeignerAllowances({ ...A0, housing: 10e6, languageTraining: 5e6 }, 50e6, false);
eq([c.housingCap, c.housingTaxable, c.taxable, c.exempt], [8_250_000, 8_250_000, 13_250_000, 1_750_000], 'đào tạo chịu thuế');
c = calculateForeignerAllowances({ ...A0, housing: 10e6, languageTraining: 5e6 }, 50e6, true);
eq([c.housingCap, c.taxable, c.exempt], [7_500_000, 7_500_000, 7_500_000], 'đào tạo phù hợp công việc');
// Học phí con, vé về phép, trợ cấp chuyển vùng: không tính
c = calculateForeignerAllowances({ ...A0, schoolFees: 20e6, homeLeaveFare: 30e6, relocation: 50e6 }, 80e6);
eq([c.taxable, c.exempt], [0, 100e6], 'khoản không tính');
eq(calculateForeignerTax({ ...base, languageTrainingJobRelated: true, allowances: { ...A0, languageTraining: 5e6 } }).taxAmount, 20e6, 'không cư trú, đào tạo phù hợp: 100tr × 20%');

// 4) Cư trú: ≥ 183 ngày hoặc nơi ở thường xuyên; số ngày không phụ thuộc ngày mở trang
eq([determineResidencyStatus(183, false), determineResidencyStatus(182, false), determineResidencyStatus(100, true)], ['resident', 'non-resident', 'resident'], 'cư trú');
eq(calculateForeignerTax({ ...base, daysInVietnam: 200 }).daysInVietnam, 200, 'số ngày giữ nguyên');
assert.ok(calculateForeignerTax({ ...base, hasPermanentResidence: true, daysInVietnam: 90 }).notes.some((x) => x.includes('Điều 4.3'))); n++;

// 5) Hoa Kỳ: đã ký 2015, chưa hiệu lực
eq(checkDoubleTaxTreaty('US'), undefined, 'Hoa Kỳ chưa có hiệp định hiệu lực');
eq(checkDoubleTaxTreaty('JP')?.code, 'JP', 'Nhật Bản có hiệp định');
r = calculateForeignerTax({ ...base, nationality: 'US' });
eq(r.hasTreatyWithCountry, false, 'Hoa Kỳ không áp dụng');
assert.ok(r.notes.some((x) => x.includes('chưa có hiệu lực'))); n++;
eq(getTreaty('US')?.status, 'pending', 'treaty US pending');
eq(getTreatyCountries().find((c) => c.code === 'US')?.pending, true, 'danh sach US pending');
eq(getTreatyCountries().find((c) => c.code === 'JP')?.pending, false, 'danh sach JP active');

// 6) Quy tắc 183 ngày: "không quá 183" (≤), hiệp định chưa hiệu lực → không áp dụng
eq(check183DayRule('JP', 183).eligible, true, '183 ngày đủ điều kiện');
eq(check183DayRule('JP', 184).eligible, false, '184 ngày không đủ');
eq(check183DayRule('US', 100).eligible, false, 'Hoa Kỳ chưa hiệu lực');
eq(check183DayRule('JP', 100).conditions.length, 3, '3 dieu kien');
assert.ok(check183DayRule('JP', 100).conditions.some((x) => x.includes('cơ sở thường trú'))); n++;

// 7) Khấu trừ theo hiệp định: thu mức thấp hơn giữa trong nước và trần hiệp định
let w = calculateWithholdingWithTreaty('US', 'dividends', 100e6);
eq([w.domesticTax, w.treatyTax, w.savings], [5e6, 5e6, 0], 'Hoa Kỳ dùng thuế trong nước');
w = calculateWithholdingWithTreaty('FR', 'interest', 100e6);
eq([w.domesticTax, w.treatyTax, w.savings], [5e6, 0, 5e6], 'Phap lai 0%');
// Bản quyền: trong nước 5% × (100 − 20) = 4tr; hiệp định Nhật 10% = 10tr → thu 4tr
w = calculateWithholdingWithTreaty('JP', 'royalties', 100e6);
eq([w.domesticTax, w.treatyTax, w.savings], [4e6, 10e6, 0], 'bản quyền trừ 20tr/hợp đồng');
w = calculateWithholdingWithTreaty('SG', 'dividends', 100e6, true);
eq([w.treatyRate, w.treatyTax], [0.05, 5e6], 'Singapore: cổ tức ưu đãi 5%');

// 8) Hồ sơ theo TT 89/2026 Điều 76
eq(getRequiredDocuments('US').length, 0, 'Hoa Kỳ không có hồ sơ');
assert.ok(getRequiredDocuments('JP').some((d) => d.includes('01/HTQT'))); n++;

// 9) State mặc định: có cờ đào tạo, bỏ isSecondHalf2026
eq('isSecondHalf2026' in DEFAULT_FOREIGNER_TAX_STATE, false, 'bỏ isSecondHalf2026');
eq(DEFAULT_FOREIGNER_TAX_STATE.languageTrainingJobRelated, false, 'cờ đào tạo mặc định false');

console.log(`FOREIGNER+TREATY OK: ${n} assertions`);
