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

function detectDecimal(raw: string): boolean {
  // Định dạng vi-VN: "." là dấu phân cách hàng nghìn, "," là dấu thập phân.
  // Chỉ coi là số thập phân khi có "," theo sau bởi chữ số ở cuối chuỗi.
  // (Không coi "." là thập phân để cho phép gõ tăng dần như "7.0000".)
  const sanitized = raw.replace(/\s/g, "");
  return /,\d+$/.test(sanitized);
}

export function parseCurrencyInput(
  raw: string,
  options?: { max?: number },
): CurrencyInputParseResult {
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  const negative = /-/.test(raw);
  const decimal = detectDecimal(raw);

  let value: number;

  if (decimal) {
    // Có dấu thập phân ",": chỉ lấy phần nguyên trước dấu "," cuối cùng (bỏ phần lẻ)
    const sanitized = raw.replace(/\s/g, "");
    const match = sanitized.match(/^(.*),(\d+)$/);
    const integerPart = (match ? match[1] : sanitized).replace(/[^\d]/g, "");
    value = integerPart ? parseInt(integerPart, 10) : 0;
  } else {
    const digits = raw.replace(/[^\d]/g, "");
    value = digits ? parseInt(digits, 10) : 0;
  }

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
