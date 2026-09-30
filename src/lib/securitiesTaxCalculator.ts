/**
 * Thuế TNCN đối với đầu tư chứng khoán (cá nhân cư trú)
 *
 * Căn cứ: Luật Thuế TNCN số 109/2025/QH15 Điều 12 (đầu tư vốn 5%), Điều 13 khoản 2 (chuyển nhượng
 * chứng khoán 0,1% × giá chuyển nhượng từng lần), Điều 4 khoản 6, 16 và Điều 5 khoản 4, 5 (miễn, giảm);
 * NĐ 253/2026/NĐ-CP Điều 24, 34, 43, 44, 52–56; TT 87/2026/TT-BTC (phái sinh 0,1%).
 * - Mọi chứng khoán (cổ phiếu niêm yết/chưa niêm yết, trái phiếu, chứng chỉ quỹ): 0,1% giá bán, kể cả khi lỗ.
 *   Không còn phương án 20% trên lãi (20% lãi / 2% giá chỉ áp cho chuyển nhượng VỐN GÓP - Luật Điều 13.1).
 * - Chứng chỉ quỹ mở nắm giữ từ đủ 2 năm, bán từ 01/7/2026: miễn (mua trước bán trước).
 * - Cổ tức 5%; lợi tức chia từ quỹ đầu tư chứng khoán/quỹ BĐS: giảm 50% (2,5%) từ 01/7/2026 đến hết 30/6/2031.
 * - Lãi trái phiếu Chính phủ, chính quyền địa phương, trái phiếu xanh: miễn; trái phiếu doanh nghiệp: 5%.
 */

// 'fund' = chứng chỉ quỹ mở (ETF, quỹ đóng niêm yết: chọn 'listed')
export type SecuritiesType = 'listed' | 'unlisted' | 'fund' | 'bond';

// Bond types
export type BondType = 'government' | 'localGovernment' | 'green' | 'corporate';

// Individual securities transaction
export interface SecuritiesTransaction {
  id: string;
  type: SecuritiesType;
  symbol: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyDate: string; // YYYY-MM-DD (cần cho chứng chỉ quỹ mở)
  sellDate: string; // YYYY-MM-DD (trống = hôm nay)
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
  fromFund?: boolean; // Lợi tức chia từ quỹ đầu tư chứng khoán / quỹ đầu tư BĐS
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
  calculationDate?: Date; // Ngày tính (mặc định hôm nay): ngày bán trống, ngày nhận lợi tức quỹ
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
  taxRate: number; // %
  netProfit: number;
  note?: string; // Lý do miễn thuế
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
    effectiveTaxRate: number; // % thuế / tổng tiền nhận (giá bán + cổ tức + lãi)
  };
}

// Tax rates
export const SECURITIES_TAX_RATES = {
  transfer: 0.001, // Mọi chứng khoán: 0,1% giá chuyển nhượng
  dividend: 0.05, // Cổ tức, lợi tức: 5%
  fundDistribution: 0.025, // Lợi tức từ quỹ đầu tư CK/quỹ BĐS: giảm 50%
  bond: {
    government: 0, // Miễn (Luật Điều 4 khoản 6)
    localGovernment: 0, // Miễn (Luật Điều 4 khoản 6)
    green: 0, // Miễn (Luật Điều 4 khoản 16)
    corporate: 0.05,
  },
};

const LAW_109_EFFECTIVE = new Date(2026, 6, 1); // Luật 109/2025/QH15, NĐ 253/2026 có hiệu lực
const FUND_DISTRIBUTION_REDUCTION_END = new Date(2031, 6, 1); // giảm 50% đến hết 30/6/2031

