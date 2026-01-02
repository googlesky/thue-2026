'use client';

import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';

// Critical components - loaded immediately (used on default tab)
import TaxInput from '@/components/TaxInput';
import TaxResult from '@/components/TaxResult';
import TabNavigation, { type TabType } from '@/components/TabNavigation';
import { SaveShareButton } from '@/components/SaveShare';
import LawInfoModal from '@/components/ui/LawInfoModal';
import LoadingSpinner, { TabLoadingSkeleton, ChartLoadingSkeleton } from '@/components/ui/LoadingSpinner';

// Lazy-loaded components for better code splitting
const TaxChart = lazy(() => import('@/components/TaxChart'));
const TaxBracketTable = lazy(() => import('@/components/TaxBracketTable'));
const GrossNetConverter = lazy(() => import('@/components/GrossNetConverter'));
const InsuranceBreakdown = lazy(() => import('@/components/InsuranceBreakdown'));
const OtherIncomeInput = lazy(() => import('@/components/OtherIncomeInput'));
const YearlyComparison = lazy(() => import('@/components/YearlyComparison').then(m => ({ default: m.YearlyComparison })));
const EmployerCostCalculator = lazy(() => import('@/components/EmployerCostCalculator'));
const FreelancerComparison = lazy(() => import('@/components/FreelancerComparison').then(m => ({ default: m.FreelancerComparison })));
const SalaryComparison = lazy(() => import('@/components/SalaryComparison').then(m => ({ default: m.SalaryComparison })));
const OvertimeCalculator = lazy(() => import('@/components/OvertimeCalculator'));
const AnnualSettlement = lazy(() => import('@/components/AnnualSettlement').then(m => ({ default: m.AnnualSettlement })));
const TaxLawHistory = lazy(() => import('@/components/TaxLawHistory').then(m => ({ default: m.TaxLawHistory })));
const BonusCalculator = lazy(() => import('@/components/BonusCalculator').then(m => ({ default: m.BonusCalculator })));
const ESOPCalculator = lazy(() => import('@/components/ESOPCalculator').then(m => ({ default: m.ESOPCalculator })));
const PensionCalculator = lazy(() => import('@/components/PensionCalculator'));
const TaxOptimizationTips = lazy(() => import('@/components/TaxOptimizationTips').then(m => ({ default: m.TaxOptimizationTips })));
const SalarySlipGenerator = lazy(() => import('@/components/SalarySlip').then(m => ({ default: m.SalarySlipGenerator })));
const TaxCalendar = lazy(() => import('@/components/TaxCalendar').then(m => ({ default: m.TaxCalendar })));
const ForeignerTaxCalculator = lazy(() => import('@/components/ForeignerTaxCalculator').then(m => ({ default: m.ForeignerTaxCalculator })));
const SecuritiesTaxCalculator = lazy(() => import('@/components/SecuritiesTaxCalculator').then(m => ({ default: m.SecuritiesTaxCalculator })));
const RentalIncomeTaxCalculator = lazy(() => import('@/components/RentalIncomeTaxCalculator').then(m => ({ default: m.RentalIncomeTaxCalculator })));
const HouseholdBusinessTaxCalculator = lazy(() => import('@/components/HouseholdBusinessTaxCalculator').then(m => ({ default: m.HouseholdBusinessTaxCalculator })));
const RealEstateTransferTaxCalculator = lazy(() => import('@/components/RealEstateTransferTaxCalculator').then(m => ({ default: m.RealEstateTransferTaxCalculator })));
const TaxExemptionChecker = lazy(() => import('@/components/TaxExemptionChecker').then(m => ({ default: m.TaxExemptionChecker })));
import Footer from '@/components/Footer';
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
  AllowancesState,
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
  PensionTabState,
  ForeignerTaxTabState,
  DEFAULT_OVERTIME_STATE,
  DEFAULT_ANNUAL_SETTLEMENT_STATE,
  DEFAULT_BONUS_STATE,
  DEFAULT_ESOP_STATE,
  DEFAULT_PENSION_STATE,
  DEFAULT_YEARLY_COMPARISON_STATE,
  DEFAULT_FOREIGNER_TAX_STATE,
} from '@/lib/snapshotTypes';
import { decodeSnapshot, decodeLegacyURLParams, encodeSnapshot } from '@/lib/snapshotCodec';
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
  'bonus-calculator', 'esop-calculator', 'foreigner-tax', 'securities', 'rental',
  'household-business', 'real-estate',
  'pension', 'employer-cost', 'freelancer',
  'salary-compare', 'yearly', 'insurance', 'other-income', 'table', 'tax-history',
  'tax-calendar', 'salary-slip', 'exemption-checker'
];

