/**
 * Inheritance & Gift Tax Calculator
 * Thuế thu nhập từ thừa kế, quà tặng
 *
 * Căn cứ pháp lý:
 * - Luật Thuế TNCN 2007 (sửa đổi 2012, 2014)
 * - Điều 3, Khoản 10: Thu nhập từ thừa kế, quà tặng
 * - Điều 4, Khoản 4: Thu nhập được miễn thuế (thừa kế/quà tặng từ gia đình)
 * - Điều 23: Thuế suất 10%
 * - Nghị định 65/2013/NĐ-CP hướng dẫn chi tiết
 */

import { formatNumber } from '@/lib/taxCalculator';

// ===== CONSTANTS =====

/**
 * Ngưỡng miễn thuế cho thừa kế/quà tặng từ người không có quan hệ gia đình
 * Theo Điều 23, Luật Thuế TNCN: 10 triệu đồng
 */
export const INHERITANCE_GIFT_TAX_THRESHOLD = 10_000_000;

/**
 * Thuế suất 10% cho phần vượt ngưỡng
 * Theo Điều 23, Luật Thuế TNCN
 */
export const INHERITANCE_GIFT_TAX_RATE = 0.10;

/**
 * Thời hạn khai thuế: 10 ngày kể từ ngày phát sinh
 * Theo Điều 32, Luật Quản lý thuế
 */
export const TAX_DECLARATION_DEADLINE_DAYS = 10;

// ===== TYPES =====

/**
 * Loại giao dịch
 */
export type TransactionType = 'inheritance' | 'gift';

/**
 * Quan hệ với người cho/người để lại tài sản
 * Miễn thuế hoàn toàn nếu là quan hệ gia đình (Điều 4, Khoản 4)
 */
export type Relationship =
  | 'spouse' // Vợ/chồng
  | 'parent_child' // Cha mẹ con cái (ruột, nuôi)
  | 'grandparent_grandchild' // Ông bà - cháu (ruột, nuôi)
  | 'siblings' // Anh chị em ruột
  | 'other_relative' // Họ hàng khác (cô, chú, cậu, dì, cháu...)
  | 'non_relative'; // Không có quan hệ họ hàng

/**
 * Loại tài sản
 */
export type AssetType =
  | 'real_estate' // Bất động sản
  | 'securities' // Chứng khoán
  | 'cash' // Tiền mặt, tiền gửi
  | 'vehicles' // Phương tiện giao thông
  | 'jewelry' // Vàng bạc, đá quý
  | 'other'; // Tài sản khác

/**
 * Thông tin tài sản
 */
export interface AssetInfo {
  type: AssetType;
  value: number;
  description?: string;
}

/**
 * Input cho calculator
 */
export interface InheritanceGiftTaxInput {
  transactionType: TransactionType;
  relationship: Relationship;
  assets: AssetInfo[];
  transactionDate?: Date;
}

/**
 * Kết quả tính thuế
 */
export interface InheritanceGiftTaxResult {
  totalValue: number;
  isExempt: boolean;
  exemptReason?: string;
  taxableAmount: number;
  taxAmount: number;
  effectiveRate: number;
  declarationDeadline?: Date;
  requiredDocuments: string[];
  notes: string[];
}

// ===== HELPER FUNCTIONS =====

/**
 * Kiểm tra quan hệ có được miễn thuế không
 * Theo Điều 4, Khoản 4, Luật Thuế TNCN
 */
export function isExemptRelationship(relationship: Relationship): boolean {
  const exemptRelationships: Relationship[] = [
    'spouse',
    'parent_child',
    'grandparent_grandchild',
    'siblings',
  ];
  return exemptRelationships.includes(relationship);
}

/**
 * Lấy tên quan hệ bằng tiếng Việt
 */
export function getRelationshipLabel(relationship: Relationship): string {
  const labels: Record<Relationship, string> = {
    spouse: 'Vợ/chồng',
    parent_child: 'Cha mẹ - con cái (ruột hoặc nuôi)',
    grandparent_grandchild: 'Ông bà - cháu (ruột hoặc nuôi)',
    siblings: 'Anh chị em ruột',
    other_relative: 'Họ hàng khác',
    non_relative: 'Không có quan hệ họ hàng',
  };
  return labels[relationship];
}

/**
 * Lấy tên loại tài sản bằng tiếng Việt
 */
