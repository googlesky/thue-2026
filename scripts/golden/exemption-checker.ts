// Golden test MISC-B1 nhóm 2: taxExemptionChecker (A3–A6, A10, A11)
import assert from 'node:assert/strict';
import {
  checkExemption,
  EXEMPTION_RULES,
  getExemptionRule,
  searchExemptions,
  ExemptionCategory,
} from '@/lib/taxExemptionChecker';

const rule = (id: ExemptionCategory) => {
  const r = getExemptionRule(id);
  assert.ok(r, id);
  return r!;
};

// ---- A3: điều kiện "một trong các trường hợp" ----
// Vợ chuyển nhượng BĐS cho chồng (Luật Điều 4.1): BĐS + trường hợp vợ-chồng → miễn toàn bộ
const r1 = checkExemption({
  category: 'family_transfer',
  incomeAmount: 2_000_000_000,
  answers: { condition_0: true, case_0: true },
});
assert.equal(r1.status, 'exempt');
assert.equal(r1.exemptAmount, 2_000_000_000);
assert.equal(r1.taxableAmount, 0);
// Chỉ chọn quan hệ, chưa xác nhận là BĐS → cần xem xét
assert.equal(
  checkExemption({ category: 'family_transfer', incomeAmount: 2_000_000_000, answers: { case_0: true } }).status,
  'needs_review'
);
// Người hưởng lương hưu BHXH (Luật Điều 4.9): chỉ 1 trường hợp là đủ
const r2 = checkExemption({ category: 'pension', incomeAmount: 8_000_000, answers: { case_0: true } });
assert.equal(r2.status, 'exempt');
assert.equal(r2.exemptAmount, 8_000_000);
// Không chọn gì → không miễn
assert.equal(checkExemption({ category: 'pension', incomeAmount: 8_000_000, answers: {} }).status, 'not_exempt');

// ---- A4: nhà ở duy nhất: 183 ngày, không có "5 năm", "hạn mức diện tích" ----
const home = rule('real_estate_only_home');
assert.ok(home.conditions.some((c) => c.includes('183 ngày')));
assert.ok(home.conditions.some((c) => c.includes('hình thành trong tương lai')));
assert.ok(!home.conditions.some((c) => c.includes('5 năm') || c.includes('hạn mức')));
const r3 = checkExemption({
  category: 'real_estate_only_home',
  incomeAmount: 3_000_000_000,
  answers: { condition_0: true, condition_1: true, condition_2: true, condition_3: true },
});
assert.equal(r3.status, 'exempt');
assert.equal(r3.exemptAmount, 3_000_000_000);

// ---- A5: bỏ khoản bịa, sửa carbon/trái phiếu xanh/công nghệ cao ----
const ids = EXEMPTION_RULES.map((r) => r.id as string);
for (const removed of ['digital_transformation', 'foreign_diplomatic', 'international_treaty']) {
  assert.ok(!ids.includes(removed), removed);
}
assert.equal(new Set(ids).size, ids.length); // không trùng id
// Mọi khoản phải có ít nhất 1 điều kiện/trường hợp (tránh "miễn" khi chưa trả lời gì)
for (const r of EXEMPTION_RULES) assert.ok(r.conditions.length + (r.anyOf?.length ?? 0) > 0, r.id);
for (const r of EXEMPTION_RULES) {
  assert.equal(checkExemption({ category: r.id, incomeAmount: 1_000_000, answers: {} }).status, 'not_exempt', r.id);
}
assert.ok(rule('carbon_credits').conditions.some((c) => c.includes('lần chuyển nhượng đầu tiên')));
assert.ok(rule('green_bond_interest').anyOf!.some((c) => c.includes('lần đầu') && c.includes('tổ chức phát hành')));
assert.ok(rule('high_tech_income').conditions.some((c) => c.includes('05 năm')));
assert.ok(rule('digital_tech_talent').conditions.some((c) => c.includes('05 năm')));
assert.ok(!rule('startup_investment').conditions.some((c) => c.includes('3 năm')));

