import assert from 'node:assert/strict';
import * as LZString from 'lz-string';
import { encodeSnapshot, decodeSnapshot } from '@/lib/snapshotCodec';
import { DEFAULT_SNAPSHOT, DEFAULT_OVERTIME_STATE } from '@/lib/snapshotTypes';

const snap = structuredClone(DEFAULT_SNAPSHOT) as any;
snap.sharedState = { ...snap.sharedState, grossIncome: 42_000_000, pensionContribution: 2_000_000,
  allowances: { meal: 1_500_000, phone: 300_000, transport: 800_000, hazardous: 0, clothing: 0, housing: 0, position: 0 } };
snap.tabs.overtime = { ...DEFAULT_OVERTIME_STATE, entries: [{ id: 'a', type: 'weekend', shift: 'night', hours: 5 }] };
const enc = encodeSnapshot(snap);
const dec = decodeSnapshot(enc)!;
assert.equal(dec.sharedState.allowances!.transport, 800_000, 'transport round-trip');
assert.equal(dec.sharedState.allowances!.meal, 1_500_000);
assert.equal(dec.sharedState.pensionContribution, 2_000_000);
const ot = (dec.tabs as any).overtime;
assert.equal(ot.entries[0].type, 'weekend', 'overtime type round-trip');
assert.equal(ot.entries[0].shift, 'night');

// Link cũ: mã 'tp' dùng cho cả transport và type (tăng ca)
const raw = JSON.parse(LZString.decompressFromEncodedURIComponent(enc)!);
const legacy = JSON.stringify(raw).replace(/"ty":/g, '"tp":');
const dec2 = decodeSnapshot(LZString.compressToEncodedURIComponent(legacy))!;
assert.equal(dec2.sharedState.allowances!.transport, 800_000, 'legacy transport');
assert.equal((dec2.tabs as any).overtime.entries[0].type, 'weekend', 'legacy overtime type');
console.log('SNAPSHOT OK');
