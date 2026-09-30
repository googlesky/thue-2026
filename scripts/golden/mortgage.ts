// Golden: vay mua nhà — lịch trả nợ luôn trả hết gốc, trả góp không đổi trong giai đoạn,
// chuẩn hóa ân hạn/khoản vay, độ nhạy khớp lịch, khả năng vay tối đa, phí công chứng TT 257/2016.
// Chạy: npm run test:golden (hoặc node --import tsx scripts/golden/<file> từ thư mục gốc)
import assert from 'node:assert/strict';
import {
  calculateMortgage,
  buildAmortizationSchedule,
  calculateNotaryFee,
  groupByYear,
  MORTGAGE_DEFAULTS,
  MortgageInput,
} from '@/lib/mortgageCalculator';

const D = MORTGAGE_DEFAULTS; // giá 3 tỷ, trả trước 30% → vay 2,1 tỷ; 20 năm; 7%/12 tháng; thả nổi 10,5%
const LOAN = 2_100_000_000;
const run = (p: Partial<MortgageInput>) => calculateMortgage({ ...D, ...p });

/** PMT dạng đóng, viết độc lập với engine: P·r / (1 − (1+r)^−n) */
const pmtRef = (P: number, annual: number, n: number) => {
  const r = annual / 1200;
  return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
};
/** Dư nợ sau k kỳ annuity (dạng đóng) */
const balRef = (P: number, annual: number, pmt: number, k: number) => {
  const r = annual / 1200;
  const f = Math.pow(1 + r, k);
  return P * f - (pmt * (f - 1)) / r;
};

// ---------- 1. Lỗi gốc: ưu đãi phủ hết thời hạn → trước đây còn nợ 765 triệu ----------
{
  const r = run({ loanTermYears: 1, preferentialMonths: 12 });
  const s = r.amortizationSchedule;
  assert.equal(s.length, 12);
  assert.equal(s[11].remainingBalance, 0, '1 năm/ưu đãi 12 tháng: dư nợ cuối = 0');
  assert.equal(s.reduce((a, x) => a + x.principal, 0), LOAN, 'tổng gốc = số vay');
  // PMT(2,1 tỷ; 7%; 12 kỳ) = 181.706.166,81 đ (tính Decimal 40 chữ số) — mọi kỳ bằng nhau (kỳ cuối lệch vài đồng làm tròn)
  const pmt = Math.round(pmtRef(LOAN, 7, 12));
  assert.equal(pmt, 181_706_167, `PMT tay ${pmt}`);
  for (const row of s.slice(0, 11)) assert.equal(row.totalPayment, pmt, `kỳ ${row.month} = PMT`);
  assert.ok(Math.abs(s[11].totalPayment - pmt) <= 12, 'kỳ cuối ≈ PMT');
  assert.ok(r.totalPayment > LOAN, '"Tổng phải trả" không nhỏ hơn số vay');
  assert.equal(r.totalPayment, LOAN + r.totalInterest);
  assert.equal(r.floatingPayment, 0);
  assert.deepEqual(r.sensitivity, [], 'không có giai đoạn thả nổi → ẩn độ nhạy');
}

// ---------- 2. Mặc định annuity: ưu đãi không đổi, thả nổi = PMT trên số kỳ còn lại ----------
{
  const r = run({});
  const s = r.amortizationSchedule;
  const pPref = pmtRef(LOAN, 7, 240); // 16.281.277,65
  assert.equal(r.preferentialPayment, 16_281_278);
  assert.equal(Math.round(pPref), 16_281_278);
  for (const row of s.slice(0, 12)) assert.equal(row.totalPayment, 16_281_278, 'ưu đãi không đổi 12 kỳ');
  const b12 = balRef(LOAN, 7, pPref, 12);
  const pFloat = Math.round(pmtRef(b12, 10.5, 228));
  assert.ok(Math.abs(r.floatingPayment - pFloat) <= 1, `thả nổi ${r.floatingPayment} vs tay ${pFloat}`);
  assert.equal(r.floatingPayment, 20_790_274);
  for (const row of s.slice(12, 239)) assert.equal(row.totalPayment, r.floatingPayment, `thả nổi kỳ ${row.month}`);
  assert.equal(s[239].remainingBalance, 0);
  // Tổng lãi bookkeeping đồng nguyên lệch mô hình số thực < 1.000 đ trên 240 kỳ
  assert.ok(Math.abs(r.totalInterest - 2_835_557_764) < 1_000, `tổng lãi ${r.totalInterest}`);
  // DTI = 20.790.274 / 30.000.000 = 69,3%
  assert.equal(r.dtiRatio, 69.3);
}

