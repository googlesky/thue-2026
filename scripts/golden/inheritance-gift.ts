import assert from 'node:assert/strict';
import {
  calculateInheritanceGiftTax as calc,
  isExemptRelationship,
  isTaxableAssetType,
  parseDateInput,
  getRequiredDocuments,
} from '@/lib/inheritanceGiftTaxCalculator';

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };

// 1) Người ngoài tặng BĐS 500tr: từ 01/7/2026 ngưỡng 20tr → (500 − 20) × 10% = 48tr
let r = calc({ transactionType: 'gift', relationship: 'non_relative', assets: [{ type: 'real_estate', value: 500e6 }], transactionDate: D(2026, 7, 1) });
eq(r.threshold, 20e6, 'nguong 1/7/2026');
eq(r.taxableAmount, 480e6, 'TNTT 480tr');
eq(r.taxAmount, 48e6, 'thuế 48tr');
eq(r.isExempt, false, 'phải nộp');
// 30/6/2026 ngưỡng 10tr → (500 − 10) × 10% = 49tr
r = calc({ transactionType: 'gift', relationship: 'non_relative', assets: [{ type: 'real_estate', value: 500e6 }], transactionDate: D(2026, 6, 30) });
eq(r.threshold, 10e6, 'nguong 30/6/2026');
eq(r.taxAmount, 49e6, 'thuế 49tr');
eq(r.declarationDeadline, undefined, 'BĐS: không hiện hạn +10 ngày');

// 2) Cha mẹ cho nhà 3 tỷ + ô tô 1 tỷ: nhà miễn, ô tô chịu thuế (1.000 − 20) × 10% = 98tr
r = calc({ transactionType: 'gift', relationship: 'parent_child', transactionDate: D(2026, 8, 1),
  assets: [{ type: 'real_estate', value: 3e9 }, { type: 'vehicles', value: 1e9 }] });
eq(r.exemptValue, 3e9, 'nhà miễn');
eq(r.taxableValue, 1e9, 'ô tô chịu thuế');
eq(r.taxAmount, 98e6, 'thuế ô tô 98tr');
eq(r.declarationDeadline?.getTime(), D(2026, 8, 11).getTime(), 'han khai o to 11/8/2026');
assert.ok(r.notes.some((x) => x.includes('chỉ được miễn với bất động sản'))); n++;

// 3) Cha mẹ cho tiền 500tr: không chịu thuế, không phải khai
r = calc({ transactionType: 'gift', relationship: 'parent_child', transactionDate: D(2026, 9, 1), assets: [{ type: 'cash', value: 500e6 }] });
eq(r.taxAmount, 0, 'tiền mặt: 0');
eq(r.nonTaxableValue, 500e6, 'tiền mặt không chịu thuế');
eq(r.isExempt, true, 'không phải nộp');
eq(r.requiredDocuments.length, 0, 'không có hồ sơ');
eq(r.declarationDeadline, undefined, 'không có hạn khai');
assert.ok(r.exemptReason?.includes('Điều 3.9')); n++;
// Người ngoài cho tiền 1 tỷ: vẫn không chịu thuế (không phải tài sản phải đăng ký)
eq(calc({ transactionType: 'gift', relationship: 'non_relative', assets: [{ type: 'cash', value: 1e9 }, { type: 'jewelry', value: 2e8 }] }).taxAmount, 0, 'tiền/vàng từ người ngoài: 0');

// 4) Cha mẹ chồng cho con dâu BĐS 2 tỷ: miễn (Điều 4.1)
r = calc({ transactionType: 'gift', relationship: 'parent_in_law', assets: [{ type: 'real_estate', value: 2e9 }] });
eq(r.taxAmount, 0, 'dâu/rể miễn BĐS');
eq(r.exemptValue, 2e9, 'exempt 2 ty');
assert.ok(r.requiredDocuments.some((d) => d.includes('03/BĐS-TNCN'))); n++;
assert.ok(r.requiredDocuments.some((d) => d.includes('con dâu') || d.includes('chồng/vợ'))); n++;
// Cha mẹ chồng cho cổ phiếu 100tr (01/7/2026): vẫn chịu thuế (100 − 20) × 10% = 8tr
eq(calc({ transactionType: 'gift', relationship: 'parent_in_law', transactionDate: D(2026, 7, 1), assets: [{ type: 'securities', value: 100e6 }] }).taxAmount, 8e6, 'CK từ cha mẹ chồng: 8tr');

// 5) Ngưỡng theo từng lần: CK 25tr → 500.000; CK 15tr → 0
eq(calc({ transactionType: 'gift', relationship: 'non_relative', transactionDate: D(2026, 7, 1), assets: [{ type: 'securities', value: 25e6 }] }).taxAmount, 500_000, 'CK 25tr');
r = calc({ transactionType: 'gift', relationship: 'non_relative', transactionDate: D(2026, 7, 1), assets: [{ type: 'securities', value: 15e6 }] });
eq(r.taxAmount, 0, 'CK 15tr duoi nguong');
assert.ok(r.exemptReason?.includes('20.000.000')); n++;

// 6) Họ hàng khác: vốn góp 100tr + trang sức 50tr (15/9/2026) → (100 − 20) × 10% = 8tr
r = calc({ transactionType: 'inheritance', relationship: 'other_relative', transactionDate: D(2026, 9, 15),
  assets: [{ type: 'capital', value: 100e6 }, { type: 'jewelry', value: 50e6 }] });
eq([r.totalValue, r.nonTaxableValue, r.taxableValue, r.taxAmount], [150e6, 50e6, 100e6, 8e6], 'vốn góp + trang sức');
// Hạn khai: 25/9/2026 + 10 ngày = 05/10/2026
eq(calc({ transactionType: 'gift', relationship: 'non_relative', transactionDate: D(2026, 9, 25), assets: [{ type: 'securities', value: 30e6 }] }).declarationDeadline?.getTime(), D(2026, 10, 5).getTime(), 'han 5/10');

// 7) Quan hệ & loại tài sản
eq(['spouse', 'parent_child', 'parent_in_law', 'grandparent_grandchild', 'siblings'].every((x) => isExemptRelationship(x as never)), true, 'nhóm miễn');
eq(isExemptRelationship('other_relative') || isExemptRelationship('non_relative'), false, 'họ hàng khác không miễn');
eq(isTaxableAssetType('cash') || isTaxableAssetType('jewelry'), false, 'tiền/vàng');
eq(isTaxableAssetType('capital') && isTaxableAssetType('vehicles') && isTaxableAssetType('other'), true, 'tài sản đăng ký');
eq(getRequiredDocuments('gift', 'spouse', ['cash']).length, 0, 'không cần hồ sơ cho tiền');

// 8) parseDateInput: giờ local, không lệch UTC
eq(parseDateInput('2026-07-01')?.getTime(), D(2026, 7, 1).getTime(), 'parse 1/7');
eq(parseDateInput(''), undefined, 'parse rong');
eq(calc({ transactionType: 'gift', relationship: 'non_relative', transactionDate: parseDateInput('2026-06-30'), assets: [{ type: 'securities', value: 30e6 }] }).taxAmount, 2e6, '30/6: (30-10)x10%');
eq(calc({ transactionType: 'gift', relationship: 'non_relative', transactionDate: parseDateInput('2026-07-01'), assets: [{ type: 'securities', value: 30e6 }] }).taxAmount, 1e6, '1/7: (30-20)x10%');

console.log(`INHERITANCE OK: ${n} assertions`);
