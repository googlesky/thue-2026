'use client';

import { useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { computeLawTimeline } from '@/lib/lawTimeline';
import { formatNumber } from '@/lib/taxCalculator';

const QUICK_AMOUNTS = [15_000_000, 30_000_000, 60_000_000, 100_000_000];
const MAX_GROSS = 10_000_000_000;

function parseDigits(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  const value = digits ? parseInt(digits, 10) : 0;
  return Math.min(value, MAX_GROSS);
}

/** Chênh lệch có dấu, tô màu theo chuẩn VN: xanh tăng - đỏ giảm */
function Delta({ value, suffix = 'đ' }: { value: number; suffix?: string }) {
  if (value === 0) {
    return <span className="text-primary-300 font-data text-xs">—</span>;
  }
  const up = value > 0;
  return (
    <span
      className={`font-data text-xs font-semibold whitespace-nowrap ${up ? 'text-rise' : 'text-seal'}`}
    >
      {up ? '▲' : '▼'} {up ? '+' : '−'}
      {formatNumber(Math.abs(value))} {suffix}
    </span>
  );
}

export default function HeroCompare() {
  const [gross, setGross] = useState<number>(30_000_000);
  const [dependents, setDependents] = useState<number>(0);

  const timeline = computeLawTimeline({ grossMonthly: gross, dependents });
  const [y2025, h1, h2] = timeline.points;
  const yearlyDelta = timeline.deltaVs2025 * 12;

  const handleGrossChange = (raw: string) => {
    // flushSync: commit đồng bộ, tránh mất chữ số khi gõ nhanh (controlled input)
    flushSync(() => setGross(parseDigits(raw)));
  };

  const rows = [
    { point: y2025, delta: null as number | null, current: false },
    { point: h1, delta: h1.net - y2025.net, current: false },
    { point: h2, delta: h2.net - y2025.net, current: true },
  ];

  return (
    <div className="card p-0 overflow-hidden">
      {/* Đầu phiếu */}
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5">
        <p className="eyebrow pt-1">Phiếu so sánh thu nhập</p>
        <span className="stamp" aria-label="Mốc hiệu lực gần nhất: 01/07/2026">
          Hiệu lực 01/07/2026
        </span>
      </div>

      {/* Nhập liệu */}
      <div className="px-5 sm:px-6 pt-4 pb-5 border-b border-line">
        <label htmlFor="hero-gross" className="block text-sm font-medium text-primary-500 mb-2">
          Lương gộp của bạn (đ/tháng)
        </label>
        <input
          id="hero-gross"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={gross === 0 ? '' : formatNumber(gross)}
          onChange={(e) => handleGrossChange(e.target.value)}
          onBlur={() => gross === 0 && setGross(30_000_000)}
          className="w-full font-data text-2xl font-semibold text-primary-700 bg-white border border-line rounded-lg px-4 py-3"
          aria-describedby="hero-gross-hint"
        />
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setGross(amount)}
              className={`px-3 py-1.5 rounded-md border text-sm font-data transition-colors min-h-[36px] ${
                gross === amount
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-line bg-white text-primary-500 hover:border-primary-300'
              }`}
            >
              {amount / 1_000_000}tr
            </button>
          ))}
          <span className="mx-1 hidden sm:inline text-line" aria-hidden>
            |
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-primary-500">Người phụ thuộc</span>
            <div className="flex items-center border border-line rounded-md bg-white">
              <button
                type="button"
                onClick={() => setDependents(Math.max(0, dependents - 1))}
                className="w-9 h-9 text-primary-500 hover:bg-primary-50 rounded-l-md"
                aria-label="Giảm số người phụ thuộc"
              >
                −
              </button>
              <span className="w-8 text-center font-data text-sm font-semibold" aria-live="polite">
                {dependents}
              </span>
              <button
                type="button"
                onClick={() => setDependents(Math.min(10, dependents + 1))}
                className="w-9 h-9 text-primary-500 hover:bg-primary-50 rounded-r-md"
                aria-label="Tăng số người phụ thuộc"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ba mốc luật - hàng phiếu lương */}
      <div className="px-5 sm:px-6 py-5">
        <p className="eyebrow mb-4">Thực nhận của bạn</p>
        <ul className="space-y-4">
          {rows.map(({ point, delta, current }) => (
            <li key={point.key}>
              <div className="leader-row">
                <span
                  className={`leader-label text-sm ${current ? 'font-semibold text-primary-700' : 'text-primary-500'}`}
                >
                  {point.label}
                  {current && (
                    <span className="ml-2 align-middle stamp stamp-flat">Hiện hành</span>
                  )}
                </span>
                <span className="leader-dots" aria-hidden />
                <span
                  className={`font-data whitespace-nowrap ${current ? 'text-lg font-semibold text-primary-700' : 'text-base text-primary-600'}`}
                >
                  {formatNumber(point.net)} đ
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span className="text-xs text-primary-300">{point.lawNote}</span>
                {delta !== null && <Delta value={delta} suffix="đ so 2025" />}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Kết luận */}
      <div className="px-5 sm:px-6 py-4 bg-primary-50/60 border-t border-line">
        {timeline.deltaVs2025 !== 0 ? (
          <p className="text-sm text-primary-600">
            So với 2025, mỗi tháng bạn{' '}
            <strong className={timeline.deltaVs2025 > 0 ? 'text-rise' : 'text-seal'}>
              {timeline.deltaVs2025 > 0 ? 'nhận thêm' : 'giảm'}{' '}
              {formatNumber(Math.abs(timeline.deltaVs2025))} đ
            </strong>{' '}
            <span className="text-primary-400 font-data text-xs">
              (≈ {timeline.deltaVs2025 > 0 ? '+' : '−'}
              {formatNumber(Math.abs(yearlyDelta))} đ/năm)
            </span>
          </p>
        ) : (
          <p className="text-sm text-primary-500">
            Mức lương này không đổi thực nhận giữa 2025 và 2026.
          </p>
        )}
        {timeline.deltaVsH1 !== 0 && (
          <p className="text-xs text-primary-400 mt-1">
            Riêng từ 01/07/2026: {timeline.deltaVsH1 > 0 ? 'tăng' : 'giảm'}{' '}
            <span className="font-data">{formatNumber(Math.abs(timeline.deltaVsH1))} đ/tháng</span>{' '}
            do trần đóng BHXH thay đổi.
          </p>
        )}
        <p className="text-[11px] text-primary-300 mt-2">
          Giả định đóng đủ BHXH·BHYT·BHTN trên toàn bộ lương, vùng I.{' '}
          <Link href="/tinh-thue" className="underline underline-offset-2 hover:text-primary-500">
            Tính chi tiết theo trường hợp của bạn
          </Link>
        </p>
      </div>
    </div>
  );
}
