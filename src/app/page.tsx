'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import TaxInput from '@/components/TaxInput';
import TaxResult from '@/components/TaxResult';
import TaxChart from '@/components/TaxChart';
import TaxBracketTable from '@/components/TaxBracketTable';
import GrossNetConverter from '@/components/GrossNetConverter';
import InsuranceBreakdown from '@/components/InsuranceBreakdown';
import OtherIncomeInput from '@/components/OtherIncomeInput';
import { YearlyComparison } from '@/components/YearlyComparison';
import EmployerCostCalculator from '@/components/EmployerCostCalculator';
import { FreelancerComparison } from '@/components/FreelancerComparison';
import { SalaryComparison } from '@/components/SalaryComparison';
import OvertimeCalculator from '@/components/OvertimeCalculator';
import TabNavigation, { type TabType } from '@/components/TabNavigation';
import { SaveShareButton } from '@/components/SaveShare';
import {
  calculateOldTax,
  calculateNewTax,
  TaxResult as TaxResultType,
  TaxInput as TaxInputType,
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
  SharedTaxState,
  OtherIncomeState,
  DEFAULT_OTHER_INCOME,
  calculateOtherIncomeTax,
} from '@/lib/taxCalculator';
import {
  CalculatorSnapshot,
  EmployerCostTabState,
  FreelancerTabState,
  SalaryComparisonTabState,
  YearlyComparisonTabState,
  OvertimeTabState,
  DEFAULT_OVERTIME_STATE,
} from '@/lib/snapshotTypes';
import { decodeSnapshot, decodeLegacyURLParams } from '@/lib/snapshotCodec';
import { createDefaultCompanyOffer } from '@/lib/salaryComparisonCalculator';

