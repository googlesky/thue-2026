/**
 * Thuế giá trị gia tăng (GTGT)
 *
 * Căn cứ pháp lý:
 * - Luật Thuế GTGT 48/2024/QH15 (sửa đổi bởi Luật 90/2025/QH15, 149/2025/QH15, 09/2026/QH16)
 * - Nghị định 181/2025/NĐ-CP; Thông tư 69/2025/TT-BTC
 * - Giảm thuế GTGT: Nghị quyết 204/2025/QH15, Nghị định 174/2025/NĐ-CP (01/7/2025 – hết 31/12/2026)
 * - Ngưỡng 1 tỷ đồng của hộ, cá nhân kinh doanh: Luật 09/2026/QH16, NĐ 141/2026/NĐ-CP (kỳ tính thuế 2026)
 */

// ===== CONSTANTS =====

/**
 * Thuế suất GTGT (Luật GTGT Điều 9)
 */
export const VAT_RATES = {
  standard: 0.10, // 10% - Mặc định
  reduced: 0.08,  // 8% - Nhóm 10% trong thời gian giảm thuế
  special: 0.05,  // 5% - Hàng hóa, dịch vụ thiết yếu
  zero: 0,        // 0% - Xuất khẩu
} as const;

/**
 * Ngưỡng doanh thu năm 1 tỷ đồng:
 * - Hộ, cá nhân kinh doanh từ 1 tỷ trở xuống: không chịu thuế GTGT (Điều 5.25)
 * - Doanh nghiệp từ 1 tỷ trở lên: bắt buộc phương pháp khấu trừ (Điều 11.2.a)
 */
export const VAT_REGISTRATION_THRESHOLD = 1_000_000_000;

/**
 * Thời gian giảm thuế GTGT (dựng ngày theo giờ địa phương).
 * Giảm liên tục từ 01/01/2024 (NQ 110/2023, 142/2024, 174/2024/QH15); đợt hiện hành
 * 01/7/2025 – hết 31/12/2026 (NQ 204/2025/QH15, NĐ 174/2025/NĐ-CP).
 */
export const VAT_REDUCTION_DATES = {
  start: new Date(2024, 0, 1),
  currentRoundStart: new Date(2025, 6, 1),
  endExclusive: new Date(2027, 0, 1),
};

// Phương pháp trực tiếp: giảm 20% mức tỷ lệ % trên doanh thu (NĐ 174/2025 Điều 1.2.b)
export const DIRECT_RATE_REDUCTION = 0.2;

// Số thuế đầu vào chưa khấu trừ hết tối thiểu để được hoàn (Luật GTGT Điều 15)
export const VAT_REFUND_MIN_AMOUNT = 300_000_000;

/**
 * Phương pháp tính thuế GTGT
 */
export const VAT_METHODS = {
  deduction: 'Phương pháp khấu trừ',
  direct: 'Phương pháp trực tiếp',
} as const;

export type VATMethod = keyof typeof VAT_METHODS;

// Doanh nghiệp (được chọn phương pháp) hay hộ, cá nhân kinh doanh (luôn trực tiếp)
export type VATTaxpayerType = 'business' | 'household';

/**
 * Tỷ lệ % GTGT trên doanh thu - phương pháp trực tiếp (Luật GTGT Điều 12.2.b)
 */
export const DIRECT_VAT_RATES = {
  distribution: 0.01,     // Phân phối, cung cấp hàng hóa
  services: 0.05,         // Dịch vụ, xây dựng không bao thầu nguyên vật liệu
  production: 0.03,       // Sản xuất, vận tải, dịch vụ gắn với hàng hóa, xây dựng có bao thầu NVL
  otherActivities: 0.02,  // Hoạt động kinh doanh khác
} as const;

export type BusinessCategory = keyof typeof DIRECT_VAT_RATES;

/**
 * Danh mục hàng hóa, dịch vụ theo thuế suất (Luật GTGT Điều 5, Điều 9)
 */
