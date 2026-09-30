/**
 * Gold Tax Calculator
 * Thuế TNCN đối với chuyển nhượng vàng miếng
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN số 109/2025/QH15 (hiệu lực 01/7/2026): Điều 3 khoản 10 điểm đ (thu nhập từ
 *   chuyển nhượng vàng miếng chịu thuế), Điều 19 khoản 2 / Điều 27 khoản 2 (0,1% × giá chuyển
 *   nhượng từng lần). Luật giao Chính phủ quy định ngưỡng giá trị vàng miếng chịu thuế, thời điểm
 *   áp dụng thu và điều chỉnh thuế suất.
 * - NĐ 253/2026/NĐ-CP (Điều 16) không quy định vàng miếng; Bộ Tài chính (30/6/2026): CHƯA thu thuế
 *   chuyển nhượng vàng miếng, đang xây dựng nghị định riêng.
 *
 * => Thuế phải nộp = 0; statutoryTax = số thuế NẾU áp dụng mức luật định 0,1% (để ước tính).
 * - Chỉ lệnh BÁN vàng miếng thuộc diện; nhẫn tròn trơn, vàng trang sức không phải vàng miếng.
 * - Không phân biệt lãi/lỗ - tính trên giá chuyển nhượng.
 */

import type { GoldTypeCode } from './goldPriceService';
import { formatNumber } from './taxCalculator';

// Tax configuration
export const GOLD_TAX_CONFIG = {
  // Thuế suất luật định (Luật 109/2025/QH15 Điều 19 khoản 2)
  transferRate: 0.001, // 0,1%

  // Chính phủ chưa quy định ngưỡng giá trị và thời điểm thu -> chưa thu.
  // ponytail: khi có nghị định, bật true + thêm ngưỡng/ngày áp dụng vào isTransactionTaxable
  // và sửa các ghi chú "chưa thu" trong GoldTaxCalculator.tsx.
  collected: false,

  // So sánh với các loại thuế tương tự (trên giá trị bán vàng miếng)
  comparison: {
    gold: { rate: 0.001, name: 'Vàng miếng (chưa thu)', label: 'Vàng' },
    securities: { rate: 0.001, name: 'Chứng khoán', label: 'CK' },
    crypto: { rate: 0.001, name: 'Tài sản số', label: 'Crypto' },
    realEstate: { rate: 0.02, name: 'Bất động sản', label: 'BĐS' },
  },
};

// Gold classification
export type GoldClassification = 'bar' | 'ring' | 'jewelry';

export interface GoldClassificationInfo {
  id: GoldClassification;
  name: string;
  description: string;
  isTaxable: boolean;
  taxNote: string;
}

export const GOLD_CLASSIFICATIONS: GoldClassificationInfo[] = [
  {
    id: 'bar',
    name: 'Vàng miếng',
    description: 'SJC, DOJI, PNJ, BTMC dạng miếng (1 chỉ, 2 chỉ, 1 lượng, 5 lượng, 10 lượng)',
    isTaxable: true,
    taxNote: 'Thuộc diện chịu thuế 0,1% khi bán theo Luật 109/2025/QH15 – hiện chưa thu',
  },
  {
    id: 'ring',
    name: 'Vàng nhẫn trơn',
    description: 'Nhẫn tròn trơn 9999, 24K (dùng như phương tiện tích trữ)',
    isTaxable: false,
    taxNote: 'Không phải vàng miếng – không thuộc diện thuế chuyển nhượng vàng miếng',
  },
  {
    id: 'jewelry',
    name: 'Vàng trang sức',
    description: 'Dây chuyền, lắc tay, nhẫn đính đá... (vàng mỹ nghệ)',
    isTaxable: false,
    taxNote: 'Không thuộc diện thuế chuyển nhượng vàng miếng',
  },
];

// Transaction type
export type GoldTransactionType = 'buy' | 'sell';

// Weight unit
export type GoldWeightUnit = 'luong' | 'chi' | 'gram';

// Weight conversion: everything to lượng
export const WEIGHT_TO_LUONG: Record<GoldWeightUnit, number> = {
  luong: 1,
  chi: 0.1,       // 1 chỉ = 0.1 lượng
  gram: 1 / 37.5, // 1 lượng ≈ 37.5 gram
};

export const WEIGHT_UNIT_NAMES: Record<GoldWeightUnit, string> = {
  luong: 'Lượng',
  chi: 'Chỉ',
  gram: 'Gram',
};

