'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
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
import { AnnualSettlement } from '@/components/AnnualSettlement';
import TabNavigation, { type TabType } from '@/components/TabNavigation';
import { SaveShareButton } from '@/components/SaveShare';
import LawInfoModal from '@/components/ui/LawInfoModal';
import { TaxLawHistory } from '@/components/TaxLawHistory';
import { BonusCalculator } from '@/components/BonusCalculator';
import { ESOPCalculator } from '@/components/ESOPCalculator';
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
  AnnualSettlementTabState,
  BonusTabState,
  ESOPTabState,
  DEFAULT_OVERTIME_STATE,
  DEFAULT_ANNUAL_SETTLEMENT_STATE,
  DEFAULT_BONUS_STATE,
  DEFAULT_ESOP_STATE,
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

// Valid tab types for hash navigation
const VALID_TABS: TabType[] = [
  'calculator', 'gross-net', 'overtime', 'annual-settlement',
  'bonus-calculator', 'esop-calculator', 'employer-cost', 'freelancer',
  'salary-compare', 'yearly', 'insurance', 'other-income', 'table', 'tax-history'
];

export default function Home() {
  // Next.js hook for navigation tracking
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLawInfoOpen, setIsLawInfoOpen] = useState(false);

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
  const [annualSettlementState, setAnnualSettlementState] = useState<AnnualSettlementTabState>(DEFAULT_ANNUAL_SETTLEMENT_STATE);
  const [bonusState, setBonusState] = useState<BonusTabState>(DEFAULT_BONUS_STATE);
  const [esopState, setEsopState] = useState<ESOPTabState>(DEFAULT_ESOP_STATE);

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
    if (snapshot.tabs.annualSettlement) {
      setAnnualSettlementState(snapshot.tabs.annualSettlement);
    }
    if (snapshot.tabs.bonus) {
      setBonusState(snapshot.tabs.bonus);
    }
    if (snapshot.tabs.esop) {
      setEsopState(snapshot.tabs.esop);
    }
  }, []);

  // Helper function to handle hash navigation
  const handleHashNavigation = useCallback((hash: string) => {
    // Try to load from hash first (new snapshot format)
    if (hash.startsWith('#s=')) {
      const snapshot = decodeSnapshot(hash.slice(3));
      if (snapshot) {
        handleLoadSnapshot(snapshot);
        window.history.replaceState(null, '', window.location.pathname);
        return true;
      }
    }

    // Handle simple hash navigation (e.g., #gross-net, #overtime)
    if (hash.startsWith('#') && hash.length > 1) {
      const tabId = hash.slice(1) as TabType;
      if (VALID_TABS.includes(tabId)) {
        setActiveTab(tabId);
        // Don't clear the hash immediately - let it work for a moment
        // then clear it to keep URL clean
        setTimeout(() => {
          window.history.replaceState(null, '', window.location.pathname);
        }, 100);
        return true;
      }
    }

    return false;
  }, [handleLoadSnapshot]);

  // Load state from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const hash = window.location.hash;

      // Try hash navigation first
      if (handleHashNavigation(hash)) {
        setIsInitialized(true);
        return;
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
  }, [isInitialized, handleHashNavigation]);

  // Listen for hash changes (for navigation from 404 page and other client-side navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        handleHashNavigation(hash);
      }
    };

    // Listen to hashchange events
    window.addEventListener('hashchange', handleHashChange);

    // Also check on mount after initialization (for client-side navigation)
    if (isInitialized && window.location.hash) {
      handleHashNavigation(window.location.hash);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isInitialized, handleHashNavigation]);

  // Handle Next.js client-side navigation (pathname changes)
  // This catches navigation from 404 page when using Next.js Link component
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return;

    // Check if there's a hash after navigation
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      handleHashNavigation(hash);
    }
  }, [pathname, isInitialized, handleHashNavigation]);

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
      annualSettlement: annualSettlementState,
      bonus: bonusState,
      esop: esopState,
    },
    meta: {
      createdAt: Date.now(),
    },
  }), [sharedState, activeTab, employerCostState, freelancerState, salaryComparisonState, yearlyState, overtimeState, annualSettlementState, bonusState, esopState]);

  // Calculate other income tax
  const otherIncomeTax = sharedState.otherIncome
    ? calculateOtherIncomeTax(sharedState.otherIncome)
    : null;

  return (
    <main className="min-h-screen py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header - Compact */}
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20" role="img" aria-label="Calculator icon">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Tính Thuế TNCN 2026
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  So sánh luật cũ (7 bậc) và mới (5 bậc) từ 1/7/2026
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 mr-2">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  7 bậc
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-primary-50 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                  5 bậc
                </span>
              </div>
              <button
                onClick={() => setIsLawInfoOpen(true)}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Thông tin luật thuế 2026"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <SaveShareButton
                snapshot={currentSnapshot}
                onLoadSnapshot={handleLoadSnapshot}
              />
            </div>
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

        {activeTab === 'annual-settlement' && (
          <div className="mb-8">
            <AnnualSettlement
              sharedState={sharedState}
              onStateChange={updateSharedState}
              tabState={annualSettlementState}
              onTabStateChange={setAnnualSettlementState}
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

        {activeTab === 'bonus-calculator' && (
          <div className="mb-8">
            <BonusCalculator
              sharedState={sharedState}
              onStateChange={updateSharedState}
              tabState={bonusState}
              onTabStateChange={setBonusState}
            />
          </div>
        )}

        {activeTab === 'esop-calculator' && (
          <div className="mb-8">
            <ESOPCalculator
              sharedState={sharedState}
              onStateChange={updateSharedState}
              tabState={esopState}
              onTabStateChange={setEsopState}
            />
          </div>
        )}

        {activeTab === 'tax-history' && (
          <div className="mb-8">
            <TaxLawHistory />
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
          <p>
            Công cụ tham khảo dựa trên Luật Thuế TNCN sửa đổi 10/12/2025 ·{' '}
            <button
              onClick={() => setIsLawInfoOpen(true)}
              className="text-primary-600 hover:underline"
            >
              Xem chi tiết
            </button>
            {' · '}
            <a
              href="https://github.com/googlesky/thue-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>

      {/* Law Info Modal */}
      <LawInfoModal isOpen={isLawInfoOpen} onClose={() => setIsLawInfoOpen(false)} />
    </main>
  );
}
