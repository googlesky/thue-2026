'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  GOLD_TAX_CONFIG,
  GOLD_CLASSIFICATIONS,
  COMMON_WEIGHTS,
  calculateGoldTax,
  calculateGoldTransactionTax,
  calculateTotalValue,
  generateGoldTransactionId,
  formatWeight,
  type GoldClassification,
  type GoldTransactionType,
  type GoldWeightUnit,
  type GoldTransaction,
  type GoldTaxInput,
} from '@/lib/goldTaxCalculator';
import {
  GOLD_TYPE_NAMES,
  POPULAR_GOLD_TYPES,
  formatGoldPrice,
  getChangeInfo,
  type GoldTypeCode,
  type GoldPrice,
} from '@/lib/goldPriceService';
import { useGoldPrice } from '@/hooks/useGoldPrice';

// Gold type options for the form
const GOLD_TYPE_OPTIONS: { code: GoldTypeCode; name: string }[] = POPULAR_GOLD_TYPES
  .filter(c => c !== 'XAUUSD')
  .map(code => ({ code, name: GOLD_TYPE_NAMES[code] }));

const TRANSACTION_TYPES: { value: GoldTransactionType; label: string }[] = [
  { value: 'buy', label: 'Mua' },
  { value: 'sell', label: 'Bán' },
];

const WEIGHT_UNITS: { value: GoldWeightUnit; label: string }[] = [
  { value: 'luong', label: 'Lượng' },
  { value: 'chi', label: 'Chỉ' },
  { value: 'gram', label: 'Gram' },
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

// Số thập phân kiểu Việt Nam: 0,1 / 2,5
const formatDecimal = (value: number, digits = 1) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: digits });

// Mã giá nhẫn tròn trơn (không phải vàng miếng)
const isRingCode = (code: string) => /9999|NTT|NHTV/.test(code);

// Ngày YYYY-MM-DD theo giờ địa phương cho input type=date (không dùng toISOString - UTC)
function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
}

