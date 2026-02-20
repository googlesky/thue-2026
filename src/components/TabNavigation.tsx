'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';

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
  | 'tax-deadline'
  | 'income-summary'
  | 'region-compare'
  | 'monthly-planner'
  | 'mua-nha';

interface TabItem {
  id: TabType;
  label: string;
  icon: string;
  description: string;
}

interface TabGroup {
  id: string;
  label: string;
  icon: string;
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
  'tax-deadline': 'Quản lý deadline nộp thuế',
  'income-summary': 'Dashboard thu nhập năm',
  'region-compare': 'So sánh NET 4 vùng',
  'monthly-planner': 'Kế hoạch lương 12 tháng',
  'mua-nha': 'Trả góp, phí, khả năng vay',
};

const TAB_GROUPS: TabGroup[] = [
  {
    id: 'calculate',
    label: 'Tính toán',
    icon: '🧮',
    gridCols: 2,
    tabs: [
      { id: 'calculator', label: 'Tính thuế TNCN', icon: '🧮', description: TAB_DESCRIPTIONS.calculator },
      { id: 'gross-net', label: 'GROSS ⇄ NET', icon: '💰', description: TAB_DESCRIPTIONS['gross-net'] },
      { id: 'overtime', label: 'Lương tăng ca', icon: '⏰', description: TAB_DESCRIPTIONS.overtime },
      { id: 'annual-settlement', label: 'Quyết toán thuế', icon: '📋', description: TAB_DESCRIPTIONS['annual-settlement'] },
      { id: 'bonus-calculator', label: 'Thưởng Tết', icon: '🎁', description: TAB_DESCRIPTIONS['bonus-calculator'] },
      { id: 'esop-calculator', label: 'ESOP', icon: '📈', description: TAB_DESCRIPTIONS['esop-calculator'] },
      { id: 'foreigner-tax', label: 'Người nước ngoài', icon: '🌏', description: TAB_DESCRIPTIONS['foreigner-tax'] },
      { id: 'securities', label: 'Chứng khoán', icon: '📊', description: TAB_DESCRIPTIONS.securities },
      { id: 'rental', label: 'Cho thuê nhà', icon: '🏠', description: TAB_DESCRIPTIONS.rental },
      { id: 'household-business', label: 'Hộ kinh doanh', icon: '🏪', description: TAB_DESCRIPTIONS['household-business'] },
      { id: 'vat', label: 'Thuế GTGT (VAT)', icon: '📋', description: TAB_DESCRIPTIONS.vat },
      { id: 'withholding-tax', label: 'Khấu trừ tại nguồn', icon: '✂️', description: TAB_DESCRIPTIONS['withholding-tax'] },
      { id: 'multi-source-income', label: 'Đa nguồn thu nhập', icon: '📊', description: TAB_DESCRIPTIONS['multi-source-income'] },
      { id: 'content-creator', label: 'Content Creator', icon: '🎬', description: TAB_DESCRIPTIONS['content-creator'] },
      { id: 'crypto-tax', label: 'Crypto/NFT', icon: '₿', description: TAB_DESCRIPTIONS['crypto-tax'] },
      { id: 'income-summary', label: 'Tổng hợp thu nhập', icon: '📊', description: TAB_DESCRIPTIONS['income-summary'] },
      { id: 'real-estate', label: 'Chuyển nhượng BĐS', icon: '🏡', description: TAB_DESCRIPTIONS['real-estate'] },
      { id: 'pension', label: 'Dự tính lương hưu', icon: '🏖️', description: TAB_DESCRIPTIONS.pension },
      { id: 'severance', label: 'Trợ cấp thôi việc', icon: '💼', description: TAB_DESCRIPTIONS.severance },
      { id: 'monthly-planner', label: 'Kế hoạch 12 tháng', icon: '📅', description: TAB_DESCRIPTIONS['monthly-planner'] },
      { id: 'mua-nha', label: 'Vay mua nhà', icon: '🏠', description: TAB_DESCRIPTIONS['mua-nha'] },
    ],
  },
  {
    id: 'compare',
    label: 'So sánh',
    icon: '📊',
    gridCols: 2,
    tabs: [
      { id: 'salary-compare', label: 'So sánh offer', icon: '📊', description: TAB_DESCRIPTIONS['salary-compare'] },
      { id: 'yearly', label: 'So sánh năm', icon: '📅', description: TAB_DESCRIPTIONS.yearly },
      { id: 'freelancer', label: 'Freelancer vs Fulltime', icon: '👤', description: TAB_DESCRIPTIONS.freelancer },
      { id: 'business-form', label: 'Hình thức kinh doanh', icon: '⚖️', description: TAB_DESCRIPTIONS['business-form'] },
      { id: 'employer-cost', label: 'Chi phí nhà tuyển dụng', icon: '🏢', description: TAB_DESCRIPTIONS['employer-cost'] },
      { id: 'couple-optimizer', label: 'Tối ưu vợ chồng', icon: '💑', description: TAB_DESCRIPTIONS['couple-optimizer'] },
      { id: 'region-compare', label: 'So sánh vùng', icon: '📍', description: TAB_DESCRIPTIONS['region-compare'] },
    ],
  },
  {
    id: 'reference',
    label: 'Tham khảo',
    icon: '📚',
    gridCols: 2,
    tabs: [
      { id: 'insurance', label: 'Chi tiết bảo hiểm', icon: '🛡️', description: TAB_DESCRIPTIONS.insurance },
      { id: 'other-income', label: 'Thu nhập khác', icon: '💼', description: TAB_DESCRIPTIONS['other-income'] },
      { id: 'table', label: 'Biểu thuế suất', icon: '📈', description: TAB_DESCRIPTIONS.table },
      { id: 'tax-history', label: 'Lịch sử luật', icon: '📜', description: TAB_DESCRIPTIONS['tax-history'] },
      { id: 'tax-calendar', label: 'Lịch thuế', icon: '📅', description: TAB_DESCRIPTIONS['tax-calendar'] },
      { id: 'salary-slip', label: 'Phiếu lương', icon: '📋', description: TAB_DESCRIPTIONS['salary-slip'] },
      { id: 'tax-document', label: 'Báo cáo thuế', icon: '📄', description: TAB_DESCRIPTIONS['tax-document'] },
      { id: 'exemption-checker', label: 'Miễn thuế TNCN', icon: '✅', description: TAB_DESCRIPTIONS['exemption-checker'] },
      { id: 'late-payment', label: 'Lãi chậm nộp', icon: '⏰', description: TAB_DESCRIPTIONS['late-payment'] },
      { id: 'tax-deadline', label: 'Deadline thuế', icon: '📅', description: TAB_DESCRIPTIONS['tax-deadline'] },
      { id: 'tax-treaty', label: 'Hiệp định thuế', icon: '🌐', description: TAB_DESCRIPTIONS['tax-treaty'] },
    ],
  },
];

