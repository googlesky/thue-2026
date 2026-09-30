/**
 * Thuế TNCN đối với thu nhập từ nhận thừa kế, quà tặng
 *
 * Căn cứ pháp lý (hiệu lực 01/7/2026):
 * - Luật Thuế TNCN 109/2025/QH15: Điều 3.9 (chỉ chứng khoán, phần vốn, bất động sản và tài sản
 *   phải đăng ký sở hữu/sử dụng mới chịu thuế), Điều 4.1 (miễn với BẤT ĐỘNG SẢN giữa người thân),
 *   Điều 18 (10% × phần vượt 20 triệu theo từng lần nhận), Điều 26 (không cư trú: như trên)
 * - NĐ 253/2026/NĐ-CP: Điều 15 (loại tài sản), Điều 18 (miễn), Điều 61 (định giá, thời điểm tính)
 * - NĐ 252/2026/NĐ-CP Điều 10 (hạn nộp hồ sơ khai thuế)
 * Trước 01/7/2026: ngưỡng 10 triệu/lần (getPerTransactionThreshold).
 */

import { formatNumber, getPerTransactionThreshold } from '@/lib/taxCalculator';

// ===== CONSTANTS =====

/** Thuế suất 10% trên phần vượt ngưỡng (Luật 109/2025/QH15 Điều 18) */
export const INHERITANCE_GIFT_TAX_RATE = 0.10;

/**
 * Hạn nộp hồ sơ khai thuế theo từng lần phát sinh: chậm nhất ngày thứ 10 kể từ ngày tiếp theo
 * ngày phát sinh (NĐ 252/2026/NĐ-CP Điều 10.1). BĐS có hạn riêng (Điều 10.8).
 */
export const TAX_DECLARATION_DEADLINE_DAYS = 10;

// ===== TYPES =====

export type TransactionType = 'inheritance' | 'gift';

/**
 * Quan hệ với người để lại/người tặng.
 * Nhóm miễn (Luật 109 Điều 4.1) CHỈ áp dụng cho bất động sản.
 */
export type Relationship =
  | 'spouse' // Vợ – chồng
  | 'parent_child' // Cha mẹ đẻ – con đẻ; cha mẹ nuôi – con nuôi
  | 'parent_in_law' // Cha mẹ chồng – con dâu; cha mẹ vợ – con rể
  | 'grandparent_grandchild' // Ông bà nội/ngoại – cháu nội/ngoại
  | 'siblings' // Anh, chị, em ruột
  | 'other_relative' // Họ hàng khác
  | 'non_relative'; // Không có quan hệ họ hàng

export type AssetType =
  | 'real_estate' // Bất động sản
  | 'securities' // Chứng khoán
  | 'capital' // Phần vốn góp
  | 'vehicles' // Ô tô, xe máy (phải đăng ký)
  | 'other' // Tài sản khác phải đăng ký (tàu thuyền, tàu bay...)
  | 'cash' // Tiền mặt, tiền gửi — không chịu thuế
  | 'jewelry'; // Vàng, trang sức, tài sản không phải đăng ký — không chịu thuế

export interface AssetInfo {
  type: AssetType;
  value: number;
  description?: string;
}

export interface InheritanceGiftTaxInput {
  transactionType: TransactionType;
  relationship: Relationship;
  assets: AssetInfo[];
  /** Ngày nhận; với tài sản phải đăng ký là ngày đăng ký quyền sở hữu (NĐ 253 Điều 61.3.b) */
  transactionDate?: Date;
}

export interface InheritanceGiftTaxResult {
  totalValue: number;
  nonTaxableValue: number; // Tiền, vàng, trang sức... không thuộc diện chịu thuế
  exemptValue: number; // BĐS giữa người thân được miễn
  taxableValue: number; // Giá trị còn lại thuộc diện chịu thuế (trước ngưỡng)
  isExempt: boolean; // true khi không phải nộp thuế
  exemptReason?: string;
  threshold: number; // Ngưỡng mỗi lần nhận (10tr trước 01/7/2026, 20tr từ 01/7/2026)
  taxableAmount: number; // Thu nhập tính thuế = phần vượt ngưỡng
  taxAmount: number;
  effectiveRate: number;
  declarationDeadline?: Date;
  requiredDocuments: string[];
  notes: string[];
}