export const VAT_CATEGORIES = {
  // 5% (Điều 9.2)
  reduced5: [
    'Nước sạch phục vụ sản xuất và sinh hoạt (không gồm nước uống đóng chai, đóng bình)',
    'Phân bón, quặng để sản xuất phân bón, thuốc bảo vệ thực vật, chất kích thích tăng trưởng vật nuôi',
    'Dịch vụ đào đắp, nạo vét kênh mương phục vụ nông nghiệp; chăm sóc, phòng trừ sâu bệnh cây trồng; sơ chế, bảo quản nông sản',
    'Sản phẩm trồng trọt, rừng trồng (trừ gỗ, măng), chăn nuôi, thủy sản chưa chế biến ở khâu kinh doanh thương mại',
    'Mủ cao su sơ chế; lưới, dây giềng, sợi để đan lưới đánh cá',
    'Sản phẩm bằng đay, cói, tre, nứa, lá, rơm, vỏ dừa, sọ dừa, bèo tây; xơ bông; giấy in báo',
    'Tàu khai thác thủy sản; máy móc, thiết bị chuyên dùng phục vụ sản xuất nông nghiệp',
    'Thiết bị y tế; thuốc phòng bệnh, chữa bệnh; dược chất, dược liệu làm thuốc',
    'Thiết bị dùng để giảng dạy và học tập',
    'Hoạt động nghệ thuật biểu diễn truyền thống, dân gian',
    'Đồ chơi trẻ em; sách các loại (trừ sách không chịu thuế)',
    'Dịch vụ khoa học, công nghệ',
    'Bán, cho thuê, cho thuê mua nhà ở xã hội',
  ],

  // 0% (Điều 9.1)
  zero: [
    'Hàng hóa xuất khẩu (kể cả bán vào khu phi thuế quan, cửa hàng miễn thuế, xuất khẩu tại chỗ)',
    'Dịch vụ cung cấp cho tổ chức, cá nhân ở nước ngoài và tiêu dùng ngoài Việt Nam hoặc trong khu phi thuế quan',
    'Vận tải quốc tế; dịch vụ hàng không, hàng hải cho vận tải quốc tế',
    'Xây dựng, lắp đặt công trình ở nước ngoài hoặc trong khu phi thuế quan',
    'Sản phẩm nội dung thông tin số cung cấp cho bên nước ngoài, có chứng từ tiêu dùng ngoài Việt Nam',
    'Không áp dụng 0%: chuyển giao công nghệ, quyền sở hữu trí tuệ ra nước ngoài; tái bảo hiểm ra nước ngoài; cấp tín dụng; chuyển nhượng vốn; phái sinh; bưu chính, viễn thông',
  ],

  // Không chịu thuế (Điều 5)
  exempt: [
    'Sản phẩm trồng trọt, chăn nuôi, thủy sản chưa chế biến do tổ chức, cá nhân tự sản xuất, đánh bắt bán ra và ở khâu nhập khẩu',
    'Giống vật nuôi, vật liệu nhân giống cây trồng',
    'Thức ăn chăn nuôi, thức ăn thủy sản',
    'Muối',
    'Tưới, tiêu nước; cày, bừa đất; nạo vét kênh mương nội đồng; dịch vụ thu hoạch nông sản',
    'Chuyển quyền sử dụng đất',
    'Bảo hiểm nhân thọ, sức khỏe, người học, bảo hiểm nông nghiệp; tái bảo hiểm',
    'Cấp tín dụng, kinh doanh chứng khoán, chuyển nhượng vốn, phái sinh, kinh doanh ngoại tệ, bán nợ',
    'Dịch vụ y tế, thú y; chăm sóc người cao tuổi, người khuyết tật',
    'Dịch vụ tang lễ',
    'Dạy học, dạy nghề',
    'Phát sóng truyền thanh, truyền hình bằng vốn ngân sách nhà nước',
    'Xuất bản, phát hành báo, tạp chí, bản tin, sách chính trị, sách giáo khoa, giáo trình, sách pháp luật, khoa học - kỹ thuật',
    'Vận chuyển hành khách công cộng bằng xe buýt, tàu điện, phương tiện thủy nội địa',
    'Chuyển giao công nghệ, chuyển nhượng quyền sở hữu trí tuệ; phần mềm và dịch vụ phần mềm',
    'Vàng thỏi, miếng chưa chế tác ở khâu nhập khẩu',
    'Sản phẩm nhân tạo thay thế bộ phận cơ thể người bệnh; nạng, xe lăn, dụng cụ cho người khuyết tật',
    'Sản phẩm quốc phòng, an ninh theo danh mục',
    'Hàng hóa, dịch vụ của hộ, cá nhân kinh doanh có doanh thu năm từ 1 tỷ đồng trở xuống (kỳ tính thuế 2026)',
  ],

  // 10% (Điều 9.3)
  standard: [
    'Hàng hóa, dịch vụ không thuộc các nhóm trên, kể cả dịch vụ nhà cung cấp nước ngoài bán qua thương mại điện tử, nền tảng số',
    'Từ 01/7/2025 lên 10%: đường và phụ phẩm sản xuất đường; văn hóa phẩm, triển lãm, thể dục thể thao',
  ],

  // Nhóm 10% KHÔNG được giảm (NQ 204/2025/QH15 Điều 1; NĐ 174/2025/NĐ-CP Phụ lục I, II)
  notReduced:
    'Viễn thông; hoạt động tài chính, ngân hàng, chứng khoán, bảo hiểm (kể cả bảo hiểm tài sản, xe cơ giới); kinh doanh bất động sản; kim loại và sản phẩm kim loại đúc sẵn; sản phẩm khai khoáng (trừ than); hàng hóa, dịch vụ chịu thuế tiêu thụ đặc biệt (trừ xăng)',
} as const;

