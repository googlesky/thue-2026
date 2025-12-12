'use client';

import { useState, useCallback } from 'react';
import TaxInput from '@/components/TaxInput';
import TaxResult from '@/components/TaxResult';
import TaxChart from '@/components/TaxChart';
import TaxBracketTable from '@/components/TaxBracketTable';
import GrossNetConverter from '@/components/GrossNetConverter';
import InsuranceBreakdown from '@/components/InsuranceBreakdown';
import {
  calculateOldTax,
  calculateNewTax,
  TaxResult as TaxResultType,
  TaxInput as TaxInputType,
  RegionType,
  InsuranceOptions,
  DEFAULT_INSURANCE_OPTIONS,
} from '@/lib/taxCalculator';

type TabType = 'calculator' | 'gross-net' | 'insurance' | 'table';

// Shared state interface for all tabs
export interface SharedTaxState {
  grossIncome: number;
  declaredSalary?: number;
  dependents: number;
  otherDeductions: number;
  hasInsurance: boolean;
  insuranceOptions: InsuranceOptions;
  region: RegionType;
  pensionContribution: number;
}

const defaultSharedState: SharedTaxState = {
  grossIncome: 30_000_000,
  dependents: 0,
  otherDeductions: 0,
  hasInsurance: true,
  insuranceOptions: DEFAULT_INSURANCE_OPTIONS,
  region: 1,
  pensionContribution: 0,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');

  // Shared state across all tabs
  const [sharedState, setSharedState] = useState<SharedTaxState>(defaultSharedState);

  // Tax calculation results
  const [oldResult, setOldResult] = useState<TaxResultType>(() =>
    calculateOldTax(sharedState)
  );
  const [newResult, setNewResult] = useState<TaxResultType>(() =>
    calculateNewTax(sharedState)
  );

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

  const tabs = [
    { id: 'calculator' as TabType, label: 'Tính thuế', icon: '🧮' },
    { id: 'gross-net' as TabType, label: 'GROSS ⇄ NET', icon: '💰' },
    { id: 'insurance' as TabType, label: 'Bảo hiểm', icon: '🛡️' },
    { id: 'table' as TabType, label: 'Biểu thuế', icon: '📊' },
  ];

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
        </header>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap justify-center gap-2 bg-gray-100 p-2 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'calculator' && (
          <>
            {/* Main content */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-1">
                <TaxInput
                  onCalculate={handleCalculate}
                  initialValues={sharedState}
                />
              </div>
              <div className="lg:col-span-2">
                <TaxResult oldResult={oldResult} newResult={newResult} />
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

        {activeTab === 'insurance' && (
          <div className="mb-8">
            <InsuranceBreakdown
              grossIncome={sharedState.declaredSalary ?? sharedState.grossIncome}
              region={sharedState.region}
              insuranceOptions={sharedState.insuranceOptions}
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
              href="https://github.com"
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
