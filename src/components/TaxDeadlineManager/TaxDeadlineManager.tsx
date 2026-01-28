'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  DEADLINE_CONFIGS,
  calculateDeadlineManager,
  generateDeadlineId,
  getDaysUntilDeadline,
  getDaysText,
  formatDateVN,
  formatShortDate,
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  type DeadlineType,
  type TaxDeadline,
  type DeadlineStatus,
} from '@/lib/taxDeadlineManager';

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export default function TaxDeadlineManager() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [includePersonal, setIncludePersonal] = useState(true);
  const [includeBusiness, setIncludeBusiness] = useState(false);
  const [customDeadlines, setCustomDeadlines] = useState<TaxDeadline[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DeadlineStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'calendar'>('overview');

  // Form state for custom deadline
  const [formData, setFormData] = useState({
    type: 'custom' as DeadlineType,
    name: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: '',
  });

  // Calculate deadlines with completed status
  const result = useMemo(() => {
    const deadlinesWithCompleted = customDeadlines.map(d => ({
      ...d,
      completedAt: completedIds.has(d.id) ? new Date() : undefined,
    }));

    const input = {
      year,
      includePersonal,
      includeBusiness,
      customDeadlines: deadlinesWithCompleted,
    };

    const result = calculateDeadlineManager(input);

    // Apply completed status to standard deadlines too
    result.allDeadlines = result.allDeadlines.map(d => ({
      ...d,
      completedAt: completedIds.has(d.id) ? new Date() : d.completedAt,
      status: completedIds.has(d.id) ? 'completed' as DeadlineStatus : d.status,
    }));

    // Re-categorize after completion updates
    return {
      ...result,
      upcomingDeadlines: result.allDeadlines.filter(d => d.status === 'upcoming'),
      dueSoonDeadlines: result.allDeadlines.filter(d => d.status === 'due_soon'),
      overdueDeadlines: result.allDeadlines.filter(d => d.status === 'overdue'),
      completedDeadlines: result.allDeadlines.filter(d => d.status === 'completed'),
      summary: {
        total: result.allDeadlines.length,
        upcoming: result.allDeadlines.filter(d => d.status === 'upcoming').length,
        dueSoon: result.allDeadlines.filter(d => d.status === 'due_soon').length,
        overdue: result.allDeadlines.filter(d => d.status === 'overdue').length,
        completed: result.allDeadlines.filter(d => d.status === 'completed').length,
      },
    };
  }, [year, includePersonal, includeBusiness, customDeadlines, completedIds]);

  // Filtered deadlines
  const filteredDeadlines = useMemo(() => {
    if (filterStatus === 'all') return result.allDeadlines;
    return result.allDeadlines.filter(d => d.status === filterStatus);
  }, [result.allDeadlines, filterStatus]);

  // Toggle completion
  const toggleComplete = useCallback((id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Add custom deadline
  const addCustomDeadline = useCallback(() => {
    if (!formData.name || !formData.dueDate) return;

    const newDeadline: TaxDeadline = {
      id: generateDeadlineId(),
      type: formData.type,
      name: formData.name,
      description: formData.description || undefined,
      dueDate: new Date(formData.dueDate),
      reminderDays: [7, 3, 1],
      status: 'upcoming',
      priority: 'medium',
      amount: formData.amount || undefined,
      notes: formData.notes || undefined,
      isCustom: true,
    };

    setCustomDeadlines(prev => [...prev, newDeadline]);
    setShowAddForm(false);
    setFormData({
      type: 'custom',
      name: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      amount: 0,
      notes: '',
    });
  }, [formData]);

  // Remove custom deadline
  const removeCustomDeadline = useCallback((id: string) => {
    setCustomDeadlines(prev => prev.filter(d => d.id !== id));
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Status badge component
  const StatusBadge = ({ status }: { status: DeadlineStatus }) => {
    const colorClass = {
      overdue: 'bg-red-100 text-red-700 border-red-200',
      due_soon: 'bg-orange-100 text-orange-700 border-orange-200',
      upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
    }[status];

    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colorClass}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  // Deadline card component
  const DeadlineCard = ({ deadline }: { deadline: TaxDeadline }) => {
    const daysUntil = getDaysUntilDeadline(deadline.dueDate);
    const config = DEADLINE_CONFIGS[deadline.type];
    const isCompleted = deadline.status === 'completed';

    return (
      <div
        className={`p-4 rounded-xl border transition-all ${
          isCompleted
            ? 'bg-gray-50 border-gray-200 opacity-70'
            : deadline.status === 'overdue'
            ? 'bg-red-50 border-red-200'
            : deadline.status === 'due_soon'
            ? 'bg-orange-50 border-orange-200'
            : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-md'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={() => toggleComplete(deadline.id)}
            className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
              isCompleted
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-primary-500'
            }`}
          >
            {isCompleted && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{config.icon}</span>
              <h4 className={`font-semibold ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {deadline.name}
              </h4>
              {deadline.isCustom && (
                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                  Tùy chỉnh
                </span>
              )}
            </div>

            {deadline.description && (
              <p className="text-sm text-gray-600 mb-2">{deadline.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={deadline.status} />
              <span className="text-gray-500">•</span>
              <span className={`font-medium ${
                daysUntil < 0 ? 'text-red-600' :
                daysUntil <= 3 ? 'text-orange-600' :
                daysUntil <= 7 ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {getDaysText(daysUntil)}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">{formatShortDate(deadline.dueDate)}</span>
            </div>

            {deadline.amount && deadline.amount > 0 && (
              <p className="mt-2 text-sm">
                <span className="text-gray-500">Số tiền dự kiến:</span>{' '}
                <span className="font-semibold text-primary-600">
                  {deadline.amount.toLocaleString('vi-VN')} đ
                </span>
              </p>
            )}

            {deadline.notes && (
              <p className="mt-2 text-sm text-gray-500 italic">
                Ghi chú: {deadline.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          {deadline.isCustom && (
            <button
              onClick={() => removeCustomDeadline(deadline.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Xóa"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📅</span>
          <h2 className="text-2xl font-bold">Quản lý Deadline Thuế</h2>
        </div>
        <p className="text-indigo-100">
          Theo dõi và nhắc nhở các mốc nộp thuế quan trọng
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Năm:</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {AVAILABLE_YEARS.map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    year === y
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Category toggles */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePersonal}
                onChange={(e) => setIncludePersonal(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Cá nhân</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBusiness}
                onChange={(e) => setIncludeBusiness(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Doanh nghiệp</span>
            </label>
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">Thêm deadline</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{result.summary.total}</p>
          <p className="text-sm text-gray-500">Tổng cộng</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{result.summary.overdue}</p>
          <p className="text-sm text-red-500">Quá hạn</p>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{result.summary.dueSoon}</p>
          <p className="text-sm text-orange-500">Sắp đến hạn</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{result.summary.upcoming}</p>
          <p className="text-sm text-blue-500">Sắp tới</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{result.summary.completed}</p>
          <p className="text-sm text-green-500">Hoàn thành</p>
        </div>
      </div>

      {/* Next Deadline Highlight */}
      {result.nextDeadline && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-orange-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⏰</span>
            <h3 className="text-lg font-bold text-orange-800">Deadline tiếp theo</h3>
          </div>
          <DeadlineCard deadline={result.nextDeadline} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'overview', label: 'Tổng quan', icon: '📊' },
          { id: 'list', label: 'Danh sách', icon: '📋' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overdue */}
          {result.overdueDeadlines.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
                <span>🚨</span> Quá hạn ({result.overdueDeadlines.length})
              </h3>
              <div className="space-y-3">
                {result.overdueDeadlines.map(deadline => (
                  <DeadlineCard key={deadline.id} deadline={deadline} />
                ))}
              </div>
            </div>
          )}

          {/* Due Soon */}
          {result.dueSoonDeadlines.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-orange-600 mb-3 flex items-center gap-2">
                <span>⚠️</span> Sắp đến hạn ({result.dueSoonDeadlines.length})
              </h3>
              <div className="space-y-3">
                {result.dueSoonDeadlines.map(deadline => (
                  <DeadlineCard key={deadline.id} deadline={deadline} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming (show first 5) */}
          {result.upcomingDeadlines.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-blue-600 mb-3 flex items-center gap-2">
                <span>📅</span> Sắp tới ({result.upcomingDeadlines.length})
              </h3>
              <div className="space-y-3">
                {result.upcomingDeadlines.slice(0, 5).map(deadline => (
                  <DeadlineCard key={deadline.id} deadline={deadline} />
                ))}
                {result.upcomingDeadlines.length > 5 && (
                  <button
                    onClick={() => setActiveTab('list')}
                    className="w-full py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    Xem tất cả {result.upcomingDeadlines.length} deadline →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {result.allDeadlines.length === 0 && (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📭</span>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có deadline nào</h3>
              <p className="text-gray-500">
                Bật &quot;Cá nhân&quot; hoặc &quot;Doanh nghiệp&quot; để xem các deadline tiêu chuẩn
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'overdue', label: 'Quá hạn' },
              { value: 'due_soon', label: 'Sắp đến hạn' },
              { value: 'upcoming', label: 'Sắp tới' },
              { value: 'completed', label: 'Hoàn thành' },
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value as typeof filterStatus)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterStatus === filter.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="space-y-3">
            {filteredDeadlines.map(deadline => (
              <DeadlineCard key={deadline.id} deadline={deadline} />
            ))}
            {filteredDeadlines.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Không có deadline nào phù hợp với bộ lọc
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Thêm deadline mới</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại deadline
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as DeadlineType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(DEADLINE_CONFIGS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên deadline *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Nộp thuế Q1/2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày hết hạn *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền dự kiến (VNĐ)
                </label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Thêm ghi chú..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={addCustomDeadline}
                  disabled={!formData.name || !formData.dueDate}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legal Note */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <span>📜</span> Căn cứ pháp lý
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Luật Quản lý thuế 2019 (Luật số 38/2019/QH14)</li>
          <li>• Nghị định 126/2020/NĐ-CP hướng dẫn Luật Quản lý thuế</li>
          <li>• Thông tư 80/2021/TT-BTC về quản lý thuế</li>
          <li>• Phạt chậm nộp: 0,03%/ngày trên số thuế chậm nộp</li>
        </ul>
      </div>
    </div>
  );
}
