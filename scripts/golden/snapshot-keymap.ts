// Golden: KEY_MAP của snapshotCodec không được trùng mã rút gọn, và không tên trường nào của tab state
// trùng một mã rút gọn — nếu trùng, giải nén đổi tên nhầm và link chia sẻ mất dữ liệu mà không báo lỗi
// (từng gặp: transport và type cùng mã 'tp' làm mất phụ cấp đi lại).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_TAB_STATES } from '@/lib/snapshotTypes';
import { DEFAULT_INCOME_SUMMARY_INPUT } from '@/lib/incomeSummaryCalculator';

const src = readFileSync(`${process.cwd()}/src/lib/snapshotCodec.ts`, 'utf8');
const start = src.indexOf('const KEY_MAP');
const body = src.slice(start, src.indexOf('};', start));
const pairs = [...body.matchAll(/^\s*(\w+):\s*'([^']+)'/gm)].map((m) => [m[1], m[2]] as const);
assert.ok(pairs.length > 50, `đọc được KEY_MAP (${pairs.length} cặp)`);

// 1) Mỗi mã rút gọn chỉ dùng cho một trường
const byShort = new Map<string, string>();
for (const [long, short] of pairs) {
  assert.ok(!byShort.has(short), `mã '${short}' trùng: ${byShort.get(short)} và ${long}`);
  byShort.set(short, long);
}

// 2) Không tên trường thật nào trùng một mã rút gọn
const longKeys = new Set(pairs.map(([long]) => long));
const fields = new Set<string>();
const walk = (o: unknown): void => {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      fields.add(k);
      walk(v);
    }
  }
};
walk({ ...DEFAULT_TAB_STATES, incomeSummary: DEFAULT_INCOME_SUMMARY_INPUT });
const clash = [...fields].filter((k) => byShort.has(k) && !longKeys.has(k));
assert.deepEqual(clash, [], 'tên trường trùng mã rút gọn');

console.log(`SNAPSHOT KEYMAP OK: ${pairs.length} mã, ${fields.size} tên trường`);
