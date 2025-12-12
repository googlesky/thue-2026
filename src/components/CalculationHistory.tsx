'use client';

import { useState, useEffect } from 'react';
import { SharedTaxState, formatCurrency, formatNumber } from '@/lib/taxCalculator';
import {
  CalculationHistoryItem,
  getHistory,
  deleteFromHistory,
  clearHistory,
  formatTimestamp,
} from '@/lib/historyStorage';

interface CalculationHistoryProps {
  onLoadHistory: (state: SharedTaxState) => void;
}

export default function CalculationHistory({ onLoadHistory }: CalculationHistoryProps) {
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // Refresh history when panel opens
  useEffect(() => {
    if (isOpen) {
      setHistory(getHistory());
    }
  }, [isOpen]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFromHistory(id);
    setHistory(getHistory());
  };

  const handleClear = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) {
      clearHistory();
      setHistory([]);
    }
  };

  const handleLoad = (item: CalculationHistoryItem) => {
    onLoadHistory(item.state);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        title="Lịch sử tính toán"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">Lịch sử</span>
        {history.length > 0 && (
          <span className="bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            {history.length}
          </span>
        )}
      </button>

      {/* History panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800">Lịch sử tính toán</h3>
              {history.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>Chưa có lịch sử nào</p>
                  <p className="text-sm mt-1">Nhấn "Lưu" để lưu kết quả tính toán</p>
                </div>
              ) : (
                <div className="divide-y">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleLoad(item)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {item.label && (
                            <div className="font-medium text-gray-800 truncate mb-1">
                              {item.label}
                            </div>
                          )}
                          <div className="text-lg font-bold text-primary-600">
                            {formatCurrency(item.state.grossIncome)}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span>NPT: {item.state.dependents}</span>
                              <span className="text-gray-300">|</span>
                              <span>Vùng {item.state.region}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-red-600">Thuế cũ: {formatNumber(item.oldTax)}</span>
                              <span className="text-gray-300">|</span>
                              <span className="text-green-600">Mới: {formatNumber(item.newTax)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 ml-2">
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(item.timestamp)}
                          </span>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Xóa"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
