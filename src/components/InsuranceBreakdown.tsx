'use client';

import { formatCurrency, INSURANCE_RATES, EMPLOYER_INSURANCE_RATES, MAX_SOCIAL_INSURANCE_SALARY, getMaxUnemploymentInsuranceSalary, RegionType, getRegionalMinimumWages, InsuranceOptions, DEFAULT_INSURANCE_OPTIONS } from '@/lib/taxCalculator';

interface InsuranceBreakdownProps {
  grossIncome: number;
  region?: RegionType;
  insuranceOptions?: InsuranceOptions;
  declaredSalary?: number;
}

export default function InsuranceBreakdown({ grossIncome, region = 1, insuranceOptions = DEFAULT_INSURANCE_OPTIONS, declaredSalary }: InsuranceBreakdownProps) {
  // Sử dụng lương khai báo nếu có, ngược lại dùng lương thực tế
  const insuranceBaseSalary = declaredSalary ?? grossIncome;
  const hasDeclaredSalary = declaredSalary !== undefined && declaredSalary !== grossIncome;

  // Lấy constants theo ngày hiện tại (date-aware)
  const currentDate = new Date();
  const regionalMinimumWages = getRegionalMinimumWages(currentDate);
  const maxUnemploymentInsuranceSalary = getMaxUnemploymentInsuranceSalary(currentDate);

  // BHXH và BHYT: tối đa 20 lần lương cơ sở
  const bhxhBhytBase = Math.min(insuranceBaseSalary, MAX_SOCIAL_INSURANCE_SALARY);

  // BHTN: tối đa 20 lần lương tối thiểu vùng (date-aware)
  const maxBhtn = maxUnemploymentInsuranceSalary[region];
  const bhtnBase = Math.min(insuranceBaseSalary, maxBhtn);

  // Calculate based on enabled options
  const bhxh = insuranceOptions.bhxh ? bhxhBhytBase * INSURANCE_RATES.socialInsurance : 0;
  const bhyt = insuranceOptions.bhyt ? bhxhBhytBase * INSURANCE_RATES.healthInsurance : 0;
  const bhtn = insuranceOptions.bhtn ? bhtnBase * INSURANCE_RATES.unemploymentInsurance : 0;
  const total = bhxh + bhyt + bhtn;

  // Phần công ty đóng (based on enabled options)
  const companyBhxh = insuranceOptions.bhxh ? bhxhBhytBase * EMPLOYER_INSURANCE_RATES.socialInsurance : 0;
  const companyBhyt = insuranceOptions.bhyt ? bhxhBhytBase * EMPLOYER_INSURANCE_RATES.healthInsurance : 0;
  const companyBhtn = insuranceOptions.bhtn ? bhtnBase * EMPLOYER_INSURANCE_RATES.unemploymentInsurance : 0;
  const companyTotal = companyBhxh + companyBhyt + companyBhtn;

  // Calculate actual rates
  const employeeRate = (insuranceOptions.bhxh ? 8 : 0) + (insuranceOptions.bhyt ? 1.5 : 0) + (insuranceOptions.bhtn ? 1 : 0);
  const companyRate = (insuranceOptions.bhxh ? 17.5 : 0) + (insuranceOptions.bhyt ? 3 : 0) + (insuranceOptions.bhtn ? 1 : 0);
  const totalRate = employeeRate + companyRate;

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Chi tiết Bảo hiểm bắt buộc
      </h3>

      {/* Notice if using declared salary */}
      {hasDeclaredSalary && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Bảo hiểm được tính trên lương khai báo <span className="font-semibold">{formatCurrency(declaredSalary)}</span> (khác lương thực tế {formatCurrency(grossIncome)})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mức lương đóng BH */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Mức lương đóng BHXH, BHYT:</span>
          <span className="font-semibold">{formatCurrency(bhxhBhytBase)}</span>
        </div>
        {grossIncome > MAX_SOCIAL_INSURANCE_SALARY && (
          <p className="text-sm text-orange-600">
            * Tối đa 20 lần lương cơ sở ({formatCurrency(MAX_SOCIAL_INSURANCE_SALARY)})
          </p>
        )}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Mức lương đóng BHTN ({regionalMinimumWages[region].name}):</span>
          <span className="font-semibold">{formatCurrency(bhtnBase)}</span>
        </div>
        {grossIncome > maxBhtn && (
          <p className="text-sm text-orange-600">
            * Tối đa 20 lần lương tối thiểu vùng ({formatCurrency(maxBhtn)})
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Người lao động đóng */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
            Người lao động đóng
          </h4>
          <div className="space-y-3">
            <div className={`flex justify-between text-sm ${!insuranceOptions.bhxh ? 'opacity-40 line-through' : ''}`}>
              <span className="text-gray-600">BHXH (8%)</span>
              <span className="font-medium">{formatCurrency(bhxh)}</span>
            </div>
            <div className={`flex justify-between text-sm ${!insuranceOptions.bhyt ? 'opacity-40 line-through' : ''}`}>
              <span className="text-gray-600">BHYT (1.5%)</span>
              <span className="font-medium">{formatCurrency(bhyt)}</span>
            </div>
            <div className={`flex justify-between text-sm ${!insuranceOptions.bhtn ? 'opacity-40 line-through' : ''}`}>
              <span className="text-gray-600">BHTN (1%)</span>
              <span className="font-medium">{formatCurrency(bhtn)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold">Tổng ({employeeRate}%)</span>
              <span className="font-bold text-primary-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Công ty đóng */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Công ty đóng
          </h4>
          <div className="space-y-3">
            <div className={`flex justify-between text-sm ${!insuranceOptions.bhxh ? 'opacity-40 line-through' : ''}`}>
              <span className="text-gray-600">BHXH (17.5%)</span>
              <span className="font-medium">{formatCurrency(companyBhxh)}</span>
            </div>
            <div className={`flex justify-between text-sm ${!insuranceOptions.bhyt ? 'opacity-40 line-through' : ''}`}>
              <span className="text-gray-600">BHYT (3%)</span>
              <span className="font-medium">{formatCurrency(companyBhyt)}</span>
            </div>
            <div className={`flex justify-between text-sm ${!insuranceOptions.bhtn ? 'opacity-40 line-through' : ''}`}>
              <span className="text-gray-600">BHTN (1%)</span>
              <span className="font-medium">{formatCurrency(companyBhtn)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold">Tổng ({companyRate}%)</span>
              <span className="font-bold text-green-600">{formatCurrency(companyTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tổng chi phí */}
      <div className="mt-6 bg-gray-100 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Tổng chi phí bảo hiểm ({totalRate}%)</span>
          <span className="text-xl font-bold text-gray-800">{formatCurrency(total + companyTotal)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          = Chi phí thực của công ty cho mỗi nhân viên (ngoài lương Gross)
        </p>
      </div>
    </div>
  );
}
