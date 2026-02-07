'use client';

import { useState, useMemo } from 'react';
import {
  getTreatyCountries,
  getTreaty,
  check183DayRule,
  calculateWithholdingWithTreaty,
  getRequiredDocuments,
  formatCurrency,
  type TaxTreaty,
} from '@/lib/taxTreatyData';
import { TaxTreatyTabState, DEFAULT_TAX_TREATY_STATE } from '@/lib/snapshotTypes';

interface TaxTreatyReferenceProps {
  tabState: TaxTreatyTabState;
  onTabStateChange: (state: TaxTreatyTabState) => void;
}

const INCOME_TYPE_LABELS = {
  dividends: 'Cổ tức',
  interest: 'Lãi',
  royalties: 'Bản quyền',
};

export function TaxTreatyReference({ tabState, onTabStateChange }: TaxTreatyReferenceProps) {
  // Country list
  const countries = useMemo(() => getTreatyCountries(), []);

  // Selected treaty
  const treaty = useMemo(() => {
    return tabState.selectedCountry ? getTreaty(tabState.selectedCountry) : null;
  }, [tabState.selectedCountry]);

  // 183-day check
  const dayCheck = useMemo(() => {
    if (!tabState.selectedCountry || tabState.daysInVietnam === 0) return null;
    return check183DayRule(tabState.selectedCountry, tabState.daysInVietnam);
  }, [tabState.selectedCountry, tabState.daysInVietnam]);

  // Withholding calculation
  const withholdingCalc = useMemo(() => {
    if (!tabState.selectedCountry || tabState.incomeAmount === 0) return null;
    return calculateWithholdingWithTreaty(
      tabState.selectedCountry,
      tabState.incomeType,
      tabState.incomeAmount,
      tabState.isQualifiedDividend
    );
  }, [tabState.selectedCountry, tabState.incomeType, tabState.incomeAmount, tabState.isQualifiedDividend]);

  // Required documents
  const requiredDocs = useMemo(() => {
    if (!tabState.selectedCountry) return [];
    return getRequiredDocuments(tabState.selectedCountry);
  }, [tabState.selectedCountry]);

  // Update single field
  const updateField = <K extends keyof TaxTreatyTabState>(
    field: K,
    value: TaxTreatyTabState[K]
  ) => {
    onTabStateChange({ ...tabState, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Hiệp định tránh đánh thuế hai lần
        </h2>
        <p className="text-sm text-gray-600">
          Tra cứu thông tin hiệp định thuế giữa Việt Nam và các quốc gia khác để tối ưu thuế thu nhập.
        </p>
      </div>

      {/* Country Selection */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-md font-medium text-gray-900 mb-4">
          Chọn quốc gia
        </h3>

        <select
          value={tabState.selectedCountry}
          onChange={(e) => updateField('selectedCountry', e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
        >
          <option value="">-- Chọn quốc gia --</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.nameEn})
            </option>
          ))}
        </select>
      </div>

      {/* Treaty Details */}
      {treaty && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Hiệp định với {treaty.countryName}
          </h3>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Ngày ký:</span>
                <span className="ml-2 font-medium">{formatDate(treaty.signDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">Có hiệu lực:</span>
                <span className="ml-2 font-medium">{formatDate(treaty.effectiveDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">Trạng thái:</span>
                <span className={`ml-2 font-medium ${treaty.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {treaty.status === 'active' ? 'Đang hiệu lực' : 'Chờ hiệu lực'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Phương pháp:</span>
                <span className="ml-2 font-medium">
                  {treaty.method === 'credit' ? 'Khấu trừ thuế' : 'Miễn thuế'}
                </span>
              </div>
            </div>

            {/* Tax Rates Table */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Thuế suất tối đa theo hiệp định
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium">Loại thu nhập</th>
                      <th className="text-center py-2 px-3 font-medium">Thuế suất VN</th>
                      <th className="text-center py-2 px-3 font-medium">Theo hiệp định</th>
                      <th className="text-left py-2 px-3 font-medium">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-2 px-3">Cổ tức</td>
                      <td className="py-2 px-3 text-center">5%</td>
                      <td className="py-2 px-3 text-center font-medium text-blue-600">
                        {treaty.rates.dividends.qualified
                          ? `${treaty.rates.dividends.qualified}% - ${treaty.rates.dividends.standard}%`
                          : `${treaty.rates.dividends.standard}%`
                        }
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">
                        {treaty.rates.dividends.note || (treaty.rates.dividends.qualified
                          ? `${treaty.rates.dividends.qualified}% nếu góp >= ${treaty.rates.dividends.qualifiedThreshold}%`
                          : ''
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Lãi tiền vay/gửi</td>
                      <td className="py-2 px-3 text-center">5%</td>
                      <td className="py-2 px-3 text-center font-medium text-blue-600">
                        {treaty.rates.interest.standard}%
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">
                        {treaty.rates.interest.note || 'TPCP: 0%'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Bản quyền</td>
                      <td className="py-2 px-3 text-center">5%</td>
                      <td className="py-2 px-3 text-center font-medium text-blue-600">
                        {treaty.rates.royalties.standard}%
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">
                        {treaty.rates.royalties.note || ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Special Provisions */}
            {treaty.specialProvisions && treaty.specialProvisions.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  Điều khoản đặc biệt
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {treaty.specialProvisions.map((provision, idx) => (
                    <li key={idx}>• {provision}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 183-Day Rule Calculator */}
      {treaty && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Kiểm tra quy tắc 183 ngày
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số ngày có mặt tại Việt Nam
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={tabState.daysInVietnam === 0 ? '' : tabState.daysInVietnam}
                onChange={(e) => updateField('daysInVietnam', parseInt(e.target.value) || 0)}
                placeholder="Nhập số ngày..."
                className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
              />
            </div>

            {dayCheck && (
              <div className={`p-4 rounded-lg ${dayCheck.eligible
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xl ${dayCheck.eligible ? 'text-green-600' : 'text-red-600'}`}>
                    {dayCheck.eligible ? '✓' : '✗'}
                  </span>
                  <span className={`font-medium ${dayCheck.eligible
                    ? 'text-green-700'
                    : 'text-red-700'
                  }`}>
                    {dayCheck.eligible ? 'Có thể được miễn thuế' : 'Phải nộp thuế tại Việt Nam'}
                  </span>
                </div>
                <p className={`text-sm ${dayCheck.eligible
                  ? 'text-green-600'
                  : 'text-red-600'
                }`}>
                  {dayCheck.explanation}
                </p>
                {dayCheck.eligible && dayCheck.daysRemaining > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    Còn có thể ở thêm {dayCheck.daysRemaining} ngày trong kỳ tính thuế.
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p className="font-medium">Lưu ý về quy tắc 183 ngày:</p>
              <ul className="mt-1 space-y-1">
                <li>• Ngưỡng {treaty.employment.daysThreshold} ngày theo hiệp định với {treaty.countryName}</li>
                <li>• Tính theo {treaty.employment.period === 'calendar' ? 'năm dương lịch' : 'bất kỳ giai đoạn 12 tháng nào'}</li>
                <li>• Cần xét thêm các điều kiện khác: nơi cư trú, người sử dụng lao động...</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Withholding Tax Calculator */}
      {treaty && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Tính thuế khấu trừ theo hiệp định
          </h3>

          <div className="space-y-4">
            {/* Income Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại thu nhập
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['dividends', 'interest', 'royalties'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateField('incomeType', type)}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors
                      ${tabState.incomeType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {INCOME_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Qualified Dividend Option */}
            {tabState.incomeType === 'dividends' && treaty.rates.dividends.qualified && (
              <label className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={tabState.isQualifiedDividend}
                  onChange={(e) => updateField('isQualifiedDividend', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Góp vốn {'>='} {treaty.rates.dividends.qualifiedThreshold}% (thuế suất ưu đãi {treaty.rates.dividends.qualified}%)
                </span>
              </label>
            )}

            {/* Income Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số tiền (VND)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={tabState.incomeAmount === 0 ? '' : tabState.incomeAmount.toLocaleString('vi-VN')}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  updateField('incomeAmount', value ? parseInt(value, 10) : 0);
                }}
                placeholder="Nhập số tiền..."
                className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
              />
            </div>

            {/* Results */}
            {withholdingCalc && tabState.incomeAmount > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Thuế suất VN</div>
                    <div className="font-medium">{(withholdingCalc.domesticRate * 100).toFixed(0)}%</div>
                    <div className="text-sm text-red-600">{formatCurrency(withholdingCalc.domesticTax)}</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 mb-1">Theo hiệp định</div>
                    <div className="font-medium text-blue-700">
                      {(withholdingCalc.treatyRate * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-blue-600">{formatCurrency(withholdingCalc.treatyTax)}</div>
                  </div>
                </div>

                {withholdingCalc.savings > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">💰</span>
                      <span className="font-medium text-green-700">
                        Tiết kiệm: {formatCurrency(withholdingCalc.savings)}
                      </span>
                    </div>
                  </div>
                )}

                {withholdingCalc.notes.length > 0 && (
                  <ul className="text-xs text-gray-500 space-y-1">
                    {withholdingCalc.notes.map((note, idx) => (
                      <li key={idx}>• {note}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Required Documents */}
      {treaty && requiredDocs.length > 0 && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Hồ sơ cần thiết để áp dụng hiệp định
          </h3>

          <ul className="space-y-2">
            {requiredDocs.map((doc, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-0.5">📋</span>
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legal Reference */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium mb-2">Lưu ý quan trọng:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Thông tin trên chỉ mang tính tham khảo, không thay thế tư vấn chuyên môn</li>
          <li>Cần kiểm tra văn bản hiệp định gốc để xác định điều kiện áp dụng cụ thể</li>
          <li>Việc áp dụng hiệp định cần có hồ sơ đầy đủ và được cơ quan thuế chấp thuận</li>
          <li>Nguồn: Bộ Tài chính Việt Nam, các hiệp định thuế song phương</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Format date in Vietnamese style
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default TaxTreatyReference;