// ===== TYPES =====

export interface VATInput {
  // Doanh thu bán hàng trong tháng, chưa có GTGT
  salesRevenue: number;

  // Giá trị mua hàng (đầu vào) có hóa đơn GTGT
  purchaseValue: number;

  // Thuế suất theo luật: 0,1 (nhóm 10%, tự giảm còn 8% khi đủ điều kiện) / 0,05 / 0
  outputRate: number;
  inputRate: number;

  // Hàng hóa, dịch vụ thuộc nhóm không được giảm thuế GTGT
  outputNotReduced?: boolean;
  inputNotReduced?: boolean;

  method: VATMethod;

  // Loại hình kinh doanh (phương pháp trực tiếp)
  businessCategory?: BusinessCategory;

  // Doanh nghiệp hay hộ, cá nhân kinh doanh (mặc định doanh nghiệp)
  taxpayerType?: VATTaxpayerType;

  // Thời điểm tính (xác định có trong thời gian giảm thuế không)
  calculationDate?: Date;
}

export interface VATOutput {
  outputVAT: number;
  inputVAT: number;
  vatPayable: number;
  // Thuế đầu vào chưa khấu trừ hết (chuyển kỳ sau hoặc đề nghị hoàn)
  vatRefundable: number;
  method: VATMethod;
  appliedOutputRate: number;
  appliedInputRate: number;
  isReducedRateApplied: boolean;
  // Hộ, cá nhân kinh doanh doanh thu năm ≤ 1 tỷ: không chịu thuế GTGT
  isBelowThreshold: boolean;
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
  annualRevenue: number;
  threshold: number;
  // Phương pháp bắt buộc theo luật (undefined = được chọn)
  requiredMethod?: VATMethod;
  // Hộ, cá nhân kinh doanh dưới ngưỡng: không chịu thuế GTGT
  exempt: boolean;
  notes: string[];
}

export interface VATRateOption {
  key: string;
  rate: number;
  notReduced: boolean;
  label: string;
}

// ===== FUNCTIONS =====

/**
 * Kiểm tra có đang trong thời gian giảm thuế GTGT không
 */
export function isVATReductionPeriod(date: Date = new Date()): boolean {
  return date >= VAT_REDUCTION_DATES.start && date < VAT_REDUCTION_DATES.endExclusive;
}

/**
 * Căn cứ giảm thuế GTGT áp dụng cho ngày tính
 */
export function getVATReductionBasis(date: Date = new Date()): string {
  return date >= VAT_REDUCTION_DATES.currentRoundStart
    ? 'Nghị quyết 204/2025/QH15, Nghị định 174/2025/NĐ-CP (01/7/2025 – hết 31/12/2026)'
    : 'Nghị quyết 110/2023, 142/2024, 174/2024/QH15 (01/01/2024 – 30/6/2025)';
}

