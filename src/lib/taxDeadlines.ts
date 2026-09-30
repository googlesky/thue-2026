/**
 * Hạn nộp hồ sơ khai thuế, nộp thuế dùng chung (mọi ngày theo giờ local, 00:00).
 * - Hạn (NĐ 252/2026/NĐ-CP Điều 10): khai tháng = ngày 20 tháng sau; khai quý = ngày cuối cùng
 *   của tháng đầu quý sau; quyết toán của tổ chức = cuối tháng 3; cá nhân tự quyết toán TNCN
 *   = cuối tháng 4. Hạn nộp thuế = hạn nộp hồ sơ khai thuế.
 * - Hạn trùng ngày nghỉ → ngày làm việc liền kề sau ngày nghỉ đó (NĐ 252/2026 Điều 3.7).
 * - Tiền chậm nộp tính từ ngày tiếp theo ngày cuối cùng của thời hạn đến ngày liền kề trước
 *   ngày nộp tiền (NĐ 252/2026 Điều 26.1.a).
 */

// Ngày nghỉ lễ, Tết (khu vực doanh nghiệp, Bộ luật Lao động) rơi vào ngày thường; thứ Bảy, Chủ nhật tự loại.
// ponytail: bảng nhập tay, phải bổ sung hằng năm theo thông báo lịch nghỉ; năm ngoài bảng chỉ dời qua cuối tuần.
const HOLIDAYS = new Set([
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
  '2026-04-27', '2026-04-30', '2026-05-01', '2026-09-01', '2026-09-02',
  // 2027: lịch nghỉ Tết Đinh Mùi và ngày liền kề Quốc khánh chưa công bố
  '2027-01-01', '2027-04-30', '2027-05-03', '2027-09-02',
]);

/** Năm cuối cùng có lịch nghỉ chính thức trong bảng; hạn rơi vào năm sau đó là dự kiến. */
export const HOLIDAYS_OFFICIAL_UNTIL = 2026;

const pad = (n: number) => String(n).padStart(2, '0');
const isHoliday = (d: Date) =>
  HOLIDAYS.has(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);

/** Ngày hạn thực tế: thứ Bảy, Chủ nhật, ngày nghỉ lễ → ngày làm việc liền kề sau. */
export function toWorkingDay(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  while (d.getDay() === 0 || d.getDay() === 6 || isHoliday(d)) d.setDate(d.getDate() + 1);
  return d;
}

/** Số ngày lịch từ `from` đến `to` theo ngày local, bỏ giờ (âm nếu `to` trước `from`). */
export function daysBetween(from: Date, to: Date): number {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return (utc(to) - utc(from)) / 86_400_000;
}

/** Số ngày tính tiền chậm nộp khi hạn là `due` (chưa dời ngày nghỉ) và nộp tiền ngày `paid`. */
export function daysLate(due: Date, paid: Date): number {
  return Math.max(0, daysBetween(toWorkingDay(due), paid) - 1);
}

/** Hạn khai tháng `month` (1–12) năm `year`: ngày 20 tháng sau. */
export const monthlyDeadline = (year: number, month: number) =>
  toWorkingDay(new Date(year, month, 20));

/** Hạn khai quý `quarter` năm `year`: ngày cuối cùng của tháng đầu quý sau. */
export const quarterDeadline = (year: number, quarter: 1 | 2 | 3 | 4) =>
  toWorkingDay(new Date(year, quarter * 3 + 1, 0));

/** Hạn quyết toán năm `year`: tổ chức cuối tháng 3, cá nhân tự quyết toán TNCN cuối tháng 4 năm sau. */
export const annualDeadline = (year: number, who: 'org' | 'individual') =>
  toWorkingDay(new Date(year + 1, who === 'org' ? 3 : 4, 0));
