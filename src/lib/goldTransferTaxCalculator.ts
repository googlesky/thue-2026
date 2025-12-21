/**
 * Gold Transfer Tax Calculator for Vietnam
 * Reference: Luật Thuế TNCN sửa đổi 2025
 *
 * Effective from: 01/07/2026
 * Tax Rate: 0.1% on transfer value of gold bars (vàng miếng)
 *
 * Note: This only applies to SJC gold bars and similar products
 * Jewelry (vàng trang sức) is NOT subject to this tax
 */

import { EFFECTIVE_DATES } from './taxCalculator';

// Gold types
export type GoldType = 'sjc' | 'pnj' | 'doji' | 'other_bar' | 'jewelry';

// Gold transaction type
export type TransactionType = 'buy' | 'sell';

// Gold unit
export type GoldUnit = 'luong' | 'chi' | 'gram';

// Individual gold transaction
export interface GoldTransaction {
  id: string;
  type: TransactionType;
  goldType: GoldType;
  unit: GoldUnit;
  quantity: number;
  pricePerUnit: number;
  transactionDate: string;
  notes?: string;
}

// Gold transfer tax input
export interface GoldTransferTaxInput {
  transactions: GoldTransaction[];
  calculationDate?: Date;
}

// Individual transaction result
export interface GoldTransactionResult {
  id: string;
  type: TransactionType;
  goldType: GoldType;
  quantity: number;
  unit: GoldUnit;
  totalValue: number;
  isTaxable: boolean;
  taxRate: number;
  tax: number;
  netValue: number;
  reason: string;
}

// Complete gold transfer tax result
export interface GoldTransferTaxResult {
  transactions: GoldTransactionResult[];
  summary: {
    totalTransactions: number;
    totalTaxableValue: number;
    totalNonTaxableValue: number;
    totalTax: number;
    effectiveTaxRate: number;
    isLawEffective: boolean;
    effectiveDate: Date;
  };
}

// Tax rate (0.1%)
export const GOLD_TRANSFER_TAX_RATE = 0.001;

// Gold type labels
export const GOLD_TYPE_LABELS: Record<GoldType, string> = {
  sjc: 'Vàng miếng SJC',
  pnj: 'Vàng miếng PNJ',
  doji: 'Vàng miếng DOJI',
  other_bar: 'Vàng miếng khác',
  jewelry: 'Vàng trang sức',
};

// Gold type descriptions
export const GOLD_TYPE_DESCRIPTIONS: Record<GoldType, string> = {
  sjc: 'Vàng miếng SJC - Thương hiệu quốc gia, chịu thuế chuyển nhượng',
  pnj: 'Vàng miếng PNJ - Thương hiệu lớn, chịu thuế chuyển nhượng',
  doji: 'Vàng miếng DOJI - Thương hiệu lớn, chịu thuế chuyển nhượng',
  other_bar: 'Vàng miếng thương hiệu khác, chịu thuế chuyển nhượng',
  jewelry: 'Vàng trang sức - KHÔNG chịu thuế chuyển nhượng vàng miếng',
};

// Gold unit labels
export const GOLD_UNIT_LABELS: Record<GoldUnit, string> = {
  luong: 'Lượng (37.5g)',
  chi: 'Chỉ (3.75g)',
  gram: 'Gram',
};

// Conversion to grams
export const GOLD_UNIT_TO_GRAMS: Record<GoldUnit, number> = {
  luong: 37.5,
  chi: 3.75,
  gram: 1,
};

// Transaction type labels
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  buy: 'Mua vào',
  sell: 'Bán ra',
};

/**
 * Check if the gold transfer tax law is effective
 */
export function isGoldTaxEffective(date: Date = new Date()): boolean {
  return date >= EFFECTIVE_DATES.GOLD_TRANSFER_TAX_2026;
}

/**
 * Check if a gold type is taxable (only gold bars are taxable)
 */