/**
 * Thuế suất thực áp dụng: nhóm 10% còn 8% trong thời gian giảm, trừ hàng thuộc nhóm không được giảm.
 * Mọi giá trị khác 5% và 0% được coi là nhóm 10% (bản cũ lưu 0,08 cho lựa chọn "8%").
 */
export function getEffectiveVATRate(
  rate: number,
  date: Date = new Date(),
  notReduced: boolean = false
): number {
  if (rate === VAT_RATES.special || rate === VAT_RATES.zero) return rate;
  return isVATReductionPeriod(date) && !notReduced ? VAT_RATES.reduced : VAT_RATES.standard;
}

/**
 * Tính thuế GTGT theo phương pháp khấu trừ (Điều 11)
 */
export function calculateVATDeduction(input: VATInput): VATOutput {
  const date = input.calculationDate ?? new Date();
  const outputRate = getEffectiveVATRate(input.outputRate, date, input.outputNotReduced);
  const inputRate = getEffectiveVATRate(input.inputRate, date, input.inputNotReduced);

  const outputVAT = Math.round(input.salesRevenue * outputRate);
  const inputVAT = Math.round(input.purchaseValue * inputRate);
  const difference = outputVAT - inputVAT;

  return {
    outputVAT,
    inputVAT,
    vatPayable: Math.max(0, difference),
    vatRefundable: Math.max(0, -difference),
    method: 'deduction',
    appliedOutputRate: outputRate,
    appliedInputRate: inputRate,
    isReducedRateApplied: outputRate === VAT_RATES.reduced || inputRate === VAT_RATES.reduced,
    isBelowThreshold: false,
  };
}

/**
 * Tính thuế GTGT theo phương pháp trực tiếp trên doanh thu (Điều 12.2)
 */
export function calculateVATDirect(input: VATInput): VATOutput {
  const date = input.calculationDate ?? new Date();
  const baseRate = DIRECT_VAT_RATES[input.businessCategory ?? 'services'];
  const isReduced = isVATReductionPeriod(date) && !input.outputNotReduced;
  const rate = isReduced ? baseRate * (1 - DIRECT_RATE_REDUCTION) : baseRate;

  // Doanh thu nhập theo tháng → doanh thu năm ước tính = × 12
  const isBelowThreshold =
    input.taxpayerType === 'household' && input.salesRevenue * 12 <= VAT_REGISTRATION_THRESHOLD;
  const vatPayable = isBelowThreshold ? 0 : Math.round(input.salesRevenue * rate);

  return {
    outputVAT: vatPayable,
    inputVAT: 0, // Không khấu trừ đầu vào
    vatPayable,
    vatRefundable: 0,
    method: 'direct',
    appliedOutputRate: isBelowThreshold ? 0 : rate,
    appliedInputRate: 0,
    isReducedRateApplied: isReduced && !isBelowThreshold,
    isBelowThreshold,
  };
}

/**
 * Tính thuế GTGT. Hộ, cá nhân kinh doanh luôn dùng phương pháp trực tiếp (Điều 11.2, Điều 12.2.a2).
 */
export function calculateVAT(input: VATInput): VATOutput {
  if (input.method === 'deduction' && input.taxpayerType !== 'household') {
    return calculateVATDeduction(input);
  }
  return calculateVATDirect(input);
}

/**
 * So sánh 2 phương pháp tính thuế GTGT (dành cho doanh nghiệp)
 */
