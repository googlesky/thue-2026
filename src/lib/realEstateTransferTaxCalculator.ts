/**
 * Real Estate Transfer Tax Calculator for Vietnam
 * Reference: Luật Thuế TNCN 2007, Circular 111/2013/TT-BTC
 *
 * Tax Structure:
 * - PIT on real estate transfer: 2% of transfer value
 * - Registration fee: 0.5% of property value
 * - Notary fees: varies
 *
 * Exemptions:
 * - Transfer between spouse, parents-children, siblings
 * - First-time homebuyers (with conditions)
 * - Inherited property (subject to inheritance tax rules)
 */

// Property types for transfer
export type RealEstateType =
  | 'land'           // Đất đai
  | 'house'          // Nhà ở
  | 'apartment'      // Căn hộ chung cư
  | 'land_house'     // Đất và nhà trên đất
  | 'commercial';    // Bất động sản thương mại

// Transfer type
export type TransferType =
  | 'sale'           // Mua bán thông thường
  | 'inheritance'    // Thừa kế
  | 'gift'           // Tặng cho
  | 'family';        // Chuyển nhượng trong gia đình

// Family relationship for exemption check
export type FamilyRelationship =
  | 'spouse'         // Vợ/chồng
  | 'parent_child'   // Cha mẹ - con cái
  | 'sibling'        // Anh chị em ruột
  | 'grandparent'    // Ông bà - cháu
  | 'other'          // Quan hệ khác
  | 'none';          // Không có quan hệ

// Real estate transfer transaction
export interface RealEstateTransfer {
  id: string;
  propertyType: RealEstateType;
  transferType: TransferType;
  propertyAddress: string;
  landArea: number;          // m2
  buildingArea?: number;     // m2 (for houses/apartments)
  transferValue: number;     // Giá chuyển nhượng
  purchaseValue?: number;    // Giá mua ban đầu (nếu có)
  purchaseDate?: string;     // Ngày mua ban đầu
  transferDate: string;      // Ngày chuyển nhượng
  relationship?: FamilyRelationship;
  isFirstHome?: boolean;     // Nhà đầu tiên
  notes?: string;
}

// Tax calculation input
export interface RealEstateTransferTaxInput {
  transfers: RealEstateTransfer[];
}

// Individual transfer result
export interface RealEstateTransferResult {
  id: string;
  propertyType: RealEstateType;
  transferType: TransferType;
  transferValue: number;
  // Capital gains calculation (for reference)
  capitalGain: number;
  holdingPeriod: number; // months
  // Tax calculations
  pitTaxable: number;
  pitRate: number;
  pitAmount: number;
  registrationFee: number;
  registrationRate: number;
  totalFees: number;
  netProceeds: number;
  // Exemption info
  isExempt: boolean;
  exemptionReason?: string;
  exemptionAmount: number;
}

// Complete real estate transfer tax result
export interface RealEstateTransferTaxResult {
  transfers: RealEstateTransferResult[];
  summary: {
    totalTransferValue: number;
    totalCapitalGain: number;
    totalPIT: number;
    totalRegistrationFee: number;
    totalFees: number;
    totalNetProceeds: number;
    totalExemptions: number;
    effectiveTaxRate: number;
  };
}

// Tax rates
export const REAL_ESTATE_TAX_RATES = {
  pit: 0.02,                 // 2% PIT on transfer value
  registrationFee: 0.005,    // 0.5% registration fee
};

// Property type labels
export const PROPERTY_TYPE_LABELS: Record<RealEstateType, string> = {
  land: 'Đất đai (chỉ có quyền sử dụng đất)',
  house: 'Nhà ở riêng lẻ',
  apartment: 'Căn hộ chung cư',
  land_house: 'Đất và nhà trên đất',
  commercial: 'Bất động sản thương mại',
};

// Transfer type labels
export const TRANSFER_TYPE_LABELS: Record<TransferType, string> = {
  sale: 'Mua bán thông thường',
  inheritance: 'Thừa kế',
  gift: 'Tặng cho',
  family: 'Chuyển nhượng trong gia đình',
};