export function isGoldTypeTaxable(goldType: GoldType): boolean {
  return goldType !== 'jewelry';
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Convert gold quantity to grams
 */
export function convertToGrams(quantity: number, unit: GoldUnit): number {
  return quantity * GOLD_UNIT_TO_GRAMS[unit];
}

/**
 * Calculate tax for a single gold transaction
 */
export function calculateGoldTransactionTax(
  transaction: GoldTransaction,
  calculationDate: Date = new Date()
): GoldTransactionResult {
  const totalValue = transaction.quantity * transaction.pricePerUnit;
  const isLawEffective = isGoldTaxEffective(calculationDate);
  const isGoldBar = isGoldTypeTaxable(transaction.goldType);

  // Determine if taxable
  const isTaxable = isLawEffective && isGoldBar && transaction.type === 'sell';

  let tax = 0;
  let taxRate = 0;
  let reason = '';

  if (!isLawEffective) {
    reason = `Luật chưa có hiệu lực (hiệu lực từ ${EFFECTIVE_DATES.GOLD_TRANSFER_TAX_2026.toLocaleDateString('vi-VN')})`;
  } else if (!isGoldBar) {
    reason = 'Vàng trang sức không chịu thuế chuyển nhượng vàng miếng';
  } else if (transaction.type === 'buy') {
    reason = 'Giao dịch mua vào - không chịu thuế (người bán chịu thuế)';
  } else {
    taxRate = GOLD_TRANSFER_TAX_RATE;
    tax = Math.round(totalValue * taxRate);
    reason = `Thuế chuyển nhượng vàng miếng ${(taxRate * 100).toFixed(1)}%`;
  }

  return {
    id: transaction.id,
    type: transaction.type,
    goldType: transaction.goldType,
    quantity: transaction.quantity,
    unit: transaction.unit,
    totalValue,
    isTaxable,
    taxRate: taxRate * 100,
    tax,
    netValue: totalValue - tax,
    reason,
  };
}

/**
 * Calculate complete gold transfer tax
 */
export function calculateGoldTransferTax(
  input: GoldTransferTaxInput
): GoldTransferTaxResult {
  const calculationDate = input.calculationDate || new Date();

  // Calculate tax for each transaction
  const transactionResults = input.transactions.map((t) =>
    calculateGoldTransactionTax(t, calculationDate)
  );

  // Calculate summary
  const taxableTransactions = transactionResults.filter((t) => t.isTaxable);
  const nonTaxableTransactions = transactionResults.filter((t) => !t.isTaxable);

  const totalTaxableValue = taxableTransactions.reduce(
    (sum, t) => sum + t.totalValue,
    0
  );
  const totalNonTaxableValue = nonTaxableTransactions.reduce(
    (sum, t) => sum + t.totalValue,
    0
  );
  const totalTax = transactionResults.reduce((sum, t) => sum + t.tax, 0);
  const totalValue = totalTaxableValue + totalNonTaxableValue;
  const effectiveTaxRate =
    totalValue > 0 ? (totalTax / totalValue) * 100 : 0;

  return {
    transactions: transactionResults,
    summary: {
      totalTransactions: transactionResults.length,
      totalTaxableValue,
      totalNonTaxableValue,
      totalTax,
      effectiveTaxRate: Math.round(effectiveTaxRate * 1000) / 1000,
      isLawEffective: isGoldTaxEffective(calculationDate),
      effectiveDate: EFFECTIVE_DATES.GOLD_TRANSFER_TAX_2026,
    },
  };
}

/**
 * Create empty transaction
 */
export function createEmptyGoldTransaction(): GoldTransaction {
  return {
    id: generateId(),
    type: 'sell',
    goldType: 'sjc',
    unit: 'luong',
    quantity: 1,
    pricePerUnit: 0,
    transactionDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * Current gold prices (for reference - should be updated regularly)
 * These are approximate market prices
 */
export const REFERENCE_GOLD_PRICES = {
  sjc: {
    buy: 87_500_000, // SJC mua vào (per lượng)
    sell: 89_500_000, // SJC bán ra (per lượng)
  },
  pnj: {
    buy: 87_000_000,
    sell: 89_000_000,
  },
  doji: {
    buy: 87_200_000,
    sell: 89_200_000,
  },
  world: 85_000_000, // Giá vàng thế giới quy đổi (per lượng)
  lastUpdated: '2025-12-21',
};

/**
 * Format currency in VND
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate profit/loss from gold trading
 */
export function calculateGoldProfit(
  buyPrice: number,
  sellPrice: number,
  quantity: number,
  unit: GoldUnit
): {
  profit: number;
  profitPercentage: number;
  taxOnSale: number;
  netProfit: number;
} {
  const buyValue = buyPrice * quantity;
  const sellValue = sellPrice * quantity;
  const profit = sellValue - buyValue;
  const profitPercentage = buyValue > 0 ? (profit / buyValue) * 100 : 0;
  const taxOnSale = Math.round(sellValue * GOLD_TRANSFER_TAX_RATE);
  const netProfit = profit - taxOnSale;

  return {
    profit,
    profitPercentage: Math.round(profitPercentage * 100) / 100,
    taxOnSale,
    netProfit,
  };
}
