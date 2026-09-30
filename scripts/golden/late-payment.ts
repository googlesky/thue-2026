// Mục 2 — tiền chậm nộp
import assert from 'node:assert/strict';
import {
  calculateLatePayment, formatPercent, generateInterestMilestones, getUpcomingDeadlines,
} from '@/lib/latePaymentCalculator';
import { DEFAULT_LATE_PAYMENT_STATE } from '@/lib/snapshotTypes';
import { daysBetween } from '@/lib/taxDeadlines';

const D = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h);
let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.equal(a, b, msg); n++; };
const calc = (due: Date, paid: Date, taxAmount = 10_000_000) =>
  calculateLatePayment({ taxType: 'annual_pit', taxAmount, dueDate: due, paymentDate: paid });

// Hạn 30/4/2026 (lễ) → hạn thực tế 04/5/2026
let r = calc(D(2026, 4, 30), D(2026, 5, 6));
eq(daysBetween(r.effectiveDueDate, D(2026, 5, 4)), 0, 'hạn thực tế 04/5/2026');
eq(r.daysLate, 1, 'nộp 06/5 → 1 ngày');
eq(r.interestAmount, 3_000, '10tr × 0,03% × 1 = 3.000');
eq(r.totalAmount, 10_003_000, 'tổng = thuế + tiền chậm nộp');
eq(r.isLate, true, 'isLate');

r = calc(D(2026, 4, 30), D(2026, 5, 5));
eq(r.isLate, false, 'nộp 05/5 (liền sau hạn thực tế) → không phát sinh');
eq(r.interestAmount, 0, 'tiền chậm nộp 0');
assert.match(r.legalNote ?? '', /ngày liền sau hạn/); n++;

r = calc(D(2026, 3, 31), D(2026, 3, 31, 17));
eq(r.isLate, false, 'nộp đúng ngày hạn');
assert.match(r.legalNote ?? '', /trong hạn/); n++;

// 20/1/2026 → 30/4/2026: 100 ngày kể từ hạn, tính 99 ngày → 297.000; quá 90 ngày → cưỡng chế
r = calc(D(2026, 1, 20), D(2026, 4, 30));
eq(r.daysLate, 99, '20/1 → 30/4/2026: 99 ngày');
eq(r.interestAmount, 297_000, '10tr × 0,03% × 99');
eq(r.dailyInterest, 3_000, 'mỗi ngày 3.000');
assert.match(r.warning ?? '', /cưỡng chế/); n++;
assert.match(r.legalNote ?? '', /không bị phạt tiền/); n++;

// 20/1/2026 → 01/3/2026: 40 ngày kể từ hạn → cảnh báo 30 ngày
r = calc(D(2026, 1, 20), D(2026, 3, 1));
eq(r.daysLate, 39, '20/1 → 1/3/2026: 39 ngày');
eq(r.interestAmount, 117_000, '10tr × 0,03% × 39');
assert.match(r.warning ?? '', /30 ngày/); n++;

// Dưới 30 ngày: chỉ ghi chú căn cứ
r = calc(D(2026, 1, 20), D(2026, 1, 25));
eq(r.daysLate, 4, '20/1 → 25/1: 21..24 = 4 ngày');
eq(r.warning, undefined, 'không cảnh báo');
assert.match(r.legalNote ?? '', /Điều 26\.1\.a/); n++;

// Định dạng
eq(formatPercent(0.0003), '0,03%', 'formatPercent dấu phẩy');
eq(formatPercent(0.0003 * 365), '10,95%', '0,03% × 365');
const ms = generateInterestMilestones(10_000_000);
eq(ms[3].label, '1,5 tháng', 'nhãn 1,5 tháng');
eq(ms[3].interestAmount, 135_000, '45 ngày × 3.000');

// Hạn sắp tới tại 29/9/2026 (6 tháng: đến 29/3/2027)
const up = getUpcomingDeadlines(D(2026, 9, 29, 10));
eq(up.length, 3, `3 hạn: ${up.map(d => d.name).join(' | ')}`);
eq(up[0].name, 'Thuế quý 3/2026', 'đầu tiên: quý 3/2026');
eq(daysBetween(up[0].date, D(2026, 11, 2)), 0, 'quý 3/2026 → 02/11/2026');
eq(daysBetween(up[2].date, D(2027, 2, 1)), 0, 'quý 4/2026 → 01/02/2027');
// Đúng ngày hạn vẫn hiển thị (không bị ẩn do giờ hiện tại)
eq(getUpcomingDeadlines(D(2026, 11, 2, 23))[0].name, 'Thuế quý 3/2026', 'đúng ngày hạn vẫn còn');
// Tháng 12: thấy cả quý 1 năm sau và quyết toán cá nhân
const dec = getUpcomingDeadlines(D(2026, 12, 15)).map(d => d.name);
assert.ok(dec.includes('Quyết toán TNCN năm 2026 (cá nhân)') && dec.includes('Thuế quý 1/2027'), dec.join(' | ')); n++;

// Hạn mặc định của tab = hạn cá nhân tự quyết toán năm trước
if (new Date().getFullYear() === 2026) eq(DEFAULT_LATE_PAYMENT_STATE.dueDate, '2026-05-04', 'mặc định 04/5/2026');

console.log(`OK latePayment: ${n} assert`);
