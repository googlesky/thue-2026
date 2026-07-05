'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';

import {
  TAB_GROUPS,
  findTabGroup,
  getTabInfo,
  type TabType,
  type TabGroup,
} from '@/lib/tabCatalog';

export type { TabType, TabItem, TabGroup } from '@/lib/tabCatalog';

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
          className="inline-flex flex-wrap justify-center gap-1.5 sm:gap-2 bg-white p-1.5 rounded-xl border border-line"
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
                    group relative px-4 sm:px-5 py-2.5 min-h-[44px]
                    rounded-lg font-medium transition-colors duration-200
                    flex items-center gap-2
                    ${isGroupActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-transparent text-primary-500 hover:bg-primary-50 hover:text-primary-700'
                    }
                    ${isOpen && !isGroupActive ? 'bg-primary-50 text-primary-700' : ''}
                  `}
                >
                  <span className="text-sm sm:text-[15px] font-semibold">
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
                      <div className="flex items-center justify-between px-5 pb-3 border-b border-line">
                        <span className="text-lg font-bold text-primary-700">
                          {group.label}
                        </span>
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
                                relative w-full px-3 py-3.5 min-h-[56px]
                                text-left flex flex-col justify-center gap-0.5
                                rounded-lg border transition-colors duration-150
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
                                ${activeTab === tab.id
                                  ? 'bg-primary-600 border-primary-600 text-white'
                                  : 'bg-white border-line text-primary-600 hover:border-primary-300 active:bg-primary-50'
                                }
                              `}
                            >
                              <span className={`
                                text-[13px] font-semibold leading-tight
                                ${activeTab === tab.id ? 'text-white' : 'text-primary-700'}
                              `}>
                                {tab.label}
                              </span>
                              <span className={`
                                text-[11px] leading-tight
                                ${activeTab === tab.id ? 'text-white/70' : 'text-primary-300'}
                              `}>
                                {tab.description}
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
                      bg-white rounded-xl shadow-lg
                      border border-line
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
                    <div className="px-2 pb-2.5 mb-2 border-b border-line">
                      <span className="eyebrow">{group.label}</span>
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
                            group/item relative w-full px-3 py-2.5 min-h-[52px]
                            text-left flex items-start gap-3
                            rounded-lg transition-colors duration-150
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1
                            ${activeTab === tab.id
                              ? 'bg-primary-50 text-primary-700 border border-primary-200'
                              : 'text-primary-600 hover:bg-primary-50/60 border border-transparent'
                            }
                          `}
                        >
                          {/* Label and description */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <span className={`
                              block font-semibold text-sm leading-tight
                              ${activeTab === tab.id ? 'text-primary-700' : 'text-primary-700'}
                            `}>
                              {tab.label}
                            </span>
                            <span className={`
                              block text-xs mt-0.5 leading-tight
                              ${activeTab === tab.id ? 'text-primary-400' : 'text-primary-300'}
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

      {/* Breadcrumb: nhóm / công cụ đang mở */}
      {activeTabInfo && (
        <div className="flex justify-center mt-3" aria-label="Breadcrumb">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-md border border-line text-xs">
            <span className="text-primary-400">{findTabGroup(activeTab)?.label}</span>
            <span className="text-line" aria-hidden>
              /
            </span>
            <span className="font-semibold text-primary-700" aria-current="page">
              {activeTabInfo.label}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}

// Memoize TabNavigation to prevent re-renders when parent state changes
const TabNavigation = memo(TabNavigationComponent);
export default TabNavigation;

export { TAB_GROUPS, getTabInfo, findTabGroup };
