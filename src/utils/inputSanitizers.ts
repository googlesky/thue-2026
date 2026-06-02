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

// Xác định chuỗi nhập có phần thập phân hay không, hỗ trợ cả vi-VN và en-US:
//  - vi-VN: "." ngăn cách hàng nghìn, "," là thập phân (vd "1.234,5")
//  - en-US: "," ngăn cách hàng nghìn, "." là thập phân (vd "1,234.5")
function detectDecimal(raw: string): boolean {
  const sanitized = raw.replace(/\s/g, "");
  const lastDot = sanitized.lastIndexOf(".");
  const lastComma = sanitized.lastIndexOf(",");

  // Có cả hai dấu: dấu đứng sau là dấu thập phân (vd "1,234.56" hay "1.234,56").
  if (lastDot !== -1 && lastComma !== -1) return true;

  // Chỉ có ".": vì ô nhập luôn được format lại theo vi-VN nên "." luôn là phân
  // tách hàng nghìn, nhờ vậy gõ số nguyên dài "1.2345" (đang gõ 12345) không
  // bị nhầm thành số thập phân.
  if (lastDot !== -1) return false;

  // Chỉ có ",": nhiều dấu "," hoặc đúng 3 chữ số phía sau là nhóm hàng nghìn
  // kiểu en-US (vd "1,234,567", "1,234"); ngược lại là thập phân vi-VN ("1,5").
  if (lastComma !== -1) {
    if ((sanitized.match(/,/g) || []).length > 1) return false;
    const fraction = sanitized.slice(lastComma + 1);
    return /^\d+$/.test(fraction) && fraction.length !== 3;
  }

  return false;
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
    // Khi có số thập phân, chỉ lấy phần nguyên (bỏ phần lẻ)
    const sanitized = raw.replace(/\s/g, "");
    const match = sanitized.match(/^(.*?)[.,](\d+)$/);
    if (match) {
      const integerPart = match[1].replace(/[^\d]/g, "");
      value = integerPart ? parseInt(integerPart, 10) : 0;
    } else {
      const digits = raw.replace(/[^\d]/g, "");
      value = digits ? parseInt(digits, 10) : 0;
    }
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
