// ===== MORTGAGE CALCULATOR - VAY MUA NHÀ =====
// Logic tính toán vay mua nhà Việt Nam

// ===== TYPES =====

export type PropertyType = 'secondary' | 'primary_developer';
export type RepaymentMethod = 'annuity' | 'straight_line';

export interface MortgageInput {
  propertyPrice: number;       // Giá nhà (VND)
  downPaymentPercent: number;  // % trả trước (0-100)
  loanTermYears: number;       // Thời hạn vay (năm)
  preferentialRate: number;    // Lãi suất ưu đãi (%/năm)
  preferentialMonths: number;  // Thời gian ưu đãi (tháng)
  floatingRate: number;        // Lãi suất thả nổi (%/năm)
  monthlyIncome: number;       // Thu nhập hàng tháng
  otherDebtPayments: number;   // Chi trả nợ khác/tháng
  gracePeriodMonths: number;   // Ân hạn vốn gốc (tháng)
  propertyType: PropertyType;
  repaymentMethod: RepaymentMethod;
}

export interface AmortizationRow {
  month: number;
  principal: number;      // Gốc trả trong kỳ
  interest: number;       // Lãi trả trong kỳ
  totalPayment: number;   // Tổng trả trong kỳ
  remainingBalance: number; // Dư nợ còn lại
  phase: 'grace' | 'preferential' | 'floating';
}

export interface YearlyAmortization {
  year: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  endingBalance: number;
}

export interface FeeBreakdown {
  registrationFee: number;    // Lệ phí trước bạ 0.5%
  notaryFee: number;          // Phí công chứng
  appraisalFee: number;       // Phí thẩm định
  maintenanceFee: number;     // Phí bảo trì (2% nếu CĐT)
  vat: number;                // VAT 10% phần xây dựng (nếu CĐT)
  total: number;
}

export interface SensitivityScenario {
  label: string;
  rate: number;
  monthlyPayment: number;
  differenceFromBase: number;
  totalInterest: number;
}

export interface MortgageResult {
  loanAmount: number;
  downPayment: number;
  preferentialPayment: number;  // Trả góp giai đoạn ưu đãi
  floatingPayment: number;     // Trả góp giai đoạn thả nổi
  totalInterest: number;
  totalPayment: number;        // Gốc + lãi
  dtiRatio: number;            // Debt-to-Income ratio (%)
  maxLoanByIncome: number;     // Khả năng vay tối đa
  fees: FeeBreakdown;
  totalUpfrontCost: number;    // Trả trước + phí
  amortizationSchedule: AmortizationRow[];
  yearlyAmortization: YearlyAmortization[];
  sensitivity: SensitivityScenario[];
}

// ===== DEFAULTS =====

export const MORTGAGE_DEFAULTS: MortgageInput = {
  propertyPrice: 3_000_000_000,
  downPaymentPercent: 30,
  loanTermYears: 20,
  preferentialRate: 7.0,
  preferentialMonths: 12,
  floatingRate: 10.5,
  monthlyIncome: 30_000_000,
  otherDebtPayments: 0,
  gracePeriodMonths: 0,
  propertyType: 'secondary',
  repaymentMethod: 'annuity',
};

export const PREFERENTIAL_PERIOD_OPTIONS = [6, 12, 18, 24, 36];

// ===== CALCULATION FUNCTIONS =====

/**
 * Tính PMT (Payment) - trả góp hàng tháng theo phương pháp annuity
 * PMT = P * r * (1+r)^n / ((1+r)^n - 1)
 */
