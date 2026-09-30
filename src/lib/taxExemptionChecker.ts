/**
 * Kiểm tra thu nhập được miễn thuế TNCN
 * Căn cứ: Luật Thuế TNCN 109/2025/QH15 (Điều 4: 21 khoản miễn thuế; Điều 5: miễn, giảm khác),
 * NĐ 253/2026/NĐ-CP (Điều 18–43 hướng dẫn miễn thuế; Điều 8 khoản 3: các khoản không tính
 * vào thu nhập chịu thuế).
 */

import {
  EFFECTIVE_DATES,
  PER_TRANSACTION_THRESHOLD_2026,
  formatDate,
  formatNumber,
} from '@/lib/taxCalculator';

export type ExemptionCategory =
  // Luật Thuế TNCN Điều 4
  | 'family_transfer'             // K1: chuyển nhượng BĐS giữa người thân
  | 'inheritance_family'          // K1: nhận thừa kế BĐS giữa người thân
  | 'gift_family'                 // K1: nhận quà tặng BĐS giữa người thân
  | 'real_estate_only_home'       // K2: nhà ở, đất ở duy nhất
  | 'land_allocation'             // K3: giá trị QSDĐ được Nhà nước giao
  | 'agricultural_income'         // K4: trực tiếp sản xuất nông nghiệp
  | 'agricultural_coop_dividend'  // K4: lợi tức cổ phần HTX nông nghiệp, “Cánh đồng lớn”
  | 'agricultural_land_conversion' // K5: chuyển đổi đất nông nghiệp
  | 'interest_deposits'           // K6: lãi tiền gửi, TP Chính phủ, TP chính quyền địa phương
  | 'life_insurance'              // K6, K11: lãi và tiền bồi thường bảo hiểm
  | 'remittance'                  // K7: kiều hối
  | 'night_shift_allowance'       // K8: tiền lương làm đêm, làm thêm giờ, ngày phép chưa nghỉ
  | 'pension'                     // K9: lương hưu, quỹ hưu trí bổ sung/tự nguyện
  | 'scholarship'                 // K10: học bổng
  | 'compensation'                // K11: bồi thường
  | 'charity'                     // K12: nhận từ quỹ từ thiện
  | 'foreign_aid'                 // K13: viện trợ nước ngoài
  | 'seafarer'                    // K14: thuyền viên
  | 'offshore_fishing'            // K15: đánh bắt thủy sản xa bờ
  | 'carbon_credits'              // K16: chuyển nhượng lần đầu tín chỉ các-bon
  | 'green_bond_interest'         // K16: trái phiếu xanh
  | 'science_tech_salary'         // K17: tiền lương nhiệm vụ KH, CN & ĐMST
  | 'science_tech_copyright'      // K18: quyền tác giả nhiệm vụ KH, CN & ĐMST
  | 'startup_investment'          // K19: khởi nghiệp sáng tạo
  | 'international_org_staff'     // K20: chuyên gia ODA/NGO, người VN làm cho tổ chức LHQ
  | 'business_owner_profit'       // K21: chủ DNTN, chủ công ty TNHH MTV
  // Luật Thuế TNCN Điều 5
  | 'digital_tech_talent'         // K2: nhân lực công nghiệp công nghệ số (05 năm)
  | 'high_tech_income'            // K3: nhân lực công nghệ cao (05 năm)
  | 'open_fund_certificates'      // K4: chứng chỉ quỹ mở nắm giữ từ 02 năm
  // NĐ 253/2026 Điều 8 khoản 3: không tính vào thu nhập chịu thuế
  | 'severance_pay'               // điểm h
  | 'hazard_allowance'            // điểm d
  | 'social_insurance_benefits';  // điểm g

export type ExemptionStatus = 'exempt' | 'partial' | 'not_exempt' | 'needs_review';

export interface ExemptionRule {
  id: ExemptionCategory;
  name: string;
  description: string;
  conditions: string[]; // Phải đáp ứng TẤT CẢ
  anyOf?: string[]; // Phải thuộc ÍT NHẤT MỘT trường hợp
  excessLabel?: string; // Có mức luật định: phần vượt mức tính vào thu nhập chịu thuế
  requiredDocuments: string[];
  effectiveFrom?: Date; // Chỉ ghi với quy định mới/mở rộng theo Luật 109/2025
  isNew2026: boolean; // Khoản mới hoặc mở rộng theo Luật 109/2025/QH15
  legalReference: string;
}

export interface ExemptionCheckInput {
  category: ExemptionCategory;
  incomeAmount: number;
  answers: Record<string, boolean | string | number>; // condition_<i>, case_<i>
  excessAmount?: number; // Phần vượt mức luật định (với rule có excessLabel)
}

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

// Luật 109/2025/QH15 có hiệu lực 01/7/2026; riêng quy định về tiền lương, tiền công,
// kinh doanh của cá nhân cư trú áp dụng từ kỳ tính thuế 2026 (Luật Điều 29; NĐ 253 Điều 69).
const LAW_109_EFFECTIVE = new Date(2026, 6, 1);
const SALARY_RULES_2026 = EFFECTIVE_DATES.NEW_TAX_LAW_2026;

// Điều kiện về thời điểm phát sinh thu nhập của các quy định mới/mở rộng
const FROM_SALARY_2026 = 'Tiền lương, tiền công được trả từ ngày 01/01/2026 (kỳ tính thuế 2026 trở đi)';
const FROM_LAW_109 = 'Thu nhập phát sinh từ ngày 01/7/2026';

const LAW = 'Luật Thuế TNCN 109/2025/QH15';
const DECREE = 'NĐ 253/2026/NĐ-CP';

// Luật Điều 4 khoản 1; NĐ 253 Điều 18.1
const RELATIVES = [
  'Giữa vợ với chồng',
  'Giữa cha đẻ, mẹ đẻ với con đẻ; cha nuôi, mẹ nuôi với con nuôi',
  'Giữa cha chồng, mẹ chồng với con dâu; cha vợ, mẹ vợ với con rể (kể cả khi chồng, vợ đã chết)',
  'Giữa ông nội, bà nội với cháu nội; ông ngoại, bà ngoại với cháu ngoại',
  'Giữa anh, chị, em ruột với nhau',
];