// ---- A6: làm đêm/làm thêm miễn toàn bộ; vượt mức → partial ----
const ot = checkExemption({
  category: 'night_shift_allowance',
  incomeAmount: 10_000_000,
  answers: { condition_0: true, case_0: true },
  excessAmount: 2_000_000,
});
assert.equal(ot.status, 'partial');
assert.equal(ot.exemptAmount, 8_000_000);
assert.equal(ot.taxableAmount, 2_000_000);
// Không vượt mức → miễn toàn bộ
assert.equal(
  checkExemption({ category: 'night_shift_allowance', incomeAmount: 10_000_000, answers: { condition_0: true, case_1: true } }).exemptAmount,
  10_000_000
);
// Vượt mức ≥ toàn bộ → không miễn phần nào
const all = checkExemption({
  category: 'hazard_allowance',
  incomeAmount: 1_000_000,
  answers: { condition_0: true, condition_1: true },
  excessAmount: 5_000_000,
});
assert.equal(all.status, 'not_exempt');
assert.equal(all.exemptAmount, 0);
assert.equal(all.taxableAmount, 1_000_000);
// Rule không có mức luật định: excessAmount bị bỏ qua (trợ cấp thôi việc miễn cả phần cao hơn luật)
const sev = checkExemption({
  category: 'severance_pay',
  incomeAmount: 300_000_000,
  answers: { case_0: true },
  excessAmount: 100_000_000,
});
assert.equal(sev.status, 'exempt');
assert.equal(sev.exemptAmount, 300_000_000);
assert.ok(rule('severance_pay').anyOf![0].includes('cao hơn luật'));
assert.ok(rule('pension').anyOf!.some((c) => c.includes('quỹ hưu trí tự nguyện')));
assert.ok(!rule('pension').conditions.some((c) => c.includes('thất nghiệp')));

// ---- A10: căn cứ đúng khoản + đủ 21 khoản Điều 4, Điều 5 khoản 2–4 ----
const lawRef = (id: ExemptionCategory) => rule(id).legalReference.split(';')[0];
assert.match(lawRef('real_estate_only_home'), /^Khoản 2 Điều 4 /);
for (const id of ['family_transfer', 'inheritance_family', 'gift_family'] as const) assert.match(lawRef(id), /^Khoản 1 Điều 4 /);
assert.match(lawRef('agricultural_income'), /^Khoản 4 Điều 4 /);
assert.match(lawRef('interest_deposits'), /^Khoản 6 Điều 4 /);
assert.match(lawRef('remittance'), /^Khoản 7 Điều 4 /);
assert.match(lawRef('night_shift_allowance'), /^Khoản 8 Điều 4 /);
assert.match(lawRef('pension'), /^Khoản 9 Điều 4 /);
assert.match(lawRef('scholarship'), /^Khoản 10 Điều 4 /);
assert.match(lawRef('compensation'), /^Khoản 11 Điều 4 /);
assert.match(lawRef('charity'), /^Khoản 12 Điều 4 /);
assert.match(lawRef('carbon_credits'), /^Khoản 16 Điều 4 /);
assert.match(lawRef('green_bond_interest'), /^Khoản 16 Điều 4 /);
assert.match(lawRef('open_fund_certificates'), /^Khoản 4 Điều 5 /);
assert.match(rule('severance_pay').legalReference, /điểm h khoản 3 Điều 8 NĐ 253\/2026\/NĐ-CP/);
assert.match(rule('hazard_allowance').legalReference, /điểm d khoản 3 Điều 8 NĐ 253\/2026\/NĐ-CP/);
for (let k = 1; k <= 21; k++) {
  assert.ok(
    EXEMPTION_RULES.some((r) => new RegExp(`[Kk]hoản ${k}(,| Điều 4 )`).test(r.legalReference.split(';')[0])),
    `thiếu khoản ${k} Điều 4`
  );
}
for (const k of [2, 3, 4]) {
  assert.ok(EXEMPTION_RULES.some((r) => r.legalReference.startsWith(`Khoản ${k} Điều 5 `)), `thiếu khoản ${k} Điều 5`);
}
// Không còn trích dẫn văn bản cũ
assert.ok(!EXEMPTION_RULES.some((r) => /TT 111|NĐ 65\/2013|sửa đổi 2025/.test(r.legalReference)));
// Quà tặng người thân: chỉ BĐS, đủ quan hệ con dâu/rể, ông bà - cháu
const gift = rule('gift_family');
assert.ok(gift.conditions[0].includes('bất động sản'));
assert.ok(gift.anyOf!.some((c) => c.includes('con dâu') && c.includes('con rể')));
assert.ok(gift.anyOf!.some((c) => c.includes('cháu nội') && c.includes('cháu ngoại')));
assert.ok(searchExemptions('kiều hối').some((r) => r.id === 'remittance'));
assert.ok(searchExemptions('quỹ mở').some((r) => r.id === 'open_fund_certificates'));

