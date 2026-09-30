import assert from 'node:assert/strict';
import {
  calculateHouseholdBusinessTax, compareTaxMethods2026, allocateThreshold, getIncomeTaxRate2026,
  formatRate, formatTy, TAX_METHOD_LABELS, HouseholdBusiness, BusinessCategory,
} from '@/lib/householdBusinessTaxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const biz = (id: string, category: BusinessCategory, monthlyRevenue: number, months: number, monthlyExpenses = 0): HouseholdBusiness =>
  ({ id, name: id, category, monthlyRevenue, monthlyExpenses, operatingMonths: months, hasBusinessLicense: true });

// T1: dịch vụ 5 tỷ, chi phí 30% -> bắt buộc PP thu nhập 17%: (5 - 1,5) tỷ x 17% = 595tr; GTGT 5 tỷ x 5% = 250tr
const t1 = calculateHouseholdBusinessTax({ businesses: [biz('dv', 'services', 500_000_000, 10, 150_000_000)], year: 2026, taxMethod: 'khoan' });
eq(t1.summary.taxMethod, 'income', 'T1 > 3 tỷ khóa PP tỷ lệ');
eq(t1.summary.totalPIT, 595_000_000, 'T1 PIT 595tr');
eq(t1.summary.totalVAT, 250_000_000, 'T1 VAT 250tr');
eq(t1.summary.totalNetIncome, 5e9 - 1.5e9 - 845_000_000, 'T1 net');

// T2: phân phối 1,5 tỷ + dịch vụ 0,6 tỷ (PP tỷ lệ) -> trừ ngưỡng vào dịch vụ (2%) trước: 0,6 tỷ; còn 0,4 tỷ trừ vào phân phối
// PIT = 0 + (1,5 - 0,4) tỷ x 0,5% = 5,5tr; VAT = 1,5 tỷ x 1% + 0,6 tỷ x 5% = 15tr + 30tr = 45tr
const t2biz = [biz('pp', 'distribution', 125_000_000, 12), biz('dv', 'services', 50_000_000, 12)];
const t2 = calculateHouseholdBusinessTax({ businesses: t2biz, year: 2026, taxMethod: 'khoan' });
eq(t2.businesses.map(b => b.thresholdDeduction), [400_000_000, 600_000_000], 'T2 phân bổ ngưỡng');
eq(t2.businesses.map(b => b.pitAmount), [5_500_000, 0], 'T2 PIT từng ngành');
eq(t2.summary.totalPIT, 5_500_000, 'T2 PIT 5,5tr');
eq(t2.summary.totalVAT, 45_000_000, 'T2 VAT 45tr');
eq(t2.summary.thresholdUsed, 1_000_000_000, 'T2 dùng đủ 1 tỷ');
eq(t2.summary.taxMethod, 'khoan', 'T2 PP tỷ lệ');

// T3: so sánh > 3 tỷ: không trả phương án tỷ lệ, không có savings
const c1 = compareTaxMethods2026([biz('dv', 'services', 500_000_000, 10, 150_000_000)]);
eq(c1.khoanResult, null, 'T3 khoanResult null');
eq([c1.recommendedMethod, c1.savings], ['income', 0], 'T3 bắt buộc thu nhập');

// T4: so sánh T2 (chi phí 0): thu nhập = 2,1 tỷ x 15% = 315tr + 45tr; tỷ lệ = 5,5tr + 45tr -> chênh 309,5tr
const c2 = compareTaxMethods2026(t2biz);
eq(c2.incomeResult.summary.totalPIT, 315_000_000, 'T4 PIT thu nhập 315tr');
eq([c2.recommendedMethod, c2.savings], ['khoan', 309_500_000], 'T4 khuyên tỷ lệ, chênh 309,5tr');

// T5: PP thu nhập ở cấp tổng (bù lỗ): A lãi 1,5 tỷ, B lỗ 0,5 tỷ, tổng DT 2,6 tỷ -> 15% x 1 tỷ = 150tr (cũ: 225tr)
const t5 = calculateHouseholdBusinessTax({
  businesses: [biz('A', 'services', 200_000_000, 10, 50_000_000), biz('B', 'production', 60_000_000, 10, 110_000_000)],
  year: 2026, taxMethod: 'income',
});
eq(t5.summary.totalPIT, 150_000_000, 'T5 bù lỗ 150tr');
eq(t5.businesses[1].pitAmount, 0, 'T5 hoạt động lỗ không có PIT');
eq(t5.summary.totalVAT, 118_000_000, 'T5 VAT 100tr + 18tr');