// ---------- 3. Gốc đều mặc định (tính tay) ----------
{
  const r = run({ repaymentMethod: 'straight_line' });
  // Kỳ 1: 2,1 tỷ/240 + 2,1 tỷ × 7%/12 = 8.750.000 + 12.250.000
  assert.equal(r.preferentialPayment, 21_000_000);
  // Kỳ 13: dư nợ 2,1 tỷ − 12 × 8,75 tr = 1,995 tỷ; lãi 1,995 tỷ × 10,5%/12 = 17.456.250; + 8.750.000
  assert.equal(r.floatingPayment, 26_206_250);
  const s = r.amortizationSchedule;
  for (const row of s) assert.equal(row.principal, 8_750_000, 'gốc đều 8,75 tr mỗi kỳ');
  assert.equal(s[239].remainingBalance, 0);
  // Khả năng vay tối đa gốc đều: M/(1/n + r) = 15 tr / (1/240 + 0,875%) = 1.161.290.323
  assert.equal(r.maxLoanByIncome, 1_161_290_323);
}

// ---------- 4. Khả năng vay tối đa annuity: M·(1 − (1+r)^−n)/r, n = kỳ trả gốc sau ân hạn ----------
{
  const r = run({});
  const rr = 10.5 / 1200;
  assert.equal(r.maxLoanByIncome, 1_502_434_113, '15 tr × (1 − 1,00875^−240)/0,00875 = 1.502.434.113,08');
  const g = run({ gracePeriodMonths: 12 });
  assert.equal(g.maxLoanByIncome, Math.round((15_000_000 * (1 - Math.pow(1 + rr, -228))) / rr));
  assert.equal(run({ floatingRate: 0 }).maxLoanByIncome, 15_000_000 * 240, 'lãi 0: M × n');
  assert.equal(run({ monthlyIncome: 0 }).maxLoanByIncome, 0);
}

// ---------- 5. Chuẩn hóa ân hạn: min(max(0, floor(g)), n − 1) ----------
{
  const big = run({ gracePeriodMonths: 999 });
  const s = big.amortizationSchedule;
  assert.equal(s.length, 240);
  assert.equal(s.filter((x) => x.phase === 'grace').length, 239, 'ân hạn kẹp còn 239 kỳ');
  assert.equal(s[0].totalPayment, 12_250_000, 'ân hạn chỉ trả lãi 2,1 tỷ × 7%/12');
  assert.equal(s[239].principal, LOAN);
  assert.equal(s[239].remainingBalance, 0);
  assert.deepEqual(run({ gracePeriodMonths: -5 }).amortizationSchedule, run({}).amortizationSchedule, 'ân hạn âm = 0');
  assert.deepEqual(run({ gracePeriodMonths: 1.5 }).amortizationSchedule, run({ gracePeriodMonths: 1 }).amortizationSchedule, 'ân hạn lẻ → floor');
  const g12 = run({ gracePeriodMonths: 12 }).amortizationSchedule;
  assert.equal(g12[11].phase, 'grace');
  assert.equal(g12[12].phase, 'preferential');
  assert.equal(g12[24].phase, 'floating', 'ưu đãi bắt đầu sau ân hạn');
}

// ---------- 6. Khoản vay ≥ 0, % trả trước ≤ 100 ----------
{
  const r = run({ downPaymentPercent: 120 });
  assert.equal(r.loanAmount, 0);
  assert.equal(r.downPayment, 3_000_000_000, 'trả trước kẹp 100%');
  assert.deepEqual(r.amortizationSchedule, []);
  assert.deepEqual(r.sensitivity, [], 'không vay → ẩn độ nhạy');
  assert.equal(r.fees.appraisalFee, 0, 'không vay → không có phí thẩm định');
  assert.equal(r.totalPayment, 0);
  // Trả trước theo VNĐ 1 tỷ / 3 tỷ = 33,33…% → vay đúng 2 tỷ
  assert.equal(run({ downPaymentPercent: (1_000_000_000 / 3_000_000_000) * 100 }).loanAmount, 2_000_000_000);
  assert.deepEqual(run({ loanTermYears: 0 }).amortizationSchedule, []);
}

// ---------- 7. Độ nhạy khớp lịch trả nợ ----------
{
  for (const method of ['annuity', 'straight_line'] as const) {
    const r = run({ repaymentMethod: method, gracePeriodMonths: 6 });
    const [base, p1, p2] = r.sensitivity;
    assert.equal(base.monthlyPayment, r.floatingPayment, `${method}: kịch bản hiện tại = trả góp sau ưu đãi`);
    assert.equal(base.totalInterest, r.totalInterest, `${method}: kịch bản hiện tại = tổng lãi`);
    const up1 = run({ repaymentMethod: method, gracePeriodMonths: 6, floatingRate: 11.5 });
    assert.equal(p1.monthlyPayment, up1.floatingPayment, `${method}: +1% = lịch với lãi 11,5%`);
    assert.equal(p1.totalInterest, up1.totalInterest);
    assert.equal(p1.differenceFromBase, up1.floatingPayment - r.floatingPayment);
    assert.equal(p2.rate, 12.5);
    assert.ok(p2.monthlyPayment > p1.monthlyPayment && p1.monthlyPayment > base.monthlyPayment);
  }
}

