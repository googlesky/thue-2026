/**
 * Tax Exemption Checker for Vietnam PIT
 * Reference: Luật Thuế TNCN sửa đổi 2025
 *
 * The 2025 amendment expands tax exemptions from 16 to 21 categories
 * This tool helps users check if their income qualifies for exemption
 */

// Exemption categories (21 categories in 2026 law)
export type ExemptionCategory =
  // Original exemptions (from 2007 law)
  | 'real_estate_only_home'       // Chuyển nhượng nhà ở duy nhất
  | 'family_transfer'             // Chuyển nhượng trong gia đình
  | 'inheritance_family'          // Thừa kế từ gia đình
  | 'gift_family'                 // Tặng cho từ gia đình
  | 'agricultural_income'         // Thu nhập từ nông nghiệp
  | 'interest_deposits'           // Lãi tiền gửi ngân hàng
  | 'life_insurance'              // Bảo hiểm nhân thọ
  | 'pension'                     // Lương hưu BHXH
  | 'scholarship'                 // Học bổng
  | 'compensation'                // Bồi thường bảo hiểm
  | 'charity'                     // Thu nhập từ quỹ từ thiện
  | 'foreign_diplomatic'          // Thu nhập của nhà ngoại giao
  | 'international_treaty'        // Thu nhập theo điều ước quốc tế
  | 'severance_pay'               // Trợ cấp thôi việc
  | 'night_shift_allowance'       // Phụ cấp ca đêm (theo quy định)
  | 'hazard_allowance'            // Phụ cấp độc hại, nguy hiểm
  // New exemptions (2025 amendment)
  | 'high_tech_income'            // Thu nhập từ công nghệ cao
  | 'carbon_credits'              // Tín dụng carbon
  | 'startup_investment'          // Đầu tư khởi nghiệp sáng tạo
  | 'digital_transformation'      // Chuyển đổi số
  | 'green_bond_interest';        // Lãi trái phiếu xanh

// Exemption status
export type ExemptionStatus = 'exempt' | 'partial' | 'not_exempt' | 'needs_review';

// Individual exemption rule
export interface ExemptionRule {
  id: ExemptionCategory;
  name: string;
  description: string;
  conditions: string[];
  requiredDocuments: string[];
  maxExemptAmount?: number;
  effectiveFrom: string;
  isNew2026: boolean;
  legalReference: string;
}

// Exemption check input
export interface ExemptionCheckInput {
  category: ExemptionCategory;
  incomeAmount: number;
  answers: Record<string, boolean | string | number>;
}

// Exemption check result
export interface ExemptionCheckResult {
  category: ExemptionCategory;
  categoryName: string;
  status: ExemptionStatus;
  exemptAmount: number;
  taxableAmount: number;
  explanation: string;
  conditions: {
    condition: string;
    met: boolean;
    note?: string;
  }[];
  requiredDocuments: string[];
  legalReference: string;
}