// Family relationship labels
export const FAMILY_RELATIONSHIP_LABELS: Record<FamilyRelationship, string> = {
  spouse: 'Vợ/chồng',
  parent_child: 'Cha mẹ - con cái',
  sibling: 'Anh chị em ruột',
  grandparent: 'Ông bà - cháu',
  other: 'Quan hệ họ hàng khác',
  none: 'Không có quan hệ gia đình',
};

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Check if transfer is exempt from PIT
 */
export function checkExemption(
  transfer: RealEstateTransfer
): { isExempt: boolean; reason?: string } {
  // Family transfers (spouse, parent-child, siblings)
  if (transfer.transferType === 'family') {
    if (transfer.relationship === 'spouse') {
      return {
        isExempt: true,
        reason: 'Chuyển nhượng giữa vợ và chồng được miễn thuế TNCN',
      };
    }
    if (transfer.relationship === 'parent_child') {
      return {
        isExempt: true,
        reason: 'Chuyển nhượng giữa cha mẹ và con cái được miễn thuế TNCN',
      };
    }
    if (transfer.relationship === 'sibling') {
      return {
        isExempt: true,
        reason: 'Chuyển nhượng giữa anh chị em ruột được miễn thuế TNCN',
      };
    }
  }

  // Inheritance
  if (transfer.transferType === 'inheritance') {
    if (
      transfer.relationship === 'spouse' ||
      transfer.relationship === 'parent_child'
    ) {
      return {
        isExempt: true,
        reason: 'Thừa kế từ vợ/chồng, cha mẹ/con cái được miễn thuế TNCN',
      };
    }
    // Other inheritance is taxed at 10% on value above 10M
    return {
      isExempt: false,
      reason: 'Thừa kế từ người khác chịu thuế 10% trên phần giá trị trên 10 triệu',
    };
  }

  // Gift between certain family members
  if (transfer.transferType === 'gift') {
    if (
      transfer.relationship === 'spouse' ||
      transfer.relationship === 'parent_child' ||
      transfer.relationship === 'sibling' ||
      transfer.relationship === 'grandparent'
    ) {
      return {
        isExempt: true,
        reason: 'Tặng cho trong gia đình (vợ chồng, cha mẹ con, anh chị em, ông bà cháu) được miễn thuế',
      };
    }
  }

  // First home exemption (limited conditions)
  if (transfer.isFirstHome && transfer.transferType === 'sale') {
    // Note: This exemption has specific conditions in Vietnamese law
    return {
      isExempt: false,
      reason: 'Mua nhà lần đầu: cần kiểm tra điều kiện cụ thể theo quy định',
    };
  }

  return { isExempt: false };
}

/**
 * Calculate holding period in months
 */
export function calculateHoldingPeriod(
  purchaseDate?: string,
  transferDate?: string
): number {
  if (!purchaseDate || !transferDate) return 0;

  const purchase = new Date(purchaseDate);
  const transfer = new Date(transferDate);
  const months =
    (transfer.getFullYear() - purchase.getFullYear()) * 12 +
    (transfer.getMonth() - purchase.getMonth());

  return Math.max(0, months);
}

/**
 * Calculate tax for a single real estate transfer
 */
export function calculateTransferTax(
  transfer: RealEstateTransfer
): RealEstateTransferResult {
  // Check exemption
  const { isExempt, reason } = checkExemption(transfer);

  // Calculate capital gain (for reference)
  const capitalGain =
    transfer.purchaseValue !== undefined
      ? transfer.transferValue - transfer.purchaseValue
      : 0;

  const holdingPeriod = calculateHoldingPeriod(
    transfer.purchaseDate,
    transfer.transferDate
  );

  // Calculate PIT
  let pitAmount = 0;
  let exemptionAmount = 0;
  const pitRate = REAL_ESTATE_TAX_RATES.pit;

  if (isExempt) {
    exemptionAmount = Math.round(transfer.transferValue * pitRate);
  } else {
    pitAmount = Math.round(transfer.transferValue * pitRate);
  }

  // Registration fee (always applicable, even for exempt transfers)
  // Exempt transfers may have reduced registration fee in some cases
  const registrationRate = REAL_ESTATE_TAX_RATES.registrationFee;
  const registrationFee = isExempt
    ? 0 // Family transfers often exempt from registration fee too
    : Math.round(transfer.transferValue * registrationRate);

  const totalFees = pitAmount + registrationFee;
  const netProceeds = transfer.transferValue - totalFees;

  return {
    id: transfer.id,
    propertyType: transfer.propertyType,
    transferType: transfer.transferType,
    transferValue: transfer.transferValue,
    capitalGain,
    holdingPeriod,
    pitTaxable: isExempt ? 0 : transfer.transferValue,
    pitRate: pitRate * 100,
    pitAmount,
    registrationFee,
    registrationRate: registrationRate * 100,
    totalFees,
    netProceeds,
    isExempt,
    exemptionReason: reason,
    exemptionAmount,
  };
}