// Common gold weights for quick selection
export const COMMON_WEIGHTS = [
  { label: '1 chỉ', unit: 'chi' as GoldWeightUnit, value: 1 },
  { label: '2 chỉ', unit: 'chi' as GoldWeightUnit, value: 2 },
  { label: '5 chỉ', unit: 'chi' as GoldWeightUnit, value: 5 },
  { label: '1 lượng', unit: 'luong' as GoldWeightUnit, value: 1 },
  { label: '2 lượng', unit: 'luong' as GoldWeightUnit, value: 2 },
  { label: '5 lượng', unit: 'luong' as GoldWeightUnit, value: 5 },
  { label: '10 lượng', unit: 'luong' as GoldWeightUnit, value: 10 },
];

// Single gold transaction
export interface GoldTransaction {
  id: string;
  date: Date;
  type: GoldTransactionType;
  classification: GoldClassification;
  goldTypeCode?: GoldTypeCode;
  goldTypeName: string;
  weight: number;
  weightUnit: GoldWeightUnit;
  pricePerLuong: number; // VND per lượng
  totalValue: number;    // VND
  notes?: string;
}

// Calculator input
export interface GoldTaxInput {
  transactions: GoldTransaction[];
}

// Transaction with tax calculated
export interface GoldTransactionWithTax extends GoldTransaction {
  taxAmount: number;    // Thuế phải nộp (0 khi chưa thu)
  statutoryTax: number; // Nếu áp dụng mức luật định 0,1%
  isTaxable: boolean;   // Thuộc diện chịu thuế theo luật (bán vàng miếng)
  taxNote: string;
  weightInLuong: number;
}

// Calculator result
export interface GoldTaxResult {
  // Tổng quan
  totalTransactions: number;
  totalTaxableTransactions: number;

  // Giá trị giao dịch
  totalBuyValue: number;
  totalSellValue: number;
  totalBuyWeight: number;  // lượng
  totalSellWeight: number; // lượng

  // Thuế
  totalTaxableValue: number;  // Giá trị bán vàng miếng (thuộc diện)
  totalTax: number;           // Thuế phải nộp (0 khi chưa thu)
  totalStatutoryTax: number;  // Nếu áp dụng mức luật định 0,1%
  effectiveTaxRate: number;   // % thuế phải nộp / giá trị bán

  // Chi tiết theo loại vàng
  taxByGoldType: {
    goldTypeName: string;
    transactionCount: number;
    totalValue: number;
    taxAmount: number;
    statutoryTax: number;
  }[];

  // Lãi/lỗ ước tính (nếu có cả mua và bán)
  estimatedProfitLoss: number | null;

  // So sánh thuế suất (trên giá trị bán vàng miếng)
  taxComparison: {
    asset: string;
    label: string;
    rate: number;
    taxAmount: number;
  }[];

  // Giao dịch chi tiết
  transactionsWithTax: GoldTransactionWithTax[];
}

/**
 * Convert weight to lượng
 */
export function convertToLuong(weight: number, unit: GoldWeightUnit): number {
  return weight * WEIGHT_TO_LUONG[unit];
}

/**
 * Calculate total value from weight and price per lượng
 */
export function calculateTotalValue(
  weight: number,
  unit: GoldWeightUnit,
  pricePerLuong: number
): number {
  const weightInLuong = convertToLuong(weight, unit);
  return Math.round(weightInLuong * pricePerLuong);
}

/**
 * Thuộc diện chịu thuế theo luật: chỉ lệnh BÁN vàng miếng
 * (nhẫn tròn trơn, vàng trang sức không phải vàng miếng).
 */
function isTransactionTaxable(tx: GoldTransaction): boolean {
  if (tx.type !== 'sell') return false;
  return GOLD_CLASSIFICATIONS.find(c => c.id === tx.classification)?.isTaxable === true;
}

function getTaxNote(tx: GoldTransaction, statutoryTax: number): string {
  if (tx.type === 'buy') return 'Mua vào không chịu thuế';
  if (!isTransactionTaxable(tx)) {
    return GOLD_CLASSIFICATIONS.find(c => c.id === tx.classification)?.taxNote
      ?? 'Không thuộc diện thuế chuyển nhượng vàng miếng';
  }
  return GOLD_TAX_CONFIG.collected
    ? `Thuế 0,1% × ${formatNumber(tx.totalValue)} đ`
    : `Chưa thu thuế – nếu áp dụng mức luật định 0,1%: ${formatNumber(statutoryTax)} đ`;
}

