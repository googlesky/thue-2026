'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  calculateIncomeSummary,
  IncomeSummaryInput,
  IncomeSummaryResult,
  IncomeEntry,
  IncomeCategory,
  INCOME_CATEGORIES,
  DEFAULT_INCOME_SUMMARY_INPUT,
  getCategoryConfig,
  generateEntryId,
  formatShortCurrency,
  formatPercent,
  formatTaxMethod,
} from '@/lib/incomeSummaryCalculator';
import { formatCurrency, getRentalIncomeThreshold, getTaxConfigForDate } from '@/lib/taxCalculator';

interface IncomeSummaryDashboardProps {
  className?: string;
  // Giữ dữ liệu khi chuyển tab/lưu snapshot: trang cha truyền state của tab vào đây
  tabState?: IncomeSummaryInput;
  onTabStateChange?: (state: IncomeSummaryInput) => void;
}

// "15,5 triệu", "1 tỷ"
const formatMillions = (value: number) =>
  value >= 1_000_000_000
    ? `${(value / 1_000_000_000).toLocaleString('vi-VN')} tỷ`
    : `${(value / 1_000_000).toLocaleString('vi-VN')} triệu`;

// Chấm màu thay icon (design system không dùng emoji)
function CategoryDot({ color }: { color: string }) {
  return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}

