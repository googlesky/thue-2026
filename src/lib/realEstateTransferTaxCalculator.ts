/**
 * Thuế TNCN khi chuyển nhượng, nhận thừa kế, tặng cho bất động sản + lệ phí trước bạ
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 109/2025/QH15: Điều 4.1 (miễn giữa người thân: chuyển nhượng, thừa kế, tặng cho),
 *   Điều 4.2 (nhà ở/đất ở duy nhất), Điều 14 (2% × giá chuyển nhượng), Điều 18 (thừa kế, quà tặng:
 *   10% × phần vượt ngưỡng mỗi lần nhận), Điều 24 (không cư trú: 2%)
 * - NĐ 253/2026/NĐ-CP: Điều 18 (miễn, kể cả chia tài sản khi ly hôn), Điều 19 (điều kiện nhà ở,
 *   đất ở duy nhất), Điều 57 (giá chuyển nhượng), Điều 61 (giá trị BĐS thừa kế, quà tặng)
 * - NĐ 10/2022/NĐ-CP: lệ phí trước bạ nhà, đất 0,5% do bên mua/bên nhận nộp
 */

import { getPerTransactionThreshold } from './taxCalculator';
import {
  Relationship,
  isExemptRelationship,
  getRelationshipLabel,
  parseDateInput,
} from './inheritanceGiftTaxCalculator';

export type RealEstateType =
  | 'land' // Đất đai
  | 'house' // Nhà ở
  | 'apartment' // Căn hộ chung cư
  | 'land_house' // Đất và nhà trên đất
  | 'commercial'; // Bất động sản thương mại (không phải nhà ở, đất ở)

export type TransferType =
  | 'sale' // Chuyển nhượng (mua bán)
  | 'inheritance' // Thừa kế
  | 'gift' // Tặng cho
  | 'divorce'; // Chia tài sản khi ly hôn

export interface RealEstateTransfer {
  id: string;
  propertyType: RealEstateType;
  transferType: TransferType;
  propertyAddress: string;
  landArea: number; // m2
  buildingArea?: number; // m2
  transferValue: number; // Giá chuyển nhượng / giá trị BĐS nhận
  purchaseValue?: number; // Giá mua ban đầu (tham khảo lợi nhuận)
  transferDate: string; // YYYY-MM-DD
  relationship?: Relationship; // Quan hệ giữa hai bên (Luật 109 Điều 4.1)
  // Nhà ở/đất ở duy nhất của người chuyển nhượng (NĐ 253/2026 Điều 19)
  isOnlyHome?: boolean; // Chỉ có 1 nhà ở/thửa đất ở tại VN, không có thêm nhà hình thành trong tương lai
  certificateDate?: string; // Ngày cấp Giấy chứng nhận (YYYY-MM-DD)
  transfersWhole?: boolean; // Chuyển nhượng toàn bộ
  isFutureHousing?: boolean; // Nhà ở hình thành trong tương lai
  notes?: string;
}

export interface RealEstateTransferTaxInput {
  transfers: RealEstateTransfer[];
}

export interface RealEstateTransferResult {
  id: string;
  propertyType: RealEstateType;
  transferType: TransferType;
  transferValue: number;
  capitalGain: number; // Lợi nhuận tham khảo
  // Thuế TNCN
  pitTaxable: number; // Giá chuyển nhượng (2%) hoặc phần vượt ngưỡng (10%)
  pitRate: number; // %
  pitAmount: number;
  pitPayer: 'seller' | 'recipient';
  // Lệ phí trước bạ: bên mua/bên nhận nộp, KHÔNG trừ vào tiền bên bán nhận
  registrationFee: number;
  registrationRate: number; // %
  totalFees: number; // Thuế TNCN + lệ phí trước bạ của giao dịch
  netProceeds: number; // Bên bán thực nhận = giá − thuế TNCN (chỉ mua bán)
  isExempt: boolean;
  exemptionReason?: string; // Lý do miễn, hoặc điều kiện nhà ở duy nhất chưa đạt
  exemptionAmount: number; // Thuế TNCN được miễn
  notes: string[];
}

export interface RealEstateTransferTaxResult {
  transfers: RealEstateTransferResult[];
  summary: {
    totalTransferValue: number;
    totalCapitalGain: number;
    totalPIT: number;
    totalRegistrationFee: number;
    totalFees: number;
    totalNetProceeds: number; // Tổng bên bán thực nhận (các giao dịch mua bán)
    totalExemptions: number;
    effectiveTaxRate: number;
  };
}

