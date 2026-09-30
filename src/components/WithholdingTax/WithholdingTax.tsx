'use client';

import { useState, useMemo } from 'react';
import {
  calculateWithholdingTax,
  calculateForeignContractorTax,
  compareWHTByResidency,
  getWHTRate,
  getIncomeTypeOptions,
  formatCurrency,
  formatPercent,
  FOREIGN_CONTRACTOR_TAX_RATES,
  type IncomeType,
  type ForeignContractorType,
  type WHTResult,
  type ForeignContractorTaxResult,
} from '@/lib/withholdingTaxCalculator';
import {
  formatNumber,
  getCasualWithholdingThreshold,
  getPerTransactionThreshold,
  getRentalIncomeThreshold,
} from '@/lib/taxCalculator';
import { WithholdingTaxTabState } from '@/lib/snapshotTypes';

interface WithholdingTaxProps {
  tabState: WithholdingTaxTabState;
  onTabStateChange: (state: WithholdingTaxTabState) => void;
}

type CalculatorMode = 'individual' | 'contractor';

const CONTRACTOR_TYPE_LABELS: Record<ForeignContractorType, string> = {
  service: 'Dịch vụ, xây dựng không bao thầu NVL',
  goods_with_service: 'Sản xuất, vận tải, dịch vụ gắn với hàng hóa',
  goods_only: 'Phân phối, cung cấp hàng hóa',
  equipment_rental: 'Cho thuê máy móc, thiết bị',
  property_rental: 'Cho thuê BĐS',
  insurance: 'Bảo hiểm',
  digital_content: 'Nội dung số (trò chơi, phim, nhạc, quảng cáo số...)',
  other_business: 'Hoạt động kinh doanh khác',
};