// ---------- 8. Bất biến trên lưới cấu hình ----------
{
  let cases = 0;
  for (const loanTermYears of [1, 2, 3, 5, 15, 20, 30])
    for (const preferentialMonths of [6, 12, 18, 24, 36])
      for (const gracePeriodMonths of [0, 6, 12, 60])
        for (const repaymentMethod of ['annuity', 'straight_line'] as const)
          for (const [preferentialRate, floatingRate] of [[7, 10.5], [0, 0], [8.3, 12.75]]) {
            const input = { ...D, loanTermYears, preferentialMonths, gracePeriodMonths, repaymentMethod, preferentialRate, floatingRate, propertyPrice: 4_567_891_234 };
            const r = calculateMortgage(input);
            const s = r.amortizationSchedule;
            const tag = JSON.stringify({ loanTermYears, preferentialMonths, gracePeriodMonths, repaymentMethod, preferentialRate });
            assert.equal(s.length, loanTermYears * 12, tag);
            assert.equal(s[s.length - 1].remainingBalance, 0, `dư nợ cuối = 0 ${tag}`);
            assert.equal(s.reduce((a, x) => a + x.principal, 0), r.loanAmount, `tổng gốc = số vay ${tag}`);
            assert.equal(r.totalPayment, r.loanAmount + r.totalInterest, tag);
            assert.ok(s.every((x) => x.principal >= 0 && x.interest >= 0 && x.remainingBalance >= 0), tag);
            if (repaymentMethod === 'annuity') {
              // Trả góp không đổi trong cùng giai đoạn lãi suất (trừ kỳ cuối hấp thụ làm tròn)
              for (let i = 1; i < s.length - 1; i++)
                if (s[i].phase === s[i - 1].phase && s[i].phase !== 'grace')
                  assert.equal(s[i].totalPayment, s[i - 1].totalPayment, `annuity đổi giữa giai đoạn ${tag} kỳ ${i + 1}`);
            } else {
              const repay = s.filter((x) => x.phase !== 'grace');
              const lo = Math.min(...repay.map((x) => x.principal));
              const hi = Math.max(...repay.map((x) => x.principal));
              assert.ok(hi - lo <= 1, `gốc đều lệch ≤ 1 đ ${tag}`);
            }
            const y = groupByYear(s);
            assert.equal(y.reduce((a, x) => a + x.totalInterest, 0), r.totalInterest, tag);
            assert.equal(y[y.length - 1].endingBalance, 0, tag);
            cases++;
          }
  console.log('grid cases', cases);
}

// ---------- 9. buildAmortizationSchedule gọi trực tiếp với số vay lẻ ----------
{
  const s = buildAmortizationSchedule(1_000_000_000.4, { ...D, loanTermYears: 10 });
  assert.equal(s.reduce((a, x) => a + x.principal, 0), 1_000_000_000);
  assert.deepEqual(buildAmortizationSchedule(-5, D), []);
}

// ---------- 10. Phí công chứng TT 257/2016 (8 bậc, tối đa 70 tr) ----------
{
  const f = (v: number) => Math.round(calculateNotaryFee(v));
  assert.equal(f(49_999_999), 50_000, 'dưới 50 tr');
  assert.equal(f(50_000_000), 100_000, 'đúng 50 tr: "từ 50 triệu đến 100 triệu" 100 nghìn');
  assert.equal(f(100_000_000), 100_000);
  assert.equal(f(500_000_000), 500_000, '0,1%');
  assert.equal(f(1_000_000_000), 1_000_000);
  assert.equal(f(3_000_000_000), 2_200_000, '1 tr + 0,06% × 2 tỷ');
  assert.equal(f(5_000_000_000), 3_200_000, '2,2 tr + 0,05% × 2 tỷ');
  assert.equal(f(10_000_000_000), 5_200_000, '3,2 tr + 0,04% × 5 tỷ');
  assert.equal(f(100_000_000_000), 32_200_000, '5,2 tr + 0,03% × 90 tỷ');
  assert.equal(f(300_000_000_000), 70_000_000, '32,2 tr + 0,02% × 200 tỷ = 72,2 tr → trần 70 tr');
  assert.equal(f(0), 0);
}

console.log('MORTGAGE OK');