export function getAssetTypeLabel(assetType: AssetType): string {
  const labels: Record<AssetType, string> = {
    real_estate: 'Bất động sản',
    securities: 'Chứng khoán',
    cash: 'Tiền mặt/Tiền gửi',
    vehicles: 'Xe cộ, phương tiện',
    jewelry: 'Vàng bạc, đá quý',
    other: 'Tài sản khác',
  };
  return labels[assetType];
}

/**
 * Lấy tên loại giao dịch bằng tiếng Việt
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  return type === 'inheritance' ? 'Thừa kế' : 'Quà tặng';
}

/**
 * Tính deadline khai thuế
 * 10 ngày kể từ ngày phát sinh
 */
export function calculateDeclarationDeadline(transactionDate: Date): Date {
  const deadline = new Date(transactionDate);
  deadline.setDate(deadline.getDate() + TAX_DECLARATION_DEADLINE_DAYS);
  return deadline;
}

/**
 * Lấy danh sách hồ sơ cần thiết
 */
export function getRequiredDocuments(
  transactionType: TransactionType,
  relationship: Relationship,
  assetTypes: AssetType[]
): string[] {
  const documents: string[] = [];

  // Hồ sơ chung
  documents.push('Tờ khai thuế TNCN (Mẫu 04/TNCN)');
  documents.push('CMND/CCCD/Hộ chiếu của người nhận');

  // Chứng minh quan hệ (nếu cần miễn thuế)
  if (isExemptRelationship(relationship)) {
    if (relationship === 'spouse') {
      documents.push('Giấy chứng nhận kết hôn');
    } else if (relationship === 'parent_child') {
      documents.push('Giấy khai sinh hoặc Quyết định công nhận nuôi con nuôi');
    } else if (relationship === 'grandparent_grandchild') {
      documents.push('Giấy khai sinh các thế hệ để chứng minh quan hệ');
    } else if (relationship === 'siblings') {
      documents.push('Giấy khai sinh của các bên');
    }
  }

  // Hồ sơ theo loại giao dịch
  if (transactionType === 'inheritance') {
    documents.push('Giấy chứng tử của người để lại tài sản');
    documents.push('Di chúc (nếu có) hoặc Biên bản họp gia đình chia thừa kế');
    documents.push('Văn bản khai nhận/phân chia di sản thừa kế có công chứng');
  } else {
    documents.push('Hợp đồng tặng cho có công chứng');
    documents.push('CMND/CCCD của người tặng');
  }

  // Hồ sơ theo loại tài sản
  if (assetTypes.includes('real_estate')) {
    documents.push('Giấy chứng nhận quyền sử dụng đất/quyền sở hữu nhà');
    documents.push('Giấy tờ chứng minh giá trị tài sản (Hợp đồng mua bán, Chứng thư thẩm định giá...)');
  }

  if (assetTypes.includes('securities')) {
    documents.push('Sao kê tài khoản chứng khoán');
    documents.push('Xác nhận từ công ty chứng khoán về giá trị');
  }

  if (assetTypes.includes('vehicles')) {
    documents.push('Giấy đăng ký xe');
    documents.push('Giấy tờ chứng minh giá trị (Hóa đơn mua, Giấy thẩm định giá...)');
  }

  if (assetTypes.includes('cash')) {
    documents.push('Sao kê tài khoản ngân hàng');
    documents.push('Giấy xác nhận số dư (nếu tiền gửi)');
  }

  if (assetTypes.includes('jewelry')) {
    documents.push('Giấy kiểm định/chứng nhận chất lượng');
    documents.push('Hóa đơn mua hoặc Giấy thẩm định giá');
  }

  return documents;
}

// ===== MAIN CALCULATOR =====

/**
 * Tính thuế thừa kế/quà tặng
 */