// ---- A11: ngày hiệu lực local, theo loại thu nhập ----
assert.equal(rule('carbon_credits').effectiveFrom!.getTime(), new Date(2026, 6, 1).getTime());
assert.equal(rule('open_fund_certificates').effectiveFrom!.getTime(), new Date(2026, 6, 1).getTime());
assert.equal(rule('science_tech_salary').effectiveFrom!.getTime(), new Date(2026, 0, 1).getTime());
assert.equal(rule('night_shift_allowance').effectiveFrom!.getTime(), new Date(2026, 0, 1).getTime());
const carbonAnswers = { condition_0: true, condition_1: true, condition_2: true };
const before = checkExemption({ category: 'carbon_credits', incomeAmount: 50_000_000, answers: carbonAnswers }, new Date(2026, 5, 30, 23, 59));
assert.equal(before.status, 'not_exempt');
assert.equal(before.explanation, 'Quy định này có hiệu lực từ 01/07/2026');
const onDay = checkExemption({ category: 'carbon_credits', incomeAmount: 50_000_000, answers: carbonAnswers }, new Date(2026, 6, 1));
assert.equal(onDay.status, 'exempt');
assert.equal(onDay.exemptAmount, 50_000_000);

// ---- Review TB2: điều kiện thời điểm phát sinh (so ngày phát sinh, không phải ngày tra cứu) ----
// Bán chứng chỉ quỹ mở 15/5/2026 (trước 01/7/2026) → không tick được "Chuyển nhượng từ ngày 01/7/2026"
const fundBefore = checkExemption({ category: 'open_fund_certificates', incomeAmount: 50_000_000, answers: { condition_1: true, condition_2: true } });
assert.equal(fundBefore.status, 'needs_review');
assert.equal(fundBefore.exemptAmount, 0);
assert.equal(
  checkExemption({ category: 'open_fund_certificates', incomeAmount: 50_000_000, answers: { condition_0: true, condition_1: true, condition_2: true } }).exemptAmount,
  50_000_000
);
for (const r of EXEMPTION_RULES.filter((x) => x.effectiveFrom)) {
  assert.ok(/(từ ngày|từ) 01\/(01|7)\/2026/.test(r.conditions[0]), `thiếu điều kiện thời điểm: ${r.id}`);
}
// Ly hôn (NĐ 253 Điều 18.2) là một trường hợp của chuyển nhượng BĐS
assert.equal(
  checkExemption({ category: 'family_transfer', incomeAmount: 2_000_000_000, answers: { condition_0: true, case_5: true } }).status,
  'exempt'
);
assert.equal(rule('gift_family').anyOf!.length, 5);
// Lợi tức cổ phần thành viên HTX nông nghiệp (Điều 22) không cần điều kiện trực tiếp sản xuất
assert.equal(checkExemption({ category: 'agricultural_coop_dividend', incomeAmount: 5_000_000, answers: { case_0: true } }).status, 'exempt');
// Làm đêm/làm thêm được lọc vào nhóm "mới, mở rộng 2026"
assert.equal(rule('night_shift_allowance').isNew2026, true);

console.log(`misc-b1 exemption: OK (${EXEMPTION_RULES.length} khoản)`);