export function WithholdingTax({ tabState, onTabStateChange }: WithholdingTaxProps) {
  // Calculator mode
  const [mode, setMode] = useState<CalculatorMode>('individual');

  // Update single field
  const updateField = <K extends keyof WithholdingTaxTabState>(
    field: K,
    value: WithholdingTaxTabState[K]
  ) => {
    onTabStateChange({ ...tabState, [field]: value });
  };

  // Income type options
  const incomeTypeOptions = useMemo(() => getIncomeTypeOptions(), []);

  // Calculate WHT result
  const whtResult = useMemo((): WHTResult => {
    return calculateWithholdingTax({
      paymentAmount: tabState.paymentAmount,
      incomeType: tabState.incomeType,
      residencyStatus: tabState.residencyStatus,
    });
  }, [tabState.paymentAmount, tabState.incomeType, tabState.residencyStatus]);

  // Comparison result
  const comparisonResult = useMemo(() => {
    if (!tabState.showComparison) return null;
    return compareWHTByResidency(tabState.paymentAmount, tabState.incomeType);
  }, [tabState.showComparison, tabState.paymentAmount, tabState.incomeType]);

  // FCT result
  const fctResult = useMemo((): ForeignContractorTaxResult | null => {
    if (mode !== 'contractor') return null;
    return calculateForeignContractorTax({
      contractValue: tabState.contractValue,
      contractType: tabState.contractType,
      hasVATRegistration: tabState.hasVATRegistration,
    });
  }, [mode, tabState.contractValue, tabState.contractType, tabState.hasVATRegistration]);

  // Current rate info
  const rateInfo = useMemo(() => {
    return getWHTRate(tabState.incomeType, tabState.residencyStatus);
  }, [tabState.incomeType, tabState.residencyStatus]);

  // Ngưỡng hiện hành cho chú thích bảng tham khảo
  const casualThreshold = formatNumber(getCasualWithholdingThreshold());
  const perTxThreshold = formatNumber(getPerTransactionThreshold());
  const rentalThreshold = formatNumber(getRentalIncomeThreshold());

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('individual')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
              ${mode === 'individual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Cá nhân (TNCN)
          </button>
          <button
            onClick={() => setMode('contractor')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
              ${mode === 'contractor'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Nhà thầu nước ngoài (FCT)
          </button>
        </div>
      </div>

      {mode === 'individual' ? (
        <>
          {/* Individual WHT Calculator */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Tính thuế khấu trừ tại nguồn
            </h2>

            <div className="space-y-4">
              {/* Residency Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tình trạng cư trú
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateField('residencyStatus', 'resident')}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors
                      ${tabState.residencyStatus === 'resident'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    Cư trú
                  </button>
                  <button
                    onClick={() => updateField('residencyStatus', 'non_resident')}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors
                      ${tabState.residencyStatus === 'non_resident'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    Không cư trú
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {tabState.residencyStatus === 'resident'
                    ? 'Có mặt ≥ 183 ngày/năm hoặc có nơi ở thường xuyên tại VN'
                    : 'Có mặt < 183 ngày/năm và không có nơi ở thường xuyên'}
                </p>
              </div>

              {/* Income Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại thu nhập
                </label>
                <select
                  value={tabState.incomeType}
                  onChange={(e) => updateField('incomeType', e.target.value as IncomeType)}
                  className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
                >
                  {incomeTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thừa kế, quà tặng, BĐS: người nhận/người bán tự khai — dẫn sang tab tính chi tiết */}
              {(tabState.incomeType === 'inheritance' || tabState.incomeType === 'real_estate') && (
                <div className="p-3 bg-yellow-50 rounded-lg text-sm text-gray-700">
                  Không thuộc diện khấu trừ tại nguồn (NĐ 253/2026/NĐ-CP Điều 67.4).{' '}
                  {tabState.incomeType === 'inheritance' ? (
                    <a href="#calculator" className="font-medium text-primary-700 underline">
                      Tính thuế thừa kế, quà tặng (tab Tính thuế, mục Thuế thừa kế &amp; quà tặng)
                    </a>
                  ) : (
                    <a href="#real-estate" className="font-medium text-primary-700 underline">
                      Tính thuế tại tab Chuyển nhượng BĐS
                    </a>
                  )}
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tabState.incomeType === 'rental' ? 'Doanh thu cho thuê cả năm (VND)' : 'Số tiền chi trả (VND)'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={tabState.paymentAmount === 0 ? '' : tabState.paymentAmount.toLocaleString('vi-VN')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    updateField('paymentAmount', value ? parseInt(value, 10) : 0);
                  }}
                  placeholder="Nhập số tiền..."
                  className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
                />
              </div>

              {/* Rate Info */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Thuế suất áp dụng:</span>
                  <span className="font-semibold text-blue-600">
                    {formatPercent(rateInfo.rate)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {rateInfo.description}
                </p>
              </div>

              {/* Comparison Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showComparison"
                  checked={tabState.showComparison}
                  onChange={(e) => updateField('showComparison', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="showComparison" className="text-sm text-gray-700">
                  So sánh cư trú / không cư trú
                </label>
              </div>
            </div>
          </div>

          {/* WHT Result */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Kết quả tính thuế
            </h3>

            <div className="space-y-3">
              {/* Payment Amount */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Số tiền chi trả:</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(whtResult.paymentAmount)}
                </span>
              </div>

              {/* Requires Withholding */}
              {!whtResult.requiresWithholding && whtResult.exemptReason && (
                // Thừa kế, BĐS: không khấu trừ nhưng người nhận/người bán vẫn tự khai, nộp → màu cảnh báo
                tabState.incomeType === 'inheritance' || tabState.incomeType === 'real_estate' ? (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800">{whtResult.exemptReason}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">{whtResult.exemptReason}</p>
                  </div>
                )
              )}

              {/* Applied Rate */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Thuế suất:</span>
                <span className="font-medium text-gray-900">
                  {formatPercent(whtResult.appliedRate)}
                </span>
              </div>

              {/* Withholding Amount */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Thuế khấu trừ:</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(whtResult.withholdingAmount)}
                </span>
              </div>

              {/* Net Amount */}
              <div className="flex items-center justify-between py-2 bg-gray-50 rounded-lg px-3">
                <span className="font-medium text-gray-700">Thực nhận:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(whtResult.netAmount)}
                </span>
              </div>

              {/* Legal Note */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">
                  <strong>Căn cứ pháp lý:</strong> {whtResult.legalNote}
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Result */}
          {comparisonResult && (
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                So sánh cư trú / không cư trú
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resident */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-700 mb-2">Cư trú</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Thuế suất:</span>
                      <span className="font-medium">{formatPercent(comparisonResult.resident.appliedRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thuế khấu trừ:</span>
                      <span className="font-medium text-red-600">{formatCurrency(comparisonResult.resident.withholdingAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thực nhận:</span>
                      <span className="font-bold text-green-600">{formatCurrency(comparisonResult.resident.netAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Non-Resident */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-700 mb-2">Không cư trú</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Thuế suất:</span>
                      <span className="font-medium">{formatPercent(comparisonResult.nonResident.appliedRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thuế khấu trừ:</span>
                      <span className="font-medium text-red-600">{formatCurrency(comparisonResult.nonResident.withholdingAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thực nhận:</span>
                      <span className="font-bold text-green-600">{formatCurrency(comparisonResult.nonResident.netAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Kết luận:</strong> {comparisonResult.recommendation}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Foreign Contractor Tax Calculator */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Thuế nhà thầu nước ngoài (FCT)
            </h2>

            <div className="space-y-4">
              {/* Contract Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại hợp đồng
                </label>
                <select
                  value={tabState.contractType}
                  onChange={(e) => updateField('contractType', e.target.value as ForeignContractorType)}
                  className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
                >
                  {Object.entries(CONTRACTOR_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contract Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doanh thu hợp đồng (VND)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={tabState.contractValue === 0 ? '' : tabState.contractValue.toLocaleString('vi-VN')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    updateField('contractValue', value ? parseInt(value, 10) : 0);
                  }}
                  placeholder="Nhập doanh thu..."
                  className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
                />
              </div>

              {/* VAT Registration */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="hasVATRegistration"
                  checked={tabState.hasVATRegistration}
                  onChange={(e) => updateField('hasVATRegistration', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="hasVATRegistration" className="text-sm text-gray-700">
                  Nhà thầu đã đăng ký nộp thuế GTGT tại Việt Nam
                </label>
              </div>
            </div>
          </div>

          {/* FCT Result */}
          {fctResult && (
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Kết quả tính thuế nhà thầu
              </h3>

              <div className="space-y-3">
                {/* Contract Value */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Doanh thu hợp đồng:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(fctResult.contractValue)}
                  </span>
                </div>

                {/* PIT */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">
                    Thuế TNCN ({formatPercent(fctResult.pitRate)}):
                  </span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(fctResult.pitAmount)}
                  </span>
                </div>

                {/* VAT */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">
                    Thuế GTGT ({formatPercent(fctResult.vatRate)}):
                  </span>
                  <span className={`font-medium ${fctResult.vatAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {fctResult.vatAmount > 0 ? formatCurrency(fctResult.vatAmount) : 'Không áp dụng'}
                  </span>
                </div>

                {/* Total Tax */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">
                    Tổng thuế ({formatPercent(fctResult.totalRate)}):
                  </span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(fctResult.totalTax)}
                  </span>
                </div>

                {/* Net Amount */}
                <div className="flex items-center justify-between py-2 bg-gray-50 rounded-lg px-3">
                  <span className="font-medium text-gray-700">Nhà thầu nhận:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(fctResult.netAmount)}
                  </span>
                </div>

                {/* Notes */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium mb-1">Ghi chú:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {fctResult.notes.map((note, idx) => (
                      <li key={idx}>• {note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reference Tables */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Bảng thuế suất tham khảo
        </h3>

        {mode === 'individual' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Loại thu nhập</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">Cư trú</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">Không cư trú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 px-3 text-gray-600">Lương (có HĐLĐ ≥ 3 tháng)</td>
                  <td className="py-2 px-3 text-center text-blue-600">Lũy tiến</td>
                  <td className="py-2 px-3 text-center text-orange-600">20%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Lương, tiền công (không HĐLĐ hoặc &lt; 3 tháng)</td>
                  <td className="py-2 px-3 text-center text-blue-600">10%*</td>
                  <td className="py-2 px-3 text-center text-orange-600">20%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Thù lao dịch vụ (cá nhân không đăng ký kinh doanh)</td>
                  <td className="py-2 px-3 text-center text-blue-600">10%*</td>
                  <td className="py-2 px-3 text-center text-orange-600">20%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Cho thuê tài sản</td>
                  <td className="py-2 px-3 text-center text-blue-600">5%***</td>
                  <td className="py-2 px-3 text-center text-orange-600">5%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Cổ tức</td>
                  <td className="py-2 px-3 text-center text-blue-600">5%</td>
                  <td className="py-2 px-3 text-center text-orange-600">5%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Lãi cho vay, trái phiếu doanh nghiệp</td>
                  <td className="py-2 px-3 text-center text-blue-600">5%</td>
                  <td className="py-2 px-3 text-center text-orange-600">5%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Lãi tiền gửi TCTD, trái phiếu Chính phủ</td>
                  <td className="py-2 px-3 text-center text-blue-600">Miễn</td>
                  <td className="py-2 px-3 text-center text-orange-600">Miễn</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Chuyển nhượng chứng khoán</td>
                  <td className="py-2 px-3 text-center text-blue-600">0,1%</td>
                  <td className="py-2 px-3 text-center text-orange-600">0,1%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Chuyển nhượng BĐS (người bán tự khai)</td>
                  <td className="py-2 px-3 text-center text-blue-600">2%</td>
                  <td className="py-2 px-3 text-center text-orange-600">2%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Trúng thưởng</td>
                  <td className="py-2 px-3 text-center text-blue-600">10%**</td>
                  <td className="py-2 px-3 text-center text-orange-600">10%**</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Bản quyền, nhượng quyền thương mại</td>
                  <td className="py-2 px-3 text-center text-blue-600">5%**</td>
                  <td className="py-2 px-3 text-center text-orange-600">5%**</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600">Thừa kế, quà tặng (người nhận tự khai)</td>
                  <td className="py-2 px-3 text-center text-blue-600">10%**</td>
                  <td className="py-2 px-3 text-center text-orange-600">10%**</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2">
              * Khấu trừ khi chi trả từ {casualThreshold} đồng/lần; dưới mức này chỉ khấu trừ khi cá nhân yêu cầu<br />
              ** Tính trên phần vượt {perTxThreshold} đồng mỗi lần (bản quyền, nhượng quyền: mỗi hợp đồng)<br />
              *** Tính trên phần doanh thu cả năm vượt {rentalThreshold} đồng
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Loại hợp đồng</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">TNCN</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">GTGT</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">Tổng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(FOREIGN_CONTRACTOR_TAX_RATES).map(([key, rates]) => (
                  <tr key={key}>
                    <td className="py-2 px-3 text-gray-600">
                      {CONTRACTOR_TYPE_LABELS[key as ForeignContractorType]}
                    </td>
                    <td className="py-2 px-3 text-center text-blue-600">{formatPercent(rates.pit)}</td>
                    <td className="py-2 px-3 text-center text-green-600">{formatPercent(rates.vat)}</td>
                    <td className="py-2 px-3 text-center font-medium text-gray-900">
                      {formatPercent(rates.pit + rates.vat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2">
              TNCN: Luật 109/2025/QH15 Điều 20.3 (cá nhân không cư trú kinh doanh). GTGT: tham khảo theo quy định hiện hành về thuế nhà thầu.
            </p>
          </div>
        )}
      </div>

      {/* Legal Reference */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium mb-2">Căn cứ pháp lý:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Luật Thuế TNCN 109/2025/QH15 (Điều 4.6, 7, 12–18, 20–27)</li>
          <li>Nghị định 253/2026/NĐ-CP: Điều 8.2.c (thù lao là tiền công), Điều 50 (khấu trừ thuế), Điều 67 (thu nhập không khấu trừ)</li>
          <li>Nghị định 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP): cho thuê tài sản, mức doanh thu 1 tỷ đồng/năm</li>
          <li>Thông tư 89/2026/TT-BTC: hồ sơ khai thuế, mẫu cam kết</li>
        </ul>
      </div>
    </div>
  );
}

export default WithholdingTax;
