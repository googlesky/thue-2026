'use client';

import { memo, useMemo } from 'react';
import {
  TaxDeadline,
  ApplicableTo,
  getDeadlinesForMonth,
  getDeadlinesForDate,
  PRIORITY_COLORS,
  CATEGORY_COLORS,
} from '@/utils/taxCalendarData';

interface CalendarViewProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onDateSelect?: (date: Date, deadlines: TaxDeadline[]) => void;
  selectedDate?: Date | null;
  filter?: ApplicableTo;
}

// Helper function to filter deadlines by applicableTo
function filterDeadlines(deadlines: TaxDeadline[], filter?: ApplicableTo): TaxDeadline[] {
  if (!filter || filter === 'all') return deadlines;
  return deadlines.filter(d => d.applicableTo === 'all' || d.applicableTo === filter);
}

// Vietnamese day names
const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  deadlines: TaxDeadline[];
}

function CalendarViewComponent({
  year,
  month,
  onMonthChange,
  onDateSelect,
  selectedDate,
  filter,
}: CalendarViewProps) {
  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: CalendarDay[] = [];

    // Previous month's trailing days
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 2, prevMonthLastDay - i);
      const rawDeadlines = getDeadlinesForDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        deadlines: filterDeadlines(rawDeadlines, filter),
      });
    }

    // Current month's days
    const monthDeadlines = getDeadlinesForMonth(year, month);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      // Filter deadlines for this specific day
      // Note: monthDeadlines already includes monthly recurring deadlines (month === 0) from getDeadlinesForMonth
      const dayDeadlines = monthDeadlines.filter(d => d.date.day === day);

      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        deadlines: filterDeadlines(dayDeadlines, filter),
      });
    }

    // Next month's leading days to fill the grid (6 rows x 7 days = 42 cells)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month, i);
      const rawDeadlines = getDeadlinesForDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        deadlines: filterDeadlines(rawDeadlines, filter),
      });
    }

    return days;
  }, [year, month, filter]);

  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    onMonthChange(today.getFullYear(), today.getMonth() + 1);
  };

  const handleDateClick = (day: CalendarDay) => {
    if (onDateSelect) {
      onDateSelect(day.date, day.deadlines);
    }
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Get the highest priority for a day
  const getHighestPriority = (deadlines: TaxDeadline[]): 'critical' | 'important' | 'normal' | null => {
    if (deadlines.length === 0) return null;
    if (deadlines.some(d => d.priority === 'critical')) return 'critical';
    if (deadlines.some(d => d.priority === 'important')) return 'important';
    return 'normal';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button
          onClick={handlePrevMonth}
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Tháng trước"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {MONTH_NAMES[month - 1]} {year}
          </h3>
          <button
            onClick={handleToday}
            className="text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition-colors"
          >
            Hôm nay
          </button>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Tháng sau"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_NAMES.map((day, index) => (
          <div
            key={day}
            className={`py-2 text-center text-xs font-medium ${
              index === 0 ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const priority = getHighestPriority(day.deadlines);
          const priorityColor = priority ? PRIORITY_COLORS[priority] : null;
          const isSelectedDay = isSelected(day.date);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              className={`
                relative p-1 sm:p-2 min-h-[48px] sm:min-h-[64px] border-b border-r border-gray-100
                transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500
                ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                ${isSelectedDay ? 'bg-primary-50 ring-2 ring-inset ring-primary-500' : ''}
                ${day.isToday && !isSelectedDay ? 'bg-blue-50' : ''}
                hover:bg-gray-100
              `}
              aria-label={`${day.date.getDate()} ${MONTH_NAMES[day.date.getMonth()]} ${day.date.getFullYear()}${
                day.deadlines.length > 0 ? `, ${day.deadlines.length} sự kiện` : ''
              }`}
            >
              {/* Date Number */}
              <span
                className={`
                  inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm rounded-full
                  ${day.isToday ? 'bg-primary-600 text-white font-bold' : ''}
                  ${!day.isToday && day.isCurrentMonth ? 'text-gray-900' : ''}
                  ${!day.isToday && !day.isCurrentMonth ? 'text-gray-400' : ''}
                  ${day.date.getDay() === 0 && !day.isToday ? 'text-red-500' : ''}
                `}
              >
                {day.date.getDate()}
              </span>

              {/* Deadline Indicators */}
              {day.deadlines.length > 0 && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                  {day.deadlines.slice(0, 3).map((deadline, idx) => (
                    <span
                      key={deadline.id + idx}
                      className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[deadline.priority].dot}`}
                      title={deadline.title}
                    />
                  ))}
                  {day.deadlines.length > 3 && (
                    <span className="text-[10px] text-gray-500 ml-0.5">+{day.deadlines.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 p-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS.critical.dot}`}></span>
          <span>Quan trọng</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS.important.dot}`}></span>
          <span>Cần lưu ý</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS.normal.dot}`}></span>
          <span>Bình thường</span>
        </div>
      </div>
    </div>
  );
}

export default memo(CalendarViewComponent);
