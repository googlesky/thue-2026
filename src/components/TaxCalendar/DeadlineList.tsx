'use client';

import { memo, useState, useCallback } from 'react';
import {
  TaxDeadline,
  TaxReminder,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  APPLICABLE_TO_LABELS,
  getDaysUntilDeadline,
  formatDeadlineDate,
  generateICSContent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  hasActiveReminder,
} from '@/utils/taxCalendarData';

interface DeadlineListProps {
  deadlines: TaxDeadline[];
  reminders: TaxReminder[];
  onToggleReminder: (deadlineId: string) => void;
  title?: string;
  showDaysUntil?: boolean;
  emptyMessage?: string;
}

interface DeadlineCardProps {
  deadline: TaxDeadline;
  hasReminder: boolean;
  onToggleReminder: () => void;
  showDaysUntil: boolean;
}

function DeadlineCard({ deadline, hasReminder, onToggleReminder, showDaysUntil }: DeadlineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const daysUntil = getDaysUntilDeadline(deadline);
  const categoryColors = CATEGORY_COLORS[deadline.category];
  const priorityColors = PRIORITY_COLORS[deadline.priority];

  const handleDownloadICS = useCallback(() => {
    const icsContent = generateICSContent(deadline);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${deadline.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [deadline]);

  const handleGoogleCalendar = useCallback(() => {
    window.open(generateGoogleCalendarUrl(deadline), '_blank', 'noopener,noreferrer');
    setShowExportMenu(false);
  }, [deadline]);

  const handleOutlookCalendar = useCallback(() => {
    window.open(generateOutlookCalendarUrl(deadline), '_blank', 'noopener,noreferrer');
    setShowExportMenu(false);
  }, [deadline]);

  return (
    <div
      className={`border rounded-xl ${categoryColors.border} ${categoryColors.bg} transition-all`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Priority Indicator */}
          <div className={`w-1 h-full min-h-[40px] rounded-full ${priorityColors.dot}`} />

          <div className="flex-1 min-w-0">
            {/* Top Row: Title + Days Until */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2">
                {deadline.title}
              </h4>

              {showDaysUntil && daysUntil !== null && (
                <span
                  className={`
                    flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                    ${daysUntil <= 7 ? 'bg-red-100 text-red-700' : ''}
                    ${daysUntil > 7 && daysUntil <= 30 ? 'bg-amber-100 text-amber-700' : ''}
                    ${daysUntil > 30 ? 'bg-gray-100 text-gray-600' : ''}
                  `}
                >
                  {daysUntil === 0 ? 'Hôm nay' : daysUntil === 1 ? 'Ngày mai' : `${daysUntil} ngày`}
                </span>
              )}
            </div>

            {/* Date + Category + Priority Tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-600">
                {formatDeadlineDate(deadline)}
              </span>
              <span className={`px-2 py-0.5 rounded-full ${categoryColors.bg} ${categoryColors.text} border ${categoryColors.border}`}>
                {CATEGORY_LABELS[deadline.category]}
              </span>
              <span className={`px-2 py-0.5 rounded-full ${priorityColors.badge}`}>
                {PRIORITY_LABELS[deadline.priority]}
              </span>
              {deadline.applicableTo !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {APPLICABLE_TO_LABELS[deadline.applicableTo]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Description */}
        <div className="mt-3 ml-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                Thu gọn
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Xem chi tiết
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 text-sm text-gray-600 leading-relaxed">
              <p>{deadline.description}</p>
              {deadline.officialLink && (
                <a
                  href={deadline.officialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-primary-600 hover:text-primary-700 hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Trang thuế điện tử
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/50 border-t border-gray-200/50 rounded-b-xl">
        {/* Reminder Toggle */}
        <button
          onClick={onToggleReminder}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${hasReminder
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
          aria-label={hasReminder ? 'Tắt nhắc nhở' : 'Bật nhắc nhở'}
        >
          {hasReminder ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              Đã nhắc
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Nhắc tôi
            </>
          )}
        </button>

        {/* Export to Calendar - Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Thêm vào lịch"
            aria-expanded={showExportMenu}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Thêm vào lịch
            <svg className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExportMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowExportMenu(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={handleGoogleCalendar}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.5 22h-15A2.5 2.5 0 012 19.5v-15A2.5 2.5 0 014.5 2h15A2.5 2.5 0 0122 4.5v15a2.5 2.5 0 01-2.5 2.5zM4.5 4a.5.5 0 00-.5.5v15a.5.5 0 00.5.5h15a.5.5 0 00.5-.5v-15a.5.5 0 00-.5-.5h-15z" />
                    <path d="M8 10h8v8H8z" fill="#4285F4" />
                  </svg>
                  Google Calendar
                </button>
                <button
                  onClick={handleOutlookCalendar}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0078D4">
                    <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7.29-.3.7-.3h6.13V2.71q0-.47.33-.8.33-.33.8-.33h14.86q.47 0 .8.33.33.33.33.8v3.29h.01L24 12zm-6-8.95v.07V12h-.89l-.89-2.14h-.19l-.89 2.14h-.89V3.05h.89v5.38h.19l.7-1.7.2-.5.2.5.7 1.7h.19V3.05h.87zM7.13 5h.76q.34 0 .59.09.25.08.42.23.18.15.28.36.09.2.09.45 0 .36-.18.62-.17.27-.51.39v.02q.2.04.36.14.16.1.27.24.11.14.17.31.05.17.05.36 0 .26-.1.48-.1.21-.29.37-.18.16-.45.25-.26.08-.58.08h-1.48V5zm1.67 2.28q0-.14-.05-.24-.06-.1-.15-.17-.1-.07-.22-.1-.13-.03-.28-.03h-.74v1.14h.71q.16 0 .3-.04.14-.04.24-.12.1-.08.15-.2.04-.1.04-.24zm-.04-1.14q0-.25-.2-.4-.19-.14-.52-.14h-.68v1.13h.69q.36 0 .53-.14.18-.14.18-.45zM15 4.5v-.4l-2.5.4v.4L15 4.5z" />
                  </svg>
                  Outlook
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleDownloadICS}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Tải file .ics
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DeadlineListComponent({
  deadlines,
  reminders,
  onToggleReminder,
  title = 'Các mốc thời gian',
  showDaysUntil = true,
  emptyMessage = 'Không có mốc thời gian nào trong khoảng thời gian này',
}: DeadlineListProps) {
  if (deadlines.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="space-y-3">
        {deadlines.map(deadline => (
          <DeadlineCard
            key={deadline.id}
            deadline={deadline}
            hasReminder={hasActiveReminder(deadline.id, reminders)}
            onToggleReminder={() => onToggleReminder(deadline.id)}
            showDaysUntil={showDaysUntil}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(DeadlineListComponent);