export const REAL_ESTATE_TAX_RATES = {
  pit: 0.02, // 2% giá chuyển nhượng (Luật 109 Điều 14, 24)
  inheritanceGift: 0.10, // 10% phần vượt ngưỡng mỗi lần nhận (Luật 109 Điều 18)
  registrationFee: 0.005, // Lệ phí trước bạ nhà, đất 0,5% (NĐ 10/2022/NĐ-CP)
};

/** Số ngày sở hữu tối thiểu để miễn nhà ở/đất ở duy nhất (NĐ 253 Điều 19.2.b) */
export const ONLY_HOME_MIN_DAYS = 183;

export const PROPERTY_TYPE_LABELS: Record<RealEstateType, string> = {
  land: 'Đất đai (chỉ có quyền sử dụng đất)',
  house: 'Nhà ở riêng lẻ',
  apartment: 'Căn hộ chung cư',
  land_house: 'Đất và nhà trên đất',
  commercial: 'Bất động sản thương mại (không phải nhà ở)',
};

export const TRANSFER_TYPE_LABELS: Record<TransferType, string> = {
  sale: 'Chuyển nhượng (mua bán)',
  inheritance: 'Thừa kế',
  gift: 'Tặng cho',
  divorce: 'Chia tài sản khi ly hôn',
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/** Số ngày giữa hai ngày YYYY-MM-DD (theo lịch địa phương) */
export function daysBetween(from?: string, to?: string): number | undefined {
  const a = from ? parseDateInput(from) : undefined;
  const b = to ? parseDateInput(to) : undefined;
  return a && b ? Math.round((b.getTime() - a.getTime()) / 86_400_000) : undefined;
}

/** Các điều kiện miễn nhà ở/đất ở duy nhất chưa đạt (rỗng = đủ điều kiện) */
export function getOnlyHomeShortfalls(t: RealEstateTransfer): string[] {
  const shortfalls: string[] = [];
  if (t.propertyType === 'commercial') shortfalls.push('không phải nhà ở, đất ở');
  if (t.isFutureHousing) shortfalls.push('nhà ở hình thành trong tương lai không được miễn');
  if (t.transfersWhole === false) shortfalls.push('chỉ chuyển nhượng một phần');
  const days = daysBetween(t.certificateDate, t.transferDate);
  if (days === undefined) {
    shortfalls.push('chưa nhập ngày cấp Giấy chứng nhận');
  } else if (days < ONLY_HOME_MIN_DAYS) {
    shortfalls.push(`mới sở hữu ${Math.max(0, days)} ngày (cần tối thiểu ${ONLY_HOME_MIN_DAYS} ngày tính từ ngày cấp Giấy chứng nhận)`);
  }
  return shortfalls;
}

export function checkExemption(t: RealEstateTransfer): { isExempt: boolean; reason?: string } {
  if (t.transferType === 'divorce') {
    return {
      isExempt: true,
      reason: 'Bất động sản phân chia khi ly hôn (theo thỏa thuận hoặc phán quyết của tòa án) được miễn thuế TNCN (NĐ 253/2026/NĐ-CP Điều 18.2).',
    };
  }
  if (t.relationship && isExemptRelationship(t.relationship)) {
    return {
      isExempt: true,
      reason: `${t.transferType === 'sale' ? 'Chuyển nhượng' : TRANSFER_TYPE_LABELS[t.transferType]} bất động sản giữa ${getRelationshipLabel(t.relationship).toLowerCase()} được miễn thuế TNCN (Luật 109/2025/QH15 Điều 4.1).`,
    };
  }
  if (t.transferType === 'sale' && t.isOnlyHome) {
    const shortfalls = getOnlyHomeShortfalls(t);
    if (shortfalls.length === 0) {
      return {
        isExempt: true,
        reason: 'Nhà ở/đất ở duy nhất của người chuyển nhượng, sở hữu từ 183 ngày, chuyển nhượng toàn bộ: miễn thuế TNCN (Luật 109/2025/QH15 Điều 4.2; NĐ 253/2026/NĐ-CP Điều 19). Người chuyển nhượng tự khai và chịu trách nhiệm.',
      };
    }
    return { isExempt: false, reason: `Chưa đủ điều kiện miễn nhà ở/đất ở duy nhất: ${shortfalls.join('; ')}.` };
  }
  return { isExempt: false };
}

export function calculateTransferTax(transfer: RealEstateTransfer): RealEstateTransferResult {
  const { isExempt, reason } = checkExemption(transfer);
  const value = transfer.transferValue;
  const isGratuitous = transfer.transferType === 'inheritance' || transfer.transferType === 'gift';

  const capitalGain = transfer.purchaseValue !== undefined ? value - transfer.purchaseValue : 0;

  // Thừa kế, tặng cho: 10% × phần vượt ngưỡng mỗi lần nhận; mua bán (và ly hôn nếu không miễn): 2% × giá
  const threshold = getPerTransactionThreshold(parseDateInput(transfer.transferDate));
  const pitRate = isGratuitous ? REAL_ESTATE_TAX_RATES.inheritanceGift : REAL_ESTATE_TAX_RATES.pit;
  const pitBase = isGratuitous ? Math.max(0, value - threshold) : value;
  const fullPit = Math.round(pitBase * pitRate);
  const pitAmount = isExempt ? 0 : fullPit;

  // Lệ phí trước bạ luôn tính (miễn thuế TNCN không kéo theo miễn lệ phí trước bạ)
  const registrationFee = Math.round(value * REAL_ESTATE_TAX_RATES.registrationFee);

  const notes: string[] = [];
  if (isGratuitous) {
    notes.push(
      `Thừa kế, tặng cho: thuế TNCN = 10% × phần giá trị vượt ${threshold.toLocaleString('vi-VN')} đồng mỗi lần nhận; giá trị theo bảng giá đất và giá tính lệ phí trước bạ nhà (NĐ 253/2026/NĐ-CP Điều 61).`
    );
    if (transfer.relationship && isExemptRelationship(transfer.relationship)) {
      notes.push('Có thể được miễn lệ phí trước bạ khi nhận thừa kế, quà tặng nhà đất giữa người thân (NĐ 10/2022/NĐ-CP Điều 10) — kiểm tra với cơ quan thuế.');
    }
  } else {
    notes.push('Giá tính thuế là giá trên hợp đồng; nếu thấp hơn giá theo bảng giá đất thì tính theo bảng giá đất (NĐ 253/2026/NĐ-CP Điều 57).');
  }

  return {
    id: transfer.id,
    propertyType: transfer.propertyType,
    transferType: transfer.transferType,
    transferValue: value,
    capitalGain,
    pitTaxable: isExempt ? 0 : pitBase,
    pitRate: pitRate * 100,
    pitAmount,
    pitPayer: isGratuitous ? 'recipient' : 'seller',
    registrationFee,
    registrationRate: REAL_ESTATE_TAX_RATES.registrationFee * 100,
    totalFees: pitAmount + registrationFee,
    netProceeds: transfer.transferType === 'sale' ? value - pitAmount : 0,
    isExempt,
    exemptionReason: reason,
    exemptionAmount: isExempt ? fullPit : 0,
    notes,
  };
}

export function calculateRealEstateTransferTax(input: RealEstateTransferTaxInput): RealEstateTransferTaxResult {
  const transfers = input.transfers.map(calculateTransferTax);
  const total = (pick: (t: RealEstateTransferResult) => number) => transfers.reduce((s, t) => s + pick(t), 0);

  const totalTransferValue = total((t) => t.transferValue);
  const totalPIT = total((t) => t.pitAmount);
  const totalRegistrationFee = total((t) => t.registrationFee);
  const totalFees = totalPIT + totalRegistrationFee;
  const effectiveTaxRate = totalTransferValue > 0 ? (totalFees / totalTransferValue) * 100 : 0;

  return {
    transfers,
    summary: {
      totalTransferValue,
      totalCapitalGain: total((t) => t.capitalGain),
      totalPIT,
      totalRegistrationFee,
      totalFees,
      totalNetProceeds: total((t) => t.netProceeds),
      totalExemptions: total((t) => t.exemptionAmount),
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
    },
  };
}

/** Ngày hôm nay dạng YYYY-MM-DD theo giờ địa phương */
function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function createEmptyTransfer(): RealEstateTransfer {
  return {
    id: generateId(),
    propertyType: 'apartment',
    transferType: 'sale',
    propertyAddress: '',
    landArea: 0,
    buildingArea: 0,
    transferValue: 0,
    transferDate: todayInputValue(),
    relationship: 'non_relative',
    isOnlyHome: false,
    certificateDate: '',
    transfersWhole: true,
    isFutureHousing: false,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Tính nhanh cho giao dịch mua bán: thuế TNCN 2% (bên bán, trừ khi được miễn) và
 * lệ phí trước bạ 0,5% (bên mua — luôn phải nộp, kể cả khi thuế TNCN được miễn).
 */
export function estimateTransferTax(
  transferValue: number,
  isExempt: boolean = false
): {
  pit: number;
  registrationFee: number;
  total: number;
  netProceeds: number; // Bên bán thực nhận
} {
  const pit = isExempt ? 0 : Math.round(transferValue * REAL_ESTATE_TAX_RATES.pit);
  const registrationFee = Math.round(transferValue * REAL_ESTATE_TAX_RATES.registrationFee);
  return { pit, registrationFee, total: pit + registrationFee, netProceeds: transferValue - pit };
}
