// Mục 4 — lịch thuế
import assert from 'node:assert/strict';
import {
  TAX_DEADLINES, getNextOccurrence, getDaysUntilDeadline, getDeadlinesForDate, getUpcomingDeadlines,
  formatDeadlineDate, generateICSContent, generateGoogleCalendarUrl, generateOutlookCalendarUrl,
} from '@/utils/taxCalendarData';
import { daysBetween } from '@/lib/taxDeadlines';

const D = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h);
let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.equal(a, b, msg); n++; };
const byId = (id: string) => { const d = TAX_DEADLINES.find(x => x.id === id); assert.ok(d, `thiếu ${id}`); return d!; };
const next = (id: string, from: Date) => getNextOccurrence(byId(id), from);
const sameDay = (a: Date | null, b: Date, msg: string) => { assert.ok(a, `${msg}: null`); eq(daysBetween(a!, b), 0, `${msg}: ${a!.toDateString()}`); };
const idsOn = (y: number, m: number, d: number) => getDeadlinesForDate(y, m, d).map(x => x.id);

// Dữ liệu
for (const gone of ['dependent-registration-h1', 'annual-tax-payment', 'bhxh-adjustment']) {
  eq(TAX_DEADLINES.some(d => d.id === gone), false, `bỏ mục ${gone}`);
}
eq(JSON.stringify(byId('annual-settlement').date), JSON.stringify({ month: 4, day: 30 }), 'cá nhân tự quyết toán 30/4');
eq(JSON.stringify(byId('annual-settlement-org').date), JSON.stringify({ month: 3, day: 31 }), 'tổ chức quyết toán 31/3');
eq(JSON.stringify(byId('financial-report').date), JSON.stringify({ month: 3, day: 31 }), 'BCTC 31/3');
eq(['q1', 'q2', 'q3', 'q4'].map(q => byId(`quarterly-pit-${q}`).date.day).join(','), '30,31,31,31', 'quý: ngày cuối tháng đầu quý sau');
eq(TAX_DEADLINES.some(d => /Tổng cục Thuế|15\.5|6\.2 triệu|TT 111|80\/2021|126\/2020/.test(d.description + d.title)), false, 'không còn text cũ');
assert.match(byId('new-law-2026').description, /15,5 triệu/); n++;
assert.match(byId('new-law-2026').description, /01\/01\/2026/); n++;

// Lần diễn ra tiếp theo (đã dời ngày nghỉ) — hôm nay 29/9/2026
const today = D(2026, 9, 29, 10);
sameDay(next('annual-settlement', today), D(2027, 5, 4), 'cá nhân quyết toán 2026 → 04/5/2027');
sameDay(next('annual-settlement-org', today), D(2027, 3, 31), 'tổ chức quyết toán → 31/3/2027');
sameDay(next('quarterly-pit-q3', today), D(2026, 11, 2), 'quý 3 → 02/11/2026');
sameDay(next('quarterly-pit-q3', D(2026, 11, 2, 15)), D(2026, 11, 2), 'đúng ngày hạn vẫn là lần tiếp theo');
eq(getDaysUntilDeadline(byId('quarterly-pit-q3'), D(2026, 11, 2, 23)), 0, 'đúng ngày hạn: còn 0 ngày');
sameDay(next('quarterly-pit-q3', D(2026, 11, 3)), D(2027, 11, 1), 'qua hạn → năm sau 31/10/2027 (CN) → 01/11/2027');
sameDay(next('monthly-vat-pit-20', today), D(2026, 10, 20), 'GTGT tháng: 20/10/2026');
sameDay(next('monthly-vat-pit-20', D(2026, 9, 21, 9)), D(2026, 9, 21), '20/9/2026 CN → 21/9 (hôm nay vẫn hiện)');
eq(next('new-law-2026', today), null, 'sự kiện 01/7/2026 đã qua');
sameDay(next('new-law-2026', D(2026, 7, 1, 20)), D(2026, 7, 1), 'đúng ngày sự kiện vẫn hiện');
eq(getDaysUntilDeadline(byId('new-law-2026'), today), null, 'đã qua → null');

// Ô lịch theo ngày thực tế
assert.ok(idsOn(2026, 9, 21).includes('monthly-vat-pit-20') && !idsOn(2026, 9, 20).includes('monthly-vat-pit-20'), '20/9/2026 → 21/9'); n++;
assert.ok(idsOn(2026, 11, 2).includes('quarterly-pit-q3') && !idsOn(2026, 10, 31).includes('quarterly-pit-q3'), 'quý 3 hiện 02/11'); n++;
const feb1 = idsOn(2027, 2, 1);
assert.ok(['quarterly-pit-q4', 'household-revenue-notice', 'rental-annual'].every(id => feb1.includes(id)), `01/02/2027: ${feb1}`); n++;
const may4 = idsOn(2026, 5, 4);
assert.ok(may4.includes('annual-settlement') && may4.includes('quarterly-pit-q1'), `04/5/2026: ${may4}`); n++;
assert.ok(idsOn(2026, 12, 31).includes('dependent-registration-next-year'), 'NPT 31/12 không dời'); n++;
assert.ok(idsOn(2026, 7, 1).includes('new-law-2026') && !idsOn(2027, 7, 1).includes('new-law-2026'), 'sự kiện chỉ năm 2026'); n++;
eq(idsOn(2026, 2, 20).includes('monthly-vat-pit-20'), false, '20/02/2026 Tết không có mốc');
assert.ok(idsOn(2026, 2, 23).includes('monthly-vat-pit-20'), '→ 23/02/2026'); n++;

// Hiển thị
eq(formatDeadlineDate(byId('annual-settlement'), today), '4/5/2027 (dời từ 30/4)', 'hiển thị ngày dời');
eq(formatDeadlineDate(byId('annual-settlement-org'), today), '31/3/2027', 'không dời');
eq(formatDeadlineDate(byId('new-law-2026'), today), '1/7/2026', 'sự kiện đã qua vẫn hiện ngày');
eq(formatDeadlineDate(byId('monthly-vat-pit-20'), today), 'Ngày 20 hàng tháng', 'hằng tháng');

// Sắp tới (90 ngày, sắp xếp)
const up = getUpcomingDeadlines(90, 'all', today).map(d => d.id);
eq(up[0], 'monthly-vat-pit-20', `đầu danh sách: ${up}`);
eq(up[1], 'quarterly-pit-q3', 'thứ hai: quý 3');

// Xuất lịch: lần tiếp theo, ngày local, không RRULE
const ics = generateICSContent(byId('quarterly-pit-q3'), today);
assert.ok(ics.includes('DTSTART;VALUE=DATE:20261102') && ics.includes('DTEND;VALUE=DATE:20261103'), 'ICS ngày 02/11/2026'); n++;
eq(ics.includes('RRULE'), false, 'ICS không RRULE');
assert.ok(ics.includes('UID:quarterly-pit-q3-20261102@'), 'UID theo ngày'); n++;
assert.ok(/DESCRIPTION:.*\\,/.test(ics), 'ICS escape dấu phẩy'); n++;
const g = new URL(generateGoogleCalendarUrl(byId('annual-settlement'), today)).searchParams.get('dates');
eq(g, '20270504/20270505', 'Google: 04/5/2027');
const o = new URL(generateOutlookCalendarUrl(byId('quarterly-pit-q3'), today)).searchParams;
eq(`${o.get('startdt')}..${o.get('enddt')}`, '2026-11-02..2026-11-03', 'Outlook ngày local (không lệch UTC)');

console.log(`OK calendar: ${n} assert (TZ=${Intl.DateTimeFormat().resolvedOptions().timeZone})`);
