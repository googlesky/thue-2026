/**
 * Crypto/Digital Asset Tax Calculator
 * Thuế TNCN chuyển nhượng tài sản số (Bitcoin, Ethereum, NFT...)
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN số 109/2025/QH15 (hiệu lực 01/7/2026): Điều 3 khoản 10 điểm d (thu nhập từ
 *   chuyển nhượng tài sản số), Điều 19 khoản 2 (cá nhân cư trú) và Điều 27 khoản 2 (không cư trú):
 *   0,1% × giá chuyển nhượng từng lần, không phân biệt lãi/lỗ.
 * - NĐ 253/2026/NĐ-CP Điều 16 khoản 4 (tài sản ảo, tài sản mã hóa, tài sản số khác), Điều 62 khoản 2.
 * - TT 32/2026/TT-BTC (hiệu lực 27/3/2026) đã áp 0,1% cho giao dịch qua tổ chức cung cấp dịch vụ tài sản
 *   mã hóa được cấp phép thí điểm (NQ 05/2025/NQ-CP); công cụ này tính theo mốc 01/7/2026 của Luật.
 * - Chỉ lệnh bán/hoán đổi (chuyển nhượng) chịu thuế; mua, chuyển ví của chính mình không chịu thuế.
 */

// Asset types
export type CryptoAssetType =
  | 'btc'
  | 'eth'
  | 'stablecoin'
  | 'altcoin'
  | 'nft'
  | 'other';

export interface CryptoAsset {
  id: CryptoAssetType;
  name: string;
  description: string;
  examples: string[];
}

// Predefined crypto assets
export const CRYPTO_ASSETS: CryptoAsset[] = [
  {
    id: 'btc',
    name: 'Bitcoin',
    description: 'Tiền mã hóa phi tập trung đầu tiên',
    examples: ['BTC'],
  },
  {
    id: 'eth',
    name: 'Ethereum',
    description: 'Nền tảng hợp đồng thông minh',
    examples: ['ETH'],
  },
  {
    id: 'stablecoin',
    name: 'Stablecoin',
    description: 'Đồng tiền ổn định neo giá USD',
    examples: ['USDT', 'USDC', 'BUSD', 'DAI'],
  },
  {
    id: 'altcoin',
    name: 'Altcoin',
    description: 'Các đồng tiền thay thế khác',
    examples: ['SOL', 'BNB', 'XRP', 'ADA', 'DOGE'],
  },
  {
    id: 'nft',
    name: 'NFT',
    description: 'Token không thể thay thế (nghệ thuật số, collectibles)',
    examples: ['BAYC', 'CryptoPunks', 'Art NFTs'],
  },
  {
    id: 'other',
    name: 'Tài sản số khác',
    description: 'Các loại tài sản số khác',
    examples: ['DeFi tokens', 'Gaming tokens'],
  },
];

// Tax configuration
export const CRYPTO_TAX_CONFIG = {
  // Thuế suất chuyển nhượng (Luật 109/2025/QH15 Điều 19 khoản 2)
  transferRate: 0.001, // 0,1%

  // Ngày Luật 109/2025/QH15 có hiệu lực (giờ địa phương)
  effectiveDate: new Date(2026, 6, 1),

  // So sánh với các loại tài sản
  comparison: {
    securities: { rate: 0.001, name: 'Chứng khoán' },
    gold: { rate: 0.001, name: 'Vàng miếng (chưa thu)' },
    crypto: { rate: 0.001, name: 'Tài sản số' },
    realEstate: { rate: 0.02, name: 'Bất động sản' },
  },
};

// Transaction type
export type TransactionType = 'buy' | 'sell' | 'swap' | 'transfer';

// Single transaction
export interface CryptoTransaction {
  id: string;
  date: Date;
  type: TransactionType;
  assetType: CryptoAssetType;
  assetName: string;
  quantity: number;
  pricePerUnit: number; // VND
  totalValue: number;   // VND
  fee: number;          // Exchange fee
  notes?: string;
}

// Calculator input
export interface CryptoTaxInput {
  transactions: CryptoTransaction[];
}

// Transaction with tax
export interface TransactionWithTax extends CryptoTransaction {
  taxAmount: number;
  isTaxable: boolean;
  taxNote: string;
}

// Calculator result
export interface CryptoTaxResult {
  // Summary
  totalTransactions: number;
  totalTaxableTransactions: number;
  totalBuyValue: number;
  totalSellValue: number;
  totalSwapValue: number;

  // Tax
  totalTaxableValue: number;
  totalTax: number;
  effectiveTaxRate: number; // % thuế / giá trị chuyển nhượng (bán + hoán đổi)

  // Breakdown by asset
  taxByAsset: {
    assetType: CryptoAssetType;
    assetName: string;
    transactionCount: number;
    totalValue: number;
    taxAmount: number;
  }[];

