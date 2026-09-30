'use client';

import { useState, useMemo } from 'react';
import {
  SecuritiesTransaction,
  DividendEntry,
  BondInterestEntry,
  SecuritiesType,
  BondType,
  calculateSecuritiesTax,
  generateId,
  POPULAR_STOCKS,
} from '@/lib/securitiesTaxCalculator';
import { formatCurrency, formatNumber } from '@/lib/taxCalculator';

type TabType = 'transactions' | 'dividends' | 'bonds';

const SECURITIES_TYPES: { value: SecuritiesType; label: string; desc: string }[] = [
  { value: 'listed', label: 'Niêm yết', desc: 'HOSE, HNX, UPCOM (gồm ETF, quỹ đóng)' },
  { value: 'unlisted', label: 'Chưa niêm yết', desc: 'OTC, cổ phần riêng lẻ' },
  { value: 'fund', label: 'Chứng chỉ quỹ mở', desc: 'Miễn thuế nếu nắm giữ từ đủ 2 năm' },
  { value: 'bond', label: 'Trái phiếu', desc: 'Bán trái phiếu: 0,1% giá bán' },
];

const BOND_TYPES: { value: BondType; label: string; short: string; taxRate: string }[] = [
  { value: 'government', label: 'Trái phiếu Chính phủ', short: 'Chính phủ', taxRate: 'miễn thuế' },
  { value: 'localGovernment', label: 'Trái phiếu chính quyền địa phương', short: 'Địa phương', taxRate: 'miễn thuế' },
  { value: 'green', label: 'Trái phiếu xanh', short: 'Trái phiếu xanh', taxRate: 'miễn thuế' },
  { value: 'corporate', label: 'Trái phiếu doanh nghiệp', short: 'Doanh nghiệp', taxRate: '5%' },
];

// Tỷ lệ % kiểu Việt Nam: 0,1 / 2,5
const formatRate = (rate: number) => rate.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

// Ô số tiền: để trống khi bằng 0 để người dùng gõ lại từ đầu
const displayNumber = (value: number | undefined) => (value ? formatNumber(value) : '');

const SECONDARY_BUTTON =
  'px-6 py-3 rounded-lg border border-line bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors';

