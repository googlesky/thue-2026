'use client';

import { useState, useRef } from 'react';
import { exportToJSON, importFromJSON } from '@/lib/snapshotStorage';

interface ImportExportSectionProps {
  onImportSuccess?: () => void;
}

export default function ImportExportSection({ onImportSuccess }: ImportExportSectionProps) {
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle export
  const handleExport = () => {
    const data = exportToJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-calculator-saves-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Process file import
  const processFile = async (file: File) => {
    try {
      const text = await file.text();
      const result = importFromJSON(text);

      if (result.success) {
        setImportResult({
          success: true,
          message: `Đã nhập thành công ${result.count} bản lưu`,
        });
        onImportSuccess?.();
      } else {
        setImportResult({
          success: false,
          message: result.error || 'Không thể nhập file',
        });
      }

      // Clear message after 5 seconds
      setTimeout(() => setImportResult(null), 5000);
    } catch {
      setImportResult({
        success: false,
        message: 'File không hợp lệ',
      });
      setTimeout(() => setImportResult(null), 5000);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      await processFile(file);
    } else {
      setImportResult({
        success: false,
        message: 'Vui lòng chọn file JSON',
      });
      setTimeout(() => setImportResult(null), 5000);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Export section */}
      <div>
        <h4 className="font-medium text-gray-800 mb-2">Xuất dữ liệu</h4>
        <p className="text-sm text-gray-600 mb-3">
          Lưu tất cả các bản lưu thành file JSON để sao lưu hoặc chuyển sang thiết bị khác.
        </p>
        <button
          onClick={handleExport}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Xuất file JSON
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Import section */}
      <div>
        <h4 className="font-medium text-gray-800 mb-2">Nhập dữ liệu</h4>
        <p className="text-sm text-gray-600 mb-3">
          Khôi phục các bản lưu từ file JSON đã xuất trước đó.
        </p>

        {/* File input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Drag and drop area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-gray-600 mb-2">
            Kéo thả file JSON vào đây hoặc
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Chọn file
          </button>
        </div>

        {/* Import result message */}
        {importResult && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              importResult.success
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {importResult.success ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <span>{importResult.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-blue-800">
            Dữ liệu được lưu trữ trên thiết bị này. Xuất file để sao lưu hoặc chuyển sang thiết bị khác.
          </p>
        </div>
      </div>
    </div>
  );
}
