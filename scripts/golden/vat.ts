import assert from 'node:assert/strict';
import {
  isVATReductionPeriod, calculateVAT, compareVATMethods, checkVATRegistration,
  checkVATRefundEligibility, getVATRateOptions, getVATRateOptionKey, formatPercent, getEffectiveVATRate,
} from '@/lib/vatCalculator';

const D = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi);
const TODAY = D(2026, 9, 29);
let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };

// 1) Thời gian giảm thuế (NQ 204/2025: 01/7/2025 – hết 31/12/2026; liên tục từ 01/01/2024)
eq(isVATReductionPeriod(TODAY), true, '29/9/2026 đang giảm');
eq(isVATReductionPeriod(D(2026, 12, 31, 23, 59)), true, '31/12/2026 23:59 còn giảm');
eq(isVATReductionPeriod(D(2027, 1, 1)), false, '01/01/2027 hết giảm');
eq(isVATReductionPeriod(D(2025, 7, 1)), true, '01/7/2025 đợt NQ 204');
eq(isVATReductionPeriod(D(2024, 1, 1)), true, '01/01/2024 NQ 110/2023');
eq(isVATReductionPeriod(D(2023, 12, 31, 23, 59)), false, '31/12/2023 chưa giảm');

// 2) Khấu trừ: 100tr bán ra nhóm 10% hôm nay → 8% = 8.000.000; không thuộc diện giảm → 10.000.000
const base = { salesRevenue: 100_000_000, purchaseValue: 50_000_000, outputRate: 0.1, inputRate: 0.1, method: 'deduction' as const, calculationDate: TODAY };
let r = calculateVAT(base);
eq([r.outputVAT, r.inputVAT, r.vatPayable, r.appliedOutputRate], [8_000_000, 4_000_000, 4_000_000, 0.08], 'khấu trừ 8%');
r = calculateVAT({ ...base, outputNotReduced: true });
eq([r.outputVAT, r.vatPayable], [10_000_000, 6_000_000], 'đầu ra không được giảm 10%, đầu vào 8%');
r = calculateVAT({ ...base, inputNotReduced: true });
eq([r.inputVAT, r.vatPayable], [5_000_000, 3_000_000], 'đầu vào không được giảm 10%');
r = calculateVAT({ ...base, outputRate: 0.08, inputRate: 0.08 }); // state cũ lưu 0,08
eq(r.vatPayable, 4_000_000, 'state cũ 0,08 = nhóm 10% được giảm');
r = calculateVAT({ ...base, outputRate: 0.08, calculationDate: D(2027, 1, 1) });
eq([r.outputVAT, r.inputVAT], [10_000_000, 5_000_000], '2027 hết giảm: 10%');
r = calculateVAT({ ...base, outputRate: 0.05, purchaseValue: 200_000_000 });
eq([r.outputVAT, r.inputVAT, r.vatPayable, r.vatRefundable], [5_000_000, 16_000_000, 0, 11_000_000], '5% đầu ra, âm thuế');
eq(getEffectiveVATRate(0, TODAY), 0, '0% giữ nguyên');

// 3) Trực tiếp: 100tr phân phối trong kỳ giảm → 1% × 80% = 800.000 (NĐ 174/2025 Điều 1.2.b)
const dir = { ...base, method: 'direct' as const, businessCategory: 'distribution' as const };
eq(calculateVAT(dir).vatPayable, 800_000, 'phân phối 0,8%');
eq(calculateVAT({ ...dir, businessCategory: 'services' }).vatPayable, 4_000_000, 'dịch vụ 4%');
eq(calculateVAT({ ...dir, businessCategory: 'production' }).vatPayable, 2_400_000, 'sản xuất 2,4%');
eq(calculateVAT({ ...dir, businessCategory: 'otherActivities' }).vatPayable, 1_600_000, 'khác 1,6%');
eq(calculateVAT({ ...dir, outputNotReduced: true }).vatPayable, 1_000_000, 'không được giảm 1%');
eq(calculateVAT({ ...dir, calculationDate: D(2027, 1, 1) }).vatPayable, 1_000_000, '2027: 1%');

