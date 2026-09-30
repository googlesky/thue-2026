// Golden: goldPriceService — lỗi tiếng Việt thân thiện, fallback khi thiếu AbortSignal.timeout, thời điểm lấy từ API.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchGoldPrices } from '@/lib/goldPriceService';

const sample = readFileSync(`${process.cwd()}/scripts/golden/fixtures/gold-price.json`, 'utf8');
let signals: AbortSignal[] = [];
const mockFetch = (impl: () => Promise<Response>) => {
  (globalThis as any).fetch = (_url: string, init: RequestInit) => {
    signals.push(init.signal!);
    return impl();
  };
};

(async () => {
  // Thành công: timestamp của API (29/09/2026 18:00 +07) → currentTime
  mockFetch(async () => new Response(sample, { status: 200 }));
  const ok = await fetchGoldPrices();
  assert.equal(ok.currentTime, 1790679606);
  const d = new Date(ok.currentTime * 1000);
  assert.equal(d.getUTCHours(), 11, '18:00 giờ VN = 11:00 UTC');
  assert.equal(ok.data.length, 12);
  assert.equal(ok.data.find((p) => p.typeCode === 'SJL1L10')!.sell, 142_500_000);
  assert.equal(ok.data.find((p) => p.typeCode === 'XAUUSD')!.unit, 'USD');

  const cases: Array<[() => Promise<Response>, RegExp]> = [
    [async () => { throw new TypeError('Failed to fetch'); }, /Không kết nối được máy chủ giá vàng/],
    [async () => { throw new DOMException('signal timed out', 'TimeoutError'); }, /phản hồi quá lâu/],
    [async () => { throw new DOMException('aborted', 'AbortError'); }, /phản hồi quá lâu/],
    [async () => new Response('oops', { status: 503 }), /đang gặp lỗi \(mã 503\)/],
    [async () => new Response('<html>', { status: 200 }), /không hợp lệ/],
    [async () => new Response('null', { status: 200 }), /không hợp lệ/],
    [async () => new Response('{"success":false}', { status: 200 }), /tạm thời không trả dữ liệu/],
  ];
  for (const [impl, msg] of cases) {
    mockFetch(impl);
    await assert.rejects(fetchGoldPrices(), (e: Error) => {
      assert.match(e.message, msg);
      assert.ok(!/Failed to fetch|signal|API trả về lỗi/.test(e.message), 'không lộ thông báo kỹ thuật tiếng Anh');
      return true;
    });
  }

  // Trình duyệt cũ không có AbortSignal.timeout → vẫn gửi kèm signal (AbortController + setTimeout)
  const original = AbortSignal.timeout;
  (AbortSignal as any).timeout = undefined;
  signals = [];
  mockFetch(async () => new Response(sample, { status: 200 }));
  await fetchGoldPrices();
  assert.ok(signals[0] instanceof AbortSignal && !signals[0].aborted, 'có signal hẹn giờ dự phòng');
  (AbortSignal as any).timeout = original;

  console.log('GOLD PRICE OK');
  process.exit(0); // bỏ qua bộ hẹn giờ 10 giây của signal dự phòng
})().catch((e) => { console.error(e); process.exit(1); });
