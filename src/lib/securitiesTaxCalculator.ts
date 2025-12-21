/**
 * Securities Tax Calculator for Vietnam
 * Handles: Listed/Unlisted securities, capital gains, dividends, bonds
 * Reference: Circular 111/2013/TT-BTC, Law 04/2019/QH14
 */

// Securities type enum
export type SecuritiesType = 'listed' | 'unlisted' | 'fund' | 'bond';

// Tax calculation method for unlisted securities
export type TaxMethod = 'transaction' | 'capitalGains';

// Bond types
export type BondType = 'government' | 'corporate';

// Individual securities transaction
export interface SecuritiesTransaction {
  id: string;
  type: SecuritiesType;
  symbol: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyDate: string;
  sellDate: string;
  buyFee: number;
  sellFee: number;
}

// Dividend income entry
export interface DividendEntry {
  id: string;
  symbol: string;
  company: string;
  dividendPerShare: number;
  shares: number;
  exDate: string;
  taxWithheld: number;
}

// Bond interest entry
export interface BondInterestEntry {
  id: string;
  bondName: string;
  bondType: BondType;
  principal: number;
  interestRate: number;
  interestPeriod: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  interestReceived: number;
}

// Securities tax input
export interface SecuritiesTaxInput {
  transactions: SecuritiesTransaction[];
  dividends: DividendEntry[];
  bonds: BondInterestEntry[];
  taxMethod: TaxMethod;
  taxYear: 2025 | 2026;
}

// Individual transaction result
export interface TransactionTaxResult {
  id: string;
  symbol: string;
  type: SecuritiesType;
  buyValue: number;
  sellValue: number;
  totalFees: number;
  capitalGain: number;
  taxableAmount: number;
  tax: number;
  taxRate: number;
  taxMethod: TaxMethod;
  netProfit: number;
}

// Dividend tax result
export interface DividendTaxResult {
  id: string;
  symbol: string;
  grossDividend: number;
  tax: number;
  taxRate: number;
  netDividend: number;
}

// Bond interest tax result
export interface BondInterestTaxResult {
  id: string;
  bondName: string;
  bondType: BondType;
  interestReceived: number;
  tax: number;
  taxRate: number;
  netInterest: number;
}

// Complete securities tax result
export interface SecuritiesTaxResult {
  transactions: {
    results: TransactionTaxResult[];
    totalSellValue: number;
    totalCapitalGain: number;
    totalFees: number;
    totalTax: number;
    totalNetProfit: number;
  };
  dividends: {
    results: DividendTaxResult[];
    totalGross: number;
    totalTax: number;
    totalNet: number;
  };
  bonds: {
    results: BondInterestTaxResult[];
    totalInterest: number;
    totalTax: number;
    totalNet: number;
  };
  summary: {
    totalIncome: number;
    totalTax: number;
    totalNet: number;
    effectiveTaxRate: number;
  };
}

// Tax rates
export const SECURITIES_TAX_RATES = {
  // Listed securities: 0.1% on transaction value (no option for capital gains)
  listed: 0.001,

  // Unlisted securities: 0.1% on transaction OR 20% on capital gains
  unlisted: {
    transaction: 0.001,
    capitalGains: 0.20,
  },

  // Investment funds: 0.1% on transaction
  fund: 0.001,

  // Bonds: 5% on interest (except government bonds which are 0%)
  bond: {
    corporate: 0.05,
    government: 0,
  },

  // Dividends: 5%
  dividend: 0.05,
};

/**
 * Calculate tax for a single securities transaction
 */
export function calculateTransactionTax(
  transaction: SecuritiesTransaction,
  method: TaxMethod
): TransactionTaxResult {
  const buyValue = transaction.quantity * transaction.buyPrice;
  const sellValue = transaction.quantity * transaction.sellPrice;
  const totalFees = transaction.buyFee + transaction.sellFee;
  const capitalGain = sellValue - buyValue - totalFees;

  let tax = 0;
  let taxRate = 0;
  let taxableAmount = 0;
  let usedMethod = method;

  switch (transaction.type) {
    case 'listed':
    case 'fund':
      // Always 0.1% on sell value
      taxRate = SECURITIES_TAX_RATES.listed;
      taxableAmount = sellValue;
      tax = sellValue * taxRate;
      usedMethod = 'transaction';
      break;

    case 'unlisted':
      if (method === 'capitalGains') {
        // 20% on capital gains (if profitable)
        taxRate = SECURITIES_TAX_RATES.unlisted.capitalGains;
        taxableAmount = Math.max(0, capitalGain);
        tax = taxableAmount * taxRate;
      } else {
        // 0.1% on sell value
        taxRate = SECURITIES_TAX_RATES.unlisted.transaction;
        taxableAmount = sellValue;
        tax = sellValue * taxRate;
      }
      break;

    case 'bond':
      // Bonds are handled separately (interest income)
      taxRate = 0;
      taxableAmount = 0;
      tax = 0;
      break;
  }

  return {
    id: transaction.id,
    symbol: transaction.symbol,
    type: transaction.type,
    buyValue,
    sellValue,
    totalFees,
    capitalGain,
    taxableAmount,
    tax: Math.round(tax),
    taxRate: taxRate * 100,
    taxMethod: usedMethod,
    netProfit: capitalGain - tax,
  };
}

/**
 * Calculate tax for dividend income
 */