export function compareVATMethods(input: Omit<VATInput, 'method'>): {
  deduction: VATOutput;
  direct: VATOutput;
  recommendation: VATMethod;
  savings: number;
  notes: string[];
} {
  const deductionResult = calculateVATDeduction({ ...input, method: 'deduction' });
  const directResult = calculateVATDirect({
    ...input,
    method: 'direct',
    taxpayerType: 'business',
    businessCategory: input.businessCategory || 'services',
  });

  const deductionTotal = deductionResult.vatPayable;
  const directTotal = directResult.vatPayable;
  const notes: string[] = [];

  // Doanh thu năm từ 1 tỷ: không được chọn phương pháp trực tiếp
  const mandatoryDeduction = input.salesRevenue * 12 >= VAT_REGISTRATION_THRESHOLD;
  if (mandatoryDeduction) {
    notes.push('Doanh thu năm từ 1 tỷ đồng trở lên: bắt buộc áp dụng phương pháp khấu trừ (Luật GTGT Điều 11.2.a).');
  } else {
    const inputRatio = input.salesRevenue > 0 ? input.purchaseValue / input.salesRevenue : 0;
    if (inputRatio > 0.5) {
      notes.push(`Tỷ lệ mua vào/bán ra cao (${(inputRatio * 100).toFixed(0)}%): phương pháp khấu trừ thường có lợi hơn.`);
    }
    if (deductionTotal < directTotal) {
      notes.push(`Tiết kiệm ${formatCurrency(directTotal - deductionTotal)} khi dùng phương pháp khấu trừ (tự nguyện đăng ký, Điều 11.2.b).`);
    } else if (directTotal < deductionTotal) {
      notes.push(`Tiết kiệm ${formatCurrency(deductionTotal - directTotal)} khi dùng phương pháp trực tiếp.`);
    }
    if (input.purchaseValue === 0) {
      notes.push('Không có hóa đơn đầu vào để khấu trừ: phương pháp trực tiếp thường đơn giản và có lợi hơn.');
    }
  }

  return {
    deduction: deductionResult,
    direct: directResult,
    recommendation: mandatoryDeduction || deductionTotal <= directTotal ? 'deduction' : 'direct',
    savings: mandatoryDeduction ? 0 : Math.abs(deductionTotal - directTotal),
    notes,
  };
}

/**
 * Kiểm tra điều kiện hoàn thuế GTGT (Luật GTGT Điều 15; chỉ áp dụng cho cơ sở nộp thuế theo phương pháp khấu trừ)
 */
export function checkVATRefundEligibility(input: {
  vatRefundable: number;
  exportRevenue?: number;
  hasInvestmentProject?: boolean;
  onlyFivePercentGoods?: boolean;
  consecutiveMonths?: number; // số tháng liên tục còn thuế chưa khấu trừ hết (trường hợp hàng 5%)
}): VATRefundCheck {
  const {
    vatRefundable,
    exportRevenue = 0,
    hasInvestmentProject = false,
    onlyFivePercentGoods = false,
    consecutiveMonths,
  } = input;
  const minText = formatCurrency(VAT_REFUND_MIN_AMOUNT);
  const reachesMin = vatRefundable >= VAT_REFUND_MIN_AMOUNT;
  const amountText = `Số thuế chưa khấu trừ hết kỳ này: ${formatCurrency(vatRefundable)}${reachesMin ? '' : ` (chưa đủ ${minText})`}`;

  const conditions: VATRefundCondition[] = [
    {
      condition: `Có hàng hóa, dịch vụ xuất khẩu và số thuế đầu vào chưa khấu trừ hết từ ${minText} (Điều 15.1)`,
      met: exportRevenue > 0 && reachesMin,
      description: exportRevenue > 0
        ? `${amountText}. Nếu vừa xuất khẩu vừa bán trong nước: số hoàn không vượt quá 10% doanh thu xuất khẩu của kỳ hoàn thuế.`
        : 'Không có doanh thu xuất khẩu trong kỳ',
    },
    {
      condition: `Dự án đầu tư đang trong giai đoạn đầu tư, còn thuế chưa khấu trừ hết từ ${minText} sau khi bù trừ (Điều 15.2)`,
      met: hasInvestmentProject && reachesMin,
      description: hasInvestmentProject ? amountText : 'Không có dự án đầu tư',
    },
    {
      condition: `Chỉ sản xuất, kinh doanh hàng hóa, dịch vụ thuế suất 5%, còn thuế chưa khấu trừ hết từ ${minText} sau 12 tháng hoặc 04 quý liên tục (Điều 15.3)`,
      met: onlyFivePercentGoods && reachesMin && (consecutiveMonths ?? 0) >= 12,
      description: onlyFivePercentGoods
        ? `${amountText}. Cần lũy kế đủ 12 tháng hoặc 04 quý liên tục.`
        : 'Không áp dụng',
    },
  ];

  const isEligible = vatRefundable > 0 && conditions.some((c) => c.met);
  const reason = vatRefundable <= 0
    ? 'Không có số thuế GTGT đầu vào chưa khấu trừ hết.'
    : isEligible
      ? 'Có thể lập hồ sơ đề nghị hoàn thuế GTGT theo Điều 15 Luật Thuế GTGT.'
      : 'Chưa đủ điều kiện hoàn thuế: số thuế chưa khấu trừ hết được chuyển khấu trừ sang kỳ sau.';

  return {
    isEligible,
    reason,
    conditions,
    refundableAmount: isEligible ? vatRefundable : 0,
  };
}

