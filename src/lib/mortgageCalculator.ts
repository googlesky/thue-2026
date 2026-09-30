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
 * Biểu phí lũy tiến 8 bậc, tối đa 70 triệu đồng
 */
export function calculateNotaryFee(propertyPrice: number): number {
  if (propertyPrice <= 0) return 0;

  // Biểu phí lũy tiến theo TT 257/2016: "Dưới 50 triệu" 50 nghìn; "Từ 50 triệu đến 100 triệu" 100 nghìn
  if (propertyPrice < 50_000_000) {
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

  // Phí công chứng theo biểu 8 bậc
  const notaryFee = calculateNotaryFee(propertyPrice);

  // Phí thẩm định: 0.15% số tiền vay, min 100k, max 5 triệu (không vay thì không thẩm định)
  const appraisalFee = loanAmount > 0
    ? Math.max(100_000, Math.min(loanAmount * 0.0015, 5_000_000))
    : 0;

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
 * Chuẩn hóa kỳ hạn dùng chung cho lịch trả nợ, độ nhạy và khả năng vay tối đa:
 * số kỳ = floor(năm × 12); ân hạn nguyên trong [0, số kỳ − 1]; ưu đãi (tháng) ≥ 0, bắt đầu sau ân hạn.
 */
function getTerms(input: MortgageInput) {
  const totalMonths = Math.max(0, Math.floor(input.loanTermYears * 12) || 0);
  const grace = Math.max(0, Math.min(Math.floor(input.gracePeriodMonths) || 0, totalMonths - 1));
  const preferentialEnd = Math.min(
    grace + Math.max(0, Math.floor(input.preferentialMonths) || 0),
    totalMonths
  );
  return { totalMonths, grace, preferentialEnd };
}

/**
 * Xây dựng bảng khấu hao chi tiết
 * Hỗ trợ: ân hạn gốc, 2 giai đoạn lãi suất, annuity + straight-line
 * Tính bằng đồng nguyên: tổng gốc = số vay, dư nợ cuối = 0 (kỳ cuối trả hết dư nợ còn lại).
 */
export function buildAmortizationSchedule(
  loanAmount: number,
  input: MortgageInput
): AmortizationRow[] {
  const { totalMonths, grace, preferentialEnd } = getTerms(input);
  const loan = Math.round(loanAmount);
  if (!(loan > 0) || totalMonths <= 0) return [];

  const repaymentMonths = totalMonths - grace; // ≥ 1
  const schedule: AmortizationRow[] = [];
  let balance = loan;
  let payment = 0; // Trả góp annuity của giai đoạn lãi suất hiện tại

  for (let month = 1; month <= totalMonths; month++) {
    const phase: AmortizationRow['phase'] =
      month <= grace ? 'grace' : month <= preferentialEnd ? 'preferential' : 'floating';
    // Ân hạn và giai đoạn ưu đãi dùng lãi suất ưu đãi
    const annualRate = phase === 'floating' ? input.floatingRate : input.preferentialRate;
    const interest = Math.round((balance * annualRate) / 1200);

    let principal: number;
    if (phase === 'grace') {
      principal = 0; // Chỉ trả lãi, không trả gốc
    } else if (month === totalMonths) {
      principal = balance; // Kỳ cuối: trả hết dư nợ (gồm sai số làm tròn)
    } else if (input.repaymentMethod === 'annuity') {
      // Đầu mỗi giai đoạn lãi suất: PMT trên dư nợ hiện tại và số kỳ CÒN LẠI
      // → tổng trả không đổi trong giai đoạn, trả hết gốc đúng hạn
      if (month === grace + 1 || month === preferentialEnd + 1) {
        payment = Math.round(calculatePMT(balance, annualRate, totalMonths - month + 1));
      }
      principal = payment - interest;
    } else {
      // Gốc đều: gốc lũy kế làm tròn theo số kỳ đã trả → không trôi sai số
      principal = Math.round((loan * (month - grace)) / repaymentMonths) - (loan - balance);
    }
    principal = Math.max(0, Math.min(principal, balance));
    balance -= principal;

    schedule.push({
      month,
      principal,
      interest,
      totalPayment: principal + interest,
      remainingBalance: balance,
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
 * Phân tích độ nhạy lãi suất thả nổi: mỗi kịch bản là một lịch trả nợ đầy đủ
 * (giữ ân hạn, giai đoạn ưu đãi, phương thức trả) với lãi thả nổi + 0/1/2%.
 * Trả về [] khi không vay hoặc ưu đãi phủ hết thời hạn (lãi thả nổi không áp dụng).
 */
function buildSensitivity(
  loanAmount: number,
  input: MortgageInput
): SensitivityScenario[] {
  const { totalMonths, preferentialEnd } = getTerms(input);
  if (loanAmount <= 0 || preferentialEnd >= totalMonths) return [];

  const scenarios = [0, 1, 2].map((delta) => {
    const rate = input.floatingRate + delta;
    const schedule = buildAmortizationSchedule(loanAmount, { ...input, floatingRate: rate });
    return {
      label: delta === 0 ? 'Hiện tại' : `+${delta}%`,
      rate,
      // Kỳ đầu giai đoạn thả nổi (tháng preferentialEnd + 1) — cao nhất của giai đoạn nếu gốc đều
      monthlyPayment: schedule[preferentialEnd]?.totalPayment ?? 0,
      totalInterest: schedule.reduce((sum, r) => sum + r.interest, 0),
    };
  });

  return scenarios.map((s) => ({
    ...s,
    differenceFromBase: s.monthlyPayment - scenarios[0].monthlyPayment,
  }));
}

/**
 * Hàm chính: Tính toán toàn bộ mortgage
 */
export function calculateMortgage(input: MortgageInput): MortgageResult {
  // Tính số tiền vay (đồng nguyên; % trả trước kẹp [0, 100], khoản vay ≥ 0)
  const propertyPrice = Math.max(0, Math.round(input.propertyPrice) || 0);
  const downPaymentPercent = Math.min(100, Math.max(0, input.downPaymentPercent || 0));
  const downPayment = Math.round((propertyPrice * downPaymentPercent) / 100);
  const loanAmount = Math.max(0, propertyPrice - downPayment);

  // Xây dựng bảng khấu hao
  const amortizationSchedule = buildAmortizationSchedule(loanAmount, input);
  const yearlyAmortization = groupByYear(amortizationSchedule);

  // Tính tổng lãi, tổng trả (gốc được trả đủ nên tổng trả = số vay + tổng lãi)
  const totalInterest = amortizationSchedule.reduce((sum, r) => sum + r.interest, 0);
  const totalPayment = loanAmount + totalInterest;

  // Trả góp giai đoạn ưu đãi (tháng đầu tiên sau ân hạn)
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

  // Khả năng vay tối đa (DTI 50%): kỳ trả cao nhất tính theo lãi thả nổi trên số kỳ trả gốc (sau ân hạn)
  const maxMonthlyForLoan = input.monthlyIncome * 0.5 - input.otherDebtPayments;
  const { totalMonths, grace } = getTerms(input);
  const repaymentMonths = totalMonths - grace;
  const monthlyRate = input.floatingRate / 1200;
  let maxLoanByIncome = 0;
  if (maxMonthlyForLoan > 0 && repaymentMonths > 0) {
    if (input.repaymentMethod === 'straight_line') {
      // Gốc đều: kỳ đầu cao nhất = L/n + L·r → L = M / (1/n + r)
      maxLoanByIncome = maxMonthlyForLoan / (1 / repaymentMonths + Math.max(0, monthlyRate));
    } else if (monthlyRate > 0) {
      maxLoanByIncome = (maxMonthlyForLoan * (1 - Math.pow(1 + monthlyRate, -repaymentMonths))) / monthlyRate;
    } else {
      maxLoanByIncome = maxMonthlyForLoan * repaymentMonths;
    }
  }

  // Phí mua nhà
  const fees = calculateFees(propertyPrice, loanAmount, input.propertyType);

  // Tổng chi phí ban đầu
  const totalUpfrontCost = downPayment + fees.total;

  // Phân tích độ nhạy
  const sensitivity = buildSensitivity(loanAmount, input);

  return {
    loanAmount,
    downPayment,
    preferentialPayment: preferentialPayment || gracePayment,
    floatingPayment,
    totalInterest,
    totalPayment,
    dtiRatio: Math.round(dtiRatio * 10) / 10,
    maxLoanByIncome: Math.round(maxLoanByIncome),
    fees,
    totalUpfrontCost: Math.round(totalUpfrontCost),
    amortizationSchedule,
    yearlyAmortization,
    sensitivity,
  };
}