// ===== HELPER FUNCTIONS =====

/** Parse giá trị input type="date" (YYYY-MM-DD) thành Date giờ địa phương (tránh lệch UTC) */
export function parseDateInput(value: string): Date | undefined {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
}

const EXEMPT_RELATIONSHIPS: Relationship[] = [
  'spouse',
  'parent_child',
  'parent_in_law',
  'grandparent_grandchild',
  'siblings',
];

/**
 * Quan hệ thuộc danh sách miễn thuế của Luật 109/2025/QH15 Điều 4.1 (NĐ 253 Điều 18.1).
 * Chỉ miễn cho BẤT ĐỘNG SẢN (chuyển nhượng, thừa kế, tặng cho).
 */
export function isExemptRelationship(relationship: Relationship): boolean {
  return EXEMPT_RELATIONSHIPS.includes(relationship);
}

/** Tiền, tiền gửi, vàng, trang sức... không phải tài sản phải đăng ký → không chịu thuế (Điều 3.9) */
export function isTaxableAssetType(type: AssetType): boolean {
  return type !== 'cash' && type !== 'jewelry';
}

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  spouse: 'Vợ – chồng',
  parent_child: 'Cha mẹ đẻ – con đẻ; cha mẹ nuôi – con nuôi',
  parent_in_law: 'Cha mẹ chồng – con dâu; cha mẹ vợ – con rể',
  grandparent_grandchild: 'Ông bà nội – cháu nội; ông bà ngoại – cháu ngoại',
  siblings: 'Anh, chị, em ruột',
  other_relative: 'Họ hàng khác (cô, chú, bác, cậu, dì...)',
  non_relative: 'Không có quan hệ họ hàng',
};

export function getRelationshipLabel(relationship: Relationship): string {
  return RELATIONSHIP_LABELS[relationship];
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  real_estate: 'Bất động sản (nhà, đất)',
  securities: 'Chứng khoán (cổ phiếu, trái phiếu, chứng chỉ quỹ)',
  capital: 'Phần vốn góp (công ty, hợp tác xã...)',
  vehicles: 'Ô tô, xe máy (tài sản phải đăng ký)',
  other: 'Tài sản khác phải đăng ký (tàu thuyền, tàu bay...)',
  cash: 'Tiền mặt, tiền gửi',
  jewelry: 'Vàng, trang sức, tài sản không phải đăng ký',
};

export function getAssetTypeLabel(assetType: AssetType): string {
  return ASSET_TYPE_LABELS[assetType];
}

export function getTransactionTypeLabel(type: TransactionType): string {
  return type === 'inheritance' ? 'Thừa kế' : 'Quà tặng';
}

/** Hạn nộp hồ sơ khai thuế (tài sản không phải BĐS): ngày phát sinh + 10 ngày */
export function calculateDeclarationDeadline(transactionDate: Date): Date {
  const deadline = new Date(transactionDate);
  deadline.setDate(deadline.getDate() + TAX_DECLARATION_DEADLINE_DAYS);
  return deadline;
}

// Giấy tờ chứng minh quan hệ khi miễn thuế BĐS (TT 89/2026/TT-BTC)
const RELATIONSHIP_PROOF: Partial<Record<Relationship, string>> = {
  spouse: 'Xác nhận thông tin về cư trú hoặc bản sao Giấy chứng nhận kết hôn',
  parent_child:
    'Xác nhận thông tin về cư trú hoặc bản sao Giấy khai sinh / Quyết định công nhận việc nuôi con nuôi',
  parent_in_law:
    'Xác nhận thông tin về cư trú ghi rõ quan hệ, hoặc bản sao Giấy chứng nhận kết hôn và Giấy khai sinh của chồng/vợ',
  grandparent_grandchild:
    'Bản sao Giấy khai sinh của cháu và của cha/mẹ cháu, hoặc Xác nhận thông tin về cư trú thể hiện quan hệ',
  siblings: 'Xác nhận thông tin về cư trú thể hiện chung cha mẹ, hoặc giấy tờ chứng minh quan hệ huyết thống',
};