  // Transactions with tax
  transactionsWithTax: TransactionWithTax[];

  // Comparison with other assets
  taxComparison: {
    asset: string;
    rate: number;
    taxAmount: number;
  }[];
}

// Bán / hoán đổi = chuyển nhượng tài sản số (hoán đổi: giá chuyển nhượng = giá trị tài sản đem đổi)
const isTransfer = (type: TransactionType) => type === 'sell' || type === 'swap';

function getTaxNote(type: TransactionType, isTaxable: boolean): string {
  if (type === 'buy') return 'Mua vào không chịu thuế';
  if (type === 'transfer') return 'Chuyển ví của chính mình không chịu thuế';
  if (!isTaxable) return 'Chuyển nhượng trước 01/7/2026 – chưa chịu thuế theo Luật 109/2025/QH15';
  return type === 'swap' ? 'Hoán đổi chịu thuế 0,1%' : 'Bán ra chịu thuế 0,1%';
}

/**
 * Calculate tax for a single transaction
 */
function calculateTransactionTax(transaction: CryptoTransaction): TransactionWithTax {
  const { type, totalValue, date } = transaction;
  const isTaxable = isTransfer(type) && date >= CRYPTO_TAX_CONFIG.effectiveDate;
  const taxAmount = isTaxable ? Math.round(totalValue * CRYPTO_TAX_CONFIG.transferRate) : 0;

  return {
    ...transaction,
    taxAmount,
    isTaxable,
    taxNote: getTaxNote(type, isTaxable),
  };
}

/**
 * Main calculation function
 */
export function calculateCryptoTax(input: CryptoTaxInput): CryptoTaxResult {
  const { transactions } = input;

  // Calculate tax for each transaction
  const transactionsWithTax = transactions.map(calculateTransactionTax);

  // Summary calculations
  let totalBuyValue = 0;
  let totalSellValue = 0;
  let totalSwapValue = 0;
  let totalTaxableValue = 0;
  let totalTax = 0;

  const taxByAssetMap = new Map<CryptoAssetType, {
    assetName: string;
    transactionCount: number;
    totalValue: number;
    taxAmount: number;
  }>();

  for (const tx of transactionsWithTax) {
    // Totals by type
    switch (tx.type) {
      case 'buy':
        totalBuyValue += tx.totalValue;
        break;
      case 'sell':
        totalSellValue += tx.totalValue;
        break;
      case 'swap':
        totalSwapValue += tx.totalValue;
        break;
    }

    // Taxable totals
    if (tx.isTaxable) {
      totalTaxableValue += tx.totalValue;
      totalTax += tx.taxAmount;
    }

    // By asset
    const assetData = taxByAssetMap.get(tx.assetType) || {
      assetName: tx.assetName,
      transactionCount: 0,
      totalValue: 0,
      taxAmount: 0,
    };
    assetData.transactionCount++;
    assetData.totalValue += tx.totalValue;
    assetData.taxAmount += tx.taxAmount;
    taxByAssetMap.set(tx.assetType, assetData);
  }

  // Build asset breakdown
  const taxByAsset = Array.from(taxByAssetMap.entries()).map(([assetType, data]) => ({
    assetType,
    ...data,
  }));

  // Calculate comparison
  const taxComparison = Object.values(CRYPTO_TAX_CONFIG.comparison).map(config => ({
    asset: config.name,
    rate: config.rate,
    taxAmount: Math.round(totalTaxableValue * config.rate),
  }));

  // Thuế suất thực tế trên giá chuyển nhượng (không cộng giá trị mua)
  const transferValue = totalSellValue + totalSwapValue;
  const effectiveTaxRate = transferValue > 0 ? (totalTax / transferValue) * 100 : 0;

  return {
    totalTransactions: transactions.length,
    totalTaxableTransactions: transactionsWithTax.filter(tx => tx.isTaxable).length,
    totalBuyValue,
    totalSellValue,
    totalSwapValue,
    totalTaxableValue,
    totalTax,
    effectiveTaxRate,
    taxByAsset,
    transactionsWithTax,
    taxComparison,
  };
}

/**
 * Format tỷ lệ kiểu Việt Nam: 0.001 -> "0,1%"
 */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}%`;
}

/**
 * Get transaction type label
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    buy: 'Mua',
    sell: 'Bán',
    swap: 'Hoán đổi',
    transfer: 'Chuyển ví',
  };
  return labels[type];
}

/**
 * Generate unique transaction ID
 */
export function generateTransactionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Get asset by type
 */
export function getAssetByType(type: CryptoAssetType): CryptoAsset | undefined {
  return CRYPTO_ASSETS.find(a => a.id === type);
}
