// Golden: PWA — lần đầu cài SW không tự reload; chỉ reload sau khi người dùng bấm cập nhật;
// báo cập nhật theo sự kiện (không poll); sw.js tiền cache đúng file có thật.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

let reloads = 0;
class FakeWorker extends EventTarget {
  state = 'installing';
  messages: unknown[] = [];
  postMessage(m: unknown) { this.messages.push(m); }
  setState(s: string) { this.state = s; this.dispatchEvent(new Event('statechange')); }
}
class FakeRegistration extends EventTarget {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
}
const sw = new EventTarget() as EventTarget & { controller: unknown; ready: Promise<FakeRegistration> };
sw.controller = null;
let resolveReady!: (r: FakeRegistration) => void;
sw.ready = new Promise((r) => { resolveReady = r; });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: sw, onLine: true } });
(globalThis as any).window = globalThis;
(globalThis as any).location = { reload: () => { reloads++; } };

import { onServiceWorkerUpdate, skipWaiting } from '@/lib/pwaUtils';

const tick = () => new Promise((r) => setTimeout(r, 0));

(async () => {
  const updates: FakeRegistration[] = [];
  const unsubscribe = onServiceWorkerUpdate((reg) => updates.push(reg as unknown as FakeRegistration));

  // 1) Lần truy cập đầu: SW cài + clients.claim() → controllerchange; KHÔNG được reload
  const reg = new FakeRegistration();
  resolveReady(reg);
  await tick();
  sw.controller = {};
  sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(reloads, 0, 'lần cài đầu không tự reload (trước đây mất dữ liệu đang nhập)');
  assert.equal(updates.length, 0, 'lần cài đầu không phải bản cập nhật');

  // 2) Có bản mới: updatefound → installed → báo đúng 1 lần
  const next = new FakeWorker();
  reg.installing = next;
  reg.dispatchEvent(new Event('updatefound'));
  reg.installing = null;
  reg.waiting = next;
  next.setState('installed');
  assert.equal(updates.length, 1, 'báo cập nhật khi bản mới cài xong');

  // Không poll: đợi không phát sinh thêm thông báo
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(updates.length, 1);

  // 3) Người dùng bấm "Cập nhật ngay" → SKIP_WAITING + reload khi SW mới nắm quyền
  skipWaiting(reg as unknown as ServiceWorkerRegistration);
  assert.deepEqual(next.messages, [{ type: 'SKIP_WAITING' }]);
  sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(reloads, 1, 'reload sau khi người dùng đồng ý cập nhật');

  // 4) Hủy đăng ký: không còn nghe sự kiện
  unsubscribe();
  const third = new FakeWorker();
  reg.installing = third;
  reg.dispatchEvent(new Event('updatefound'));
  reg.waiting = third;
  third.setState('installed');
  assert.equal(updates.length, 1);

  // 5) Bản mới đã chờ sẵn từ lần trước → báo ngay khi ready
  const got: unknown[] = [];
  onServiceWorkerUpdate((r) => got.push(r));
  await tick();
  assert.equal(got.length, 1, 'waiting có sẵn + có controller → báo cập nhật');

  // 6) sw.js: tiền cache file có thật, không skipWaiting lúc install, fallback HTML chỉ cho điều hướng
  const root = process.cwd();
  const src = readFileSync(`${root}/public/sw.js`, 'utf8');
  const assets = JSON.parse(src.match(/const STATIC_ASSETS = (\[[\s\S]*?\]);/)![1].replace(/'/g, '"').replace(/,\s*\]/, ']')) as string[];
  for (const a of assets) {
    // Trang HTML ('/…/') chỉ sinh ra khi build → đối chiếu route trong src/app
    const file = a.endsWith('/') ? `${root}/src/app${a}page.tsx` : `${root}/public${a}`;
    assert.ok(existsSync(file), `tiền cache trỏ file có thật: ${a}`);
  }
  assert.ok(!/'\/tinh-thue'/.test(src), 'không tiền cache /tinh-thue (301)');
  const install = src.slice(src.indexOf("addEventListener('install'"), src.indexOf("addEventListener('activate'"));
  assert.ok(!install.includes('skipWaiting()'), 'install không skipWaiting');
  assert.ok(/request\.mode !== 'navigate'/.test(src), 'chỉ điều hướng mới nhận HTML dự phòng');
  assert.ok(/thue-2026-static-\$\{VERSION\}/.test(src) && /VERSION = 'v\d+'/.test(src), 'tên cache có version');
  assert.ok(!/\p{Extended_Pictographic}/u.test(src), 'trang offline không emoji');

  console.log('PWA OK');
})().catch((e) => { console.error(e); process.exit(1); });
