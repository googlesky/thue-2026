'use client';

import { useState, useMemo } from 'react';
import {
  RentalProperty,
  PropertyType,
  calculateRentalIncomeTax,
  createEmptyProperty,
  generateId,
  PROPERTY_TYPE_LABELS,
  EXPENSE_CATEGORIES,
} from '@/lib/rentalIncomeTaxCalculator';
import { getRevenueThreshold } from '@/lib/householdBusinessTaxCalculator';
import { formatCurrency, formatNumber } from '@/lib/taxCalculator';

const propertyTypes = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];

export default function RentalIncomeTaxCalculator() {
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [useActualExpenses, setUseActualExpenses] = useState(false);
  const [year, setYear] = useState<2025 | 2026>(2026);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RentalProperty | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  const [propertyForm, setPropertyForm] = useState<RentalProperty>(createEmptyProperty());
  const rentalThreshold = getRevenueThreshold(year);

  const result = useMemo(
    () => calculateRentalIncomeTax({ properties, useActualExpenses, year }),
    [properties, useActualExpenses, year]
  );

  // Handlers
  const handleAddProperty = () => {
    if (!propertyForm.name || !propertyForm.monthlyRent) return;
    const property = { ...propertyForm, occupiedMonths: propertyForm.occupiedMonths || 12 };

    if (editingProperty) {
      setProperties((prev) => prev.map((p) =>
        p.id === editingProperty.id ? { ...property, id: editingProperty.id } : p
      ));
    } else {
      setProperties((prev) => [...prev, { ...property, id: generateId() }]);
    }

    resetPropertyForm();
  };

  const handleDeleteProperty = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleNumberInput = (value: string): number => {
    return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
  };

  // Ô tiền trống khi = 0 để xóa được (không kẹt "0")
  const displayAmount = (value: number) => (value ? formatNumber(value) : '');

  const handleExpenseChange = (key: keyof RentalProperty['expenses'], value: string) => {
    setPropertyForm((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        [key]: handleNumberInput(value),
      },
    }));
  };

  const expenseLabel = useActualExpenses ? 'Chi phí thực tế' : 'Chi phí ước tính 10%';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Thuế cho thuê bất động sản
            </h2>
            <p className="text-gray-600 mt-1">
              Tính thuế cho thuê nhà, căn hộ, mặt bằng, đất của cá nhân
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

        <p className="mb-6 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Không áp dụng cho kinh doanh lưu trú (homestay, nhà nghỉ, cho thuê ngắn ngày kèm dịch vụ: nhóm dịch vụ, TNCN 2%, GTGT 5%)
          và cho thuê xe, máy móc (nhóm cho thuê tài sản khác, được chọn phương pháp thu nhập): tính tại tab{' '}
          <a href="#household-business" className="font-medium text-primary-700 underline">Hộ kinh doanh</a>.
        </p>

        {/* Expense Method Selection */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Cách ước tính chi phí
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
          <p className="mt-3 text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-lg">
            Thuế cho thuê bất động sản tính trên doanh thu, không trừ chi phí và không được chọn phương pháp thu nhập (Luật 109/2025/QH15 Điều 7.4); chi phí chỉ dùng để ước tính thu nhập ròng.
          </p>
        </div>

        {/* Properties List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-2">
            <h3 className="font-semibold text-gray-800">Danh sách bất động sản cho thuê</h3>
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
                    inputMode="numeric"
                    value={displayAmount(propertyForm.monthlyRent)}
                    onChange={(e) => setPropertyForm({
                      ...propertyForm,
                      monthlyRent: handleNumberInput(e.target.value),
                    })}
                    className="input-field"
                    placeholder="15.000.000"
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
                    value={propertyForm.occupiedMonths || ''}
                    onChange={(e) => setPropertyForm({
                      ...propertyForm,
                      occupiedMonths: Math.max(0, Math.min(12, parseInt(e.target.value) || 0)),
                    })}
                    onBlur={() => {
                      if (!propertyForm.occupiedMonths) setPropertyForm({ ...propertyForm, occupiedMonths: 12 });
                    }}
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
                          inputMode="numeric"
                          value={displayAmount(propertyForm.expenses[cat.key])}
                          onChange={(e) => handleExpenseChange(cat.key, e.target.value)}
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
              <p className="text-lg">Chưa có tài sản nào</p>
              <p className="text-sm mt-1">Thêm bất động sản cho thuê để tính thuế</p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.properties.map((prop) => {
                const original = properties.find((p) => p.id === prop.id);
                const isExpanded = expandedProperties.has(prop.id);
                const selectedExpenses = useActualExpenses ? prop.actualExpenses : prop.deemedExpenses;
                const selectedNet = useActualExpenses ? prop.actualNetIncome : prop.deemedNetIncome;

                return (
                  <div
                    key={prop.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                  >
                    {/* Property Header */}
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleExpanded(prop.id)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{prop.name}</p>
                        <p className="text-sm text-gray-500">
                          {PROPERTY_TYPE_LABELS[prop.type]} · {formatCurrency(original?.monthlyRent || 0)}/tháng × {prop.occupiedMonths} tháng
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            Doanh thu: <span className="font-medium">{formatCurrency(prop.annualRent)}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-red-600">Thuế: -{formatCurrency(prop.totalTax)}</span>
                            <span className="text-gray-400 mx-1">|</span>
                            <span className="text-green-600">Thực nhận: {formatCurrency(selectedNet)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); if (original) handleEditProperty(original); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            aria-label="Sửa"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteProperty(prop.id); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            aria-label="Xóa"
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                          <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1 text-sm">
                            <p className="font-medium text-gray-700 mb-1">Thuế</p>
                            {year === 2026 && prop.thresholdDeduction > 0 && (
                              <p>Ngưỡng được trừ: {formatCurrency(prop.thresholdDeduction)}</p>
                            )}
                            <p>Doanh thu tính TNCN: {formatCurrency(prop.taxableIncome)}</p>
                            <p className="text-red-600">TNCN (5%): -{formatCurrency(prop.pit)}</p>
                            {prop.vat > 0 && (
                              <p className="text-red-600">GTGT (5%): -{formatCurrency(prop.vat)}</p>
                            )}
                          </div>
                          <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1 text-sm">
                            <p className="font-medium text-gray-700 mb-1">Thu nhập ròng (ước tính)</p>
                            <p>{expenseLabel}: -{formatCurrency(selectedExpenses)}</p>
                            <p className="font-medium text-green-600 pt-1 border-t">
                              Thực nhận: {formatCurrency(selectedNet)}
                            </p>
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Tổng kết thuế cho thuê
          </h3>

          {/* Threshold Notice */}
          <div className={`mb-4 p-3 rounded-lg ${
            result.summary.isTaxable
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <p className={`text-sm ${result.summary.isTaxable ? 'text-amber-700' : 'text-green-700'}`}>
              {result.summary.isTaxable ? (
                <>
                  <span className="font-medium">Doanh thu trên {formatCurrency(rentalThreshold)}/năm</span>
                  {' '}– GTGT 5% trên toàn bộ doanh thu
                  {year === 2026
                    ? ' và TNCN 5% trên phần doanh thu vượt ngưỡng'
                    : ' và TNCN 5% trên toàn bộ doanh thu'}
                </>
              ) : (
                <>
                  <span className="font-medium">Doanh thu từ {formatCurrency(rentalThreshold)}/năm trở xuống</span>
                  {' '}– Không nộp TNCN, GTGT
                  {year === 2026 && '; thông báo doanh thu (Mẫu 01/TKN-CNKD) chậm nhất 31/01 năm sau'}
                </>
              )}
            </p>
          </div>

          {/* Comparison of expense estimates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {([
              [false, 'Ước tính chi phí 10%', result.summary.totalDeemedExpenses, result.summary.totalDeemedNet],
              [true, 'Chi phí thực tế', result.summary.totalActualExpenses, result.summary.totalActualNet],
            ] as const).map(([isActual, label, expenses, net]) => {
              const selected = useActualExpenses === isActual;
              return (
                <div key={label} className={`p-4 rounded-xl ${selected ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold text-gray-800">{label}</span>
                    {selected && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Đang chọn</span>}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">Tổng doanh thu:</span>
                      <span className="font-medium">{formatCurrency(result.summary.totalAnnualRent)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">Chi phí:</span>
                      <span>{formatCurrency(expenses)}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-red-600">
                      <span>Tổng thuế:</span>
                      <span className="font-medium">-{formatCurrency(result.summary.totalTax)}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-green-600 font-medium pt-2 border-t">
                      <span>Thực nhận:</span>
                      <span className="text-lg">{formatCurrency(net)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
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
                  -{formatCurrency(result.summary.totalTax)}
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
                <p className="text-xl font-bold">{result.summary.effectiveTaxRate.toLocaleString('vi-VN')}%</p>
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
          Thông tin thuế cho thuê bất động sản
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Thuế suất</h4>
            <p>
              TNCN 5% {year === 2026
                ? `trên phần doanh thu vượt ${formatCurrency(rentalThreshold)}/năm`
                : `trên toàn bộ doanh thu khi vượt ${formatCurrency(rentalThreshold)}/năm`}
            </p>
            <p>GTGT 5% trên toàn bộ doanh thu khi vượt {formatCurrency(rentalThreshold)}/năm</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Nhiều bất động sản</h4>
            <p>
              Mức trừ {formatCurrency(getRevenueThreshold(2026))} áp dụng cho một hoặc một số hợp đồng do bạn chọn, tổng không quá {formatCurrency(getRevenueThreshold(2026))}/năm (NĐ 68/2026/NĐ-CP Điều 4.4).
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Khai thuế</h4>
            <p>Khai 2 lần/năm (hạn 31/7 và 31/01 năm sau) hoặc 1 lần/năm (hạn 31/01 năm sau).</p>
            <p>Mẫu 01/BĐS kèm Phụ lục 01/BK-BĐS, nộp tại cơ quan thuế nơi có bất động sản (NĐ 68/2026/NĐ-CP Điều 8.3.d, 8.4.d; TT 18/2026/TT-BTC).</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Tổ chức đi thuê khai thay</h4>
            <p>Nếu hợp đồng thỏa thuận bên thuê là tổ chức khai thay, nộp thay thì tổ chức khai theo kỳ thanh toán tiền thuê (NĐ 68/2026/NĐ-CP Điều 8.3.đ). Cá nhân cho cá nhân thuê phải tự khai.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
