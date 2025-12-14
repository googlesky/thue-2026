'use client';

import { useState } from 'react';
import {
  TAX_LAW_MILESTONES,
  TAX_LAW_PERIODS,
  DEDUCTION_COMPARISON,
  REFORM_2026_HIGHLIGHTS,
  formatCurrency,
  type TaxLawMilestone,
  type TaxLawPeriod,
} from '@/lib/taxLawHistory';

function TimelineItem({ milestone, isLast }: { milestone: TaxLawMilestone; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeColors = {
    enacted: 'bg-blue-500',
    effective: 'bg-green-500',
    change: 'bg-amber-500',
    proposal: 'bg-purple-500',
  };

  const typeLabels = {
    enacted: 'Thông qua',
    effective: 'Có hiệu lực',
    change: 'Thay đổi',
    proposal: 'Đề xuất',
  };

  return (
    <div className="relative pl-8 pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200"></div>
      )}

      {/* Timeline dot */}
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${typeColors[milestone.type]} flex items-center justify-center shadow-md`}>
        <div className="w-2 h-2 bg-white rounded-full"></div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-500">{milestone.date}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${typeColors[milestone.type]}`}>
            {typeLabels[milestone.type]}
          </span>
        </div>

        <h3 className="font-semibold text-gray-900 mb-1">{milestone.title}</h3>
        <p className="text-sm text-gray-600">{milestone.description}</p>

        {milestone.changes && milestone.changes.length > 0 && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <ul className="mt-3 space-y-1.5">
                {milestone.changes.map((change, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-primary-500 mt-0.5">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BracketComparison({ oldPeriod, newPeriod }: { oldPeriod: TaxLawPeriod; newPeriod: TaxLawPeriod }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 font-medium text-gray-500">Thuế suất</th>
            <th className="text-right py-2 px-3 font-medium text-red-600">
              Luật cũ (7 bậc)
            </th>
            <th className="text-right py-2 px-3 font-medium text-primary-600">
              Luật mới (5 bậc)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="py-2 px-3 font-medium">5%</td>
            <td className="text-right py-2 px-3 text-gray-600">0 - 5 triệu</td>
            <td className="text-right py-2 px-3 text-gray-900 font-medium">0 - 10 triệu</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-2 px-3 font-medium">10%</td>
            <td className="text-right py-2 px-3 text-gray-600">5 - 10 triệu</td>
            <td className="text-right py-2 px-3 text-gray-900 font-medium">10 - 20 triệu</td>
          </tr>
          <tr className="border-b border-gray-100 bg-red-50">
            <td className="py-2 px-3 font-medium text-red-600">15%</td>
            <td className="text-right py-2 px-3 text-red-600">10 - 18 triệu</td>
            <td className="text-right py-2 px-3 text-gray-400 italic">Đã bỏ</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-2 px-3 font-medium">20%</td>
            <td className="text-right py-2 px-3 text-gray-600">18 - 32 triệu</td>
            <td className="text-right py-2 px-3 text-gray-900 font-medium">20 - 40 triệu</td>
          </tr>
          <tr className="border-b border-gray-100 bg-red-50">
            <td className="py-2 px-3 font-medium text-red-600">25%</td>
            <td className="text-right py-2 px-3 text-red-600">32 - 52 triệu</td>
            <td className="text-right py-2 px-3 text-gray-400 italic">Đã bỏ</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-2 px-3 font-medium">30%</td>
            <td className="text-right py-2 px-3 text-gray-600">52 - 80 triệu</td>
            <td className="text-right py-2 px-3 text-gray-900 font-medium">40 - 80 triệu</td>
          </tr>
          <tr>
            <td className="py-2 px-3 font-medium">35%</td>
            <td className="text-right py-2 px-3 text-gray-600">Trên 80 triệu</td>
            <td className="text-right py-2 px-3 text-gray-900 font-medium">Trên 80 triệu</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DeductionHistory() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 font-medium text-gray-500">Giai đoạn</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Giảm trừ bản thân</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Giảm trừ NPT</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">% Tăng</th>
          </tr>
        </thead>
        <tbody>
          {DEDUCTION_COMPARISON.map((item, index) => (
            <tr key={item.period} className={`border-b border-gray-100 ${index === DEDUCTION_COMPARISON.length - 1 ? 'bg-primary-50' : ''}`}>
              <td className="py-2 px-3 font-medium text-gray-900">{item.period}</td>
              <td className="text-right py-2 px-3">{formatCurrency(item.personalDeduction)}</td>
              <td className="text-right py-2 px-3">{formatCurrency(item.dependentDeduction)}</td>
              <td className="text-right py-2 px-3">
                {item.personalPercentChange !== null ? (
                  <span className="text-green-600">+{item.personalPercentChange.toFixed(1)}%</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TaxLawHistory() {
  const [activeSection, setActiveSection] = useState<'timeline' | 'comparison' | 'deductions'>('timeline');

  const oldPeriod = TAX_LAW_PERIODS.find(p => p.id === '2020-2026');
  const newPeriod = TAX_LAW_PERIODS.find(p => p.id === '2026-new');

  // Ensure we have the required periods - should always exist but add safety check
  if (!oldPeriod || !newPeriod) {
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Lỗi dữ liệu</h3>
        <p className="text-gray-500">Không tìm thấy thông tin về giai đoạn luật thuế</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl">📜</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lịch sử Luật Thuế TNCN</h2>
            <p className="text-sm text-gray-500">Các mốc thay đổi quan trọng từ 2007 đến nay</p>
          </div>
        </div>

        {/* Key Highlights 2026 */}
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            Điểm nhấn cải cách 2026
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/80 rounded-lg p-3">
              <div className="text-2xl font-bold text-primary-600">
                {REFORM_2026_HIGHLIGHTS.brackets.old} → {REFORM_2026_HIGHLIGHTS.brackets.new}
              </div>
              <div className="text-sm text-gray-600">Số bậc thuế</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                +{(REFORM_2026_HIGHLIGHTS.deductions.personal.increase / 1_000_000).toFixed(1)}tr
              </div>
              <div className="text-sm text-gray-600">Giảm trừ bản thân</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                +{(REFORM_2026_HIGHLIGHTS.deductions.dependent.increase / 1_000_000).toFixed(1)}tr
              </div>
              <div className="text-sm text-gray-600">Giảm trừ NPT</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">01/07/2026</div>
              <div className="text-sm text-gray-600">Ngày áp dụng</div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSection('timeline')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeSection === 'timeline'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Dòng thời gian
          </button>
          <button
            onClick={() => setActiveSection('comparison')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeSection === 'comparison'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            So sánh biểu thuế
          </button>
          <button
            onClick={() => setActiveSection('deductions')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeSection === 'deductions'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Lịch sử giảm trừ
          </button>
        </div>
      </div>

      {/* Timeline Section */}
      {activeSection === 'timeline' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Các mốc quan trọng</h3>
          <div className="mt-4">
            {TAX_LAW_MILESTONES.map((milestone, index) => (
              <TimelineItem
                key={milestone.id}
                milestone={milestone}
                isLast={index === TAX_LAW_MILESTONES.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bracket Comparison Section */}
      {activeSection === 'comparison' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">So sánh biểu thuế lũy tiến</h3>
          <p className="text-sm text-gray-600 mb-4">
            Thu nhập tính thuế = Thu nhập chịu thuế - Giảm trừ gia cảnh
          </p>
          <BracketComparison oldPeriod={oldPeriod} newPeriod={newPeriod} />

          <div className="mt-6 p-4 bg-amber-50 rounded-xl">
            <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
              <span>💡</span>
              Lưu ý quan trọng
            </h4>
            <ul className="text-sm text-amber-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <span>•</span>
                Bậc thuế 15% và 25% đã được loại bỏ trong luật mới
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                Khoảng thu nhập chịu mức 5% và 10% được mở rộng gấp đôi
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                Người có thu nhập trung bình (20-50 triệu) được hưởng lợi nhiều nhất
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Deduction History Section */}
      {activeSection === 'deductions' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Lịch sử thay đổi mức giảm trừ</h3>
          <DeductionHistory />

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-xl">
              <h4 className="font-medium text-green-800 mb-2">Giảm trừ bản thân</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(newPeriod.personalDeduction)}
                </span>
                <span className="text-sm text-green-600">/tháng</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Tăng {REFORM_2026_HIGHLIGHTS.deductions.personal.percentChange}% so với giai đoạn trước
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="font-medium text-blue-800 mb-2">Giảm trừ người phụ thuộc</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(newPeriod.dependentDeduction)}
                </span>
                <span className="text-sm text-blue-600">/người/tháng</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Tăng {REFORM_2026_HIGHLIGHTS.deductions.dependent.percentChange}% so với giai đoạn trước
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Card */}
      <div className="card bg-gradient-to-br from-primary-50 to-blue-50">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-lg">✨</span>
          Lợi ích của cải cách 2026
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {REFORM_2026_HIGHLIGHTS.benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-2 bg-white/80 rounded-lg p-3">
              <span className="text-green-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