export default function SecuritiesTaxCalculator() {
  const [activeTab, setActiveTab] = useState<TabType>('transactions');

  // Transactions state
  const [transactions, setTransactions] = useState<SecuritiesTransaction[]>([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<SecuritiesTransaction | null>(null);

  // Dividends state
  const [dividends, setDividends] = useState<DividendEntry[]>([]);
  const [showDividendForm, setShowDividendForm] = useState(false);

  // Bonds state
  const [bonds, setBonds] = useState<BondInterestEntry[]>([]);
  const [showBondForm, setShowBondForm] = useState(false);

  // Form states
  const [transactionForm, setTransactionForm] = useState<Partial<SecuritiesTransaction>>({
    type: 'listed',
    symbol: '',
    quantity: 0,
    buyPrice: 0,
    sellPrice: 0,
    buyDate: '',
    sellDate: '',
    buyFee: 0,
    sellFee: 0,
  });

  const [dividendForm, setDividendForm] = useState<Partial<DividendEntry>>({
    symbol: '',
    company: '',
    dividendPerShare: 0,
    shares: 0,
    exDate: '',
    taxWithheld: 0,
  });

  const [bondForm, setBondForm] = useState<Partial<BondInterestEntry>>({
    bondName: '',
    bondType: 'corporate',
    principal: 0,
    interestRate: 0,
    interestPeriod: 'annual',
    interestReceived: 0,
  });

  // Calculate taxes
  const result = useMemo(
    () => calculateSecuritiesTax({ transactions, dividends, bonds }),
    [transactions, dividends, bonds]
  );

  // Handlers
  const handleAddTransaction = () => {
    if (!transactionForm.symbol || !transactionForm.quantity) return;

    const newTransaction: SecuritiesTransaction = {
      id: editingTransaction?.id || generateId(),
      type: transactionForm.type as SecuritiesType,
      symbol: transactionForm.symbol || '',
      quantity: transactionForm.quantity || 0,
      buyPrice: transactionForm.buyPrice || 0,
      sellPrice: transactionForm.sellPrice || 0,
      buyDate: transactionForm.buyDate || '',
      sellDate: transactionForm.sellDate || '',
      buyFee: transactionForm.buyFee || 0,
      sellFee: transactionForm.sellFee || 0,
    };

    if (editingTransaction) {
      setTransactions(transactions.map((t) =>
        t.id === editingTransaction.id ? newTransaction : t
      ));
    } else {
      setTransactions([...transactions, newTransaction]);
    }

    resetTransactionForm();
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const handleEditTransaction = (transaction: SecuritiesTransaction) => {
    setEditingTransaction(transaction);
    setTransactionForm(transaction);
    setShowTransactionForm(true);
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'listed',
      symbol: '',
      quantity: 0,
      buyPrice: 0,
      sellPrice: 0,
      buyDate: '',
      sellDate: '',
      buyFee: 0,
      sellFee: 0,
    });
    setShowTransactionForm(false);
    setEditingTransaction(null);
  };

  const handleAddDividend = () => {
    if (!dividendForm.symbol || !dividendForm.shares) return;

    const newDividend: DividendEntry = {
      id: generateId(),
      symbol: dividendForm.symbol || '',
      company: dividendForm.company || '',
      dividendPerShare: dividendForm.dividendPerShare || 0,
      shares: dividendForm.shares || 0,
      exDate: dividendForm.exDate || '',
      taxWithheld: dividendForm.taxWithheld || 0,
      fromFund: dividendForm.fromFund || false,
    };

    setDividends([...dividends, newDividend]);
    setDividendForm({
      symbol: '',
      company: '',
      dividendPerShare: 0,
      shares: 0,
      exDate: '',
      taxWithheld: 0,
      fromFund: false,
    });
    setShowDividendForm(false);
  };

  const handleDeleteDividend = (id: string) => {
    setDividends(dividends.filter((d) => d.id !== id));
  };

  const handleAddBond = () => {
    if (!bondForm.bondName || !bondForm.interestReceived) return;

    const newBond: BondInterestEntry = {
      id: generateId(),
      bondName: bondForm.bondName || '',
      bondType: bondForm.bondType as BondType,
      principal: bondForm.principal || 0,
      interestRate: bondForm.interestRate || 0,
      interestPeriod: bondForm.interestPeriod || 'annual',
      interestReceived: bondForm.interestReceived || 0,
    };

    setBonds([...bonds, newBond]);
    setBondForm({
      bondName: '',
      bondType: 'corporate',
      principal: 0,
      interestRate: 0,
      interestPeriod: 'annual',
      interestReceived: 0,
    });
    setShowBondForm(false);
  };

  const handleDeleteBond = (id: string) => {
    setBonds(bonds.filter((b) => b.id !== id));
  };

  const handleNumberInput = (value: string): number => {
    return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
  };

  const tabs = [
    { id: 'transactions' as TabType, label: 'Giao dịch CK', count: transactions.length },
    { id: 'dividends' as TabType, label: 'Cổ tức', count: dividends.length },
    { id: 'bonds' as TabType, label: 'Lãi trái phiếu', count: bonds.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Thuế chứng khoán</h2>
          <p className="text-gray-600 mt-1">
            Chuyển nhượng chứng khoán 0,1% giá bán, cổ tức và lãi trái phiếu – Luật Thuế TNCN số 109/2025/QH15
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Giao dịch chứng khoán</h3>
              <button
                onClick={() => setShowTransactionForm(true)}
                className="btn-primary text-sm"
              >
                + Thêm giao dịch
              </button>
            </div>

            {/* Transaction Form */}
            {showTransactionForm && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại CK
                    </label>
                    <select
                      value={transactionForm.type}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        type: e.target.value as SecuritiesType,
                      })}
                      className="input-field"
                    >
                      {SECURITIES_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã CK
                    </label>
                    <input
                      type="text"
                      value={transactionForm.symbol}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        symbol: e.target.value.toUpperCase(),
                      })}
                      className="input-field"
                      placeholder="VNM, FPT..."
                      list="stock-suggestions"
                    />
                    <datalist id="stock-suggestions">
                      {POPULAR_STOCKS.map((stock) => (
                        <option key={stock.symbol} value={stock.symbol}>
                          {stock.name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số lượng
                    </label>
                    <input
                      type="text"
                      value={displayNumber(transactionForm.quantity)}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        quantity: handleNumberInput(e.target.value),
                      })}
                      className="input-field"
                      placeholder="1.000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá mua
                    </label>
                    <input
                      type="text"
                      value={displayNumber(transactionForm.buyPrice)}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        buyPrice: handleNumberInput(e.target.value),
                      })}
                      className="input-field"
                      placeholder="50.000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá bán
                    </label>
                    <input
                      type="text"
                      value={displayNumber(transactionForm.sellPrice)}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        sellPrice: handleNumberInput(e.target.value),
                      })}
                      className="input-field"
                      placeholder="60.000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phí mua
                    </label>
                    <input
                      type="text"
                      value={displayNumber(transactionForm.buyFee)}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        buyFee: handleNumberInput(e.target.value),
                      })}
                      className="input-field"
                      placeholder="100.000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phí bán
                    </label>
                    <input
                      type="text"
                      value={displayNumber(transactionForm.sellFee)}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        sellFee: handleNumberInput(e.target.value),
                      })}
                      className="input-field"
                      placeholder="100.000"
                    />
                  </div>
                  {transactionForm.type === 'fund' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ngày mua
                        </label>
                        <input
                          type="date"
                          value={transactionForm.buyDate || ''}
                          onChange={(e) => setTransactionForm({
                            ...transactionForm,
                            buyDate: e.target.value,
                          })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ngày bán
                        </label>
                        <input
                          type="date"
                          value={transactionForm.sellDate || ''}
                          onChange={(e) => setTransactionForm({
                            ...transactionForm,
                            sellDate: e.target.value,
                          })}
                          className="input-field"
                        />
                      </div>
                      <p className="sm:col-span-2 lg:col-span-4 text-xs text-gray-500">
                        Chứng chỉ quỹ mở nắm giữ từ đủ 2 năm kể từ ngày mua, bán từ 01/7/2026: miễn thuế.
                        Mua nhiều lần thì lô mua trước tính bán trước. Để trống ngày bán = hôm nay.
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddTransaction} className="btn-primary">
                    {editingTransaction ? 'Cập nhật' : 'Thêm'}
                  </button>
                  <button onClick={resetTransactionForm} className={SECONDARY_BUTTON}>
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {/* Transactions List */}
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Chưa có giao dịch nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Mã</th>
                      <th className="px-3 py-2 text-left">Loại</th>
                      <th className="px-3 py-2 text-right">SL</th>
                      <th className="px-3 py-2 text-right">Giá mua</th>
                      <th className="px-3 py-2 text-right">Giá bán</th>
                      <th className="px-3 py-2 text-right">Lãi/Lỗ</th>
                      <th className="px-3 py-2 text-right">Thuế</th>
                      <th className="px-3 py-2 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.transactions.results.map((t) => {
                      const original = transactions.find((tr) => tr.id === t.id);
                      return (
                        <tr key={t.id} className="border-t">
                          <td className="px-3 py-2 font-medium">{t.symbol}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              t.type === 'listed' ? 'bg-green-100 text-green-700' :
                              t.type === 'unlisted' ? 'bg-amber-100 text-amber-700' :
                              t.type === 'bond' ? 'bg-purple-100 text-purple-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {SECURITIES_TYPES.find((s) => s.value === t.type)?.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{formatNumber(original?.quantity || 0)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(t.buyValue)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(t.sellValue)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${
                            t.capitalGain >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {t.capitalGain >= 0 ? '+' : ''}{formatCurrency(t.capitalGain)}
                          </td>
                          {t.note ? (
                            <td className="px-3 py-2 text-right text-green-600 font-medium" title={t.note}>
                              Miễn thuế
                            </td>
                          ) : (
                            <td className="px-3 py-2 text-right text-red-600 whitespace-nowrap">
                              -{formatCurrency(t.tax)}
                              <span className="text-xs text-gray-500 ml-1">({formatRate(t.taxRate)}%)</span>
                            </td>
                          )}
                          <td className="px-3 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => original && handleEditTransaction(original)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                aria-label="Sửa giao dịch"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                aria-label="Xóa giao dịch"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Dividends Tab */}
        {activeTab === 'dividends' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Thu nhập cổ tức</h3>
              <button
                onClick={() => setShowDividendForm(true)}
                className="btn-primary text-sm"
              >
                + Thêm cổ tức
              </button>
            </div>

            {/* Dividend Form */}
            {showDividendForm && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã CK
                    </label>
                    <input
                      type="text"
                      value={dividendForm.symbol}
                      onChange={(e) => setDividendForm({
                        ...dividendForm,
                        symbol: e.target.value.toUpperCase(),
                      })}
                      className="input-field"
                      placeholder="VNM"
                      list="stock-suggestions"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số cổ phiếu
                    </label>
                    <input
                      type="text"
                      value={displayNumber(dividendForm.shares)}
                      onChange={(e) => setDividendForm({
                        ...dividendForm,
                        shares: handleNumberInput(e.target.value),
                      })}
                      className="input-field"
                      placeholder="1.000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cổ tức/CP (đ)
                    </label>
                    <input
                      type="text"
                      value={displayNumber(dividendForm.dividendPerShare)}
                      onChange={(e) => setDividendForm({
                        ...dividendForm,
                        dividendPerShare: handleNumberInput(e.target.value),
                      })}
                      className="input-field"
                      placeholder="1.500"
                    />
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dividendForm.fromFund || false}
                    onChange={(e) => setDividendForm({ ...dividendForm, fromFund: e.target.checked })}
                    className="checkbox-touch mt-0.5 flex-shrink-0"
                  />
                  <span>
                    Lợi tức chia từ quỹ đầu tư chứng khoán / quỹ đầu tư bất động sản (giảm 50% thuế, còn 2,5%,
                    từ 01/7/2026 đến 30/6/2031)
                  </span>
                </label>
                <div className="flex gap-2">
                  <button onClick={handleAddDividend} className="btn-primary">
                    Thêm
                  </button>
                  <button onClick={() => setShowDividendForm(false)} className={SECONDARY_BUTTON}>
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {/* Dividends List */}
            {dividends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Chưa có thu nhập cổ tức</p>
              </div>
            ) : (
              <div className="space-y-2">
                {result.dividends.results.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{d.symbol}</span>
                      <span className="text-gray-500 text-sm ml-2">
                        ({formatNumber(dividends.find((div) => div.id === d.id)?.shares)} CP)
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Tổng: {formatCurrency(d.grossDividend)}
                        </div>
                        <div className="text-xs text-red-600">
                          Thuế: -{formatCurrency(d.tax)} ({formatRate(d.taxRate)}%)
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDividend(d.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bonds Tab */}
        {activeTab === 'bonds' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Lãi trái phiếu</h3>
              <button
                onClick={() => setShowBondForm(true)}
                className="btn-primary text-sm"
              >
                + Thêm trái phiếu
              </button>
            </div>

            {/* Bond Form */}
            {showBondForm && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên trái phiếu
                    </label>
                    <input
                      type="text"
                      value={bondForm.bondName}
                      onChange={(e) => setBondForm({
                        ...bondForm,
                        bondName: e.target.value,
                      })}
                      className="input-field"
                      placeholder="TP Chính phủ 5Y"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại trái phiếu
                    </label>
                    <select
                      value={bondForm.bondType}
                      onChange={(e) => setBondForm({
                        ...bondForm,
                        bondType: e.target.value as BondType,
                      })}
                      className="input-field"
                    >
                      {BOND_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label} - {type.taxRate}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lãi nhận được
                    </label>
                    <input
                      type="text"
                      value={displayNumber(bondForm.interestReceived)}
                      onChange={(e) => setBondForm({
                        ...bondForm,
                        interestReceived: handleNumberInput(e.target.value),
                      })}
                      className="input-field"
                      placeholder="10.000.000"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddBond} className="btn-primary">
                    Thêm
                  </button>
                  <button onClick={() => setShowBondForm(false)} className={SECONDARY_BUTTON}>
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {/* Bonds List */}
            {bonds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Chưa có lãi trái phiếu</p>
              </div>
            ) : (
              <div className="space-y-2">
                {result.bonds.results.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{b.bondName}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        b.tax === 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {BOND_TYPES.find((t) => t.value === b.bondType)?.short}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Lãi: {formatCurrency(b.interestReceived)}
                        </div>
                        <div className={`text-xs ${b.tax > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {b.tax > 0 ? `Thuế: -${formatCurrency(b.tax)} (${formatRate(b.taxRate)}%)` : 'Miễn thuế'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBond(b.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {(transactions.length > 0 || dividends.length > 0 || bonds.length > 0) && (
        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Tổng kết thuế chứng khoán
          </h3>

          <div className="grid gap-4">
            {/* Transaction Summary */}
            {transactions.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-semibold text-blue-800">Giao dịch chứng khoán</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Giá trị bán</p>
                    <p className="font-semibold">{formatCurrency(result.transactions.totalSellValue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Lãi/Lỗ</p>
                    <p className={`font-semibold ${
                      result.transactions.totalCapitalGain >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {result.transactions.totalCapitalGain >= 0 ? '+' : ''}
                      {formatCurrency(result.transactions.totalCapitalGain)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tổng phí</p>
                    <p className="font-semibold text-gray-700">{formatCurrency(result.transactions.totalFees)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Thuế</p>
                    <p className="font-semibold text-red-600">-{formatCurrency(result.transactions.totalTax)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Dividend Summary */}
            {dividends.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-semibold text-amber-800">Cổ tức</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Tổng cổ tức</p>
                    <p className="font-semibold">{formatCurrency(result.dividends.totalGross)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Thuế</p>
                    <p className="font-semibold text-red-600">-{formatCurrency(result.dividends.totalTax)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Thực nhận</p>
                    <p className="font-semibold text-green-600">{formatCurrency(result.dividends.totalNet)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bond Summary */}
            {bonds.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-semibold text-purple-800">Lãi trái phiếu</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Tổng lãi</p>
                    <p className="font-semibold">{formatCurrency(result.bonds.totalInterest)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Thuế</p>
                    <p className="font-semibold text-red-600">-{formatCurrency(result.bonds.totalTax)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Thực nhận</p>
                    <p className="font-semibold text-green-600">{formatCurrency(result.bonds.totalNet)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Total Summary */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold">Tổng cộng</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Thu nhập</p>
                  <p className="text-xl font-bold">{formatCurrency(result.summary.totalIncome)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Thuế phải nộp</p>
                  <p className="text-xl font-bold text-red-400">-{formatCurrency(result.summary.totalTax)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Thực nhận</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(result.summary.totalNet)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Thuế / tiền nhận</p>
                  <p className="text-xl font-bold">{formatRate(result.summary.effectiveTaxRate)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="card bg-gray-50">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Thông tin thuế chứng khoán
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Chuyển nhượng chứng khoán</h4>
            <p>
              0,1% giá bán từng lần, kể cả khi lỗ – cổ phiếu niêm yết, chưa niêm yết, trái phiếu, chứng chỉ
              quỹ (Luật 109/2025/QH15 Điều 13 khoản 2). Không còn phương án 20% trên lãi.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Chứng chỉ quỹ mở</h4>
            <p>
              Miễn thuế khi nắm giữ từ đủ 2 năm kể từ ngày mua, bán từ 01/7/2026, kể cả chứng chỉ mua trước
              ngày này; mua trước bán trước (NĐ 253/2026/NĐ-CP Điều 43).
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Cổ tức, lợi tức</h4>
            <p>
              5% (khấu trừ tại nguồn). Lợi tức chia từ quỹ đầu tư chứng khoán, quỹ đầu tư bất động sản giảm
              50% (còn 2,5%) từ 01/7/2026 đến 30/6/2031 (NĐ 253/2026 Điều 44). Cổ tức bằng cổ phiếu: nộp 5% khi
              bán (NĐ 253/2026 Điều 52 khoản 4).
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Lãi trái phiếu, tiền gửi</h4>
            <p>
              Miễn thuế: lãi trái phiếu Chính phủ, chính quyền địa phương, trái phiếu xanh, lãi tiền gửi tại
              tổ chức tín dụng. Lãi trái phiếu doanh nghiệp: 5%.
            </p>
          </div>
          <div className="sm:col-span-2">
            <h4 className="font-medium text-gray-700 mb-1">Khác</h4>
            <p>
              Chứng khoán phái sinh: 0,1% giá chuyển nhượng (TT 87/2026/TT-BTC). Chuyển nhượng vốn góp (không
              phải chứng khoán): 20% trên lãi, hoặc 2% giá chuyển nhượng nếu không xác định được giá mua (Luật
              Điều 13 khoản 1).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
