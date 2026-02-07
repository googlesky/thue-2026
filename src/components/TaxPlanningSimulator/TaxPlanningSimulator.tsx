'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import {
  SimulationBaseInput,
  SimulationResult,
  BonusTaxResult,
  YearlyProjectionResult,
  generateSalaryAdjustmentScenarios,
  getSalaryAdjustmentPresets,
  generateDependentChangeScenarios,
  getDependentChangePresets,
  calculateBonusTaxScenarios,
  generateMultiYearProjection,
  runSimulations,
  findOptimalBonusStrategy,
  SalaryAdjustmentParams,
  DependentChangeParams,
} from '@/lib/taxPlanningSimulator';
import { formatNumber } from '@/lib/taxCalculator';

// ===== TYPES =====

interface TaxPlanningSimulatorProps {
  input: SimulationBaseInput;
}

type SimulatorTab = 'salary' | 'dependents' | 'bonus' | 'projection';

// ===== ICONS =====

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ===== TAB BUTTON COMPONENT =====

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ===== RESULT CARD COMPONENT =====

interface ResultCardProps {
  title: string;
  subtitle?: string;
  grossIncome: number;
  taxAmount: number;
  netIncome: number;
  effectiveRate: number;
  isOptimal?: boolean;
  comparison?: {
    taxChange: number;
    netChange: number;
  };
}

