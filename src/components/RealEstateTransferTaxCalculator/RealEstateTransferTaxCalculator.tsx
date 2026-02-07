'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  RealEstateTransfer,
  RealEstateTransferTaxInput,
  RealEstateTransferTaxResult,
  RealEstateType,
  TransferType,
  FamilyRelationship,
  calculateRealEstateTransferTax,
  createEmptyTransfer,
  formatCurrency,
  PROPERTY_TYPE_LABELS,
  TRANSFER_TYPE_LABELS,
  FAMILY_RELATIONSHIP_LABELS,
  REAL_ESTATE_TAX_RATES,
  estimateTransferTax,
} from '@/lib/realEstateTransferTaxCalculator';

export function RealEstateTransferTaxCalculator() {
  const [transfers, setTransfers] = useState<RealEstateTransfer[]>([
    createEmptyTransfer(),
  ]);
  const [showQuickCalculator, setShowQuickCalculator] = useState(true);
  const [quickValue, setQuickValue] = useState<number>(0);
  const [quickIsExempt, setQuickIsExempt] = useState(false);

  // Calculate results
  const result: RealEstateTransferTaxResult | null = useMemo(() => {
    const validTransfers = transfers.filter((t) => t.transferValue > 0);
    if (validTransfers.length === 0) return null;

    const input: RealEstateTransferTaxInput = { transfers: validTransfers };
    return calculateRealEstateTransferTax(input);
  }, [transfers]);

  // Quick estimate
  const quickEstimate = useMemo(() => {
    if (quickValue <= 0) return null;
    return estimateTransferTax(quickValue, quickIsExempt);
  }, [quickValue, quickIsExempt]);

  // Add new transfer
  const addTransfer = useCallback(() => {
    setTransfers((prev) => [...prev, createEmptyTransfer()]);
  }, []);

  // Remove transfer
  const removeTransfer = useCallback((id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update transfer
  const updateTransfer = useCallback(
    (id: string, field: keyof RealEstateTransfer, value: unknown) => {
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    []
  );

  // Format number input
  const formatNumberInput = (value: string): number => {
    const num = value.replace(/[^\d]/g, '');
    return parseInt(num, 10) || 0;
  };

  // Show family relationship options
  const showRelationship = (transfer: RealEstateTransfer) => {
    return (
      transfer.transferType === 'family' ||
      transfer.transferType === 'inheritance' ||
      transfer.transferType === 'gift'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          Tính thuế chuyển nhượng bất động sản
        </h2>
        <p className="text-teal-100">
          Thuế TNCN 2% và lệ phí trước bạ 0.5% trên giá trị chuyển nhượng
        </p>
      </div>

      {/* Tax rate info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          Biểu thuế chuyển nhượng BĐS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-teal-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-teal-600">
              {REAL_ESTATE_TAX_RATES.pit * 100}%
            </div>
            <div className="text-sm text-teal-700">
              Thuế TNCN trên giá chuyển nhượng
            </div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {REAL_ESTATE_TAX_RATES.registrationFee * 100}%
            </div>
            <div className="text-sm text-emerald-700">
              Lệ phí trước bạ
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Quick / Full Calculator */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowQuickCalculator(true)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showQuickCalculator
              ? 'bg-teal-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tính nhanh
        </button>
        <button
          onClick={() => setShowQuickCalculator(false)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !showQuickCalculator
              ? 'bg-teal-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tính chi tiết
        </button>
      </div>

      {/* Quick Calculator */}
      {showQuickCalculator && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Tính nhanh thuế chuyển nhượng
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá trị chuyển nhượng (VNĐ)
              </label>
              <input
                type="text"
                value={quickValue > 0 ? quickValue.toLocaleString('vi-VN') : ''}
                onChange={(e) =>
                  setQuickValue(formatNumberInput(e.target.value))
                }
                placeholder="Nhập giá trị BĐS"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="quickExempt"
                checked={quickIsExempt}
                onChange={(e) => setQuickIsExempt(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label
                htmlFor="quickExempt"
                className="text-sm text-gray-700"
              >
                Thuộc diện miễn thuế (chuyển nhượng trong gia đình)
              </label>
            </div>

            {quickEstimate && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Giá trị BĐS:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(quickValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Thuế TNCN (2%):
                  </span>
                  <span
                    className={`font-semibold ${
                      quickIsExempt
                        ? 'text-green-600 line-through'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(
                      quickIsExempt
                        ? quickValue * REAL_ESTATE_TAX_RATES.pit
                        : quickEstimate.pit
                    )}
                    {quickIsExempt && ' (Miễn)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Lệ phí trước bạ (0.5%):
                  </span>
                  <span
                    className={`font-semibold ${
                      quickIsExempt
                        ? 'text-green-600 line-through'
                        : 'text-amber-600'
                    }`}
                  >
                    {formatCurrency(
                      quickIsExempt
                        ? quickValue * REAL_ESTATE_TAX_RATES.registrationFee
                        : quickEstimate.registrationFee
                    )}
                    {quickIsExempt && ' (Miễn)'}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="text-gray-800 font-medium">
                    Tổng thuế và phí:
                  </span>
                  <span className="text-xl font-bold text-teal-600">
                    {formatCurrency(quickEstimate.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Số tiền thực nhận:
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(quickEstimate.netProceeds)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Calculator */}
      {!showQuickCalculator && (
        <>
          {/* Transfer list */}
          <div className="space-y-4">
            {transfers.map((transfer, index) => (
              <div
                key={transfer.id}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Giao dịch #{index + 1}
                  </h3>
                  {transfers.length > 1 && (
                    <button
                      onClick={() => removeTransfer(transfer.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Property type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại bất động sản
                    </label>
                    <select
                      value={transfer.propertyType}
                      onChange={(e) =>
                        updateTransfer(
                          transfer.id,
                          'propertyType',
                          e.target.value as RealEstateType
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500"
                    >
                      {Object.entries(PROPERTY_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Transfer type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hình thức chuyển nhượng
                    </label>
                    <select
                      value={transfer.transferType}
                      onChange={(e) =>
                        updateTransfer(
                          transfer.id,
                          'transferType',
                          e.target.value as TransferType
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500"
                    >
                      {Object.entries(TRANSFER_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Relationship (conditional) */}
                  {showRelationship(transfer) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quan hệ gia đình
                      </label>
                      <select
                        value={transfer.relationship || 'none'}
                        onChange={(e) =>
                          updateTransfer(
                            transfer.id,
                            'relationship',
                            e.target.value as FamilyRelationship
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500"
                      >
                        {Object.entries(FAMILY_RELATIONSHIP_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}

                  {/* Transfer value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá chuyển nhượng (VNĐ)
                    </label>
                    <input
                      type="text"
                      value={
                        transfer.transferValue > 0
                          ? transfer.transferValue.toLocaleString('vi-VN')
                          : ''
                      }
                      onChange={(e) =>
                        updateTransfer(
                          transfer.id,
                          'transferValue',
                          formatNumberInput(e.target.value)
                        )
                      }
                      placeholder="Nhập giá chuyển nhượng"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Land area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Diện tích đất (m²)
                    </label>
                    <input
                      type="number"
                      value={transfer.landArea || ''}
                      onChange={(e) =>
                        updateTransfer(
                          transfer.id,
                          'landArea',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="Nhập diện tích"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Building area (for houses/apartments) */}
                  {(transfer.propertyType === 'house' ||
                    transfer.propertyType === 'apartment' ||
                    transfer.propertyType === 'land_house') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Diện tích xây dựng (m²)
                      </label>
                      <input
                        type="number"
                        value={transfer.buildingArea || ''}
                        onChange={(e) =>
                          updateTransfer(
                            transfer.id,
                            'buildingArea',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="Nhập diện tích xây dựng"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  )}

                  {/* Transfer date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày chuyển nhượng
                    </label>
                    <input
                      type="date"
                      value={transfer.transferDate}
                      onChange={(e) =>
                        updateTransfer(
                          transfer.id,
                          'transferDate',
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Purchase value (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá mua ban đầu (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={
                        transfer.purchaseValue
                          ? transfer.purchaseValue.toLocaleString('vi-VN')
                          : ''
                      }
                      onChange={(e) =>
                        updateTransfer(
                          transfer.id,
                          'purchaseValue',
                          formatNumberInput(e.target.value)
                        )
                      }
                      placeholder="Để tính lợi nhuận tham khảo"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Property address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ bất động sản
                    </label>
                    <input
                      type="text"
                      value={transfer.propertyAddress}
                      onChange={(e) =>
                        updateTransfer(
                          transfer.id,
                          'propertyAddress',
                          e.target.value
                        )
                      }
                      placeholder="Nhập địa chỉ BĐS"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add transfer button */}
          <button
            onClick={addTransfer}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
          >
            + Thêm giao dịch
          </button>

          {/* Results */}
          {result && (
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Kết quả tính thuế
              </h3>

              {/* Per-transfer results */}
              {result.transfers.map((tr, i) => (
                <div
                  key={tr.id}
                  className="bg-white rounded-lg p-4 mb-4"
                >
                  <div className="font-medium text-gray-900 mb-2">
                    Giao dịch #{i + 1}: {PROPERTY_TYPE_LABELS[tr.propertyType]}
                  </div>

                  {tr.isExempt && (
                    <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg mb-3 text-sm">
                      ✓ {tr.exemptionReason}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">
                        Giá chuyển nhượng:
                      </span>
                    </div>
                    <div className="text-right font-medium text-gray-900">
                      {formatCurrency(tr.transferValue)}
                    </div>

                    {tr.capitalGain > 0 && (
                      <>
                        <div>
                          <span className="text-gray-600">
                            Lợi nhuận tham khảo:
                          </span>
                        </div>
                        <div className="text-right font-medium text-emerald-600">
                          +{formatCurrency(tr.capitalGain)}
                        </div>
                      </>
                    )}

                    <div>
                      <span className="text-gray-600">
                        Thuế TNCN ({tr.pitRate}%):
                      </span>
                    </div>
                    <div className="text-right font-medium text-red-600">
                      {tr.isExempt ? (
                        <span className="line-through opacity-50">
                          {formatCurrency(tr.exemptionAmount)}
                        </span>
                      ) : (
                        formatCurrency(tr.pitAmount)
                      )}
                    </div>

                    <div>
                      <span className="text-gray-600">
                        Lệ phí trước bạ ({tr.registrationRate}%):
                      </span>
                    </div>
                    <div className="text-right font-medium text-amber-600">
                      {formatCurrency(tr.registrationFee)}
                    </div>

                    <div className="col-span-2 border-t border-gray-200 pt-2 mt-2 flex justify-between">
                      <span className="font-medium text-gray-900">
                        Tổng phí giao dịch:
                      </span>
                      <span className="font-bold text-teal-600">
                        {formatCurrency(tr.totalFees)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="bg-white rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Tổng hợp
                </h4>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Tổng giá trị chuyển nhượng:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(result.summary.totalTransferValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Tổng thuế TNCN:
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(result.summary.totalPIT)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Tổng lệ phí trước bạ:
                  </span>
                  <span className="font-semibold text-amber-600">
                    {formatCurrency(result.summary.totalRegistrationFee)}
                  </span>
                </div>
                {result.summary.totalExemptions > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Tổng được miễn:</span>
                    <span className="font-semibold">
                      {formatCurrency(result.summary.totalExemptions)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="text-lg font-medium text-gray-900">
                    Tổng thuế và phí:
                  </span>
                  <span className="text-2xl font-bold text-teal-600">
                    {formatCurrency(result.summary.totalFees)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Thuế suất thực tế:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {result.summary.effectiveTaxRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Số tiền thực nhận:
                  </span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatCurrency(result.summary.totalNetProceeds)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Exemption information */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <h3 className="font-semibold text-blue-800 mb-3">
          Các trường hợp được miễn thuế TNCN
        </h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li>• Chuyển nhượng giữa vợ và chồng</li>
          <li>• Chuyển nhượng giữa cha mẹ đẻ và con đẻ/con nuôi hợp pháp</li>
          <li>• Chuyển nhượng giữa anh chị em ruột</li>
          <li>• Thừa kế từ vợ/chồng, cha mẹ/con cái</li>
          <li>
            • Tặng cho giữa các thành viên gia đình (vợ chồng, cha mẹ con, anh
            chị em, ông bà cháu)
          </li>
        </ul>
      </div>

      {/* Legal reference */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Căn cứ pháp lý:</p>
        <ul className="list-disc list-inside">
          <li>Luật Thuế thu nhập cá nhân số 04/2007/QH12</li>
          <li>Thông tư 111/2013/TT-BTC hướng dẫn thuế TNCN</li>
          <li>Nghị định 10/2022/NĐ-CP về lệ phí trước bạ</li>
        </ul>
      </div>
    </div>
  );
}

export default RealEstateTransferTaxCalculator;