export default function Home() {
  // Next.js hook for navigation tracking
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLawInfoOpen, setIsLawInfoOpen] = useState(false);
  const [isLoadingFromURL, setIsLoadingFromURL] = useState(false);

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
  const [yearlyState, setYearlyState] = useState<YearlyComparisonTabState>(DEFAULT_YEARLY_COMPARISON_STATE);
  const [overtimeState, setOvertimeState] = useState<OvertimeTabState>(DEFAULT_OVERTIME_STATE);
  const [annualSettlementState, setAnnualSettlementState] = useState<AnnualSettlementTabState>(DEFAULT_ANNUAL_SETTLEMENT_STATE);
  const [bonusState, setBonusState] = useState<BonusTabState>(DEFAULT_BONUS_STATE);
  const [esopState, setEsopState] = useState<ESOPTabState>(DEFAULT_ESOP_STATE);
  const [pensionState, setPensionState] = useState<PensionTabState>(DEFAULT_PENSION_STATE);
  const [foreignerTaxState, setForeignerTaxState] = useState<ForeignerTaxTabState>(DEFAULT_FOREIGNER_TAX_STATE);

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
    if (snapshot.tabs.pension) {
      setPensionState(snapshot.tabs.pension);
    }
    if (snapshot.tabs.foreignerTax) {
      setForeignerTaxState(snapshot.tabs.foreignerTax);
    }
  }, []);

  // Helper function to handle hash navigation
  // Supports formats: #<tab>, #<tab>~<encoded>, #s=<encoded> (legacy)
  const handleHashNavigation = useCallback((hash: string) => {
    if (!hash || hash === '#') return false;

    const hashContent = hash.slice(1); // Remove '#'

    // Legacy format: #s=<encoded>
    if (hashContent.startsWith('s=')) {
      const snapshot = decodeSnapshot(hashContent.slice(2));
      if (snapshot) {
        setIsLoadingFromURL(true);
        handleLoadSnapshot(snapshot);
        // Let auto-update effect handle URL update after state is loaded
        setTimeout(() => setIsLoadingFromURL(false), 600);
        return true;
      }
    }

    // New format: #<tab>~<encoded> or #<tab>
    const tildeIndex = hashContent.indexOf('~');
    if (tildeIndex >= 0) {
      // Has encoded state: #<tab>~<encoded> or #~<encoded>
      const tabPart = tildeIndex > 0
        ? hashContent.slice(0, tildeIndex) as TabType
        : 'calculator';
      const encodedPart = hashContent.slice(tildeIndex + 1);

      if (VALID_TABS.includes(tabPart)) {
        setActiveTab(tabPart);

        if (encodedPart) {
          const snapshot = decodeSnapshot(encodedPart);
          if (snapshot) {
            setIsLoadingFromURL(true);
            // Load state but keep the tab from URL
            handleLoadSnapshot({ ...snapshot, activeTab: tabPart });
            setTimeout(() => setIsLoadingFromURL(false), 600);
          }
        }
        return true;
      }
    } else {
      // Simple tab navigation: #<tab>
      const tabId = hashContent as TabType;
      if (VALID_TABS.includes(tabId)) {
        setActiveTab(tabId);
        return true;
      }
    }

    return false;
  }, [handleLoadSnapshot]);

  // Handler for tab change - updates both state and URL
  // Don't preserve encoded state here - let auto-update effect handle it
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    // Update URL with just the tab - auto-update effect will add state if needed
    if (typeof window !== 'undefined') {
      const newURL = tab === 'calculator'
        ? window.location.pathname
        : `${window.location.pathname}#${tab}`;
      window.history.replaceState(null, '', newURL);
    }
  }, []);

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
          allowances: newState.allowances,
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
        allowances: newState.allowances,
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
      allowances?: AllowancesState;
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
      pension: pensionState,
      foreignerTax: foreignerTaxState,
    },
    meta: {
      createdAt: Date.now(),
    },
  }), [sharedState, activeTab, employerCostState, freelancerState, salaryComparisonState, yearlyState, overtimeState, annualSettlementState, bonusState, esopState, pensionState, foreignerTaxState]);

  // Auto-update URL when state changes (debounced)
  // Format: #<tab> (default state) or #<tab>~<encoded> (custom state)
  useEffect(() => {
    // Skip if not initialized, loading from URL, or not in browser
    if (!isInitialized || isLoadingFromURL || typeof window === 'undefined') return;

    const timeoutId = setTimeout(() => {
      const encoded = encodeSnapshot(currentSnapshot);

      // Check if state is basically default (encoded string is very short)
      // Short encoded = mostly defaults, just use simple tab hash
      if (encoded.length < 10) {
        // Use simple tab hash or clean URL for default tab
        const newURL = activeTab === 'calculator'
          ? window.location.pathname
          : `${window.location.pathname}#${activeTab}`;
        window.history.replaceState(null, '', newURL);
      } else {
        // Include both tab and encoded state: #<tab>~<encoded>
        const newURL = activeTab === 'calculator'
          ? `${window.location.pathname}#calculator~${encoded}`
          : `${window.location.pathname}#${activeTab}~${encoded}`;
        window.history.replaceState(null, '', newURL);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [currentSnapshot, isInitialized, isLoadingFromURL, activeTab]);

  // Reset to home (default state)
  const handleGoHome = useCallback(() => {
    setSharedState(defaultSharedState);
    setActiveTab('calculator');
    setEmployerCostState({ includeUnionFee: false, useNewLaw: true });
    setFreelancerState({ frequency: 'monthly', useNewLaw: true });
    setSalaryComparisonState({
      companies: [
        createDefaultCompanyOffer('company-1', 'Công ty A'),
        createDefaultCompanyOffer('company-2', 'Công ty B'),
      ],
      useNewLaw: true,
    });
    setYearlyState(DEFAULT_YEARLY_COMPARISON_STATE);
    setOvertimeState(DEFAULT_OVERTIME_STATE);
    setAnnualSettlementState(DEFAULT_ANNUAL_SETTLEMENT_STATE);
    setBonusState(DEFAULT_BONUS_STATE);
    setEsopState(DEFAULT_ESOP_STATE);
    setPensionState(DEFAULT_PENSION_STATE);
    setForeignerTaxState(DEFAULT_FOREIGNER_TAX_STATE);

    // Recalculate with default values
    setOldResult(calculateOldTax(defaultSharedState));
    setNewResult(calculateNewTax(defaultSharedState));

    // Clear URL
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Calculate other income tax
  const otherIncomeTax = sharedState.otherIncome
    ? calculateOtherIncomeTax(sharedState.otherIncome)
    : null;

  return (
    <main id="main-content" className="min-h-screen overflow-x-hidden" tabIndex={-1}>
      {/* Shared Header */}
      <Header variant="solid" />

      {/* Hero Banner - Visual connection to homepage */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title Section */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Tính Thuế TNCN 2026
              </h1>
              <p className="text-blue-200/80 text-sm sm:text-base">
                So sánh luật cũ (7 bậc) và mới (5 bậc) từ 1/1/2026
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-3 text-xs mr-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-200 rounded-full border border-red-500/30">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  7 bậc
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-200 rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  5 bậc
                </span>
              </div>
              <button
                onClick={handleGoHome}
                aria-label="Đặt lại các giá trị mặc định"
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Đặt lại mặc định"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setIsLawInfoOpen(true)}
                aria-label="Xem thông tin luật thuế 2026"
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Thông tin luật thuế 2026"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <SaveShareButton
                snapshot={currentSnapshot}
                onLoadSnapshot={handleLoadSnapshot}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          {/* Tab Navigation */}
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

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
                  declaredSalary={sharedState.declaredSalary}
                />
              </div>
            </div>

            {/* Tax Optimization Tips */}
            <div className="mb-8">
              <Suspense fallback={<TabLoadingSkeleton />}>
                <TaxOptimizationTips
                  input={{
                    grossIncome: sharedState.grossIncome,
                    dependents: sharedState.dependents,
                    hasInsurance: sharedState.hasInsurance,
                    insuranceOptions: sharedState.insuranceOptions,
                    region: sharedState.region,
                    otherDeductions: sharedState.otherDeductions,
                    pensionContribution: sharedState.pensionContribution,
                    allowances: sharedState.allowances,
                    declaredSalary: sharedState.declaredSalary,
                  }}
                />
              </Suspense>
            </div>

            {/* Chart - lazy loaded with chart-specific skeleton */}
            <div className="mb-8">
              <Suspense fallback={<ChartLoadingSkeleton />}>
                <TaxChart dependents={sharedState.dependents} currentIncome={sharedState.grossIncome} />
              </Suspense>
            </div>
          </>
        )}

        {activeTab === 'gross-net' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <GrossNetConverter
                sharedState={sharedState}
                onStateChange={updateSharedState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'employer-cost' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <EmployerCostCalculator
                sharedState={sharedState}
                onStateChange={updateSharedState}
                tabState={employerCostState}
                onTabStateChange={setEmployerCostState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'freelancer' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <FreelancerComparison
                sharedState={sharedState}
                onStateChange={updateSharedState}
                tabState={freelancerState}
                onTabStateChange={setFreelancerState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'salary-compare' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <SalaryComparison
                sharedState={sharedState}
                onStateChange={updateSharedState}
                tabState={salaryComparisonState}
                onTabStateChange={setSalaryComparisonState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'yearly' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <YearlyComparison
                sharedState={sharedState}
                onStateChange={updateSharedState}
                tabState={yearlyState}
                onTabStateChange={setYearlyState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'overtime' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <OvertimeCalculator
                sharedState={sharedState}
                onStateChange={updateSharedState}
                tabState={overtimeState}
                onTabStateChange={setOvertimeState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'annual-settlement' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <AnnualSettlement
                sharedState={sharedState}
                onStateChange={updateSharedState}
                tabState={annualSettlementState}
                onTabStateChange={setAnnualSettlementState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'insurance' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <InsuranceBreakdown
                grossIncome={sharedState.grossIncome}
                region={sharedState.region}
                insuranceOptions={sharedState.insuranceOptions}
                declaredSalary={sharedState.declaredSalary}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'other-income' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <OtherIncomeInput
                otherIncome={sharedState.otherIncome ?? DEFAULT_OTHER_INCOME}
                onChange={handleOtherIncomeChange}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'table' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <TaxBracketTable />
            </Suspense>
          </div>
        )}

        {activeTab === 'bonus-calculator' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <BonusCalculator
                sharedState={sharedState}
                onStateChange={updateSharedState}
                tabState={bonusState}
                onTabStateChange={setBonusState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'esop-calculator' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <ESOPCalculator
                sharedState={sharedState}
                onStateChange={updateSharedState}
                tabState={esopState}
                onTabStateChange={setEsopState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'pension' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <PensionCalculator
                tabState={pensionState}
                onTabStateChange={setPensionState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'foreigner-tax' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <ForeignerTaxCalculator
                sharedState={sharedState}
                onStateChange={updateSharedState}
                tabState={foreignerTaxState}
                onTabStateChange={setForeignerTaxState}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'securities' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <SecuritiesTaxCalculator />
            </Suspense>
          </div>
        )}

        {activeTab === 'rental' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <RentalIncomeTaxCalculator />
            </Suspense>
          </div>
        )}

        {activeTab === 'household-business' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <HouseholdBusinessTaxCalculator />
            </Suspense>
          </div>
        )}

        {activeTab === 'real-estate' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <RealEstateTransferTaxCalculator />
            </Suspense>
          </div>
        )}

        {activeTab === 'exemption-checker' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <TaxExemptionChecker />
            </Suspense>
          </div>
        )}

        {activeTab === 'tax-history' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <TaxLawHistory />
            </Suspense>
          </div>
        )}

        {activeTab === 'tax-calendar' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <TaxCalendar />
            </Suspense>
          </div>
        )}

        {activeTab === 'salary-slip' && (
          <div className="mb-8">
            <Suspense fallback={<TabLoadingSkeleton />}>
              <SalarySlipGenerator
                sharedState={sharedState}
                onStateChange={updateSharedState}
                insuranceDetail={newResult.insuranceDetail}
                taxAmount={newResult.taxAmount}
              />
            </Suspense>
          </div>
        )}

        </div>
      </div>

      {/* Footer - Full width outside content area */}
      <Footer />

      {/* Law Info Modal */}
      <LawInfoModal isOpen={isLawInfoOpen} onClose={() => setIsLawInfoOpen(false)} />
    </main>
  );
}
