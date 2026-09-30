// Chạy golden test: npm run test:golden [-- <một phần tên file> ...]
// Mỗi file chạy trong tiến trình riêng (vài test gán window/fetch toàn cục), cố định múi giờ Việt Nam
// để mốc hiệu lực theo ngày cho cùng kết quả trên máy local và CI (UTC).
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const root = join(dir, '..', '..');
const only = process.argv.slice(2);
const files = readdirSync(dir)
  .filter((f) => /\.tsx?$/.test(f) && (only.length === 0 || only.some((o) => f.includes(o))))
  .sort();

const failed = [];
for (const f of files) {
  const r = spawnSync(process.execPath, ['--import', 'tsx', join(dir, f)], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, TZ: 'Asia/Ho_Chi_Minh' },
  });
  if (r.status === 0) {
    console.log(`✓ ${f}`);
  } else {
    failed.push(f);
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(0, 20).join('\n');
    console.log(`✗ ${f}\n${out}\n`);
  }
}
console.log(`\n${files.length - failed.length}/${files.length} file đạt${failed.length ? ` — lỗi: ${failed.join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
