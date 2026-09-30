'use client';

import { useMemo } from 'react';
import { calculateESOPTax, type ESOPShareType, type ESOPIncomeBasis } from '@/lib/esopCalculator';
import { SharedTaxState, formatNumber, parseCurrency } from '@/lib/taxCalculator';
import { ESOPTabState } from '@/lib/snapshotTypes';

interface ESOPCalculatorProps {
  sharedState: SharedTaxState;
  onStateChange: (updates: Partial<SharedTaxState>) => void;
  tabState: ESOPTabState;
  onTabStateChange: (state: ESOPTabState) => void;
}

const SHARE_TYPES: { value: ESOPShareType; label: string; hint: string }[] = [
  { value: 'esop', label: 'Cổ phiếu ESOP', hint: 'Mua giá ưu đãi theo chương trình lựa chọn cho người lao động' },
  { value: 'bonus', label: 'Cổ phiếu thưởng', hint: 'Được thưởng bằng cổ phiếu, không phải trả tiền mua' },
];

const BASIS_NOTE: Record<ESOPIncomeBasis, string> = {
  book: 'Theo số tiền ghi sổ kế toán của công ty',
  par: 'Số lượng × mệnh giá − số tiền đã bỏ ra mua (âm thì không nộp)',
  market: 'Giá bán thấp hơn mệnh giá: tính theo giá thị trường khi chuyển nhượng',
};

