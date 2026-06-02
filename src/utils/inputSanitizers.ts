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

// Xác định dấu thập phân của chuỗi nhập, hỗ trợ cả vi-VN và en-US:
//  - vi-VN: dấu "." ngăn cách hàng nghìn, dấu "," là thập phân (vd "1.234,5")
//  - en-US: dấu "," ngăn cách hàng nghìn, dấu "." là thập phân (vd "1,234.5")
// Trả về dấu thập phân ("." hoặc ",") nếu có phần lẻ, ngược lại trả về null.
function getDecimalSeparator(sanitized: string): "." | "," | null {
  const lastDot = sanitized.lastIndexOf(".");
  const lastComma = sanitized.lastIndexOf(",");

  // Có cả hai dấu: dấu xuất hiện sau cùng là dấu thập phân, dấu kia là
  // phân tách hàng nghìn (vd "1,234.56" -> "."; "1.234,56" -> ",").
  if (lastDot !== -1 && lastComma !== -1) {
    return lastDot > lastComma ? "." : ",";
  }

  // Chỉ có dấu ".": vì ô nhập luôn được format lại theo vi-VN (dấu "." ngăn
  // cách hàng nghìn) nên dấu "." luôn là phân tách hàng nghìn, không phải
  // thập phân — nhờ vậy gõ số nguyên dài như "1.2345" (đang gõ 12345) không
  // bị nhầm thành số thập phân.
  if (lastDot !== -1) return null;

  // Chỉ có dấu ",":
  if (lastComma !== -1) {
    // Nhiều dấu "," là nhóm hàng nghìn kiểu en-US (vd "1,234,567").
    if ((sanitized.match(/,/g) || []).length > 1) return null;
    const fraction = sanitized.slice(lastComma + 1);
    // Phần sau dấu "," phải toàn chữ số mới là phần lẻ.
    if (!/^\d+$/.test(fraction)) return null;
    // Đúng 3 chữ số là nhóm hàng nghìn kiểu en-US (vd "1,234"), ngược lại
    // là số thập phân vi-VN (vd "1,5" hay "12,45").
    return fraction.length === 3 ? null : ",";
  }

  return null;
}

export function parseCurrencyInput(
  raw: string,
  options?: { max?: number },
): CurrencyInputParseResult {
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  const negative = /-/.test(raw);
  const sanitized = raw.replace(/\s/g, "");
  const separator = getDecimalSeparator(sanitized);
  const decimal = separator !== null;

  let value: number;

  if (separator) {
    // Có phần lẻ: chỉ lấy phần nguyên trước dấu thập phân (bỏ phần lẻ)
    const integerPart = sanitized
      .slice(0, sanitized.lastIndexOf(separator))
      .replace(/[^\d]/g, "");
    value = integerPart ? parseInt(integerPart, 10) : 0;
  } else {
    const digits = sanitized.replace(/[^\d]/g, "");
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
