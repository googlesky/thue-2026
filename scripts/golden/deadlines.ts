// Mục 1 — module hạn nộp dùng chung. Chạy: npx tsx --tsconfig tsconfig.json <file> (thử nhiều TZ)
import assert from 'node:assert/strict';
import {
  toWorkingDay, daysLate, daysBetween, quarterDeadline, monthlyDeadline, annualDeadline,
} from '@/lib/taxDeadlines';

const D = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi);
let n = 0;
const same = (a: Date, b: Date, msg: string) => {
  assert.equal(daysBetween(a, b), 0, `${msg}: got ${a.toDateString()} want ${b.toDateString()}`);
  assert.equal(a.getHours(), 0, `${msg}: phải là 00:00 local`);
  n++;
};
const eq = (a: unknown, b: unknown, msg: string) => { assert.equal(a, b, msg); n++; };

// Kết quả mong đợi trong ADM.md
same(quarterDeadline(2025, 4), D(2026, 2, 2), 'Q4/2025: 31/01/2026 (T7) → 02/02/2026');
same(monthlyDeadline(2026, 1), D(2026, 2, 23), 'T1/2026: 20/02/2026 (Tết) → 23/02/2026');
same(annualDeadline(2025, 'individual'), D(2026, 5, 4), 'QT cá nhân 2025: 30/4/2026 → 04/5/2026');
same(quarterDeadline(2026, 3), D(2026, 11, 2), 'Q3/2026: 31/10/2026 (T7) → 02/11/2026');
same(quarterDeadline(2026, 4), D(2027, 2, 1), 'Q4/2026: 31/01/2027 (CN) → 01/02/2027');
same(annualDeadline(2026, 'org'), D(2027, 3, 31), 'QT tổ chức 2026: 31/3/2027 (T4)');
same(annualDeadline(2026, 'individual'), D(2027, 5, 4), 'QT cá nhân 2026: 30/4/2027 → 04/5/2027');
eq(daysLate(D(2026, 3, 31), D(2026, 4, 1)), 0, 'hạn 31/3/2026 nộp 01/4 → 0');
eq(daysLate(D(2026, 3, 31), D(2026, 4, 2)), 1, 'hạn 31/3/2026 nộp 02/4 → 1');
eq(daysLate(D(2026, 10, 31), D(2026, 11, 2)), 0, 'hạn 31/10/2026 nộp 02/11 → 0');
eq(daysLate(D(2026, 10, 31), D(2026, 11, 4)), 1, 'hạn 31/10/2026 nộp 04/11 → 1');
eq(daysLate(D(2026, 4, 30), D(2026, 5, 5)), 0, 'hạn 30/4/2026 nộp 05/5 → 0');
eq(daysLate(D(2026, 4, 30), D(2026, 5, 6)), 1, 'hạn 30/4/2026 nộp 06/5 → 1');

// Bổ sung (tính tay)
same(quarterDeadline(2026, 1), D(2026, 5, 4), 'Q1/2026: 30/4 lễ, 1/5 lễ, 2-3/5 cuối tuần → 04/5');
same(quarterDeadline(2026, 2), D(2026, 7, 31), 'Q2/2026: 31/7/2026 thứ Sáu');
same(annualDeadline(2025, 'org'), D(2026, 3, 31), 'QT tổ chức 2025: 31/3/2026 thứ Ba');
same(monthlyDeadline(2026, 12), D(2027, 1, 20), 'T12/2026: 20/01/2027 thứ Tư');
same(monthlyDeadline(2026, 8), D(2026, 9, 21), 'T8/2026: 20/9/2026 CN → 21/9');
same(toWorkingDay(D(2026, 8, 29)), D(2026, 8, 31), '29/8/2026 (T7) → 31/8/2026 (thứ Hai, khu vực DN không nghỉ)');
same(toWorkingDay(D(2026, 9, 1)), D(2026, 9, 3), '01/9/2026 lễ, 02/9 lễ → 03/9');
same(toWorkingDay(D(2026, 4, 25, 15, 30)), D(2026, 4, 28), '25/4/2026 (T7, có giờ) → 26 CN → 27 nghỉ bù → 28/4');
eq(daysLate(D(2026, 1, 20), D(2026, 1, 20, 23, 59)), 0, 'nộp đúng ngày hạn (có giờ) → 0');
eq(daysLate(D(2026, 1, 20), D(2026, 1, 10)), 0, 'nộp trước hạn → 0');
eq(daysLate(D(2026, 1, 30), D(2026, 2, 5)), 5, '30/1/2026 (T6) nộp 5/2 → 31/1..4/2 = 5 ngày');
eq(daysLate(D(2025, 12, 31), D(2026, 12, 31)), 364, 'qua năm: 01/01/2026..30/12/2026 = 364 ngày');
eq(daysBetween(D(2026, 3, 1), D(2026, 3, 31)), 30, 'daysBetween 1/3 → 31/3 = 30 (kể cả TZ có DST)');
eq(daysBetween(D(2026, 11, 2), D(2026, 10, 31)), -2, 'daysBetween âm');

console.log(`OK taxDeadlines: ${n} assert (TZ=${Intl.DateTimeFormat().resolvedOptions().timeZone})`);
