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
  const sanitized = raw.replace(/\s/g, '');
  const match = sanitized.match(/[.,](\d+)$/);
  if (!match) return false;
  const decimalLength = match[1].length;
  return decimalLength !== 3;
}

export function parseCurrencyInput(
  raw: string,
  options?: { max?: number }
): CurrencyInputParseResult {
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  const negative = /-/.test(raw);
  const decimal = detectDecimal(raw);
  const digits = raw.replace(/[^\d]/g, '');
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
