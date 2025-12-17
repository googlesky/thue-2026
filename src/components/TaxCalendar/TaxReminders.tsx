'use client';

import { memo, useMemo } from 'react';
import {
  TaxReminder,
  TAX_DEADLINES,
  getDaysUntilDeadline,
  formatDeadlineDate,
  PRIORITY_COLORS,
  CATEGORY_LABELS,
} from '@/utils/taxCalendarData';

interface TaxRemindersProps {
  reminders: TaxReminder[];
  onRemoveReminder: (deadlineId: string) => void;
  onUpdateDaysBefore: (deadlineId: string, daysBefore: number) => void;
}

const DAYS_BEFORE_OPTIONS = [
  { value: 1, label: '1 ngày trước' },
  { value: 3, label: '3 ngày trước' },
  { value: 7, label: '7 ngày trước' },
  { value: 14, label: '14 ngày trước' },
  { value: 30, label: '30 ngày trước' },
];

function TaxRemindersComponent({
  reminders,
  onRemoveReminder,
  onUpdateDaysBefore,
}: TaxRemindersProps) {
  // Get reminder details with deadline info
  const reminderDetails = useMemo(() => {
    return reminders
      .filter(r => r.enabled)
      .map(reminder => {
        const deadline = TAX_DEADLINES.find(d => d.id === reminder.deadlineId);
        if (!deadline) return null;

        const daysUntil = getDaysUntilDeadline(deadline);

        return {
          reminder,
          deadline,
          daysUntil,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.daysUntil === null) return 1;
        if (b!.daysUntil === null) return -1;
        return a!.daysUntil - b!.daysUntil;
      }) as Array<{
        reminder: TaxReminder;
        deadline: (typeof TAX_DEADLINES)[number];
        daysUntil: number | null;
      }>;
  }, [reminders]);

  if (reminderDetails.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Nhắc nhở của bạn</h3>
            <p className="text-sm text-gray-500">Chưa có nhắc nhở nào được thiết lập</p>
          </div>
        </div>

        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm mb-2">Bạn chưa thiết lập nhắc nhở nào</p>
          <p className="text-gray-400 text-xs">
            Nhấn &quot;Nhắc tôi&quot; ở các mốc thời gian để thêm nhắc nhở
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Nhắc nhở của bạn</h3>
            <p className="text-sm text-gray-500">{reminderDetails.length} nhắc nhở đang hoạt động</p>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="divide-y divide-gray-100">
        {reminderDetails.map(({ reminder, deadline, daysUntil }) => {
          const priorityColors = PRIORITY_COLORS[deadline.priority];
          const isUrgent = daysUntil !== null && daysUntil <= reminder.daysBefore;

          return (
            <div
              key={reminder.deadlineId}
              className={`p-4 ${isUrgent ? 'bg-amber-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Priority Dot */}
                <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${priorityColors.dot}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {deadline.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                        <span className="text-gray-500">
                          {formatDeadlineDate(deadline)}
                        </span>
                        {daysUntil !== null && (
                          <span
                            className={`
                              px-1.5 py-0.5 rounded-full
                              ${daysUntil <= 7 ? 'bg-red-100 text-red-700' : ''}
                              ${daysUntil > 7 && daysUntil <= 30 ? 'bg-amber-100 text-amber-700' : ''}
                              ${daysUntil > 30 ? 'bg-gray-100 text-gray-600' : ''}
                            `}
                          >
                            {daysUntil === 0 ? 'Hôm nay!' : daysUntil === 1 ? 'Ngày mai!' : `Còn ${daysUntil} ngày`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => onRemoveReminder(reminder.deadlineId)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Xóa nhắc nhở"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Days Before Selector */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Nhắc trước:</span>
                    <select
                      value={reminder.daysBefore}
                      onChange={(e) => onUpdateDaysBefore(reminder.deadlineId, parseInt(e.target.value))}
                      className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {DAYS_BEFORE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Urgent Warning */}
                  {isUrgent && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Sắp đến hạn - đừng quên!
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Nhắc nhở được lưu trữ trên trình duyệt của bạn
        </p>
      </div>
    </div>
  );
}

export default memo(TaxRemindersComponent);
