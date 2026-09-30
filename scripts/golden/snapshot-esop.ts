import assert from 'node:assert/strict';
import * as LZString from 'lz-string';
import { encodeSnapshot, decodeSnapshot } from '@/lib/snapshotCodec';
import { DEFAULT_SNAPSHOT, DEFAULT_ESOP_STATE } from '@/lib/snapshotTypes';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };

// Snapshot: link cũ {gp, ep, ns, ed, spi} -> không crash, field mới mặc định
const legacy = LZString.compressToEncodedURIComponent(JSON.stringify(
  { v: 1, tb: { es: { gp: 100_000, ep: 500_000, ns: 1_000, ed: '2026-07-15', spi: 'h2-2026' } } }));
const old = decodeSnapshot(legacy)!;
eq(old.tabs.esop.grantPrice, 100_000, 'link cũ giữ giá mua');
eq(old.tabs.esop.numberOfShares, 1_000, 'link cũ giữ số CP');
eq([old.tabs.esop.shareType, old.tabs.esop.parValue, old.tabs.esop.bookAmount, old.tabs.esop.sellPrice],
  ['esop', 10_000, 0, 0], 'link cũ: field mới = mặc định');
// Round-trip state mới
const snap = structuredClone(DEFAULT_SNAPSHOT);
snap.tabs.esop = { shareType: 'bonus', grantPrice: 0, numberOfShares: 500, parValue: 10_000, bookAmount: 3_000_000, sellPrice: 42_000 };
eq(decodeSnapshot(encodeSnapshot(snap))!.tabs.esop, snap.tabs.esop, 'round-trip ESOP state');
// Mặc định không được mã vào URL
const raw = JSON.parse(LZString.decompressFromEncodedURIComponent(encodeSnapshot(structuredClone(DEFAULT_SNAPSHOT)))!);
eq(raw.tb?.es, undefined, 'ESOP mặc định không vào URL');
eq(DEFAULT_ESOP_STATE.parValue, 10_000, 'mặc định mệnh giá');

console.log(`ESOP SNAPSHOT OK: ${n} assertions`);
