'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import CalendarView from './CalendarView';
import DeadlineList from './DeadlineList';
import TaxReminders from './TaxReminders';
import ReminderBanner from './ReminderBanner';
import {
  TaxDeadline,
  TaxReminder,
  ApplicableTo,
  APPLICABLE_TO_LABELS,
  getUpcomingDeadlines,
  getDeadlinesForDate,
  getStoredReminders,
  saveReminders,
  getDaysUntilDeadline,
} from '@/utils/taxCalendarData';

type ViewMode = 'calendar' | 'list' | 'reminders';

export default function TaxCalendar() {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDeadlines, setSelectedDeadlines] = useState<TaxDeadline[]>([]);
  const [filter, setFilter] = useState<ApplicableTo>('all');
  const [reminders, setReminders] = useState<TaxReminder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load reminders from localStorage
  useEffect(() => {
    setReminders(getStoredReminders());
    setIsLoaded(true);
  }, []);

  // Save reminders to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      saveReminders(reminders);
    }
  }, [reminders, isLoaded]);

  // Handle month change
  const handleMonthChange = useCallback((year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setSelectedDate(null);
    setSelectedDeadlines([]);
  }, []);

  // Handle date selection
  const handleDateSelect = useCallback((date: Date, deadlines: TaxDeadline[]) => {
    setSelectedDate(date);
    setSelectedDeadlines(deadlines);
  }, []);

  // Toggle reminder for a deadline
  const handleToggleReminder = useCallback((deadlineId: string) => {
    setReminders(prev => {
      const existing = prev.find(r => r.deadlineId === deadlineId);
      if (existing) {
        // Toggle existing reminder
        return prev.map(r =>
          r.deadlineId === deadlineId ? { ...r, enabled: !r.enabled } : r
        );
      } else {
        // Add new reminder
        return [
          ...prev,
          {
            deadlineId,
            enabled: true,
            daysBefore: 7,
            addedAt: new Date().toISOString(),
          },
        ];
      }
    });
  }, []);

  // Remove reminder
  const handleRemoveReminder = useCallback((deadlineId: string) => {
    setReminders(prev => prev.filter(r => r.deadlineId !== deadlineId));
  }, []);

  // Update days before for a reminder
  const handleUpdateDaysBefore = useCallback((deadlineId: string, daysBefore: number) => {
    setReminders(prev =>
      prev.map(r =>
        r.deadlineId === deadlineId ? { ...r, daysBefore } : r
      )
    );
  }, []);

  // Get upcoming deadlines based on filter
  const upcomingDeadlines = useMemo(() => {
    return getUpcomingDeadlines(90, filter);
  }, [filter]);

  // Count active reminders
  const activeRemindersCount = useMemo(() => {
    return reminders.filter(r => r.enabled).length;
  }, [reminders]);

  // Get next critical deadline
  const nextCriticalDeadline = useMemo(() => {
    const criticalDeadlines = upcomingDeadlines.filter(d => d.priority === 'critical');
    if (criticalDeadlines.length === 0) return null;
    const deadline = criticalDeadlines[0];
    const daysUntil = getDaysUntilDeadline(deadline);
    return { deadline, daysUntil };
  }, [upcomingDeadlines]);

  // Format date for display
  const formatSelectedDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('vi-VN', options);
  };

  return (
    <div className="space-y-6">
      {/* Reminder Banner */}
      {isLoaded && (
        <ReminderBanner
          reminders={reminders}
          onNavigateToCalendar={() => setViewMode('reminders')}
          showCriticalDeadlines={true}
          criticalDaysThreshold={30}
        />
      )}

      {/* Header Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lịch thuế</h2>
              <p className="text-sm text-gray-500">Các mốc thời gian quan trọng về thuế</p>
            </div>
          </div>

          {/* Next Critical Deadline Preview */}
          {nextCriticalDeadline && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <div className="text-sm">
                <span className="text-red-700 font-medium">
                  {nextCriticalDeadline.daysUntil === 0
                    ? 'Hôm nay'
                    : nextCriticalDeadline.daysUntil === 1
                    ? 'Ngày mai'
                    : `Còn ${nextCriticalDeadline.daysUntil} ngày`}
                </span>
                <span className="text-red-600 mx-1">-</span>
                <span className="text-red-600 truncate max-w-[200px] inline-block align-bottom">
                  {nextCriticalDeadline.deadline.title}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              viewMode === 'calendar'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Lịch
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              viewMode === 'list'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Danh sách
          </button>
          <button
            onClick={() => setViewMode('reminders')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 relative ${
              viewMode === 'reminders'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Nhắc nhở
            {activeRemindersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {activeRemindersCount}
              </span>
            )}
          </button>

          {/* Filter (only show in list view) */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">Lọc:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as ApplicableTo)}
                className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {Object.entries(APPLICABLE_TO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-amber-800">
              <span className="font-medium">Lưu ý: </span>
              Vui lòng xác nhận lại với cơ quan thuế về các mốc thời gian chính xác.
              <a
                href="https://thuedientu.gdt.gov.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-amber-700 hover:text-amber-900 underline"
              >
                thuedientu.gdt.gov.vn
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <CalendarView
              year={currentYear}
              month={currentMonth}
              onMonthChange={handleMonthChange}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
          </div>

          {/* Selected Date Details / Upcoming */}
          <div className="lg:col-span-1">
            {selectedDate && selectedDeadlines.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {formatSelectedDate(selectedDate)}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {selectedDeadlines.length} sự kiện
                </p>
                <DeadlineList
                  deadlines={selectedDeadlines}
                  reminders={reminders}
                  onToggleReminder={handleToggleReminder}
                  title=""
                  showDaysUntil={true}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Sắp tới</h3>
                <DeadlineList
                  deadlines={upcomingDeadlines.slice(0, 5)}
                  reminders={reminders}
                  onToggleReminder={handleToggleReminder}
                  title=""
                  showDaysUntil={true}
                  emptyMessage="Không có mốc thời gian nào trong 90 ngày tới"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card">
          <DeadlineList
            deadlines={upcomingDeadlines}
            reminders={reminders}
            onToggleReminder={handleToggleReminder}
            title={`Các mốc thời gian (${APPLICABLE_TO_LABELS[filter]})`}
            showDaysUntil={true}
            emptyMessage={`Không có mốc thời gian nào cho ${APPLICABLE_TO_LABELS[filter].toLowerCase()} trong 90 ngày tới`}
          />
        </div>
      )}

      {/* Reminders View */}
      {viewMode === 'reminders' && (
        <TaxReminders
          reminders={reminders}
          onRemoveReminder={handleRemoveReminder}
          onUpdateDaysBefore={handleUpdateDaysBefore}
        />
      )}

      {/* Quick Info Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <span className="text-lg">31/3</span>
            </div>
            <span className="font-medium text-gray-900">Quyết toán</span>
          </div>
          <p className="text-xs text-gray-500">Hạn quyết toán thuế TNCN năm trước</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-lg">20</span>
            </div>
            <span className="font-medium text-gray-900">Kê khai tháng</span>
          </div>
          <p className="text-xs text-gray-500">Hạn nộp tờ khai thuế hàng tháng</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-lg">31/12</span>
            </div>
            <span className="font-medium text-gray-900">Đăng ký NPT</span>
          </div>
          <p className="text-xs text-gray-500">Hạn đăng ký người phụ thuộc năm sau</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-lg">1/7</span>
            </div>
            <span className="font-medium text-gray-900">Luật mới 2026</span>
          </div>
          <p className="text-xs text-gray-500">Ngày luật thuế TNCN mới có hiệu lực</p>
        </div>
      </div>

      {/* Official Links */}
      <div className="card bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-4">Liên kết hữu ích</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <a
            href="https://thuedientu.gdt.gov.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">Thuế điện tử</div>
              <div className="text-xs text-gray-500">thuedientu.gdt.gov.vn</div>
            </div>
          </a>

          <a
            href="https://www.gdt.gov.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">Tổng cục Thuế</div>
              <div className="text-xs text-gray-500">gdt.gov.vn</div>
            </div>
          </a>

          <a
            href="https://baohiemxahoi.gov.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">BHXH Việt Nam</div>
              <div className="text-xs text-gray-500">baohiemxahoi.gov.vn</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
