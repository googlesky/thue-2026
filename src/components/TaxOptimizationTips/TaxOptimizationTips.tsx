'use client';

import { useState, useMemo, memo } from 'react';
import {
  generateTaxOptimizationTips,
  TaxOptimizationInput,
  TaxTip,
  TipPriority,
  getPriorityClass,
  getPriorityLabel,
  getCategoryLabel,
} from '@/utils/taxOptimizationTips';
import { formatNumber } from '@/lib/taxCalculator';

// ===== TYPES =====

interface TaxOptimizationTipsProps {
  input: TaxOptimizationInput;
}

// ===== ICONS =====

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  );
}

function PiggyBankIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function FileCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function ShieldAlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function StackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

// ===== ICON MAPPING =====

function getTipIcon(icon?: string): React.FC<{ className?: string }> {
  const iconMap: Record<string, React.FC<{ className?: string }>> = {
    users: UsersIcon,
    'user-plus': UserPlusIcon,
    'piggy-bank': PiggyBankIcon,
    calendar: CalendarIcon,
    heart: HeartIcon,
    'file-check': FileCheckIcon,
    building: BuildingIcon,
    shield: ShieldIcon,
    'shield-alert': ShieldAlertIcon,
    receipt: ReceiptIcon,
    info: InfoIcon,
    stack: StackIcon,
    'trending-up': TrendingUpIcon,
    store: StoreIcon,
  };

  return iconMap[icon || 'info'] || InfoIcon;
}

// ===== PRIORITY DOT =====

function PriorityDot({ priority }: { priority: TipPriority }) {
  const colorClass =
    priority === 'critical'
      ? 'bg-rose-600 animate-pulse'
      : priority === 'high'
        ? 'bg-red-500'
        : priority === 'medium'
          ? 'bg-amber-500'
          : 'bg-blue-500';

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colorClass}`}
      aria-label={getPriorityLabel(priority)}
    />
  );
}

// ===== TIP CARD =====

interface TipCardProps {
  tip: TaxTip;
  isExpanded: boolean;
  onToggle: () => void;
}

const TipCard = memo(function TipCard({ tip, isExpanded, onToggle }: TipCardProps) {
  const IconComponent = getTipIcon(tip.icon);

  // Background and border classes based on priority
  const cardClasses =
    tip.priority === 'critical'
      ? 'bg-rose-50/90 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 ring-1 ring-rose-200 dark:ring-rose-900'
      : tip.priority === 'high'
        ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
        : tip.priority === 'medium'
          ? 'bg-yellow-50/60 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
          : 'bg-slate-50/60 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700';

  // Icon container classes based on priority
  const iconClasses =
    tip.priority === 'critical'
      ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400'
      : tip.priority === 'high'
        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
        : tip.priority === 'medium'
          ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';

  return (
    <div className={`rounded-lg border transition-all ${cardClasses}`}>
      <button
        onClick={onToggle}
        className="w-full p-3 sm:p-4 text-left flex items-start gap-2 sm:gap-3"
        aria-expanded={isExpanded}
      >
        <div
          className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${iconClasses}`}
        >
          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <PriorityDot priority={tip.priority} />
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base">
              {tip.title}
            </h4>
          </div>
          {!isExpanded && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {tip.description}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 sm:px-4 pb-4 pt-0">
          <div className="pl-0 sm:pl-[52px]">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{tip.description}</p>

            {(tip.potentialSavings || tip.potentialSavingsYearly) && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                  Tiết kiệm ước tính
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {tip.potentialSavings && (
                    <div className="text-green-700 dark:text-green-300">
                      <span className="font-bold text-lg">
                        {formatNumber(tip.potentialSavings)}
                      </span>
                      <span className="text-sm ml-1">VND/tháng</span>
                    </div>
                  )}
                  {tip.potentialSavingsYearly && (
                    <div className="text-green-600 dark:text-green-400 text-sm">
                      (~{formatNumber(tip.potentialSavingsYearly)} VND/năm)
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityClass(tip.priority)}`}
              >
                {getPriorityLabel(tip.priority)}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                {getCategoryLabel(tip.category)}
              </span>
              {tip.actionable && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
                  Có thể thực hiện ngay
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ===== MAIN COMPONENT =====

function TaxOptimizationTipsComponent({ input }: TaxOptimizationTipsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());

  // Generate tips based on input
  const tips = useMemo(() => generateTaxOptimizationTips(input), [input]);

  // Number of tips to show initially
  const INITIAL_TIP_COUNT = 3;

  // Tips to display
  const displayedTips = showAll ? tips : tips.slice(0, INITIAL_TIP_COUNT);
  const hasMoreTips = tips.length > INITIAL_TIP_COUNT;

  // Toggle individual tip expansion
  const toggleTip = (tipId: string) => {
    setExpandedTips((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tipId)) {
        newSet.delete(tipId);
      } else {
        newSet.add(tipId);
      }
      return newSet;
    });
  };

  // Don't render if no tips
  if (tips.length === 0) {
    return null;
  }

  // Count by priority
  const criticalCount = tips.filter((t) => t.priority === 'critical').length;
  const highPriorityCount = tips.filter((t) => t.priority === 'high').length;

  // Build priority summary text
  const getPrioritySummary = () => {
    if (criticalCount > 0) {
      return ` (${criticalCount} cần hành động ngay${highPriorityCount > 0 ? `, ${highPriorityCount} quan trọng` : ''})`;
    }
    if (highPriorityCount > 0) {
      return ` (${highPriorityCount} quan trọng)`;
    }
    return '';
  };

  return (
    <div className="card bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/10 border border-amber-100 dark:border-amber-900/50">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
              criticalCount > 0
                ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-200/50 dark:shadow-rose-900/50 animate-pulse'
                : 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-200/50 dark:shadow-amber-900/50'
            }`}
          >
            <LightbulbIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Gợi ý tối ưu thuế</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tips.length} gợi ý{getPrioritySummary()}
            </p>
          </div>
        </div>
        <div className="text-gray-400 dark:text-gray-500">
          {isCollapsed ? (
            <ChevronDownIcon className="w-6 h-6" />
          ) : (
            <ChevronUpIcon className="w-6 h-6" />
          )}
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="mt-4 space-y-3">
          {displayedTips.map((tip) => (
            <TipCard
              key={tip.id}
              tip={tip}
              isExpanded={expandedTips.has(tip.id)}
              onToggle={() => toggleTip(tip.id)}
            />
          ))}

          {/* Show more button */}
          {hasMoreTips && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2.5 px-4 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {showAll ? (
                <>
                  <ChevronUpIcon className="w-4 h-4" />
                  Ẩn bớt
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-4 h-4" />
                  Xem thêm {tips.length - INITIAL_TIP_COUNT} gợi ý
                </>
              )}
            </button>
          )}

          {/* Disclaimer */}
          <div className="pt-3 border-t border-amber-200/50 dark:border-amber-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center">
              Đây chỉ là gợi ý, vui lòng tham khảo chuyên gia thuế để được tư vấn cụ thể.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TaxOptimizationTipsComponent);
