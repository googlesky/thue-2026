import assert from 'node:assert/strict';
import { calculateContentCreatorTax, spreadAnnual, PLATFORMS } from '@/lib/contentCreatorTaxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const flat = (monthly: number) => Array(12).fill(monthly);
const run = (year: number, platforms: [string, number[]][], isRegisteredBusiness = false, annualExpenses = 0) =>
  calculateContentCreatorTax({ year, platforms: platforms.map(([platformId, monthlyIncome]) => ({ platformId, monthlyIncome })), isRegisteredBusiness, annualExpenses });

// C1: nội dung số 1,5 tỷ: TNCN (1,5 - 1) tỷ x 5% = 25tr; GTGT 1,5 tỷ x 5% = 75tr
// Theo quý (125tr/tháng): lũy kế Q1 375tr, Q2 750tr (chưa vượt) -> 0; Q3 1,125 tỷ -> 6,25tr + 56,25tr = 62,5tr; Q4 37,5tr
const c1 = run(2026, [['youtube', flat(125e6)]]);
eq([c1.pitAmount, c1.vatAmount, c1.totalTaxDue, c1.method], [25_000_000, 75_000_000, 100_000_000, 'khoan'], 'C1 nội dung số 1,5 tỷ');
eq(c1.quarters.map(q => q.tax), [0, 0, 62_500_000, 37_500_000], 'C1 nghĩa vụ từ quý vượt ngưỡng');
eq(c1.totalWithheld, 0, 'C1 nền tảng nước ngoài không khấu trừ 10%');

// C2: YouTube 1,2 tỷ + Shopee 0,6 tỷ: trừ ngưỡng vào nội dung số (5%) trước -> YT 0,2 tỷ x 5% = 10tr; Shopee 0,6 tỷ x 2% = 12tr
// GTGT 1,8 tỷ x 5% = 90tr. Khấu trừ 10% Shopee (50tr/tháng) = 60tr - KHÔNG trừ vào thuế kinh doanh
const c2 = run(2026, [['youtube', flat(100e6)], ['shopee', flat(50e6)]]);
eq([c2.pitAmount, c2.vatAmount, c2.totalTaxDue], [22_000_000, 90_000_000, 112_000_000], 'C2 hai nhóm tỷ lệ');
eq(c2.totalIncomeByPlatform.map(p => p.thresholdDeduction), [1e9, 0], 'C2 phân bổ ngưỡng');
eq(c2.totalWithheld, 60_000_000, 'C2 khấu trừ 10% tách riêng');
eq(run(2026, [['youtube', flat(100e6)], ['shopee', flat(50e6)]], true).totalWithheld, 0, 'C2 đã ĐKKD: không khấu trừ tiền công');

// C3: đúng 1 tỷ -> không thuế, không có thuế quý
const c3 = run(2026, [['tiktok', spreadAnnual(1e9)]]);
eq([c3.isExempt, c3.totalTaxDue, c3.quarters.map(q => q.tax)], [true, 0, [0, 0, 0, 0]], 'C3 ngưỡng');

// C4: > 3 tỷ: YouTube 4,8 tỷ, chi phí 1,2 tỷ -> PP thu nhập (4,8 - 1,2) x 17% = 612tr; GTGT 240tr
// Quý: lũy kế 1,2 tỷ -> 60tr + 0,9 tỷ x 17% = 213tr; mỗi quý 213tr
const c4 = run(2026, [['youtube', flat(400e6)]], false, 1.2e9);
eq([c4.method, c4.pitAmount, c4.vatAmount], ['income', 612_000_000, 240_000_000], 'C4 bắt buộc PP thu nhập');
eq(c4.quarters.map(q => q.tax), [213e6, 213e6, 213e6, 213e6], 'C4 tạm nộp theo quý');

// C5: 2025: ngưỡng 100tr, 2% + 5% trên toàn bộ doanh thu
const c5 = run(2025, [['youtube', spreadAnnual(200e6)]]);
eq([c5.pitAmount, c5.vatAmount], [4_000_000, 10_000_000], 'C5 năm 2025');

// C6: ngưỡng khấu trừ theo tháng chi trả: 3tr/tháng -> T1-T6 (ngưỡng 2tr) bị khấu trừ 300k; T7-T12 (5tr) không
const c6 = run(2026, [['lazada', flat(3e6)]]);
eq([c6.totalWithheld, c6.quarters.map(q => q.withheld)], [1_800_000, [900_000, 900_000, 0, 0]], 'C6 ngưỡng 2tr -> 5tr');

// C7: chia năm -> tháng khớp tổng
const s = spreadAnnual(1_000_000_001);
eq([s.reduce((a, b) => a + b, 0), s.every(v => v >= 0)], [1_000_000_001, true], 'C7 tổng tháng = năm');

// C8: hạn quý = ngày cuối cùng tháng đầu quý sau
eq(c1.quarters.map(q => q.deadline), ['30/04', '31/07', '31/10', '31/01 năm sau'], 'C8 hạn quý');

// C9: không còn văn bản lỗi thời
const text = JSON.stringify([c1, c2, c3, c4, c6].map(r => r.recommendations));
eq(['7% trên toàn bộ', '500 triệu', '2 triệu', 'Ngày 30 tháng đầu', 'Hoàn '].map(t => text.includes(t)), [false, false, false, false, false], 'C9 text');
eq(PLATFORMS.filter(p => p.type === 'domestic').every(p => p.category === 'services'), true, 'C10 affiliate nhóm 2%');
console.log(`BUS contentCreator OK: ${n} assertions`);
