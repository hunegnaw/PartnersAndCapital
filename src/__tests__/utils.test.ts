import { describe, it, expect } from "vitest";
import { formatCurrency, formatCurrencyDetailed, formatPercentage, formatDate } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats whole dollar amounts", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000");
  });

  it("formats string amounts", () => {
    expect(formatCurrency("500000")).toBe("$500,000");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("formatCurrencyDetailed", () => {
  it("includes cents", () => {
    expect(formatCurrencyDetailed(1234.56)).toBe("$1,234.56");
  });
});

describe("formatPercentage", () => {
  it("formats positive percentages with + sign", () => {
    expect(formatPercentage(12.5)).toBe("+12.50%");
  });

  it("formats negative percentages", () => {
    expect(formatPercentage(-3.2)).toBe("-3.20%");
  });
});

describe("formatDate", () => {
  it("formats dates", () => {
    const result = formatDate(new Date("2025-01-15"));
    expect(result).toContain("Jan");
    expect(result).toContain("2025");
  });
});