// All exemption rules
export const EXEMPTION_RULES: ExemptionRule[] = [
  // === ORIGINAL EXEMPTIONS ===
  {
    id: 'real_estate_only_home',
    name: 'Chuyển nhượng nhà ở duy nhất',
    description:
      'Thu nhập từ chuyển nhượng nhà ở, quyền sử dụng đất ở duy nhất của cá nhân',
    conditions: [
      'Là nhà ở, đất ở duy nhất thuộc sở hữu của người chuyển nhượng',
      'Thời gian sở hữu từ 5 năm trở lên',
      'Diện tích trong hạn mức được công nhận',
    ],
    requiredDocuments: [
      'Giấy chứng nhận quyền sử dụng đất/nhà ở',
      'Xác nhận không có BĐS khác',
      'Hợp đồng chuyển nhượng',
    ],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 1 Luật Thuế TNCN',
  },
  {
    id: 'family_transfer',
    name: 'Chuyển nhượng trong gia đình',
    description:
      'Thu nhập từ chuyển nhượng BĐS giữa vợ chồng, cha mẹ con, anh chị em ruột',
    conditions: [
      'Chuyển nhượng giữa vợ và chồng',
      'Hoặc giữa cha mẹ đẻ và con đẻ/con nuôi hợp pháp',
      'Hoặc giữa anh chị em ruột',
    ],
    requiredDocuments: [
      'Giấy tờ chứng minh quan hệ gia đình',
      'Hợp đồng chuyển nhượng/tặng cho',
      'Giấy chứng nhận BĐS',
    ],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 2 Luật Thuế TNCN',
  },
  {
    id: 'inheritance_family',
    name: 'Thừa kế từ gia đình',
    description:
      'Thu nhập từ thừa kế BĐS giữa vợ chồng, cha mẹ con, anh chị em ruột',
    conditions: [
      'Thừa kế từ vợ/chồng',
      'Hoặc từ cha mẹ đẻ/con đẻ',
      'Hoặc từ anh chị em ruột',
    ],
    requiredDocuments: [
      'Giấy khai sinh/kết hôn chứng minh quan hệ',
      'Văn bản thừa kế hợp pháp',
      'Giấy chứng tử',
    ],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 3 Luật Thuế TNCN',
  },
  {
    id: 'gift_family',
    name: 'Tặng cho từ gia đình',
    description:
      'Thu nhập từ quà tặng BĐS/tài sản giữa vợ chồng, cha mẹ con, anh chị em ruột, ông bà cháu',
    conditions: [
      'Tặng cho giữa vợ và chồng',
      'Hoặc giữa cha mẹ và con',
      'Hoặc giữa anh chị em ruột',
      'Hoặc giữa ông bà và cháu',
    ],
    requiredDocuments: [
      'Giấy tờ chứng minh quan hệ gia đình',
      'Hợp đồng tặng cho có công chứng',
    ],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 4 Luật Thuế TNCN',
  },
  {
    id: 'agricultural_income',
    name: 'Thu nhập từ nông nghiệp',
    description:
      'Thu nhập từ trồng trọt, chăn nuôi, nuôi trồng thủy sản, làm muối của hộ gia đình, cá nhân',
    conditions: [
      'Trực tiếp sản xuất nông nghiệp',
      'Thu nhập từ trồng trọt, chăn nuôi, thủy sản, làm muối',
      'Không bao gồm chế biến công nghiệp',
    ],
    requiredDocuments: [
      'Xác nhận của UBND xã về hoạt động sản xuất',
      'Giấy tờ liên quan đến đất nông nghiệp',
    ],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 5 Luật Thuế TNCN',
  },
  {
    id: 'interest_deposits',
    name: 'Lãi tiền gửi ngân hàng',
    description: 'Lãi tiền gửi tại ngân hàng, tổ chức tín dụng, KBNN',
    conditions: [
      'Tiền gửi tại ngân hàng thương mại',
      'Hoặc tổ chức tín dụng hợp pháp',
      'Hoặc Kho bạc Nhà nước',
    ],
    requiredDocuments: ['Sổ tiết kiệm hoặc xác nhận của ngân hàng'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 6 Luật Thuế TNCN',
  },
  {
    id: 'life_insurance',
    name: 'Bảo hiểm nhân thọ',
    description: 'Tiền bảo hiểm nhân thọ, bảo hiểm không bắt buộc',
    conditions: [
      'Tiền chi trả bảo hiểm nhân thọ',
      'Bảo hiểm phi nhân thọ',
      'Tiền đáo hạn hợp đồng bảo hiểm',
    ],
    requiredDocuments: [
      'Hợp đồng bảo hiểm',
      'Chứng từ chi trả của công ty bảo hiểm',
    ],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 7 Luật Thuế TNCN',
  },
  {
    id: 'pension',
    name: 'Lương hưu BHXH',
    description: 'Lương hưu từ quỹ BHXH',
    conditions: [
      'Lương hưu từ quỹ BHXH bắt buộc',
      'Trợ cấp thất nghiệp',
      'Các khoản trợ cấp BHXH khác',
    ],
    requiredDocuments: ['Quyết định hưởng lương hưu', 'Sổ BHXH'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 8 Luật Thuế TNCN',
  },
  {
    id: 'scholarship',
    name: 'Học bổng',
    description: 'Học bổng từ ngân sách, tổ chức trong và ngoài nước',
    conditions: [
      'Học bổng từ ngân sách nhà nước',
      'Hoặc từ tổ chức trong nước hợp pháp',
      'Hoặc từ tổ chức nước ngoài',
    ],
    requiredDocuments: ['Quyết định cấp học bổng', 'Chứng từ nhận học bổng'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 9 Luật Thuế TNCN',
  },
  {
    id: 'compensation',
    name: 'Bồi thường bảo hiểm',
    description: 'Tiền bồi thường bảo hiểm, bồi thường tai nạn lao động',
    conditions: [
      'Bồi thường từ hợp đồng bảo hiểm',
      'Bồi thường tai nạn lao động, bệnh nghề nghiệp',
      'Bồi thường nhà nước',
    ],
    requiredDocuments: ['Quyết định bồi thường', 'Hồ sơ tai nạn/bệnh nghề nghiệp'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 10 Luật Thuế TNCN',
  },
  {
    id: 'charity',
    name: 'Thu nhập từ quỹ từ thiện',
    description: 'Thu nhập từ quỹ từ thiện, quỹ nhân đạo',
    conditions: [
      'Nhận từ quỹ từ thiện được cấp phép',
      'Hoặc quỹ nhân đạo',
      'Hoặc quỹ khuyến học',
    ],
    requiredDocuments: ['Xác nhận của quỹ', 'Chứng từ nhận tiền'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 11 Luật Thuế TNCN',
  },
  {
    id: 'foreign_diplomatic',
    name: 'Thu nhập của nhà ngoại giao',
    description: 'Thu nhập của cá nhân là nhà ngoại giao, viên chức lãnh sự',
    conditions: [
      'Là nhà ngoại giao, viên chức lãnh sự',
      'Nhân viên hành chính kỹ thuật của cơ quan đại diện ngoại giao',
      'Theo quy định của pháp luật về ngoại giao',
    ],
    requiredDocuments: ['Thẻ ngoại giao', 'Xác nhận của Bộ Ngoại giao'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 12 Luật Thuế TNCN',
  },
  {
    id: 'international_treaty',
    name: 'Thu nhập theo điều ước quốc tế',
    description: 'Thu nhập được miễn thuế theo điều ước quốc tế',
    conditions: [
      'Theo điều ước quốc tế mà Việt Nam là thành viên',
      'Theo thỏa thuận giữa Chính phủ VN với tổ chức quốc tế',
    ],
    requiredDocuments: ['Xác nhận của cơ quan có thẩm quyền'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 13 Luật Thuế TNCN',
  },
  {
    id: 'severance_pay',
    name: 'Trợ cấp thôi việc',
    description: 'Trợ cấp thôi việc, mất việc làm theo quy định',
    conditions: [
      'Trợ cấp thôi việc theo Bộ luật Lao động',
      'Trợ cấp mất việc làm',
      'Theo đúng quy định pháp luật',
    ],
    requiredDocuments: ['Quyết định chấm dứt HĐLĐ', 'Chứng từ chi trả trợ cấp'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 14 Luật Thuế TNCN',
  },
  {
    id: 'night_shift_allowance',
    name: 'Phụ cấp ca đêm',
    description: 'Phụ cấp làm việc ban đêm, làm thêm giờ theo quy định',
    conditions: [
      'Phụ cấp làm đêm (22h-6h) theo đúng mức quy định',
      'Phụ cấp làm thêm giờ theo đúng mức quy định',
      'Không vượt mức tối đa cho phép',
    ],
    requiredDocuments: ['Bảng chấm công', 'Chứng từ chi trả phụ cấp'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 15 Luật Thuế TNCN',
  },
  {
    id: 'hazard_allowance',
    name: 'Phụ cấp độc hại, nguy hiểm',
    description: 'Phụ cấp độc hại, nguy hiểm theo quy định',
    conditions: [
      'Làm việc trong môi trường độc hại',
      'Công việc nguy hiểm theo danh mục',
      'Phụ cấp theo đúng mức quy định',
    ],
    requiredDocuments: ['Xác nhận của cơ quan về môi trường làm việc'],
    effectiveFrom: '2007-01-01',
    isNew2026: false,
    legalReference: 'Điều 4, Khoản 16 Luật Thuế TNCN',
  },

  // === NEW EXEMPTIONS (2025 Amendment) ===
  {
    id: 'high_tech_income',
    name: 'Thu nhập từ công nghệ cao',
    description:
      'Thu nhập từ hoạt động nghiên cứu, phát triển công nghệ cao được ưu đãi',
    conditions: [
      'Hoạt động R&D trong lĩnh vực công nghệ cao',
      'Doanh nghiệp được công nhận công nghệ cao',
      'Sản phẩm thuộc danh mục công nghệ cao ưu tiên',
    ],
    requiredDocuments: [
      'Giấy chứng nhận doanh nghiệp công nghệ cao',
      'Xác nhận sản phẩm công nghệ cao',
    ],
    effectiveFrom: '2026-01-01',
    isNew2026: true,
    legalReference: 'Điều 4, Khoản 17 Luật Thuế TNCN sửa đổi 2025',
  },
  {
    id: 'carbon_credits',
    name: 'Tín dụng carbon',
    description: 'Thu nhập từ chuyển nhượng tín dụng carbon, chứng chỉ giảm phát thải',
    conditions: [
      'Thu nhập từ bán tín dụng carbon',
      'Chứng chỉ giảm phát thải được công nhận',
      'Theo cơ chế phát triển sạch (CDM) hoặc tương đương',
    ],
    requiredDocuments: [
      'Chứng nhận tín dụng carbon',
      'Hợp đồng chuyển nhượng',
      'Xác nhận của cơ quan môi trường',
    ],
    effectiveFrom: '2026-01-01',
    isNew2026: true,
    legalReference: 'Điều 4, Khoản 18 Luật Thuế TNCN sửa đổi 2025',
  },
  {
    id: 'startup_investment',
    name: 'Đầu tư khởi nghiệp sáng tạo',
    description: 'Thu nhập từ đầu tư vào doanh nghiệp khởi nghiệp sáng tạo',
    conditions: [
      'Đầu tư vào DN khởi nghiệp sáng tạo được công nhận',
      'Thời gian đầu tư tối thiểu 3 năm',
      'DN thuộc lĩnh vực ưu tiên phát triển',
    ],
    requiredDocuments: [
      'Giấy chứng nhận DN khởi nghiệp sáng tạo',
      'Hợp đồng góp vốn',
      'Xác nhận thời gian đầu tư',
    ],
    effectiveFrom: '2026-01-01',
    isNew2026: true,
    legalReference: 'Điều 4, Khoản 19 Luật Thuế TNCN sửa đổi 2025',
  },
  {
    id: 'digital_transformation',
    name: 'Chuyển đổi số',
    description: 'Thu nhập từ hoạt động chuyển đổi số, ứng dụng công nghệ số',
    conditions: [
      'Thu nhập từ phát triển sản phẩm số',
      'Dịch vụ chuyển đổi số cho DN/tổ chức',
      'Ứng dụng công nghệ AI, blockchain, IoT',
    ],
    requiredDocuments: [
      'Xác nhận hoạt động chuyển đổi số',
      'Hợp đồng cung cấp dịch vụ số',
    ],
    effectiveFrom: '2026-01-01',
    isNew2026: true,
    legalReference: 'Điều 4, Khoản 20 Luật Thuế TNCN sửa đổi 2025',
  },
  {
    id: 'green_bond_interest',
    name: 'Lãi trái phiếu xanh',
    description: 'Lãi từ trái phiếu xanh, trái phiếu bền vững',
    conditions: [
      'Trái phiếu được phát hành để tài trợ dự án xanh',
      'Được cơ quan có thẩm quyền chứng nhận',
      'Theo tiêu chuẩn trái phiếu xanh quốc tế',
    ],
    requiredDocuments: [
      'Chứng nhận trái phiếu xanh',
      'Chứng từ lãi trái phiếu',
    ],
    effectiveFrom: '2026-01-01',
    isNew2026: true,
    legalReference: 'Điều 4, Khoản 21 Luật Thuế TNCN sửa đổi 2025',
  },
];

/**
 * Get exemption rule by category
 */
export function getExemptionRule(
  category: ExemptionCategory
): ExemptionRule | undefined {
  return EXEMPTION_RULES.find((r) => r.id === category);
}

/**
 * Get all new 2026 exemptions
 */
export function getNew2026Exemptions(): ExemptionRule[] {
  return EXEMPTION_RULES.filter((r) => r.isNew2026);
}

/**
 * Get all original exemptions
 */
export function getOriginalExemptions(): ExemptionRule[] {
  return EXEMPTION_RULES.filter((r) => !r.isNew2026);
}

/**
 * Check exemption eligibility
 */
export function checkExemption(
  input: ExemptionCheckInput
): ExemptionCheckResult {
  const rule = getExemptionRule(input.category);

  if (!rule) {
    return {
      category: input.category,
      categoryName: 'Không xác định',
      status: 'not_exempt',
      exemptAmount: 0,
      taxableAmount: input.incomeAmount,
      explanation: 'Loại miễn thuế không hợp lệ',
      conditions: [],
      requiredDocuments: [],
      legalReference: '',
    };
  }

  // Check if law is effective
  const effectiveDate = new Date(rule.effectiveFrom);
  const now = new Date();
  if (now < effectiveDate) {
    return {
      category: input.category,
      categoryName: rule.name,
      status: 'not_exempt',
      exemptAmount: 0,
      taxableAmount: input.incomeAmount,
      explanation: `Quy định này có hiệu lực từ ${effectiveDate.toLocaleDateString('vi-VN')}`,
      conditions: rule.conditions.map((c) => ({
        condition: c,
        met: false,
        note: 'Chưa có hiệu lực',
      })),
      requiredDocuments: rule.requiredDocuments,
      legalReference: rule.legalReference,
    };
  }

  // Check conditions based on answers
  const conditionResults = rule.conditions.map((condition, index) => {
    const answerKey = `condition_${index}`;
    const met = input.answers[answerKey] === true;
    return {
      condition,
      met,
      note: met ? 'Đáp ứng điều kiện' : 'Cần xác nhận',
    };
  });

  const allConditionsMet = conditionResults.every((c) => c.met);
  const someConditionsMet = conditionResults.some((c) => c.met);

  let status: ExemptionStatus;
  let exemptAmount: number;
  let taxableAmount: number;
  let explanation: string;

  if (allConditionsMet) {
    status = 'exempt';
    exemptAmount = rule.maxExemptAmount
      ? Math.min(input.incomeAmount, rule.maxExemptAmount)
      : input.incomeAmount;
    taxableAmount = input.incomeAmount - exemptAmount;
    explanation = `Đủ điều kiện miễn thuế theo ${rule.legalReference}`;
  } else if (someConditionsMet) {
    status = 'needs_review';
    exemptAmount = 0;
    taxableAmount = input.incomeAmount;
    explanation = 'Cần xác nhận thêm các điều kiện còn lại';
  } else {
    status = 'not_exempt';
    exemptAmount = 0;
    taxableAmount = input.incomeAmount;
    explanation = 'Không đáp ứng điều kiện miễn thuế';
  }

  return {
    category: input.category,
    categoryName: rule.name,
    status,
    exemptAmount,
    taxableAmount,
    explanation,
    conditions: conditionResults,
    requiredDocuments: rule.requiredDocuments,
    legalReference: rule.legalReference,
  };
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
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
 * Search exemptions by keyword
 */
export function searchExemptions(keyword: string): ExemptionRule[] {
  const lower = keyword.toLowerCase();
  return EXEMPTION_RULES.filter(
    (r) =>
      r.name.toLowerCase().includes(lower) ||
      r.description.toLowerCase().includes(lower) ||
      r.conditions.some((c) => c.toLowerCase().includes(lower))
  );
}

/**
 * Get exemption categories for dropdown
 */
export function getExemptionCategories(): { value: ExemptionCategory; label: string; isNew: boolean }[] {
  return EXEMPTION_RULES.map((r) => ({
    value: r.id,
    label: r.name,
    isNew: r.isNew2026,
  }));
}
