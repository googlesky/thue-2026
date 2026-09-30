'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { CalculatorSnapshot } from '@/lib/snapshotTypes';
import { saveNamedSave, getNamedSaves } from '@/lib/snapshotStorage';

interface SaveDialogProps {
  snapshot: CalculatorSnapshot;
  onSave: () => void;
  onClose: () => void;
}

export default function SaveDialog({ snapshot, onSave, onClose }: SaveDialogProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cảnh báo (không chặn) khi trùng tên bản lưu đã có
  const existingLabels = useMemo(
    () => new Set(getNamedSaves().map((s) => s.label.trim().toLowerCase())),
    []
  );
  const isDuplicate = label.trim() !== '' && existingLabels.has(label.trim().toLowerCase());

  // Focus on label input when opened
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      inputRef.current?.focus();
      return;
    }

    try {
      saveNamedSave(snapshot, label.trim(), description.trim() || undefined);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu. Vui lòng thử lại.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-dialog-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 id="save-dialog-title" className="text-xl font-bold text-gray-800">Lưu tính toán</h3>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label input */}
          <div>
            <label htmlFor="save-dialog-label" className="block text-sm font-medium text-gray-700 mb-2">
              Tên bản lưu <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              id="save-dialog-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ví dụ: Lương tháng 9/2026"
              aria-describedby={isDuplicate ? 'save-dialog-duplicate' : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            {isDuplicate && (
              <p id="save-dialog-duplicate" className="mt-1.5 text-xs text-amber-700">
                Đã có bản lưu cùng tên. Bản mới vẫn được lưu riêng, nên đặt tên khác để dễ phân biệt.
              </p>
            )}
          </div>

          {/* Description input */}
          <div>
            <label htmlFor="save-dialog-description" className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả (tùy chọn)
            </label>
            <textarea
              id="save-dialog-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
