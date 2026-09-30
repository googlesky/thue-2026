import assert from 'node:assert/strict';
import {
  calculateTransferTax as calc,
  calculateRealEstateTransferTax,
  createEmptyTransfer,
  daysBetween,
  estimateTransferTax,
  type RealEstateTransfer,
} from '@/lib/realEstateTransferTaxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const T = (p: Partial<RealEstateTransfer>): RealEstateTransfer => ({
  ...createEmptyTransfer(), transferDate: '2026-09-29', transferValue: 3e9, ...p,
});

// 1) Mua bán người ngoài 3 tỷ: TNCN 2% = 60tr (bên bán), LPTB 0,5% = 15tr (bên mua)
let r = calc(T({ transferType: 'sale', relationship: 'non_relative' }));
eq([r.pitAmount, r.registrationFee, r.totalFees, r.netProceeds, r.pitPayer], [60e6, 15e6, 75e6, 2.94e9, 'seller'], 'mua bán 3 tỷ');
eq(r.isExempt, false, 'không miễn');

// 2) Bán cho anh/chị/em ruột: miễn TNCN nhưng vẫn LPTB; bên bán nhận đủ 3 tỷ
r = calc(T({ transferType: 'sale', relationship: 'siblings' }));
eq([r.pitAmount, r.exemptionAmount, r.registrationFee, r.netProceeds], [0, 60e6, 15e6, 3e9], 'anh chị em miễn TNCN');
eq(calc(T({ transferType: 'sale', relationship: 'parent_in_law' })).isExempt, true, 'dâu/rể miễn');
eq(calc(T({ transferType: 'sale', relationship: 'other_relative' })).pitAmount, 60e6, 'họ hàng khác 2%');

// 3) Tặng cho người ngoài 2 tỷ: 10% × phần vượt ngưỡng (không phải 2%)
r = calc(T({ transferType: 'gift', relationship: 'non_relative', transferValue: 2e9, transferDate: '2026-07-01' }));
eq([r.pitAmount, r.pitRate, r.pitPayer, r.registrationFee, r.netProceeds], [198e6, 10, 'recipient', 10e6, 0], 'tặng cho 01/7/2026');
eq(calc(T({ transferType: 'gift', relationship: 'non_relative', transferValue: 2e9, transferDate: '2026-06-30' })).pitAmount, 199e6, 'tặng cho 30/6/2026 ngưỡng 10tr');
// Thừa kế từ họ hàng khác 1 tỷ: (1.000 − 20) × 10% = 98tr
eq(calc(T({ transferType: 'inheritance', relationship: 'other_relative', transferValue: 1e9 })).pitAmount, 98e6, 'thừa kế họ hàng khác');

// 4) Thừa kế từ ông bà 5 tỷ: miễn TNCN, LPTB vẫn tính 25tr (có ghi chú NĐ 10/2022)
r = calc(T({ transferType: 'inheritance', relationship: 'grandparent_grandchild', transferValue: 5e9 }));
eq([r.pitAmount, r.exemptionAmount, r.registrationFee], [0, 498e6, 25e6], 'thừa kế ông bà');
assert.ok(r.notes.some((x) => x.includes('NĐ 10/2022'))); n++;

// 5) Ly hôn chia tài sản 4 tỷ: miễn
r = calc(T({ transferType: 'divorce', transferValue: 4e9 }));
eq([r.isExempt, r.pitAmount, r.registrationFee], [true, 0, 20e6], 'ly hon');
assert.ok(r.exemptionReason?.includes('Điều 18.2')); n++;

// 6) Nhà ở duy nhất: GCN 01/01/2026 → 03/7/2026 = 183 ngày (miễn); 02/7/2026 = 182 ngày (không)
eq(daysBetween('2026-01-01', '2026-07-03'), 183, '183 ngày');
const only = { transferType: 'sale' as const, relationship: 'non_relative' as const, isOnlyHome: true, certificateDate: '2026-01-01', transfersWhole: true };
eq(calc(T({ ...only, transferDate: '2026-07-03' })).isExempt, true, 'đủ 183 ngày');
r = calc(T({ ...only, transferDate: '2026-07-02' }));
eq([r.isExempt, r.pitAmount], [false, 60e6], '182 ngày chưa đủ');
assert.ok(r.exemptionReason?.includes('182 ngày')); n++;
r = calc(T({ ...only, certificateDate: '2020-05-10', transfersWhole: false }));
eq(r.isExempt, false, 'chuyen mot phan'); assert.ok(r.exemptionReason?.includes('một phần')); n++;
eq(calc(T({ ...only, certificateDate: '2020-05-10', isFutureHousing: true })).isExempt, false, 'nhà hình thành trong tương lai');
eq(calc(T({ ...only, certificateDate: '2020-05-10', propertyType: 'commercial' })).isExempt, false, 'BDS thuong mai');
r = calc(T({ ...only, certificateDate: '' }));
eq(r.isExempt, false, 'thieu ngay GCN'); assert.ok(r.exemptionReason?.includes('ngày cấp')); n++;
eq(calc(T({ ...only, certificateDate: '2020-05-10' })).isExempt, true, 'nhà duy nhất đủ điều kiện');
// isOnlyHome chỉ áp dụng mua bán: tặng cho nhà duy nhất cho người ngoài vẫn chịu 10%
eq(calc(T({ ...only, transferType: 'gift', certificateDate: '2020-05-10', transferValue: 1e9 })).pitAmount, 98e6, 'tặng cho không xét nhà duy nhất');

// 7) Tính nhanh: LPTB luôn tính, bên bán nhận = giá − TNCN
eq(estimateTransferTax(3e9, false), { pit: 60e6, registrationFee: 15e6, total: 75e6, netProceeds: 2.94e9 }, 'ước tính nhanh: không miễn');
eq(estimateTransferTax(3e9, true), { pit: 0, registrationFee: 15e6, total: 15e6, netProceeds: 3e9 }, 'ước tính nhanh: miễn');

// 8) Tổng hợp
const s = calculateRealEstateTransferTax({ transfers: [
  T({ transferType: 'sale', relationship: 'non_relative' }),
  T({ transferType: 'gift', relationship: 'non_relative', transferValue: 2e9, transferDate: '2026-07-01' }),
] }).summary;
eq([s.totalPIT, s.totalRegistrationFee, s.totalFees, s.totalNetProceeds], [258e6, 25e6, 283e6, 2.94e9], 'tong hop');

// 9) Ngày mặc định = hôm nay theo giờ địa phương
const d = new Date();
eq(createEmptyTransfer().transferDate, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, 'ngày theo giờ địa phương');

console.log(`REALESTATE OK: ${n} assertions`);
