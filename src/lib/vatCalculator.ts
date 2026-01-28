/**
 * VAT Calculator - Thuế Giá trị gia tăng (GTGT)
 *
 * Căn cứ pháp lý:
 * - Luật Thuế GTGT 2008 (sửa đổi 2013, 2016)
 * - Nghị định 209/2013/NĐ-CP
 * - Thông tư 219/2013/TT-BTC
 * - Luật số 48/2024/QH15 (giảm 2% VAT đến hết 30/06/2025)
 */

// ===== CONSTANTS =====

/**
 * Thuế suất VAT
 */
export const VAT_RATES = {
  standard: 0.10,  // 10% - Mặc định
  reduced: 0.08,   // 8% - Giảm 2% theo Luật 48/2024/QH15
  special: 0.05,   // 5% - Hàng hóa thiết yếu
  zero: 0,         // 0% - Xuất khẩu
  exempt: null,    // Không chịu thuế
} as const;

/**
 * Ngưỡng đăng ký VAT (doanh thu/năm)
 */
export const VAT_REGISTRATION_THRESHOLD = 200_000_000; // 200 triệu VND

/**
 * Ngày hiệu lực giảm VAT 2%
 */
export const VAT_REDUCTION_DATES = {
  start: new Date('2024-01-01'),
  end: new Date('2025-06-30'),
};

/**
 * Phương pháp tính thuế GTGT
 */
export const VAT_METHODS = {
  deduction: 'Phương pháp khấu trừ',
  direct: 'Phương pháp trực tiếp',
} as const;

export type VATMethod = keyof typeof VAT_METHODS;

/**
 * Tỷ lệ GTGT trên doanh thu (phương pháp trực tiếp)
 */
export const DIRECT_VAT_RATES = {
  distribution: 0.01,     // Phân phối, cung cấp hàng hóa
  services: 0.05,         // Dịch vụ
  production: 0.03,       // Sản xuất, vận tải, xây dựng
  otherActivities: 0.02,  // Hoạt động kinh doanh khác
} as const;

export type BusinessCategory = keyof typeof DIRECT_VAT_RATES;

/**
 * Danh mục hàng hóa/dịch vụ theo thuế suất
 */
export const VAT_CATEGORIES = {
  /**
   * 5% - Hàng hóa thiết yếu
   */
  reduced5: {
    rate: 0.05,
    items: [
      'Nước sạch phục vụ sản xuất và sinh hoạt',
      'Quặng để sản xuất phân bón, thuốc bảo vệ thực vật',
      'Phân bón, quặng để sản xuất phân bón',
      'Thức ăn gia súc, gia cầm',
      'Máy móc, thiết bị chuyên dùng cho nông nghiệp',
      'Sản phẩm trồng trọt, chăn nuôi, thủy sản chưa qua chế biến',
      'Mủ cao su sơ chế',
      'Đường, phụ phẩm trong sản xuất đường',
      'Sản phẩm bằng đay, cói, tre, nứa, lá, rơm, vỏ dừa',
      'Dịch vụ khoa học và công nghệ',
      'Thiết bị, dụng cụ y tế',
      'Sách, báo, tạp chí (trừ loại trên mạng)',
      'Văn hóa phẩm, triển lãm, thể dục thể thao',
    ],
  },

  /**
   * 0% - Xuất khẩu và dịch vụ quốc tế
   */
  zero: {
    rate: 0,
    items: [
      'Hàng hóa, dịch vụ xuất khẩu',
      'Vận tải quốc tế',
      'Hàng hóa, dịch vụ không chịu thuế GTGT khi xuất khẩu',
      'Dịch vụ xuất khẩu gồm dịch vụ cung ứng trực tiếp cho tổ chức, cá nhân nước ngoài',
      'Tái bảo hiểm ra nước ngoài',
      'Chuyển giao công nghệ ra nước ngoài',
    ],
  },

  /**
   * Không chịu thuế - Miễn thuế
   */
  exempt: {
    rate: null,
    items: [
      'Sản phẩm trồng trọt, chăn nuôi, thủy sản, hải sản chưa qua chế biến',
      'Giống vật nuôi, giống cây trồng',
      'Tưới tiêu, nước phục vụ nông nghiệp',
      'Bảo hiểm nhân thọ, bảo hiểm sức khỏe',
      'Bảo hiểm không nhằm mục đích kinh doanh',
      'Dịch vụ tài chính, ngân hàng, chứng khoán',
      'Dịch vụ y tế, thú y',
      'Dịch vụ bưu chính, viễn thông công ích',
      'Dịch vụ giáo dục, đào tạo',
      'Phát sóng truyền thanh, truyền hình',
      'Xuất bản, nhập khẩu sách, báo, tạp chí',
      'Vận tải công cộng bằng xe buýt',
      'Chuyển quyền sử dụng đất',
      'Bảo hiểm tài sản, bảo hiểm xe cơ giới',
      'Vũ khí, khí tài phục vụ quốc phòng, an ninh',
      'Nhà ở xã hội',
    ],
  },

  /**
   * 10% (hoặc 8% trong thời gian giảm) - Mặc định
   */
  standard: {
    rate: 0.10,
    items: [
      'Tất cả hàng hóa, dịch vụ không thuộc nhóm trên',
    ],
  },
} as const;

