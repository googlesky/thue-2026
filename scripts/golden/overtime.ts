import assert from 'node:assert/strict';
import { calculateOvertime, getOvertimeRate, checkOvertimeLimits, OvertimeEntry } from '@/lib/overtimeCalculator';
import { calculateNewTax, DEFAULT_INSURANCE_OPTIONS } from '@/lib/taxCalculator';

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };
const near = (a: number, b: number, msg: string, eps = 0.01) => { assert.ok(Math.abs(a - b) < eps, `${msg}: ${a} vs ${b}`); n++; };

const mk = (type: OvertimeEntry['type'], hours: number, shift: OvertimeEntry['shift'] = 'day', count = 1): OvertimeEntry[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${type}${i}`, type, shift, hours }));
const base = {
  monthlySalary: 20_000_000, workingDaysPerMonth: 26, hoursPerDay: 8, includeHolidayBasePay: false,
  dependents: 0, otherDeductions: 0, hasInsurance: true, insuranceOptions: DEFAULT_INSURANCE_OPTIONS, region: 1 as const, useNewLaw: true,
};
const hourly = 20_000_000 / 208;

// 1) Hệ số (BLLĐ Điều 98; NĐ 145/2020 Điều 57)
eq([getOvertimeRate('weekday', 'day'), getOvertimeRate('weekend', 'day'), getOvertimeRate('holiday', 'day')], [1.5, 2, 3], 'hệ số ngày');
eq(getOvertimeRate('weekday', 'night'), 2, 'đêm ngày thường không làm thêm ban ngày: 150+30+20×100 = 200%');
eq(getOvertimeRate('weekday', 'night', true), 2.1, 'đêm ngày thường sau làm thêm ban ngày: 150+30+20×150 = 210%');
eq([getOvertimeRate('weekend', 'night'), getOvertimeRate('holiday', 'night')], [2.7, 3.9], 'đêm nghỉ tuần 270%, lễ 390%');

// 2) Luật 2026: lương 20tr + 40 giờ ngày thường → thuế = thuế riêng lương 20tr = (20tr − 2,1tr − 15,5tr) × 5% = 120.000
for (const entries of [mk('weekday', 2, 'day', 20), mk('weekday', 40)]) {
  const r = calculateOvertime({ ...base, entries });
  near(r.taxAmount, 120_000, `thuế 120k (${entries.length} dòng)`);
  near(r.insuranceAmount, 2_100_000, 'BH 10,5% chỉ trên lương cơ bản');
  near(r.totalTaxExemptOvertime, hourly * 1.5 * 40, 'miễn toàn bộ 40 giờ');
  eq(r.overLimitHours, 0, 'không vượt');
  near(r.netIncome, 20_000_000 + hourly * 60 - 2_100_000 - 120_000, 'thực nhận');
}
eq(calculateNewTax({ grossIncome: 20_000_000, dependents: 0 }).taxAmount, 120_000, 'đối chiếu engine');

// 3) Vượt 40 giờ/tháng: 50 giờ ngày thường → 10 giờ × 150% chịu thuế toàn bộ
let r = calculateOvertime({ ...base, entries: mk('weekday', 2, 'day', 25) });
eq(r.overLimitHours, 10, '10 giờ vượt');
near(r.totalTaxableOvertime, hourly * 1.5 * 10, 'chịu thuế 10 giờ × 150%');
near(r.taxAmount, (20_000_000 + hourly * 15 - 2_100_000 - 15_500_000) * 0.05, 'thuế phần vượt');

// 4) C1: lương 60tr + 40 giờ: BH theo lương cơ bản (trần 50,6tr) → thuế = thuế riêng lương 60tr
r = calculateOvertime({ ...base, monthlySalary: 60_000_000, entries: mk('weekday', 4, 'day', 10) });
near(r.insuranceAmount, 50_600_000 * 0.095 + 60_000_000 * 0.01, 'BH 5.407.000');
near(r.taxAmount, (60_000_000 - 5_407_000 - 15_500_000) * 0.2 - 3_500_000, 'thuế 4.318.600');
eq(Math.round(r.taxAmount), Math.round(calculateNewTax({ grossIncome: 60_000_000, dependents: 0 }).taxAmount), 'bằng engine');

// 5) Trước 2026 (phần chênh): 40 giờ ngày thường, chịu thuế phần lương giờ bình thường; biểu 7 bậc, giảm trừ 11tr
r = calculateOvertime({ ...base, useNewLaw: false, entries: mk('weekday', 2, 'day', 20) });
near(r.totalTaxableOvertime, hourly * 40, 'chịu thuế 100% lương giờ');
near(r.totalTaxExemptOvertime, hourly * 0.5 * 40, 'miễn phần chênh 50%');
const ti = 20_000_000 + hourly * 40 - 2_100_000 - 11_000_000;
near(r.taxAmount, ti * 0.15 - 750_000, 'thuế luật cũ bậc 3');

// 6) Lương ngày lễ (chỉ người hưởng lương ngày) - chịu thuế
r = calculateOvertime({ ...base, includeHolidayBasePay: true, entries: mk('holiday', 8) });
near(r.holidayBasePay, hourly * 8, 'lương ngày lễ 8 giờ');
near(r.taxAmount, (20_000_000 + hourly * 8 - 2_100_000 - 15_500_000) * 0.05, 'lương ngày lễ vào TNCT');
r = calculateOvertime({ ...base, entries: mk('holiday', 8) });
eq(r.holidayBasePay, 0, 'mặc định không cộng');

// 7) Không đóng BH: BH 0 và không trừ BH khi tính thuế
r = calculateOvertime({ ...base, hasInsurance: false, entries: [] });
eq([r.insuranceAmount, r.taxAmount], [0, 225_000], 'không BH: (20 − 15,5) × 5%');

// 8) C2: cảnh báo theo loại ngày
eq(checkOvertimeLimits(mk('weekend', 8)), [], 'cuối tuần 8 giờ: không cảnh báo');
eq(checkOvertimeLimits(mk('holiday', 12)), [], 'lễ 12 giờ: không cảnh báo');
eq(checkOvertimeLimits(mk('weekday', 4)), [], 'ngày thường 4 giờ: không cảnh báo');
eq(checkOvertimeLimits(mk('weekday', 5)).length, 1, 'ngày thường 5 giờ: cảnh báo');
eq(checkOvertimeLimits(mk('weekday', 3), 6).length, 0, 'ngày 6 giờ: tối đa 3 giờ');
eq(checkOvertimeLimits(mk('holiday', 13)).length, 1, 'lễ 13 giờ: cảnh báo');
eq(checkOvertimeLimits(mk('weekday', 2, 'day', 21)).length, 1, '42 giờ/tháng: cảnh báo');
console.log(`OVERTIME OK: ${n} assertions`);
