'use client';

import React, { useState, useMemo } from 'react';
import {
  calculateSpecialIncomeTax,
  getAllSpecialIncomeTypes,
  SPECIAL_INCOME_LABELS,
  SPECIAL_INCOME_DESCRIPTIONS,
  type SpecialIncomeType,
} from '@/lib/specialIncomeTaxCalculator';
import { formatNumber, parseCurrency } from '@/lib/taxCalculator';

const INPUT_CLASS = 'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800';

export default function SpecialIncomeTaxCalculator() {
  const [incomeType, setIncomeType] = useState<SpecialIncomeType>('license_plate');
  const [amount, setAmount] = useState<number>(0);
  const [vehicleResidualValue, setVehicleResidualValue] = useState<number>(0);
  const [carbonFirstTransfer, setCarbonFirstTransfer] = useState(false);

  const result = useMemo(
    () => calculateSpecialIncomeTax({ incomeType, amount, vehicleResidualValue, carbonFirstTransfer }),
    [incomeType, amount, vehicleResidualValue, carbonFirstTransfer]
  );

  const types = getAllSpecialIncomeTypes();
  const isPlate = incomeType === 'license_plate';

  return (
    <div className="card">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800">Thuế thu nhập đặc biệt</h3>
        <p className="text-sm text-gray-600 mt-1">
          Tên miền &ldquo;.vn&rdquo;, tín chỉ các-bon, biển số xe trúng đấu giá – thuế suất 5% trên phần thu
          nhập vượt 20 triệu đồng/lần (Luật 109/2025/QH15, từ 01/7/2026).
        </p>
      </div>

      {/* Chọn loại thu nhập */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Loại thu nhập
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setIncomeType(t)}
              className={`px-3 py-3 min-h-[44px] rounded-lg border text-sm font-medium text-left transition-colors ${
                incomeType === t
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {SPECIAL_INCOME_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">{SPECIAL_INCOME_DESCRIPTIONS[incomeType]}</p>
      </div>

      {/* Nhập thu nhập */}
      <div className="mb-6 space-y-4">
        <div>
          <label htmlFor="special-income-amount" className="block text-sm font-medium text-gray-700 mb-1">
            {isPlate
              ? 'Giá chuyển nhượng (gồm cả xe gắn biển số) (VNĐ)'
              : 'Thu nhập nhận được từ một lần chuyển nhượng (VNĐ)'}
          </label>
          <input
            id="special-income-amount"
            type="text"
            inputMode="numeric"
            value={amount === 0 ? '' : formatNumber(amount)}
            onChange={(e) => setAmount(parseCurrency(e.target.value))}
            className={INPUT_CLASS}
            placeholder="VD: 100.000.000"
          />
        </div>

        {isPlate && (
          <div>
            <label htmlFor="special-income-vehicle" className="block text-sm font-medium text-gray-700 mb-1">
              Giá trị còn lại của xe theo giá tính lệ phí trước bạ (VNĐ)
            </label>
            <input
              id="special-income-vehicle"
              type="text"
              inputMode="numeric"
              value={vehicleResidualValue === 0 ? '' : formatNumber(vehicleResidualValue)}
              onChange={(e) => setVehicleResidualValue(parseCurrency(e.target.value))}
              className={INPUT_CLASS}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tại thời điểm chuyển nhượng; được trừ khỏi giá chuyển nhượng (NĐ 253/2026/NĐ-CP Điều 62 khoản 1).
            </p>
          </div>
        )}

        {incomeType === 'carbon' && (
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={carbonFirstTransfer}
              onChange={(e) => setCarbonFirstTransfer(e.target.checked)}
              className="checkbox-touch mt-0.5 flex-shrink-0"
            />
            <span>
              Chuyển nhượng lần đầu bởi chính cá nhân được cấp, công nhận tín chỉ các-bon / kết quả giảm phát
              thải (miễn thuế)
            </span>
          </label>
        )}
      </div>

      {/* Kết quả */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        {isPlate && result.deduction > 0 && (
          <div className="flex justify-between items-center gap-3">
            <span className="text-gray-600">Trừ giá trị còn lại của xe</span>
            <span className="font-semibold text-gray-800 whitespace-nowrap">{formatNumber(result.deduction)} đ</span>
          </div>
        )}
        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-600">Ngưỡng miễn thuế/lần</span>
          <span className="font-semibold text-gray-800 whitespace-nowrap">{formatNumber(result.threshold)} đ</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-600">Thu nhập tính thuế (phần vượt)</span>
          <span className="font-semibold text-gray-800 whitespace-nowrap">{formatNumber(result.taxableAmount)} đ</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-600">Thuế suất</span>
          <span className="font-semibold text-gray-800">{result.rate * 100}%</span>
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between items-center gap-3">
          <span className="font-semibold text-gray-700">Thuế TNCN phải nộp</span>
          <span className="text-xl font-bold text-primary-600 whitespace-nowrap">{formatNumber(result.taxAmount)} đ</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-600">Thực nhận sau thuế</span>
          <span className="font-semibold text-green-600 whitespace-nowrap">{formatNumber(result.netAmount)} đ</span>
        </div>
        {result.isExempt && amount > 0 && (
          <p className="text-sm text-green-600">
            {result.exemptReason
              ?? `Thu nhập tính thuế không vượt ${formatNumber(result.threshold)} đ/lần – không phải nộp thuế.`}
          </p>
        )}
      </div>

      {/* Ghi chú pháp lý */}
      <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <p className="text-sm text-blue-800 font-medium mb-1">Căn cứ pháp lý</p>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • Luật Thuế TNCN số 109/2025/QH15: Điều 3 khoản 10 điểm a, b, c; Điều 19 khoản 1 (cá nhân cư trú),
            Điều 27 khoản 1 (cá nhân không cư trú) – 5% trên phần thu nhập vượt 20 triệu đồng/lần.
          </li>
          <li>
            • Nghị định 253/2026/NĐ-CP: Điều 16, Điều 62 khoản 1 (biển số: trừ giá trị còn lại của xe theo giá
            tính lệ phí trước bạ), Điều 34 khoản 1 (miễn thuế chuyển nhượng lần đầu tín chỉ các-bon).
          </li>
          <li>• Công thức: Thuế = (Thu nhập − 20 triệu) × 5%, tính theo từng lần phát sinh, áp dụng từ 01/7/2026.</li>
        </ul>
      </div>
    </div>
  );
}
