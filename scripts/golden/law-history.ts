// Mục 7 — lịch sử luật
import assert from 'node:assert/strict';
import * as H from '@/lib/taxLawHistory';
import { NEW_TAX_BRACKETS, OLD_TAX_BRACKETS, NEW_DEDUCTIONS, OLD_DEDUCTIONS } from '@/lib/taxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.equal(a, b, msg); n++; };
const t = (s: string) => { const [d, m, y] = s.split('/').map(Number); return new Date(y, m - 1, d).getTime(); };
const ms = H.TAX_LAW_MILESTONES;
const byId = (id: string) => { const x = ms.find(m => m.id === id); assert.ok(x, `thiếu ${id}`); return x!; };
const text = JSON.stringify(ms);

// Sắp xếp theo thời gian
for (let i = 1; i < ms.length; i++) assert.ok(t(ms[i - 1].date) <= t(ms[i].date), `thứ tự ${ms[i - 1].id} → ${ms[i].id}`);
n++;

// NQ 954: giai đoạn 11tr bắt đầu 01/01/2020, giai đoạn trước kết thúc 31/12/2019
const p = (id: string) => { const x = H.TAX_LAW_PERIODS.find(q => q.id === id); assert.ok(x, `thiếu kỳ ${id}`); return x!; };
eq(p('2013-2020').effectiveTo, '31/12/2019', 'giai đoạn 9tr kết thúc 31/12/2019');
eq(p('2020-2025').effectiveFrom, '01/01/2020', 'giai đoạn 11tr bắt đầu 01/01/2020');
eq(p('2026-new').effectiveFrom, '01/01/2026', 'luật mới từ kỳ 2026');
assert.match(byId('2020-deduction').description, /kỳ tính thuế năm 2020/); n++;

// Luật 109/2025 là luật mới
assert.match(byId('2025-enact').title, /109\/2025\/QH15/); n++;
eq(/sửa đổi/i.test(byId('2025-enact').title + byId('2025-enact').description), false, 'không gọi là luật sửa đổi');

// Mốc mới
assert.ok(ms.some(m => /Luật 09\/2026\/QH16/.test(m.title) && m.date === '24/04/2026'), 'Luật 09/2026'); n++;
assert.ok(ms.some(m => /141\/2026/.test(m.title) && /1 tỷ/.test(m.description)), 'NĐ 141/2026 ngưỡng 1 tỷ'); n++;
assert.ok(ms.some(m => m.date === '01/07/2026' && /NĐ 253\/2026/.test(m.title) && /TT 87\/2026/.test(m.title)), 'NĐ 253 + TT 87 01/7/2026'); n++;
assert.match(byId('2026-gold-tax').title, /chưa thu/); n++;
eq(byId('2026-gold-tax').type, 'proposal', 'vàng miếng: chưa áp dụng');

// Văn bản, định dạng
eq(/Pháp lệnh Thuế TNCN 2001/.test(text), false, 'bỏ tên pháp lệnh sai');
assert.match(text, /Pháp lệnh Thuế thu nhập đối với người có thu nhập cao/); n++;
eq(/\d\.\d (triệu|%)|\d\.\d%|0\.1%|15\.5|1\.6 |3\.6 |4\.4 |6\.2 /.test(text), false, 'số thập phân dùng dấu phẩy');
assert.match(H.REFORM_2026_HIGHLIGHTS.legalBasis.taxBrackets, /Điều 9.*Điều 29\.2/); n++;
eq('effectiveDates' in H.REFORM_2026_HIGHLIGHTS, false, 'bỏ effectiveDates (vàng 01/7/2026 sai, không dùng)');
eq('getTaxPeriodForDate' in H, false, 'xóa getTaxPeriodForDate (không nơi gọi, lệch UTC)');
eq('comparePeriods' in H, false, 'xóa comparePeriods (không nơi gọi)');
eq(H.formatDecimal(40.9), '40,9', 'formatDecimal');
eq(H.formatDecimal(4.5), '4,5', '+4,5 triệu');

// Khớp engine
const np = p('2026-new');
eq(np.personalDeduction, NEW_DEDUCTIONS.personal, 'giảm trừ mới khớp engine');
eq(np.dependentDeduction, NEW_DEDUCTIONS.dependent, 'NPT mới khớp engine');
eq(p('2020-2025').personalDeduction, OLD_DEDUCTIONS.personal, 'giảm trừ cũ khớp engine');
np.brackets.forEach((b, i) => {
  eq(b.rate / 100, NEW_TAX_BRACKETS[i].rate, `bậc ${i + 1} thuế suất`);
  eq(b.maxIncome ?? Infinity, NEW_TAX_BRACKETS[i].max, `bậc ${i + 1} ngưỡng`);
});
p('2020-2025').brackets.forEach((b, i) => eq(b.maxIncome ?? Infinity, OLD_TAX_BRACKETS[i].max, `bậc cũ ${i + 1}`));
eq(H.DEDUCTION_COMPARISON.map(d => d.personalDeduction).join(','), H.TAX_LAW_PERIODS.map(q => q.personalDeduction).join(','), 'bảng giảm trừ khớp các giai đoạn');

console.log(`OK lawHistory: ${n} assert`);
