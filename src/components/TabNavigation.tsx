'use client';

import { useState, useRef, useEffect } from 'react';

export type TabType =
  | 'calculator'
  | 'gross-net'
  | 'overtime'
  | 'annual-settlement'
  | 'bonus-calculator'
  | 'esop-calculator'
  | 'employer-cost'
  | 'freelancer'
  | 'salary-compare'
  | 'yearly'
  | 'pension'
  | 'insurance'
  | 'other-income'
  | 'table'
  | 'tax-history';

interface TabItem {
  id: TabType;
  label: string;
  icon: string;
}

interface TabGroup {
  id: string;
  label: string;
  icon: string;
  tabs: TabItem[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    id: 'calculate',
    label: 'Tính toán',
    icon: '🧮',
    tabs: [
      { id: 'calculator', label: 'Tính thuế TNCN', icon: '🧮' },
      { id: 'gross-net', label: 'GROSS ⇄ NET', icon: '💰' },
      { id: 'overtime', label: 'Lương tăng ca', icon: '⏰' },
      { id: 'annual-settlement', label: 'Quyết toán thuế', icon: '📋' },
      { id: 'bonus-calculator', label: 'Thưởng Tết', icon: '🎁' },
      { id: 'esop-calculator', label: 'ESOP', icon: '📈' },
      { id: 'pension', label: 'Dự tính lương hưu', icon: '🏖️' },
    ],
  },
  {
    id: 'compare',
    label: 'So sánh',
    icon: '📊',
    tabs: [
      { id: 'salary-compare', label: 'So sánh offer', icon: '📊' },
      { id: 'yearly', label: 'So sánh năm', icon: '📅' },
      { id: 'freelancer', label: 'Freelancer vs Fulltime', icon: '👤' },
      { id: 'employer-cost', label: 'Chi phí nhà tuyển dụng', icon: '🏢' },
    ],
  },
  {
    id: 'reference',
    label: 'Tham khảo',
    icon: '📚',
    tabs: [
      { id: 'insurance', label: 'Chi tiết bảo hiểm', icon: '🛡️' },
      { id: 'other-income', label: 'Thu nhập khác', icon: '💼' },
      { id: 'table', label: 'Biểu thuế suất', icon: '📈' },
      { id: 'tax-history', label: 'Lịch sử luật', icon: '📜' },
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

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && openDropdown) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openDropdown]);

  const handleTabClick = (tabId: TabType) => {
    onTabChange(tabId);
    setOpenDropdown(null);
  };

  const toggleDropdown = (groupId: string) => {
    setOpenDropdown(openDropdown === groupId ? null : groupId);
  };

  const activeTabInfo = getTabInfo(activeTab);

  return (
    <div className="mb-6">
      {/* Navigation bar */}
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap justify-center gap-1 sm:gap-2 bg-gray-100 p-1.5 sm:p-2 rounded-xl">
          {TAB_GROUPS.map((group, index) => {
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
                {/* Group button */}
                <button
                  onClick={() => toggleDropdown(group.id)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                    isGroupActive
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  <span className="text-base sm:text-lg">{group.icon}</span>
                  <span className="text-sm sm:text-base">
                    {/* On mobile: show active tab label if in this group, otherwise group label */}
                    <span className="sm:hidden">
                      {activeTabInGroup ? activeTabInGroup.label.split(' ')[0] : group.label}
                    </span>
                    <span className="hidden sm:inline">{group.label}</span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {isOpen && (
                  <div
                    className={`absolute top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 min-w-[220px] z-50 dropdown-animate
                      ${index === TAB_GROUPS.length - 1 ? 'right-0' : 'left-0 sm:left-1/2'}
                    `}
                    style={index !== TAB_GROUPS.length - 1 ? { marginLeft: 'calc(-110px)' } : undefined}
                    role="menu"
                  >
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {group.label}
                    </div>
                    {group.tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        role="menuitem"
                        className={`w-full px-3 py-2.5 text-left flex items-center gap-3 transition-all duration-150 ${
                          activeTab === tab.id
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-lg w-7 text-center">{tab.icon}</span>
                        <span className="flex-1 font-medium">{tab.label}</span>
                        {activeTab === tab.id && (
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
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb - shows group > tab on mobile */}
      <div className="flex justify-center mt-2 sm:hidden">
        {activeTabInfo && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>{findTabGroup(activeTab)?.icon}</span>
            <span>{findTabGroup(activeTab)?.label}</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-700 font-medium">{activeTabInfo.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export { TAB_GROUPS, getTabInfo, findTabGroup };