const ResultCard = memo(function ResultCard({
  title,
  subtitle,
  grossIncome,
  taxAmount,
  netIncome,
  effectiveRate,
  isOptimal,
  comparison,
}: ResultCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isOptimal
          ? 'bg-green-50 border-green-200 ring-1 ring-green-300'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            {title}
            {isOptimal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircleIcon className="w-3 h-3" />
                Tối ưu
              </span>
            )}
          </h4>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500">Thu nhập</div>
          <div className="font-semibold text-gray-800">
            {formatNumber(grossIncome)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Thuế/tháng</div>
          <div className="font-semibold text-red-600">
            {formatNumber(taxAmount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Thực nhận</div>
          <div className="font-semibold text-green-600">
            {formatNumber(netIncome)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Thuế suất</div>
          <div className="font-semibold text-gray-800">
            {effectiveRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {comparison && (comparison.taxChange !== 0 || comparison.netChange !== 0) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 text-xs">
            {comparison.taxChange !== 0 && (
              <span
                className={`px-2 py-1 rounded ${
                  comparison.taxChange < 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                Thuế: {comparison.taxChange > 0 ? '+' : ''}
                {formatNumber(comparison.taxChange)}
              </span>
            )}
            {comparison.netChange !== 0 && (
              <span
                className={`px-2 py-1 rounded ${
                  comparison.netChange > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                Thực nhận: {comparison.netChange > 0 ? '+' : ''}
                {formatNumber(comparison.netChange)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ===== SALARY ADJUSTMENT TAB =====

interface SalaryAdjustmentTabProps {
  input: SimulationBaseInput;
  baselineResult: SimulationResult | null;
}

function SalaryAdjustmentTab({ input, baselineResult }: SalaryAdjustmentTabProps) {
  const [customAdjustment, setCustomAdjustment] = useState<number>(10);
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'amount'>('percentage');

  const presets = getSalaryAdjustmentPresets();

  const scenarios = useMemo(() => {
    const allAdjustments: SalaryAdjustmentParams[] = [
      ...presets,
      { adjustmentType, value: customAdjustment },
    ];
    return generateSalaryAdjustmentScenarios(input, allAdjustments);
  }, [input, presets, customAdjustment, adjustmentType]);

  const results = useMemo(() => runSimulations(input, scenarios), [input, scenarios]);

  const baselineTax = baselineResult?.newTax;

  return (
    <div className="space-y-4">
      {/* Custom adjustment input */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-800 mb-3">
          Tùy chỉnh mức điều chỉnh
        </h4>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Loại</label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as 'percentage' | 'amount')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
            >
              <option value="percentage">Phần trăm (%)</option>
              <option value="amount">Số tiền (VND)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">
              Giá trị
            </label>
            <input
              type="number"
              value={customAdjustment}
              onChange={(e) => setCustomAdjustment(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
              placeholder={adjustmentType === 'percentage' ? 'VD: 15' : 'VD: 5000000'}
            />
          </div>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <ResultCard
            key={result.scenario.id}
            title={result.scenario.name}
            subtitle={result.scenario.description}
            grossIncome={result.newTax.grossIncome}
            taxAmount={result.newTax.taxAmount}
            netIncome={result.newTax.netIncome}
            effectiveRate={result.newTax.effectiveRate}
            comparison={
              baselineTax
                ? {
                    taxChange: result.newTax.taxAmount - baselineTax.taxAmount,
                    netChange: result.newTax.netIncome - baselineTax.netIncome,
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

// ===== DEPENDENT CHANGES TAB =====

interface DependentChangesTabProps {
  input: SimulationBaseInput;
  baselineResult: SimulationResult | null;
}

function DependentChangesTab({ input, baselineResult }: DependentChangesTabProps) {
  const [customChange, setCustomChange] = useState<number>(1);
  const [changeType, setChangeType] = useState<'add' | 'remove'>('add');

  const presets = getDependentChangePresets(input.dependents);

  const scenarios = useMemo(() => {
    const allChanges: DependentChangeParams[] = [
      ...presets,
      { changeType, count: customChange },
    ];
    return generateDependentChangeScenarios(input, allChanges);
  }, [input, presets, customChange, changeType]);

  const results = useMemo(() => runSimulations(input, scenarios), [input, scenarios]);

  const baselineTax = baselineResult?.newTax;

  return (
    <div className="space-y-4">
      {/* Current dependents info */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-blue-700">
          <UsersIcon className="w-5 h-5" />
          <span className="font-medium">
            Hiện tại: {input.dependents} người phụ thuộc
          </span>
        </div>
      </div>

      {/* Custom change input */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-800 mb-3">
          Tùy chỉnh thay đổi
        </h4>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Loại</label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value as 'add' | 'remove')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
            >
              <option value="add">Thêm người phụ thuộc</option>
              <option value="remove">Bớt người phụ thuộc</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Số người</label>
            <input
              type="number"
              min={1}
              max={10}
              value={customChange}
              onChange={(e) => setCustomChange(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <ResultCard
            key={result.scenario.id}
            title={result.scenario.name}
            subtitle={result.scenario.description}
            grossIncome={result.newTax.grossIncome}
            taxAmount={result.newTax.taxAmount}
            netIncome={result.newTax.netIncome}
            effectiveRate={result.newTax.effectiveRate}
            comparison={
              baselineTax
                ? {
                    taxChange: result.newTax.taxAmount - baselineTax.taxAmount,
                    netChange: result.newTax.netIncome - baselineTax.netIncome,
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

// ===== BONUS SCENARIOS TAB =====

interface BonusScenariosTabProps {
  input: SimulationBaseInput;
}

function BonusScenariosTab({ input }: BonusScenariosTabProps) {
  const [annualBonus, setAnnualBonus] = useState<number>(input.grossIncome * 2); // Default: 2 tháng lương

  const results = useMemo(
    () => calculateBonusTaxScenarios(input, { annualBonus }, true),
    [input, annualBonus]
  );

  const optimalStrategy = findOptimalBonusStrategy(results);

  return (
    <div className="space-y-4">
      {/* Bonus input */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-800 mb-3">
          Tổng thưởng năm
        </h4>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <input
              type="number"
              value={annualBonus}
              onChange={(e) => setAnnualBonus(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800"
              placeholder="VD: 50000000"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAnnualBonus(input.grossIncome)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              1 tháng
            </button>
            <button
              onClick={() => setAnnualBonus(input.grossIncome * 2)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              2 tháng
            </button>
            <button
              onClick={() => setAnnualBonus(input.grossIncome * 3)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              3 tháng
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          = {formatNumber(annualBonus)} VND ({(annualBonus / input.grossIncome).toFixed(1)} tháng lương)
        </p>
      </div>

      {/* Summary comparison */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {results.map((result) => {
          const isOptimal = optimalStrategy?.scenario === result.scenario;
          return (
            <div
              key={result.scenario}
              className={`p-4 rounded-lg border ${
                isOptimal
                  ? 'bg-green-50 border-green-200 ring-1 ring-green-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-800 text-sm">
                  {result.scenario}
                </h4>
                {isOptimal && (
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">{result.description}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tổng thuế năm:</span>
                  <span className="font-semibold text-red-600">
                    {formatNumber(result.totalTax)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Thực nhận năm:</span>
                  <span className="font-semibold text-green-600">
                    {formatNumber(result.totalNetIncome)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optimal strategy highlight */}
      {optimalStrategy && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-800">
                Chiến lược tối ưu: {optimalStrategy.scenario}
              </h4>
              <p className="text-sm text-green-700 mt-1">
                {optimalStrategy.description}
              </p>
              {results.length > 1 && (
                <p className="text-sm text-green-600 mt-2">
                  Tiết kiệm so với nhận 1 lần:{' '}
                  <span className="font-semibold">
                    {formatNumber(results[0].totalTax - optimalStrategy.totalTax)} VND/năm
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== MULTI-YEAR PROJECTION TAB =====

interface MultiYearProjectionTabProps {
  input: SimulationBaseInput;
}

function MultiYearProjectionTab({ input }: MultiYearProjectionTabProps) {
  const [yearsToProject, setYearsToProject] = useState<number>(5);
  const [annualSalaryIncrease, setAnnualSalaryIncrease] = useState<number>(8);
  const [inflationRate, setInflationRate] = useState<number>(4);

  const projection = useMemo(
    () =>
      generateMultiYearProjection(input, {
        yearsToProject,
        annualSalaryIncrease,
        inflationRate,
      }),
    [input, yearsToProject, annualSalaryIncrease, inflationRate]
  );

  const totalSavings = projection.reduce((sum, year) => sum + year.taxSavings, 0);

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-800 mb-3">Tham số dự báo</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Số năm dự báo
            </label>
            <select
              value={yearsToProject}
              onChange={(e) => setYearsToProject(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
            >
              {[1, 2, 3, 4, 5].map((year) => (
                <option key={year} value={year}>
                  {year} năm
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Tăng lương hàng năm (%)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={annualSalaryIncrease}
              onChange={(e) => setAnnualSalaryIncrease(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Lạm phát (%)
            </label>
            <input
              type="number"
              min={0}
              max={20}
              value={inflationRate}
              onChange={(e) => setInflationRate(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Projection table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                Năm
              </th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">
                Thu nhập/tháng
              </th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">
                Thuế 2026/tháng
              </th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">
                Thuế suất
              </th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">
                Tiết kiệm/năm
              </th>
              {inflationRate > 0 && (
                <th className="px-3 py-2 text-right text-gray-600 font-medium">
                  Giá trị thực
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {projection.map((year) => (
              <tr
                key={year.year}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-3 py-3 font-medium text-gray-800">
                  {year.year}
                </td>
                <td className="px-3 py-3 text-right text-gray-800">
                  {formatNumber(year.grossIncome)}
                </td>
                <td className="px-3 py-3 text-right text-red-600">
                  {formatNumber(year.newTax.monthly)}
                </td>
                <td className="px-3 py-3 text-right text-gray-600">
                  {year.newTax.effectiveRate.toFixed(1)}%
                </td>
                <td className="px-3 py-3 text-right text-green-600 font-medium">
                  {formatNumber(year.taxSavings)}
                </td>
                {inflationRate > 0 && (
                  <td className="px-3 py-3 text-right text-gray-500">
                    {year.realValue ? formatNumber(year.realValue) : '-'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td
                colSpan={4}
                className="px-3 py-3 text-right font-medium text-gray-800"
              >
                Tổng tiết kiệm (so với Luật cũ):
              </td>
              <td className="px-3 py-3 text-right font-bold text-green-600">
                {formatNumber(totalSavings)}
              </td>
              {inflationRate > 0 && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">Tóm tắt dự báo</h4>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="text-blue-700">
            <span className="text-blue-600">Lương năm cuối:</span>{' '}
            <span className="font-semibold">
              {formatNumber(projection[projection.length - 1]?.grossIncome || 0)} VND/tháng
            </span>
          </div>
          <div className="text-blue-700">
            <span className="text-blue-600">Tổng tiết kiệm {yearsToProject} năm:</span>{' '}
            <span className="font-semibold">{formatNumber(totalSavings)} VND</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====

function TaxPlanningSimulatorComponent({ input }: TaxPlanningSimulatorProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<SimulatorTab>('salary');

  // Calculate baseline for comparison
  const baselineResult = useMemo(() => {
    const scenarios = generateSalaryAdjustmentScenarios(input, [
      { adjustmentType: 'percentage', value: 0 },
    ]);
    const results = runSimulations(input, scenarios);
    return results[0] || null;
  }, [input]);

  const tabs: { id: SimulatorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'salary', label: 'Điều chỉnh lương', icon: <TrendingUpIcon className="w-4 h-4" /> },
    { id: 'dependents', label: 'Người phụ thuộc', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'bonus', label: 'Kịch bản thưởng', icon: <GiftIcon className="w-4 h-4" /> },
    { id: 'projection', label: 'Dự báo nhiều năm', icon: <CalendarIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="card bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-indigo-100">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200/50">
            <ChartIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Mô phỏng kế hoạch thuế
            </h3>
            <p className="text-sm text-gray-600">
              Phân tích What-If cho các kịch bản thuế
            </p>
          </div>
        </div>
        <div className="text-gray-400">
          {isCollapsed ? (
            <ChevronDownIcon className="w-6 h-6" />
          ) : (
            <ChevronUpIcon className="w-6 h-6" />
          )}
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="mt-4 space-y-4">
          {/* Tab navigation */}
          <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                icon={tab.icon}
                label={tab.label}
              />
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-[300px]">
            {activeTab === 'salary' && (
              <SalaryAdjustmentTab input={input} baselineResult={baselineResult} />
            )}
            {activeTab === 'dependents' && (
              <DependentChangesTab input={input} baselineResult={baselineResult} />
            )}
            {activeTab === 'bonus' && <BonusScenariosTab input={input} />}
            {activeTab === 'projection' && <MultiYearProjectionTab input={input} />}
          </div>

          {/* Disclaimer */}
          <div className="pt-3 border-t border-indigo-200/50">
            <p className="text-xs text-gray-500 italic text-center">
              Đây chỉ là mô phỏng ước tính. Kết quả thực tế có thể khác do nhiều yếu tố.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TaxPlanningSimulatorComponent);
