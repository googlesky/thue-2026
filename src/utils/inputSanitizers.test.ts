import { describe, it, expect } from "vitest";
import { parseCurrencyInput, MAX_MONTHLY_INCOME } from "./inputSanitizers";

describe("parseCurrencyInput", () => {
  describe("nhập số nguyên bằng bàn phím (vi-VN, dấu '.' là phân tách hàng nghìn)", () => {
    // Mô phỏng từng phím gõ vào ô đã được format lại theo vi-VN.
    // Trước đây "1.2345" bị nhận nhầm là số thập phân khiến giá trị thu về 1.
    const format = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

    it("gõ '1234567' không bị cảnh báo thập phân và dựng đúng giá trị", () => {
      let display = "";
      const steps: { typed: string; value: number; decimal: boolean }[] = [];
      for (const ch of "1234567") {
        const onChange = display + ch; // chuỗi ô nhận được khi gõ thêm 1 ký tự
        const { value, issues } = parseCurrencyInput(onChange, {
          max: MAX_MONTHLY_INCOME,
        });
        display = value === 0 ? "" : format(value);
        steps.push({ typed: ch, value, decimal: issues.decimal });
      }

      expect(steps.map((s) => s.value)).toEqual([
        1, 12, 123, 1234, 12345, 123456, 1234567,
      ]);
      // Không bước nào bị coi là thập phân
      expect(steps.every((s) => !s.decimal)).toBe(true);
    });

    it("'1.2345' (đang gõ 12345) là số nguyên, không phải thập phân", () => {
      const { value, issues } = parseCurrencyInput("1.2345");
      expect(value).toBe(12345);
      expect(issues.decimal).toBe(false);
    });

    it("'9.9999' (đang gõ 99999) là số nguyên, không phải thập phân", () => {
      const { value, issues } = parseCurrencyInput("9.9999");
      expect(value).toBe(99999);
      expect(issues.decimal).toBe(false);
    });
  });

  describe("số nguyên có nhóm hàng nghìn", () => {
    it("'30.000.000' -> 30000000, không cảnh báo", () => {
      const { value, issues } = parseCurrencyInput("30.000.000");
      expect(value).toBe(30000000);
      expect(issues.decimal).toBe(false);
    });

    it("'1.234.567' -> 1234567, không cảnh báo", () => {
      const { value, issues } = parseCurrencyInput("1.234.567");
      expect(value).toBe(1234567);
      expect(issues.decimal).toBe(false);
    });

    it("nhóm hàng nghìn kiểu en-US '1,234,567' -> 1234567, không phải thập phân", () => {
      const { value, issues } = parseCurrencyInput("1,234,567");
      expect(value).toBe(1234567);
      expect(issues.decimal).toBe(false);
    });
  });

  describe("số thập phân thật (dấu ',' trong vi-VN) bị bỏ phần lẻ và được cảnh báo", () => {
    it("'1,5' -> 1, decimal=true", () => {
      const { value, issues } = parseCurrencyInput("1,5");
      expect(value).toBe(1);
      expect(issues.decimal).toBe(true);
    });

    it("'12345,5' -> 12345, decimal=true", () => {
      const { value, issues } = parseCurrencyInput("12345,5");
      expect(value).toBe(12345);
      expect(issues.decimal).toBe(true);
    });

    it("'1.234.567,89' (nhóm hàng nghìn + phần lẻ) -> 1234567, decimal=true", () => {
      const { value, issues } = parseCurrencyInput("1.234.567,89");
      expect(value).toBe(1234567);
      expect(issues.decimal).toBe(true);
    });
  });

  describe("số âm", () => {
    it("phát hiện dấu âm", () => {
      const { value, issues } = parseCurrencyInput("-500");
      expect(value).toBe(500);
      expect(issues.negative).toBe(true);
    });
  });

  describe("giới hạn tối đa (overflow)", () => {
    it("kẹp giá trị về max và bật cờ overflow", () => {
      const { value, issues } = parseCurrencyInput("999999999999", {
        max: MAX_MONTHLY_INCOME,
      });
      expect(value).toBe(MAX_MONTHLY_INCOME);
      expect(issues.overflow).toBe(true);
    });

    it("không overflow khi trong giới hạn", () => {
      const { issues } = parseCurrencyInput("50.000.000", {
        max: MAX_MONTHLY_INCOME,
      });
      expect(issues.overflow).toBe(false);
    });
  });

  describe("đầu vào rỗng / không hợp lệ", () => {
    it("chuỗi rỗng -> 0", () => {
      expect(parseCurrencyInput("").value).toBe(0);
    });

    it("chỉ có ký tự không phải số -> 0", () => {
      expect(parseCurrencyInput("abc").value).toBe(0);
    });
  });
});
