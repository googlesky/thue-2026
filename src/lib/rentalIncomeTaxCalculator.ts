/**
 * Rental Income Tax Calculator for Vietnam
 * Reference: Circular 92/2015/TT-BTC, Circular 40/2021/TT-BTC
 *
 * Tax Structure:
 * - PIT: 5% of rental income
 * - VAT: 5% of rental income (if annual revenue > 100M VND)
 * - Total: 10% (typical case)
 *
 * Expense Deduction Methods:
 * 1. Deemed expenses: 10% of revenue (default for individuals)
 * 2. Actual expenses: Document actual costs (for registered businesses)
 */

// Property types
export type PropertyType = 'residential' | 'commercial' | 'land' | 'vehicle' | 'equipment';

// Rental period type
export type RentalPeriod = 'monthly' | 'yearly';

// Individual rental property
export interface RentalProperty {
  id: string;
  name: string;
  type: PropertyType;
  address: string;
  monthlyRent: number;
  occupiedMonths: number; // Months rented in the year (1-12)
  // Expense tracking
  expenses: {
    maintenance: number;
    utilities: number;
    management: number;
    depreciation: number;
    insurance: number;
    otherExpenses: number;
  };
}

// Rental income tax input
export interface RentalIncomeTaxInput {
  properties: RentalProperty[];
  useActualExpenses: boolean; // If false, use deemed expenses (10%)
  year: 2025 | 2026;
}

// Individual property result
export interface PropertyTaxResult {
  id: string;
  name: string;
  type: PropertyType;
  annualRent: number;
  occupiedMonths: number;
  // Deemed expense method
  deemedExpenses: number;
  deemedTaxableIncome: number;
  // Actual expense method
  actualExpenses: number;
  actualTaxableIncome: number;
  // Tax amounts
  deemedPIT: number;
  deemedVAT: number;
  deemedTotalTax: number;
  actualPIT: number;
  actualVAT: number;
  actualTotalTax: number;
  // Net income
  deemedNetIncome: number;
  actualNetIncome: number;
  // Recommended method
  recommendedMethod: 'deemed' | 'actual';
  savings: number;
}

// Complete rental income tax result
export interface RentalIncomeTaxResult {
  properties: PropertyTaxResult[];
  summary: {
    totalAnnualRent: number;
    totalDeemedExpenses: number;
    totalActualExpenses: number;
    totalDeemedTax: number;
    totalActualTax: number;
    totalDeemedNet: number;
    totalActualNet: number;
    recommendedMethod: 'deemed' | 'actual';
    potentialSavings: number;
    isVATApplicable: boolean;
    effectiveTaxRate: number;
  };
}

// Tax rates
export const RENTAL_TAX_RATES = {
  PIT: 0.05,           // 5% Personal Income Tax
  VAT: 0.05,           // 5% VAT (if applicable)
  deemedExpenseRate: 0.10, // 10% deemed expenses
};

// VAT threshold (100 million VND annual revenue)
export const VAT_THRESHOLD = 100_000_000;

// Property type labels
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'Nhà ở / Căn hộ',
  commercial: 'Mặt bằng kinh doanh',
  land: 'Đất trống',
  vehicle: 'Phương tiện',
  equipment: 'Thiết bị / Máy móc',
};

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Calculate tax for a single rental property
 */
export function calculatePropertyTax(
  property: RentalProperty,
  totalAnnualRent: number
): PropertyTaxResult {
  const annualRent = property.monthlyRent * property.occupiedMonths;

  // Check if VAT applies (total annual rent > threshold)
  const isVATApplicable = totalAnnualRent > VAT_THRESHOLD;

  // Deemed expense method (10% of revenue)
  const deemedExpenses = Math.round(annualRent * RENTAL_TAX_RATES.deemedExpenseRate);
  const deemedTaxableIncome = annualRent - deemedExpenses;
  const deemedPIT = Math.round(deemedTaxableIncome * RENTAL_TAX_RATES.PIT);
  const deemedVAT = isVATApplicable ? Math.round(annualRent * RENTAL_TAX_RATES.VAT) : 0;
  const deemedTotalTax = deemedPIT + deemedVAT;
  const deemedNetIncome = annualRent - deemedTotalTax;

  // Actual expense method
  const actualExpenses =
    property.expenses.maintenance +
    property.expenses.utilities +
    property.expenses.management +
    property.expenses.depreciation +
    property.expenses.insurance +
    property.expenses.otherExpenses;
  const actualTaxableIncome = Math.max(0, annualRent - actualExpenses);
  const actualPIT = Math.round(actualTaxableIncome * RENTAL_TAX_RATES.PIT);
  const actualVAT = isVATApplicable ? Math.round(annualRent * RENTAL_TAX_RATES.VAT) : 0;
  const actualTotalTax = actualPIT + actualVAT;
  const actualNetIncome = annualRent - actualTotalTax - actualExpenses;

  // Determine recommended method
  const recommendedMethod = deemedNetIncome >= actualNetIncome ? 'deemed' : 'actual';
  const savings = Math.abs(deemedNetIncome - actualNetIncome);

  return {
    id: property.id,
    name: property.name,
    type: property.type,
    annualRent,
    occupiedMonths: property.occupiedMonths,
    deemedExpenses,
    deemedTaxableIncome,
    actualExpenses,
    actualTaxableIncome,
    deemedPIT,
    deemedVAT,
    deemedTotalTax,
    actualPIT,
    actualVAT,
    actualTotalTax,
    deemedNetIncome,
    actualNetIncome,
    recommendedMethod,
    savings,
  };
}

