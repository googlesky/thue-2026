/**
 * Danh mục tab của bộ công cụ - module thuần (không 'use client')
 * để cả server component (trang chủ) lẫn client component dùng chung.
 */

export type TabType =
  | 'calculator'
  | 'gross-net'
  | 'overtime'
  | 'annual-settlement'
  | 'bonus-calculator'
  | 'esop-calculator'
  | 'foreigner-tax'
  | 'securities'
  | 'rental'
  | 'household-business'
  | 'real-estate'
  | 'employer-cost'
  | 'freelancer'
  | 'salary-compare'
  | 'yearly'
  | 'pension'
  | 'insurance'
  | 'other-income'
  | 'table'
  | 'tax-history'
  | 'tax-calendar'
  | 'salary-slip'
  | 'exemption-checker'
  | 'late-payment'
  | 'business-form'
  | 'severance'
  | 'tax-document'
  | 'vat'
  | 'withholding-tax'
  | 'multi-source-income'
  | 'tax-treaty'
  | 'couple-optimizer'
  | 'content-creator'
  | 'crypto-tax'
  | 'gold-tax'
  | 'special-income'
  | 'tax-deadline'
  | 'income-summary'
  | 'region-compare'
  | 'monthly-planner'
  | 'mua-nha';

export interface TabItem {
  id: TabType;
  label: string;
  description: string;
}

export interface TabGroup {
  id: string;
  label: string;
  tabs: TabItem[];
  gridCols?: 1 | 2;
}

// Tab descriptions for better UX - with proper Vietnamese diacritics
const TAB_DESCRIPTIONS: Record<TabType, string> = {
  calculator: 'Tính thuế nhanh chóng',
  'gross-net': 'Quy đổi lương nhanh',
  overtime: 'Tính thu nhập tăng ca',
  'annual-settlement': 'Quyết toán cuối năm',
  'bonus-calculator': 'Tính thuế thưởng',
  'esop-calculator': 'Thuế cổ phiếu ESOP',
  'foreigner-tax': 'Expatriate tax VN',
  securities: 'Thuế CK, cổ tức, TP',
  rental: 'Thuế cho thuê bất động sản',
  'household-business': 'Thuế hộ kinh doanh',
  'real-estate': 'Thuế chuyển nhượng BĐS',
  pension: 'Ước tính lương hưu',
  'salary-compare': 'So sánh các offer',
  yearly: 'Thuế qua các năm',
  freelancer: 'So sánh hình thức',
  'employer-cost': 'Chi phí thuê người',
  insurance: 'Chi tiết các khoản',
  'other-income': 'Các loại thu nhập',
  table: 'Tra cứu thuế suất',
  'tax-history': 'Thay đổi pháp luật',
  'tax-calendar': 'Mốc thời gian quan trọng',
  'salary-slip': 'Tạo phiếu lương',
  'exemption-checker': '21 khoản miễn thuế',
  'late-payment': 'Lãi 0.03%/ngày',
  'business-form': 'Lương vs Freelancer vs HKD',
  severance: 'Thôi việc, BHXH 1 lần',
  'tax-document': 'Báo cáo thuế TNCN',
  vat: 'Thuế GTGT doanh nghiệp',
  'withholding-tax': 'Thuế khấu trừ tại nguồn',
  'multi-source-income': 'Tổng hợp nhiều nguồn',
  'tax-treaty': 'Tra cứu hiệp định thuế',
  'couple-optimizer': 'Tối ưu thuế vợ chồng',
  'content-creator': 'YouTuber, TikToker, Affiliate',
  'crypto-tax': 'Bitcoin, Ethereum, NFT',
  'gold-tax': 'Thuế vàng miệng 0,1%',
  'special-income': 'Tên miền .vn, carbon, biển số xe',
  'tax-deadline': 'Quản lý deadline nộp thuế',
  'income-summary': 'Dashboard thu nhập năm',
  'region-compare': 'So sánh NET 4 vùng',
  'monthly-planner': 'Kế hoạch lương 12 tháng',
  'mua-nha': 'Trả góp, phí, khả năng vay',
};

