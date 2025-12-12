'use client';

import { OLD_TAX_BRACKETS, NEW_TAX_BRACKETS, OLD_DEDUCTIONS, NEW_DEDUCTIONS, formatCurrency } from '@/lib/taxCalculator';

export default function TaxBracketTable() {
  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Biểu thuế lũy tiến từng phần
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Luật cũ */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Luật hiện hành (7 bậc)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50">
                  <th className="px-3 py-2 text-left text-red-800">Bậc</th>
                  <th className="px-3 py-2 text-left text-red-800">Thu nhập/tháng</th>
                  <th className="px-3 py-2 text-right text-red-800">Thuế suất</th>
                </tr>
              </thead>
              <tbody>
                {OLD_TAX_BRACKETS.map((bracket, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium">{index + 1}</td>
                    <td className="px-3 py-2">
                      {bracket.max === Infinity
                        ? `Trên ${formatCurrency(bracket.min)}`
                        : index === 0
                        ? `Đến ${formatCurrency(bracket.max)}`
                        : `${formatCurrency(bracket.min)} - ${formatCurrency(bracket.max)}`}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600">
                      {(bracket.rate * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Luật mới */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary-500"></span>
            Luật mới 2026 (5 bậc)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50">
                  <th className="px-3 py-2 text-left text-primary-800">Bậc</th>
                  <th className="px-3 py-2 text-left text-primary-800">Thu nhập/tháng</th>
                  <th className="px-3 py-2 text-right text-primary-800">Thuế suất</th>
                </tr>
              </thead>
              <tbody>
                {NEW_TAX_BRACKETS.map((bracket, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium">{index + 1}</td>
                    <td className="px-3 py-2">
                      {bracket.max === Infinity
                        ? `Trên ${formatCurrency(bracket.min)}`
                        : index === 0
                        ? `Đến ${formatCurrency(bracket.max)}`
                        : `${formatCurrency(bracket.min)} - ${formatCurrency(bracket.max)}`}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-primary-600">
                      {(bracket.rate * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mức giảm trừ gia cảnh */}
      <div className="mt-8 pt-6 border-t">
        <h4 className="font-semibold text-gray-800 mb-4">Mức giảm trừ gia cảnh</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Khoản mục</th>
                <th className="px-4 py-2 text-right text-red-700">Luật cũ</th>
                <th className="px-4 py-2 text-right text-primary-700">Luật mới</th>
                <th className="px-4 py-2 text-right text-green-700">Tăng thêm</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3">Bản thân người nộp thuế</td>
                <td className="px-4 py-3 text-right">{formatCurrency(OLD_DEDUCTIONS.personal)}</td>
                <td className="px-4 py-3 text-right font-semibold text-primary-600">
                  {formatCurrency(NEW_DEDUCTIONS.personal)}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  +{formatCurrency(NEW_DEDUCTIONS.personal - OLD_DEDUCTIONS.personal)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">Mỗi người phụ thuộc</td>
                <td className="px-4 py-3 text-right">{formatCurrency(OLD_DEDUCTIONS.dependent)}</td>
                <td className="px-4 py-3 text-right font-semibold text-primary-600">
                  {formatCurrency(NEW_DEDUCTIONS.dependent)}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  +{formatCurrency(NEW_DEDUCTIONS.dependent - OLD_DEDUCTIONS.dependent)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
