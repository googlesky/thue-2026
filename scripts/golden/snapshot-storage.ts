// Golden: snapshotStorage — không âm thầm mất bản lưu, lọc bản lưu hỏng, lỗi tiếng Việt, localStorage bị chặn.
import assert from 'node:assert/strict';

// localStorage giả trong Node (có thể cấu hình quota / chặn truy cập)
const store = new Map<string, string>();
let quota = Infinity;
let blocked = false;
const fake = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => {
    if (v.length > quota) {
      const e = new Error('quota') as Error & { name: string };
      e.name = 'QuotaExceededError';
      throw e;
    }
    store.set(k, String(v));
  },
  removeItem: (k: string) => { store.delete(k); },
};
(globalThis as any).window = globalThis;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get() {
    if (blocked) throw Object.assign(new Error('Access is denied for this document.'), { name: 'SecurityError' });
    return fake;
  },
});

import {
  saveNamedSave, getNamedSaves, importFromJSON, exportToJSON, duplicateNamedSave, searchSaves,
  deleteNamedSave, getStorageStats, MAX_SAVES,
} from '@/lib/snapshotStorage';
import { DEFAULT_SNAPSHOT } from '@/lib/snapshotTypes';

const snap = JSON.parse(JSON.stringify(DEFAULT_SNAPSHOT));
const reset = () => { store.clear(); store.set('tax-calculator-migrated-v2', 'true'); quota = Infinity; blocked = false; };
const labels = () => getNamedSaves().map((s) => s.label);

// 1) Đủ 50 bản: không âm thầm xóa bản cũ nhất, báo lỗi tiếng Việt
reset();
assert.equal(MAX_SAVES, 50);
for (let i = 0; i < 50; i++) saveNamedSave(snap, `save-${i}`);
assert.throws(() => saveNamedSave(snap, 'save-50'), /Đã đủ 50 bản lưu/);
assert.equal(getNamedSaves().length, 50);
assert.ok(labels().includes('save-0'), 'bản cũ nhất vẫn còn');

// 2) Nhập file 50 bản khi đã có 5 bản cục bộ: giữ đủ 5 bản cục bộ, count = số bản thực thêm
reset();
for (let i = 0; i < 5; i++) saveNamedSave(snap, `mine-${i}`);
const mineIds = getNamedSaves().map((s) => s.id);
const file = {
  version: 1, exportedAt: 0,
  saves: [
    // trùng id với bản cục bộ → giữ bản cục bộ
    { id: mineIds[0], label: 'ĐÈ LÊN', snapshot: snap, createdAt: 2, updatedAt: 2 },
    ...Array.from({ length: 50 }, (_, i) => ({ id: `imp-${i}`, label: `imp-${i}`, snapshot: snap, createdAt: 2, updatedAt: 2 })),
  ],
};
const r = importFromJSON(JSON.stringify(file));
assert.equal(r.success, true);
assert.equal(r.count, 45, 'chỉ thêm 45 bản cho đủ 50');
assert.equal(r.skipped, 6, '1 trùng + 5 vượt giới hạn');
assert.equal(getNamedSaves().length, 50);
assert.equal(labels().filter((l) => l.startsWith('mine')).length, 5, 'không mất bản cục bộ nào');
assert.ok(!labels().includes('ĐÈ LÊN'), 'trùng id: giữ bản cục bộ');
// Nhập tiếp khi đã đầy → lỗi rõ ràng
const full = importFromJSON(JSON.stringify({ version: 1, saves: [{ id: 'new-1', label: 'x', snapshot: snap }] }));
assert.equal(full.success, false);
assert.match(full.error!, /Đã đủ 50 bản lưu/);

// 3) Bộ nhớ đầy: báo lỗi, không tự cắt còn 20 bản
reset();
for (let i = 0; i < 40; i++) saveNamedSave(snap, `q-${i}`);
quota = store.get('tax-calculator-saves')!.length;
assert.throws(() => saveNamedSave(snap, 'q-new'), /Bộ nhớ trình duyệt đầy/);
quota = Infinity;
assert.equal(getNamedSaves().length, 40, 'vẫn đủ 40 bản');

// 4) File hỏng / bản lưu hỏng: lọc bỏ, không làm vỡ tìm kiếm/nhân bản
reset();
const bad = importFromJSON(JSON.stringify({ version: 1, saves: [{ id: 'x' }, null, 5, { id: 'y', label: 'ok?', snapshot: { version: 1 } }] }));
assert.equal(bad.success, false);
assert.match(bad.error!, /Không có bản lưu hợp lệ/);
assert.match(importFromJSON('null').error!, /không đúng định dạng/);
assert.match(importFromJSON('{').error!, /không phải JSON/);
// Dữ liệu cũ đã hỏng trong localStorage (do lỗi nhập trước đây) → bị lọc khi đọc
store.set('tax-calculator-saves', JSON.stringify([{ id: 'x' }, { id: 'good', label: 'Tốt', snapshot: snap, createdAt: 1, updatedAt: 1 }]));
assert.deepEqual(labels(), ['Tốt']);
assert.equal(searchSaves('t').length, 1);
assert.equal(duplicateNamedSave('good')!.label, 'Tốt (bản sao)');
// Bản lưu thiếu tab mới (xuất từ bản cũ) được bổ sung mặc định khi nhập
reset();
const oldSnap = JSON.parse(JSON.stringify(snap)); delete oldSnap.tabs.mortgage;
const okImport = importFromJSON(JSON.stringify({ version: 1, saves: [{ id: 'old', label: 'Cũ', snapshot: oldSnap }] }));
assert.equal(okImport.count, 1);
assert.equal(getNamedSaves()[0].snapshot.tabs.mortgage.loanTermYears, 20);
assert.ok(exportToJSON().includes('"Cũ"'));

// 5) localStorage bị chặn (SecurityError khi truy cập): không ném lỗi khi đọc, lưu báo lỗi tiếng Việt
reset();
store.delete('tax-calculator-migrated-v2');
blocked = true;
assert.deepEqual(getNamedSaves(), []);
assert.deepEqual(getStorageStats(), { count: 0, maxSaves: 50, estimatedSize: 0 });
assert.throws(() => saveNamedSave(snap, 'a'), /chặn lưu dữ liệu/);
assert.doesNotThrow(() => deleteNamedSave('a'));
blocked = false;

// 6) Chuyển lịch sử cũ: nhãn tiếng Việt có dấu
reset();
store.delete('tax-calculator-migrated-v2');
store.set('tax-calculator-history', JSON.stringify([{ id: 'h1', timestamp: new Date(2026, 0, 5).getTime(), state: snap.sharedState, oldTax: 0, newTax: 0, netIncome: 0 }]));
assert.deepEqual(labels(), ['Lưu 5/1/2026']);
assert.equal(store.get('tax-calculator-history'), undefined);

console.log('STORAGE OK');
