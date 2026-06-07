'use client';

import React, { useState, useMemo } from 'react';
import {
  calculateSpecialIncomeTax,
  getAllSpecialIncomeTypes,
  SPECIAL_INCOME_LABELS,
  SPECIAL_INCOME_DESCRIPTIONS,
  type SpecialIncomeType,
} from '@/lib/specialIncomeTaxCalculator';
import { formatNumber } from '@/lib/taxCalculator';

const TYPE_ICONS: Record<SpecialIncomeType, string> = {
  domain: '🌐',
  carbon: '🌱',
  license_plate: '🚗',
};

export default function SpecialIncomeTaxCalculator() {
  const [incomeType, setIncomeType] = useState<SpecialIncomeType>('license_plate');
  const [amount, setAmount] = useState<number>(0);

  const result = useMemo(
    () => calculateSpecialIncomeTax({ incomeType, amount }),
    [incomeType, amount]
  );

  const types = getAllSpecialIncomeTypes();

  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-6">
        <span className="text-2xl" aria-hidden>🧾</span>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Thuế thu nhập đặc biệt</h3>
          <p className="text-sm text-gray-600 mt-1">
            Tên miền ".vn", tín chỉ các-bon, biển số xe đấu giá – thuế suất 5% trên
            phần thu nhập vượt 20 triệu/lần (Luật 109/2025/QH15, từ 01/7/2026).
          </p>
        </div>
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
              className={`flex items-center gap-2 px-3 py-3 min-h-[44px] rounded-lg border text-sm font-medium text-left transition-colors ${
                incomeType === t
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg" aria-hidden>{TYPE_ICONS[t]}</span>
              <span>{SPECIAL_INCOME_LABELS[t]}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">{SPECIAL_INCOME_DESCRIPTIONS[incomeType]}</p>
      </div>

      {/* Nhập thu nhập */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Thu nhập nhận được từ một lần chuyển nhượng (VNĐ)
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={amount === 0 ? '' : formatNumber(amount)}
          onChange={(e) => setAmount(parseInt(e.target.value.replace(/[,.]/g, '')) || 0)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800"
          placeholder="VD: 100,000,000"
        />
      </div>

      {/* Kết quả */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Ngưỡng miễn thuế/lần</span>
          <span className="font-semibold text-gray-800">{formatNumber(result.threshold)} đ</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Thu nhập tính thuế (phần vượt)</span>
          <span className="font-semibold text-gray-800">{formatNumber(result.taxableAmount)} đ</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Thuế suất</span>
          <span className="font-semibold text-gray-800">{result.rate * 100}%</span>
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
          <span className="font-semibold text-gray-700">Thuế TNCN phải nộp</span>
          <span className="text-xl font-bold text-primary-600">{formatNumber(result.taxAmount)} đ</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Thực nhận sau thuế</span>
          <span className="font-semibold text-green-600">{formatNumber(result.netAmount)} đ</span>
        </div>
        {result.isExempt && amount > 0 && (
          <p className="text-sm text-green-600">
            ✓ Thu nhập ≤ {formatNumber(result.threshold)} đ – không phải nộp thuế.
          </p>
        )}
      </div>

      {/* Ghi chú pháp lý */}
      <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <p className="text-sm text-blue-800 font-medium mb-1">Căn cứ pháp lý</p>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Điều 3 khoản 10 (điểm a, b, c) và Điều 9 – Luật Thuế TNCN số 109/2025/QH15.</li>
          <li>• Công thức: Thuế = (Thu nhập − 20 triệu) × 5%, tính theo từng lần phát sinh.</li>
          <li>• Hiệu lực từ 01/7/2026; chi tiết chờ nghị định/thông tư hướng dẫn.</li>
        </ul>
      </div>
    </div>
  );
}