// ===== TYPES =====

export interface VATInput {
  // Doanh thu bán hàng (đầu ra)
  salesRevenue: number;

  // Giá trị mua hàng (đầu vào) - có hóa đơn
  purchaseValue: number;

  // Thuế suất đầu ra
  outputRate: number;

  // Thuế suất đầu vào
  inputRate: number;

  // Phương pháp tính
  method: VATMethod;

  // Loại hình kinh doanh (cho phương pháp trực tiếp)
  businessCategory?: BusinessCategory;

  // Thời điểm tính (để xác định có áp dụng giảm 2% không)
  calculationDate?: Date;
}

export interface VATOutput {
  // Thuế GTGT đầu ra
  outputVAT: number;

  // Thuế GTGT đầu vào được khấu trừ
  inputVAT: number;

  // Thuế GTGT phải nộp
  vatPayable: number;

  // Thuế GTGT âm (có thể được hoàn)
  vatRefundable: number;

  // Phương pháp áp dụng
  method: VATMethod;

  // Thuế suất áp dụng
  appliedOutputRate: number;
  appliedInputRate: number;

  // Có áp dụng giảm 2% không
  isReducedRateApplied: boolean;

  // Ngưỡng đăng ký
  requiresRegistration: boolean;
}

export interface VATRefundCheck {
  isEligible: boolean;
  reason: string;
  conditions: VATRefundCondition[];
  refundableAmount: number;
}

export interface VATRefundCondition {
  condition: string;
  met: boolean;
  description: string;
}

export interface VATRegistrationCheck {
  requiresRegistration: boolean;
  annualRevenue: number;
  threshold: number;
  currentMethod?: VATMethod;
  recommendedMethod?: VATMethod;
  notes: string[];
}

export interface VATSummary {
  // Tổng doanh thu
  totalRevenue: number;

  // Tổng giá trị mua hàng
  totalPurchases: number;

  // Tổng thuế đầu ra
  totalOutputVAT: number;

  // Tổng thuế đầu vào
  totalInputVAT: number;

  // Thuế phải nộp
  netVAT: number;

  // Thuế suất hiệu dụng
  effectiveRate: number;

  // Breakdown theo loại
  breakdown: VATBreakdownItem[];
}

export interface VATBreakdownItem {
  category: string;
  revenue: number;
  rate: number;
  vatAmount: number;
}

// ===== FUNCTIONS =====

/**
 * Kiểm tra có đang trong thời gian giảm VAT 2% không
 */
export function isVATReductionPeriod(date: Date = new Date()): boolean {
  return date >= VAT_REDUCTION_DATES.start && date <= VAT_REDUCTION_DATES.end;
}

/**
 * Lấy thuế suất VAT tiêu chuẩn theo thời điểm
 */
export function getStandardVATRate(date: Date = new Date()): number {
  return isVATReductionPeriod(date) ? VAT_RATES.reduced : VAT_RATES.standard;
}

/**
 * Tính thuế GTGT theo phương pháp khấu trừ
 */
