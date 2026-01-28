'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  CRYPTO_ASSETS,
  CRYPTO_TAX_CONFIG,
  calculateCryptoTax,
  formatCurrency,
  formatPercent,
  getTransactionTypeLabel,
  generateTransactionId,
  getAssetByType,
  type CryptoAssetType,
  type TransactionType,
  type CryptoTransaction,
  type CryptoTaxInput,
} from '@/lib/cryptoTaxCalculator';

interface CryptoTaxProps {
  year?: number;
  onYearChange?: (year: number) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [2025, 2026, 2027];

const TRANSACTION_TYPES: { value: TransactionType; label: string; icon: string }[] = [
  { value: 'buy', label: 'Mua', icon: '📥' },
  { value: 'sell', label: 'Bán', icon: '📤' },
  { value: 'swap', label: 'Hoán đổi', icon: '🔄' },
  { value: 'transfer', label: 'Chuyển ví', icon: '➡️' },
];

export default function CryptoTax({
  year: externalYear,
  onYearChange,
}: CryptoTaxProps) {
  const [internalYear, setInternalYear] = useState(CURRENT_YEAR >= 2026 ? 2026 : 2025);
  const year = externalYear ?? internalYear;

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
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Handle year change
  const handleYearChange = useCallback((newYear: number) => {
    if (onYearChange) {
      onYearChange(newYear);
    } else {
      setInternalYear(newYear);
    }
  }, [onYearChange]);

  // Add transaction
  const addTransaction = useCallback(() => {
    const totalValue = formData.quantity * formData.pricePerUnit;
    const newTransaction: CryptoTransaction = {
      id: generateTransactionId(),
      date: new Date(formData.date),
      type: formData.type,
      assetType: formData.assetType,
      assetName: formData.assetName,
      quantity: formData.quantity,
      pricePerUnit: formData.pricePerUnit,
      totalValue,
      fee: formData.fee,
      notes: formData.notes || undefined,
    };

    setTransactions(prev => [...prev, newTransaction]);
    setShowAddForm(false);
    setFormData({
      type: 'sell',
      assetType: 'btc',
      assetName: 'Bitcoin',
      quantity: 0,
      pricePerUnit: 0,
      fee: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  }, [formData]);

  // Remove transaction
  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // Calculate result
  const result = useMemo(() => {
    if (transactions.length === 0) return null;
    const input: CryptoTaxInput = { year, transactions };
    return calculateCryptoTax(input);
  }, [year, transactions]);

  // Check if law is effective
  const isLawEffective = year >= 2026;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Thuế Tài sản số</h2>
        <p className="opacity-90">
          Tính thuế chuyển nhượng Bitcoin, Ethereum, NFT và các tài sản số khác
        </p>
      </div>

      {/* Year Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Năm tính thuế
        </label>
        <div className="flex gap-2">
          {AVAILABLE_YEARS.map(y => (
            <button
              key={y}
              onClick={() => handleYearChange(y)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                year === y
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {!isLawEffective && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Luật thuế tài sản số có hiệu lực từ <strong>1/7/2026</strong>.
              Giao dịch trước ngày này không chịu thuế theo quy định mới.
            </p>
          </div>
        )}
      </div>

      {/* Tax Rate Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Thuế suất áp dụng
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(CRYPTO_TAX_CONFIG.comparison).map(([key, config]) => (
            <div
              key={key}
              className={`p-3 rounded-lg ${
                key === 'crypto'
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700'
                  : 'bg-gray-50 dark:bg-gray-900'
              }`}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{config.name}</p>
              <p className={`text-xl font-bold ${
                key === 'crypto' ? 'text-orange-600' : 'text-gray-900 dark:text-white'
              }`}>
                {formatPercent(config.rate)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Thuế tài sản số = 0,1% × Giá trị giao dịch (tương đương chứng khoán và vàng miếng)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
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
              className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              + Thêm giao dịch
            </button>
          )}

          {/* Add Transaction Form */}
          {showAddForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Thêm giao dịch mới
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transaction Type */}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Loại giao dịch
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {TRANSACTION_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setFormData(prev => ({ ...prev, type: t.value }))}
                        className={`p-2 rounded-lg text-center transition-colors ${
                          formData.type === t.value
                            ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500'
                            : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent'
                        }`}
                      >
                        <span className="text-lg">{t.icon}</span>
                        <span className="block text-xs mt-1">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asset Type */}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {CRYPTO_ASSETS.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {asset.icon} {asset.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Ngày giao dịch
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.quantity || ''}
                    onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Price per unit */}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Giá mỗi đơn vị (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.pricePerUnit || ''}
                    onChange={e => setFormData(prev => ({ ...prev, pricePerUnit: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Fee */}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Phí giao dịch (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.fee || ''}
                    onChange={e => setFormData(prev => ({ ...prev, fee: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Ghi chú (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="VD: Bán lấy lãi, chuyển sàn..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Total Value */}
              {formData.quantity > 0 && formData.pricePerUnit > 0 && (
                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">Giá trị giao dịch:</span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatCurrency(formData.quantity * formData.pricePerUnit)}
                    </span>
                  </div>
                  {(formData.type === 'sell' || formData.type === 'swap') && isLawEffective && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
                      <span className="text-gray-700 dark:text-gray-300">Thuế dự kiến (0,1%):</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(formData.quantity * formData.pricePerUnit * 0.001)}
                      </span>
                    </div>
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
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Transaction List */}
          {transactions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Danh sách giao dịch
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {transactions.map(tx => {
                  const asset = getAssetByType(tx.assetType);
                  const isTaxable = (tx.type === 'sell' || tx.type === 'swap') && tx.date >= CRYPTO_TAX_CONFIG.effectiveDate;
                  const taxAmount = isTaxable ? tx.totalValue * CRYPTO_TAX_CONFIG.transferRate : 0;

                  return (
                    <div key={tx.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{asset?.icon || '🪙'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              tx.type === 'buy' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              tx.type === 'sell' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                              tx.type === 'swap' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {getTransactionTypeLabel(tx.type)}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {tx.quantity} {tx.assetName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {tx.date.toLocaleDateString('vi-VN')} • {formatCurrency(tx.totalValue)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isTaxable && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Thuế</p>
                            <p className="font-medium text-red-600">{formatCurrency(taxAmount)}</p>
                          </div>
                        )}
                        <button
                          onClick={() => removeTransaction(tx.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tổng mua</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(result.totalBuyValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tổng bán/swap</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(result.totalSellValue + result.totalSwapValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">GD chịu thuế</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {result.totalTaxableTransactions}/{result.totalTransactions}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tổng thuế</p>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Kết quả tính thuế năm {year}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Giá trị chịu thuế</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(result.totalTaxableValue)}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng thuế phải nộp</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(result.totalTax)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Thuế suất thực tế</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.effectiveTaxRate.toFixed(3)}%
                </p>
              </div>
            </div>
          </div>

          {/* Tax by Asset */}
          {result.taxByAsset.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Thuế theo loại tài sản
              </h3>
              <div className="space-y-3">
                {result.taxByAsset.map(item => {
                  const asset = getAssetByType(item.assetType);
                  return (
                    <div key={item.assetType} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{asset?.icon || '🪙'}</span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.assetName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              So sánh với các loại tài sản khác
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-500 dark:text-gray-400">Loại tài sản</th>
                    <th className="text-right py-2 text-gray-500 dark:text-gray-400">Thuế suất</th>
                    <th className="text-right py-2 text-gray-500 dark:text-gray-400">Số thuế</th>
                  </tr>
                </thead>
                <tbody>
                  {result.taxComparison.map(item => (
                    <tr key={item.asset} className={`border-b border-gray-100 dark:border-gray-800 ${
                      item.asset === 'Tài sản số' ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                    }`}>
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        {item.asset}
                      </td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatPercent(item.rate)}
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.taxAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legal Reference */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Căn cứ pháp lý</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Luật Thuế TNCN 2025 - Điều khoản về tài sản số</li>
              <li>Luật Công nghiệp công nghệ số (hiệu lực 1/1/2026)</li>
              <li>Nghị quyết 05/2025 về thí điểm thị trường tài sản mã hóa</li>
              <li>Thuế suất: 0,1% trên giá trị giao dịch (từ 1/7/2026)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
