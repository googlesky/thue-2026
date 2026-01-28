/**
 * Crypto/Digital Asset Tax Calculator
 * Tính thuế chuyển nhượng tài sản số (Bitcoin, Ethereum, NFT, etc.)
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 2025 (có hiệu lực 1/7/2026)
 * - Luật Công nghiệp công nghệ số (hiệu lực 1/1/2026)
 * - Nghị quyết 05/2025 về thí điểm thị trường tài sản mã hóa
 *
 * Quy định chính:
 * - Thuế suất: 0,1% trên giá trị giao dịch (giống chứng khoán, vàng)
 * - Áp dụng cho tất cả giao dịch chuyển nhượng, không phân biệt lãi/lỗ
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
  icon: string;
  description: string;
  examples: string[];
}

// Predefined crypto assets
export const CRYPTO_ASSETS: CryptoAsset[] = [
  {
    id: 'btc',
    name: 'Bitcoin',
    icon: '₿',
    description: 'Tiền mã hóa phi tập trung đầu tiên',
    examples: ['BTC'],
  },
  {
    id: 'eth',
    name: 'Ethereum',
    icon: 'Ξ',
    description: 'Nền tảng hợp đồng thông minh',
    examples: ['ETH'],
  },
  {
    id: 'stablecoin',
    name: 'Stablecoin',
    icon: '💵',
    description: 'Đồng tiền ổn định neo giá USD',
    examples: ['USDT', 'USDC', 'BUSD', 'DAI'],
  },
  {
    id: 'altcoin',
    name: 'Altcoin',
    icon: '🪙',
    description: 'Các đồng tiền thay thế khác',
    examples: ['SOL', 'BNB', 'XRP', 'ADA', 'DOGE'],
  },
  {
    id: 'nft',
    name: 'NFT',
    icon: '🎨',
    description: 'Token không thể thay thế (nghệ thuật số, collectibles)',
    examples: ['BAYC', 'CryptoPunks', 'Art NFTs'],
  },
  {
    id: 'other',
    name: 'Tài sản số khác',
    icon: '🌐',
    description: 'Các loại tài sản số khác',
    examples: ['DeFi tokens', 'Gaming tokens'],
  },
];

// Tax configuration
export const CRYPTO_TAX_CONFIG = {
  // Thuế suất chuyển nhượng
  transferRate: 0.001, // 0,1%

  // Ngày hiệu lực
  effectiveDate: new Date('2026-07-01'),

  // So sánh với các loại tài sản
  comparison: {
    securities: { rate: 0.001, name: 'Chứng khoán' },
    gold: { rate: 0.001, name: 'Vàng miếng' },
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
  year: number;
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
  effectiveTaxRate: number;

  // Breakdown by asset
  taxByAsset: {
    assetType: CryptoAssetType;
    assetName: string;
    transactionCount: number;
    totalValue: number;
    taxAmount: number;
  }[];

  // Monthly breakdown
  monthlyBreakdown: {
    month: number;
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
    difference: number;
  }[];
}

/**
 * Check if transaction is taxable
 * Only SELL and SWAP transactions are taxable
 */
function isTaxableTransaction(type: TransactionType): boolean {
  return type === 'sell' || type === 'swap';
}

/**
 * Get tax note for transaction
 */
function getTaxNote(type: TransactionType, date: Date): string {
  const effectiveDate = CRYPTO_TAX_CONFIG.effectiveDate;

  if (date < effectiveDate) {
    return 'Giao dịch trước ngày luật có hiệu lực (1/7/2026)';
  }

  switch (type) {
    case 'buy':
      return 'Mua vào không chịu thuế';
    case 'sell':
      return 'Bán ra chịu thuế 0,1%';
    case 'swap':
      return 'Hoán đổi chịu thuế 0,1%';
    case 'transfer':
      return 'Chuyển ví không chịu thuế';
    default:
      return '';
  }
}

/**
 * Calculate tax for a single transaction
 */
function calculateTransactionTax(transaction: CryptoTransaction): TransactionWithTax {
  const { type, totalValue, date } = transaction;
  const isTaxable = isTaxableTransaction(type) && date >= CRYPTO_TAX_CONFIG.effectiveDate;
  const taxAmount = isTaxable ? totalValue * CRYPTO_TAX_CONFIG.transferRate : 0;

  return {
    ...transaction,
    taxAmount,
    isTaxable,
    taxNote: getTaxNote(type, date),
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

  const monthlyMap = new Map<number, {
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

    // By month
    const month = tx.date.getMonth() + 1;
    const monthData = monthlyMap.get(month) || {
      transactionCount: 0,
      totalValue: 0,
      taxAmount: 0,
    };
    monthData.transactionCount++;
    monthData.totalValue += tx.totalValue;
    monthData.taxAmount += tx.taxAmount;
    monthlyMap.set(month, monthData);
  }

  // Build asset breakdown
  const taxByAsset = Array.from(taxByAssetMap.entries()).map(([assetType, data]) => ({
    assetType,
    ...data,
  }));

  // Build monthly breakdown
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const data = monthlyMap.get(month) || {
      transactionCount: 0,
      totalValue: 0,
      taxAmount: 0,
    };
    return { month, ...data };
  });

  // Calculate comparison
  const taxComparison = Object.entries(CRYPTO_TAX_CONFIG.comparison).map(([key, config]) => {
    const taxAmount = totalTaxableValue * config.rate;
    return {
      asset: config.name,
      rate: config.rate,
      taxAmount,
      difference: taxAmount - totalTax,
    };
  });

  // Effective tax rate
  const totalValue = totalBuyValue + totalSellValue + totalSwapValue;
  const effectiveTaxRate = totalValue > 0 ? (totalTax / totalValue) * 100 : 0;

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
    monthlyBreakdown,
    transactionsWithTax,
    taxComparison,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
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
 * Get transaction type color
 */
export function getTransactionTypeColor(type: TransactionType): string {
  const colors: Record<TransactionType, string> = {
    buy: 'green',
    sell: 'red',
    swap: 'blue',
    transfer: 'gray',
  };
  return colors[type];
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