export function calculateVATDeduction(input: VATInput): VATOutput {
  const date = input.calculationDate || new Date();
  const isReduced = isVATReductionPeriod(date);

  // Thuế suất đầu ra
  let outputRate = input.outputRate;
  if (outputRate === 0.10 && isReduced) {
    outputRate = 0.08;
  }

  // Thuế suất đầu vào
  let inputRate = input.inputRate;
  if (inputRate === 0.10 && isReduced) {
    inputRate = 0.08;
  }

  // Tính thuế
  const outputVAT = input.salesRevenue * outputRate;
  const inputVAT = input.purchaseValue * inputRate;
  const vatDifference = outputVAT - inputVAT;

  return {
    outputVAT: Math.round(outputVAT),
    inputVAT: Math.round(inputVAT),
    vatPayable: vatDifference > 0 ? Math.round(vatDifference) : 0,
    vatRefundable: vatDifference < 0 ? Math.round(Math.abs(vatDifference)) : 0,
    method: 'deduction',
    appliedOutputRate: outputRate,
    appliedInputRate: inputRate,
    isReducedRateApplied: isReduced && (input.outputRate === 0.10 || input.inputRate === 0.10),
    requiresRegistration: input.salesRevenue * 12 > VAT_REGISTRATION_THRESHOLD,
  };
}

/**
 * Tính thuế GTGT theo phương pháp trực tiếp
 */
export function calculateVATDirect(input: VATInput): VATOutput {
  const category = input.businessCategory || 'services';
  const directRate = DIRECT_VAT_RATES[category];

  // Phương pháp trực tiếp: VAT = Doanh thu × Tỷ lệ
  const vatPayable = input.salesRevenue * directRate;

  return {
    outputVAT: Math.round(vatPayable),
    inputVAT: 0, // Không khấu trừ đầu vào
    vatPayable: Math.round(vatPayable),
    vatRefundable: 0,
    method: 'direct',
    appliedOutputRate: directRate,
    appliedInputRate: 0,
    isReducedRateApplied: false,
    requiresRegistration: input.salesRevenue * 12 > VAT_REGISTRATION_THRESHOLD,
  };
}

/**
 * Tính thuế GTGT (chọn phương pháp tự động)
 */
export function calculateVAT(input: VATInput): VATOutput {
  if (input.method === 'deduction') {
    return calculateVATDeduction(input);
  }
  return calculateVATDirect(input);
}

/**
 * So sánh 2 phương pháp tính VAT
 */
export function compareVATMethods(input: Omit<VATInput, 'method'>): {
  deduction: VATOutput;
  direct: VATOutput;
  recommendation: VATMethod;
  savings: number;
  notes: string[];
} {
  const deductionResult = calculateVATDeduction({
    ...input,
    method: 'deduction',
  });

  const directResult = calculateVATDirect({
    ...input,
    method: 'direct',
    businessCategory: input.businessCategory || 'services',
  });

  const deductionTotal = deductionResult.vatPayable;
  const directTotal = directResult.vatPayable;

  const notes: string[] = [];

  // Điều kiện áp dụng phương pháp khấu trừ
  const annualRevenue = input.salesRevenue * 12;
  if (annualRevenue >= 1_000_000_000) {
    notes.push('Doanh thu trên 1 tỷ/năm: BẮT BUỘC áp dụng phương pháp khấu trừ.');
  }

  // Tỷ lệ đầu vào/đầu ra
  const inputRatio = input.purchaseValue / input.salesRevenue;
  if (inputRatio > 0.5) {
    notes.push(`Tỷ lệ mua vào/bán ra cao (${(inputRatio * 100).toFixed(0)}%): Phương pháp khấu trừ thường có lợi hơn.`);
  }

  if (deductionTotal < directTotal) {
    notes.push(`Tiết kiệm ${formatCurrency(directTotal - deductionTotal)} khi dùng phương pháp khấu trừ.`);
  } else if (directTotal < deductionTotal) {
    notes.push(`Tiết kiệm ${formatCurrency(deductionTotal - directTotal)} khi dùng phương pháp trực tiếp.`);
  }

  // Nếu không có hóa đơn đầu vào
  if (input.purchaseValue === 0 || input.inputRate === 0) {
    notes.push('Không có thuế đầu vào để khấu trừ: Cân nhắc phương pháp trực tiếp nếu đủ điều kiện.');
  }

  return {
    deduction: deductionResult,
    direct: directResult,
    recommendation: deductionTotal <= directTotal ? 'deduction' : 'direct',
    savings: Math.abs(deductionTotal - directTotal),
    notes,
  };
}

/**
 * Kiểm tra điều kiện hoàn thuế GTGT
 */
