'use client';

import { REGIONAL_MINIMUM_WAGES, RegionType, formatCurrency } from '@/lib/taxCalculator';

interface RegionSelectorProps {
  value: RegionType;
  onChange: (region: RegionType) => void;
}

export default function RegionSelector({ value, onChange }: RegionSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Vùng lương tối thiểu
      </label>
      <div className="grid grid-cols-2 gap-2">
        {([1, 2, 3, 4] as RegionType[]).map((region) => {
          const info = REGIONAL_MINIMUM_WAGES[region];
          const isSelected = value === region;
          return (
            <button
              key={region}
              onClick={() => onChange(region)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-sm text-gray-800">{info.name}</div>
              <div className="text-xs text-primary-600 font-medium">
                {formatCurrency(info.wage)}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {REGIONAL_MINIMUM_WAGES[value].description}
      </p>
    </div>
  );
}