function parseDate(value: string | undefined): Date | null {
  const [y, m, d] = (value ?? '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

/**
 * Chứng chỉ quỹ mở nắm giữ từ đủ 02 năm kể từ ngày mua, bán từ 01/7/2026: miễn thuế
 * (Luật Điều 5 khoản 4; NĐ 253/2026 Điều 43 - áp dụng cả chứng chỉ mua trước 01/7/2026).
 */
export function isOpenFundExempt(buyDate: string, sellDate: Date): boolean {
  const buy = parseDate(buyDate);
  if (!buy || sellDate < LAW_109_EFFECTIVE) return false;
  return sellDate >= new Date(buy.getFullYear() + 2, buy.getMonth(), buy.getDate());
}

/**
 * Calculate tax for a single securities transaction
 */
export function calculateTransactionTax(
  transaction: SecuritiesTransaction,
  calculationDate: Date = new Date()
): TransactionTaxResult {
  const buyValue = transaction.quantity * transaction.buyPrice;
  const sellValue = transaction.quantity * transaction.sellPrice;
  const totalFees = transaction.buyFee + transaction.sellFee;
  const capitalGain = sellValue - buyValue - totalFees;

  const sellDate = parseDate(transaction.sellDate) ?? calculationDate;
  const exempt = transaction.type === 'fund' && isOpenFundExempt(transaction.buyDate, sellDate);
  const taxRate = exempt ? 0 : SECURITIES_TAX_RATES.transfer;
  const tax = Math.round(sellValue * taxRate);

  return {
    id: transaction.id,
    symbol: transaction.symbol,
    type: transaction.type,
    buyValue,
    sellValue,
    totalFees,
    capitalGain,
    taxableAmount: exempt ? 0 : sellValue,
    tax,
    taxRate: taxRate * 100,
    netProfit: capitalGain - tax,
    note: exempt ? 'Miễn thuế: chứng chỉ quỹ mở nắm giữ từ đủ 2 năm (NĐ 253/2026 Điều 43)' : undefined,
  };
}

/**
 * Calculate tax for dividend income
 */
export function calculateDividendTax(
  dividend: DividendEntry,
  calculationDate: Date = new Date()
): DividendTaxResult {
  const grossDividend = dividend.dividendPerShare * dividend.shares;
  const reduced = dividend.fromFund === true
    && calculationDate >= LAW_109_EFFECTIVE
    && calculationDate < FUND_DISTRIBUTION_REDUCTION_END;
  const taxRate = reduced ? SECURITIES_TAX_RATES.fundDistribution : SECURITIES_TAX_RATES.dividend;
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
  const taxRate = SECURITIES_TAX_RATES.bond[bond.bondType] ?? SECURITIES_TAX_RATES.bond.corporate;
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
  const date = input.calculationDate ?? new Date();

  // Calculate transaction taxes
  const transactionResults = input.transactions.map((t) => calculateTransactionTax(t, date));

  const transactionSummary = {
    results: transactionResults,
    totalSellValue: transactionResults.reduce((sum, t) => sum + t.sellValue, 0),
    totalCapitalGain: transactionResults.reduce((sum, t) => sum + t.capitalGain, 0),
    totalFees: transactionResults.reduce((sum, t) => sum + t.totalFees, 0),
    totalTax: transactionResults.reduce((sum, t) => sum + t.tax, 0),
    totalNetProfit: transactionResults.reduce((sum, t) => sum + t.netProfit, 0),
  };

  // Calculate dividend taxes
  const dividendResults = input.dividends.map((d) => calculateDividendTax(d, date));

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

  // Thuế tính trên giá bán/cổ tức/lãi nhận được (lãi vốn có thể âm) -> tỷ lệ trên tổng tiền nhận
  const totalReceived =
    transactionSummary.totalSellValue + dividendSummary.totalGross + bondSummary.totalInterest;
  const effectiveTaxRate = totalReceived > 0 ? (totalTax / totalReceived) * 100 : 0;

  return {
    transactions: transactionSummary,
    dividends: dividendSummary,
    bonds: bondSummary,
    summary: {
      totalIncome,
      totalTax,
      totalNet: totalIncome - totalTax,
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
    },
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