/** Hồ sơ cần chuẩn bị. Chỉ có tiền, vàng, trang sức (không chịu thuế) → không phải khai. */
export function getRequiredDocuments(
  transactionType: TransactionType,
  relationship: Relationship,
  assetTypes: AssetType[]
): string[] {
  const hasRealEstate = assetTypes.includes('real_estate');
  const hasOtherTaxable = assetTypes.some((t) => t !== 'real_estate' && isTaxableAssetType(t));
  if (!hasRealEstate && !hasOtherTaxable) return [];

  const documents: string[] = [];
  if (hasRealEstate) {
    documents.push('Tờ khai thuế TNCN mẫu 03/BĐS-TNCN (TT 89/2026/TT-BTC), nộp cùng hồ sơ đăng ký biến động');
  }
  if (hasOtherTaxable) {
    documents.push('Tờ khai thuế TNCN đối với thu nhập từ thừa kế, quà tặng (mẫu theo TT 89/2026/TT-BTC)');
  }
  documents.push('Căn cước/CCCD hoặc hộ chiếu của người nhận');

  const proof = RELATIONSHIP_PROOF[relationship];
  if (hasRealEstate && proof) documents.push(`${proof} (để miễn thuế BĐS)`);

  if (transactionType === 'inheritance') {
    documents.push('Giấy chứng tử của người để lại di sản');
    documents.push('Di chúc hoặc văn bản khai nhận/thỏa thuận phân chia di sản thừa kế');
  } else {
    documents.push('Hợp đồng tặng cho (công chứng/chứng thực theo quy định)');
  }

  if (hasRealEstate) {
    documents.push('Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở và tài sản gắn liền với đất');
  }
  if (assetTypes.includes('securities')) {
    documents.push('Xác nhận số lượng chứng khoán nhận thừa kế, quà tặng (công ty chứng khoán/tổ chức phát hành)');
  }
  if (assetTypes.includes('capital')) {
    documents.push('Văn bản xác nhận phần vốn góp và báo cáo tài chính gần nhất của doanh nghiệp');
  }
  if (assetTypes.includes('vehicles') || assetTypes.includes('other')) {
    documents.push('Giấy đăng ký tài sản (xe, tàu thuyền...) và tờ khai lệ phí trước bạ');
  }
  return documents;
}

// ===== MAIN CALCULATOR =====