/**
 * Calculate complete real estate transfer tax
 */
export function calculateRealEstateTransferTax(
  input: RealEstateTransferTaxInput
): RealEstateTransferTaxResult {
  // Calculate tax for each transfer
  const transferResults = input.transfers.map(calculateTransferTax);

  // Calculate summary
  const totalTransferValue = transferResults.reduce(
    (sum, t) => sum + t.transferValue,
    0
  );
  const totalCapitalGain = transferResults.reduce(
    (sum, t) => sum + t.capitalGain,
    0
  );
  const totalPIT = transferResults.reduce((sum, t) => sum + t.pitAmount, 0);
  const totalRegistrationFee = transferResults.reduce(
    (sum, t) => sum + t.registrationFee,
    0
  );
  const totalFees = totalPIT + totalRegistrationFee;
  const totalNetProceeds = transferResults.reduce(
    (sum, t) => sum + t.netProceeds,
    0
  );
  const totalExemptions = transferResults.reduce(
    (sum, t) => sum + t.exemptionAmount,
    0
  );
  const effectiveTaxRate =
    totalTransferValue > 0 ? (totalFees / totalTransferValue) * 100 : 0;

  return {
    transfers: transferResults,
    summary: {
      totalTransferValue,
      totalCapitalGain,
      totalPIT,
      totalRegistrationFee,
      totalFees,
      totalNetProceeds,
      totalExemptions,
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
    },
  };
}

/**
 * Create empty transfer
 */
export function createEmptyTransfer(): RealEstateTransfer {
  return {
    id: generateId(),
    propertyType: 'apartment',
    transferType: 'sale',
    propertyAddress: '',
    landArea: 0,
    buildingArea: 0,
    transferValue: 0,
    transferDate: new Date().toISOString().split('T')[0],
    relationship: 'none',
    isFirstHome: false,
  };
}

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
 * Average property prices by location (for reference)
 */
export const REFERENCE_PROPERTY_PRICES = {
  hcm: {
    district1: { apartment: 150_000_000, house: 300_000_000 }, // per m2
    district2: { apartment: 80_000_000, house: 150_000_000 },
    district7: { apartment: 70_000_000, house: 120_000_000 },
    thuDuc: { apartment: 50_000_000, house: 80_000_000 },
    suburban: { apartment: 30_000_000, house: 50_000_000 },
  },
  hanoi: {
    hoanKiem: { apartment: 200_000_000, house: 400_000_000 },
    dongDa: { apartment: 100_000_000, house: 200_000_000 },
    cauGiay: { apartment: 80_000_000, house: 150_000_000 },
    longBien: { apartment: 50_000_000, house: 80_000_000 },
    suburban: { apartment: 30_000_000, house: 50_000_000 },
  },
};

/**
 * Estimate tax for quick calculation
 */
export function estimateTransferTax(
  transferValue: number,
  isExempt: boolean = false
): {
  pit: number;
  registrationFee: number;
  total: number;
  netProceeds: number;
} {
  const pit = isExempt
    ? 0
    : Math.round(transferValue * REAL_ESTATE_TAX_RATES.pit);
  const registrationFee = isExempt
    ? 0
    : Math.round(transferValue * REAL_ESTATE_TAX_RATES.registrationFee);
  const total = pit + registrationFee;
  const netProceeds = transferValue - total;

  return { pit, registrationFee, total, netProceeds };
}
