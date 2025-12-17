'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { convertGrossNet, GrossNetResult } from '@/lib/grossNetCalculator';
import { formatCurrency, formatNumber, RegionType, getRegionalMinimumWages, SharedTaxState, DEFAULT_INSURANCE_OPTIONS, AllowancesState, DEFAULT_ALLOWANCES } from '@/lib/taxCalculator';
import Tooltip from '@/components/ui/Tooltip';

interface GrossNetConverterProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
}

// Info icon component for tooltips
function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function GrossNetConverter({ sharedState, onStateChange }: GrossNetConverterProps) {
  // Get date-aware regional minimum wages
  const regionalMinimumWages = useMemo(() => getRegionalMinimumWages(new Date()), []);

  // Store both GROSS and NET values to avoid recalculation drift
  const [grossValue, setGrossValue] = useState<number>(sharedState?.grossIncome ?? 30000000);
  const [netValue, setNetValue] = useState<number>(0);
  const [type, setType] = useState<'gross' | 'net'>('gross');
  const [dependents, setDependents] = useState<number>(sharedState?.dependents ?? 0);
  const [hasInsurance, setHasInsurance] = useState<boolean>(sharedState?.hasInsurance ?? true);
  const [region, setRegion] = useState<RegionType>(sharedState?.region ?? 1);

  // Lương đóng BH khác lương thực
  const [useDeclaredSalary, setUseDeclaredSalary] = useState<boolean>(
    sharedState?.declaredSalary !== undefined
  );
  const [declaredSalary, setDeclaredSalary] = useState<number>(
    sharedState?.declaredSalary ?? sharedState?.grossIncome ?? 30000000
  );

  // Phụ cấp (synced from sharedState)
  const [allowances, setAllowances] = useState<AllowancesState>(
    sharedState?.allowances ?? DEFAULT_ALLOWANCES
  );

  const [oldResult, setOldResult] = useState<GrossNetResult | null>(null);
  const [newResult, setNewResult] = useState<GrossNetResult | null>(null);

  // Track if we're the source of the change to prevent sync loops
  const isLocalChange = useRef(false);
  const isInitialized = useRef(false);
  const isCalculatingFromNet = useRef(false);

  // Get effective declared salary for calculations
  const getEffectiveDeclaredSalary = useCallback(() => {
    return useDeclaredSalary ? declaredSalary : undefined;
  }, [useDeclaredSalary, declaredSalary]);

  // Calculate results from GROSS (always calculate from gross to ensure consistency)
  const calculateFromGross = useCallback((gross: number) => {
    if (gross <= 0) return;

    const effectiveDeclared = getEffectiveDeclaredSalary();

    const oldRes = convertGrossNet({
      amount: gross,
      type: 'gross',
      dependents,
      hasInsurance,
      useNewLaw: false,
      region,
      declaredSalary: effectiveDeclared,
      allowances,
    });
    const newRes = convertGrossNet({
      amount: gross,
      type: 'gross',
      dependents,
      hasInsurance,
      useNewLaw: true,
      region,
      declaredSalary: effectiveDeclared,
      allowances,
    });

    setOldResult(oldRes);
    setNewResult(newRes);
    setNetValue(newRes.net);

    return newRes;
  }, [dependents, hasInsurance, region, getEffectiveDeclaredSalary, allowances]);

  // Calculate GROSS from NET (only when user inputs NET)
  const calculateFromNet = useCallback((net: number) => {
    if (net <= 0) return;

    // Mark that we're calculating from NET to prevent the recalc effect from overwriting
    isCalculatingFromNet.current = true;

    const effectiveDeclared = getEffectiveDeclaredSalary();

    const newRes = convertGrossNet({
      amount: net,
      type: 'net',
      dependents,
      hasInsurance,
      useNewLaw: true,
      region,
      declaredSalary: effectiveDeclared,
      allowances,
    });
    const oldRes = convertGrossNet({
      amount: net,
      type: 'net',
      dependents,
      hasInsurance,
      useNewLaw: false,
      region,
      declaredSalary: effectiveDeclared,
      allowances,
    });

    setOldResult(oldRes);
    setNewResult(newRes);
    setGrossValue(newRes.gross);

    // Sync gross to shared state
    if (onStateChange) {
      isLocalChange.current = true;
      onStateChange({ grossIncome: newRes.gross });
    }

    return newRes;
  }, [dependents, hasInsurance, region, onStateChange, getEffectiveDeclaredSalary, allowances]);

  // Initial calculation
  useEffect(() => {
    if (!isInitialized.current) {
      calculateFromGross(grossValue);
      isInitialized.current = true;
    }
  }, [grossValue, calculateFromGross]);

  // Recalculate when parameters change (dependents, insurance, region, allowances, etc.)
  // Must recalculate from the value the user is currently working with
  useEffect(() => {
    if (isInitialized.current) {
      // Skip if this was triggered by a NET calculation (grossValue changed from NET input)
      if (isCalculatingFromNet.current) {
        isCalculatingFromNet.current = false;
        return;
      }
      // Recalculate based on which mode the user is in
      if (type === 'net' && netValue > 0) {
        // User is in NET mode - recalculate from NET to find new GROSS
        calculateFromNet(netValue);
      } else {
        // User is in GROSS mode - recalculate from GROSS to find new NET
        calculateFromGross(grossValue);
      }
    }
  }, [dependents, hasInsurance, region, useDeclaredSalary, declaredSalary, allowances, type, netValue, calculateFromGross, calculateFromNet, grossValue]);

  // Sync with sharedState when it changes from other tabs
  // NOTE: Don't call calculateFromGross here - let the main recalc effect handle it
  // after re-render when all values are updated. Otherwise, callbacks use stale closure values.
  useEffect(() => {
    if (sharedState && !isLocalChange.current) {
      // Update all values from sharedState
      if (sharedState.grossIncome !== grossValue) {
        setGrossValue(sharedState.grossIncome);
      }
      setDependents(sharedState.dependents);
      setHasInsurance(sharedState.hasInsurance);
      setRegion(sharedState.region);

      // Sync declared salary
      const hasDeclared = sharedState.declaredSalary !== undefined;
      setUseDeclaredSalary(hasDeclared);
      if (sharedState.declaredSalary !== undefined) {
        setDeclaredSalary(sharedState.declaredSalary);
      }

      // Sync allowances
      setAllowances(sharedState.allowances ?? DEFAULT_ALLOWANCES);

      // When syncing from external source, switch to GROSS mode
      // This ensures the synced GROSS value is the source of truth
      if (sharedState.grossIncome !== grossValue) {
        setType('gross');
      }
    }
    isLocalChange.current = false;
  }, [sharedState, grossValue]);

  // Handle amount change based on current type
  const handleAmountChange = (value: string) => {
    const numericValue = parseInt(value.replace(/[^\d]/g, ''), 10) || 0;

    if (type === 'gross') {
      setGrossValue(numericValue);
      calculateFromGross(numericValue);
      // Sync to shared state
      if (onStateChange) {
        isLocalChange.current = true;
        onStateChange({ grossIncome: numericValue });
      }
    } else {
      setNetValue(numericValue);
      calculateFromNet(numericValue);
    }
  };

  // Handle switching between GROSS and NET modes
  // Just swap display, NO recalculation
  const handleTypeChange = (newType: 'gross' | 'net') => {
    if (newType === type) return;
    setType(newType);
    // Don't recalculate - just change which value is shown in input
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

  const handleUseDeclaredSalaryChange = (use: boolean) => {
    setUseDeclaredSalary(use);
    isLocalChange.current = true;
    if (onStateChange) {
      onStateChange({
        declaredSalary: use ? declaredSalary : undefined,
      });
    }
  };

  const handleDeclaredSalaryChange = (value: string) => {
    const numericValue = parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
    setDeclaredSalary(numericValue);
    isLocalChange.current = true;
    if (onStateChange) {
      onStateChange({ declaredSalary: numericValue });
    }
  };

  // Current display value based on type
  const displayValue = type === 'gross' ? grossValue : netValue;
  const savings = oldResult && newResult ? oldResult.tax - newResult.tax : 0;

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl">💰</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quy đổi GROSS ↔ NET</h2>
          <p className="text-sm text-gray-500">Chuyển đổi giữa lương GROSS và NET</p>
        </div>
      </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Loại lương đầu vào
              <Tooltip content="Chuyển đổi giữa tính từ lương GROSS sang NET hoặc ngược lại">
                <span className="text-gray-400 hover:text-gray-600 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
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
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              {type === 'gross' ? 'Lương GROSS' : 'Lương NET'} (VNĐ/tháng)
              <Tooltip content="Số tiền cần chuyển đổi">
                <span className="text-gray-400 hover:text-gray-600 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
            </label>
            <input
              type="text"
              value={formatNumber(displayValue)}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="input-field text-lg font-semibold"
            />
          </div>

          {/* Lương đóng bảo hiểm */}
          {hasInsurance && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDeclaredSalary}
                  onChange={(e) => handleUseDeclaredSalaryChange(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Lương đóng BH khác lương thực
                  <Tooltip content="Mức lương công ty đăng ký đóng bảo hiểm. Bảo hiểm tính trên mức này, thuế TNCN vẫn tính trên lương thực.">
                    <span className="text-gray-400 hover:text-gray-600 cursor-help">
                      <InfoIcon />
                    </span>
                  </Tooltip>
                </span>
              </label>
              {useDeclaredSalary && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Lương đóng BHXH, BHYT, BHTN (VNĐ)
                  </label>
                  <input
                    type="text"
                    value={formatNumber(declaredSalary)}
                    onChange={(e) => handleDeclaredSalaryChange(e.target.value)}
                    className="input-field text-sm"
                    placeholder="Ví dụ: 5.000.000"
                  />
                  <p className="text-xs text-amber-600 mt-1">
                    BH tính trên mức này • Thuế tính trên lương thực
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Người phụ thuộc */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Số người phụ thuộc
              <Tooltip content="Con cái, cha mẹ được giảm trừ theo quy định">
                <span className="text-gray-400 hover:text-gray-600 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
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
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              Có đóng BHXH, BHYT, BHTN
              <Tooltip content="Các loại bảo hiểm bắt buộc: BHXH 8%, BHYT 1.5%, BHTN 1%">
                <span className="text-gray-400 hover:text-gray-600 cursor-help">
                  <InfoIcon />
                </span>
              </Tooltip>
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
                  const info = regionalMinimumWages[r];
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
                  <div className="text-xs text-red-600 font-medium mb-2 flex items-center gap-1">
                    LUẬT CŨ (7 bậc)
                    <Tooltip content="Luật thuế hiện hành với 7 bậc thuế lũy tiến">
                      <span className="text-red-400 hover:text-red-600 cursor-help">
                        <InfoIcon />
                      </span>
                    </Tooltip>
                  </div>
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
                  <div className="text-xs text-primary-600 font-medium mb-2 flex items-center gap-1">
                    LUẬT MỚI (5 bậc)
                    <Tooltip content="Luật thuế mới 2026 với 5 bậc thuế lũy tiến, giảm thuế cho hầu hết người lao động">
                      <span className="text-primary-400 hover:text-primary-600 cursor-help">
                        <InfoIcon />
                      </span>
                    </Tooltip>
                  </div>
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
                {useDeclaredSalary && (
                  <div className="mb-2 px-2 py-1 bg-amber-100 rounded text-xs text-amber-700">
                    Bảo hiểm tính trên lương khai báo: {formatCurrency(declaredSalary)}
                  </div>
                )}
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