const defaultSharedState: SharedTaxState = {
  grossIncome: 30_000_000,
  dependents: 0,
  otherDeductions: 0,
  hasInsurance: true,
  insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
  region: 1,
  pensionContribution: 0,
  otherIncome: DEFAULT_OTHER_INCOME,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [isInitialized, setIsInitialized] = useState(false);

  // Shared state across all tabs
  const [sharedState, setSharedState] = useState<SharedTaxState>(defaultSharedState);

  // Tab-specific states (lifted from individual tab components)
  const [employerCostState, setEmployerCostState] = useState<EmployerCostTabState>({
    includeUnionFee: false,
    useNewLaw: true,
  });
  const [freelancerState, setFreelancerState] = useState<FreelancerTabState>({
    frequency: 'monthly',
    useNewLaw: true,
  });
  const [salaryComparisonState, setSalaryComparisonState] = useState<SalaryComparisonTabState>({
    companies: [
      createDefaultCompanyOffer('company-1', 'Công ty A'),
      createDefaultCompanyOffer('company-2', 'Công ty B'),
    ],
    useNewLaw: true,
  });
  const [yearlyState, setYearlyState] = useState<YearlyComparisonTabState>({
    selectedPresetId: 'normal',
    bonusAmount: 30_000_000,
  });
  const [overtimeState, setOvertimeState] = useState<OvertimeTabState>(DEFAULT_OVERTIME_STATE);

  // Tax calculation results
  const [oldResult, setOldResult] = useState<TaxResultType>(() =>
    calculateOldTax(sharedState)
  );
  const [newResult, setNewResult] = useState<TaxResultType>(() =>
    calculateNewTax(sharedState)
  );

  // Handler for loading a snapshot (defined early to avoid hoisting issues)
  const handleLoadSnapshot = useCallback((snapshot: CalculatorSnapshot) => {
    setSharedState(snapshot.sharedState);
    setActiveTab(snapshot.activeTab as TabType);
    setEmployerCostState(snapshot.tabs.employerCost);
    setFreelancerState(snapshot.tabs.freelancer);
    setSalaryComparisonState(snapshot.tabs.salaryComparison);
    setYearlyState(snapshot.tabs.yearlyComparison);
    if (snapshot.tabs.overtime) {
      setOvertimeState(snapshot.tabs.overtime);
    }
  }, []);

  // Load state from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      // Try to load from hash first (new snapshot format)
      const hash = window.location.hash;
      if (hash.startsWith('#s=')) {
        const snapshot = decodeSnapshot(hash.slice(3));
        if (snapshot) {
          handleLoadSnapshot(snapshot);
          window.history.replaceState(null, '', window.location.pathname);
          setIsInitialized(true);
          return;
        }
      }

      // Fall back to legacy URL params for backward compatibility
      const urlState = decodeLegacyURLParams(window.location.search);
      if (urlState) {
        const newState = { ...defaultSharedState, ...urlState };
        setSharedState(newState);

        // Recalculate
        const taxInput: TaxInputType = {
          grossIncome: newState.grossIncome,
          declaredSalary: newState.declaredSalary,
          dependents: newState.dependents,
          otherDeductions: newState.otherDeductions + newState.pensionContribution,
          hasInsurance: newState.hasInsurance,
          insuranceOptions: newState.insuranceOptions,
          region: newState.region,
        };
        setOldResult(calculateOldTax(taxInput));
        setNewResult(calculateNewTax(taxInput));

        // Clear URL params after loading (cleaner URL)
        window.history.replaceState({}, '', window.location.pathname);
      }
      setIsInitialized(true);
    }
  }, [isInitialized, handleLoadSnapshot]);

  // Update shared state and recalculate tax
  const updateSharedState = useCallback((updates: Partial<SharedTaxState>) => {
    setSharedState(prev => {
      const newState = { ...prev, ...updates };

      // Build tax input
      const taxInput: TaxInputType = {
        grossIncome: newState.grossIncome,
        declaredSalary: newState.declaredSalary,
        dependents: newState.dependents,
        otherDeductions: newState.otherDeductions + newState.pensionContribution,
        hasInsurance: newState.hasInsurance,
        insuranceOptions: newState.insuranceOptions,
        region: newState.region,
      };

      // Recalculate tax results
      setOldResult(calculateOldTax(taxInput));
      setNewResult(calculateNewTax(taxInput));

      return newState;
    });
  }, []);

  // Handler for TaxInput component (maintains backward compatibility)
  const handleCalculate = useCallback(
    (newInput: {
      grossIncome: number;
      declaredSalary?: number;
      dependents: number;
      otherDeductions: number;
      hasInsurance: boolean;
      insuranceOptions: InsuranceOptions;
      region: RegionType;
      pensionContribution: number;
    }) => {
      updateSharedState(newInput);
    },
    [updateSharedState]
  );

  // Handler for other income changes
  const handleOtherIncomeChange = useCallback((otherIncome: OtherIncomeState) => {
    updateSharedState({ otherIncome });
  }, [updateSharedState]);

  // Build current snapshot for save/share
  const currentSnapshot = useMemo<CalculatorSnapshot>(() => ({
    version: 1,
    sharedState,
    activeTab,
    tabs: {
      employerCost: employerCostState,
      freelancer: freelancerState,
      salaryComparison: salaryComparisonState,
      yearlyComparison: yearlyState,
      overtime: overtimeState,
    },
    meta: {
      createdAt: Date.now(),
    },
  }), [sharedState, activeTab, employerCostState, freelancerState, salaryComparisonState, yearlyState, overtimeState]);

  // Calculate other income tax
  const otherIncomeTax = sharedState.otherIncome
    ? calculateOtherIncomeTax(sharedState.otherIncome)
    : null;

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Tính Thuế TNCN 2026
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            So sánh thuế thu nhập cá nhân theo luật hiện hành và luật mới áp dụng từ 1/7/2026.
            Xem bạn tiết kiệm được bao nhiêu với biểu thuế 5 bậc mới.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Luật cũ (7 bậc)
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span>
              Luật mới (5 bậc)
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <SaveShareButton
              snapshot={currentSnapshot}
              onLoadSnapshot={handleLoadSnapshot}
            />
          </div>
        </header>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'calculator' && (
          <>
            {/* Main content */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-1">
                {isInitialized ? (
                  <TaxInput
                    onCalculate={handleCalculate}
                    initialValues={sharedState}
                  />
                ) : (
                  <div className="card animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
                    <div className="space-y-4">
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="lg:col-span-2">
                <TaxResult
                  oldResult={oldResult}
                  newResult={newResult}
                  otherIncomeTax={otherIncomeTax}
                />
              </div>
            </div>

            {/* Chart */}
            <div className="mb-8">
              <TaxChart dependents={sharedState.dependents} currentIncome={sharedState.grossIncome} />
            </div>
          </>
        )}

        {activeTab === 'gross-net' && (
          <div className="mb-8">
            <GrossNetConverter
              sharedState={sharedState}
              onStateChange={updateSharedState}
            />
          </div>
        )}

        {activeTab === 'employer-cost' && (
          <div className="mb-8">
            <EmployerCostCalculator
              sharedState={sharedState}
              onStateChange={updateSharedState}
              tabState={employerCostState}
              onTabStateChange={setEmployerCostState}
            />
          </div>
        )}

        {activeTab === 'freelancer' && (
          <div className="mb-8">
            <FreelancerComparison
              sharedState={sharedState}
              onStateChange={updateSharedState}
              tabState={freelancerState}
              onTabStateChange={setFreelancerState}
            />
          </div>
        )}

        {activeTab === 'salary-compare' && (
          <div className="mb-8">
            <SalaryComparison
              sharedState={sharedState}
              onStateChange={updateSharedState}
              tabState={salaryComparisonState}
              onTabStateChange={setSalaryComparisonState}
            />
          </div>
        )}

        {activeTab === 'yearly' && (
          <div className="mb-8">
            <YearlyComparison
              sharedState={sharedState}
              onStateChange={updateSharedState}
              tabState={yearlyState}
              onTabStateChange={setYearlyState}
            />
          </div>
        )}

        {activeTab === 'overtime' && (
          <div className="mb-8">
            <OvertimeCalculator
              sharedState={sharedState}
              onStateChange={updateSharedState}
              tabState={overtimeState}
              onTabStateChange={setOvertimeState}
            />
          </div>
        )}

        {activeTab === 'insurance' && (
          <div className="mb-8">
            <InsuranceBreakdown
              grossIncome={sharedState.declaredSalary ?? sharedState.grossIncome}
              region={sharedState.region}
              insuranceOptions={sharedState.insuranceOptions}
            />
          </div>
        )}

        {activeTab === 'other-income' && (
          <div className="mb-8">
            <OtherIncomeInput
              otherIncome={sharedState.otherIncome ?? DEFAULT_OTHER_INCOME}
              onChange={handleOtherIncomeChange}
            />
          </div>
        )}

        {activeTab === 'table' && (
          <div className="mb-8">
            <TaxBracketTable />
          </div>
        )}

        {/* Info section - always visible */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Những thay đổi chính
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Giảm từ 7 bậc xuống 5 bậc thuế</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Nới rộng khoảng cách giữa các bậc thuế</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Tăng giảm trừ bản thân: 11 triệu → 15,5 triệu/tháng</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Tăng giảm trừ người phụ thuộc: 4,4 triệu → 6,2 triệu/tháng</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Bậc thuế 35% áp dụng từ 100 triệu (thay vì 80 triệu)</span>
              </li>
            </ul>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Thời điểm áp dụng
            </h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold text-xs">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Từ 1/1/2026</p>
                  <p>Doanh nghiệp tạm tính và khấu trừ thuế theo mức mới</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold text-xs">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Từ 1/7/2026</p>
                  <p>Luật chính thức có hiệu lực</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold text-xs">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">1/1 - 31/3/2027</p>
                  <p>Quyết toán thuế năm 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 py-6 border-t">
          <p className="mb-2">
            Công cụ tính thuế TNCN dựa trên Luật Thuế thu nhập cá nhân sửa đổi, thông qua ngày 10/12/2025.
          </p>
          <p>
            Lưu ý: Đây chỉ là công cụ tham khảo. Vui lòng tham khảo ý kiến chuyên gia thuế cho trường hợp cụ thể.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <a
              href="https://nld.com.vn/thay-doi-lon-ve-bieu-thue-thu-nhap-ca-nhan-ap-dung-tu-1-7-2026-196251209194428594.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Nguồn tham khảo
            </a>
            <span>|</span>
            <a
              href="https://github.com/googlesky/thue-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
