'use client';

import { useState } from 'react';
import { SharedTaxState } from '@/lib/taxCalculator';
import { saveToHistory } from '@/lib/historyStorage';

interface SaveButtonProps {
  state: SharedTaxState;
  oldTax: number;
  newTax: number;
  netIncome: number;
  onSave?: () => void;
}

export default function SaveButton({ state, oldTax, newTax, netIncome, onSave }: SaveButtonProps) {
  const [saved, setSaved] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [label, setLabel] = useState('');

  const handleSave = () => {
    if (showLabelInput) {
      // Save with label
      saveToHistory(state, oldTax, newTax, netIncome, label || undefined);
      setShowLabelInput(false);
      setLabel('');
    } else {
      // Save without label
      saveToHistory(state, oldTax, newTax, netIncome);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSave?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setShowLabelInput(false);
      setLabel('');
    }
  };

  if (showLabelInput) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tên ghi nhớ (tùy chọn)"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-40"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
        >
          Lưu
        </button>
        <button
          onClick={() => {
            setShowLabelInput(false);
            setLabel('');
          }}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
        >
          Hủy
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors"
        title="Lưu kết quả"
      >
        {saved ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">Đã lưu!</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="hidden sm:inline">Lưu</span>
          </>
        )}
      </button>
      <button
        onClick={() => setShowLabelInput(true)}
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="Lưu với tên"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  );
}