// T6: 900tr -> không thuế, nhắc thông báo doanh thu, không còn câu "không cần đăng ký kinh doanh"
const t6 = calculateHouseholdBusinessTax({ businesses: [biz('x', 'services', 75_000_000, 12)], year: 2026, taxMethod: 'khoan' });
eq(t6.summary.totalTax, 0, 'T6 không thuế');
eq(t6.businesses[0].recommendation.includes('01/TKN-CNKD') && !t6.businesses[0].recommendation.includes('không cần đăng ký'), true, 'T6 text');

// T7: 2025: dịch vụ 200tr -> khoán 2% + 5% trên toàn bộ DT; nội dung số 2025 thuộc dịch vụ 2%
const t7 = calculateHouseholdBusinessTax({ businesses: [biz('a', 'services', 100_000_000, 1), biz('b', 'digital_content', 100_000_000, 1)], year: 2025, taxMethod: 'income' });
eq([t7.summary.totalPIT, t7.summary.totalVAT], [4_000_000, 10_000_000], 'T7 năm 2025');

// T8: nội dung số 1,5 tỷ -> (1,5 - 1) tỷ x 5% = 25tr; VAT 75tr
const t8 = calculateHouseholdBusinessTax({ businesses: [biz('yt', 'digital_content', 125_000_000, 12)], year: 2026, taxMethod: 'khoan' });
eq([t8.summary.totalPIT, t8.summary.totalVAT], [25_000_000, 75_000_000], 'T8 nội dung số');

// T9: cho thuê xe 2 tỷ -> (2 - 1) tỷ x 5% = 50tr; VAT 100tr
const t9 = calculateHouseholdBusinessTax({ businesses: [biz('xe', 'rental_agency', 200_000_000, 10)], year: 2026, taxMethod: 'khoan' });
eq([t9.summary.totalPIT, t9.summary.totalVAT], [50_000_000, 100_000_000], 'T9 cho thuê tài sản');

// T10-T14: helpers + biên
eq([formatRate(0.17), formatRate(0.005), formatRate(0.015), formatTy(1e9), formatTy(3e9)], ['17%', '0,5%', '1,5%', '1 tỷ', '3 tỷ'], 'T10 format');
eq(TAX_METHOD_LABELS.khoan.includes('khoán'), false, 'T10 nhãn 2026 không còn "khoán"');
eq(allocateThreshold([{ revenue: 3e8, rate: 0.005 }, { revenue: 5e8, rate: 0.05 }, { revenue: 4e8, rate: 0.02 }], 1e9), [1e8, 5e8, 4e8], 'T11 thứ tự thuế suất giảm dần');
eq([getIncomeTaxRate2026(1e9), getIncomeTaxRate2026(3e9), getIncomeTaxRate2026(50e9), getIncomeTaxRate2026(60e9)], [0, 0.15, 0.17, 0.2], 'T12 bậc PP thu nhập');
const t13 = calculateHouseholdBusinessTax({ businesses: [biz('dv', 'services', 250_000_000, 12)], year: 2026, taxMethod: 'khoan' });
eq([t13.summary.taxMethod, t13.summary.totalPIT], ['khoan', 40_000_000], 'T13 đúng 3 tỷ vẫn được chọn tỷ lệ');
const t14 = calculateHouseholdBusinessTax({ businesses: [biz('dv', 'services', 1e9, 1)], year: 2026, taxMethod: 'khoan' });
eq(t14.summary.totalTax, 0, 'T14 đúng 1 tỷ không thuế');
// T15: số tháng = 0 (ô đang xóa) không gây NaN
const t15 = calculateHouseholdBusinessTax({ businesses: [biz('dv', 'services', 1e8, 0)], year: 2026, taxMethod: 'income' });
eq([t15.summary.totalTax, t15.summary.totalNetIncome], [0, 0], 'T15 0 tháng');

console.log(`BUS household OK: ${n} assertions`);