/**
 * Xác định phương pháp tính thuế bắt buộc theo doanh thu năm và loại người nộp thuế
 */
export function checkVATRegistration(input: {
  annualRevenue: number;
  taxpayerType?: VATTaxpayerType;
}): VATRegistrationCheck {
  const { annualRevenue, taxpayerType = 'business' } = input;
  const notes: string[] = [];
  let requiredMethod: VATMethod | undefined;
  let exempt = false;

  if (taxpayerType === 'household') {
    requiredMethod = 'direct';
    exempt = annualRevenue <= VAT_REGISTRATION_THRESHOLD;
    notes.push(
      exempt
        ? 'Hộ, cá nhân kinh doanh có doanh thu năm từ 1 tỷ đồng trở xuống: không phải nộp thuế GTGT (Luật GTGT Điều 5.25, sửa bởi Luật 09/2026/QH16; NĐ 141/2026/NĐ-CP), vẫn phải thông báo doanh thu với cơ quan thuế.'
        : 'Hộ, cá nhân kinh doanh có doanh thu năm trên 1 tỷ đồng: nộp thuế GTGT theo tỷ lệ % trên toàn bộ doanh thu (Luật GTGT Điều 12.2); không áp dụng phương pháp khấu trừ.'
    );
  } else if (annualRevenue >= VAT_REGISTRATION_THRESHOLD) {
    requiredMethod = 'deduction';
    notes.push('Doanh nghiệp có doanh thu năm từ 1 tỷ đồng trở lên: bắt buộc áp dụng phương pháp khấu trừ (Luật GTGT Điều 11.2.a).');
  } else {
    notes.push('Doanh nghiệp có doanh thu năm dưới 1 tỷ đồng: áp dụng phương pháp trực tiếp, trừ khi tự nguyện đăng ký phương pháp khấu trừ (Luật GTGT Điều 11.2.b, Điều 12.2.a1).');
  }

  return {
    annualRevenue,
    threshold: VAT_REGISTRATION_THRESHOLD,
    requiredMethod,
    exempt,
    notes,
  };
}

/**
 * Lựa chọn thuế suất cho ô chọn (phương pháp khấu trừ).
 * key '0.1x' = nhóm 10% nhưng không thuộc diện giảm (chỉ có trong thời gian giảm thuế).
 */
export function getVATRateOptions(date: Date = new Date()): VATRateOption[] {
  const standardOptions: VATRateOption[] = isVATReductionPeriod(date)
    ? [
        { key: '0.1', rate: VAT_RATES.standard, notReduced: false, label: '8% - hàng hóa, dịch vụ được giảm từ 10%' },
        { key: '0.1x', rate: VAT_RATES.standard, notReduced: true, label: '10% - không thuộc diện giảm (viễn thông, tài chính, BĐS...)' },
      ]
    : [{ key: '0.1', rate: VAT_RATES.standard, notReduced: false, label: '10% - thuế suất phổ thông' }];

  return [
    ...standardOptions,
    { key: '0.05', rate: VAT_RATES.special, notReduced: false, label: '5% - hàng hóa, dịch vụ thiết yếu' },
    { key: '0', rate: VAT_RATES.zero, notReduced: false, label: '0% - xuất khẩu' },
  ];
}

/**
 * Khóa lựa chọn tương ứng với state (luôn nằm trong getVATRateOptions(date))
 */
export function getVATRateOptionKey(rate: number, notReduced: boolean | undefined, date: Date = new Date()): string {
  if (rate === VAT_RATES.special) return '0.05';
  if (rate === VAT_RATES.zero) return '0';
  return notReduced && isVATReductionPeriod(date) ? '0.1x' : '0.1';
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
 * Format phần trăm kiểu Việt Nam (VD: 0,8%; 2,4%; 10%)
 */
export function formatPercent(rate: number | null): string {
  if (rate === null) return 'Không chịu thuế';
  return `${(rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}
