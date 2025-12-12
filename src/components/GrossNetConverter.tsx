'use client';

import { useState, useEffect, useRef } from 'react';
import { convertGrossNet, GrossNetResult } from '@/lib/grossNetCalculator';
import { formatCurrency, formatNumber, RegionType, REGIONAL_MINIMUM_WAGES, InsuranceOptions, DEFAULT_INSURANCE_OPTIONS } from '@/lib/taxCalculator';

interface SharedTaxState {
  grossIncome: number;
  declaredSalary?: number;
  dependents: number;
  otherDeductions: number;
  hasInsurance: boolean;
  insuranceOptions: InsuranceOptions;
  region: RegionType;
  pensionContribution: number;
}

interface GrossNetConverterProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
}

export default function GrossNetConverter({ sharedState, onStateChange }: GrossNetConverterProps) {
  const [amount, setAmount] = useState<string>(sharedState?.grossIncome?.toString() ?? '30000000');
  const [type, setType] = useState<'gross' | 'net'>('gross');
  const [dependents, setDependents] = useState<number>(sharedState?.dependents ?? 0);
  const [hasInsurance, setHasInsurance] = useState<boolean>(sharedState?.hasInsurance ?? true);
  const [region, setRegion] = useState<RegionType>(sharedState?.region ?? 1);

  const [oldResult, setOldResult] = useState<GrossNetResult | null>(null);
  const [newResult, setNewResult] = useState<GrossNetResult | null>(null);

  // Track if we're the source of the change to prevent sync loops
  const isLocalChange = useRef(false);
  // Track the last synced gross to prevent loops when in NET mode
  const lastSyncedGross = useRef<number | null>(null);

  // Sync with sharedState when it changes (only in GROSS mode and not from local changes)
  useEffect(() => {
    if (sharedState && type === 'gross' && !isLocalChange.current) {
      setAmount(sharedState.grossIncome.toString());
      setDependents(sharedState.dependents);
      setHasInsurance(sharedState.hasInsurance);
      setRegion(sharedState.region);
    }
    // Reset flag after processing
    isLocalChange.current = false;
  }, [sharedState, type]);

  // Calculate results
  useEffect(() => {
    const numAmount = parseInt(amount.replace(/[^\d]/g, ''), 10) || 0;
    if (numAmount > 0) {
      const oldRes = convertGrossNet({
        amount: numAmount,
        type,
        dependents,
        hasInsurance,
        useNewLaw: false,
        region,
      });
      const newRes = convertGrossNet({
        amount: numAmount,
        type,
        dependents,
        hasInsurance,
        useNewLaw: true,
        region,
      });
      setOldResult(oldRes);
      setNewResult(newRes);
    }
  }, [amount, type, dependents, hasInsurance, region]);

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setAmount(numericValue);
    isLocalChange.current = true;

    // Sync gross income to shared state only in GROSS mode
    if (onStateChange && type === 'gross') {
      onStateChange({ grossIncome: parseInt(numericValue, 10) || 0 });
    }
  };

  const handleDependentsChange = (newDependents: number) => {
    setDependents(newDependents);
    isLocalChange.current = true;
    if (onStateChange) {
      onStateChange({ dependents: newDependents });
    }
  };

  const handleInsuranceChange = (newHasInsurance: boolean) => {
    setHasInsurance(newHasInsurance);
    isLocalChange.current = true;
    if (onStateChange) {
      onStateChange({
        hasInsurance: newHasInsurance,
        insuranceOptions: newHasInsurance ? DEFAULT_INSURANCE_OPTIONS : { bhxh: false, bhyt: false, bhtn: false },
      });
    }
  };

  const handleRegionChange = (newRegion: RegionType) => {
    setRegion(newRegion);
    isLocalChange.current = true;
    if (onStateChange) {
      onStateChange({ region: newRegion });
    }
  };

  // Handle switching between GROSS and NET modes
  // When switching, convert the amount to the corresponding value
  const handleTypeChange = (newType: 'gross' | 'net') => {
    if (newType === type || !newResult) return;

    isLocalChange.current = true;

    if (newType === 'net') {
      // Switching from GROSS to NET: use the calculated NET value
      setAmount(newResult.net.toString());
      lastSyncedGross.current = newResult.gross; // Track the gross we came from
    } else {
      // Switching from NET to GROSS: use the calculated GROSS value
      setAmount(newResult.gross.toString());
      lastSyncedGross.current = null;
      // Sync to shared state
      if (onStateChange) {
        onStateChange({ grossIncome: newResult.gross });
      }
    }

    setType(newType);
  };

  // When result changes with NET input, sync the calculated gross to shared state
  useEffect(() => {
    if (type === 'net' && newResult && onStateChange) {
      // Only sync if the calculated gross is different from last synced value
      if (lastSyncedGross.current !== newResult.gross) {
        lastSyncedGross.current = newResult.gross;
        isLocalChange.current = true;
        onStateChange({ grossIncome: newResult.gross });
      }
    }
  }, [type, newResult, onStateChange]);

  // Reset lastSyncedGross when switching to GROSS mode
  useEffect(() => {
    if (type === 'gross') {
      lastSyncedGross.current = null;
    }
  }, [type]);

  const savings = oldResult && newResult ? oldResult.tax - newResult.tax : 0;

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Chuyển đổi GROSS - NET
      </h3>

      {/* Sync indicator */}
      {sharedState && (
        <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Dữ liệu được đồng bộ với các tab khác
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          {/* Loại lương */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại lương đầu vào
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleTypeChange('gross')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  type === 'gross'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                GROSS (Lương gộp)
              </button>
              <button
                onClick={() => handleTypeChange('net')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  type === 'net'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                NET (Thực nhận)
              </button>
            </div>
          </div>

          {/* Số tiền */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số tiền (VNĐ/tháng)
            </label>
            <input
              type="text"
              value={formatNumber(parseInt(amount, 10) || 0)}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="input-field text-lg font-semibold"
            />
          </div>

          {/* Người phụ thuộc */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số người phụ thuộc
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleDependentsChange(Math.max(0, dependents - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold"
              >
                -
              </button>
              <span className="text-2xl font-bold w-12 text-center">{dependents}</span>
              <button
                onClick={() => handleDependentsChange(dependents + 1)}
                className="w-10 h-10 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center text-lg font-bold text-primary-700"
              >
                +
              </button>
            </div>
          </div>

          {/* Bảo hiểm */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasInsurance}
              onChange={(e) => handleInsuranceChange(e.target.checked)}
              className="w-5 h-5 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Có đóng BHXH, BHYT, BHTN
            </span>
          </label>

          {/* Vùng lương */}
          {hasInsurance && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vùng lương tối thiểu
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([1, 2, 3, 4] as RegionType[]).map((r) => {
                  const info = REGIONAL_MINIMUM_WAGES[r];
                  const isSelected = region === r;
                  return (
                    <button
                      key={r}
                      onClick={() => handleRegionChange(r)}
                      className={`p-2 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-xs text-gray-800">{info.name}</div>
                      <div className="text-xs text-primary-600 font-medium">
                        {formatCurrency(info.wage)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="space-y-4">
          {newResult && oldResult && (
            <>
              {/* Tiết kiệm */}
              {savings > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-700 mb-1">Tiết kiệm với luật mới</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(savings)}/tháng
                  </div>
                  <div className="text-sm text-green-600">
                    ({formatCurrency(savings * 12)}/năm)
                  </div>
                </div>
              )}

              {/* So sánh */}
              <div className="grid grid-cols-2 gap-4">
                {/* Luật cũ */}
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-xs text-red-600 font-medium mb-2">LUẬT CŨ (7 bậc)</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">GROSS:</span>
                      <span className="font-medium">{formatCurrency(oldResult.gross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bảo hiểm:</span>
                      <span className="text-gray-500">-{formatCurrency(oldResult.insurance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thuế TNCN:</span>
                      <span className="text-red-600 font-medium">-{formatCurrency(oldResult.tax)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-medium">NET:</span>
                      <span className="font-bold text-gray-800">{formatCurrency(oldResult.net)}</span>
                    </div>
                  </div>
                </div>

                {/* Luật mới */}
                <div className="bg-primary-50 rounded-lg p-4">
                  <div className="text-xs text-primary-600 font-medium mb-2">LUẬT MỚI (5 bậc)</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">GROSS:</span>
                      <span className="font-medium">{formatCurrency(newResult.gross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bảo hiểm:</span>
                      <span className="text-gray-500">-{formatCurrency(newResult.insurance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thuế TNCN:</span>
                      <span className="text-primary-600 font-medium">-{formatCurrency(newResult.tax)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-medium">NET:</span>
                      <span className="font-bold text-gray-800">{formatCurrency(newResult.net)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chi tiết giảm trừ */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Chi tiết các khoản giảm trừ (Luật mới)</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giảm trừ bản thân:</span>
                    <span>{formatCurrency(newResult.deductions.personal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giảm trừ NPT:</span>
                    <span>{formatCurrency(newResult.deductions.dependent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BHXH, BHYT, BHTN:</span>
                    <span>{formatCurrency(newResult.deductions.insurance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thu nhập tính thuế:</span>
                    <span className="font-medium">{formatCurrency(newResult.taxableIncome)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