export function checkVATRefundEligibility(input: {
  vatRefundable: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  consecutiveMonths: number;
  hasExportActivity: boolean;
  hasInvestmentProject: boolean;
  exportRevenue?: number;
  totalRevenue?: number;
}): VATRefundCheck {
  const conditions: VATRefundCondition[] = [];
  let isEligible = false;
  let refundableAmount = 0;
  let reason = '';

  // Điều kiện 1: Có số thuế âm liên tiếp 12 tháng trở lên
  const has12Months = input.consecutiveMonths >= 12;
  conditions.push({
    condition: 'Có số thuế GTGT đầu vào chưa được khấu trừ hết 12 tháng liên tiếp',
    met: has12Months,
    description: has12Months
      ? `Đã đủ ${input.consecutiveMonths} tháng liên tiếp`
      : `Mới ${input.consecutiveMonths} tháng (cần 12 tháng)`,
  });

  // Điều kiện 2: Xuất khẩu (tỷ lệ > 60%)
  const exportRatio = input.totalRevenue && input.exportRevenue
    ? input.exportRevenue / input.totalRevenue
    : 0;
  const hasHighExport = exportRatio >= 0.6;
  conditions.push({
    condition: 'Xuất khẩu hàng hóa, dịch vụ với tỷ lệ ≥ 60% doanh thu',
    met: hasHighExport,
    description: input.hasExportActivity
      ? `Tỷ lệ xuất khẩu: ${(exportRatio * 100).toFixed(1)}%`
      : 'Không có hoạt động xuất khẩu',
  });

  // Điều kiện 3: Dự án đầu tư
  conditions.push({
    condition: 'Có dự án đầu tư mới đang trong giai đoạn đầu tư',
    met: input.hasInvestmentProject,
    description: input.hasInvestmentProject
      ? 'Có dự án đầu tư đang triển khai'
      : 'Không có dự án đầu tư',
  });

  // Xác định đủ điều kiện hoàn thuế
  if (input.vatRefundable > 0) {
    if (has12Months) {
      isEligible = true;
      refundableAmount = input.vatRefundable;
      reason = 'Đủ điều kiện hoàn thuế do có thuế GTGT đầu vào chưa khấu trừ hết 12 tháng liên tiếp.';
    } else if (hasHighExport && input.hasExportActivity) {
      isEligible = true;
      refundableAmount = input.vatRefundable;
      reason = 'Đủ điều kiện hoàn thuế xuất khẩu hàng tháng/quý.';
    } else if (input.hasInvestmentProject) {
      isEligible = true;
      refundableAmount = input.vatRefundable;
      reason = 'Đủ điều kiện hoàn thuế dự án đầu tư.';
    } else {
      reason = 'Chưa đủ điều kiện hoàn thuế. Số thuế GTGT âm sẽ được khấu trừ vào kỳ sau.';
    }
  } else {
    reason = 'Không có thuế GTGT âm để hoàn.';
  }

  return {
    isEligible,
    reason,
    conditions,
    refundableAmount,
  };
}

/**
 * Kiểm tra ngưỡng đăng ký VAT
 */
export function checkVATRegistration(input: {
  annualRevenue: number;
  hasVATInvoices: boolean;
  currentMethod?: VATMethod;
}): VATRegistrationCheck {
  const notes: string[] = [];
  let recommendedMethod: VATMethod | undefined;

  const requiresRegistration = input.annualRevenue > VAT_REGISTRATION_THRESHOLD;

  if (requiresRegistration) {
    if (input.annualRevenue >= 1_000_000_000) {
      notes.push('Doanh thu trên 1 tỷ/năm: BẮT BUỘC đăng ký và nộp thuế theo phương pháp khấu trừ.');
      recommendedMethod = 'deduction';
    } else {
      notes.push('Doanh thu trên 200 triệu/năm: Phải đăng ký nộp thuế GTGT.');
      recommendedMethod = input.hasVATInvoices ? 'deduction' : 'direct';
      if (input.hasVATInvoices) {
        notes.push('Có hóa đơn đầu vào: Nên dùng phương pháp khấu trừ để được hoàn thuế.');
      } else {
        notes.push('Không có hóa đơn đầu vào: Có thể cân nhắc phương pháp trực tiếp.');
      }
    }
  } else {
    notes.push('Doanh thu dưới 200 triệu/năm: Không bắt buộc đăng ký nộp thuế GTGT.');
    notes.push('Có thể tự nguyện đăng ký để được khấu trừ thuế đầu vào.');
  }

  return {
    requiresRegistration,
    annualRevenue: input.annualRevenue,
    threshold: VAT_REGISTRATION_THRESHOLD,
    currentMethod: input.currentMethod,
    recommendedMethod,
    notes,
  };
}

