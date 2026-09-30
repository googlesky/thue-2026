import assert from 'node:assert/strict';
import {
  calculateRetirementAge, roundContributionYears, calculateBaseRate, calculatePension, validatePensionInput, PensionInput,
} from '@/lib/pensionCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const near = (a: number, b: number, msg: string, eps = 1e-6) => { assert.ok(Math.abs(a - b) < eps, `${msg}: ${a} vs ${b}`); n++; };
const age = (y: number, m: number) => ({ years: y, months: m });

// 1) Tuổi nghỉ hưu (BLLĐ Điều 169; bảng NĐ 135/2020)
eq(calculateRetirementAge(1972, 1, 'female'), age(58, 4), 'nữ 01/1972 → 58t4th (code cũ 57t8th)');
eq(calculateRetirementAge(1976, 1, 'female'), age(60, 0), 'nữ 1976 → 60t');
eq(calculateRetirementAge(1976, 12, 'female'), age(60, 0), 'nữ 12/1976 → 60t');
for (const m of [10, 11, 12]) eq(calculateRetirementAge(1964, m, 'male'), age(61, 6), `nam ${m}/1964 → 61t6th`);
eq(calculateRetirementAge(1964, 9, 'male'), age(61, 3), 'nam 9/1964 → 61t3th');
eq(calculateRetirementAge(1966, 1, 'male'), age(61, 9), 'nam 01/1966 → 61t9th (bảng NĐ 135: 07/1965–03/1966)');
eq(calculateRetirementAge(1966, 4, 'male'), age(62, 0), 'nam 04/1966 → 62t');
eq(calculateRetirementAge(1970, 1, 'male'), age(62, 0), 'nam 1970 → 62t');
eq(calculateRetirementAge(1955, 6, 'male'), age(60, 0), 'nam 1955 (trước 2021) → 60t');
eq(calculateRetirementAge(1966, 1, 'female'), age(55, 4), 'nữ 01/1966 → 55t4th');
// Nghề nặng nhọc, độc hại: thấp hơn 5 tuổi so với tuổi quy định tại thời điểm nghỉ hưu (Phụ lục II NĐ 135/2020)
eq(calculateRetirementAge(1966, 1, 'male', 5), age(55, 3), 'nam 01/1966 nặng nhọc → 55t3th');
eq(calculateRetirementAge(1966, 10, 'male', 5), age(55, 6), 'nam 10/1966 nặng nhọc → 55t6th');
eq(calculateRetirementAge(1971, 1, 'female', 5), age(50, 4), 'nữ 01/1971 nặng nhọc → 50t4th');
eq(calculateRetirementAge(1990, 1, 'male', 5), age(57, 0), 'nam 1990 nặng nhọc → 57t');

// Thời điểm: nữ 11/1973 đủ 59 tuổi vào 11/2032 → hưởng lương hưu từ 12/2032 (ví dụ Phụ lục NĐ 135/2020)
const p0: PensionInput = { gender: 'female', birthYear: 1973, birthMonth: 11, contributionStartYear: 2000, contributionYears: 25,
  contributionMonths: 0, currentMonthlySalary: 20_000_000, earlyRetirementYears: 0, isHazardousWork: false };
let r = calculatePension(p0);
eq([r.retirementAge, r.retirementMonth, r.retirementYear], [age(59, 0), 11, 2032], 'nữ 11/1973: tháng đủ tuổi 11/2032');

// 2) Làm tròn tháng lẻ (Điều 5.6) và tỷ lệ (Điều 66.1)
eq([roundContributionYears(15, 3), roundContributionYears(15, 6), roundContributionYears(15, 7), roundContributionYears(20, 0)], [15.5, 15.5, 16, 20], 'làm tròn');
near(calculateBaseRate(15, 'female'), 0.45, 'nữ 15 năm 45%');
near(calculateBaseRate(15.5, 'female'), 0.46, 'nữ 15,5 năm 46%');
near(calculateBaseRate(30, 'female'), 0.75, 'nữ 30 năm 75%');
near(calculateBaseRate(15, 'male'), 0.40, 'nam 15 năm 40%');
near(calculateBaseRate(19.5, 'male'), 0.445, 'nam 19,5 năm 44,5%');
near(calculateBaseRate(20, 'male'), 0.45, 'nam 20 năm 45%');
near(calculateBaseRate(35, 'male'), 0.75, 'nam 35 năm 75%');