/**
 * Tính thuế cho một giao dịch (dùng chung cho bảng kết quả và xem trước trên form)
 */
export function calculateGoldTransactionTax(tx: GoldTransaction): GoldTransactionWithTax {
  const isTaxable = isTransactionTaxable(tx);
  const statutoryTax = isTaxable ? Math.round(tx.totalValue * GOLD_TAX_CONFIG.transferRate) : 0;
  const taxAmount = GOLD_TAX_CONFIG.collected ? statutoryTax : 0;

  return {
    ...tx,
    taxAmount,
    statutoryTax,
    isTaxable,
    taxNote: getTaxNote(tx, statutoryTax),
    weightInLuong: convertToLuong(tx.weight, tx.weightUnit),
  };
}

/**
 * Main calculation function
 */
export function calculateGoldTax(input: GoldTaxInput): GoldTaxResult {
  const { transactions } = input;

  // Calculate tax for each transaction
  const transactionsWithTax = transactions.map(calculateGoldTransactionTax);

  // Summary
  let totalBuyValue = 0;
  let totalSellValue = 0;
  let totalBuyWeight = 0;
  let totalSellWeight = 0;
  let totalTaxableValue = 0;
  let totalTax = 0;
  let totalStatutoryTax = 0;

  const goldTypeMap = new Map<string, {
    transactionCount: number;
    totalValue: number;
    taxAmount: number;
    statutoryTax: number;
  }>();

  for (const tx of transactionsWithTax) {
    if (tx.type === 'buy') {
      totalBuyValue += tx.totalValue;
      totalBuyWeight += tx.weightInLuong;
    } else {
      totalSellValue += tx.totalValue;
      totalSellWeight += tx.weightInLuong;
    }

    if (tx.isTaxable) {
      totalTaxableValue += tx.totalValue;
      totalTax += tx.taxAmount;
      totalStatutoryTax += tx.statutoryTax;
    }

    // Group by gold type
    const key = tx.goldTypeName;
    const existing = goldTypeMap.get(key) || {
      transactionCount: 0,
      totalValue: 0,
      taxAmount: 0,
      statutoryTax: 0,
    };
    existing.transactionCount++;
    existing.totalValue += tx.totalValue;
    existing.taxAmount += tx.taxAmount;
    existing.statutoryTax += tx.statutoryTax;
    goldTypeMap.set(key, existing);
  }

  // Tax by gold type
  const taxByGoldType = Array.from(goldTypeMap.entries()).map(([name, data]) => ({
    goldTypeName: name,
    ...data,
  }));

  // Estimated P&L (if both buy and sell exist)
  let estimatedProfitLoss: number | null = null;
  if (totalBuyValue > 0 && totalSellValue > 0) {
    estimatedProfitLoss = totalSellValue - totalBuyValue;
  }

  // Tax comparison (trên giá trị bán vàng miếng)
  const taxComparison = Object.values(GOLD_TAX_CONFIG.comparison).map(config => ({
    asset: config.name,
    label: config.label,
    rate: config.rate,
    taxAmount: Math.round(totalTaxableValue * config.rate),
  }));

  // Thuế suất thực tế trên giá chuyển nhượng (chỉ lệnh bán)
  const effectiveTaxRate = totalSellValue > 0 ? (totalTax / totalSellValue) * 100 : 0;

  return {
    totalTransactions: transactions.length,
    totalTaxableTransactions: transactionsWithTax.filter(tx => tx.isTaxable).length,
    totalBuyValue,
    totalSellValue,
    totalBuyWeight,
    totalSellWeight,
    totalTaxableValue,
    totalTax,
    totalStatutoryTax,
    effectiveTaxRate,
    taxByGoldType,
    estimatedProfitLoss,
    taxComparison,
    transactionsWithTax,
  };
}

/**
 * Generate unique transaction ID
 */
export function generateGoldTransactionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Format weight for display
 */
export function formatWeight(weight: number, unit: GoldWeightUnit): string {
  const luong = convertToLuong(weight, unit);
  // Số thập phân kiểu Việt Nam (0,5 lượng)
  const fmt = (v: number, digits = 3) => v.toLocaleString('vi-VN', { maximumFractionDigits: digits });
  if (unit === 'luong') {
    return `${fmt(weight)} lượng`;
  }
  if (unit === 'chi') {
    return `${fmt(weight)} chỉ (${fmt(luong, 2)} lượng)`;
  }
  return `${fmt(weight)}g (${fmt(luong, 2)} lượng)`;
}