/**
 * Tính tổng hợp VAT theo nhiều loại hàng hóa/dịch vụ
 */
export function calculateVATSummary(
  items: Array<{
    category: string;
    revenue: number;
    rate: number;
    purchaseValue?: number;
    inputRate?: number;
  }>,
  method: VATMethod = 'deduction'
): VATSummary {
  let totalRevenue = 0;
  let totalPurchases = 0;
  let totalOutputVAT = 0;
  let totalInputVAT = 0;

  const breakdown: VATBreakdownItem[] = items.map((item) => {
    const revenue = item.revenue;
    const vatAmount = revenue * item.rate;

    totalRevenue += revenue;
    totalOutputVAT += vatAmount;

    if (method === 'deduction' && item.purchaseValue && item.inputRate) {
      totalPurchases += item.purchaseValue;
      totalInputVAT += item.purchaseValue * item.inputRate;
    }

    return {
      category: item.category,
      revenue,
      rate: item.rate,
      vatAmount: Math.round(vatAmount),
    };
  });

  const netVAT = method === 'deduction'
    ? totalOutputVAT - totalInputVAT
    : totalOutputVAT;

  return {
    totalRevenue,
    totalPurchases,
    totalOutputVAT: Math.round(totalOutputVAT),
    totalInputVAT: Math.round(totalInputVAT),
    netVAT: Math.round(netVAT),
    effectiveRate: totalRevenue > 0 ? netVAT / totalRevenue : 0,
    breakdown,
  };
}

/**
 * Xác định thuế suất VAT cho loại hàng hóa/dịch vụ
 */
export function getVATRateForCategory(
  categoryName: string,
  date: Date = new Date()
): { rate: number | null; category: string; items: readonly string[] } {
  // Kiểm tra hàng không chịu thuế
  if (VAT_CATEGORIES.exempt.items.some((item) =>
    categoryName.toLowerCase().includes(item.toLowerCase())
  )) {
    return {
      rate: null,
      category: 'Không chịu thuế',
      items: VAT_CATEGORIES.exempt.items,
    };
  }

  // Kiểm tra hàng 0%
  if (VAT_CATEGORIES.zero.items.some((item) =>
    categoryName.toLowerCase().includes(item.toLowerCase())
  )) {
    return {
      rate: 0,
      category: '0% - Xuất khẩu',
      items: VAT_CATEGORIES.zero.items,
    };
  }

  // Kiểm tra hàng 5%
  if (VAT_CATEGORIES.reduced5.items.some((item) =>
    categoryName.toLowerCase().includes(item.toLowerCase())
  )) {
    return {
      rate: 0.05,
      category: '5% - Thiết yếu',
      items: VAT_CATEGORIES.reduced5.items,
    };
  }

  // Mặc định 10% (hoặc 8% trong thời gian giảm)
  return {
    rate: getStandardVATRate(date),
    category: isVATReductionPeriod(date) ? '8% - Giảm' : '10% - Tiêu chuẩn',
    items: VAT_CATEGORIES.standard.items,
  };
}

/**
 * Lấy danh sách các loại thuế suất VAT
 */
export function getVATRateOptions(date: Date = new Date()): Array<{
  value: number | null;
  label: string;
  description: string;
}> {
  const standardRate = getStandardVATRate(date);
  const isReduced = isVATReductionPeriod(date);

  return [
    {
      value: standardRate,
      label: isReduced ? '8% (giảm từ 10%)' : '10%',
      description: 'Thuế suất tiêu chuẩn',
    },
    {
      value: 0.05,
      label: '5%',
      description: 'Hàng hóa thiết yếu',
    },
    {
      value: 0,
      label: '0%',
      description: 'Xuất khẩu, dịch vụ quốc tế',
    },
    {
      value: null,
      label: 'Không chịu thuế',
      description: 'Miễn thuế GTGT',
    },
  ];
}

/**
 * Format số tiền theo chuẩn VN
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format phần trăm
 */
export function formatPercent(rate: number | null): string {
  if (rate === null) return 'Không chịu thuế';
  return `${(rate * 100).toFixed(0)}%`;
}
