'use client';

import React, { useState, useMemo } from 'react';
import {
  ExemptionCategory,
  ExemptionRule,
  ExemptionCheckInput,
  ExemptionCheckResult,
  checkExemption,
  getExemptionRule,
  getNew2026Exemptions,
  getOriginalExemptions,
  searchExemptions,
  formatCurrency,
  EXEMPTION_RULES,
} from '@/lib/taxExemptionChecker';

type ViewMode = 'list' | 'check';

export function TaxExemptionChecker() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNew2026Only, setShowNew2026Only] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ExemptionCategory | null>(null);
  const [incomeAmount, setIncomeAmount] = useState(0);
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
    setCheckResult(null);
  };

  // Handle condition toggle
  const handleConditionToggle = (index: number) => {
    setConditionAnswers((prev) => ({
      ...prev,
      [`condition_${index}`]: !prev[`condition_${index}`],
    }));
  };

  // Handle check
  const handleCheck = () => {
    if (!selectedCategory) return;

    const input: ExemptionCheckInput = {
      category: selectedCategory,
      incomeAmount,
      answers: conditionAnswers,
    };

    const result = checkExemption(input);
    setCheckResult(result);
  };

  // Reset check
  const resetCheck = () => {
    setSelectedCategory(null);
    setIncomeAmount(0);
    setConditionAnswers({});
    setCheckResult(null);
    setViewMode('list');
  };

  // Format number input
  const formatNumberInput = (value: string): number => {
    const num = value.replace(/[^\d]/g, '');
    return parseInt(num, 10) || 0;
  };

  // Status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exempt':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'needs_review':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-red-100 text-red-800';
    }
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
          21 khoản thu nhập được miễn thuế theo Luật Thuế TNCN sửa đổi 2025
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">
            21
          </div>
          <div className="text-sm text-gray-600">
            Khoản miễn thuế
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">
            {getOriginalExemptions().length}
          </div>
          <div className="text-sm text-gray-600">
            Từ 2007
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {getNew2026Exemptions().length}
          </div>
          <div className="text-sm text-gray-600">
            Mới 2026
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">
            100%
          </div>
          <div className="text-sm text-gray-600">
            Miễn thuế
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
                Chỉ hiện quy định mới 2026
              </label>
            </div>
          </div>

          {/* New 2026 banner */}
          {!showNew2026Only && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
              <h3 className="font-bold mb-2">
                5 khoản miễn thuế MỚI từ 01/01/2026
              </h3>
              <div className="flex flex-wrap gap-2">
                {getNew2026Exemptions().map((rule) => (
                  <span
                    key={rule.id}
                    className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm"
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
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          Mới 2026
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {rule.description}
                    </p>
                    <div className="text-xs text-gray-500">
                      {rule.legalReference}
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
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Điều kiện:
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {rule.conditions.slice(0, 3).map((cond, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-purple-500">•</span>
                        {cond}
                      </li>
                    ))}
                    {rule.conditions.length > 3 && (
                      <li className="text-purple-600">
                        +{rule.conditions.length - 3} điều kiện khác...
                      </li>
                    )}
                  </ul>
                </div>
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
                <optgroup label="Quy định từ 2007">
                  {getOriginalExemptions().map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Quy định mới 2026">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền thu nhập (VNĐ)
                </label>
                <input
                  type="text"
                  value={incomeAmount > 0 ? incomeAmount.toLocaleString('vi-VN') : ''}
                  onChange={(e) =>
                    setIncomeAmount(formatNumberInput(e.target.value))
                  }
                  placeholder="Nhập số tiền thu nhập"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Conditions checklist */}
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-700 mb-3">
                  Kiểm tra các điều kiện:
                </div>
                <div className="space-y-3">
                  {selectedRule.conditions.map((condition, index) => (
                    <label
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={conditionAnswers[`condition_${index}`] || false}
                        onChange={() => handleConditionToggle(index)}
                        className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">
                        {condition}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

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
                        : checkResult.status === 'needs_review'
                        ? 'bg-blue-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {checkResult.status === 'exempt'
                      ? '✓'
                      : checkResult.status === 'needs_review'
                      ? '?'
                      : '✕'}
                  </div>
                  <div>
                    <div
                      className={`font-bold text-xl ${
                        checkResult.status === 'exempt'
                          ? 'text-green-700'
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
            Quy định mới 2026 có hiệu lực từ ngày 01/01/2026
          </li>
        </ul>
      </div>
    </div>
  );
}

export default TaxExemptionChecker;
