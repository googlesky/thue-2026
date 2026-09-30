// Mục 6 — báo cáo/tờ khai thuế (C22: quy đổi kỳ; T29: phụ cấp chịu thuế/miễn thuế)
import assert from 'node:assert/strict';
import { generateTaxDocument, formatValue, DocumentInput, getPeriodFigures } from '@/lib/taxDocumentGenerator';
import { calculateNewTax, calculateOldTax, DEFAULT_ALLOWANCES } from '@/lib/taxCalculator';

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.equal(a, b, msg); n++; };
const near = (a: number, b: number, msg: string) => { assert.ok(Math.abs(a - b) < 1, `${msg}: ${a} vs ${b}`); n++; };
const rowsOf = (doc: ReturnType<typeof generateTaxDocument>) =>
  new Map(doc.content.flatMap(s => s.rows).map(r => [r.label.split(' ')[0], r.value as number]));

const m30 = calculateNewTax({ grossIncome: 30_000_000, dependents: 0, calculationDate: D(2026, 9, 29) });
const base = (over: Partial<DocumentInput>): DocumentInput => ({
  type: 'annual_settlement', period: { year: 2026 }, personalInfo: { fullName: 'A' },
  monthlyResult: m30, numberOfDependents: 0, taxPaid: 0, ...over,
});

// C22: lương 30tr, đã khấu trừ đủ 12 tháng (12 × 635.000) → không còn "được hoàn 12,5 triệu"
let doc = generateTaxDocument(base({ taxPaid: 7_620_000 }));
let r = rowsOf(doc);
near(r.get('[21]')!, 360_000_000, '[21] 30tr × 12');
near(r.get('[22a]')!, 186_000_000, '[22a] 15,5tr × 12');
near(r.get('[22b]')!, 37_800_000, '[22b] BH 3,15tr × 12');
near(r.get('[23]')!, 136_200_000, '[23] = [21] − Σ[22]');
near(r.get('[21]')! - r.get('[22]')!, r.get('[23]')!, '[21] − [22] = [23]');
eq(r.get('[31]'), 7_620_000, '[31] thuế năm = biểu năm');
eq(r.get('[33]'), 0, '[33] không còn phải nộp');
eq(r.get('[34]'), 0, '[34] không nộp thừa (trước đây báo hoàn 12.485.000)');
eq(r.has('[22d]'), false, 'không có y tế/giáo dục thì không có dòng [22d]');
assert.match(doc.legalNote, /04\/05\/2027/); n++;
assert.match(doc.legalNote, /1 tháng × 12/); n++;

// Y tế 30tr → 23tr, học phí 10tr: [22d] 33tr → [23] 103,2tr → [31] 5,16tr
doc = generateTaxDocument(base({ taxPaid: 7_620_000, medicalExpenses: 30_000_000, educationExpenses: 10_000_000 }));
r = rowsOf(doc);
eq(r.get('[22d]'), 33_000_000, '[22d] chặn trần y tế');
near(r.get('[23]')!, 103_200_000, '[23] sau y tế, giáo dục');
near(r.get('[21]')! - r.get('[22a]')! - r.get('[22b]')! - r.get('[22c]')! - r.get('[22d]')!, r.get('[23]')!, 'Σ dòng con [22] khớp [23]');
eq(r.get('[31]'), 5_160_000, '103,2tr × 5%');
eq(r.get('[34]'), 2_460_000, 'nộp thừa 7,62 − 5,16');
// Báo cáo cá nhân không áp y tế/giáo dục; năm 2025 cũng không
eq(getPeriodFigures(base({ type: 'personal_report', medicalExpenses: 30_000_000 })).medicalEducation, 0, 'báo cáo cá nhân: không y tế');

// T29: lương 30tr + ăn ca 1tr (miễn, ≤ 1,2tr) + tiền nhà 5tr (chịu thuế) → [21] tháng = 35tr, không phải 24tr
const withAllowances = calculateNewTax({
  grossIncome: 30_000_000, dependents: 0, calculationDate: D(2026, 9, 29),
  allowances: { ...DEFAULT_ALLOWANCES, meal: 1_000_000, housing: 5_000_000 },
});
doc = generateTaxDocument(base({ type: 'quarterly_declaration', period: { year: 2026, quarter: 3 }, monthlyResult: withAllowances }));
r = rowsOf(doc);
near(r.get('[21]')!, 105_000_000, 'quý: [21] = 35tr × 3');
near(r.get('[22]')!, 55_950_000, 'quý: giảm trừ (15,5 + 3,15) × 3');
near(r.get('[23]')!, 49_050_000, 'quý: [23]');
near(r.get('[24]')!, 3_405_000, 'quý: thuế 1.135.000 × 3');
eq(doc.title, 'Tờ khai thuế TNCN - Quý 3/2026', 'tiêu đề quý');
const deadlineRow = doc.content[0].rows.find(x => x.label === 'Hạn nộp');
eq(deadlineRow?.value, '02/11/2026', 'hạn quý 3/2026 đã dời');
eq(doc.content[0].rows.find(x => x.label === 'Mẫu tờ khai')?.value, '02/KK-TNCN', 'mẫu cá nhân tự khai quý');
const pf = getPeriodFigures(base({ type: 'personal_report', monthlyResult: withAllowances }));
eq(pf.exemptAllowances, 12_000_000, 'phụ cấp miễn thuế cả năm = ăn ca 1tr × 12');
eq(pf.taxableAllowances, 60_000_000, 'phụ cấp chịu thuế cả năm = nhà 5tr × 12');

// Năm 2025: biểu 7 bậc (calculateOldTax, trần BH 31/12/2025)
const m2025 = calculateOldTax({ grossIncome: 30_000_000, dependents: 0, calculationDate: D(2025, 12, 31) });
doc = generateTaxDocument(base({ period: { year: 2025 }, monthlyResult: m2025, taxPaid: 19_530_000, medicalExpenses: 10_000_000 }));
r = rowsOf(doc);
near(r.get('[23]')!, 190_200_000, '2025: [23]');
eq(r.get('[31]'), 19_530_000, '2025: thuế năm');
eq(r.has('[22d]'), false, '2025: không có giảm trừ y tế');
assert.match(doc.legalNote, /04\/05\/2026/); n++;

// Định dạng
eq(formatValue(1.5, 'percent'), '1,50%', 'phần trăm dấu phẩy');
const report = generateTaxDocument(base({ type: 'personal_report' }));
eq(JSON.stringify(report).includes('1.5%'), false, 'không còn "1.5%"');
eq(report.title, 'Báo cáo thu nhập cá nhân - Năm 2026', 'tiêu đề báo cáo năm');
eq(formatValue(getPeriodFigures(base({ type: 'personal_report' })).effectiveRate, 'percent'), '2,12%', 'thuế suất thực tế 7,62/360');

console.log(`OK taxDocument: ${n} assert`);
