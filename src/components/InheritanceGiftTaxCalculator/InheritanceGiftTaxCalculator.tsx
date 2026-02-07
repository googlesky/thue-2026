'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import {
  TransactionType,
  Relationship,
  AssetType,
  AssetInfo,
  InheritanceGiftTaxInput,
  InheritanceGiftTaxResult,
  calculateInheritanceGiftTax,
  isExemptRelationship,
  getRelationshipLabel,
  getAssetTypeLabel,
  getTransactionTypeLabel,
  getAllRelationships,
  getAllAssetTypes,
  INHERITANCE_GIFT_TAX_THRESHOLD,
  INHERITANCE_GIFT_TAX_RATE,
} from '@/lib/inheritanceGiftTaxCalculator';
import { formatNumber } from '@/lib/taxCalculator';

// ===== ICONS =====

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

// ===== ASSET INPUT COMPONENT =====

interface AssetInputProps {
  asset: AssetInfo;
  index: number;
  onUpdate: (index: number, asset: AssetInfo) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function AssetInput({ asset, index, onUpdate, onRemove, canRemove }: AssetInputProps) {
  const assetTypes = getAllAssetTypes();

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-sm font-medium text-gray-700">
          Tài sản #{index + 1}
        </span>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label="Xóa tài sản"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Loại tài sản</label>
          <select
            value={asset.type}
            onChange={(e) => onUpdate(index, { ...asset, type: e.target.value as AssetType })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
          >
            {assetTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Giá trị (VNĐ)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={asset.value === 0 ? '' : formatNumber(asset.value)}
            onChange={(e) => {
              const value = parseInt(e.target.value.replace(/[,.]/g, '')) || 0;
              onUpdate(index, { ...asset, value });
            }}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
            placeholder="VD: 500,000,000"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-xs text-gray-500 mb-1">
          Mô tả (tùy chọn)
        </label>
        <input
          type="text"
          value={asset.description || ''}
          onChange={(e) => onUpdate(index, { ...asset, description: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
          placeholder="VD: Căn hộ 70m2 tại Q.7"
        />
      </div>
    </div>
  );
}

// ===== RESULT DISPLAY COMPONENT =====

interface ResultDisplayProps {
  result: InheritanceGiftTaxResult;
  transactionType: TransactionType;
}

function ResultDisplay({ result, transactionType }: ResultDisplayProps) {
  const [showDocuments, setShowDocuments] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main Result Card */}
      <div
        className={`p-4 rounded-lg border ${
          result.isExempt
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {result.isExempt ? (
            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
          ) : (
            <ExclamationIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h4
              className={`font-semibold ${
                result.isExempt
                  ? 'text-green-800'
                  : 'text-amber-800'
              }`}
            >
              {result.isExempt ? 'Miễn thuế' : 'Phải nộp thuế'}
            </h4>
            {result.exemptReason && (
              <p
                className={`text-sm mt-1 ${
                  result.isExempt
                    ? 'text-green-700'
                    : 'text-amber-700'
                }`}
              >
                {result.exemptReason}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500">Tổng giá trị</div>
          <div className="font-semibold text-gray-800">
            {formatNumber(result.totalValue)} VNĐ
          </div>
        </div>
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500">Ngưỡng miễn thuế</div>
          <div className="font-semibold text-gray-800">
            {formatNumber(INHERITANCE_GIFT_TAX_THRESHOLD)} VNĐ
          </div>
        </div>
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500">Thu nhập chịu thuế</div>
          <div className="font-semibold text-gray-800">
            {formatNumber(result.taxableAmount)} VNĐ
          </div>
        </div>
        <div
          className={`p-3 rounded-lg border ${
            result.taxAmount > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}
        >
          <div
            className={`text-xs ${
              result.taxAmount > 0
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            Thuế phải nộp
          </div>
          <div
            className={`font-bold text-lg ${
              result.taxAmount > 0
                ? 'text-red-700'
                : 'text-green-700'
            }`}
          >
            {formatNumber(result.taxAmount)} VNĐ
          </div>
          {result.effectiveRate > 0 && (
            <div className="text-xs text-red-600">
              (Thuế suất thực: {result.effectiveRate.toFixed(1)}%)
            </div>
          )}
        </div>
      </div>

      {/* Deadline */}
      {result.declarationDeadline && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700">
            <DocumentIcon className="w-5 h-5" />
            <span className="text-sm">
              <strong>Hạn khai thuế:</strong>{' '}
              {result.declarationDeadline.toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      )}

      {/* Notes */}
      {result.notes.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="font-medium text-gray-800 mb-2">Lưu ý:</h5>
          <ul className="space-y-1">
            {result.notes.map((note, index) => (
              <li key={index} className="text-sm text-gray-600 flex gap-2">
                <span className="text-gray-400">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Required Documents (Collapsible) */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowDocuments(!showDocuments)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="font-medium text-gray-800">
            Hồ sơ cần chuẩn bị ({result.requiredDocuments.length} loại)
          </span>
          {showDocuments ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {showDocuments && (
          <div className="p-4 bg-white">
            <ul className="space-y-2">
              {result.requiredDocuments.map((doc, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====

function InheritanceGiftTaxCalculatorComponent() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [transactionType, setTransactionType] = useState<TransactionType>('gift');
  const [relationship, setRelationship] = useState<Relationship>('non_relative');
  const [assets, setAssets] = useState<AssetInfo[]>([{ type: 'cash', value: 0 }]);
  const [transactionDate, setTransactionDate] = useState<string>('');

  const relationships = getAllRelationships();

  // Add asset
  const addAsset = useCallback(() => {
    setAssets((prev) => [...prev, { type: 'cash', value: 0 }]);
  }, []);

  // Update asset
  const updateAsset = useCallback((index: number, asset: AssetInfo) => {
    setAssets((prev) => prev.map((a, i) => (i === index ? asset : a)));
  }, []);

  // Remove asset
  const removeAsset = useCallback((index: number) => {
    setAssets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Calculate result
  const result = useMemo<InheritanceGiftTaxResult | null>(() => {
    const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
    if (totalValue === 0) return null;

    const input: InheritanceGiftTaxInput = {
      transactionType,
      relationship,
      assets,
      transactionDate: transactionDate ? new Date(transactionDate) : undefined,
    };

    return calculateInheritanceGiftTax(input);
  }, [transactionType, relationship, assets, transactionDate]);

  // Check if relationship is exempt
  const isExempt = isExemptRelationship(relationship);

  return (
    <div className="card bg-gradient-to-br from-purple-50/50 to-pink-50/30 border border-purple-100">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md shadow-purple-200/50">
            <GiftIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Thuế thừa kế & Quà tặng
            </h3>
            <p className="text-sm text-gray-600">
              Tính thuế thu nhập từ tài sản thừa kế, quà tặng
            </p>
          </div>
        </div>
        <div className="text-gray-400">
          {isCollapsed ? (
            <ChevronDownIcon className="w-6 h-6" />
          ) : (
            <ChevronUpIcon className="w-6 h-6" />
          )}
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="mt-6 space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại giao dịch
            </label>
            <div className="flex gap-3">
              {(['inheritance', 'gift'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTransactionType(type)}
                  className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    transactionType === type
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {getTransactionTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quan hệ với người {transactionType === 'inheritance' ? 'để lại' : 'tặng'}
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as Relationship)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800"
            >
              {relationships.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} {r.isExempt ? '(Miễn thuế)' : ''}
                </option>
              ))}
            </select>
            {isExempt && (
              <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                <CheckCircleIcon className="w-4 h-4" />
                Quan hệ này được miễn thuế hoàn toàn theo Điều 4, Khoản 4 Luật Thuế TNCN
              </p>
            )}
          </div>

          {/* Transaction Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngày phát sinh (tùy chọn)
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800"
            />
            <p className="mt-1 text-xs text-gray-500">
              Dùng để tính hạn khai thuế (10 ngày kể từ ngày phát sinh)
            </p>
          </div>

          {/* Assets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Tài sản nhận được
              </label>
              <button
                onClick={addAsset}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Thêm tài sản
              </button>
            </div>
            <div className="space-y-3">
              {assets.map((asset, index) => (
                <AssetInput
                  key={index}
                  asset={asset}
                  index={index}
                  onUpdate={updateAsset}
                  onRemove={removeAsset}
                  canRemove={assets.length > 1}
                />
              ))}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="pt-4 border-t border-purple-200/50">
              <h4 className="font-semibold text-gray-800 mb-4">Kết quả tính thuế</h4>
              <ResultDisplay result={result} transactionType={transactionType} />
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="font-medium text-blue-800 mb-2">
              Quy định thuế thừa kế/quà tặng
            </h5>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>
                • <strong>Miễn thuế hoàn toàn:</strong> Tài sản từ vợ/chồng, cha mẹ-con cái, ông bà-cháu, anh chị em ruột
              </li>
              <li>
                • <strong>Ngưỡng miễn thuế:</strong> {formatNumber(INHERITANCE_GIFT_TAX_THRESHOLD)} VNĐ cho quan hệ khác
              </li>
              <li>
                • <strong>Thuế suất:</strong> {INHERITANCE_GIFT_TAX_RATE * 100}% trên phần vượt ngưỡng
              </li>
              <li>
                • <strong>Căn cứ:</strong> Điều 3, 4, 23 Luật Thuế TNCN; NĐ 65/2013/NĐ-CP
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="pt-3 border-t border-purple-200/50">
            <p className="text-xs text-gray-500 italic text-center">
              Đây chỉ là tính toán tham khảo. Vui lòng liên hệ cơ quan thuế hoặc tư vấn chuyên gia để được hướng dẫn cụ thể.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(InheritanceGiftTaxCalculatorComponent);
