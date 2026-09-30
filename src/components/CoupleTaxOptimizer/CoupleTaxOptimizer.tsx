'use client';

import { useMemo } from 'react';
import {
  optimizeCoupleTax,
  formatCurrency,
  getCategoryLabel,
  MAX_COUPLE_DEPENDENTS,
  type CoupleOptimizationResult,
} from '@/lib/coupleTaxOptimizer';
import { getVoluntaryPensionCap } from '@/lib/taxCalculator';
import { CoupleOptimizerTabState } from '@/lib/snapshotTypes';

interface CoupleTaxOptimizerProps {
  tabState: CoupleOptimizerTabState;
  onTabStateChange: (state: CoupleOptimizerTabState) => void;
}

export function CoupleTaxOptimizer({ tabState, onTabStateChange }: CoupleTaxOptimizerProps) {
  // Calculate optimization result
  const result = useMemo<CoupleOptimizationResult | null>(() => {
    if (tabState.person1Income === 0 && tabState.person2Income === 0) {
      return null;
    }

    return optimizeCoupleTax({
      person1: {
        name: tabState.person1Name || 'Vợ/Chồng 1',
        grossIncome: tabState.person1Income,
        hasInsurance: tabState.person1HasInsurance,
        pensionContribution: tabState.person1Pension,
        otherDeductions: tabState.person1OtherDeductions,
      },
      person2: {
        name: tabState.person2Name || 'Vợ/Chồng 2',
        grossIncome: tabState.person2Income,
        hasInsurance: tabState.person2HasInsurance,
        pensionContribution: tabState.person2Pension,
        otherDeductions: tabState.person2OtherDeductions,
      },
      totalDependents: tabState.totalDependents,
    });
  }, [tabState]);

  const pensionCap = getVoluntaryPensionCap();

  // Update field helper
  const updateField = <K extends keyof CoupleOptimizerTabState>(
    field: K,
    value: CoupleOptimizerTabState[K]
  ) => {
    onTabStateChange({ ...tabState, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Tối ưu thuế cho vợ chồng
        </h2>
        <p className="text-sm text-gray-600">
          Phân bổ người phụ thuộc và tối ưu các khoản giảm trừ để giảm thuế TNCN cho cả gia đình.
        </p>
      </div>

      {/* Person 1 Input */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            1
          </span>
          Thông tin người thứ nhất
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên
            </label>
            <input
              type="text"
              value={tabState.person1Name}
              onChange={(e) => updateField('person1Name', e.target.value)}
              placeholder="Vợ/Chồng 1"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thu nhập hàng tháng (VND)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.person1Income === 0 ? '' : tabState.person1Income.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('person1Income', value ? parseInt(value, 10) : 0);
              }}
              placeholder="30.000.000"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={tabState.person1HasInsurance}
              onChange={(e) => updateField('person1HasInsurance', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Có đóng BHXH, BHYT, BHTN
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hưu trí, BH nhân thọ (VND/tháng)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.person1Pension === 0 ? '' : tabState.person1Pension.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('person1Pension', value ? parseInt(value, 10) : 0);
              }}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
            {tabState.person1Pension > pensionCap && (
              <p className="text-xs text-amber-700 mt-1">
                Chỉ được trừ tối đa {formatCurrency(pensionCap)}/tháng (gộp hưu trí bổ sung, hưu trí tự nguyện, BH nhân thọ).
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Từ thiện, nhân đạo (VND/tháng)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.person1OtherDeductions === 0 ? '' : tabState.person1OtherDeductions.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('person1OtherDeductions', value ? parseInt(value, 10) : 0);
              }}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Person 2 Input */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
            2
          </span>
          Thông tin người thứ hai
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên
            </label>
            <input
              type="text"
              value={tabState.person2Name}
              onChange={(e) => updateField('person2Name', e.target.value)}
              placeholder="Vợ/Chồng 2"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thu nhập hàng tháng (VND)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.person2Income === 0 ? '' : tabState.person2Income.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('person2Income', value ? parseInt(value, 10) : 0);
              }}
              placeholder="20.000.000"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={tabState.person2HasInsurance}
              onChange={(e) => updateField('person2HasInsurance', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Có đóng BHXH, BHYT, BHTN
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hưu trí, BH nhân thọ (VND/tháng)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.person2Pension === 0 ? '' : tabState.person2Pension.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('person2Pension', value ? parseInt(value, 10) : 0);
              }}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
            {tabState.person2Pension > pensionCap && (
              <p className="text-xs text-amber-700 mt-1">
                Chỉ được trừ tối đa {formatCurrency(pensionCap)}/tháng (gộp hưu trí bổ sung, hưu trí tự nguyện, BH nhân thọ).
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Từ thiện, nhân đạo (VND/tháng)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.person2OtherDeductions === 0 ? '' : tabState.person2OtherDeductions.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('person2OtherDeductions', value ? parseInt(value, 10) : 0);
              }}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Common Fields */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h3 className="text-md font-medium text-gray-900 mb-4">
          Thông tin chung
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tổng số người phụ thuộc
            </label>
            <input
              type="number"
              min="0"
              max={MAX_COUPLE_DEPENDENTS}
              value={Math.min(MAX_COUPLE_DEPENDENTS, Math.max(0, Math.floor(tabState.totalDependents || 0)))}
              onChange={(e) =>
                updateField(
                  'totalDependents',
                  Math.min(MAX_COUPLE_DEPENDENTS, Math.max(0, parseInt(e.target.value, 10) || 0))
                )
              }
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4">
              Kết quả tối ưu (theo tháng)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">
                  Tổng thu nhập
                </div>
                <div className="font-medium text-gray-900">
                  {formatCurrency(result.combinedGrossIncome)}
                </div>
              </div>

              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-xs text-red-600 mb-1">
                  Thuế chia đều NPT
                </div>
                <div className="font-medium text-red-700">
                  {formatCurrency(result.currentScenario.totalTax)}
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-green-600 mb-1">
                  Thuế tối ưu
                </div>
                <div className="font-medium text-green-700">
                  {formatCurrency(result.optimalScenario.totalTax)}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-600 mb-1">
                  Tiết kiệm được
                </div>
                <div className="font-medium text-blue-700">
                  {formatCurrency(result.currentScenario.totalTax - result.optimalScenario.totalTax)}
                </div>
              </div>
            </div>

            {/* Optimal allocation */}
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-green-700">
                  Phân bổ tối ưu
                </span>
              </div>
              <p className="text-sm text-green-600">
                {result.optimalScenario.description}
              </p>
            </div>
          </div>

          {/* All Scenarios */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4">
              So sánh các phương án phân bổ (thuế/tháng)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium">Phương án</th>
                    <th className="text-right py-2 px-3 font-medium">{tabState.person1Name || 'Người 1'}</th>
                    <th className="text-right py-2 px-3 font-medium">{tabState.person2Name || 'Người 2'}</th>
                    <th className="text-right py-2 px-3 font-medium">Tổng thuế</th>
                    <th className="text-right py-2 px-3 font-medium">Tiết kiệm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {result.allScenarios.map((scenario) => {
                    const isOptimal = scenario.id === result.optimalScenario.id;
                    return (
                      <tr
                        key={scenario.id}
                        className={isOptimal ? 'bg-green-50' : ''}
                      >
                        <td className="py-2 px-3">
                          {scenario.person1Dependents} NPT / {scenario.person2Dependents} NPT
                          {isOptimal && (
                            <span className="ml-2 text-xs text-green-600 font-medium">
                              Tối ưu
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrency(scenario.person1Tax)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrency(scenario.person2Tax)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {formatCurrency(scenario.totalTax)}
                        </td>
                        <td className={`py-2 px-3 text-right ${scenario.savings > 0 ? 'text-green-600' : scenario.savings < 0 ? 'text-red-600' : ''}`}>
                          {scenario.savings > 0 ? '+' : ''}{formatCurrency(scenario.savings)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Optimization Tips */}
          {result.tips.length > 0 && (
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">
                Gợi ý tối ưu thuế
              </h3>

              <div className="space-y-3">
                {result.tips.map((tip) => (
                  <div
                    key={tip.id}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full
                            ${tip.category === 'dependent' ? 'bg-blue-100 text-blue-700' : ''}
                            ${tip.category === 'deduction' ? 'bg-green-100 text-green-700' : ''}
                            ${tip.category === 'timing' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${tip.category === 'structure' ? 'bg-purple-100 text-purple-700' : ''}
                          `}>
                            {getCategoryLabel(tip.category)}
                          </span>
                          <span className="font-medium text-gray-900">
                            {tip.title}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {tip.description}
                        </p>
                      </div>
                      {tip.potentialSavings > 0 && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Tiết kiệm
                          </div>
                          <div className="font-medium text-green-600">
                            {formatCurrency(tip.potentialSavings)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Legal Reference */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium mb-2">Lưu ý quan trọng:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Người phụ thuộc chỉ được đăng ký cho 1 người nộp thuế</li>
          <li>Con đã thành niên đang đi học, cha mẹ, vợ/chồng không có khả năng lao động... chỉ là NPT khi thu nhập bình quân tháng không quá 3 triệu đồng</li>
          <li>Cần có hồ sơ đăng ký NPT hợp lệ tại cơ quan thuế</li>
          <li>Đóng góp từ thiện phải qua tổ chức được công nhận, có chứng từ; khoản này trừ cho người trực tiếp đóng góp</li>
          <li>Hưu trí bổ sung, hưu trí tự nguyện, bảo hiểm nhân thọ: tổng tối đa {formatCurrency(pensionCap)}/tháng/người, kể cả phần công ty đóng</li>
          <li>Chi khám chữa bệnh (tối đa 23 triệu/năm) và học phí (tối đa 24 triệu/năm) cho bản thân và NPT được giảm trừ khi tự quyết toán; người đăng ký NPT được trừ phần chi cho NPT đó (chưa tính trong công cụ này)</li>
          <li>Căn cứ: Luật Thuế TNCN số 109/2025/QH15 (sửa đổi bởi Luật 09/2026/QH16), NĐ 253/2026/NĐ-CP, TT 87/2026/TT-BTC</li>
        </ul>
      </div>
    </div>
  );
}

export default CoupleTaxOptimizer;
