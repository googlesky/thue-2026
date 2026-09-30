'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CalculatorSnapshot } from '@/lib/snapshotTypes';
import { generateShareURL, copyToClipboard } from '@/lib/snapshotCodec';
import QRCodeModal from './QRCodeModal';

interface ShareSectionProps {
  snapshot: CalculatorSnapshot;
}

export default function ShareSection({ snapshot }: ShareSectionProps) {
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [shareURL, setShareURL] = useState<string>('');

  // Generate share URL
  useEffect(() => {
    setShareURL(generateShareURL(snapshot));
  }, [snapshot]);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareURL);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const grossIncome = snapshot.sharedState?.grossIncome ?? snapshot.state?.grossIncome ?? 0;
        await navigator.share({
          title: 'Tính thuế TNCN 2026',
          text: `Tính thuế với thu nhập ${new Intl.NumberFormat('vi-VN').format(grossIncome)} VND`,
          url: shareURL,
        });
      } catch {
        // User cancelled or error, fall back to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* URL Input with Copy Button */}
      <div>
        <label htmlFor="share-url" className="block text-sm font-medium text-gray-700 mb-2">
          Link chia sẻ
        </label>
        <div className="flex gap-2">
          <input
            id="share-url"
            type="text"
            value={shareURL}
            readOnly
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!shareURL}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            title="Sao chép link"
          >
            {copied ? (
              <span className="flex items-center gap-1" role="status">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Đã sao chép
              </span>
            ) : (
              'Sao chép'
            )}
          </button>
        </div>
      </div>

      {/* QR Code Preview */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">
          Mã QR
        </p>
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white border border-gray-200 rounded-lg">
            <QRCodeSVG value={shareURL} size={120} level="M" title="Mã QR của link chia sẻ" />
          </div>
          <div className="flex-1 space-y-2">
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
              Xem lớn hơn
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full px-4 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Chia sẻ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-gray-500">
        Quét mã QR hoặc chia sẻ link này để người khác xem kết quả tính thuế của bạn.
      </p>

      {/* QR Modal */}
      {showQRModal && (
        <QRCodeModal url={shareURL} onClose={() => setShowQRModal(false)} />
      )}
    </div>
  );
}