// 3) Lương hưu: nữ 25 năm, bình quân 20tr → 65% = 13tr; hòa vốn = 20tr × 300 × 22% / (13tr × 12)
r = calculatePension({ ...p0, birthYear: 1972, birthMonth: 1 });
near(r.finalRate, 0.65, 'tỷ lệ 65%');
near(r.monthlyPension, 13_000_000, 'lương hưu 13tr', 1e-3);
near(r.totalContributed, 1_320_000_000, 'đóng quỹ 22%', 1e-3);
near(r.yearsToBreakeven, 1_320_000_000 / 156_000_000, 'hòa vốn');
eq(r.oneTimeAllowance, 0, 'không vượt 30 năm');
near(calculatePension({ ...p0, contributionMonths: 3 }).finalRate, 0.66, '25 năm 3 tháng → 25,5 năm → 66%');

// Trần: nam 20 năm, lương 60tr → bình quân 50,6tr × 45%
r = calculatePension({ ...p0, gender: 'male', contributionYears: 20, currentMonthlySalary: 60_000_000 });
eq([r.averageSalary, r.isSalaryCapped], [50_600_000, true], 'trần 50,6tr');
near(r.monthlyPension, 22_770_000, 'lương hưu 22,77tr', 1e-3);

// Sàn mức tham chiếu 2,53tr: tham gia trước 01/7/2025 + đủ 20 năm (NĐ 158/2025 Điều 13.1)
r = calculatePension({ ...p0, gender: 'male', contributionYears: 20, currentMonthlySalary: 5_000_000 });
eq([r.monthlyPension, r.isMinimumApplied], [2_530_000, true], 'sàn 2,53tr');
r = calculatePension({ ...p0, gender: 'male', contributionYears: 20, currentMonthlySalary: 5_000_000, contributionStartYear: 2025 });
near(r.monthlyPension, 2_250_000, 'tham gia 2025: không sàn', 1e-3);
r = calculatePension({ ...p0, contributionYears: 19, currentMonthlySalary: 4_000_000 });
eq(r.isMinimumApplied, false, 'dưới 20 năm: không sàn');

// 4) Nghỉ trước tuổi: có giảm (Điều 65, 66.3) vs nghề nặng nhọc không giảm (Điều 64.1.b)
r = calculatePension({ ...p0, earlyRetirementYears: 2 });
near(r.finalRate, 0.65 - 0.04, 'giảm 4%');
eq([r.retirementAge, r.retirementMonth, r.retirementYear], [age(56, 0), 11, 2029], 'nữ 11/1973 nghỉ trước 2 năm: năm 2029 tuổi quy định 58t → 56t, tháng 11/2029');
r = calculatePension({ ...p0, earlyRetirementYears: 5, isHazardousWork: true });
near(r.finalRate, 0.65, 'nặng nhọc: không giảm');
eq(validatePensionInput({ ...p0, contributionYears: 19, earlyRetirementYears: 2 }).length, 1, 'nghỉ sớm có giảm cần 20 năm');
eq(validatePensionInput({ ...p0, contributionYears: 16, earlyRetirementYears: 2, isHazardousWork: true }), [], 'nặng nhọc 16 năm: hợp lệ');

// 5) Trợ cấp một lần (Điều 68): nam 38 năm → 3 năm × 0,5 × 20tr = 30tr
r = calculatePension({ ...p0, gender: 'male', birthYear: 1970, birthMonth: 1, contributionStartYear: 1990, contributionYears: 38 });
near(r.oneTimeAllowance, 30_000_000, 'nam 38 năm: 30tr', 1e-3);
// Nữ 01/1972 đủ tuổi 05/2030; đóng 1995 → hết 12/2032 (38 năm): 2 năm 8 tháng sau tuổi → 3 năm × 2 tháng + 5 năm × 0,5
r = calculatePension({ ...p0, birthYear: 1972, birthMonth: 1, contributionStartYear: 1995, contributionYears: 38 });
eq([r.retirementMonth, r.retirementYear, r.doubledAllowanceYears], [5, 2030, 3], 'đủ tuổi 5/2030, 3 năm mức 2 lần');
near(r.oneTimeAllowance, (5 * 0.5 + 3 * 2) * 20_000_000, '170tr', 1e-3);

// 6) Chưa đủ 15 năm: báo lỗi, không tính lương hưu
const bad = { ...p0, contributionYears: 14, contributionMonths: 11 };
eq(validatePensionInput(bad).some(e => e.includes('Chưa đủ 15 năm')), true, '14 năm 11 tháng: chưa đủ');
r = calculatePension(bad);
eq([r.finalRate, r.monthlyPension, r.yearsToBreakeven, r.oneTimeAllowance], [0, 0, 0, 0], 'không lương hưu, không hòa vốn');
console.log(`PENSION OK: ${n} assertions`);
