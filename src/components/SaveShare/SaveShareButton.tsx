'use client';

import { useState, useRef, useEffect } from 'react';
import { CalculatorSnapshot } from '@/lib/snapshotTypes';
import SaveSharePanel from './SaveSharePanel';

interface SaveShareButtonProps {
  snapshot: CalculatorSnapshot;
  onLoadSnapshot: (snapshot: CalculatorSnapshot) => void;
}

export default function SaveShareButton({ snapshot, onLoadSnapshot }: SaveShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={buttonRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors"
        title="Lưu và Chia sẻ"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
        <span className="hidden sm:inline">Lưu & Chia sẻ</span>
      </button>

      {isOpen && (
        <SaveSharePanel
          snapshot={snapshot}
          onLoadSnapshot={onLoadSnapshot}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
