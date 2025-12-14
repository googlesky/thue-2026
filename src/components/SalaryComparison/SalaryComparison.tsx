'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  SharedTaxState,
  RegionType,
  DEFAULT_INSURANCE_OPTIONS,
  REGIONAL_MINIMUM_WAGES,
  formatNumber,
  parseCurrency,
} from '@/lib/taxCalculator';
import {
  CompanyOffer,
  ComparisonResult,
  createDefaultCompanyOffer,
  compareCompanyOffers,
} from '@/lib/salaryComparisonCalculator';
import { SalaryComparisonTabState } from '@/lib/snapshotTypes';

interface SalaryComparisonProps {
  sharedState?: SharedTaxState;
  onStateChange?: (updates: Partial<SharedTaxState>) => void;
  tabState?: SalaryComparisonTabState;
  onTabStateChange?: (state: SalaryComparisonTabState) => void;
}

export default function SalaryComparison({
  sharedState,
  onStateChange,
  tabState,
  onTabStateChange,
}: SalaryComparisonProps) {
  const isLocalChange = useRef(false);

  const [companies, setCompanies] = useState<CompanyOffer[]>(
    tabState?.companies ?? [
      createDefaultCompanyOffer('company-1', 'Công ty A'),
      createDefaultCompanyOffer('company-2', 'Công ty B'),
    ]
  );
  const [dependents, setDependents] = useState(sharedState?.dependents || 0);
  const [useNewLaw, setUseNewLaw] = useState(tabState?.useNewLaw ?? true);

  // Sync từ shared state - chỉ lấy dependents
  useEffect(() => {
    if (sharedState && !isLocalChange.current) {
      setDependents(sharedState.dependents);
      // Nếu có grossIncome, điền vào công ty đầu tiên nếu trống
      if (sharedState.grossIncome > 0 && companies.length > 0 && companies[0]?.grossSalary === 0) {
        setCompanies(prev => prev.map((c, i) =>
          i === 0 ? { ...c, grossSalary: sharedState.grossIncome, region: sharedState.region } : c
        ));
      }
    }
    isLocalChange.current = false;
  }, [sharedState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from tab state
  useEffect(() => {
    if (tabState) {
      // Ensure companies array is never empty
      const validCompanies = tabState.companies?.length > 0 ? tabState.companies : [
        createDefaultCompanyOffer('company-1', 'Công ty A'),
        createDefaultCompanyOffer('company-2', 'Công ty B'),
      ];
      setCompanies(validCompanies);
      setUseNewLaw(tabState.useNewLaw);
    }
  }, [tabState]);

  // Tính toán kết quả
  const result: ComparisonResult | null = useMemo(() => {
    const validCompanies = companies.filter(c => c.grossSalary > 0);
    if (validCompanies.length < 2) return null;

    return compareCompanyOffers(validCompanies, dependents, useNewLaw);
  }, [companies, dependents, useNewLaw]);

  const addCompany = () => {
    if (companies.length >= 4) return;
    const newId = `company-${Date.now()}`;
    const names = ['A', 'B', 'C', 'D'];
    const newName = `Công ty ${names[companies.length] || (companies.length + 1)}`;
    const newCompanies = [...companies, createDefaultCompanyOffer(newId, newName)];
    setCompanies(newCompanies);
    onTabStateChange?.({ companies: newCompanies, useNewLaw });
  };

  const removeCompany = (id: string) => {
    if (companies.length <= 2) return;
    const newCompanies = companies.filter(c => c.id !== id);
    setCompanies(newCompanies);
    onTabStateChange?.({ companies: newCompanies, useNewLaw });
  };

  const updateCompany = (id: string, updates: Partial<CompanyOffer>) => {
    const newCompanies = companies.map(c => c.id === id ? { ...c, ...updates } : c);
    setCompanies(newCompanies);
    onTabStateChange?.({ companies: newCompanies, useNewLaw });
  };

  const validCompanyCount = companies.filter(c => c.grossSalary > 0).length;

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        So sánh lương giữa các công ty
      </h3>

      {/* Common Settings */}
      <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Người phụ thuộc:</label>
          <select
            value={dependents}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              isLocalChange.current = true;
              setDependents(value);
              onStateChange?.({ dependents: value });
            }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            {[0, 1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n} người</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Biểu thuế:</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!useNewLaw}
              onChange={() => {
                setUseNewLaw(false);
                onTabStateChange?.({ companies, useNewLaw: false });
              }}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">Hiện hành</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={useNewLaw}
              onChange={() => {
                setUseNewLaw(true);
                onTabStateChange?.({ companies, useNewLaw: true });
              }}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm">Mới 2026</span>
          </label>
        </div>

        <button
          onClick={addCompany}
          disabled={companies.length >= 4}
          className="ml-auto px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm công ty
        </button>
      </div>

      {/* Company Inputs */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {companies.map((company, index) => (
          <div
            key={company.id}
            className="border border-gray-200 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={company.name}
                onChange={(e) => updateCompany(company.id, { name: e.target.value })}
                className="font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none px-1"
              />
              {companies.length > 2 && (
                <button
                  onClick={() => removeCompany(company.id)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lương GROSS</label>
                <input
                  type="text"
                  value={company.grossSalary > 0 ? formatNumber(company.grossSalary) : ''}
                  onChange={(e) => updateCompany(company.id, { grossSalary: parseCurrency(e.target.value) })}
                  placeholder="30,000,000"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Vùng</label>
                <select
                  value={company.region}
                  onChange={(e) => updateCompany(company.id, { region: parseInt(e.target.value) as RegionType })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(REGIONAL_MINIMUM_WAGES).map(([key, info]) => (
                    <option key={key} value={Number(key)}>{info.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Thưởng</label>
                <select
                  value={company.bonusMonths}
                  onChange={(e) => updateCompany(company.id, { bonusMonths: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={0}>Không có</option>
                  <option value={1}>1 tháng (T13)</option>
                  <option value={2}>2 tháng (T13+14)</option>
                  <option value={3}>3 tháng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Phụ cấp/tháng</label>
                <input
                  type="text"
                  value={company.otherBenefits > 0 ? formatNumber(company.otherBenefits) : ''}
                  onChange={(e) => updateCompany(company.id, { otherBenefits: parseCurrency(e.target.value) })}
                  placeholder="0"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={company.hasInsurance}
                onChange={(e) => updateCompany(company.id, { hasInsurance: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded"
              />
              <span className="text-xs text-gray-600">Có đóng BHXH</span>
            </label>
          </div>
        ))}
      </div>

      {/* Results */}
      {result ? (
        <div className="space-y-6">
          {/* Best Offer Summary */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <div className="text-sm opacity-90">Offer tốt nhất (theo NET năm)</div>
                <div className="font-bold text-xl">
                  {result.companies[result.bestOffer.byAnnualNet].companyName}
                </div>
                <div className="text-sm opacity-90">
                  Hơn offer thấp nhất: {formatNumber(result.differences.maxAnnualDiff)} VND/năm
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600"></th>
                  {result.companies.map((company, idx) => (
                    <th
                      key={company.companyId}
                      className={`text-right py-2 px-3 font-bold ${
                        idx === result.bestOffer.byAnnualNet
                          ? 'text-green-600 bg-green-50'
                          : 'text-gray-800'
                      }`}
                    >
                      {company.companyName}
                      {idx === result.bestOffer.byAnnualNet && (
                        <span className="ml-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">
                          Tối ưu
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2 px-3 text-gray-600" colSpan={result.companies.length + 1}>
                    <strong>HÀNG THÁNG</strong>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Lương GROSS</td>
                  {result.companies.map(c => (
                    <td key={c.companyId} className="text-right py-2 px-3">{formatNumber(c.monthlyGross)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Bảo hiểm</td>
                  {result.companies.map(c => (
                    <td key={c.companyId} className="text-right py-2 px-3 text-red-600">-{formatNumber(c.monthlyInsurance)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Thuế TNCN</td>
                  {result.companies.map(c => (
                    <td key={c.companyId} className="text-right py-2 px-3 text-red-600">-{formatNumber(c.monthlyTax)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Phụ cấp</td>
                  {result.companies.map(c => (
                    <td key={c.companyId} className="text-right py-2 px-3 text-green-600">+{formatNumber(c.monthlyBenefits)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-blue-50">
                  <td className="py-2 px-3 font-bold text-gray-800">NET/tháng</td>
                  {result.companies.map((c, idx) => (
                    <td key={c.companyId} className={`text-right py-2 px-3 font-bold ${idx === result.bestOffer.byMonthlyNet ? 'text-green-600' : ''}`}>
                      {formatNumber(c.monthlyTotal)}
                    </td>
                  ))}
                </tr>

                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2 px-3 text-gray-600" colSpan={result.companies.length + 1}>
                    <strong>CẢ NĂM</strong>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Tổng GROSS</td>
                  {result.companies.map(c => (
                    <td key={c.companyId} className="text-right py-2 px-3">{formatNumber(c.annualTotalGross)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600 text-xs pl-6">- Lương 12 tháng</td>
                  {result.companies.map(c => (
                    <td key={c.companyId} className="text-right py-2 px-3 text-xs text-gray-500">{formatNumber(c.annualGross)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600 text-xs pl-6">- Thưởng</td>
                  {result.companies.map(c => (
                    <td key={c.companyId} className="text-right py-2 px-3 text-xs text-gray-500">{formatNumber(c.annualBonus)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-600">Tổng thuế</td>
                  {result.companies.map((c, idx) => (
                    <td key={c.companyId} className={`text-right py-2 px-3 text-red-600 ${idx === result.bestOffer.byLowestTax ? 'font-bold' : ''}`}>
                      -{formatNumber(c.annualTax)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-green-50">
                  <td className="py-2 px-3 font-bold text-gray-800">NET/năm</td>
                  {result.companies.map((c, idx) => (
                    <td key={c.companyId} className={`text-right py-2 px-3 font-bold text-lg ${idx === result.bestOffer.byAnnualNet ? 'text-green-600' : ''}`}>
                      {formatNumber(c.annualNet)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-2 px-3 text-gray-600">Thuế suất thực tế</td>
                  {result.companies.map(c => (
                    <td key={c.companyId} className="text-right py-2 px-3 text-gray-500">{c.effectiveRate.toFixed(1)}%</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Difference Chart - Simple Bar */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">So sánh NET năm</div>
            <div className="space-y-3">
              {result.companies.map((company, idx) => {
                const maxNet = Math.max(...result.companies.map(c => c.annualNet));
                const percentage = maxNet > 0 ? (company.annualNet / maxNet) * 100 : 0;
                const isBest = idx === result.bestOffer.byAnnualNet;

                return (
                  <div key={company.companyId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={isBest ? 'font-bold text-green-600' : 'text-gray-600'}>
                        {company.companyName}
                      </span>
                      <span className={isBest ? 'font-bold text-green-600' : 'text-gray-800'}>
                        {formatNumber(company.annualNet)} VND
                      </span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isBest ? 'bg-green-500' : 'bg-primary-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          {validCompanyCount < 2 ? (
            <>Nhập lương cho ít nhất 2 công ty để so sánh</>
          ) : (
            <>Đang tính toán...</>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-600">
            <div className="font-medium mb-1">Hướng dẫn</div>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>Thưởng tháng 13 được tính thuế như thu nhập trong tháng nhận thưởng</li>
              <li>Phụ cấp được giả định là <strong>không chịu thuế</strong> (phụ cấp công tác, xăng xe, ăn trưa...)</li>
              <li>Nếu phụ cấp của bạn <strong>chịu thuế</strong>, hãy cộng vào lương GROSS thay vì nhập riêng</li>
              <li>Vùng lương ảnh hưởng đến mức đóng BHTN tối đa</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