export function calculateInheritanceGiftTax(
  input: InheritanceGiftTaxInput
): InheritanceGiftTaxResult {
  const { transactionType, relationship, assets, transactionDate } = input;

  // Tổng giá trị tài sản
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);

  // Kiểm tra miễn thuế do quan hệ gia đình
  if (isExemptRelationship(relationship)) {
    return {
      totalValue,
      isExempt: true,
      exemptReason: `Miễn thuế theo Điều 4, Khoản 4 Luật Thuế TNCN: Thu nhập từ ${getTransactionTypeLabel(transactionType).toLowerCase()} giữa ${getRelationshipLabel(relationship).toLowerCase()} được miễn thuế hoàn toàn.`,
      taxableAmount: 0,
      taxAmount: 0,
      effectiveRate: 0,
      declarationDeadline: transactionDate
        ? calculateDeclarationDeadline(transactionDate)
        : undefined,
      requiredDocuments: getRequiredDocuments(
        transactionType,
        relationship,
        assets.map((a) => a.type)
      ),
      notes: [
        'Vẫn cần khai thuế dù được miễn (Mẫu 04/TNCN)',
        'Phải có giấy tờ chứng minh quan hệ huyết thống/hôn nhân',
        'Thời hạn khai thuế: 10 ngày kể từ ngày phát sinh',
      ],
    };
  }

  // Kiểm tra miễn thuế do dưới ngưỡng
  if (totalValue <= INHERITANCE_GIFT_TAX_THRESHOLD) {
    return {
      totalValue,
      isExempt: true,
      exemptReason: `Miễn thuế theo Điều 23 Luật Thuế TNCN: Giá trị ${formatNumber(totalValue)} VNĐ không vượt quá ngưỡng ${formatNumber(INHERITANCE_GIFT_TAX_THRESHOLD)} VNĐ.`,
      taxableAmount: 0,
      taxAmount: 0,
      effectiveRate: 0,
      declarationDeadline: transactionDate
        ? calculateDeclarationDeadline(transactionDate)
        : undefined,
      requiredDocuments: getRequiredDocuments(
        transactionType,
        relationship,
        assets.map((a) => a.type)
      ),
      notes: [
        'Vẫn nên lưu giữ giấy tờ để chứng minh nếu cần',
        'Nếu nhận nhiều lần trong năm và tổng vượt ngưỡng, vẫn phải nộp thuế',
      ],
    };
  }

  // Tính thuế: 10% trên phần vượt ngưỡng
  const taxableAmount = totalValue - INHERITANCE_GIFT_TAX_THRESHOLD;
  const taxAmount = Math.round(taxableAmount * INHERITANCE_GIFT_TAX_RATE);
  const effectiveRate = (taxAmount / totalValue) * 100;

  return {
    totalValue,
    isExempt: false,
    taxableAmount,
    taxAmount,
    effectiveRate,
    declarationDeadline: transactionDate
      ? calculateDeclarationDeadline(transactionDate)
      : undefined,
    requiredDocuments: getRequiredDocuments(
      transactionType,
      relationship,
      assets.map((a) => a.type)
    ),
    notes: [
      `Thuế = (${formatNumber(totalValue)} - ${formatNumber(INHERITANCE_GIFT_TAX_THRESHOLD)}) × 10% = ${formatNumber(taxAmount)} VNĐ`,
      'Thời hạn khai thuế: 10 ngày kể từ ngày phát sinh',
      'Thời hạn nộp thuế: 10 ngày kể từ ngày có thông báo thuế',
      'Nộp tại Chi cục Thuế quận/huyện nơi có tài sản hoặc nơi cư trú',
    ],
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Tạo tóm tắt kết quả
 */
export function generateResultSummary(result: InheritanceGiftTaxResult): string {
  if (result.isExempt) {
    return `Miễn thuế. ${result.exemptReason}`;
  }

  return `Tổng giá trị: ${formatNumber(result.totalValue)} VNĐ. Thu nhập chịu thuế: ${formatNumber(result.taxableAmount)} VNĐ. Thuế phải nộp: ${formatNumber(result.taxAmount)} VNĐ (${result.effectiveRate.toFixed(1)}%).`;
}

/**
 * Lấy danh sách các quan hệ
 */
export function getAllRelationships(): {
  value: Relationship;
  label: string;
  isExempt: boolean;
}[] {
  const relationships: Relationship[] = [
    'spouse',
    'parent_child',
    'grandparent_grandchild',
    'siblings',
    'other_relative',
    'non_relative',
  ];

  return relationships.map((r) => ({
    value: r,
    label: getRelationshipLabel(r),
    isExempt: isExemptRelationship(r),
  }));
}

/**
 * Lấy danh sách loại tài sản
 */
export function getAllAssetTypes(): { value: AssetType; label: string }[] {
  const assetTypes: AssetType[] = [
    'real_estate',
    'securities',
    'cash',
    'vehicles',
    'jewelry',
    'other',
  ];

  return assetTypes.map((a) => ({
    value: a,
    label: getAssetTypeLabel(a),
  }));
}
