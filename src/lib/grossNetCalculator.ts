// Chuyển đổi GROSS - NET: dùng chung engine tính thuế tiền lương (taxCalculator)
import {
  RegionType,
  AllowancesState,
  InsuranceOptions,
  calculateNewTax,
  calculateOldTax,
} from './taxCalculator';
import { MAX_MONTHLY_INCOME } from '@/utils/inputSanitizers';

export interface GrossNetInput {
  amount: number;
  type: 'gross' | 'net';
  dependents: number;
  hasInsurance: boolean;
  useNewLaw: boolean;
  region?: RegionType;
  declaredSalary?: number; // Lương khai báo (nếu khác lương thực)
  allowances?: AllowancesState; // Phụ cấp
  insuranceOptions?: InsuranceOptions; // Bật/tắt từng loại BH (mặc định theo hasInsurance)
  otherDeductions?: number; // Từ thiện, nhân đạo...
  pensionContribution?: number; // Hưu trí tự nguyện, BH nhân thọ (engine chặn trần)
}

export interface GrossNetResult {
  gross: number;
  net: number;
  insurance: number;
  tax: number;
  deductions: {
    personal: number;
    dependent: number;
    insurance: number;
  };
  taxableIncome: number;
}

export function grossToNet(input: GrossNetInput): GrossNetResult {
  const { amount: gross, useNewLaw } = input;
  const r = (useNewLaw ? calculateNewTax : calculateOldTax)({
    grossIncome: gross,
    declaredSalary: input.declaredSalary,
    dependents: input.dependents,
    hasInsurance: input.hasInsurance,
    insuranceOptions: input.insuranceOptions,
    region: input.region ?? 1,
    allowances: input.allowances,
    otherDeductions: input.otherDeductions,
    pensionContribution: input.pensionContribution,
  });

  return {
    gross,
    net: r.netIncome,
    insurance: r.insuranceDeduction,
    tax: r.taxAmount,
    deductions: {
      personal: r.personalDeduction,
      dependent: r.dependentDeduction,
      insurance: r.insuranceDeduction,
    },
    taxableIncome: r.taxableIncome,
  };
}

export function netToGross(input: GrossNetInput): GrossNetResult {
  const { amount: targetNet } = input;

  // Binary search để tìm gross từ net.
  // Cận dưới = 0: có phụ cấp thì NET có thể lớn hơn GROSS (net = gross + phụ cấp - BH - thuế).
  let low = 0;
  let high = targetNet * 2; // Gross thường không quá 2 lần net
  const maxSearch = MAX_MONTHLY_INCOME * 2;
  let result: GrossNetResult | null = null;

  // Đảm bảo high đủ lớn
  while (grossToNet({ ...input, amount: high, type: 'gross' }).net < targetNet) {
    high *= 1.5;
    if (high > maxSearch) break; // Safety limit aligned with input cap
  }

  // Binary search
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const testResult = grossToNet({ ...input, amount: mid, type: 'gross' });

    if (Math.abs(testResult.net - targetNet) < 1) {
      result = testResult;
      break;
    }

    if (testResult.net < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }

  if (!result) {
    result = grossToNet({ ...input, amount: (low + high) / 2, type: 'gross' });
  }

  return result;
}
