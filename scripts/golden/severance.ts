import assert from 'node:assert/strict';
import {
  calculateSeveranceTax, getSeveranceServiceYears, estimateSeveranceAmount, estimateJobLossAmount, SEVERANCE_TYPE_INFO,
} from '@/lib/severanceCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };

// 1) Thuế: trợ cấp thôi việc 300 triệu → 0 (Luật 109 Điều 3.2.c; NĐ 253 Điều 8.3.h) - không còn quy tắc 10 × lương
const sev = calculateSeveranceTax({ type: 'severance', totalAmount: 300_000_000 });
eq([sev.taxAmount, sev.taxableIncome, sev.taxExemptAmount, sev.netAmount], [0, 0, 300_000_000, 300_000_000], 'thôi việc 300tr: thuế 0');
const jl = calculateSeveranceTax({ type: 'job_loss', totalAmount: 1_500_000_000 });
eq([jl.taxAmount, jl.taxableIncome], [0, 0], 'mất việc 1,5 tỷ: thuế 0');
const si = calculateSeveranceTax({ type: 'social_insurance_lump_sum', totalAmount: 200_000_000 });
eq([si.taxAmount, si.taxableIncome], [0, 0], 'BHXH một lần: thuế 0 (Điều 8.3.g)');
const vp = calculateSeveranceTax({ type: 'voluntary_pension_lump_sum', totalAmount: 1_000_000_000 });
eq([vp.taxAmount, vp.taxableIncome], [0, 0], 'rút quỹ hưu trí tự nguyện: miễn (Điều 27.2)');
const er = calculateSeveranceTax({ type: 'early_retire', totalAmount: 100_000_000 });
eq([er.typeInfo.taxable, er.taxableIncome, er.taxExemptAmount], [true, 100_000_000, 0], 'DN tự chi nghỉ hưu sớm: tính như tiền lương');
eq(Object.values(SEVERANCE_TYPE_INFO).some(i => /111\/2013|Luật Thuế TNCN sửa đổi 2024/.test(i.legalReference)), false, 'không còn trích dẫn cũ');

// 2) Thời gian tính trợ cấp: thực tế − BHTN − đã chi trả; tháng lẻ ≤ 6 → 0,5 năm, > 6 → 1 năm (NĐ 145/2020 Điều 8.3)
eq(getSeveranceServiceYears(5), 5, '5 năm');
eq(getSeveranceServiceYears(5.25), 5.5, '5 năm 3 tháng → 5,5');
eq(getSeveranceServiceYears(5.5), 5.5, '5 năm 6 tháng → 5,5');
eq(getSeveranceServiceYears(5.75), 6, '5 năm 9 tháng → 6');
eq(getSeveranceServiceYears(10, 8), 2, '10 năm, 8 năm BHTN → 2');
eq(getSeveranceServiceYears(10, 8, 1.5), 0.5, 'trừ tiếp 1,5 năm đã chi trả');
eq(getSeveranceServiceYears(10, 12), 0, 'không âm');

// 3) Mức trợ cấp (BLLĐ Điều 46, 47)
eq(estimateSeveranceAmount(5, 20_000_000), 50_000_000, 'thôi việc 5 năm × 1/2 × 20tr = 50tr');
eq(estimateSeveranceAmount(5, 20_000_000, 5), 0, 'toàn bộ thời gian đã đóng BHTN → 0');
eq(estimateSeveranceAmount(0.9, 20_000_000), 0, 'dưới 12 tháng → 0');
eq(estimateSeveranceAmount(5.25, 20_000_000, 2), 35_000_000, '3 năm 3 tháng → 3,5 × 10tr');
eq(estimateJobLossAmount(5, 20_000_000), 100_000_000, 'mất việc 5 năm × 20tr');
eq(estimateJobLossAmount(5, 20_000_000, 5), 40_000_000, 'mất việc: tối thiểu 2 tháng dù thời gian tính = 0');
eq(estimateJobLossAmount(1, 20_000_000), 40_000_000, 'mất việc 1 năm → tối thiểu 2 tháng');
eq(estimateJobLossAmount(0.5, 20_000_000), 0, 'mất việc dưới 12 tháng → 0');
console.log(`SEVERANCE OK: ${n} assertions`);
