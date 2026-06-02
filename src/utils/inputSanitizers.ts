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

// Ứng dụng hiển thị số theo locale vi-VN: dấu "." là phân tách hàng nghìn,
// dấu "," là phân tách thập phân. Vì ô nhập luôn được format lại với dấu "."
// nên mọi dấu "." đều là phân tách hàng nghìn, không phải số thập phân.
// Chỉ dấu "," (phần lẻ) mới được coi là số thập phân — nhờ vậy gõ số nguyên
// dài như "1.2345" (đang gõ 12345) không bị nhầm thành số thập phân.
// Nhiều dấu "," là kiểu nhóm hàng nghìn en-US (vd "1,234,567"), không phải thập phân.
function detectDecimal(raw: string): boolean {
  const sanitized = raw.replace(/\s/g, "");
  const commaCount = (sanitized.match(/,/g) || []).length;
  if (commaCount !== 1) return false;
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
    // Khi có số thập phân (dấu ","), chỉ lấy phần nguyên (bỏ phần lẻ)
    const sanitized = raw.replace(/\s/g, "");
    const integerPart = sanitized.split(",")[0].replace(/[^\d]/g, "");
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
