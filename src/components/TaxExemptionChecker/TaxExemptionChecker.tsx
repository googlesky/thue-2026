'use client';

import { useState, useMemo } from 'react';
import {
  ExemptionCategory,
  ExemptionCheckInput,
  ExemptionCheckResult,
  checkExemption,
  getExemptionRule,
  getNew2026Exemptions,
  getOriginalExemptions,
  searchExemptions,
  EXEMPTION_RULES,
} from '@/lib/taxExemptionChecker';
import { formatCurrency, formatDate, parseCurrency } from '@/lib/taxCalculator';

type ViewMode = 'list' | 'check';

export function TaxExemptionChecker() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNew2026Only, setShowNew2026Only] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ExemptionCategory | null>(null);
  const [incomeAmount, setIncomeAmount] = useState(0);
  const [excessAmount, setExcessAmount] = useState(0);
  const [conditionAnswers, setConditionAnswers] = useState<
    Record<string, boolean>
  >({});
  const [checkResult, setCheckResult] = useState<ExemptionCheckResult | null>(
    null
  );

  // Filtered exemptions
  const filteredExemptions = useMemo(() => {
    let rules = EXEMPTION_RULES;

    // Filter by new 2026 only
    if (showNew2026Only) {
      rules = rules.filter((r) => r.isNew2026);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      rules = searchExemptions(searchTerm);
      if (showNew2026Only) {
        rules = rules.filter((r) => r.isNew2026);
      }
    }

    return rules;
  }, [searchTerm, showNew2026Only]);

  // Get selected rule
  const selectedRule = useMemo(() => {
    if (!selectedCategory) return null;
    return getExemptionRule(selectedCategory);
  }, [selectedCategory]);

  // Handle category selection
  const handleCategorySelect = (category: ExemptionCategory) => {
    setSelectedCategory(category);
    setConditionAnswers({});
    setExcessAmount(0);
    setCheckResult(null);
  };

  // Handle condition toggle (key: condition_<i> hoặc case_<i>)
  const handleConditionToggle = (key: string) => {
    setConditionAnswers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle check
  const handleCheck = () => {
    if (!selectedCategory) return;

    const input: ExemptionCheckInput = {
      category: selectedCategory,
      incomeAmount,
      answers: conditionAnswers,
      excessAmount,
    };

    const result = checkExemption(input);
    setCheckResult(result);
  };

  // Reset check
  const resetCheck = () => {
    setSelectedCategory(null);
    setIncomeAmount(0);
    setExcessAmount(0);
    setConditionAnswers({});
    setCheckResult(null);
    setViewMode('list');
  };

  // Status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'exempt':
        return 'Được miễn thuế';
      case 'partial':
        return 'Miễn thuế một phần';
      case 'needs_review':
        return 'Cần xem xét thêm';
      default:
        return 'Không được miễn';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          Kiểm tra miễn thuế TNCN
        </h2>
        <p className="text-purple-100">
          Thu nhập miễn thuế theo Điều 4, Điều 5 Luật Thuế TNCN 109/2025/QH15 (NĐ 253/2026/NĐ-CP) và các khoản
          không tính vào thu nhập chịu thuế
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600">
            {EXEMPTION_RULES.length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">
            Khoản tra cứu
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600">
            {getOriginalExemptions().length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">
            Có từ trước
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-green-600">
            {getNew2026Exemptions().length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">
            Mới 2026
          </div>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Danh sách miễn thuế
        </button>
        <button
          onClick={() => setViewMode('check')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'check'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Kiểm tra điều kiện
        </button>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Search and filter */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm khoản miễn thuế..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showNew2026"
                checked={showNew2026Only}
                onChange={(e) => setShowNew2026Only(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label
                htmlFor="showNew2026"
                className="text-sm text-gray-700"
              >
                Chỉ hiện quy định mới, mở rộng 2026
              </label>
            </div>
          </div>

          {/* New 2026 banner */}
          {!showNew2026Only && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
              <h3 className="font-bold mb-2">
                {getNew2026Exemptions().length} khoản miễn thuế mới hoặc mở rộng theo Luật 109/2025/QH15
              </h3>
              <div className="flex flex-wrap gap-2">
                {getNew2026Exemptions().map((rule) => (
                  <span
                    key={rule.id}
                    className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-sm"
                  >
                    {rule.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Exemption list */}
          <div className="space-y-3">
            {filteredExemptions.map((rule) => (
              <div
                key={rule.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {rule.name}
                      </h3>
                      {rule.isNew2026 && (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 whitespace-nowrap">
                          Mới 2026
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {rule.description}
                    </p>
                    <div className="text-xs text-gray-500">
                      {rule.legalReference}
                      {rule.effectiveFrom && ` · áp dụng từ ${formatDate(rule.effectiveFrom)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleCategorySelect(rule.id);
                      setViewMode('check');
                    }}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors shrink-0"
                  >
                    Kiểm tra
                  </button>
                </div>

                {/* Conditions preview */}
                {[
                  { title: 'Điều kiện:', items: rule.conditions },
                  { title: 'Thuộc một trong các trường hợp:', items: rule.anyOf ?? [] },
                ]
                  .filter((group) => group.items.length > 0)
                  .map((group) => (
                    <div key={group.title} className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        {group.title}
                      </div>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {group.items.slice(0, 3).map((cond, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-purple-500">•</span>
                            {cond}
                          </li>
                        ))}
                        {group.items.length > 3 && (
                          <li className="text-purple-600">
                            +{group.items.length - 3} mục khác...
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
              </div>
            ))}

            {filteredExemptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Không tìm thấy khoản miễn thuế phù hợp
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check View */}
      {viewMode === 'check' && (
        <div className="space-y-4">
          {/* Category selector */}
          {!selectedCategory && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Chọn khoản miễn thuế để kiểm tra
              </h3>
              <select
                value=""
                onChange={(e) =>
                  handleCategorySelect(e.target.value as ExemptionCategory)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Chọn loại miễn thuế --</option>
                <optgroup label="Có từ trước 2026">
                  {getOriginalExemptions().map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Mới hoặc mở rộng theo Luật 109/2025/QH15">
                  {getNew2026Exemptions().map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name} (Mới)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Check form */}
          {selectedRule && !checkResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedRule.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedRule.description}
                  </p>
                </div>
                {selectedRule.isNew2026 && (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium shrink-0">
                    Mới 2026
                  </span>
                )}
              </div>

              {/* Income amount */}
              <div className="mb-6">
                <label htmlFor="exemption-income" className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền thu nhập (VNĐ)
                </label>
                <input
                  id="exemption-income"
                  type="text"
                  value={incomeAmount > 0 ? incomeAmount.toLocaleString('vi-VN') : ''}
                  onChange={(e) =>
                    setIncomeAmount(parseCurrency(e.target.value))
                  }
                  placeholder="Nhập số tiền thu nhập"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Conditions checklist */}
              {[
                { title: 'Đáp ứng tất cả các điều kiện:', prefix: 'condition', items: selectedRule.conditions },
                { title: 'Thuộc ít nhất một trường hợp:', prefix: 'case', items: selectedRule.anyOf ?? [] },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.prefix} className="mb-6">
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      {group.title}
                    </div>
                    <div className="space-y-3">
                      {group.items.map((condition, index) => {
                        const key = `${group.prefix}_${index}`;
                        return (
                          <label
                            key={key}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                          >
                            <input
                              type="checkbox"
                              checked={conditionAnswers[key] || false}
                              onChange={() => handleConditionToggle(key)}
                              className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">
                              {condition}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* Phần vượt mức luật định (chịu thuế) */}
              {selectedRule.excessLabel && (
                <div className="mb-6">
                  <label htmlFor="exemption-excess" className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedRule.excessLabel}
                  </label>
                  <input
                    id="exemption-excess"
                    type="text"
                    inputMode="numeric"
                    value={excessAmount > 0 ? excessAmount.toLocaleString('vi-VN') : ''}
                    onChange={(e) => setExcessAmount(parseCurrency(e.target.value))}
                    placeholder="Để trống nếu không vượt mức"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Required documents */}
              <div className="mb-6 bg-amber-50 rounded-lg p-4">
                <div className="text-sm font-medium text-amber-800 mb-2">
                  Hồ sơ cần chuẩn bị:
                </div>
                <ul className="text-sm text-amber-700 space-y-1">
                  {selectedRule.requiredDocuments.map((doc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span>•</span>
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCheck}
                  disabled={incomeAmount <= 0}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Kiểm tra điều kiện
                </button>
                <button
                  onClick={resetCheck}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Đổi loại
                </button>
              </div>
            </div>
          )}

          {/* Check result */}
          {checkResult && (
            <div className="space-y-4">
              {/* Result card */}
              <div
                className={`rounded-xl border-2 p-6 ${
                  checkResult.status === 'exempt'
                    ? 'border-green-500 bg-green-50'
                    : checkResult.status === 'partial'
                    ? 'border-amber-500 bg-amber-50'
                    : checkResult.status === 'needs_review'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      checkResult.status === 'exempt'
                        ? 'bg-green-500 text-white'
                        : checkResult.status === 'partial'
                        ? 'bg-amber-500 text-white'
                        : checkResult.status === 'needs_review'
                        ? 'bg-blue-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {checkResult.status === 'exempt'
                      ? '✓'
                      : checkResult.status === 'partial'
                      ? '½'
                      : checkResult.status === 'needs_review'
                      ? '?'
                      : '✕'}
                  </div>
                  <div>
                    <div
                      className={`font-bold text-xl ${
                        checkResult.status === 'exempt'
                          ? 'text-green-700'
                          : checkResult.status === 'partial'
                          ? 'text-amber-700'
                          : checkResult.status === 'needs_review'
                          ? 'text-blue-700'
                          : 'text-red-700'
                      }`}
                    >
                      {getStatusLabel(checkResult.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {checkResult.categoryName}
                    </div>
                  </div>
                </div>

                <p
                  className={`text-sm mb-4 ${
                    checkResult.status === 'exempt'
                      ? 'text-green-700'
                      : checkResult.status === 'partial'
                      ? 'text-amber-700'
                      : checkResult.status === 'needs_review'
                      ? 'text-blue-700'
                      : 'text-red-700'
                  }`}
                >
                  {checkResult.explanation}
                </p>

                {/* Amount breakdown */}
                <div className="bg-white rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Thu nhập:
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(incomeAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Số tiền được miễn:
                    </span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(checkResult.exemptAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-800 font-medium">
                      Số tiền chịu thuế:
                    </span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(checkResult.taxableAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conditions check */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Kết quả kiểm tra điều kiện
                </h4>
                <div className="space-y-2">
                  {checkResult.conditions.map((cond, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 p-2 rounded-lg ${
                        cond.met
                          ? 'bg-green-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          cond.met
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {cond.met ? '✓' : '?'}
                      </span>
                      <div>
                        <div
                          className={`text-sm ${
                            cond.met
                              ? 'text-green-700'
                              : 'text-gray-600'
                          }`}
                        >
                          {cond.condition}
                        </div>
                        {cond.note && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {cond.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal reference */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <strong>Căn cứ pháp lý:</strong> {checkResult.legalReference}
              </div>

              {/* Action */}
              <button
                onClick={resetCheck}
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Kiểm tra khoản miễn thuế khác
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info footer */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Lưu ý:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>
            Kết quả chỉ mang tính tham khảo, cần xác nhận với cơ quan thuế
          </li>
          <li>
            Cần chuẩn bị đầy đủ hồ sơ chứng minh theo quy định
          </li>
          <li>
            Luật Thuế TNCN 109/2025/QH15 có hiệu lực từ 01/7/2026; quy định về tiền lương, tiền công áp dụng từ
            kỳ tính thuế 2026 (01/01/2026)
          </li>
        </ul>
      </div>
    </div>
  );
}

export default TaxExemptionChecker;
