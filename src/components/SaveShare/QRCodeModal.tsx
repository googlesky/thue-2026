'use client';

import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  url: string;
  onClose: () => void;
}

export default function QRCodeModal({ url, onClose }: QRCodeModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 id="qr-modal-title" className="text-xl font-bold text-gray-800">Mã QR</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Đóng"
            aria-label="Đóng"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white border-2 border-gray-200 rounded-xl max-w-full">
            <QRCodeSVG value={url} size={240} level="M" title="Mã QR của link chia sẻ" className="max-w-full h-auto" />
          </div>
        </div>

        {/* URL */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Quét mã để truy cập</p>
          <p className="text-xs text-gray-500 break-all font-mono bg-gray-50 p-3 rounded-lg">
            {url}
          </p>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