// Find which group a tab belongs to
function findTabGroup(tabId: TabType): TabGroup | undefined {
  return TAB_GROUPS.find((group) => group.tabs.some((t) => t.id === tabId));
}

// Get tab info
function getTabInfo(tabId: TabType): TabItem | undefined {
  for (const group of TAB_GROUPS) {
    const tab = group.tabs.find((t) => t.id === tabId);
    if (tab) return tab;
  }
  return undefined;
}

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function TabNavigationComponent({ activeTab, onTabChange }: TabNavigationProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [dropdownTop, setDropdownTop] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Track mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get current dropdown tabs
  const getCurrentDropdownTabs = useCallback(() => {
    if (!openDropdown) return [];
    const group = TAB_GROUPS.find((g) => g.id === openDropdown);
    return group?.tabs || [];
  }, [openDropdown]);

  // Reset focus index when dropdown changes
  useEffect(() => {
    if (openDropdown) {
      setFocusedIndex(-1);
      menuItemRefs.current = [];
    }
  }, [openDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Keyboard navigation handler with grid support
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!openDropdown) return;

      const tabs = getCurrentDropdownTabs();
      const tabCount = tabs.length;
      const group = TAB_GROUPS.find((g) => g.id === openDropdown);
      const gridCols = group?.gridCols || 1;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setOpenDropdown(null);
          setFocusedIndex(-1);
          // Return focus to the button that opened the dropdown
          buttonRefs.current[openDropdown]?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev + gridCols < tabCount ? prev + gridCols : prev % gridCols;
            menuItemRefs.current[next]?.focus();
            return next;
          });
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev - gridCols >= 0 ? prev - gridCols : tabCount - gridCols + (prev % gridCols);
            const validNext = Math.min(next, tabCount - 1);
            menuItemRefs.current[validNext]?.focus();
            return validNext;
          });
          break;
        case 'ArrowRight':
          if (gridCols > 1) {
            event.preventDefault();
            setFocusedIndex((prev) => {
              const next = prev < tabCount - 1 ? prev + 1 : 0;
              menuItemRefs.current[next]?.focus();
              return next;
            });
          }
          break;
        case 'ArrowLeft':
          if (gridCols > 1) {
            event.preventDefault();
            setFocusedIndex((prev) => {
              const next = prev > 0 ? prev - 1 : tabCount - 1;
              menuItemRefs.current[next]?.focus();
              return next;
            });
          }
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          menuItemRefs.current[0]?.focus();
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(tabCount - 1);
          menuItemRefs.current[tabCount - 1]?.focus();
          break;
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0 && focusedIndex < tabCount) {
            event.preventDefault();
            handleTabClick(tabs[focusedIndex].id);
          }
          break;
      }
    },
    [openDropdown, focusedIndex, getCurrentDropdownTabs]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleTabClick = (tabId: TabType) => {
    onTabChange(tabId);
    setOpenDropdown(null);
  };

  const toggleDropdown = (groupId: string) => {
    if (openDropdown === groupId) {
      setOpenDropdown(null);
    } else {
      // Calculate dropdown position on mobile
      const button = buttonRefs.current[groupId];
      if (button && isMobile) {
        const rect = button.getBoundingClientRect();
        setDropdownTop(rect.bottom + 12);
      }
      setOpenDropdown(groupId);
    }
  };

  const activeTabInfo = getTabInfo(activeTab);

  return (
    <nav className="mb-6" aria-label="Công cụ tính thuế">
      {/* Navigation bar */}
      <div className="flex justify-center">
        <div
          className="inline-flex flex-wrap justify-center gap-1.5 sm:gap-3 bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-2.5 rounded-2xl shadow-sm border border-gray-200/50"
          role="menubar"
        >
          {TAB_GROUPS.map((group) => {
            const isGroupActive = group.tabs.some((t) => t.id === activeTab);
            const isOpen = openDropdown === group.id;
            const activeTabInGroup = group.tabs.find((t) => t.id === activeTab);

            return (
              <div
                key={group.id}
                className="relative"
                ref={(el) => {
                  dropdownRefs.current[group.id] = el;
                }}
              >
                {/* Group button with gradient accent for active state */}
                <button
                  ref={(el) => {
                    buttonRefs.current[group.id] = el;
                  }}
                  onClick={() => toggleDropdown(group.id)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  aria-label={`${group.label}, ${isGroupActive ? 'đang chọn' : 'chưa chọn'}`}
                  className={`
                    group relative px-3 sm:px-5 py-2.5 sm:py-3 min-h-[48px] sm:min-h-[52px]
                    rounded-xl font-medium transition-all duration-300 ease-out
                    flex items-center gap-2 sm:gap-2.5
                    ${isGroupActive
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-white/80 text-gray-600 hover:bg-white hover:shadow-md hover:text-gray-900 border border-gray-200/50'
                    }
                    ${isOpen ? 'ring-2 ring-primary-400 ring-offset-2' : ''}
                  `}
                >
                  <span className={`text-lg sm:text-xl transition-transform duration-300 ${isOpen ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {group.icon}
                  </span>
                  <span className="text-sm sm:text-base font-semibold">
                    <span className="sm:hidden">
                      {group.label}
                      {isGroupActive && (
                        <span className="ml-1 text-xs opacity-75">
                          ({group.tabs.findIndex(t => t.id === activeTab) + 1}/{group.tabs.length})
                        </span>
                      )}
                    </span>
                    <span className="hidden sm:inline">{group.label}</span>
                  </span>
                  <svg
                    className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Mobile: Bottom sheet style dropdown */}
                {isOpen && isMobile && (
                  <>
                    {/* Backdrop overlay */}
                    <div
                      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
                      onClick={() => setOpenDropdown(null)}
                      aria-hidden="true"
                    />
                    {/* Bottom sheet */}
                    <div
                      className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up"
                      style={{ maxHeight: '85vh' }}
                      role="menu"
                      aria-label={group.label}
                    >
                      {/* Handle bar */}
                      <div className="flex justify-center pt-3 pb-2">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                      </div>

                      {/* Header with close button */}
                      <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{group.icon}</span>
                          <span className="text-lg font-bold text-gray-800">
                            {group.label}
                          </span>
                        </div>
                        <button
                          onClick={() => setOpenDropdown(null)}
                          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                          aria-label="Đóng menu"
                        >
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Scrollable content */}
                      <div
                        className="overflow-y-auto overscroll-contain px-4 py-3"
                        style={{ maxHeight: 'calc(85vh - 100px)' }}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          {group.tabs.map((tab, tabIndex) => (
                            <button
                              key={tab.id}
                              ref={(el) => {
                                menuItemRefs.current[tabIndex] = el;
                              }}
                              onClick={() => handleTabClick(tab.id)}
                              role="menuitem"
                              tabIndex={isOpen ? 0 : -1}
                              aria-current={activeTab === tab.id ? 'page' : undefined}
                              className={`
                                relative w-full p-3 min-h-[80px]
                                text-left flex flex-col items-center justify-center gap-2
                                rounded-2xl transition-all duration-200 ease-out
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
                                ${activeTab === tab.id
                                  ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg'
                                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                                }
                              `}
                            >
                              <span className={`
                                w-12 h-12 flex items-center justify-center
                                rounded-xl text-2xl
                                ${activeTab === tab.id
                                  ? 'bg-white/20'
                                  : 'bg-white shadow-sm'
                                }
                              `}>
                                {tab.icon}
                              </span>
                              <span className={`
                                text-xs font-semibold text-center leading-tight
                                ${activeTab === tab.id ? 'text-white' : 'text-gray-800'}
                              `}>
                                {tab.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Safe area padding for devices with home indicator */}
                      <div style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }} />
                    </div>
                  </>
                )}

                {/* Desktop: Card-style dropdown menu */}
                {isOpen && !isMobile && (
                  <div
                    className={`
                      absolute top-full mt-3
                      left-1/2 -translate-x-1/2
                      bg-white rounded-2xl shadow-2xl shadow-gray-200/50
                      border border-gray-100
                      py-3 px-3
                      z-50
                      ${group.gridCols === 2 ? 'w-[420px]' : 'w-[260px]'}
                      max-w-[calc(100vw-2rem)]
                      dropdown-modern-animate
                    `}
                    role="menu"
                    aria-label={group.label}
                  >
                    {/* Dropdown header */}
                    <div className="px-2 pb-2.5 mb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{group.icon}</span>
                        <span className="text-sm font-bold text-gray-800 tracking-wide">
                          {group.label}
                        </span>
                      </div>
                    </div>

                    {/* Grid layout for menu items */}
                    <div className={`
                      ${group.gridCols === 2 ? 'grid grid-cols-2 gap-1.5' : 'flex flex-col gap-1'}
                    `}>
                      {group.tabs.map((tab, tabIndex) => (
                        <button
                          key={tab.id}
                          ref={(el) => {
                            menuItemRefs.current[tabIndex] = el;
                          }}
                          onClick={() => handleTabClick(tab.id)}
                          role="menuitem"
                          tabIndex={isOpen ? 0 : -1}
                          aria-current={activeTab === tab.id ? 'page' : undefined}
                          className={`
                            group/item relative w-full px-3 py-3 min-h-[60px]
                            text-left flex items-start gap-3
                            rounded-xl transition-all duration-200 ease-out
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1
                            ${activeTab === tab.id
                              ? 'bg-gradient-to-br from-primary-50 to-primary-100/50 text-primary-700 shadow-sm border border-primary-200/50'
                              : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-100'
                            }
                          `}
                        >
                          {/* Icon container with hover effect */}
                          <span className={`
                            flex-shrink-0 w-10 h-10 flex items-center justify-center
                            rounded-lg text-xl
                            transition-all duration-200
                            ${activeTab === tab.id
                              ? 'bg-primary-100 shadow-sm'
                              : 'bg-gray-100 group-hover/item:bg-gray-200 group-hover/item:scale-105'
                            }
                          `}>
                            {tab.icon}
                          </span>

                          {/* Label and description */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <span className={`
                              block font-semibold text-sm leading-tight
                              ${activeTab === tab.id ? 'text-primary-700' : 'text-gray-800'}
                            `}>
                              {tab.label}
                            </span>
                            <span className={`
                              block text-xs mt-0.5 leading-tight
                              ${activeTab === tab.id ? 'text-primary-600/70' : 'text-gray-500'}
                            `}>
                              {tab.description}
                            </span>
                          </div>

                          {/* Active indicator */}
                          {activeTab === tab.id && (
                            <span className="flex-shrink-0 self-center">
                              <svg
                                className="w-5 h-5 text-primary-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active tab indicator - desktop */}
      {activeTabInfo && (
        <div className="hidden md:flex justify-center mt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white rounded-full shadow-sm border border-gray-100 text-sm">
            <span>{activeTabInfo.icon}</span>
            <span className="font-semibold text-gray-800">{activeTabInfo.label}</span>
          </div>
        </div>
      )}

      {/* Enhanced breadcrumb - shows group > tab on mobile & tablet */}
      <div className="flex justify-center mt-3 md:hidden" aria-label="Breadcrumb">
        {activeTabInfo && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-100">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="text-base" aria-hidden="true">{findTabGroup(activeTab)?.icon}</span>
              <span className="font-medium">{findTabGroup(activeTab)?.label}</span>
            </span>
            <svg
              className="w-3.5 h-3.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="flex items-center gap-1.5">
              <span className="text-base" aria-hidden="true">{activeTabInfo.icon}</span>
              <span className="text-xs text-gray-800 font-semibold" aria-current="page">
                {activeTabInfo.label}
              </span>
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}

// Memoize TabNavigation to prevent re-renders when parent state changes
const TabNavigation = memo(TabNavigationComponent);
export default TabNavigation;

export { TAB_GROUPS, getTabInfo, findTabGroup };
