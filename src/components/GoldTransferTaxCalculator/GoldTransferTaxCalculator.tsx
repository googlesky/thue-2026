'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  GoldTransaction,
  GoldTransferTaxInput,
  calculateGoldTransferTax,
  createEmptyGoldTransaction,
  isGoldTaxEffective,
  isGoldTypeTaxable,
  GOLD_TYPE_LABELS,
  GOLD_TYPE_DESCRIPTIONS,
  GOLD_UNIT_LABELS,
  TRANSACTION_TYPE_LABELS,
  REFERENCE_GOLD_PRICES,
  GOLD_TRANSFER_TAX_RATE,
  GoldType,
  GoldUnit,
  TransactionType,
} from '@/lib/goldTransferTaxCalculator';
import { EFFECTIVE_DATES } from '@/lib/taxCalculator';

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function GoldTransferTaxCalculator() {
  const [transactions, setTransactions] = useState<GoldTransaction[]>([
    createEmptyGoldTransaction(),
  ]);
  const [calculationDate, setCalculationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Calculate tax
  const input: GoldTransferTaxInput = useMemo(
    () => ({
      transactions,
      calculationDate: new Date(calculationDate),
    }),
    [transactions, calculationDate]
  );

  const result = useMemo(() => calculateGoldTransferTax(input), [input]);

  // Add transaction
  const addTransaction = useCallback(() => {
    setTransactions((prev) => [...prev, createEmptyGoldTransaction()]);
  }, []);

  // Remove transaction
  const removeTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update transaction
  const updateTransaction = useCallback(
    (id: string, updates: Partial<GoldTransaction>) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    },
    []
  );

  // Check if law is effective
  const isEffective = isGoldTaxEffective(new Date(calculationDate));
  const effectiveDate = EFFECTIVE_DATES.GOLD_TRANSFER_TAX_2026;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🪙</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Thuế chuyển nhượng vàng miếng
            </h2>
            <p className="text-gray-600 text-sm">
              Tính thuế TNCN khi chuyển nhượng vàng miếng SJC và các loại vàng miếng khác.
              Thuế suất 0.1% trên giá trị chuyển nhượng, có hiệu lực từ {formatDate(effectiveDate)}.
            </p>
          </div>
        </div>

        {/* Law effective status */}
        <div className={`mt-4 p-4 rounded-xl ${
          isEffective
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isEffective ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className={`font-medium ${isEffective ? 'text-green-800' : 'text-amber-800'}`}>
              {isEffective
                ? 'Luật đã có hiệu lực - Thuế áp dụng cho giao dịch bán vàng miếng'
                : `Luật chưa có hiệu lực - Sẽ áp dụng từ ${formatDate(effectiveDate)}`
              }
            </span>
          </div>
          {!isEffective && (
            <p className="mt-2 text-sm text-amber-700">
              Các giao dịch trước ngày {formatDate(effectiveDate)} không phải chịu thuế chuyển nhượng vàng miếng.
            </p>
          )}
        </div>

        {/* Calculation date */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ngày tính thuế
          </label>
          <input
            type="date"
            value={calculationDate}
            onChange={(e) => setCalculationDate(e.target.value)}
            className="input-field w-full sm:w-auto"
          />
        </div>
      </div>

      {/* Reference prices */}
      <div className="card bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>📊</span>
          Giá vàng tham khảo
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">SJC Bán ra</div>
            <div className="font-bold text-amber-600">
              {formatCurrency(REFERENCE_GOLD_PRICES.sjc.sell)}
            </div>
            <div className="text-xs text-gray-400">/lượng</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">SJC Mua vào</div>
            <div className="font-bold text-amber-600">
              {formatCurrency(REFERENCE_GOLD_PRICES.sjc.buy)}
            </div>
            <div className="text-xs text-gray-400">/lượng</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Thuế suất</div>
            <div className="font-bold text-red-600">
              {(GOLD_TRANSFER_TAX_RATE * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">trên giá bán</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Cập nhật</div>
            <div className="font-medium text-gray-700">
              {REFERENCE_GOLD_PRICES.lastUpdated}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Giao dịch vàng</h3>
          <button
            onClick={addTransaction}
            className="btn-secondary text-sm"
          >
            + Thêm giao dịch
          </button>
        </div>

        <div className="space-y-4">
          {transactions.map((transaction, index) => (
            <div
              key={transaction.id}
              className="p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700">
                  Giao dịch #{index + 1}
                </span>
                {transactions.length > 1 && (
                  <button
                    onClick={() => removeTransaction(transaction.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Transaction type */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Loại giao dịch
                  </label>
                  <select
                    value={transaction.type}
                    onChange={(e) =>
                      updateTransaction(transaction.id, {
                        type: e.target.value as TransactionType,
                      })
                    }
                    className="input-field w-full"
                  >
                    {Object.entries(TRANSACTION_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gold type */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Loại vàng
                  </label>
                  <select
                    value={transaction.goldType}
                    onChange={(e) =>
                      updateTransaction(transaction.id, {
                        goldType: e.target.value as GoldType,
                      })
                    }
                    className="input-field w-full"
                  >
                    {Object.entries(GOLD_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Đơn vị
                  </label>
                  <select
                    value={transaction.unit}
                    onChange={(e) =>
                      updateTransaction(transaction.id, {
                        unit: e.target.value as GoldUnit,
                      })
                    }
                    className="input-field w-full"
                  >
                    {Object.entries(GOLD_UNIT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transaction.quantity}
                    onChange={(e) =>
                      updateTransaction(transaction.id, {
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field w-full"
                  />
                </div>

                {/* Price per unit */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">
                    Giá {transaction.type === 'buy' ? 'mua' : 'bán'} (VND/{transaction.unit === 'luong' ? 'lượng' : transaction.unit === 'chi' ? 'chỉ' : 'gram'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={transaction.pricePerUnit}
                    onChange={(e) =>
                      updateTransaction(transaction.id, {
                        pricePerUnit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field w-full"
                    placeholder="VD: 89500000"
                  />
                </div>

                {/* Transaction date */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">
                    Ngày giao dịch
                  </label>
                  <input
                    type="date"
                    value={transaction.transactionDate}
                    onChange={(e) =>
                      updateTransaction(transaction.id, {
                        transactionDate: e.target.value,
                      })
                    }
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Gold type note */}
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                isGoldTypeTaxable(transaction.goldType)
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-green-50 text-green-700'
              }`}>
                <strong>
                  {isGoldTypeTaxable(transaction.goldType)
                    ? '⚠️ Vàng miếng - Chịu thuế chuyển nhượng'
                    : '✅ Vàng trang sức - Không chịu thuế'
                  }
                </strong>
                <p className="mt-1 text-xs opacity-80">
                  {GOLD_TYPE_DESCRIPTIONS[transaction.goldType]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Kết quả tính thuế</h3>

        {/* Transaction results */}
        <div className="space-y-3 mb-6">
          {result.transactions.map((t, index) => (
            <div
              key={t.id}
              className={`p-4 rounded-xl border ${
                t.isTaxable
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">
                  Giao dịch #{index + 1}: {TRANSACTION_TYPE_LABELS[t.type]} {t.quantity} {GOLD_UNIT_LABELS[t.unit]}
                </span>
                <span className={`font-bold ${t.isTaxable ? 'text-red-600' : 'text-green-600'}`}>
                  {t.isTaxable ? `- ${formatCurrency(t.tax)}` : 'Không thuế'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Giá trị:</span>{' '}
                  <span className="font-medium">{formatCurrency(t.totalValue)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Thuế suất:</span>{' '}
                  <span className="font-medium">{t.taxRate}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Thuế:</span>{' '}
                  <span className="font-medium">{formatCurrency(t.tax)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Thực nhận:</span>{' '}
                  <span className="font-medium">{formatCurrency(t.netValue)}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-600">{t.reason}</p>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Tổng kết</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Số giao dịch</div>
              <div className="text-xl font-bold text-gray-900">
                {result.summary.totalTransactions}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tổng giá trị chịu thuế</div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(result.summary.totalTaxableValue)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tổng thuế phải nộp</div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(result.summary.totalTax)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Thuế suất hiệu dụng</div>
              <div className="text-xl font-bold text-gray-900">
                {result.summary.effectiveTaxRate.toFixed(3)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>ℹ️</span>
          Lưu ý về thuế chuyển nhượng vàng miếng
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Thuế suất:</strong> 0.1% trên giá trị chuyển nhượng (giá bán)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Đối tượng:</strong> Chỉ áp dụng cho vàng miếng (SJC, PNJ, DOJI...), không áp dụng cho vàng trang sức
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Người nộp thuế:</strong> Người bán vàng miếng
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Hiệu lực:</strong> Từ ngày {formatDate(effectiveDate)} (Luật Thuế TNCN sửa đổi 2025)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Kê khai:</strong> Qua cơ sở kinh doanh vàng (khấu trừ tại nguồn) hoặc tự kê khai
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default GoldTransferTaxCalculator;