export function calculateDividendTax(dividend: DividendEntry): DividendTaxResult {
  const grossDividend = dividend.dividendPerShare * dividend.shares;
  const taxRate = SECURITIES_TAX_RATES.dividend;
  const tax = Math.round(grossDividend * taxRate);

  return {
    id: dividend.id,
    symbol: dividend.symbol,
    grossDividend,
    tax,
    taxRate: taxRate * 100,
    netDividend: grossDividend - tax,
  };
}

/**
 * Calculate tax for bond interest
 */
export function calculateBondInterestTax(bond: BondInterestEntry): BondInterestTaxResult {
  const taxRate = SECURITIES_TAX_RATES.bond[bond.bondType];
  const tax = Math.round(bond.interestReceived * taxRate);

  return {
    id: bond.id,
    bondName: bond.bondName,
    bondType: bond.bondType,
    interestReceived: bond.interestReceived,
    tax,
    taxRate: taxRate * 100,
    netInterest: bond.interestReceived - tax,
  };
}

/**
 * Calculate complete securities tax
 */
export function calculateSecuritiesTax(input: SecuritiesTaxInput): SecuritiesTaxResult {
  // Calculate transaction taxes
  const transactionResults = input.transactions.map((t) =>
    calculateTransactionTax(t, input.taxMethod)
  );

  const transactionSummary = {
    results: transactionResults,
    totalSellValue: transactionResults.reduce((sum, t) => sum + t.sellValue, 0),
    totalCapitalGain: transactionResults.reduce((sum, t) => sum + t.capitalGain, 0),
    totalFees: transactionResults.reduce((sum, t) => sum + t.totalFees, 0),
    totalTax: transactionResults.reduce((sum, t) => sum + t.tax, 0),
    totalNetProfit: transactionResults.reduce((sum, t) => sum + t.netProfit, 0),
  };

  // Calculate dividend taxes
  const dividendResults = input.dividends.map(calculateDividendTax);

  const dividendSummary = {
    results: dividendResults,
    totalGross: dividendResults.reduce((sum, d) => sum + d.grossDividend, 0),
    totalTax: dividendResults.reduce((sum, d) => sum + d.tax, 0),
    totalNet: dividendResults.reduce((sum, d) => sum + d.netDividend, 0),
  };

  // Calculate bond interest taxes
  const bondResults = input.bonds.map(calculateBondInterestTax);

  const bondSummary = {
    results: bondResults,
    totalInterest: bondResults.reduce((sum, b) => sum + b.interestReceived, 0),
    totalTax: bondResults.reduce((sum, b) => sum + b.tax, 0),
    totalNet: bondResults.reduce((sum, b) => sum + b.netInterest, 0),
  };

  // Calculate summary
  const totalIncome =
    transactionSummary.totalCapitalGain +
    dividendSummary.totalGross +
    bondSummary.totalInterest;

  const totalTax =
    transactionSummary.totalTax +
    dividendSummary.totalTax +
    bondSummary.totalTax;

  const totalNet = totalIncome - totalTax;
  const effectiveTaxRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;

  return {
    transactions: transactionSummary,
    dividends: dividendSummary,
    bonds: bondSummary,
    summary: {
      totalIncome,
      totalTax,
      totalNet,
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
    },
  };
}

/**
 * Compare transaction vs capital gains method for unlisted securities
 */
export function compareUnlistedTaxMethods(
  transactions: SecuritiesTransaction[]
): {
  transactionMethod: { totalTax: number; totalNet: number };
  capitalGainsMethod: { totalTax: number; totalNet: number };
  recommendation: TaxMethod;
  savings: number;
} {
  const unlistedTransactions = transactions.filter((t) => t.type === 'unlisted');

  const transactionResults = unlistedTransactions.map((t) =>
    calculateTransactionTax(t, 'transaction')
  );
  const capitalGainsResults = unlistedTransactions.map((t) =>
    calculateTransactionTax(t, 'capitalGains')
  );

  const transactionTotal = {
    totalTax: transactionResults.reduce((sum, t) => sum + t.tax, 0),
    totalNet: transactionResults.reduce((sum, t) => sum + t.netProfit, 0),
  };

  const capitalGainsTotal = {
    totalTax: capitalGainsResults.reduce((sum, t) => sum + t.tax, 0),
    totalNet: capitalGainsResults.reduce((sum, t) => sum + t.netProfit, 0),
  };

  const recommendation: TaxMethod =
    transactionTotal.totalTax <= capitalGainsTotal.totalTax
      ? 'transaction'
      : 'capitalGains';

  const savings = Math.abs(transactionTotal.totalTax - capitalGainsTotal.totalTax);

  return {
    transactionMethod: transactionTotal,
    capitalGainsMethod: capitalGainsTotal,
    recommendation,
    savings,
  };
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Common stock symbols in Vietnam
 */
export const POPULAR_STOCKS = [
  { symbol: 'VNM', name: 'Vinamilk' },
  { symbol: 'VIC', name: 'Vingroup' },
  { symbol: 'VHM', name: 'Vinhomes' },
  { symbol: 'HPG', name: 'Hòa Phát' },
  { symbol: 'FPT', name: 'FPT Corporation' },
  { symbol: 'MWG', name: 'Thế Giới Di Động' },
  { symbol: 'VCB', name: 'Vietcombank' },
  { symbol: 'BID', name: 'BIDV' },
  { symbol: 'CTG', name: 'VietinBank' },
  { symbol: 'TCB', name: 'Techcombank' },
  { symbol: 'MBB', name: 'MB Bank' },
  { symbol: 'ACB', name: 'ACB' },
  { symbol: 'VPB', name: 'VPBank' },
  { symbol: 'SSI', name: 'SSI Securities' },
  { symbol: 'VND', name: 'VNDS Securities' },
];
