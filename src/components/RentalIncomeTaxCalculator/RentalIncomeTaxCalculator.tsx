'use client';

import { useState, useMemo } from 'react';
import {
  RentalProperty,
  PropertyType,
  RentalIncomeTaxInput,
  calculateRentalIncomeTax,
  createEmptyProperty,
  PROPERTY_TYPE_LABELS,
  EXPENSE_CATEGORIES,
  getRentalThreshold,
} from '@/lib/rentalIncomeTaxCalculator';
import { formatCurrency, formatNumber } from '@/lib/taxCalculator';

export default function RentalIncomeTaxCalculator() {
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [useActualExpenses, setUseActualExpenses] = useState(false);
  const [year, setYear] = useState<2025 | 2026>(2026);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RentalProperty | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  const [propertyForm, setPropertyForm] = useState<RentalProperty>(createEmptyProperty());
  const rentalThreshold = getRentalThreshold(year);

  // Calculate taxes
  const input: RentalIncomeTaxInput = {
    properties,
    useActualExpenses,
    year,
  };

  const result = useMemo(() => calculateRentalIncomeTax(input), [properties, useActualExpenses, year]);

  // Handlers
  const handleAddProperty = () => {
    if (!propertyForm.name || !propertyForm.monthlyRent) return;

    if (editingProperty) {
      setProperties(properties.map((p) =>
        p.id === editingProperty.id ? { ...propertyForm, id: editingProperty.id } : p
      ));
    } else {
      setProperties([...properties, { ...propertyForm, id: crypto.randomUUID() }]);
    }

    resetPropertyForm();
  };

  const handleDeleteProperty = (id: string) => {
    setProperties(properties.filter((p) => p.id !== id));
    expandedProperties.delete(id);
    setExpandedProperties(new Set(expandedProperties));
  };

  const handleEditProperty = (property: RentalProperty) => {
    setEditingProperty(property);
    setPropertyForm(property);
    setShowPropertyForm(true);
  };

  const resetPropertyForm = () => {
    setPropertyForm(createEmptyProperty());
    setShowPropertyForm(false);
    setEditingProperty(null);
  };

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedProperties);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedProperties(newSet);
  };

  const handleNumberInput = (value: string): number => {
    return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
  };

  const handleExpenseChange = (key: keyof RentalProperty['expenses'], value: string) => {
    setPropertyForm({
      ...propertyForm,
      expenses: {
        ...propertyForm.expenses,
        [key]: handleNumberInput(value),
      },
    });
  };

  const propertyTypes: PropertyType[] = ['residential', 'commercial', 'land', 'vehicle', 'equipment'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-3xl">🏠</span>
              Thuế Cho Thuê Tài Sản
            </h2>
            <p className="text-gray-600 mt-1">
              Tính thuế thu nhập từ cho thuê nhà, mặt bằng, phương tiện
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value) as 2025 | 2026)}
              className="input-field w-28"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
        </div>

        {/* Tax Method Selection */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Phương pháp tính chi phí
          </h3>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="expenseMethod"
                checked={!useActualExpenses}
                onChange={() => setUseActualExpenses(false)}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <span className="text-sm font-medium">Ước tính chi phí 10%</span>
                <span className="text-xs text-gray-500 block">Dùng để ước tính thu nhập ròng</span>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="expenseMethod"
                checked={useActualExpenses}
                onChange={() => setUseActualExpenses(true)}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <span className="text-sm font-medium">Chi phí thực tế</span>
                <span className="text-xs text-gray-500 block">Dùng để ước tính thu nhập ròng</span>
              </div>
            </label>
          </div>
          {properties.length > 0 && result.summary.methodImpactsTax && result.summary.recommendedMethod !== (useActualExpenses ? 'actual' : 'deemed') && (
            <p className="mt-3 text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-lg">
              <span className="font-medium">Gợi ý:</span> Phương pháp{' '}
              {result.summary.recommendedMethod === 'deemed' ? 'ước tính 10%' : 'chi phí thực tế'}{' '}
              có lợi hơn, tiết kiệm {formatCurrency(result.summary.potentialSavings)}/năm
            </p>
          )}
          <p className="mt-3 text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-lg">
            Thuế cho thuê tài sản tính theo tỷ lệ doanh thu; chi phí chỉ dùng để ước tính thu nhập ròng và không làm thay đổi số thuế.
          </p>
        </div>

        {/* Properties List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Danh sách tài sản cho thuê</h3>
            <button
              onClick={() => setShowPropertyForm(true)}
              className="btn-primary text-sm"
            >
              + Thêm tài sản
            </button>
          </div>

          {/* Property Form */}
          {showPropertyForm && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h4 className="font-medium text-gray-800">
                {editingProperty ? 'Chỉnh sửa tài sản' : 'Thêm tài sản mới'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên tài sản
                  </label>
                  <input
                    type="text"
                    value={propertyForm.name}
                    onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                    className="input-field"
                    placeholder="Căn hộ Vinhomes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại tài sản
                  </label>
                  <select
                    value={propertyForm.type}
                    onChange={(e) => setPropertyForm({
                      ...propertyForm,
                      type: e.target.value as PropertyType,
                    })}
                    className="input-field"
                  >
                    {propertyTypes.map((type) => (
                      <option key={type} value={type}>
                        {PROPERTY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiền thuê/tháng (đ)
                  </label>
                  <input
                    type="text"
                    value={formatNumber(propertyForm.monthlyRent)}
                    onChange={(e) => setPropertyForm({
                      ...propertyForm,
                      monthlyRent: handleNumberInput(e.target.value),
                    })}
                    className="input-field"
                    placeholder="15,000,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tháng cho thuê
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={propertyForm.occupiedMonths}
                    onChange={(e) => setPropertyForm({
                      ...propertyForm,
                      occupiedMonths: Math.min(12, Math.max(1, parseInt(e.target.value) || 12)),
                    })}
                    className="input-field"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    value={propertyForm.address}
                    onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                    className="input-field"
                    placeholder="123 Nguyễn Huệ, Q.1, TP.HCM"
                  />
                </div>
              </div>

              {/* Expense inputs (if using actual expenses) */}
              {useActualExpenses && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Chi phí thực tế (năm)</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <div key={cat.key}>
                        <label className="block text-xs text-gray-600 mb-1" title={cat.description}>
                          {cat.label}
                        </label>
                        <input
                          type="text"
                          value={formatNumber(propertyForm.expenses[cat.key as keyof typeof propertyForm.expenses])}
                          onChange={(e) => handleExpenseChange(cat.key as keyof typeof propertyForm.expenses, e.target.value)}
                          className="input-field text-sm"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={handleAddProperty} className="btn-primary">
                  {editingProperty ? 'Cập nhật' : 'Thêm'}
                </button>
                <button onClick={resetPropertyForm} className="btn-secondary">
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Properties List */}
          {properties.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-5xl mb-3">🏠</p>
              <p className="text-lg">Chưa có tài sản nào</p>
              <p className="text-sm mt-1">Thêm tài sản cho thuê để tính thuế</p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.properties.map((prop) => {
                const original = properties.find((p) => p.id === prop.id);
                const isExpanded = expandedProperties.has(prop.id);
                const selectedTax = useActualExpenses ? prop.actualTotalTax : prop.deemedTotalTax;
                const selectedNet = useActualExpenses ? prop.actualNetIncome : prop.deemedNetIncome;

                return (
                  <div
                    key={prop.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                  >
                    {/* Property Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleExpanded(prop.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {prop.type === 'residential' ? '🏠' :
                           prop.type === 'commercial' ? '🏢' :
                           prop.type === 'land' ? '🏞️' :
                           prop.type === 'vehicle' ? '🚗' : '⚙️'}
                        </span>
                        <div>
                          <p className="font-medium text-gray-800">{prop.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(original?.monthlyRent || 0)}/tháng × {prop.occupiedMonths} tháng
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            Doanh thu: <span className="font-medium">{formatCurrency(prop.annualRent)}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-red-600">Thuế: -{formatCurrency(selectedTax)}</span>
                            <span className="text-gray-400 mx-1">|</span>
                            <span className="text-green-600">Thực nhận: {formatCurrency(selectedNet)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); original && handleEditProperty(original); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteProperty(prop.id); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                        <div className="grid sm:grid-cols-2 gap-4 pt-4">
                          {/* Deemed Expense Method */}
                          <div className={`p-3 rounded-lg ${!useActualExpenses ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white border border-gray-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-700">Khoán 10%</span>
                              {result.summary.methodImpactsTax && prop.recommendedMethod === 'deemed' && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  Khuyến nghị
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>Chi phí khoán: {formatCurrency(prop.deemedExpenses)}</p>
                              <p>Thu nhập chịu thuế: {formatCurrency(prop.deemedTaxableIncome)}</p>
                              <p className="text-red-600">Thuế PIT (5%): -{formatCurrency(prop.deemedPIT)}</p>
                              {prop.deemedVAT > 0 && (
                                <p className="text-red-600">VAT (5%): -{formatCurrency(prop.deemedVAT)}</p>
                              )}
                              <p className="font-medium text-green-600 pt-1 border-t">
                                Thực nhận: {formatCurrency(prop.deemedNetIncome)}
                              </p>
                            </div>
                          </div>

                          {/* Actual Expense Method */}
                          <div className={`p-3 rounded-lg ${useActualExpenses ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white border border-gray-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-700">Chi phí thực tế</span>
                              {result.summary.methodImpactsTax && prop.recommendedMethod === 'actual' && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  Khuyến nghị
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>Chi phí thực tế: {formatCurrency(prop.actualExpenses)}</p>
                              <p>Thu nhập chịu thuế: {formatCurrency(prop.actualTaxableIncome)}</p>
                              <p className="text-red-600">Thuế PIT (5%): -{formatCurrency(prop.actualPIT)}</p>
                              {prop.actualVAT > 0 && (
                                <p className="text-red-600">VAT (5%): -{formatCurrency(prop.actualVAT)}</p>
                              )}
                              <p className="font-medium text-green-600 pt-1 border-t">
                                Thực nhận: {formatCurrency(prop.actualNetIncome)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {properties.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Tổng kết thuế cho thuê
          </h3>

          {/* VAT Notice */}
          <div className={`mb-4 p-3 rounded-lg ${
            result.summary.isVATApplicable
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <p className={`text-sm ${result.summary.isVATApplicable ? 'text-amber-700' : 'text-green-700'}`}>
              {result.summary.isVATApplicable ? (
                <>
                  <span className="font-medium">Doanh thu trên {formatCurrency(rentalThreshold)}/năm</span>
                  {' '}– Áp dụng VAT 5% trên doanh thu
                  {year === 2026
                    ? ' và PIT 5% trên phần vượt ngưỡng'
                    : ' và PIT 5% trên doanh thu'}
                </>
              ) : (
                <>
                  <span className="font-medium">Doanh thu dưới {formatCurrency(rentalThreshold)}/năm</span>
                  {' '}– Miễn PIT và VAT
                </>
              )}
            </p>
          </div>

          {/* Comparison */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-xl ${!useActualExpenses ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📊</span>
                <span className="font-semibold text-gray-800">Ước tính chi phí 10%</span>
                {!useActualExpenses && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Đang chọn</span>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng doanh thu:</span>
                  <span className="font-medium">{formatCurrency(result.summary.totalAnnualRent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chi phí khoán:</span>
                  <span>{formatCurrency(result.summary.totalDeemedExpenses)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Tổng thuế:</span>
                  <span className="font-medium">-{formatCurrency(result.summary.totalDeemedTax)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium pt-2 border-t">
                  <span>Thực nhận:</span>
                  <span className="text-lg">{formatCurrency(result.summary.totalDeemedNet)}</span>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl ${useActualExpenses ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📝</span>
                <span className="font-semibold text-gray-800">Chi phí thực tế</span>
                {useActualExpenses && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Đang chọn</span>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng doanh thu:</span>
                  <span className="font-medium">{formatCurrency(result.summary.totalAnnualRent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chi phí thực tế:</span>
                  <span>{formatCurrency(result.summary.totalActualExpenses)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Tổng thuế:</span>
                  <span className="font-medium">-{formatCurrency(result.summary.totalActualTax)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium pt-2 border-t">
                  <span>Thực nhận:</span>
                  <span className="text-lg">{formatCurrency(result.summary.totalActualNet)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Final Summary */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 text-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Tổng doanh thu/năm</p>
                <p className="text-xl font-bold">{formatCurrency(result.summary.totalAnnualRent)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Thuế phải nộp</p>
                <p className="text-xl font-bold text-red-400">
                  -{formatCurrency(useActualExpenses ? result.summary.totalActualTax : result.summary.totalDeemedTax)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Thực nhận/năm</p>
                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(useActualExpenses ? result.summary.totalActualNet : result.summary.totalDeemedNet)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Thuế suất thực tế</p>
                <p className="text-xl font-bold">{result.summary.effectiveTaxRate}%</p>
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
          Thông tin thuế cho thuê tài sản
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Thuế suất</h4>
            <p>
              PIT: 5% {year === 2026
                ? `(phần vượt ${formatCurrency(rentalThreshold)}/năm)`
                : `(doanh thu khi vượt ${formatCurrency(rentalThreshold)}/năm)`}
            </p>
            <p>VAT: 5% (nếu doanh thu &gt; {formatCurrency(rentalThreshold)}/năm)</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Chi phí</h4>
            <p>Thuế tính theo doanh thu, không trừ chi phí.</p>
            <p>Chi phí chỉ dùng để ước tính thu nhập ròng.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Khai thuế</h4>
            <p>Khai theo quý hoặc theo năm</p>
            <p>Nộp tờ khai 01/TK-TNCN</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Ngưỡng VAT</h4>
            <p>Doanh thu ≤ {formatCurrency(rentalThreshold)}/năm: Miễn VAT</p>
            <p>Doanh thu &gt; {formatCurrency(rentalThreshold)}/năm: Nộp VAT 5%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