export default function GoldTaxCalculator() {
  const { prices, isLoading: priceLoading, error: priceError, lastUpdated, refresh } = useGoldPrice();
  const [transactions, setTransactions] = useState<GoldTransaction[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeView, setActiveView] = useState<'prices' | 'transactions' | 'result'>('prices');
  const [expandedPrice, setExpandedPrice] = useState<GoldTypeCode | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'sell' as GoldTransactionType,
    classification: 'bar' as GoldClassification,
    goldTypeCode: 'SJL1L10' as GoldTypeCode,
    weight: 1,
    weightUnit: 'luong' as GoldWeightUnit,
    pricePerLuong: 0,
    useMarketPrice: true,
    date: todayInput(),
    notes: '',
  });

  // Auto-fill price from market
  const marketPrice = useMemo(() => {
    const price = prices.find(p => p.typeCode === formData.goldTypeCode);
    if (!price) return null;
    return formData.type === 'buy' ? price.sell : price.buy; // Buy at sell price, sell at buy price
  }, [prices, formData.goldTypeCode, formData.type]);

  const effectivePrice = formData.useMarketPrice && marketPrice ? marketPrice : formData.pricePerLuong;
  const totalValue = useMemo(
    () => calculateTotalValue(formData.weight, formData.weightUnit, effectivePrice),
    [formData.weight, formData.weightUnit, effectivePrice]
  );

  // Xem trước thuế của giao dịch đang nhập (cùng logic với bảng kết quả)
  const preview = calculateGoldTransactionTax({
    id: '',
    date: new Date(),
    type: formData.type,
    classification: formData.classification,
    goldTypeName: '',
    weight: formData.weight,
    weightUnit: formData.weightUnit,
    pricePerLuong: effectivePrice,
    totalValue,
  });

  // Add transaction
  const addTransaction = useCallback(() => {
    if (formData.weight <= 0 || effectivePrice <= 0) return;

    const newTx: GoldTransaction = {
      id: generateGoldTransactionId(),
      date: parseDateInput(formData.date),
      type: formData.type,
      classification: formData.classification,
      goldTypeCode: formData.goldTypeCode,
      goldTypeName: GOLD_TYPE_NAMES[formData.goldTypeCode] || formData.goldTypeCode,
      weight: formData.weight,
      weightUnit: formData.weightUnit,
      pricePerLuong: effectivePrice,
      totalValue,
      notes: formData.notes || undefined,
    };

    setTransactions(prev => [...prev, newTx]);
    setShowAddForm(false);
    // Reset form but keep some defaults
    setFormData(prev => ({
      ...prev,
      weight: 1,
      pricePerLuong: 0,
      notes: '',
    }));
  }, [formData, effectivePrice, totalValue]);

  // Remove transaction
  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // Quick add from price card
  const quickAddSell = useCallback((price: GoldPrice) => {
    setFormData({
      type: 'sell',
      classification: isRingCode(price.typeCode) ? 'ring' : 'bar',
      goldTypeCode: price.typeCode,
      weight: 1,
      weightUnit: 'luong',
      pricePerLuong: price.buy,
      useMarketPrice: true,
      date: todayInput(),
      notes: '',
    });
    setShowAddForm(true);
    setActiveView('transactions');
  }, []);

  // Calculate result
  const result = useMemo(() => {
    if (transactions.length === 0) return null;
    const input: GoldTaxInput = { transactions };
    return calculateGoldTax(input);
  }, [transactions]);

  // World gold price
  const worldGold = prices.find(p => p.typeCode === 'XAUUSD');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Thuế vàng miếng</h2>
            <p className="opacity-90">
              Thuế chuyển nhượng vàng miếng 0,1% theo Luật 109/2025/QH15 – hiện chưa thu
            </p>
          </div>
          {worldGold && (
            <div className="text-right hidden sm:block">
              <p className="text-sm opacity-80">XAUUSD</p>
              <p className="text-xl font-bold">{formatGoldPrice(worldGold.buy || worldGold.sell, 'USD')}</p>
              <p className={`text-sm ${worldGold.changeBuy >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {getChangeInfo(worldGold.changeBuy).arrow} {getChangeInfo(worldGold.changeBuy).text}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trạng thái pháp lý: luật đã quy định nhưng chưa thu */}
      <div className="card flex flex-col sm:flex-row sm:items-start gap-3">
        <span className="stamp stamp-flat self-start">Chưa thu thuế</span>
        <p className="text-sm text-gray-700 min-w-0">
          Luật Thuế TNCN số 109/2025/QH15 (Điều 3 khoản 10 điểm đ, Điều 19 khoản 2) đưa thu nhập từ
          chuyển nhượng vàng miếng vào diện chịu thuế 0,1% trên giá chuyển nhượng, nhưng giao Chính phủ
          quy định ngưỡng giá trị chịu thuế và thời điểm bắt đầu thu. Nghị định 253/2026/NĐ-CP chưa quy
          định nội dung này; ngày 30/6/2026 Bộ Tài chính xác nhận chưa thu thuế chuyển nhượng vàng miếng.
          Các số &ldquo;0,1%&rdquo; trên trang chỉ để ước tính.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'prices' as const, label: 'Giá vàng', count: prices.length },
          { id: 'transactions' as const, label: 'Giao dịch', count: transactions.length },
          { id: 'result' as const, label: 'Kết quả', count: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            disabled={tab.id === 'result' && !result}
            className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${
              activeView === tab.id
                ? 'border-yellow-600 text-yellow-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-50'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* === PRICES VIEW === */}
      {activeView === 'prices' && (
        <div className="space-y-4">
          {/* Refresh bar */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {lastUpdated
                ? `Cập nhật: ${lastUpdated.toLocaleTimeString('vi-VN')}`
                : 'Đang tải...'}
            </span>
            <button
              onClick={refresh}
              disabled={priceLoading}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <span className={priceLoading ? 'animate-spin' : ''}>↻</span>
              Làm mới
            </button>
          </div>

          {priceError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {priceError}
            </div>
          )}

          {/* Price Cards */}
          {priceLoading && prices.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="flex gap-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4" />
                    <div className="h-8 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prices.filter(p => p.typeCode !== 'XAUUSD').map(price => {
                const buyChange = getChangeInfo(price.changeBuy);
                const sellChange = getChangeInfo(price.changeSell);
                const isExpanded = expandedPrice === price.typeCode;

                return (
                  <div
                    key={price.typeCode}
                    className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Price header */}
                    <button
                      onClick={() => setExpandedPrice(isExpanded ? null : price.typeCode)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {price.typeName}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {new Date(price.updateTime * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Mua vào</p>
                          <p className="text-base font-bold text-gray-900">
                            {formatVND(price.buy)}
                          </p>
                          <p className={`text-xs ${buyChange.color}`}>
                            {buyChange.arrow} {buyChange.text}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Bán ra</p>
                          <p className="text-base font-bold text-gray-900">
                            {formatVND(price.sell)}
                          </p>
                          <p className={`text-xs ${sellChange.color}`}>
                            {sellChange.arrow} {sellChange.text}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded: quick tax estimate + add button */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                        <div className="mt-3 space-y-2">
                          {/* Ước tính giả định nếu áp dụng 0,1% (hiện chưa thu) */}
                          {isRingCode(price.typeCode) ? (
                            <p className="text-xs text-gray-500">
                              Nhẫn tròn trơn không phải vàng miếng – không thuộc diện thuế chuyển nhượng vàng miếng.
                            </p>
                          ) : (
                            <>
                              <p className="text-xs text-gray-500">Chưa thu thuế – ước tính nếu áp dụng 0,1%:</p>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                {[1, 5, 10].map(luong => {
                                  const tax = Math.round(price.buy * luong * GOLD_TAX_CONFIG.transferRate);
                                  return (
                                    <div key={luong} className="bg-yellow-50 rounded-lg p-2">
                                      <p className="text-xs text-gray-500">Bán {luong}L</p>
                                      <p className="text-xs font-semibold text-yellow-700">
                                        {formatVND(tax)} đ
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                          <button
                            onClick={() => quickAddSell(price)}
                            className="w-full py-2 text-sm font-medium bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                          >
                            + Thêm giao dịch bán
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* World gold price */}
          {worldGold && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Vàng thế giới (XAUUSD)</h3>
                  <p className="text-sm text-gray-500">Giá tham khảo quốc tế (USD/oz)</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {formatGoldPrice(worldGold.buy || worldGold.sell, 'USD')}
                  </p>
                  <p className={`text-sm ${getChangeInfo(worldGold.changeBuy).color}`}>
                    {getChangeInfo(worldGold.changeBuy).arrow} {getChangeInfo(worldGold.changeBuy).text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tax rate info */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Thuế suất chuyển nhượng vàng</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(GOLD_TAX_CONFIG.comparison).map(([key, config]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg ${
                    key === 'gold'
                      ? 'bg-yellow-50 border-2 border-yellow-300'
                      : 'bg-gray-50'
                  }`}
                >
                  <p className="text-xs text-gray-500">{config.name}</p>
                  <p className={`text-lg font-bold ${
                    key === 'gold' ? 'text-yellow-700' : 'text-gray-900'
                  }`}>
                    {formatDecimal(config.rate * 100)}%
                  </p>
                </div>
              ))}
            </div>

            {/* Gold type taxable info */}
            <div className="mt-4 space-y-2">
              {GOLD_CLASSIFICATIONS.map(cls => (
                <div
                  key={cls.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    cls.isTaxable ? 'bg-yellow-50' : 'bg-gray-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    cls.isTaxable ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{cls.name}</p>
                    <p className="text-xs text-gray-500">{cls.taxNote}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === TRANSACTIONS VIEW === */}
      {activeView === 'transactions' && (
        <div className="space-y-4">
          {/* Add button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-yellow-500 hover:text-yellow-600 transition-colors"
            >
              + Thêm giao dịch
            </button>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Thêm giao dịch vàng</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transaction type */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Loại giao dịch</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSACTION_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setFormData(prev => ({ ...prev, type: t.value }))}
                        className={`p-2.5 rounded-lg text-center text-sm font-medium transition-colors ${
                          formData.type === t.value
                            ? 'bg-yellow-100 border-2 border-yellow-500'
                            : 'bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gold classification */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Phân loại vàng</label>
                  <select
                    value={formData.classification}
                    onChange={e => setFormData(prev => ({ ...prev, classification: e.target.value as GoldClassification }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  >
                    {GOLD_CLASSIFICATIONS.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.isTaxable ? '' : '(không thuộc diện thuế)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gold type */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Thương hiệu vàng</label>
                  <select
                    value={formData.goldTypeCode}
                    onChange={e => {
                      const code = e.target.value as GoldTypeCode;
                      // Mã nhẫn tròn trơn -> phân loại nhẫn; đổi sang mã vàng miếng thì bỏ phân loại nhẫn
                      setFormData(prev => ({
                        ...prev,
                        goldTypeCode: code,
                        classification: isRingCode(code) ? 'ring' : prev.classification === 'ring' ? 'bar' : prev.classification,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  >
                    {GOLD_TYPE_OPTIONS.map(opt => (
                      <option key={opt.code} value={opt.code}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Ngày giao dịch</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Khối lượng</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.weight || ''}
                      onChange={e => setFormData(prev => ({ ...prev, weight: Number(e.target.value) || 0 }))}
                      placeholder="1"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                    <select
                      value={formData.weightUnit}
                      onChange={e => setFormData(prev => ({ ...prev, weightUnit: e.target.value as GoldWeightUnit }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    >
                      {WEIGHT_UNITS.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Quick weight buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {COMMON_WEIGHTS.map(w => (
                      <button
                        key={w.label}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          weight: w.value,
                          weightUnit: w.unit,
                        }))}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          formData.weight === w.value && formData.weightUnit === w.unit
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Giá mỗi lượng (VND)</label>
                  <div className="space-y-2">
                    {marketPrice ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.useMarketPrice}
                          onChange={e => setFormData(prev => ({ ...prev, useMarketPrice: e.target.checked }))}
                          className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                        />
                        <span>
                          Dùng giá thị trường ({formatVND(marketPrice)} đ/lượng)
                        </span>
                      </label>
                    ) : null}
                    {(!formData.useMarketPrice || !marketPrice) && (
                      <input
                        type="text"
                        value={formData.pricePerLuong ? formatVND(formData.pricePerLuong) : ''}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^\d]/g, '');
                          setFormData(prev => ({ ...prev, pricePerLuong: parseInt(digits) || 0 }));
                        }}
                        placeholder="Nhập giá mỗi lượng"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      />
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-500 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ghi chú (tùy chọn)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Preview */}
              {effectivePrice > 0 && formData.weight > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {formData.type === 'buy' ? 'Mua' : 'Bán'}{' '}
                    {formatWeight(formData.weight, formData.weightUnit)}{' '}
                    {GOLD_TYPE_NAMES[formData.goldTypeCode]}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatVND(totalValue)} đ
                  </p>
                  {formData.type === 'sell' && (
                    <div className="mt-2 pt-2 border-t border-yellow-200 text-sm text-gray-700">
                      Thuế phải nộp: <span className="font-bold text-yellow-700">{formatVND(preview.taxAmount)} đ</span>
                      <p className="text-xs text-gray-500 mt-0.5">{preview.taxNote}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Form actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={addTransaction}
                  disabled={formData.weight <= 0 || effectivePrice <= 0}
                  className="flex-1 py-2.5 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Thêm giao dịch
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Transaction list */}
          {transactions.length === 0 && !showAddForm ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">Chưa có giao dịch</p>
              <p className="text-sm mt-1">Thêm giao dịch mua/bán vàng để tính thuế</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(result?.transactionsWithTax ?? []).map(tx => (
                <div
                  key={tx.id}
                  className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {tx.type === 'buy' ? 'Mua' : 'Bán'} {formatWeight(tx.weight, tx.weightUnit)}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {tx.goldTypeName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tx.date.toLocaleDateString('vi-VN')} · {formatVND(tx.pricePerLuong)} đ/lượng
                    </p>
                    {tx.type === 'sell' && (
                      <p className="text-xs text-yellow-700 mt-0.5">{tx.taxNote}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{formatVND(tx.totalValue)} đ</p>
                    {tx.isTaxable && (
                      <p className="text-xs text-yellow-700">Thuế: {formatVND(tx.taxAmount)} đ</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeTransaction(tx.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Xóa"
                    aria-label="Xóa giao dịch"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Navigate to result */}
          {transactions.length > 0 && (
            <button
              onClick={() => setActiveView('result')}
              className="w-full py-3 bg-yellow-600 text-white font-medium rounded-xl hover:bg-yellow-700 transition-colors"
            >
              Xem kết quả tính thuế →
            </button>
          )}
        </div>
      )}

      {/* === RESULT VIEW === */}
      {activeView === 'result' && result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500">Tổng mua</p>
              <p className="text-lg font-bold text-green-600">
                {formatVND(result.totalBuyValue)} đ
              </p>
              <p className="text-xs text-gray-400">{formatDecimal(result.totalBuyWeight, 2)} lượng</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500">Tổng bán</p>
              <p className="text-lg font-bold text-red-600">
                {formatVND(result.totalSellValue)} đ
              </p>
              <p className="text-xs text-gray-400">{formatDecimal(result.totalSellWeight, 2)} lượng</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-200">
              <p className="text-xs text-yellow-700">Thuế phải nộp</p>
              <p className="text-xl font-bold text-yellow-700">
                {formatVND(result.totalTax)} đ
              </p>
              {GOLD_TAX_CONFIG.collected ? (
                <p className="text-xs text-yellow-600">
                  {result.totalTaxableTransactions}/{result.totalTransactions} GD chịu thuế
                </p>
              ) : (
                <p className="text-xs text-yellow-600">
                  Chưa thu thuế
                  <span className="block">Nếu áp dụng 0,1%: {formatVND(result.totalStatutoryTax)} đ</span>
                </p>
              )}
            </div>
            {result.estimatedProfitLoss !== null && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Lãi/lỗ ước tính</p>
                <p className={`text-lg font-bold ${
                  result.estimatedProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.estimatedProfitLoss >= 0 ? '+' : ''}{formatVND(result.estimatedProfitLoss)} đ
                </p>
                <p className="text-xs text-gray-400">Sau thuế: {formatVND(result.estimatedProfitLoss - result.totalTax)} đ</p>
              </div>
            )}
          </div>

          {/* Tax breakdown by gold type */}
          {result.taxByGoldType.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Chi tiết theo loại vàng</h3>
              <div className="space-y-2">
                {result.taxByGoldType.map(item => (
                  <div key={item.goldTypeName} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{item.goldTypeName}</p>
                      <p className="text-xs text-gray-500">{item.transactionCount} giao dịch</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatVND(item.totalValue)} đ</p>
                      <p className="text-xs text-yellow-700">
                        {GOLD_TAX_CONFIG.collected
                          ? `Thuế: ${formatVND(item.taxAmount)} đ`
                          : `Nếu áp dụng 0,1%: ${formatVND(item.statutoryTax)} đ`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tax comparison */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">So sánh thuế suất (trên giá trị bán vàng miếng)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {result.taxComparison.map(cmp => (
                <div
                  key={cmp.label}
                  className={`p-3 rounded-lg ${
                    cmp.label === 'Vàng'
                      ? 'bg-yellow-50 border-2 border-yellow-300'
                      : 'bg-gray-50'
                  }`}
                >
                  <p className="text-xs text-gray-500">{cmp.asset}</p>
                  <p className={`text-base font-bold ${
                    cmp.label === 'Vàng' ? 'text-yellow-700' : 'text-gray-900'
                  }`}>
                    {formatDecimal(cmp.rate * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">{formatVND(cmp.taxAmount)} đ</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detail transactions */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Chi tiết giao dịch</h3>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b">
                    <th className="text-left py-2 pr-2">Ngày</th>
                    <th className="text-left py-2 pr-2">Loại</th>
                    <th className="text-left py-2 pr-2">Vàng</th>
                    <th className="text-right py-2 pr-2">KL</th>
                    <th className="text-right py-2 pr-2">Giá trị</th>
                    <th className="text-right py-2">Thuế</th>
                  </tr>
                </thead>
                <tbody>
                  {result.transactionsWithTax.map(tx => (
                    <tr key={tx.id} className="border-b border-gray-50">
                      <td className="py-2 pr-2 text-gray-600 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td className="py-2 pr-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          tx.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.type === 'buy' ? 'Mua' : 'Bán'}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-gray-900 whitespace-nowrap">{tx.goldTypeName}</td>
                      <td className="py-2 pr-2 text-right text-gray-600 whitespace-nowrap">
                        {formatDecimal(tx.weightInLuong, 2)}L
                      </td>
                      <td className="py-2 pr-2 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatVND(tx.totalValue)}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap" title={tx.taxNote}>
                        {tx.isTaxable ? (
                          <>
                            <span className="font-medium text-yellow-700">{formatVND(tx.taxAmount)}</span>
                            {!GOLD_TAX_CONFIG.collected && (
                              <span className="block text-[11px] text-gray-400">0,1%: {formatVND(tx.statutoryTax)}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t-2 border-gray-200">
                    <td colSpan={4} className="py-2 text-right text-gray-700">Tổng cộng</td>
                    <td className="py-2 text-right text-gray-900">
                      {formatVND(result.totalBuyValue + result.totalSellValue)}
                    </td>
                    <td className="py-2 text-right text-yellow-700">{formatVND(result.totalTax)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Legal note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-semibold text-amber-800 text-sm mb-2">Lưu ý pháp lý</h4>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• Luật Thuế TNCN số 109/2025/QH15 (hiệu lực 01/7/2026) quy định thu nhập từ chuyển nhượng vàng miếng chịu thuế 0,1% trên giá chuyển nhượng từng lần (Điều 3 khoản 10 điểm đ, Điều 19 khoản 2).</li>
              <li>• Luật giao Chính phủ quy định ngưỡng giá trị vàng miếng chịu thuế và thời điểm áp dụng thu. Nghị định 253/2026/NĐ-CP chưa quy định; Bộ Tài chính (30/6/2026) xác nhận chưa thu thuế, đang xây dựng nghị định riêng. Hiện số thuế phải nộp là 0 đ.</li>
              <li>• Chỉ áp dụng cho vàng miếng; nhẫn tròn trơn và vàng trang sức, mỹ nghệ không phải vàng miếng.</li>
              <li>• Thuế tính trên giá chuyển nhượng, không phân biệt lãi hay lỗ; người mua không chịu thuế.</li>
              <li>• Kết quả chỉ mang tính tham khảo, vui lòng liên hệ cơ quan thuế để được tư vấn chính xác.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
