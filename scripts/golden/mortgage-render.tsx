// Smoke render MortgageCalculator (SSR): không lỗi runtime, không emoji, nhãn gắn id, số kiểu vi-VN.
// Chạy: npm run test:golden (hoặc node --import tsx scripts/golden/<file> từ thư mục gốc)
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MortgageCalculator } from '@/components/MortgageCalculator';
import { DEFAULT_MORTGAGE_STATE } from '@/lib/snapshotTypes';

const html = renderToString(
  <MortgageCalculator tabState={{ ...DEFAULT_MORTGAGE_STATE, downPaymentPercent: 100 / 3 }} onTabStateChange={() => {}} />
).replace(/<!-- -->/g, '');
assert.ok(html.includes('Vay mua nhà'));
assert.ok(!/\p{Extended_Pictographic}/u.test(html), 'không emoji');
for (const id of ['mortgage-price', 'mortgage-down-payment', 'mortgage-term', 'mortgage-pref-rate', 'mortgage-pref-months', 'mortgage-float-rate']) {
  assert.ok(html.includes(`for="${id}"`) && html.includes(`id="${id}"`), `label/id ${id}`);
}
assert.ok(html.includes('aria-pressed="true"'), 'nút %/VNĐ có aria-pressed');
assert.ok(html.includes('value="33.33"'), '% trả trước hiển thị gọn 2 chữ số lẻ');
// 3 tỷ × (1 − 1/3) = 2 tỷ vay; trả trước = 1 tỷ; DTI có dấu phẩy thập phân
assert.ok(/Nợ vay \/ thu nhập = \d+(,\d)?%/.test(html), 'DTI định dạng vi-VN');
assert.ok(html.includes('2,7 tỷ') && html.includes('15,5 tr'), 'dấu phẩy thập phân vi-VN');
assert.ok(!/\d\.\d tỷ/.test(html.replace(/\d{1,3}(\.\d{3})+/g, 'N')), 'không còn "2.1 tỷ" kiểu en-US');
console.log('MORTGAGE RENDER OK');

// Snapshot sửa tay: % trả trước dạng chuỗi không làm vỡ tab; thẻ ưu đãi hiển thị số tháng thực áp dụng
const html2 = renderToString(
  <MortgageCalculator tabState={{ ...DEFAULT_MORTGAGE_STATE, downPaymentPercent: '25' as unknown as number, loanTermYears: 1, preferentialMonths: 36 }} onTabStateChange={() => {}} />
).replace(/<!-- -->/g, '');
assert.ok(html2.includes('value="25"'));
assert.ok(html2.includes('/tháng (12 tháng)'), 'ưu đãi 36 tháng trên khoản vay 1 năm → áp dụng 12 tháng');
assert.ok(html2.includes('Ưu đãi phủ hết thời hạn'));
console.log('MORTGAGE RENDER 2 OK');
