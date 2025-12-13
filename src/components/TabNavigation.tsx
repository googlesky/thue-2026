'use client';

import { useState, useRef, useEffect } from 'react';

export type TabType =
  | 'calculator'
  | 'gross-net'
  | 'overtime'
  | 'employer-cost'
  | 'freelancer'
  | 'salary-compare'
  | 'yearly'
  | 'insurance'
  | 'other-income'
  | 'table';

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
    ],
  },
];

// Get all tab IDs for a group
function getGroupTabIds(groupId: string): TabType[] {
  const group = TAB_GROUPS.find((g) => g.id === groupId);
  return group ? group.tabs.map((t) => t.id) : [];
}

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const handleTabClick = (tabId: TabType) => {
    onTabChange(tabId);
    setOpenDropdown(null);
  };

  const activeGroup = findTabGroup(activeTab);
  const activeTabInfo = getTabInfo(activeTab);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap justify-center gap-2 bg-gray-100 p-2 rounded-xl">
        {TAB_GROUPS.map((group) => {
          const isGroupActive = group.tabs.some((t) => t.id === activeTab);
          const isOpen = openDropdown === group.id;

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
                onClick={() => setOpenDropdown(isOpen ? null : group.id)}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isGroupActive
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{group.icon}</span>
                <span className="hidden sm:inline">{group.label}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-50">
                  {group.tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      {activeTab === tab.id && (
                        <svg
                          className="w-4 h-4 ml-auto text-primary-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
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

      {/* Current tab indicator */}
      {activeTabInfo && (
        <div className="text-center mt-3">
          <span className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
            <span>{activeTabInfo.icon}</span>
            <span>{activeTabInfo.label}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export { TAB_GROUPS, getTabInfo, findTabGroup };
