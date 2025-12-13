'use client';

import { useState, useCallback } from 'react';
import { CalculatorSnapshot } from '@/lib/snapshotTypes';
import ShareSection from './ShareSection';
import NamedSavesSection from './NamedSavesSection';
import ImportExportSection from './ImportExportSection';

interface SaveSharePanelProps {
  snapshot: CalculatorSnapshot;
  onLoadSnapshot: (snapshot: CalculatorSnapshot) => void;
  onClose: () => void;
}

type TabType = 'share' | 'saves' | 'importexport';

export default function SaveSharePanel({ snapshot, onLoadSnapshot, onClose }: SaveSharePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('share');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header with tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex items-center justify-between p-4 pb-0">
            <h3 className="font-bold text-gray-800">Luu & Chia se</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Dong"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('share')}
              className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === 'share'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Chia se
            </button>
            <button
              onClick={() => setActiveTab('saves')}
              className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === 'saves'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Da luu
            </button>
            <button
              onClick={() => setActiveTab('importexport')}
              className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === 'importexport'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Xuat/Nhap
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'share' && <ShareSection snapshot={snapshot} />}
          {activeTab === 'saves' && (
            <NamedSavesSection
              key={refreshKey}
              currentSnapshot={snapshot}
              onLoadSnapshot={onLoadSnapshot}
              onClose={onClose}
            />
          )}
          {activeTab === 'importexport' && <ImportExportSection onImportSuccess={handleImportSuccess} />}
        </div>
      </div>
    </>
  );
}
