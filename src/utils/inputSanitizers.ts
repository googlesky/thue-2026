export type CurrencyInputIssues = {
  negative: boolean;
  decimal: boolean;
  overflow: boolean;
};

export type CurrencyInputParseResult = {
  value: number;
  issues: CurrencyInputIssues;
};

export const MAX_MONTHLY_INCOME = 10_000_000_000;

/**
 * Trả về phần nguyên (chưa lọc ký tự) nếu chuỗi có phần thập phân, null nếu không.
 * - vi-VN: "." luôn là dấu nghìn (gõ tăng dần "7.0000" → 70.000); "," là thập phân chỉ khi
 *   nhóm cuối có 1–2 chữ số ("1,5", "1.234,56").
 * - Nhóm cuối 3 chữ số sau "," là dấu nghìn kiểu en-US khi dán ("30,000,000", "12,345");
 *   en-US có phần lẻ "30,000,000.50" → phần lẻ là nhóm sau ".".
 */
function integerPartIfDecimal(raw: string): string | null {
  const s = raw.replace(/[^\d.,-]/g, "");
  const match = s.match(/^(.*),\d{1,2}$/) ?? s.match(/^(-?\d{1,3}(?:,\d{3})+)\.\d{1,2}$/);
  return match ? match[1] : null;
}

export function parseCurrencyInput(
  raw: string,
  options?: { max?: number },
): CurrencyInputParseResult {
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  const negative = /-/.test(raw);
  // Có phần thập phân: chỉ lấy phần nguyên (bỏ phần lẻ)
  const integerPart = integerPartIfDecimal(raw);
  const decimal = integerPart !== null;
  const digits = (integerPart ?? raw).replace(/[^\d]/g, "");
  let value = digits ? parseInt(digits, 10) : 0;

  let overflow = false;

  if (Number.isFinite(max) && value > max) {
    value = max;
    overflow = true;
  }

  return {
    value,
    issues: { negative, decimal, overflow },
  };
}
