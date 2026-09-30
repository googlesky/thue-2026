'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  CRYPTO_ASSETS,
  CRYPTO_TAX_CONFIG,
  calculateCryptoTax,
  formatPercent,
  getTransactionTypeLabel,
  generateTransactionId,
  getAssetByType,
  type CryptoAssetType,
  type TransactionType,
  type CryptoTransaction,
} from '@/lib/cryptoTaxCalculator';
import { formatCurrency } from '@/lib/taxCalculator';

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'buy', label: 'Mua' },
  { value: 'sell', label: 'Bán' },
  { value: 'swap', label: 'Hoán đổi' },
  { value: 'transfer', label: 'Chuyển ví' },
];

// Ngày YYYY-MM-DD theo giờ địa phương cho input type=date (không dùng toISOString - UTC)
function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
}

export default function CryptoTax() {
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'result'>('transactions');

  // Form state
  const [formData, setFormData] = useState({
    type: 'sell' as TransactionType,
    assetType: 'btc' as CryptoAssetType,
    assetName: 'Bitcoin',
    quantity: 0,
    pricePerUnit: 0,
    fee: 0,
    date: todayInput(),
    notes: '',
  });

  // Giao dịch đang nhập (dùng cho xem trước thuế và khi thêm)
  const draft: CryptoTransaction = {
    id: '',
    date: parseDateInput(formData.date),
    type: formData.type,
    assetType: formData.assetType,
    assetName: formData.assetName,
    quantity: formData.quantity,
    pricePerUnit: formData.pricePerUnit,
    totalValue: formData.quantity * formData.pricePerUnit,
    fee: formData.fee,
    notes: formData.notes || undefined,
  };
  const preview = calculateCryptoTax({ transactions: [draft] }).transactionsWithTax[0];

  // Add transaction
  const addTransaction = useCallback(() => {
    const newTransaction: CryptoTransaction = { ...draft, id: generateTransactionId() };

    setTransactions(prev => [...prev, newTransaction]);
    setShowAddForm(false);
    setFormData({
      type: 'sell',
      assetType: 'btc',
      assetName: 'Bitcoin',
      quantity: 0,
      pricePerUnit: 0,
      fee: 0,
      date: todayInput(),
      notes: '',
    });
  }, [draft]);

  // Remove transaction
  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // Calculate result
  const result = useMemo(() => {
    if (transactions.length === 0) return null;
    return calculateCryptoTax({ transactions });
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Thuế tài sản số</h2>
        <p className="opacity-90">
          Tính thuế chuyển nhượng Bitcoin, Ethereum, NFT và các tài sản số khác – 0,1% giá chuyển nhượng từ 01/7/2026
        </p>
      </div>

      {/* Tax Rate Info */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">
          Thuế suất áp dụng
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(CRYPTO_TAX_CONFIG.comparison).map(([key, config]) => (
            <div
              key={key}
              className={`p-3 rounded-lg ${
                key === 'crypto'
                  ? 'bg-orange-50 border-2 border-orange-300'
                  : 'bg-gray-50'
              }`}
            >
              <p className="text-sm text-gray-500">{config.name}</p>
              <p className={`text-xl font-bold ${
                key === 'crypto' ? 'text-orange-600' : 'text-gray-900'
              }`}>
                {formatPercent(config.rate)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Thuế tài sản số = 0,1% × giá chuyển nhượng từng lần (bán, hoán đổi) từ 01/7/2026, không phân
          biệt lãi/lỗ – Luật Thuế TNCN số 109/2025/QH15 Điều 19 khoản 2. Vàng miếng: luật định 0,1% nhưng
          hiện chưa thu.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'transactions'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Giao dịch ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('result')}
          disabled={!result}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'result'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-50'
          }`}
        >
          Kết quả tính thuế
        </button>
      </div>

      {activeTab === 'transactions' && (
        <>
          {/* Add Transaction Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              + Thêm giao dịch
            </button>
          )}

          {/* Add Transaction Form */}
          {showAddForm && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Thêm giao dịch mới
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transaction Type */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Loại giao dịch
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TRANSACTION_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setFormData(prev => ({ ...prev, type: t.value }))}
                        className={`p-2 min-h-[44px] rounded-lg text-center text-sm transition-colors ${
                          formData.type === t.value
                            ? 'bg-orange-100 border-2 border-orange-500'
                            : 'bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asset Type */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Loại tài sản
                  </label>
                  <select
                    value={formData.assetType}
                    onChange={e => {
                      const asset = getAssetByType(e.target.value as CryptoAssetType);
                      setFormData(prev => ({
                        ...prev,
                        assetType: e.target.value as CryptoAssetType,
                        assetName: asset?.name || e.target.value,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  >
                    {CRYPTO_ASSETS.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Ngày giao dịch
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.quantity || ''}
                    onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>

                {/* Price per unit */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Giá mỗi đơn vị (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.pricePerUnit || ''}
                    onChange={e => setFormData(prev => ({ ...prev, pricePerUnit: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>

                {/* Fee */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Phí giao dịch (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.fee || ''}
                    onChange={e => setFormData(prev => ({ ...prev, fee: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-500 mb-1">
                    Ghi chú (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="VD: Bán lấy lãi, chuyển sàn..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Total Value */}
              {formData.quantity > 0 && formData.pricePerUnit > 0 && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Giá trị giao dịch:</span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatCurrency(formData.quantity * formData.pricePerUnit)}
                    </span>
                  </div>
                  {preview.isTaxable ? (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-orange-200">
                      <span className="text-gray-700">Thuế dự kiến (0,1%):</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(preview.taxAmount)}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 pt-2 border-t border-orange-200 text-sm text-gray-600">{preview.taxNote}</p>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={addTransaction}
                  disabled={formData.quantity <= 0 || formData.pricePerUnit <= 0}
                  className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
                >
                  Thêm giao dịch
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Transaction List */}
          {transactions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">
                  Danh sách giao dịch
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {(result?.transactionsWithTax ?? []).map(tx => {
                  return (
                    <div key={tx.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              tx.type === 'buy' ? 'bg-green-100 text-green-700' :
                              tx.type === 'sell' ? 'bg-red-100 text-red-700' :
                              tx.type === 'swap' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {getTransactionTypeLabel(tx.type)}
                            </span>
                            <span className="font-medium text-gray-900">
                              {tx.quantity} {tx.assetName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {tx.date.toLocaleDateString('vi-VN')} • {formatCurrency(tx.totalValue)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {tx.isTaxable && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Thuế</p>
                            <p className="font-medium text-red-600">{formatCurrency(tx.taxAmount)}</p>
                          </div>
                        )}
                        <button
                          onClick={() => removeTransaction(tx.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Xóa"
                          aria-label="Xóa giao dịch"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Summary */}
          {result && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tổng mua</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(result.totalBuyValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tổng bán/swap</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(result.totalSellValue + result.totalSwapValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">GD chịu thuế</p>
                  <p className="text-lg font-bold text-gray-900">
                    {result.totalTaxableTransactions}/{result.totalTransactions}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tổng thuế</p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(result.totalTax)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('result')}
                className="mt-4 w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
              >
                Xem chi tiết kết quả
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'result' && result && (
        <>
          {/* Result Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">
              Kết quả tính thuế
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Giá trị chịu thuế</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(result.totalTaxableValue)}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-500">Tổng thuế phải nộp</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(result.totalTax)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Thuế / giá chuyển nhượng</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercent(result.effectiveTaxRate / 100)}
                </p>
              </div>
            </div>
          </div>

          {/* Tax by Asset */}
          {result.taxByAsset.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Thuế theo loại tài sản
              </h3>
              <div className="space-y-3">
                {result.taxByAsset.map(item => {
                  return (
                    <div key={item.assetType} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{item.assetName}</p>
                          <p className="text-sm text-gray-500">
                            {item.transactionCount} giao dịch • {formatCurrency(item.totalValue)}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-orange-600">{formatCurrency(item.taxAmount)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tax Comparison */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">
              So sánh với các loại tài sản khác
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500">Loại tài sản</th>
                    <th className="text-right py-2 text-gray-500">Thuế suất</th>
                    <th className="text-right py-2 text-gray-500">Số thuế</th>
                  </tr>
                </thead>
                <tbody>
                  {result.taxComparison.map(item => (
                    <tr key={item.asset} className={`border-b border-gray-100 ${
                      item.asset === 'Tài sản số' ? 'bg-orange-50' : ''
                    }`}>
                      <td className="py-3 font-medium text-gray-900">
                        {item.asset}
                      </td>
                      <td className="py-3 text-right text-gray-700">
                        {formatPercent(item.rate)}
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.taxAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legal Reference */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <h4 className="font-medium text-gray-900 mb-2">Căn cứ pháp lý</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Luật Thuế TNCN số 109/2025/QH15: Điều 3 khoản 10 điểm d; Điều 19 khoản 2 (cá nhân cư trú),
                Điều 27 khoản 2 (cá nhân không cư trú) – 0,1% × giá chuyển nhượng từng lần, từ 01/7/2026.
              </li>
              <li>
                Nghị định 253/2026/NĐ-CP: Điều 16 khoản 4 (tài sản ảo, tài sản mã hóa, tài sản số khác), Điều 62
                khoản 2.
              </li>
              <li>
                Thông tư 32/2026/TT-BTC (từ 27/3/2026): 0,1% cho giao dịch qua tổ chức cung cấp dịch vụ tài sản
                mã hóa được cấp phép thí điểm theo Nghị quyết 05/2025/NQ-CP.
              </li>
              <li>Hoán đổi tài sản số được tính như chuyển nhượng; chuyển ví của chính mình không chịu thuế.</li>
              <li>Luật Công nghiệp công nghệ số (hiệu lực 01/01/2026): khái niệm tài sản số.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
