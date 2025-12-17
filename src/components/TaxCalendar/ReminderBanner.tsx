'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import {
  TaxReminder,
  TaxDeadline,
  getDueReminders,
  getCriticalDeadlinesWithinDays,
  getDaysUntilDeadline,
  getStoredReminders,
} from '@/utils/taxCalendarData';

interface ReminderBannerProps {
  reminders?: TaxReminder[];
  onNavigateToCalendar?: () => void;
  showCriticalDeadlines?: boolean;
  criticalDaysThreshold?: number;
}

interface BannerItem {
  type: 'reminder' | 'critical';
  deadline: TaxDeadline;
  daysUntil: number;
}

function ReminderBannerComponent({
  reminders,
  onNavigateToCalendar,
  showCriticalDeadlines = true,
  criticalDaysThreshold = 30,
}: ReminderBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [storedReminders, setStoredReminders] = useState<TaxReminder[]>([]);

  // Load reminders from localStorage if not provided
  useEffect(() => {
    if (!reminders) {
      setStoredReminders(getStoredReminders());
    }
  }, [reminders]);

  const activeReminders = reminders || storedReminders;

  // Get due reminders and critical deadlines
  const bannerItems = useMemo((): BannerItem[] => {
    const items: BannerItem[] = [];

    // Get due reminders (user-set reminders that are within their notification period)
    const dueReminders = getDueReminders(activeReminders);
    dueReminders.forEach(({ deadline, daysUntil }) => {
      items.push({ type: 'reminder', deadline, daysUntil });
    });

    // Get critical deadlines within threshold (if enabled)
    if (showCriticalDeadlines) {
      const criticalDeadlines = getCriticalDeadlinesWithinDays(criticalDaysThreshold);
      criticalDeadlines.forEach(({ deadline, daysUntil }) => {
        // Avoid duplicates if already added as a reminder
        if (!items.some(item => item.deadline.id === deadline.id)) {
          items.push({ type: 'critical', deadline, daysUntil });
        }
      });
    }

    // Sort by days until (most urgent first)
    items.sort((a, b) => a.daysUntil - b.daysUntil);

    return items;
  }, [activeReminders, showCriticalDeadlines, criticalDaysThreshold]);

  // Don't render if dismissed or no items
  if (isDismissed || bannerItems.length === 0) {
    return null;
  }

  // Get the most urgent item for display
  const mostUrgent = bannerItems[0];
  const isVeryUrgent = mostUrgent.daysUntil <= 7;
  const isToday = mostUrgent.daysUntil === 0;
  const isTomorrow = mostUrgent.daysUntil === 1;

  // Determine banner style based on urgency
  const bannerStyle = isVeryUrgent
    ? 'bg-gradient-to-r from-red-500 to-red-600'
    : 'bg-gradient-to-r from-amber-500 to-orange-500';

  return (
    <div className={`${bannerStyle} text-white shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Icon + Message */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Animated Bell Icon */}
            <div className={`flex-shrink-0 ${isVeryUrgent ? 'animate-bounce' : ''}`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>

            {/* Message */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
              <span className="font-semibold text-sm sm:text-base truncate">
                {isToday ? 'Hôm nay:' : isTomorrow ? 'Ngày mai:' : `Còn ${mostUrgent.daysUntil} ngày:`}
              </span>
              <span className="text-sm text-white/90 truncate">
                {mostUrgent.deadline.title}
              </span>
              {bannerItems.length > 1 && (
                <span className="text-xs text-white/75 flex-shrink-0">
                  +{bannerItems.length - 1} khác
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onNavigateToCalendar && (
              <button
                onClick={onNavigateToCalendar}
                className="px-3 py-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors whitespace-nowrap"
              >
                Xem lịch
              </button>
            )}
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Đóng thông báo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Additional urgent items (collapsed on mobile) */}
        {bannerItems.length > 1 && bannerItems.length <= 3 && (
          <div className="hidden sm:flex items-center gap-4 mt-2 pt-2 border-t border-white/20">
            {bannerItems.slice(1).map(item => (
              <div key={item.deadline.id} className="flex items-center gap-2 text-xs text-white/80">
                <span className="w-1.5 h-1.5 bg-white/60 rounded-full flex-shrink-0" />
                <span className="truncate">{item.deadline.title}</span>
                <span className="text-white/60 flex-shrink-0">
                  ({item.daysUntil === 0 ? 'Hôm nay' : `${item.daysUntil}d`})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Standalone version that manages its own state
export function StandaloneReminderBanner({
  onNavigateToCalendar,
  showCriticalDeadlines = true,
  criticalDaysThreshold = 30,
}: {
  onNavigateToCalendar?: () => void;
  showCriticalDeadlines?: boolean;
  criticalDaysThreshold?: number;
}) {
  const [reminders, setReminders] = useState<TaxReminder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load reminders from localStorage
    setReminders(getStoredReminders());
    setIsLoaded(true);
  }, []);

  // Don't render until loaded (prevents SSR mismatch)
  if (!isLoaded) {
    return null;
  }

  return (
    <ReminderBannerComponent
      reminders={reminders}
      onNavigateToCalendar={onNavigateToCalendar}
      showCriticalDeadlines={showCriticalDeadlines}
      criticalDaysThreshold={criticalDaysThreshold}
    />
  );
}

export default memo(ReminderBannerComponent);