/**
 * Calculate complete rental income tax
 */
export function calculateRentalIncomeTax(
  input: RentalIncomeTaxInput
): RentalIncomeTaxResult {
  // Calculate total annual rent first (for VAT threshold check)
  const totalAnnualRent = input.properties.reduce(
    (sum, p) => sum + p.monthlyRent * p.occupiedMonths,
    0
  );

  // Calculate tax for each property
  const propertyResults = input.properties.map((p) =>
    calculatePropertyTax(p, totalAnnualRent)
  );

  // Aggregate results
  const totalDeemedExpenses = propertyResults.reduce(
    (sum, r) => sum + r.deemedExpenses,
    0
  );
  const totalActualExpenses = propertyResults.reduce(
    (sum, r) => sum + r.actualExpenses,
    0
  );
  const totalDeemedTax = propertyResults.reduce(
    (sum, r) => sum + r.deemedTotalTax,
    0
  );
  const totalActualTax = propertyResults.reduce(
    (sum, r) => sum + r.actualTotalTax,
    0
  );
  const totalDeemedNet = propertyResults.reduce(
    (sum, r) => sum + r.deemedNetIncome,
    0
  );
  const totalActualNet = propertyResults.reduce(
    (sum, r) => sum + r.actualNetIncome,
    0
  );

  // Determine overall recommended method
  const recommendedMethod = totalDeemedNet >= totalActualNet ? 'deemed' : 'actual';
  const potentialSavings = Math.abs(totalDeemedNet - totalActualNet);

  // Calculate effective tax rate based on selected method
  const usedTax = input.useActualExpenses ? totalActualTax : totalDeemedTax;
  const effectiveTaxRate =
    totalAnnualRent > 0
      ? Math.round((usedTax / totalAnnualRent) * 10000) / 100
      : 0;

  return {
    properties: propertyResults,
    summary: {
      totalAnnualRent,
      totalDeemedExpenses,
      totalActualExpenses,
      totalDeemedTax,
      totalActualTax,
      totalDeemedNet,
      totalActualNet,
      recommendedMethod,
      potentialSavings,
      isVATApplicable: totalAnnualRent > VAT_THRESHOLD,
      effectiveTaxRate,
    },
  };
}

/**
 * Create default expense structure
 */
export function createDefaultExpenses(): RentalProperty['expenses'] {
  return {
    maintenance: 0,
    utilities: 0,
    management: 0,
    depreciation: 0,
    insurance: 0,
    otherExpenses: 0,
  };
}

/**
 * Create a new empty property
 */
export function createEmptyProperty(): RentalProperty {
  return {
    id: generateId(),
    name: '',
    type: 'residential',
    address: '',
    monthlyRent: 0,
    occupiedMonths: 12,
    expenses: createDefaultExpenses(),
  };
}

/**
 * Common rental rates in Vietnam (for reference)
 */
export const COMMON_RENTAL_RATES = {
  residential: {
    apartment1BR: { min: 5_000_000, max: 15_000_000, label: 'Căn hộ 1 phòng ngủ' },
    apartment2BR: { min: 8_000_000, max: 25_000_000, label: 'Căn hộ 2 phòng ngủ' },
    apartment3BR: { min: 15_000_000, max: 50_000_000, label: 'Căn hộ 3 phòng ngủ' },
    house: { min: 10_000_000, max: 100_000_000, label: 'Nhà phố' },
    villa: { min: 30_000_000, max: 200_000_000, label: 'Biệt thự' },
  },
  commercial: {
    smallShop: { min: 5_000_000, max: 30_000_000, label: 'Cửa hàng nhỏ' },
    office: { min: 10_000_000, max: 100_000_000, label: 'Văn phòng' },
    warehouse: { min: 20_000_000, max: 200_000_000, label: 'Kho xưởng' },
  },
};

/**
 * Expense categories for rental properties
 */
export const EXPENSE_CATEGORIES = [
  { key: 'maintenance', label: 'Bảo trì, sửa chữa', description: 'Chi phí sửa chữa, bảo dưỡng định kỳ' },
  { key: 'utilities', label: 'Điện, nước (do chủ trả)', description: 'Tiền điện, nước, internet mà chủ nhà chi trả' },
  { key: 'management', label: 'Phí quản lý', description: 'Phí quản lý chung cư, dịch vụ' },
  { key: 'depreciation', label: 'Khấu hao tài sản', description: 'Khấu hao nội thất, thiết bị' },
  { key: 'insurance', label: 'Bảo hiểm', description: 'Bảo hiểm tài sản, cháy nổ' },
  { key: 'otherExpenses', label: 'Chi phí khác', description: 'Môi giới, quảng cáo, pháp lý' },
] as const;
