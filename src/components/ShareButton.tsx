'use client';

import { useState } from 'react';
import { SharedTaxState } from '@/lib/taxCalculator';
import { generateShareURL, copyToClipboard } from '@/lib/urlState';

interface ShareButtonProps {
  state: SharedTaxState;
}

export default function ShareButton({ state }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleShare = async () => {
    const url = generateShareURL(state);

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tính thuế TNCN 2026',
          text: `Tính thuế với thu nhập ${new Intl.NumberFormat('vi-VN').format(state.grossIncome)} VNĐ`,
          url,
        });
        return;
      } catch {
        // User cancelled or error, fall back to copy
      }
    }

    // Fall back to copy to clipboard
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setShowTooltip(true);
      setTimeout(() => {
        setCopied(false);
        setShowTooltip(false);
      }, 2000);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg font-medium transition-colors"
        title="Chia sẻ kết quả"
      >
        {copied ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">Đã copy!</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="hidden sm:inline">Chia sẻ</span>
          </>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap">
          Link đã được copy!
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}