// 4) Hộ KD: luôn trực tiếp; DT năm ≤ 1 tỷ không chịu GTGT
const hh = { ...base, method: 'deduction' as const, taxpayerType: 'household' as const, businessCategory: 'distribution' as const };
r = calculateVAT({ ...hh, salesRevenue: 80_000_000 }); // 960tr/năm
eq([r.method, r.vatPayable, r.isBelowThreshold], ['direct', 0, true], 'hộ KD 960tr/năm: 0');
r = calculateVAT({ ...hh, salesRevenue: 90_000_000 }); // 1,08 tỷ/năm → toàn bộ DT × 0,8%
eq([r.method, r.vatPayable, r.isBelowThreshold], ['direct', 720_000, false], 'hộ KD 1,08 tỷ: 720.000');

// 5) Phương pháp bắt buộc
eq(checkVATRegistration({ annualRevenue: 1_000_000_000, taxpayerType: 'household' }).exempt, true, 'hộ 1 tỷ: miễn');
eq(checkVATRegistration({ annualRevenue: 1_000_000_001, taxpayerType: 'household' }).requiredMethod, 'direct', 'hộ > 1 tỷ: trực tiếp');
eq(checkVATRegistration({ annualRevenue: 1_000_000_000 }).requiredMethod, 'deduction', 'DN 1 tỷ: khấu trừ');
eq(checkVATRegistration({ annualRevenue: 999_999_999 }).requiredMethod, undefined, 'DN < 1 tỷ: được chọn');
const cmp = compareVATMethods({ ...dir, businessCategory: 'services', salesRevenue: 100_000_000, purchaseValue: 0 });
eq([cmp.recommendation, cmp.savings], ['deduction', 0], 'DN 1,2 tỷ/năm: bắt buộc khấu trừ dù trực tiếp rẻ hơn');
const cmpSmall = compareVATMethods({ ...dir, businessCategory: 'distribution', salesRevenue: 50_000_000, purchaseValue: 0 });
eq([cmpSmall.recommendation, cmpSmall.savings], ['direct', 4_000_000 - 400_000], 'DN 600tr/năm: trực tiếp rẻ hơn 3,6tr');

// 6) Hoàn thuế (Điều 15): ngưỡng 300 triệu
eq(checkVATRefundEligibility({ vatRefundable: 400_000_000, exportRevenue: 1e9 }).isEligible, true, 'xuất khẩu 400tr: hoàn');
eq(checkVATRefundEligibility({ vatRefundable: 200_000_000, exportRevenue: 1e9 }).isEligible, false, 'xuất khẩu 200tr: chưa');
eq(checkVATRefundEligibility({ vatRefundable: 400_000_000, onlyFivePercentGoods: true }).isEligible, false, '5% chưa đủ 12 tháng');
eq(checkVATRefundEligibility({ vatRefundable: 400_000_000, onlyFivePercentGoods: true, consecutiveMonths: 12 }).isEligible, true, '5% đủ 12 tháng');
eq(checkVATRefundEligibility({ vatRefundable: 300_000_000, hasInvestmentProject: true }).refundableAmount, 300_000_000, 'dự án đầu tư 300tr');
eq(checkVATRefundEligibility({ vatRefundable: 900_000_000 }).isEligible, false, 'nội địa không đủ điều kiện');

// 7) Giá trị state luôn nằm trong options
for (const date of [TODAY, D(2027, 3, 1), D(2023, 6, 1)]) {
  const keys = getVATRateOptions(date).map(o => o.key);
  for (const rate of [0.1, 0.08, 0.05, 0]) for (const nr of [true, false, undefined]) {
    eq(keys.includes(getVATRateOptionKey(rate, nr, date)), true, `key ${rate}/${nr} ∈ options ${date.getFullYear()}`);
  }
}
eq(getVATRateOptions(TODAY).map(o => o.key), ['0.1', '0.1x', '0.05', '0'], 'options kỳ giảm');
eq(formatPercent(0.008), '0,8%', 'format 0,8%');
eq(formatPercent(0.024), '2,4%', 'format 2,4%');
console.log(`VAT OK: ${n} assertions`);
