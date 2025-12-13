'use client';

import { PRESETS, PresetConfig } from '@/lib/yearlyTaxCalculator';

interface ScenarioPresetsProps {
  selectedPreset: string | null;
  onSelect: (preset: PresetConfig | null) => void;
}

export default function ScenarioPresets({ selectedPreset, onSelect }: ScenarioPresetsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(selectedPreset === preset.id ? null : preset)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedPreset === preset.id
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {preset.id === 'normal' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
            {preset.id === 'defer-bonus' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
            {preset.id === 'optimize' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <span>{preset.name}</span>
          </div>
        </button>
      ))}

      {/* Custom option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          selectedPreset === null
            ? 'bg-primary-600 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Tùy chỉnh</span>
        </div>
      </button>
    </div>
  );
}

// Component hiển thị mô tả preset
export function PresetDescription({ preset }: { preset: PresetConfig | null }) {
  if (!preset) {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Chế độ tùy chỉnh: Bạn có thể nhập lương từng tháng riêng cho cả 2 năm.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm text-primary-700 bg-primary-50 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{preset.description}</span>
      </div>
    </div>
  );
}