export function calculateInheritanceGiftTax(input: InheritanceGiftTaxInput): InheritanceGiftTaxResult {
  const { transactionType, relationship, assets, transactionDate } = input;
  const relativeExempt = isExemptRelationship(relationship);
  const sum = (pick: (a: AssetInfo) => boolean) =>
    assets.filter(pick).reduce((s, a) => s + a.value, 0);

  const totalValue = sum(() => true);
  const nonTaxableValue = sum((a) => !isTaxableAssetType(a.type));
  const exemptValue = relativeExempt ? sum((a) => a.type === 'real_estate') : 0;
  const taxableValue = totalValue - nonTaxableValue - exemptValue;

  // Ngưỡng trừ MỘT LẦN trên tổng tài sản chịu thuế của lần nhận này (Điều 18.2)
  const threshold = getPerTransactionThreshold(transactionDate);
  const taxableAmount = Math.max(0, taxableValue - threshold);
  const taxAmount = Math.round(taxableAmount * INHERITANCE_GIFT_TAX_RATE);
  const effectiveRate = totalValue > 0 ? (taxAmount / totalValue) * 100 : 0;

  const reasons: string[] = [];
  if (nonTaxableValue > 0) {
    reasons.push(
      `Tiền mặt, tiền gửi, vàng, trang sức (${formatNumber(nonTaxableValue)} đồng) không phải tài sản phải đăng ký nên không chịu thuế TNCN (Luật 109/2025/QH15 Điều 3.9).`
    );
  }
  if (exemptValue > 0) {
    reasons.push(
      `Bất động sản nhận từ quan hệ ${getRelationshipLabel(relationship).toLowerCase()} (${formatNumber(exemptValue)} đồng) được miễn thuế (Luật 109/2025/QH15 Điều 4.1).`
    );
  }
  if (taxableValue > 0 && taxAmount === 0) {
    reasons.push(
      `Giá trị chịu thuế ${formatNumber(taxableValue)} đồng không vượt ngưỡng ${formatNumber(threshold)} đồng/lần (Luật 109/2025/QH15 Điều 18).`
    );
  }

  const assetTypes = assets.map((a) => a.type);
  const hasRealEstate = assetTypes.includes('real_estate');
  const hasOtherTaxable = assetTypes.some((t) => t !== 'real_estate' && isTaxableAssetType(t));

  const notes: string[] = [];
  if (taxAmount > 0) {
    notes.push(
      `Thuế = (${formatNumber(taxableValue)} − ${formatNumber(threshold)}) × 10% = ${formatNumber(taxAmount)} đồng.`
    );
  }
  if (relativeExempt && hasOtherTaxable) {
    notes.push('Quan hệ gia đình chỉ được miễn với bất động sản; chứng khoán, phần vốn góp, ô tô, xe máy... vẫn chịu thuế.');
  }
  if (taxableValue > 0) {
    notes.push('Ngưỡng tính theo từng lần nhận (từng lần đăng ký quyền sở hữu), không cộng dồn các lần trong năm.');
  }
  if (hasOtherTaxable) {
    notes.push(
      'Chứng khoán, phần vốn góp, ô tô, xe máy...: khai và nộp thuế chậm nhất ngày thứ 10 kể từ ngày tiếp theo ngày phát sinh (NĐ 252/2026/NĐ-CP Điều 10.1; Luật Quản lý thuế 108/2025/QH15 Điều 14).'
    );
  }
  if (hasRealEstate) {
    notes.push(
      'Bất động sản (kể cả được miễn): khai trên mẫu 03/BĐS-TNCN cùng hồ sơ đăng ký biến động, chậm nhất ngày cuối cùng của thời hạn đăng ký biến động đất đai (NĐ 252/2026/NĐ-CP Điều 10.8); nộp thuế theo thông báo của cơ quan thuế.'
    );
  }
  if (hasRealEstate || hasOtherTaxable) {
    notes.push(
      'Nộp hồ sơ tại cơ quan thuế quản lý: nơi có bất động sản; nơi quản lý tổ chức phát hành chứng khoán hoặc doanh nghiệp có vốn góp; nơi khai lệ phí trước bạ (ô tô, xe máy...).'
    );
  }

  return {
    totalValue,
    nonTaxableValue,
    exemptValue,
    taxableValue,
    isExempt: taxAmount === 0,
    exemptReason: reasons.length > 0 ? reasons.join(' ') : undefined,
    threshold,
    taxableAmount,
    taxAmount,
    effectiveRate,
    declarationDeadline:
      transactionDate && hasOtherTaxable ? calculateDeclarationDeadline(transactionDate) : undefined,
    requiredDocuments: getRequiredDocuments(transactionType, relationship, assetTypes),
    notes,
  };
}

// ===== UTILITY FUNCTIONS =====

const ALL_RELATIONSHIPS: Relationship[] = [
  'spouse',
  'parent_child',
  'parent_in_law',
  'grandparent_grandchild',
  'siblings',
  'other_relative',
  'non_relative',
];

export function getAllRelationships(): { value: Relationship; label: string; isExempt: boolean }[] {
  return ALL_RELATIONSHIPS.map((r) => ({
    value: r,
    label: getRelationshipLabel(r),
    isExempt: isExemptRelationship(r),
  }));
}

const ALL_ASSET_TYPES: AssetType[] = [
  'real_estate',
  'securities',
  'capital',
  'vehicles',
  'other',
  'cash',
  'jewelry',
];

export function getAllAssetTypes(): { value: AssetType; label: string; taxable: boolean }[] {
  return ALL_ASSET_TYPES.map((a) => ({
    value: a,
    label: getAssetTypeLabel(a),
    taxable: isTaxableAssetType(a),
  }));
}