export const TAB_GROUPS: TabGroup[] = [
  {
    id: 'calculate',
    label: 'Tính toán',
    gridCols: 2,
    tabs: [
      { id: 'calculator', label: 'Tính thuế TNCN', description: TAB_DESCRIPTIONS.calculator },
      { id: 'gross-net', label: 'GROSS ⇄ NET', description: TAB_DESCRIPTIONS['gross-net'] },
      { id: 'overtime', label: 'Lương tăng ca', description: TAB_DESCRIPTIONS.overtime },
      { id: 'annual-settlement', label: 'Quyết toán thuế', description: TAB_DESCRIPTIONS['annual-settlement'] },
      { id: 'bonus-calculator', label: 'Thưởng Tết', description: TAB_DESCRIPTIONS['bonus-calculator'] },
      { id: 'esop-calculator', label: 'ESOP', description: TAB_DESCRIPTIONS['esop-calculator'] },
      { id: 'foreigner-tax', label: 'Người nước ngoài', description: TAB_DESCRIPTIONS['foreigner-tax'] },
      { id: 'securities', label: 'Chứng khoán', description: TAB_DESCRIPTIONS.securities },
      { id: 'rental', label: 'Cho thuê nhà', description: TAB_DESCRIPTIONS.rental },
      { id: 'household-business', label: 'Hộ kinh doanh', description: TAB_DESCRIPTIONS['household-business'] },
      { id: 'vat', label: 'Thuế GTGT (VAT)', description: TAB_DESCRIPTIONS.vat },
      { id: 'withholding-tax', label: 'Khấu trừ tại nguồn', description: TAB_DESCRIPTIONS['withholding-tax'] },
      { id: 'multi-source-income', label: 'Đa nguồn thu nhập', description: TAB_DESCRIPTIONS['multi-source-income'] },
      { id: 'content-creator', label: 'Content Creator', description: TAB_DESCRIPTIONS['content-creator'] },
      { id: 'crypto-tax', label: 'Crypto/NFT', description: TAB_DESCRIPTIONS['crypto-tax'] },
      { id: 'gold-tax', label: 'Thuế vàng miệng', description: TAB_DESCRIPTIONS['gold-tax'] },
      { id: 'special-income', label: 'Thu nhập đặc biệt', description: TAB_DESCRIPTIONS['special-income'] },
      { id: 'income-summary', label: 'Tổng hợp thu nhập', description: TAB_DESCRIPTIONS['income-summary'] },
      { id: 'real-estate', label: 'Chuyển nhượng BĐS', description: TAB_DESCRIPTIONS['real-estate'] },
      { id: 'pension', label: 'Dự tính lương hưu', description: TAB_DESCRIPTIONS.pension },
      { id: 'severance', label: 'Trợ cấp thôi việc', description: TAB_DESCRIPTIONS.severance },
      { id: 'monthly-planner', label: 'Kế hoạch 12 tháng', description: TAB_DESCRIPTIONS['monthly-planner'] },
      { id: 'mua-nha', label: 'Vay mua nhà', description: TAB_DESCRIPTIONS['mua-nha'] },
    ],
  },
  {
    id: 'compare',
    label: 'So sánh',
    gridCols: 2,
    tabs: [
      { id: 'salary-compare', label: 'So sánh offer', description: TAB_DESCRIPTIONS['salary-compare'] },
      { id: 'yearly', label: 'So sánh năm', description: TAB_DESCRIPTIONS.yearly },
      { id: 'freelancer', label: 'Freelancer vs Fulltime', description: TAB_DESCRIPTIONS.freelancer },
      { id: 'business-form', label: 'Hình thức kinh doanh', description: TAB_DESCRIPTIONS['business-form'] },
      { id: 'employer-cost', label: 'Chi phí nhà tuyển dụng', description: TAB_DESCRIPTIONS['employer-cost'] },
      { id: 'couple-optimizer', label: 'Tối ưu vợ chồng', description: TAB_DESCRIPTIONS['couple-optimizer'] },
      { id: 'region-compare', label: 'So sánh vùng', description: TAB_DESCRIPTIONS['region-compare'] },
    ],
  },
  {
    id: 'reference',
    label: 'Tham khảo',
    gridCols: 2,
    tabs: [
      { id: 'insurance', label: 'Chi tiết bảo hiểm', description: TAB_DESCRIPTIONS.insurance },
      { id: 'other-income', label: 'Thu nhập khác', description: TAB_DESCRIPTIONS['other-income'] },
      { id: 'table', label: 'Biểu thuế suất', description: TAB_DESCRIPTIONS.table },
      { id: 'tax-history', label: 'Lịch sử luật', description: TAB_DESCRIPTIONS['tax-history'] },
      { id: 'tax-calendar', label: 'Lịch thuế', description: TAB_DESCRIPTIONS['tax-calendar'] },
      { id: 'salary-slip', label: 'Phiếu lương', description: TAB_DESCRIPTIONS['salary-slip'] },
      { id: 'tax-document', label: 'Báo cáo thuế', description: TAB_DESCRIPTIONS['tax-document'] },
      { id: 'exemption-checker', label: 'Miễn thuế TNCN', description: TAB_DESCRIPTIONS['exemption-checker'] },
      { id: 'late-payment', label: 'Lãi chậm nộp', description: TAB_DESCRIPTIONS['late-payment'] },
      { id: 'tax-deadline', label: 'Deadline thuế', description: TAB_DESCRIPTIONS['tax-deadline'] },
      { id: 'tax-treaty', label: 'Hiệp định thuế', description: TAB_DESCRIPTIONS['tax-treaty'] },
    ],
  },
];

// Find which group a tab belongs to
export function findTabGroup(tabId: TabType): TabGroup | undefined {
  return TAB_GROUPS.find((group) => group.tabs.some((t) => t.id === tabId));
}

// Get tab info
export function getTabInfo(tabId: TabType): TabItem | undefined {
  for (const group of TAB_GROUPS) {
    const tab = group.tabs.find((t) => t.id === tabId);
    if (tab) return tab;
  }
  return undefined;
}
