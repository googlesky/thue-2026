'use client';

import { useState, useEffect } from 'react';
import { CalculatorSnapshot, NamedSave } from '@/lib/snapshotTypes';
import { getNamedSaves, deleteNamedSave, formatTimestamp } from '@/lib/snapshotStorage';
import { formatCurrency } from '@/lib/taxCalculator';
import SaveDialog from './SaveDialog';

interface NamedSavesSectionProps {
  currentSnapshot: CalculatorSnapshot;
  onLoadSnapshot: (snapshot: CalculatorSnapshot) => void;
  onClose: () => void;
}

export default function NamedSavesSection({
  currentSnapshot,
  onLoadSnapshot,
  onClose,
}: NamedSavesSectionProps) {
  const [saves, setSaves] = useState<NamedSave[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load saves
  useEffect(() => {
    setSaves(getNamedSaves());
  }, []);

  const handleSaveSuccess = () => {
    setSaves(getNamedSaves());
    setShowSaveDialog(false);
  };

  const handleDelete = (id: string) => {
    deleteNamedSave(id);
    setSaves(getNamedSaves());
    setDeleteConfirmId(null);
  };

  const handleLoad = (save: NamedSave) => {
    onLoadSnapshot(save.snapshot);
    onClose();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Save current button */}
      <button
        onClick={() => setShowSaveDialog(true)}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
        Luu tinh toan hien tai
      </button>

      {/* Saves list */}
      {saves.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>Chua co ban luu nao</p>
          <p className="text-sm mt-1">Luu tinh toan de truy cap sau</p>
        </div>
      ) : (
        <div className="space-y-2">
          {saves.map((save) => (
            <div
              key={save.id}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoad(save)}>
                  <div className="font-medium text-gray-800 truncate mb-1">
                    {save.label}
                  </div>
                  {save.description && (
                    <div className="text-sm text-gray-500 truncate mb-1">
                      {save.description}
                    </div>
                  )}
                  <div className="text-sm text-blue-600 font-medium">
                    {formatCurrency(save.snapshot.sharedState?.grossIncome ?? save.snapshot.state?.grossIncome ?? 0)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTimestamp(save.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleLoad(save)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Tai"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </button>
                  {deleteConfirmId === save.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(save.id)}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        Xac nhan
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                      >
                        Huy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(save.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Xoa"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <SaveDialog
          snapshot={currentSnapshot}
          onSave={handleSaveSuccess}
          onClose={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}