function MoneyField({ id, label, value, onChange, suffix = 'đ', placeholder = '0', hint }: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value > 0 ? formatNumber(value) : ''}
          onChange={(e) => onChange(parseCurrency(e.target.value))}
          className="input-field pr-16 font-data"
          placeholder={placeholder}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{suffix}</span>
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function Row({ label, value, note, strong, valueClass = 'text-gray-900' }: {
  label: string;
  value: number;
  note?: string;
  strong?: boolean;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="leader-row">
        <span className={`leader-label ${strong ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{label}</span>
        <span className="leader-dots" aria-hidden />
        <span className={`font-data whitespace-nowrap ${strong ? 'font-bold' : ''} ${valueClass}`}>
          {formatNumber(value)} đ
        </span>
      </div>
      {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
    </div>
  );
}

export default function ESOPCalculator({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: ESOPCalculatorProps) {
  // State cũ/URL có thể thiếu hoặc sai kiểu - chuẩn hóa loại cổ phiếu
  const shareType: ESOPShareType = tabState.shareType === 'bonus' ? 'bonus' : 'esop';
  const update = (patch: Partial<ESOPTabState>) => onTabStateChange({ ...tabState, ...patch });

  const result = useMemo(
    () =>
      calculateESOPTax({
        shareType,
        numberOfShares: tabState.numberOfShares,
        purchasePrice: tabState.grantPrice,
        parValue: tabState.parValue,
        bookAmount: tabState.bookAmount,
        sellPrice: tabState.sellPrice,
        salary: sharedState,
      }),
    [shareType, tabState, sharedState]
  );

  const hasValidInput = tabState.numberOfShares > 0 && tabState.sellPrice > 0;
  const basisNote =
    result.incomeBasis === 'par' && shareType === 'bonus' ? 'Số lượng × mệnh giá' : BASIS_NOTE[result.incomeBasis];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900">Thuế cổ phiếu ESOP, cổ phiếu thưởng</h2>
        <p className="text-sm text-gray-600 mt-1">
          Nhận cổ phiếu chưa phải tính thuế. Khi bán: thuế thu nhập từ tiền lương (khấu trừ 10%, quyết toán
          theo biểu lũy tiến) và thuế chuyển nhượng chứng khoán 0,1% – Nghị định 253/2026/NĐ-CP Điều 50
          khoản 3 điểm a.
        </p>
      </div>

      {/* Input Section */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Cổ phiếu chuyển nhượng</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label="Loại cổ phiếu">
          {SHARE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={shareType === t.value}
              onClick={() => update({ shareType: t.value })}
              className={`text-left px-3 py-3 min-h-[44px] rounded-lg border text-sm transition-colors ${
                shareType === t.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-line bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="block font-medium">{t.label}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{t.hint}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MoneyField
            id="esop-num-shares"
            label="Số cổ phiếu bán"
            suffix="CP"
            value={tabState.numberOfShares}
            onChange={(v) => update({ numberOfShares: v })}
          />
          <MoneyField
            id="esop-sell-price"
            label="Giá bán/cổ phiếu"
            value={tabState.sellPrice}
            onChange={(v) => update({ sellPrice: v })}
          />
          {shareType === 'esop' && (
            <MoneyField
              id="esop-grant-price"
              label="Giá đã mua/cổ phiếu (giá ưu đãi)"
              value={tabState.grantPrice}
              onChange={(v) => update({ grantPrice: v })}
            />
          )}
          <MoneyField
            id="esop-par-value"
            label="Mệnh giá/cổ phiếu"
            placeholder="10.000"
            value={tabState.parValue}
            onChange={(v) => update({ parValue: v })}
            hint="Để trống: dùng 10.000 đ"
          />
          <MoneyField
            id="esop-book-amount"
            label="Số tiền ghi sổ kế toán (nếu biết)"
            value={tabState.bookAmount}
            onChange={(v) => update({ bookAmount: v })}
            hint="Số tiền công ty chi cho bạn ghi trên sổ kế toán, tương ứng số cổ phiếu bán"
          />
        </div>

        <h3 className="font-semibold text-gray-900 mt-6 mb-4">Tiền lương (để ước tính quyết toán năm)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MoneyField
            id="esop-salary"
            label="Lương gộp tháng"
            value={sharedState.grossIncome}
            onChange={(v) => onStateChange({ grossIncome: v })}
            hint="Dùng chung với các công cụ tính thuế khác"
          />
          <MoneyField
            id="esop-dependents"
            label="Người phụ thuộc"
            suffix="người"
            value={sharedState.dependents}
            onChange={(v) => onStateChange({ dependents: Math.min(v, 20) })}
          />
        </div>
      </div>

      {hasValidInput ? (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Thuế khi bán cổ phiếu</h3>

          <div className="space-y-3 text-sm">
            <Row label="Giá trị bán" value={result.saleValue} />
            {shareType === 'esop' && <Row label="Số tiền đã bỏ ra mua" value={result.purchaseCost} />}
            <Row label="Thu nhập chịu thuế từ tiền lương" value={result.salaryIncome} note={basisNote} />
          </div>

          <div className="mt-4 pt-4 border-t border-line space-y-3 text-sm">
            <Row label="Công ty chứng khoán khấu trừ 10%" value={result.withheldTax} />
            <Row label="Thuế chuyển nhượng chứng khoán 0,1%" value={result.transferTax} />
            <Row
              label="Thuế lũy tiến tăng thêm khi quyết toán năm"
              value={result.settlementTax}
              note={`Thuế năm từ tiền lương: ${formatNumber(result.annualTaxWithout)} đ → ${formatNumber(result.annualTaxWith)} đ`}
            />
            <Row
              label={result.settlementBalance >= 0 ? 'Nộp thêm khi quyết toán' : 'Được hoàn/bù trừ khi quyết toán'}
              value={Math.abs(result.settlementBalance)}
              note="So với số 10% đã bị khấu trừ"
              valueClass={result.settlementBalance > 0 ? 'text-seal' : result.settlementBalance < 0 ? 'text-rise' : 'text-gray-900'}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-line space-y-3 text-sm">
            <Row label="Tổng thuế do bán cổ phiếu" value={result.totalTax} strong />
            <Row
              label="Lãi ròng sau thuế"
              value={result.netProfit}
              strong
              valueClass={result.netProfit >= 0 ? 'text-rise' : 'text-seal'}
            />
          </div>
        </div>
      ) : (
        <div className="card text-center py-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nhập thông tin cổ phiếu</h3>
          <p className="text-gray-500">Điền số cổ phiếu bán và giá bán để tính thuế</p>
        </div>
      )}

      {/* Notes */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Lưu ý</h3>
        <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
          <li>
            Nhận cổ phiếu ESOP, cổ phiếu thưởng chưa phải tính thuế; thuế phát sinh khi chuyển nhượng
            (Nghị định 253/2026/NĐ-CP Điều 50 khoản 3 điểm a, áp dụng từ 01/7/2026).
          </li>
          <li>
            Thu nhập chịu thuế từ tiền lương ưu tiên số tiền ghi sổ kế toán của công ty. Nếu không xác định
            được: cổ phiếu ESOP = số lượng × mệnh giá − số tiền đã bỏ ra mua (âm thì không nộp); cổ phiếu
            thưởng = số lượng × mệnh giá, giá bán thấp hơn mệnh giá thì theo giá thị trường.
          </li>
          <li>
            Công ty chứng khoán/ngân hàng lưu ký khấu trừ 10%; bạn cộng khoản thu nhập này vào tiền lương để
            quyết toán năm theo biểu lũy tiến 5 bậc. Ước tính giả định lương đều các tháng.
          </li>
          <li>Thuế chuyển nhượng chứng khoán 0,1% tính trên giá bán, kể cả khi lỗ.</li>
          <li>Bán cổ phiếu cùng loại thì số bán được tính vào cổ phiếu ESOP/thưởng trước cho đến khi hết.</li>
          <li>Cổ phiếu, quyền chọn do công ty mẹ ở nước ngoài cấp có thể được xác định khác – nên hỏi cơ quan thuế.</li>
        </ul>
      </div>
    </div>
  );
}