export function calculatePMT(
  principal: number,
  annualRate: number,
  totalMonths: number
): number {
  if (principal <= 0 || totalMonths <= 0) return 0;
  if (annualRate <= 0) return principal / totalMonths;

  const monthlyRate = annualRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Biểu phí công chứng hợp đồng mua bán BĐS
 * Theo Thông tư 257/2016/TT-BTC (có hiệu lực từ 01/01/2017)
 * Biểu phí lũy tiến, tối đa 70 triệu đồng
 */
export function calculateNotaryFee(propertyPrice: number): number {
  if (propertyPrice <= 0) return 0;

  // Biểu phí lũy tiến theo TT 257/2016
  if (propertyPrice <= 50_000_000) {
    return 50_000;
  }
  if (propertyPrice <= 100_000_000) {
    return 100_000;
  }
  if (propertyPrice <= 1_000_000_000) {
    // 0.1% giá trị hợp đồng
    return propertyPrice * 0.001;
  }
  if (propertyPrice <= 3_000_000_000) {
    // 1.000.000 + 0.06% phần vượt 1 tỷ
    return 1_000_000 + (propertyPrice - 1_000_000_000) * 0.0006;
  }
  if (propertyPrice <= 5_000_000_000) {
    // 2.200.000 + 0.05% phần vượt 3 tỷ
    return 2_200_000 + (propertyPrice - 3_000_000_000) * 0.0005;
  }
  if (propertyPrice <= 10_000_000_000) {
    // 3.200.000 + 0.04% phần vượt 5 tỷ
    return 3_200_000 + (propertyPrice - 5_000_000_000) * 0.0004;
  }
  if (propertyPrice <= 100_000_000_000) {
    // 5.200.000 + 0.03% phần vượt 10 tỷ
    return Math.min(
      5_200_000 + (propertyPrice - 10_000_000_000) * 0.0003,
      70_000_000
    );
  }
  // > 100 tỷ: 32.200.000 + 0.02% phần vượt 100 tỷ, tối đa 70 triệu
  return Math.min(
    32_200_000 + (propertyPrice - 100_000_000_000) * 0.0002,
    70_000_000
  );
}

/**
 * Tính tổng phí mua nhà
 */
export function calculateFees(
  propertyPrice: number,
  loanAmount: number,
  propertyType: PropertyType
): FeeBreakdown {
  // Lệ phí trước bạ: 0.5% giá trị nhà
  const registrationFee = propertyPrice * 0.005;

  // Phí công chứng theo biểu 7 bậc
  const notaryFee = calculateNotaryFee(propertyPrice);

  // Phí thẩm định: 0.15% số tiền vay, min 100k, max 5 triệu
  const rawAppraisalFee = loanAmount * 0.0015;
  const appraisalFee = Math.max(100_000, Math.min(rawAppraisalFee, 5_000_000));

  // Phí bảo trì: 2% giá trị nhà (chỉ khi mua từ CĐT)
  const maintenanceFee = propertyType === 'primary_developer'
    ? propertyPrice * 0.02
    : 0;

  // VAT: 10% phần xây dựng (~70% giá nhà) - chỉ khi mua từ CĐT
  // Phần đất được khấu trừ, không chịu VAT (thường ~30% giá nhà)
  // Tỷ lệ phần xây dựng thực tế dao động 50-80% tùy vị trí
  const vat = propertyType === 'primary_developer'
    ? propertyPrice * 0.7 * 0.1
    : 0;

  const total = registrationFee + notaryFee + appraisalFee + maintenanceFee + vat;

  return {
    registrationFee,
    notaryFee,
    appraisalFee,
    maintenanceFee,
    vat,
    total,
  };
}

/**
 * Xây dựng bảng khấu hao chi tiết
 * Hỗ trợ: ân hạn gốc, 2 giai đoạn lãi suất, annuity + straight-line
 */
export function buildAmortizationSchedule(
  loanAmount: number,
  input: MortgageInput
): AmortizationRow[] {
  if (loanAmount <= 0) return [];

  const totalMonths = input.loanTermYears * 12;
  const schedule: AmortizationRow[] = [];
  let balance = loanAmount;

  const gracePeriod = Math.min(input.gracePeriodMonths, totalMonths);
  const preferentialEnd = Math.min(
    gracePeriod + input.preferentialMonths,
    totalMonths
  );

  // Tổng số tháng thực sự trả gốc (trừ ân hạn)
  const repaymentMonths = totalMonths - gracePeriod;

  for (let month = 1; month <= totalMonths; month++) {
    let phase: AmortizationRow['phase'];
    let annualRate: number;
    let principal: number;
    let interest: number;

    if (month <= gracePeriod) {
      // Giai đoạn ân hạn: chỉ trả lãi, không trả gốc
      phase = 'grace';
      annualRate = input.preferentialRate;
      const monthlyRate = annualRate / 100 / 12;
      interest = balance * monthlyRate;
      principal = 0;
    } else if (month <= preferentialEnd) {
      // Giai đoạn ưu đãi
      phase = 'preferential';
      annualRate = input.preferentialRate;
      const monthlyRate = annualRate / 100 / 12;

      if (input.repaymentMethod === 'annuity') {
        // Annuity: tính PMT cho toàn bộ giai đoạn trả gốc còn lại
        const remainingRepaymentMonths = totalMonths - gracePeriod;
        // Nếu mới bắt đầu trả gốc (tháng đầu sau ân hạn), tính PMT
        if (month === gracePeriod + 1) {
          // PMT cho giai đoạn ưu đãi dựa trên toàn bộ thời gian trả gốc
          // Nhưng chúng ta cần tính riêng cho từng giai đoạn
        }
        // PMT cho giai đoạn ưu đãi
        const monthsInPreferential = preferentialEnd - gracePeriod;
        const monthsAfter = totalMonths - preferentialEnd;

        // Tính PMT cho giai đoạn ưu đãi
        const pmt = calculatePMT(balance, annualRate, repaymentMonths);
        interest = balance * monthlyRate;
        principal = pmt - interest;
      } else {
        // Straight-line: gốc đều
        const monthlyPrincipal = loanAmount / repaymentMonths;
        principal = monthlyPrincipal;
        interest = balance * monthlyRate;
      }
    } else {
      // Giai đoạn thả nổi
      phase = 'floating';
      annualRate = input.floatingRate;
      const monthlyRate = annualRate / 100 / 12;

      if (input.repaymentMethod === 'annuity') {
        const remainingMonths = totalMonths - month + 1;
        // Tính lại PMT với dư nợ hiện tại và lãi suất mới
        const pmt = calculatePMT(balance, annualRate, remainingMonths);
        interest = balance * monthlyRate;
        principal = pmt - interest;
      } else {
        const monthlyPrincipal = loanAmount / repaymentMonths;
        principal = monthlyPrincipal;
        interest = balance * monthlyRate;
      }
    }

    // Đảm bảo principal không vượt quá balance
    principal = Math.min(principal, balance);
    if (principal < 0) principal = 0;

    const totalPayment = principal + interest;
    balance = balance - principal;

    // Fix floating point: nếu balance rất nhỏ, set về 0
    if (Math.abs(balance) < 1) balance = 0;

    schedule.push({
      month,
      principal: Math.round(principal),
      interest: Math.round(interest),
      totalPayment: Math.round(totalPayment),
      remainingBalance: Math.round(balance),
      phase,
    });
  }

  return schedule;
}

/**
 * Gộp bảng khấu hao theo năm
 */
export function groupByYear(schedule: AmortizationRow[]): YearlyAmortization[] {
  const years: YearlyAmortization[] = [];

  for (let i = 0; i < schedule.length; i += 12) {
    const yearRows = schedule.slice(i, i + 12);
    const year = Math.floor(i / 12) + 1;

    years.push({
      year,
      totalPrincipal: yearRows.reduce((sum, r) => sum + r.principal, 0),
      totalInterest: yearRows.reduce((sum, r) => sum + r.interest, 0),
      totalPayment: yearRows.reduce((sum, r) => sum + r.totalPayment, 0),
      endingBalance: yearRows[yearRows.length - 1].remainingBalance,
    });
  }

  return years;
}

/**
 * Phân tích độ nhạy lãi suất
 */
function buildSensitivity(
  loanAmount: number,
  input: MortgageInput
): SensitivityScenario[] {
  const baseRate = input.floatingRate;
  const scenarios = [0, 1, 2];
  const repaymentMonths = input.loanTermYears * 12 - input.gracePeriodMonths;

  // Tính base monthly payment (giai đoạn thả nổi)
  const basePmt = calculatePMT(loanAmount, baseRate, repaymentMonths);

  return scenarios.map((delta) => {
    const rate = baseRate + delta;
    const pmt = calculatePMT(loanAmount, rate, repaymentMonths);

    // Ước tính tổng lãi (simplified)
    const totalPayment = pmt * repaymentMonths;
    const totalInterest = totalPayment - loanAmount;

    return {
      label: delta === 0
        ? 'Hiện tại'
        : `+${delta}%`,
      rate,
      monthlyPayment: Math.round(pmt),
      differenceFromBase: Math.round(pmt - basePmt),
      totalInterest: Math.round(totalInterest),
    };
  });
}

/**
 * Hàm chính: Tính toán toàn bộ mortgage
 */
export function calculateMortgage(input: MortgageInput): MortgageResult {
  // Tính số tiền vay
  const downPayment = input.propertyPrice * (input.downPaymentPercent / 100);
  const loanAmount = input.propertyPrice - downPayment;

  // Xây dựng bảng khấu hao
  const amortizationSchedule = buildAmortizationSchedule(loanAmount, input);
  const yearlyAmortization = groupByYear(amortizationSchedule);

  // Tính tổng lãi, tổng trả
  const totalInterest = amortizationSchedule.reduce((sum, r) => sum + r.interest, 0);
  const totalPayment = amortizationSchedule.reduce((sum, r) => sum + r.totalPayment, 0);

  // Trả góp giai đoạn ưu đãi (tháng đầu tiên sau ân hạn)
  const gracePeriod = Math.min(input.gracePeriodMonths, input.loanTermYears * 12);
  const firstPreferentialRow = amortizationSchedule.find(r => r.phase === 'preferential');
  const preferentialPayment = firstPreferentialRow?.totalPayment ?? 0;

  // Trả góp giai đoạn thả nổi (tháng đầu tiên của floating)
  const firstFloatingRow = amortizationSchedule.find(r => r.phase === 'floating');
  const floatingPayment = firstFloatingRow?.totalPayment ?? 0;

  // Nếu chỉ có ân hạn, dùng grace payment
  const gracePayment = amortizationSchedule.find(r => r.phase === 'grace')?.totalPayment ?? 0;

  // DTI (Debt-to-Income ratio)
  const maxMonthlyPayment = Math.max(
    preferentialPayment || gracePayment,
    floatingPayment
  );
  const dtiRatio = input.monthlyIncome > 0
    ? ((maxMonthlyPayment + input.otherDebtPayments) / input.monthlyIncome) * 100
    : 0;

  // Khả năng vay tối đa (DTI 50%, thả nổi)
  const maxMonthlyForLoan = input.monthlyIncome * 0.5 - input.otherDebtPayments;
  const repaymentMonths = input.loanTermYears * 12 - input.gracePeriodMonths;
  let maxLoanByIncome = 0;
  if (maxMonthlyForLoan > 0 && input.floatingRate > 0) {
    const monthlyRate = input.floatingRate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, repaymentMonths);
    maxLoanByIncome = maxMonthlyForLoan * (factor - 1) / (monthlyRate * factor);
  } else if (maxMonthlyForLoan > 0) {
    maxLoanByIncome = maxMonthlyForLoan * repaymentMonths;
  }

  // Phí mua nhà
  const fees = calculateFees(input.propertyPrice, loanAmount, input.propertyType);

  // Tổng chi phí ban đầu
  const totalUpfrontCost = downPayment + fees.total;

  // Phân tích độ nhạy
  const sensitivity = buildSensitivity(loanAmount, input);

  return {
    loanAmount: Math.round(loanAmount),
    downPayment: Math.round(downPayment),
    preferentialPayment: Math.round(preferentialPayment || gracePayment),
    floatingPayment: Math.round(floatingPayment),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
    dtiRatio: Math.round(dtiRatio * 10) / 10,
    maxLoanByIncome: Math.round(maxLoanByIncome),
    fees,
    totalUpfrontCost: Math.round(totalUpfrontCost),
    amortizationSchedule,
    yearlyAmortization,
    sensitivity,
  };
}