export default function IncomeSummaryDashboard({
  className = '',
  tabState,
  onTabStateChange,
}: IncomeSummaryDashboardProps) {
  // State
  const [input, setInput] = useState<IncomeSummaryInput>(tabState ?? DEFAULT_INCOME_SUMMARY_INPUT);

  // Đồng bộ hai chiều với trang cha (nếu có) để không mất dữ liệu khi đổi tab hoặc nạp snapshot
  useEffect(() => {
    if (tabState && tabState !== input) setInput(tabState);
  }, [tabState]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    onTabStateChange?.(input);
  }, [input]); // eslint-disable-line react-hooks/exhaustive-deps

  const [activeTab, setActiveTab] = useState<'overview' | 'entries' | 'monthly' | 'category'>('overview');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);

  // Form state for adding/editing entries
  const [formCategory, setFormCategory] = useState<IncomeCategory>('salary');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  const [formNotes, setFormNotes] = useState('');

  // Calculate result
  const result = useMemo<IncomeSummaryResult>(() => {
    return calculateIncomeSummary(input);
  }, [input]);

  // Mức giảm trừ, ngưỡng kinh doanh của năm đang xem (2025: luật cũ)
  const yearEnd = new Date(input.year, 11, 31);
  const yearDeductions = getTaxConfigForDate(yearEnd).deductions;
  const businessThreshold = getRentalIncomeThreshold(yearEnd);

  // Reset form
  const resetForm = useCallback(() => {
    setFormCategory('salary');
    setFormDescription('');
    setFormAmount('');
    setFormMonth(new Date().getMonth() + 1);
    setFormNotes('');
    setEditingEntry(null);
  }, []);

  // Add or update entry
  const handleSaveEntry = useCallback(() => {
    const amount = parseInt(formAmount, 10) || 0;
    if (amount <= 0) return;

    const config = getCategoryConfig(formCategory);
    // Thuế từng khoản do calculateIncomeSummary tính (ngưỡng theo lần, ngưỡng doanh thu năm, lũy tiến)
    const entry: IncomeEntry = {
      id: editingEntry?.id || generateEntryId(),
      category: formCategory,
      description: formDescription || config.name,
      amount,
      month: formMonth,
      notes: formNotes || undefined,
    };

    if (editingEntry) {
      // Update existing
      setInput(prev => ({
        ...prev,
        entries: prev.entries.map(e => e.id === editingEntry.id ? entry : e),
      }));
    } else {
      // Add new
      setInput(prev => ({
        ...prev,
        entries: [...prev.entries, entry],
      }));
    }

    resetForm();
    setShowAddForm(false);
  }, [formCategory, formDescription, formAmount, formMonth, formNotes, editingEntry, resetForm]);

  // Edit entry
  const handleEditEntry = useCallback((entry: IncomeEntry) => {
    setFormCategory(entry.category);
    setFormDescription(entry.description);
    setFormAmount(entry.amount.toString());
    setFormMonth(entry.month);
    setFormNotes(entry.notes || '');
    setEditingEntry(entry);
    setShowAddForm(true);
  }, []);

  // Delete entry
  const handleDeleteEntry = useCallback((id: string) => {
    setInput(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.id !== id),
    }));
  }, []);

  // Update settings
  const handleDependentsChange = useCallback((value: number) => {
    setInput(prev => ({ ...prev, dependents: Math.max(0, value) }));
  }, []);

  const handleInsuranceChange = useCallback((value: boolean) => {
    setInput(prev => ({ ...prev, hasInsurance: value }));
  }, []);

  const handleYearChange = useCallback((value: number) => {
    setInput(prev => ({ ...prev, year: value }));
  }, []);

  // Clear all
  const handleClearAll = useCallback(() => {
    if (confirm('Xóa tất cả dữ liệu?')) {
      setInput(DEFAULT_INCOME_SUMMARY_INPUT);
    }
  }, []);

  // Render overview tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="text-sm text-blue-600 mb-1">Tổng thu nhập</div>
          <div className="text-xl lg:text-2xl font-bold text-blue-700">
            {formatShortCurrency(result.totalGrossIncome)}
          </div>
          <div className="text-xs text-blue-500 mt-1">
            {result.totalEntries} khoản
          </div>
        </div>

        <div className="bg-red-50 rounded-xl p-4">
          <div className="text-sm text-red-600 mb-1">Tổng thuế</div>
          <div className="text-xl lg:text-2xl font-bold text-red-700">
            {formatShortCurrency(result.totalTax)}
          </div>
          <div className="text-xs text-red-500 mt-1">
            {formatPercent(result.effectiveTaxRate)} thực tế
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-sm text-green-600 mb-1">Thu nhập ròng</div>
          <div className="text-xl lg:text-2xl font-bold text-green-700">
            {formatShortCurrency(result.totalNetIncome)}
          </div>
          <div className="text-xs text-green-500 mt-1">
            Sau BH và thuế
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4">
          <div className="text-sm text-purple-600 mb-1">Giảm trừ</div>
          <div className="text-xl lg:text-2xl font-bold text-purple-700">
            {formatShortCurrency(result.deductions.total)}
          </div>
          <div className="text-xs text-purple-500 mt-1">
            {input.dependents > 0 ? `${input.dependents} NPT` : 'Chỉ cá nhân'}
          </div>
        </div>
      </div>

      {/* Monthly Average */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-medium text-gray-900 mb-3">Trung bình hàng tháng</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Thu nhập</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(result.averageMonthlyIncome)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Thuế</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(result.averageMonthlyTax)}
            </div>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {result.topCategories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-4">Nguồn thu nhập chính</h3>
          <div className="space-y-3">
            {result.topCategories.map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${cat.config.color}20` }}
                >
                  <CategoryDot color={cat.config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {cat.config.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatPercent(cat.percentage)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.config.color
                      }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatShortCurrency(cat.totalIncome)}
                  </div>
                  <div className="text-xs text-red-500">
                    -{formatShortCurrency(cat.totalTax)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deduction Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Chi tiết giảm trừ</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Giảm trừ bản thân</span>
            <span className="text-gray-900">{formatCurrency(result.deductions.personal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Giảm trừ người phụ thuộc ({input.dependents})</span>
            <span className="text-gray-900">{formatCurrency(result.deductions.dependent)}</span>
          </div>
          {result.deductions.insurance > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Bảo hiểm bắt buộc</span>
              <span className="text-gray-900">{formatCurrency(result.deductions.insurance)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
            <span className="text-gray-700">Tổng giảm trừ</span>
            <span className="text-purple-600">{formatCurrency(result.deductions.total)}</span>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {result.totalEntries === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Chưa có dữ liệu thu nhập</p>
          <p className="text-sm mt-1">Nhấn &quot;Thêm thu nhập&quot; để bắt đầu</p>
        </div>
      )}
    </div>
  );

  // Render entries tab
  const renderEntries = () => (
    <div className="space-y-3">
      {input.entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Chưa có khoản thu nhập nào</p>
        </div>
      ) : (
        [...result.entries]
          .sort((a, b) => a.month - b.month)
          .map((entry) => {
            const config = getCategoryConfig(entry.category);
            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <CategoryDot color={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {entry.description}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        T{entry.month}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(entry.amount)}
                      </span>
                      <span className="text-red-500">
                        Thuế: {formatCurrency(entry.taxAmount)}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditEntry(entry)}
                      className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Sửa"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Xóa"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
      )}
    </div>
  );

  // Render monthly tab
  const renderMonthly = () => (
    <div className="space-y-3">
      {result.byMonth.map((month) => (
        <div
          key={month.month}
          className={`bg-white rounded-xl border border-gray-200 p-4 ${
            month.totalIncome === 0 ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">{month.monthName}</span>
            <span className="text-sm text-gray-500">{month.entries} khoản</span>
          </div>
          {month.totalIncome > 0 ? (
            <>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-green-600">
                  +{formatCurrency(month.totalIncome)}
                </span>
                <span className="text-red-500">
                  -{formatCurrency(month.totalTax)}
                </span>
              </div>
              {month.byCategory.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {month.byCategory.map((cat) => {
                    const config = getCategoryConfig(cat.category);
                    return (
                      <span
                        key={cat.category}
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${config.color}20`,
                          color: config.color
                        }}
                      >
                        {config.name}: {formatShortCurrency(cat.amount)}
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-400">Không có thu nhập</div>
          )}
        </div>
      ))}
    </div>
  );

  // Render category tab
  const renderCategory = () => (
    <div className="space-y-3">
      {result.byCategory.map((cat) => (
        <div
          key={cat.category}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${cat.config.color}20` }}
            >
              <CategoryDot color={cat.config.color} />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{cat.config.name}</div>
              <div className="text-xs text-gray-500">{cat.config.description}</div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">
                {formatCurrency(cat.totalIncome)}
              </div>
              <div className="text-xs text-gray-500">{formatPercent(cat.percentage)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-gray-500 text-xs">Số khoản</div>
              <div className="font-medium text-gray-900">{cat.entries}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-gray-500 text-xs">Thuế</div>
              <div className="font-medium text-red-500">{formatCurrency(cat.totalTax)}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-gray-500 text-xs">Phương pháp</div>
              <div className="font-medium text-gray-900 text-xs">
                {formatTaxMethod(cat.config)}
              </div>
            </div>
          </div>
        </div>
      ))}

      {result.byCategory.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Chưa có dữ liệu theo danh mục</p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Tổng hợp thu nhập năm {input.year}
          </h2>
          <p className="text-sm text-gray-500">
            Quản lý và theo dõi thu nhập từ nhiều nguồn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={input.year}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
          >
            {[2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Thêm thu nhập
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Người phụ thuộc:</label>
            <div className="flex items-center">
              <button
                onClick={() => handleDependentsChange(input.dependents - 1)}
                className="px-2 py-1 border border-gray-300 rounded-l-lg bg-white text-gray-900"
              >
                -
              </button>
              <span className="px-4 py-1 border-y border-gray-300 bg-white text-gray-900 min-w-[40px] text-center">
                {input.dependents}
              </span>
              <button
                onClick={() => handleDependentsChange(input.dependents + 1)}
                className="px-2 py-1 border border-gray-300 rounded-r-lg bg-white text-gray-900"
              >
                +
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={input.hasInsurance}
              onChange={(e) => handleInsuranceChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">Có đóng BHXH</span>
          </label>

          {input.entries.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-red-500 hover:text-red-600 ml-auto"
            >
              Xóa tất cả
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          { id: 'overview', label: 'Tổng quan' },
          { id: 'entries', label: 'Chi tiết' },
          { id: 'monthly', label: 'Theo tháng' },
          { id: 'category', label: 'Theo loại' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 min-w-0 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'entries' && renderEntries()}
        {activeTab === 'monthly' && renderMonthly()}
        {activeTab === 'category' && renderCategory()}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEntry ? 'Sửa thu nhập' : 'Thêm thu nhập'}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại thu nhập
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                  {INCOME_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFormCategory(cat.id)}
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        formCategory === cat.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <CategoryDot color={cat.color} />
                        <span className="text-xs text-gray-600 leading-tight">{cat.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền (VND)
                </label>
                <input
                  type="text"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
                {formAmount && (
                  <div className="text-xs text-gray-500 mt-1">
                    {formatCurrency(parseFloat(formAmount) || 0)}
                  </div>
                )}
              </div>

              {/* Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tháng
                </label>
                <select
                  value={formMonth}
                  onChange={(e) => setFormMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả (tùy chọn)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={getCategoryConfig(formCategory).name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 resize-none"
                />
              </div>

              {/* Tax info */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="text-gray-600">
                  Phương pháp tính thuế: {' '}
                  <span className="text-gray-900 font-medium">
                    {formatTaxMethod(getCategoryConfig(formCategory))}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getCategoryConfig(formCategory).description}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEntry}
                disabled={!formAmount || parseFloat(formAmount) <= 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingEntry ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Note */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <p className="font-medium mb-1">Lưu ý:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Lương, thưởng, thù lao dịch vụ (không đăng ký kinh doanh) gộp cả năm tính lũy tiến; BH bắt buộc tính trên lương, không tính trên thưởng</li>
          <li>Giảm trừ bản thân năm {input.year}: {formatMillions(yearDeductions.personal)}/tháng; người phụ thuộc: {formatMillions(yearDeductions.dependent)}/người/tháng</li>
          <li>Kinh doanh, cho thuê: tổng doanh thu năm đến {formatMillions(businessThreshold)} không nộp thuế TNCN</li>
          <li>Trúng thưởng, thừa kế, quà tặng, thu nhập khác: tính trên phần vượt 20 triệu mỗi lần (trước 01/7/2026: 10 triệu)</li>
        </ul>
      </div>
    </div>
  );
}
