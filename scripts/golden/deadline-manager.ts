// Mục 3 — quản lý deadline
import assert from 'node:assert/strict';
import {
  calculateDeadlineManager, generateStandardDeadlines, DEADLINE_CONFIGS, getDeadlineStatus,
} from '@/lib/taxDeadlineManager';
import { daysBetween } from '@/lib/taxDeadlines';

const D = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h);
let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.equal(a, b, msg); n++; };
const sameDay = (a: Date, b: Date, msg: string) => eq(daysBetween(a, b), 0, `${msg}: ${a.toDateString()}`);

const a = generateStandardDeadlines(2026, true, true);
const b = generateStandardDeadlines(2026, true, true);
eq(a.length, 17, '4 cá nhân + 4 GTGT/TNCN + 4 TNDN + 1 quyết toán tổ chức + 4 hộ KD');
eq(JSON.stringify(a.map(d => d.id)), JSON.stringify(b.map(d => d.id)), 'ID xác định giữa 2 lần tính');
eq(new Set(a.map(d => d.id)).size, a.length, 'ID không trùng');
const byId = new Map(a.map(d => [d.id, d]));
const get = (id: string) => { const d = byId.get(id); assert.ok(d, `thiếu ${id}`); return d!; };

sameDay(get('pit_annual-2025').dueDate, D(2026, 5, 4), 'cá nhân tự quyết toán 2025 → 04/5/2026');
sameDay(get('cit_annual-2025').dueDate, D(2026, 3, 31), 'tổ chức quyết toán 2025 → 31/3/2026');
sameDay(get('rental_quarterly-2026-H1').dueDate, D(2026, 7, 31), 'cho thuê lần 1 → 31/7/2026');
sameDay(get('rental_quarterly-2026-H2').dueDate, D(2027, 2, 1), 'cho thuê lần 2 → 31/01/2027 CN → 01/02/2027');
sameDay(get('vat_quarterly-2026-Q1').dueDate, D(2026, 5, 4), 'quý 1/2026 → 04/5/2026');
sameDay(get('vat_quarterly-2026-Q3').dueDate, D(2026, 11, 2), 'quý 3/2026 → 02/11/2026');
sameDay(get('household_quarterly-2026-Q4').dueDate, D(2027, 2, 1), 'hộ KD quý 4/2026 → 01/02/2027');
sameDay(get('dependent_registration-2026').dueDate, D(2026, 12, 31), 'đăng ký NPT 31/12 của chính năm');
eq(a.some(d => (d.type as string) === 'insurance_annual'), false, 'bỏ "Quyết toán BHXH 28/2"');
eq('insurance_annual' in DEADLINE_CONFIGS, false, 'không còn cấu hình BHXH');
assert.match(DEADLINE_CONFIGS.household_quarterly.name, /1 tỷ/); n++;
eq(Object.values(DEADLINE_CONFIGS).some(c => /TT 40|Thông tư 40|111\/2013|80\/2021|38\/2019|126\/2020|khoán/.test(JSON.stringify(c))), false, 'không còn căn cứ cũ/thuế khoán');

// Trạng thái + deadline tiếp theo sau khi áp hoàn thành
const today = D(2026, 9, 29, 10);
let r = calculateDeadlineManager({ year: 2026, includePersonal: true, includeBusiness: true, customDeadlines: [], today });
eq(r.nextDeadline?.id, 'vat_quarterly-2026-Q3', 'chưa tick: hạn tiếp theo = GTGT/TNCN quý 3');
eq(r.allDeadlines.find(d => d.id === 'pit_annual-2025')?.status, 'overdue', 'quyết toán 2025 quá hạn tại 29/9/2026');
r = calculateDeadlineManager({
  year: 2026, includePersonal: true, includeBusiness: true, customDeadlines: [], today,
  completedIds: new Set(['vat_quarterly-2026-Q3', 'pit_annual-2025']),
});
eq(r.nextDeadline?.id, 'cit_quarterly-2026-Q3', 'đã tick quý 3 GTGT → hạn tiếp theo là TNDN quý 3');
eq(r.allDeadlines.find(d => d.id === 'pit_annual-2025')?.status, 'completed', 'tick giữ được qua lần tính lại');
eq(r.summary.completed, 2, '2 hạn hoàn thành');
eq(r.summary.total, r.summary.upcoming + r.summary.dueSoon + r.summary.overdue + r.summary.completed, 'tổng khớp');
eq(r.overdueDeadlines.some(d => d.id === 'pit_annual-2025'), false, 'đã hoàn thành không nằm trong quá hạn');

// Biên trạng thái theo ngày local (hạn 02/11/2026)
const at = (d: Date) => calculateDeadlineManager({ year: 2026, includePersonal: false, includeBusiness: true, customDeadlines: [], today: d })
  .allDeadlines.find(x => x.id === 'vat_quarterly-2026-Q3')!.status;
eq(at(D(2026, 10, 25, 23)), 'upcoming', 'còn 8 ngày → sắp tới');
eq(at(D(2026, 10, 26, 0)), 'due_soon', 'còn 7 ngày → sắp đến hạn');
eq(at(D(2026, 11, 2, 23)), 'due_soon', 'đúng ngày hạn (23h) → chưa quá hạn');
eq(at(D(2026, 11, 3, 0)), 'overdue', 'ngày sau hạn → quá hạn');
eq(getDeadlineStatus(-1), 'overdue', 'getDeadlineStatus(-1)');

// Deadline tùy chỉnh
r = calculateDeadlineManager({
  year: 2026, includePersonal: false, includeBusiness: false, today,
  customDeadlines: [{ id: 'c1', type: 'custom', name: 'X', dueDate: D(2026, 9, 29), status: 'upcoming', isCustom: true }],
});
eq(r.allDeadlines[0].status, 'due_soon', 'tùy chỉnh đúng hôm nay → sắp đến hạn');
eq(r.nextDeadline?.id, 'c1', 'tùy chỉnh hôm nay là hạn tiếp theo');

console.log(`OK deadlineManager: ${n} assert`);