const RELATIVE_PROOF = 'Giấy tờ chứng minh quan hệ (giấy khai sinh, đăng ký kết hôn, quyết định công nhận con nuôi...)';

export const EXEMPTION_RULES: ExemptionRule[] = [
  // ===== LUẬT THUẾ TNCN ĐIỀU 4 =====
  {
    id: 'family_transfer',
    name: 'Chuyển nhượng bất động sản giữa người thân',
    description:
      'Thu nhập từ chuyển nhượng bất động sản (kể cả nhà ở, công trình hình thành trong tương lai) giữa những người thân theo luật định, kể cả phân chia bất động sản khi vợ chồng ly hôn.',
    conditions: ['Tài sản chuyển nhượng là bất động sản'],
    anyOf: [...RELATIVES, 'Phân chia bất động sản khi vợ chồng ly hôn (theo thỏa thuận hoặc tòa án phán quyết)'],
    requiredDocuments: [RELATIVE_PROOF, 'Hợp đồng chuyển nhượng', 'Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở'],
    isNew2026: false,
    legalReference: `Khoản 1 Điều 4 ${LAW}; Điều 18 ${DECREE}`,
  },
  {
    id: 'inheritance_family',
    name: 'Nhận thừa kế bất động sản từ người thân',
    description:
      'Thu nhập từ nhận thừa kế là bất động sản giữa những người thân theo luật định. Thừa kế chứng khoán, phần vốn, tài sản phải đăng ký khác không thuộc khoản miễn này.',
    conditions: ['Tài sản nhận thừa kế là bất động sản'],
    anyOf: RELATIVES,
    requiredDocuments: [RELATIVE_PROOF, 'Di chúc hoặc văn bản khai nhận, phân chia di sản thừa kế', 'Giấy chứng tử'],
    isNew2026: false,
    legalReference: `Khoản 1 Điều 4 ${LAW}; Điều 18 ${DECREE}`,
  },
  {
    id: 'gift_family',
    name: 'Nhận quà tặng bất động sản từ người thân',
    description:
      'Thu nhập từ nhận quà tặng là bất động sản giữa những người thân theo luật định. Quà tặng là chứng khoán, phần vốn, ô tô... giữa người thân không thuộc khoản miễn này.',
    conditions: ['Tài sản được tặng cho là bất động sản'],
    anyOf: RELATIVES,
    requiredDocuments: [RELATIVE_PROOF, 'Hợp đồng tặng cho có công chứng, chứng thực'],
    isNew2026: false,
    legalReference: `Khoản 1 Điều 4 ${LAW}; Điều 18 ${DECREE}`,
  },
  {
    id: 'real_estate_only_home',
    name: 'Chuyển nhượng nhà ở, đất ở duy nhất',
    description:
      'Thu nhập từ chuyển nhượng nhà ở, quyền sử dụng đất ở và tài sản gắn liền với đất ở khi cá nhân chỉ có duy nhất một nhà ở, đất ở tại Việt Nam. Không áp dụng với nhà ở, công trình hình thành trong tương lai; chuyển nhượng một phần thì phần đó không được miễn.',
    conditions: [
      'Tại thời điểm chuyển nhượng chỉ có duy nhất một nhà ở hoặc một thửa đất ở tại Việt Nam, không có thêm nhà ở, công trình hình thành trong tương lai (đồng sở hữu: chỉ người chưa có nhà ở, đất ở nơi khác được miễn)',
      'Có quyền sở hữu, quyền sử dụng tối thiểu 183 ngày tính đến thời điểm chuyển nhượng (tính từ ngày cấp Giấy chứng nhận)',
      'Chuyển nhượng toàn bộ nhà ở, quyền sử dụng đất ở',
      'Không phải nhà ở, công trình xây dựng hình thành trong tương lai',
    ],
    requiredDocuments: [
      'Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở',
      'Hợp đồng chuyển nhượng',
      'Tự kê khai nhà ở, đất ở duy nhất trên tờ khai (tự chịu trách nhiệm)',
    ],
    isNew2026: false,
    legalReference: `Khoản 2 Điều 4 ${LAW}; Điều 19 ${DECREE}`,
  },
  {
    id: 'land_allocation',
    name: 'Giá trị quyền sử dụng đất được Nhà nước giao',
    description:
      'Thu nhập từ giá trị quyền sử dụng đất của cá nhân được Nhà nước giao đất không phải trả tiền hoặc được giảm tiền sử dụng đất. Khi chuyển nhượng phần đất này thì khai, nộp thuế như chuyển nhượng bất động sản.',
    conditions: ['Được Nhà nước giao đất không phải trả tiền sử dụng đất hoặc được giảm tiền sử dụng đất theo quy định'],
    requiredDocuments: ['Quyết định giao đất của cơ quan nhà nước có thẩm quyền', 'Giấy chứng nhận quyền sử dụng đất'],
    isNew2026: false,
    legalReference: `Khoản 3 Điều 4 ${LAW}; Điều 20 ${DECREE}`,
  },
  {
    id: 'agricultural_income',
    name: 'Trực tiếp sản xuất nông, lâm, ngư nghiệp, làm muối',
    description:
      'Thu nhập của hộ gia đình, cá nhân trực tiếp sản xuất cây trồng, rừng trồng, chăn nuôi, thủy sản nuôi trồng, đánh bắt chưa qua chế biến hoặc chỉ qua sơ chế thông thường; sản xuất muối.',
    conditions: [
      'Trực tiếp tham gia lao động sản xuất (trồng trọt, rừng trồng, chăn nuôi, nuôi trồng, đánh bắt thủy sản, làm muối)',
      'Sản phẩm chưa qua chế biến hoặc chỉ qua sơ chế thông thường',
      'Có quyền sử dụng, quyền thuê đất, mặt nước hợp pháp (đánh bắt thủy sản: sở hữu hoặc thuê tàu, thuyền)',
      'Thực tế cư trú tại xã nơi sản xuất hoặc xã giáp ranh (đánh bắt thủy sản không phụ thuộc nơi cư trú)',
    ],
    requiredDocuments: [
      'Giấy tờ về quyền sử dụng, thuê đất, mặt nước hoặc tàu, thuyền',
      'Giấy tờ chứng minh nơi cư trú',
    ],
    isNew2026: false,
    legalReference: `Khoản 4 Điều 4 ${LAW}; Điều 21 ${DECREE}`,
  },
  {
    id: 'agricultural_coop_dividend',
    name: 'Lợi tức cổ phần hợp tác xã nông nghiệp, “Cánh đồng lớn”',
    description:
      'Lợi tức cổ phần của thành viên hợp tác xã, liên hiệp hợp tác xã nông nghiệp; của nông dân ký hợp đồng với doanh nghiệp tham gia “Cánh đồng lớn”, trồng rừng sản xuất, nuôi trồng thủy sản.',
    conditions: [],
    anyOf: [
      'Là thành viên hợp tác xã, liên hiệp hợp tác xã nông nghiệp (xác định theo pháp luật về hợp tác xã)',
      'Là nông dân ký hợp đồng với doanh nghiệp tham gia “Cánh đồng lớn”, trồng rừng sản xuất, nuôi trồng thủy sản; có quyền sử dụng, thuê đất, mặt nước hợp pháp và thực tế cư trú tại xã nơi sản xuất hoặc xã giáp ranh',
    ],
    requiredDocuments: ['Giấy tờ xác nhận thành viên hợp tác xã hoặc hợp đồng với doanh nghiệp', 'Chứng từ chi trả lợi tức cổ phần'],
    isNew2026: false,
    legalReference: `Khoản 4 Điều 4 ${LAW}; Điều 22 ${DECREE}`,
  },
  {
    id: 'agricultural_land_conversion',
    name: 'Chuyển đổi đất nông nghiệp được Nhà nước giao',
    description:
      'Thu nhập từ chuyển đổi đất nông nghiệp để hợp lý hóa sản xuất nông nghiệp của hộ gia đình, cá nhân trực tiếp sản xuất nông nghiệp được Nhà nước giao đất.',
    conditions: [
      'Đất nông nghiệp được Nhà nước giao để sản xuất; hộ gia đình, cá nhân trực tiếp sản xuất nông nghiệp',
      'Chuyển đổi để hợp lý hóa sản xuất, không làm thay đổi mục đích sử dụng đất',
    ],
    requiredDocuments: ['Quyết định giao đất, Giấy chứng nhận quyền sử dụng đất', 'Văn bản chuyển đổi đất nông nghiệp'],
    isNew2026: false,
    legalReference: `Khoản 5 Điều 4 ${LAW}; Điều 23 ${DECREE}`,
  },
  {
    id: 'interest_deposits',
    name: 'Lãi tiền gửi, lãi trái phiếu Chính phủ',
    description:
      'Lãi tiền gửi (VND, vàng, ngoại tệ; không kỳ hạn, có kỳ hạn, tiết kiệm, chứng chỉ tiền gửi, kỳ phiếu, tín phiếu) tại tổ chức tín dụng, chi nhánh ngân hàng nước ngoài; lãi trái phiếu Chính phủ, trái phiếu chính quyền địa phương. Lãi trái phiếu doanh nghiệp, lãi cho vay vẫn chịu thuế 5%.',
    conditions: [],
    anyOf: [
      'Lãi tiền gửi tại tổ chức tín dụng, chi nhánh ngân hàng nước ngoài (kể cả lãi từ chuyển nhượng chứng chỉ tiền gửi)',
      'Lãi trái phiếu Chính phủ',
      'Lãi trái phiếu chính quyền địa phương (do UBND cấp tỉnh phát hành)',
    ],
    requiredDocuments: [
      'Sổ tiết kiệm, hợp đồng tiền gửi hoặc xác nhận của tổ chức tín dụng',
      'Xác nhận sở hữu trái phiếu (với lãi trái phiếu)',
    ],
    isNew2026: false,
    legalReference: `Khoản 6 Điều 4 ${LAW}; Điều 24 ${DECREE}`,
  },
  {
    id: 'life_insurance',
    name: 'Lãi và tiền bồi thường bảo hiểm',
    description:
      'Lãi từ hợp đồng bảo hiểm nhân thọ; tiền bồi thường theo hợp đồng bảo hiểm nhân thọ, phi nhân thọ, bảo hiểm sức khỏe do tổ chức bảo hiểm trả cho người được bảo hiểm hoặc người thụ hưởng.',
    conditions: [],
    anyOf: [
      'Lãi từ hợp đồng bảo hiểm nhân thọ mua của doanh nghiệp bảo hiểm',
      'Tiền bồi thường theo hợp đồng bảo hiểm nhân thọ, phi nhân thọ, bảo hiểm sức khỏe',
    ],
    requiredDocuments: ['Hợp đồng bảo hiểm', 'Văn bản, quyết định bồi thường và chứng từ chi trả của tổ chức bảo hiểm'],
    isNew2026: false,
    legalReference: `Khoản 6, khoản 11 Điều 4 ${LAW}; Điều 24, 29 ${DECREE}`,
  },
  {
    id: 'remittance',
    name: 'Kiều hối',
    description:
      'Tiền nhận từ nước ngoài do thân nhân là người Việt Nam định cư ở nước ngoài, người Việt Nam đi lao động, công tác, học tập ở nước ngoài gửi về cho thân nhân trong nước.',
    conditions: [],
    anyOf: [
      'Người gửi là thân nhân là người Việt Nam định cư ở nước ngoài hoặc đang lao động, công tác, học tập ở nước ngoài',
      'Người gửi là thân nhân người nước ngoài và đáp ứng điều kiện khuyến khích chuyển tiền về nước của Ngân hàng Nhà nước',
    ],
    requiredDocuments: ['Giấy tờ chứng minh nguồn tiền nhận từ nước ngoài', 'Chứng từ chi tiền của tổ chức trả hộ (nếu có)'],
    isNew2026: false,
    legalReference: `Khoản 7 Điều 4 ${LAW}; Điều 25 ${DECREE}`,
  },
  {
    id: 'night_shift_allowance',
    name: 'Tiền lương làm đêm, làm thêm giờ, ngày phép chưa nghỉ',
    description:
      'Từ kỳ tính thuế 2026 miễn toàn bộ tiền lương làm việc ban đêm, làm thêm giờ và tiền lương trả cho những ngày không nghỉ phép theo quy định (trước đây chỉ miễn phần trả cao hơn giờ làm việc bình thường). Phần vượt mức luật định tính vào thu nhập chịu thuế.',
    conditions: [FROM_SALARY_2026],
    anyOf: [
      'Tiền lương làm đêm, làm thêm giờ phù hợp điều kiện, thời gian theo pháp luật lao động',
      'Tiền lương trả cho những ngày không nghỉ phép theo khoản 3 Điều 113 Bộ luật Lao động (hoặc Luật Cán bộ, công chức, Luật Viên chức)',
    ],
    excessLabel: 'Phần vượt mức quy định của pháp luật (VNĐ, nếu có)',
    requiredDocuments: [
      'Bảng kê thời gian làm đêm, làm thêm giờ và tiền lương đã trả (lưu tại đơn vị trả thu nhập)',
      'Bảng chấm công, bảng lương, hợp đồng lao động',
    ],
    effectiveFrom: SALARY_RULES_2026,
    isNew2026: true,
    legalReference: `Khoản 8 Điều 4 ${LAW}; Điều 26 ${DECREE}`,
  },
  {
    id: 'pension',
    name: 'Lương hưu, thu nhập từ quỹ hưu trí',
    description:
      'Lương hưu do Quỹ bảo hiểm xã hội chi trả (kể cả lương hưu do nước ngoài chi trả cho người sống, làm việc tại Việt Nam); thu nhập do quỹ bảo hiểm hưu trí bổ sung, quỹ hưu trí tự nguyện chi trả, không phân biệt chi trả định kỳ hay một lần, trước hay sau tuổi nghỉ hưu.',
    conditions: [],
    anyOf: [
      'Lương hưu do Quỹ bảo hiểm xã hội chi trả (kể cả lương hưu do nước ngoài chi trả)',
      'Thu nhập do quỹ bảo hiểm hưu trí bổ sung, quỹ hưu trí tự nguyện chi trả (định kỳ hoặc một lần)',
    ],
    requiredDocuments: ['Quyết định hưởng lương hưu hoặc chứng từ chi trả của quỹ hưu trí', 'Hợp đồng tham gia quỹ hưu trí (nếu có)'],
    isNew2026: false,
    legalReference: `Khoản 9 Điều 4 ${LAW}; Điều 27 ${DECREE}`,
  },
  {
    id: 'scholarship',
    name: 'Học bổng',
    description: 'Học bổng từ ngân sách nhà nước; học bổng từ tổ chức trong nước, ngoài nước theo chương trình hỗ trợ khuyến học của tổ chức đó.',
    conditions: [],
    anyOf: [
      'Học bổng từ ngân sách nhà nước (Bộ, Sở Giáo dục và Đào tạo, Quỹ học bổng quốc gia, quỹ khuyến tài, khuyến học, cơ sở giáo dục công lập...)',
      'Học bổng (kể cả sinh hoạt phí) từ tổ chức trong nước, ngoài nước theo chương trình hỗ trợ của tổ chức đó',
    ],
    requiredDocuments: ['Quyết định cấp học bổng', 'Chứng từ nhận học bổng'],
    isNew2026: false,
    legalReference: `Khoản 10 Điều 4 ${LAW}; Điều 28 ${DECREE}`,
  },
  {
    id: 'compensation',
    name: 'Tiền bồi thường',
    description:
      'Tiền bồi thường tai nạn lao động; bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất; bồi thường nhà nước; bồi thường thiệt hại ngoài hợp đồng theo Bộ luật Dân sự (kể cả lãi chậm trả). Bồi thường theo hợp đồng bảo hiểm: xem mục “Lãi và tiền bồi thường bảo hiểm”.',
    conditions: [],
    anyOf: [
      'Bồi thường tai nạn lao động từ người sử dụng lao động hoặc Quỹ bảo hiểm xã hội',
      'Bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất',
      'Bồi thường nhà nước theo pháp luật về trách nhiệm bồi thường của Nhà nước',
      'Bồi thường thiệt hại ngoài hợp đồng theo Bộ luật Dân sự (có bản án, quyết định của Tòa án hoặc thỏa thuận được công chứng, chứng thực)',
    ],
    requiredDocuments: [
      'Văn bản, quyết định bồi thường (hoặc phương án bồi thường được phê duyệt, bản án)',
      'Chứng từ chi trả tiền bồi thường',
    ],
    isNew2026: false,
    legalReference: `Khoản 11 Điều 4 ${LAW}; Điều 29 ${DECREE}`,
  },
  {
    id: 'charity',
    name: 'Thu nhập nhận từ quỹ từ thiện',
    description: 'Thu nhập nhận được từ tổ chức, quỹ từ thiện hoạt động vì mục đích từ thiện, nhân đạo, khuyến học, không vì lợi nhuận.',
    conditions: [
      'Tổ chức, quỹ được cơ quan nhà nước có thẩm quyền cho phép thành lập hoặc công nhận',
      'Hoạt động vì mục đích từ thiện, nhân đạo, khuyến học, không vì lợi nhuận',
    ],
    requiredDocuments: ['Văn bản, quyết định trao khoản thu nhập của quỹ', 'Chứng từ chi tiền, hiện vật của quỹ'],
    isNew2026: false,
    legalReference: `Khoản 12 Điều 4 ${LAW}; Điều 30 ${DECREE}`,
  },
  {
    id: 'foreign_aid',
    name: 'Viện trợ nước ngoài vì mục đích từ thiện, nhân đạo',
    description: 'Thu nhập nhận được từ nguồn viện trợ nước ngoài vì mục đích từ thiện, nhân đạo dưới hình thức chính phủ và phi chính phủ.',
    conditions: [
      'Viện trợ nước ngoài (chính phủ hoặc phi chính phủ) vì mục đích từ thiện, nhân đạo',
      'Việc nhận viện trợ được cơ quan nhà nước có thẩm quyền phê duyệt',
    ],
    requiredDocuments: ['Văn bản phê duyệt việc nhận viện trợ của cơ quan nhà nước có thẩm quyền'],
    isNew2026: false,
    legalReference: `Khoản 13 Điều 4 ${LAW}; Điều 31 ${DECREE}`,
  },
  {
    id: 'seafarer',
    name: 'Tiền lương thuyền viên vận tải quốc tế',
    description: 'Tiền lương, tiền công của thuyền viên là người Việt Nam làm việc cho hãng tàu nước ngoài hoặc hãng tàu Việt Nam vận tải quốc tế.',
    conditions: ['Là thuyền viên người Việt Nam', 'Làm việc cho hãng tàu nước ngoài hoặc hãng tàu Việt Nam vận tải quốc tế'],
    requiredDocuments: ['Hợp đồng lao động thuyền viên', 'Giấy tờ xác định hãng tàu vận tải quốc tế (theo Bộ luật Hàng hải)'],
    isNew2026: false,
    legalReference: `Khoản 14 Điều 4 ${LAW}; Điều 32 ${DECREE}`,
  },
  {
    id: 'offshore_fishing',
    name: 'Hàng hóa, dịch vụ phục vụ đánh bắt thủy sản xa bờ',
    description:
      'Thu nhập của chủ tàu, người có quyền sử dụng tàu và người làm việc trên tàu từ hoạt động cung cấp hàng hóa, dịch vụ trực tiếp phục vụ khai thác, đánh bắt thủy sản xa bờ.',
    conditions: [
      'Là chủ tàu, người có quyền sử dụng tàu hoặc người làm việc trên tàu',
      'Thu nhập từ cung cấp hàng hóa, dịch vụ trực tiếp phục vụ khai thác thủy sản xa bờ',
    ],
    requiredDocuments: ['Giấy chứng nhận đăng ký tàu cá hoặc hợp đồng thuê tàu', 'Hợp đồng, chứng từ cung cấp hàng hóa, dịch vụ'],
    isNew2026: false,
    legalReference: `Khoản 15 Điều 4 ${LAW}; Điều 33 ${DECREE}`,
  },
  {
    id: 'carbon_credits',
    name: 'Chuyển nhượng lần đầu tín chỉ các-bon',
    description: `Thu nhập từ chuyển nhượng lần đầu kết quả giảm phát thải khí nhà kính, tín chỉ các-bon của chính cá nhân được cấp, công nhận. Các lần chuyển nhượng sau chịu thuế 5% trên phần vượt ${formatNumber(PER_TRANSACTION_THRESHOLD_2026)} đ/lần.`,
    conditions: [
      FROM_LAW_109,
      'Là cá nhân được cấp, công nhận kết quả giảm phát thải khí nhà kính, tín chỉ các-bon đó',
      'Là lần chuyển nhượng đầu tiên',
    ],
    requiredDocuments: [
      'Giấy chứng nhận, văn bản công nhận kết quả giảm phát thải hoặc cấp tín chỉ các-bon',
      'Hợp đồng chuyển nhượng',
    ],
    effectiveFrom: LAW_109_EFFECTIVE,
    isNew2026: true,
    legalReference: `Khoản 16 Điều 4 ${LAW}; khoản 1 Điều 34 ${DECREE}`,
  },
  {
    id: 'green_bond_interest',
    name: 'Lãi, chuyển nhượng lần đầu trái phiếu xanh',
    description: 'Tiền lãi trái phiếu xanh; thu nhập từ chuyển nhượng lần đầu trái phiếu xanh mà cá nhân mua trực tiếp của tổ chức phát hành.',
    conditions: [FROM_LAW_109],
    anyOf: ['Tiền lãi trái phiếu xanh', 'Chuyển nhượng lần đầu trái phiếu xanh mua trực tiếp của tổ chức phát hành'],
    requiredDocuments: [
      'Tài liệu xác nhận trái phiếu là trái phiếu xanh',
      'Chứng từ nhận lãi hoặc chứng từ mua (của tổ chức phát hành) và bán trái phiếu',
    ],
    effectiveFrom: LAW_109_EFFECTIVE,
    isNew2026: true,
    legalReference: `Khoản 16 Điều 4 ${LAW}; khoản 2, 3 Điều 34 ${DECREE}`,
  },
  {
    id: 'science_tech_salary',
    name: 'Tiền lương nhiệm vụ khoa học, công nghệ',
    description:
      'Tiền lương, tiền công (thù lao) từ thực hiện nhiệm vụ khoa học, công nghệ và đổi mới sáng tạo, có hoặc không sử dụng ngân sách nhà nước.',
    conditions: [
      FROM_SALARY_2026,
      'Là tiền lương, tiền công, thù lao thực hiện nhiệm vụ khoa học, công nghệ và đổi mới sáng tạo',
      'Nhiệm vụ được phê duyệt theo pháp luật về khoa học, công nghệ và đổi mới sáng tạo (dùng ngân sách: cấp có thẩm quyền; không dùng ngân sách: doanh nghiệp phê duyệt theo quy trình nội bộ)',
    ],
    requiredDocuments: [
      'Quyết định phê duyệt hoặc thuyết minh nhiệm vụ',
      'Hợp đồng thuê nghiên cứu; biên bản nghiệm thu, thanh lý (lưu tại đơn vị trả thu nhập)',
    ],
    effectiveFrom: SALARY_RULES_2026,
    isNew2026: true,
    legalReference: `Khoản 17 Điều 4 ${LAW}; Điều 35 ${DECREE}`,
  },
  {
    id: 'science_tech_copyright',
    name: 'Quyền tác giả nhiệm vụ khoa học, công nghệ',
    description:
      'Thu nhập từ quyền tác giả của nhiệm vụ khoa học, công nghệ và đổi mới sáng tạo khi kết quả nhiệm vụ được thương mại hóa.',
    conditions: [
      FROM_LAW_109,
      'Là thu nhập từ quyền tác giả của nhiệm vụ khoa học, công nghệ và đổi mới sáng tạo',
      'Kết quả nhiệm vụ được thương mại hóa theo pháp luật về khoa học, công nghệ và đổi mới sáng tạo, sở hữu trí tuệ',
    ],
    requiredDocuments: ['Tài liệu về nhiệm vụ và quyền tác giả', 'Hợp đồng, chứng từ thương mại hóa kết quả nhiệm vụ'],
    effectiveFrom: LAW_109_EFFECTIVE,
    isNew2026: true,
    legalReference: `Khoản 18 Điều 4 ${LAW}; Điều 36 ${DECREE}`,
  },
  {
    id: 'startup_investment',
    name: 'Khởi nghiệp sáng tạo, quỹ đầu tư mạo hiểm',
    description:
      'Thu nhập từ đầu tư vốn của nhà đầu tư cá nhân vào dự án khởi nghiệp sáng tạo, của sáng lập viên doanh nghiệp khởi nghiệp sáng tạo, của nhà đầu tư cá nhân góp vốn vào quỹ đầu tư mạo hiểm; tiền lương của chuyên gia hỗ trợ khởi nghiệp sáng tạo.',
    conditions: [
      'Thu nhập phát sinh từ ngày 01/7/2026 (riêng tiền lương chuyên gia: được trả từ ngày 01/01/2026)',
      'Dự án, doanh nghiệp khởi nghiệp sáng tạo hoặc quỹ đầu tư mạo hiểm được xác định theo pháp luật về khoa học, công nghệ và đổi mới sáng tạo',
    ],
    anyOf: [
      'Thu nhập từ đầu tư vốn vào dự án khởi nghiệp sáng tạo',
      'Thu nhập từ đầu tư vốn của sáng lập viên doanh nghiệp khởi nghiệp sáng tạo',
      'Thu nhập từ góp vốn vào quỹ đầu tư mạo hiểm',
      'Tiền lương của chuyên gia hỗ trợ khởi nghiệp sáng tạo từ dự án, doanh nghiệp khởi nghiệp sáng tạo',
    ],
    requiredDocuments: [
      'Giấy tờ xác nhận dự án, doanh nghiệp khởi nghiệp sáng tạo hoặc quỹ đầu tư mạo hiểm',
      'Hợp đồng góp vốn hoặc hợp đồng chuyên gia',
      'Chứng từ nhận thu nhập',
    ],
    effectiveFrom: SALARY_RULES_2026,
    isNew2026: true,
    legalReference: `Khoản 19 Điều 4 ${LAW}; Điều 37 ${DECREE}`,
  },
  {
    id: 'international_org_staff',
    name: 'Chuyên gia ODA, nhân viên tổ chức Liên hợp quốc',
    description:
      'Tiền lương, tiền công của chuyên gia nước ngoài làm việc tại chương trình, dự án ODA không hoàn lại hoặc dự án phi chính phủ nước ngoài; người Việt Nam làm việc tại cơ quan đại diện tổ chức quốc tế thuộc hệ thống Liên hợp quốc tại Việt Nam; người tham gia lực lượng gìn giữ hòa bình của Liên hợp quốc.',
    conditions: ['Tiền lương, tiền công được trả từ ngày 01/01/2026 (cá nhân không cư trú: từ ngày 01/7/2026)'],
    anyOf: [
      'Chuyên gia nước ngoài (không có quốc tịch Việt Nam) làm việc tại chương trình, dự án ODA không hoàn lại',
      'Chuyên gia nước ngoài làm việc tại chương trình, dự án viện trợ phi chính phủ nước ngoài (không thuộc ODA)',
      'Người Việt Nam làm việc theo hợp đồng tại cơ quan đại diện tổ chức quốc tế thuộc hệ thống Liên hợp quốc tại Việt Nam (không gồm làm việc theo giờ)',
      'Người được cử tham gia lực lượng gìn giữ hòa bình của Liên hợp quốc',
    ],
    requiredDocuments: [
      'Hợp đồng, văn bản tuyển chọn chuyên gia hoặc quyết định cử đi làm nhiệm vụ',
      'Văn kiện chương trình, dự án được phê duyệt (với chuyên gia dự án)',
    ],
    effectiveFrom: SALARY_RULES_2026,
    isNew2026: true,
    legalReference: `Khoản 20 Điều 4 ${LAW}; Điều 38 ${DECREE}`,
  },
  {
    id: 'business_owner_profit',
    name: 'Chủ DNTN, chủ công ty TNHH một thành viên',
    description:
      'Thu nhập của chủ doanh nghiệp tư nhân, cá nhân là chủ công ty TNHH một thành viên thành lập theo pháp luật Việt Nam nhận được sau khi doanh nghiệp đã hoàn thành nghĩa vụ thuế thu nhập doanh nghiệp.',
    conditions: [
      FROM_LAW_109,
      'Là chủ doanh nghiệp tư nhân hoặc cá nhân làm chủ công ty TNHH một thành viên',
      'Doanh nghiệp đã hoàn thành nghĩa vụ thuế thu nhập doanh nghiệp',
    ],
    requiredDocuments: [
      'Giấy chứng nhận đăng ký doanh nghiệp',
      'Báo cáo tài chính, chứng từ nộp thuế thu nhập doanh nghiệp',
      'Quyết định phân phối lợi nhuận',
    ],
    effectiveFrom: LAW_109_EFFECTIVE,
    isNew2026: true,
    legalReference: `Khoản 21 Điều 4 ${LAW}; Điều 39 ${DECREE}`,
  },

  // ===== LUẬT THUẾ TNCN ĐIỀU 5 (miễn thuế khác) =====
  {
    id: 'digital_tech_talent',
    name: 'Nhân lực công nghiệp công nghệ số (miễn 05 năm)',
    description:
      'Miễn thuế trong 05 năm (tính liên tục từ tháng phát sinh thu nhập được miễn) đối với tiền lương, tiền công của nhân lực công nghiệp công nghệ số chất lượng cao, chỉ trong 3 nhóm hoạt động dưới đây. Có thêm tiền lương khác thì số thuế được miễn tính theo tỷ lệ thu nhập được miễn.',
    conditions: [
      FROM_SALARY_2026,
      'Là nhân lực công nghiệp công nghệ số chất lượng cao theo NĐ 353/2025/NĐ-CP',
      'Là tiền lương, tiền công và còn trong thời hạn 05 năm được miễn',
    ],
    anyOf: [
      'Dự án hoạt động công nghiệp công nghệ số trong khu công nghệ số tập trung',
      'Dự án nghiên cứu và phát triển, sản xuất sản phẩm công nghệ số trọng điểm, chip bán dẫn, hệ thống trí tuệ nhân tạo',
      'Hoạt động đào tạo nhân lực công nghiệp công nghệ số',
    ],
    requiredDocuments: [
      'Tài liệu xác định nhân lực công nghiệp công nghệ số chất lượng cao',
      'Hợp đồng lao động, tài liệu về dự án hoặc hoạt động',
    ],
    effectiveFrom: SALARY_RULES_2026,
    isNew2026: true,
    legalReference: `Khoản 2 Điều 5 ${LAW}; Điều 41 ${DECREE}`,
  },
  {
    id: 'high_tech_income',
    name: 'Nhân lực công nghệ cao (miễn 05 năm)',
    description:
      'Miễn thuế trong 05 năm đối với tiền lương, tiền công của nhân lực công nghệ cao thực hiện nghiên cứu và phát triển công nghệ cao, công nghệ chiến lược thuộc Danh mục theo pháp luật về công nghệ cao. Chỉ miễn tiền lương, tiền công; có thêm tiền lương khác thì số thuế được miễn tính theo tỷ lệ thu nhập được miễn.',
    conditions: [
      FROM_SALARY_2026,
      'Là nhân lực công nghệ cao theo Luật Công nghệ cao',
      'Là tiền lương, tiền công từ hoạt động nghiên cứu và phát triển thuộc Danh mục công nghệ cao được ưu tiên đầu tư phát triển, Danh mục sản phẩm công nghệ cao được khuyến khích phát triển hoặc Danh mục công nghệ, sản phẩm công nghệ chiến lược',
      'Còn trong thời hạn 05 năm được miễn (tính liên tục từ tháng phát sinh thu nhập được miễn)',
    ],
    requiredDocuments: [
      'Tài liệu xác định nhân lực công nghệ cao',
      'Tài liệu chứng minh hoạt động nghiên cứu, phát triển thuộc Danh mục',
      'Hợp đồng lao động',
    ],
    effectiveFrom: SALARY_RULES_2026,
    isNew2026: true,
    legalReference: `Khoản 3 Điều 5 ${LAW}; Điều 42 ${DECREE}`,
  },
  {
    id: 'open_fund_certificates',
    name: 'Chứng chỉ quỹ mở nắm giữ từ 02 năm',
    description:
      'Thu nhập từ chuyển nhượng chứng chỉ quỹ mở đã nắm giữ đủ 02 năm trở lên kể từ ngày mua, kể cả chứng chỉ quỹ mua trước 01/7/2026. Mua nhiều đợt thì chứng chỉ quỹ mua trước được tính bán trước. Nắm giữ dưới 02 năm chịu thuế 0,1% giá chuyển nhượng.',
    conditions: [
      'Chuyển nhượng từ ngày 01/7/2026',
      'Là chứng chỉ quỹ mở thành lập theo pháp luật về chứng khoán',
      'Tại thời điểm bán đã nắm giữ đủ 02 năm trở lên kể từ ngày mua',
    ],
    requiredDocuments: ['Sao kê, xác nhận giao dịch chứng chỉ quỹ thể hiện ngày mua, ngày bán'],
    effectiveFrom: LAW_109_EFFECTIVE,
    isNew2026: true,
    legalReference: `Khoản 4 Điều 5 ${LAW}; Điều 43 ${DECREE}`,
  },

  // ===== KHÔNG TÍNH VÀO THU NHẬP CHỊU THUẾ (Luật Điều 3 khoản 2 điểm c; NĐ 253 Điều 8 khoản 3) =====
  {
    id: 'severance_pay',
    name: 'Trợ cấp thôi việc, mất việc làm, thất nghiệp',
    description:
      'Không tính vào thu nhập chịu thuế: trợ cấp thôi việc, trợ cấp mất việc làm (kể cả phần doanh nghiệp chi cao hơn mức luật định nếu có trong quy chế tài chính, quy chế nội bộ, hợp đồng lao động hoặc thỏa ước lao động), trợ cấp thất nghiệp, trợ cấp khó khăn đột xuất.',
    conditions: [],
    anyOf: [
      'Trợ cấp thôi việc, trợ cấp mất việc làm (kể cả phần cao hơn luật nếu có trong quy chế, hợp đồng lao động, thỏa ước lao động)',
      'Trợ cấp thất nghiệp',
      'Trợ cấp khó khăn đột xuất',
    ],
    requiredDocuments: [
      'Quyết định chấm dứt hợp đồng lao động hoặc quyết định hưởng trợ cấp',
      'Quy chế tài chính, hợp đồng lao động hoặc thỏa ước lao động (nếu chi cao hơn luật)',
      'Chứng từ chi trả',
    ],
    isNew2026: false,
    legalReference: `Điểm c khoản 2 Điều 3 ${LAW}; điểm h khoản 3 Điều 8 ${DECREE}`,
  },
  {
    id: 'hazard_allowance',
    name: 'Phụ cấp độc hại, nguy hiểm',
    description:
      'Không tính vào thu nhập chịu thuế: phụ cấp độc hại, nguy hiểm, bồi dưỡng bằng hiện vật đối với ngành, nghề hoặc công việc ở nơi làm việc có yếu tố độc hại, nguy hiểm, theo mức cơ quan nhà nước có thẩm quyền quy định. Phần nhận cao hơn mức quy định tính vào thu nhập chịu thuế.',
    conditions: [
      'Ngành, nghề hoặc công việc ở nơi làm việc có yếu tố độc hại, nguy hiểm theo quy định',
      'Khoản phụ cấp, bồi dưỡng được cơ quan nhà nước có thẩm quyền quy định',
    ],
    excessLabel: 'Phần vượt mức phụ cấp theo quy định (VNĐ, nếu có)',
    requiredDocuments: ['Tài liệu xác định ngành, nghề, công việc độc hại, nguy hiểm', 'Bảng lương thể hiện khoản phụ cấp'],
    isNew2026: false,
    legalReference: `Điểm c khoản 2 Điều 3 ${LAW}; điểm d khoản 3 Điều 8 ${DECREE}`,
  },
  {
    id: 'social_insurance_benefits',
    name: 'Trợ cấp bảo hiểm xã hội',
    description:
      'Không tính vào thu nhập chịu thuế: trợ cấp tai nạn lao động, bệnh nghề nghiệp, trợ cấp một lần khi sinh con hoặc nhận nuôi con nuôi, trợ cấp do suy giảm khả năng lao động, trợ cấp hưu trí một lần, trợ cấp tuất hàng tháng và các khoản trợ cấp khác theo pháp luật về bảo hiểm xã hội.',
    conditions: ['Là khoản trợ cấp theo quy định của pháp luật về bảo hiểm xã hội'],
    requiredDocuments: ['Quyết định hưởng chế độ bảo hiểm xã hội', 'Chứng từ chi trả của cơ quan bảo hiểm xã hội hoặc đơn vị'],
    isNew2026: false,
    legalReference: `Điểm c khoản 2 Điều 3 ${LAW}; điểm g khoản 3 Điều 8 ${DECREE}`,
  },
];

