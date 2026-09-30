// Smoke render (SSR) các component UI đã sửa: không lỗi runtime, không emoji, chữ tiếng Việt, a11y cơ bản.
// Chạy: npm run test:golden (hoặc node --import tsx scripts/golden/<file> từ thư mục gốc)
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DEFAULT_SNAPSHOT } from '@/lib/snapshotTypes';
import SaveDialog from '@/components/SaveShare/SaveDialog';
import QRCodeModal from '@/components/SaveShare/QRCodeModal';
import ImportExportSection from '@/components/SaveShare/ImportExportSection';
import NamedSavesSection from '@/components/SaveShare/NamedSavesSection';
import ShareSection from '@/components/SaveShare/ShareSection';
import SaveSharePanel from '@/components/SaveShare/SaveSharePanel';
import { KeyboardShortcuts, ShortcutHelpHint } from '@/components/ui/KeyboardShortcuts';
import LoadingSpinner, { TabLoadingSkeleton, ChartLoadingSkeleton, ResultLoadingSkeleton } from '@/components/ui/LoadingSpinner';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { PWAUpdatePrompt } from '@/components/ui/PWAUpdatePrompt';
import HeroCompare from '@/components/HeroCompare';
import NotFound from '@/app/not-found';

const noop = () => {};
const r = (el: React.ReactElement) => renderToString(el).replace(/<!-- -->/g, '');
const emoji = /\p{Extended_Pictographic}/u;

const dialog = r(<SaveDialog snapshot={DEFAULT_SNAPSHOT} onSave={noop} onClose={noop} />);
assert.ok(dialog.includes('role="dialog"') && dialog.includes('aria-modal="true"') && dialog.includes('aria-labelledby="save-dialog-title"'));
assert.ok(dialog.includes('id="save-dialog-label"') && dialog.includes('for="save-dialog-label"'));
assert.ok(!/id="label"|id="description"/.test(dialog), 'id riêng, không trùng chung');

const qr = r(<QRCodeModal url="https://thue.1devops.io/tinh-thue/" onClose={noop} />);
assert.ok(qr.includes('role="dialog"') && qr.includes('aria-modal="true"') && qr.includes('aria-label="Đóng"'));

const share = r(<ShareSection snapshot={DEFAULT_SNAPSHOT} />);
assert.ok(share.includes('Sao chép') && !/\bCopy\b|Đã copy/.test(share), 'chính tả "Sao chép"');
assert.ok(share.includes('for="share-url"') && share.includes('id="share-url"'));

const io = r(<ImportExportSection />);
assert.ok(io.includes('Xuất file JSON') && io.includes('Chọn file'));

const saves = r(<NamedSavesSection currentSnapshot={DEFAULT_SNAPSHOT} onLoadSnapshot={noop} onClose={noop} />);
assert.ok(saves.includes('Lưu tính toán hiện tại'));

const panel = r(<SaveSharePanel snapshot={DEFAULT_SNAPSHOT} onLoadSnapshot={noop} onClose={noop} />);
assert.ok(panel.includes('aria-pressed="true"'), 'tab đang chọn có aria-pressed');

// Bảng phím tắt đóng lúc đầu → không render; gợi ý chỉ hiện trên màn hình lớn có chuột
assert.equal(r(<KeyboardShortcuts onTabChange={noop} onSave={noop} onToggleDarkMode={noop} totalTabs={9} />), '');
const hint = r(<ShortcutHelpHint />);
assert.ok(hint.includes('hidden md:[@media(pointer:fine)]:block'));

const spin = r(<LoadingSpinner />) + r(<TabLoadingSkeleton />) + r(<ChartLoadingSkeleton />) + r(<ResultLoadingSkeleton />);
assert.ok(!/Loading/.test(spin) && spin.includes('aria-label="Đang tải..."'));
assert.ok(!/class="grid md:/.test(spin), 'grid có grid-cols-1 ở base');

assert.equal(r(<OfflineIndicator />), '', 'SSR không đọc navigator.onLine (tránh lệch hydrate)');
assert.equal(r(<PWAUpdatePrompt />), '');

const hero = r(<HeroCompare />);
assert.ok(!hero.includes('aria-describedby="hero-gross-hint"'), 'không trỏ id không tồn tại');
assert.ok(hero.includes('<time class="stamp" dateTime="2026-07-01">') || hero.includes('<time class="stamp" datetime="2026-07-01">'));
assert.ok(!/<span[^>]*class="stamp"[^>]*aria-label/.test(hero));

const nf = r(<NotFound />);
assert.ok(!emoji.test(nf), '404 không emoji');
assert.ok(!/gradient|blue-|purple-/.test(nf), '404 bỏ gradient/màu cũ');
for (const href of ['/tinh-thue', '/tinh-thue#gross-net', '/tinh-thue#overtime', '/tinh-thue#bonus-calculator', '/tinh-thue#esop-calculator', '/tinh-thue#annual-settlement']) {
  assert.ok(nf.includes(`href="${href}"`), `giữ link ${href}`);
}
assert.ok(nf.includes('bg-paper') && nf.includes('border-line') && nf.includes('text-primary-700'));

for (const [name, html] of Object.entries({ dialog, qr, share, io, saves, panel, spin })) {
  assert.ok(!emoji.test(html), `${name}: không emoji`);
}
console.log('UI RENDER OK');
