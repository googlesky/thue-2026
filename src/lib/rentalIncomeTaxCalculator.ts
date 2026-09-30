/**
 * Thuế cho thuê bất động sản của cá nhân cư trú
 *
 * Căn cứ:
 * - Luật Thuế TNCN 109/2025/QH15 Điều 7.4 (khoản 1 sửa đổi bởi Luật 09/2026/QH16): cho thuê bất động sản
 *   (trừ kinh doanh lưu trú) nộp TNCN = (doanh thu − 1 tỷ) × 5%, không áp dụng phương pháp thu nhập
 * - Luật Thuế GTGT 48/2024/QH15 Điều 12.2: 5% trên toàn bộ doanh thu khi vượt ngưỡng
 * - NĐ 68/2026/NĐ-CP (sửa đổi bởi NĐ 141/2026/NĐ-CP) Điều 4.4 (trừ ngưỡng theo hợp đồng), Điều 8.3.d, đ
 *   (kỳ khai), TT 18/2026/TT-BTC (Mẫu 01/BĐS, Phụ lục 01/BK-BĐS)
 * - Năm 2025: ngưỡng 100 triệu, TNCN 5% + GTGT 5% trên toàn bộ doanh thu
 *
 * Chi phí (ước tính 10% hoặc thực tế) chỉ dùng để ước tính thu nhập ròng, không làm thay đổi số thuế.
 * Cho thuê xe, máy móc và kinh doanh lưu trú: tính tại tab Hộ kinh doanh.
 */

import { allocateThreshold, generateId, getRevenueThreshold } from './householdBusinessTaxCalculator';

export { generateId };

// Loại bất động sản cho thuê
export type PropertyType = 'residential' | 'commercial' | 'land';

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

export interface RentalIncomeTaxInput {
  properties: RentalProperty[];
  useActualExpenses: boolean; // Chỉ ảnh hưởng ước tính thu nhập ròng
  year: 2025 | 2026;
}

export interface PropertyTaxResult {
  id: string;
  name: string;
  type: PropertyType;
  annualRent: number;
  occupiedMonths: number;
  thresholdDeduction: number; // Phần ngưỡng được trừ cho hợp đồng này
  taxableIncome: number;      // Doanh thu tính TNCN
  pit: number;
  vat: number;
  totalTax: number;
  deemedExpenses: number;     // Chi phí ước tính 10%
  actualExpenses: number;
  deemedNetIncome: number;
  actualNetIncome: number;
}

export interface RentalIncomeTaxResult {
  properties: PropertyTaxResult[];
  summary: {
    totalAnnualRent: number;
    totalPIT: number;
    totalVAT: number;
    totalTax: number;
    thresholdUsed: number;
    totalDeemedExpenses: number;
    totalActualExpenses: number;
    totalDeemedNet: number;
    totalActualNet: number;
    isTaxable: boolean;
    effectiveTaxRate: number; // %
  };
}

export const RENTAL_TAX_RATES = {
  PIT: 0.05,               // TNCN 5%
  VAT: 0.05,               // GTGT 5%
  deemedExpenseRate: 0.10, // Chi phí ước tính 10% (chỉ để ước tính thu nhập ròng)
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'Nhà ở, căn hộ',
  commercial: 'Mặt bằng, văn phòng, nhà xưởng, kho bãi',
  land: 'Đất',
};

const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);

/**
 * Tính thuế cho thuê bất động sản (nhiều hợp đồng)
 */
export function calculateRentalIncomeTax(
  input: RentalIncomeTaxInput
): RentalIncomeTaxResult {
  const threshold = getRevenueThreshold(input.year);
  const rents = input.properties.map((p) => p.monthlyRent * p.occupiedMonths);
  const totalAnnualRent = sum(rents);
  const isTaxable = totalAnnualRent > threshold;
  // Từ 2026: mức trừ 1 tỷ áp dụng cho một hoặc một số hợp đồng, tổng không quá 1 tỷ
  // (NĐ 68/2026 Điều 4.4); cùng thuế suất 5% nên tổng thuế không phụ thuộc thứ tự trừ.
  // Năm 2025: thuế tính trên toàn bộ doanh thu.
  const deductions = isTaxable && input.year >= 2026
    ? allocateThreshold(rents.map((revenue) => ({ revenue, rate: RENTAL_TAX_RATES.PIT })), threshold)
    : rents.map(() => 0);

  const properties: PropertyTaxResult[] = input.properties.map((p, i) => {
    const annualRent = rents[i];
    const taxableIncome = isTaxable ? annualRent - deductions[i] : 0;
    const pit = Math.round(taxableIncome * RENTAL_TAX_RATES.PIT);
    const vat = isTaxable ? Math.round(annualRent * RENTAL_TAX_RATES.VAT) : 0;
    const totalTax = pit + vat;
    const deemedExpenses = Math.round(annualRent * RENTAL_TAX_RATES.deemedExpenseRate);
    const actualExpenses = sum(Object.values(p.expenses));
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      annualRent,
      occupiedMonths: p.occupiedMonths,
      thresholdDeduction: deductions[i],
      taxableIncome,
      pit,
      vat,
      totalTax,
      deemedExpenses,
      actualExpenses,
      deemedNetIncome: annualRent - totalTax - deemedExpenses,
      actualNetIncome: annualRent - totalTax - actualExpenses,
    };
  });

  const total = (pick: (r: PropertyTaxResult) => number) => sum(properties.map(pick));
  const totalTax = total((r) => r.totalTax);

  return {
    properties,
    summary: {
      totalAnnualRent,
      totalPIT: total((r) => r.pit),
      totalVAT: total((r) => r.vat),
      totalTax,
      thresholdUsed: sum(deductions),
      totalDeemedExpenses: total((r) => r.deemedExpenses),
      totalActualExpenses: total((r) => r.actualExpenses),
      totalDeemedNet: total((r) => r.deemedNetIncome),
      totalActualNet: total((r) => r.actualNetIncome),
      isTaxable,
      effectiveTaxRate: totalAnnualRent > 0 ? Math.round((totalTax / totalAnnualRent) * 10000) / 100 : 0,
    },
  };
}

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