export function getExemptionRule(category: ExemptionCategory): ExemptionRule | undefined {
  return EXEMPTION_RULES.find((r) => r.id === category);
}

export function getNew2026Exemptions(): ExemptionRule[] {
  return EXEMPTION_RULES.filter((r) => r.isNew2026);
}

export function getOriginalExemptions(): ExemptionRule[] {
  return EXEMPTION_RULES.filter((r) => !r.isNew2026);
}

/**
 * Kiểm tra điều kiện miễn thuế.
 * - `conditions`: phải đáp ứng tất cả; `anyOf`: chỉ cần thuộc một trường hợp.
 * - Rule có mức luật định (`excessLabel`): phần vượt mức tính vào thu nhập chịu thuế.
 */
export function checkExemption(
  input: ExemptionCheckInput,
  now: Date = new Date()
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

  if (rule.effectiveFrom && now < rule.effectiveFrom) {
    return {
      category: input.category,
      categoryName: rule.name,
      status: 'not_exempt',
      exemptAmount: 0,
      taxableAmount: input.incomeAmount,
      explanation: `Quy định này có hiệu lực từ ${formatDate(rule.effectiveFrom)}`,
      conditions: [...rule.conditions, ...(rule.anyOf ?? [])].map((c) => ({
        condition: c,
        met: false,
        note: 'Chưa có hiệu lực',
      })),
      requiredDocuments: rule.requiredDocuments,
      legalReference: rule.legalReference,
    };
  }

  const required = rule.conditions.map((_, i) => input.answers[`condition_${i}`] === true);
  const cases = (rule.anyOf ?? []).map((_, i) => input.answers[`case_${i}`] === true);
  const requiredMet = required.every(Boolean);
  const caseMet = cases.length === 0 || cases.some(Boolean);

  const conditionResults = [
    ...rule.conditions.map((condition, i) => ({
      condition,
      met: required[i],
      note: required[i] ? 'Đáp ứng điều kiện' : 'Cần xác nhận',
    })),
    ...(rule.anyOf ?? []).map((condition, i) => ({
      condition,
      met: cases[i],
      note: cases[i]
        ? 'Thuộc trường hợp này'
        : caseMet
          ? 'Không cần (đã thuộc trường hợp khác)'
          : 'Cần thuộc ít nhất một trường hợp',
    })),
  ];

  const income = Math.max(0, input.incomeAmount);
  let status: ExemptionStatus;
  let exemptAmount = 0;
  let explanation: string;

  if (requiredMet && caseMet) {
    const excess = rule.excessLabel ? Math.min(income, Math.max(0, input.excessAmount ?? 0)) : 0;
    exemptAmount = income - excess;
    if (excess === 0) {
      status = 'exempt';
      explanation = `Đủ điều kiện, không phải nộp thuế TNCN cho khoản này (${rule.legalReference}).`;
    } else if (exemptAmount > 0) {
      status = 'partial';
      explanation = `Phần trong mức luật định được miễn; phần vượt mức ${formatNumber(excess)} đ tính vào thu nhập chịu thuế (${rule.legalReference}).`;
    } else {
      status = 'not_exempt';
      explanation = 'Toàn bộ số tiền vượt mức luật định nên tính vào thu nhập chịu thuế.';
    }
  } else if (conditionResults.some((c) => c.met)) {
    status = 'needs_review';
    explanation = 'Cần xác nhận thêm các điều kiện còn lại';
  } else {
    status = 'not_exempt';
    explanation = 'Không đáp ứng điều kiện miễn thuế';
  }

  return {
    category: input.category,
    categoryName: rule.name,
    status,
    exemptAmount,
    taxableAmount: income - exemptAmount,
    explanation,
    conditions: conditionResults,
    requiredDocuments: rule.requiredDocuments,
    legalReference: rule.legalReference,
  };
}

export function searchExemptions(keyword: string): ExemptionRule[] {
  const lower = keyword.toLowerCase();
  return EXEMPTION_RULES.filter(
    (r) =>
      r.name.toLowerCase().includes(lower) ||
      r.description.toLowerCase().includes(lower) ||
      [...r.conditions, ...(r.anyOf ?? [])].some((c) => c.toLowerCase().includes(lower))
  );
}
