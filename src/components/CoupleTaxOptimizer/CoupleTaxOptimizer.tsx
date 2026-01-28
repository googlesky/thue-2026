'use client';

import { useMemo } from 'react';
import {
  optimizeCoupleTax,
  formatCurrency,
  getCategoryLabel,
  getCategoryColor,
  type CoupleOptimizationResult,
  type AllocationScenario,
} from '@/lib/coupleTaxOptimizer';
import { CoupleOptimizerTabState, DEFAULT_COUPLE_OPTIMIZER_STATE } from '@/lib/snapshotTypes';

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
      charitableContribution: tabState.charitableContribution,
      voluntaryPension: tabState.voluntaryPension,
    });
  }, [tabState]);

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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Tối ưu thuế cho vợ chồng
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Phân bổ người phụ thuộc và tối ưu các khoản giảm trừ để giảm thuế TNCN cho cả gia đình.
        </p>
      </div>

      {/* Person 1 Input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            1
          </span>
          Thông tin người thứ nhất
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tên
            </label>
            <input
              type="text"
              value={tabState.person1Name}
              onChange={(e) => updateField('person1Name', e.target.value)}
              placeholder="Vợ/Chồng 1"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              placeholder="30,000,000"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={tabState.person1HasInsurance}
              onChange={(e) => updateField('person1HasInsurance', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Có đóng BHXH, BHYT, BHTN
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hưu trí tự nguyện (VND/tháng)
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Giảm trừ khác (VND/tháng)
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Person 2 Input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
            2
          </span>
          Thông tin người thứ hai
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tên
            </label>
            <input
              type="text"
              value={tabState.person2Name}
              onChange={(e) => updateField('person2Name', e.target.value)}
              placeholder="Vợ/Chồng 2"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              placeholder="20,000,000"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={tabState.person2HasInsurance}
              onChange={(e) => updateField('person2HasInsurance', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Có đóng BHXH, BHYT, BHTN
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hưu trí tự nguyện (VND/tháng)
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Giảm trừ khác (VND/tháng)
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Common Fields */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Thông tin chung
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tổng số người phụ thuộc
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={tabState.totalDependents}
              onChange={(e) => updateField('totalDependents', parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Đóng góp từ thiện (VND/tháng)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.charitableContribution === 0 ? '' : tabState.charitableContribution.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('charitableContribution', value ? parseInt(value, 10) : 0);
              }}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hưu trí tự nguyện (VND/tháng)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={tabState.voluntaryPension === 0 ? '' : tabState.voluntaryPension.toLocaleString('vi-VN')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateField('voluntaryPension', value ? parseInt(value, 10) : 0);
              }}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Kết quả tối ưu
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Tổng thu nhập
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(result.combinedGrossIncome)}
                </div>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-xs text-red-600 dark:text-red-400 mb-1">
                  Thuế hiện tại
                </div>
                <div className="font-medium text-red-700 dark:text-red-300">
                  {formatCurrency(result.currentScenario.totalTax)}
                </div>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-xs text-green-600 dark:text-green-400 mb-1">
                  Thuế tối ưu
                </div>
                <div className="font-medium text-green-700 dark:text-green-300">
                  {formatCurrency(result.optimalScenario.totalTax)}
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                  Tiết kiệm được
                </div>
                <div className="font-medium text-blue-700 dark:text-blue-300">
                  {formatCurrency(result.currentScenario.totalTax - result.optimalScenario.totalTax)}
                </div>
              </div>
            </div>

            {/* Optimal allocation */}
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600">✓</span>
                <span className="font-medium text-green-700 dark:text-green-300">
                  Phân bổ tối ưu
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                {result.optimalScenario.description}
              </p>
            </div>
          </div>

          {/* All Scenarios */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              So sánh các phương án phân bổ
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left py-2 px-3 font-medium">Phương án</th>
                    <th className="text-right py-2 px-3 font-medium">{tabState.person1Name || 'Người 1'}</th>
                    <th className="text-right py-2 px-3 font-medium">{tabState.person2Name || 'Người 2'}</th>
                    <th className="text-right py-2 px-3 font-medium">Tổng thuế</th>
                    <th className="text-right py-2 px-3 font-medium">Tiết kiệm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {result.allScenarios.map((scenario) => {
                    const isOptimal = scenario.id === result.optimalScenario.id;
                    return (
                      <tr
                        key={scenario.id}
                        className={isOptimal ? 'bg-green-50 dark:bg-green-900/20' : ''}
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
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Gợi ý tối ưu thuế
              </h3>

              <div className="space-y-3">
                {result.tips.map((tip) => (
                  <div
                    key={tip.id}
                    className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full
                            ${tip.category === 'dependent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                            ${tip.category === 'deduction' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : ''}
                            ${tip.category === 'timing' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : ''}
                            ${tip.category === 'structure' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}
                          `}>
                            {getCategoryLabel(tip.category)}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {tip.title}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {tip.description}
                        </p>
                      </div>
                      {tip.potentialSavings > 0 && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
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
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400">
        <p className="font-medium mb-2">Lưu ý quan trọng:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Người phụ thuộc chỉ được đăng ký cho 1 người nộp thuế</li>
          <li>Cần có hồ sơ đăng ký NPT hợp lệ tại cơ quan thuế</li>
          <li>Đóng góp từ thiện phải qua tổ chức được công nhận có hóa đơn chứng từ</li>
          <li>Hưu trí tự nguyện tối đa 1 triệu VND/tháng/người</li>
          <li>Căn cứ: Luật Thuế TNCN, Thông tư 111/2013/TT-BTC</li>
        </ul>
      </div>
    </div>
  );
}

export default CoupleTaxOptimizer;
