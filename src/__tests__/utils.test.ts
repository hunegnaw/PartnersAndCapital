import { describe, it, expect } from "vitest";
import { formatCurrency, formatCurrencyDetailed, formatPercentage, formatDate, formatDateTime, formatMonthYear, formatTimeAgo } from "@/lib/utils";

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
  it("formats dates in America/New_York timezone", () => {
    const result = formatDate(new Date("2025-01-15T12:00:00Z"));
    expect(result).toContain("Jan");
    expect(result).toContain("2025");
  });
});

describe("formatDateTime", () => {
  it("formats date with time", () => {
    const result = formatDateTime(new Date("2025-06-15T18:30:00Z"));
    expect(result).toContain("Jun");
    expect(result).toContain("2025");
  });
});

describe("formatMonthYear", () => {
  it("formats month and year", () => {
    const result = formatMonthYear(new Date("2025-03-15T12:00:00Z"));
    expect(result).toContain("March");
    expect(result).toContain("2025");
  });
});

describe("formatTimeAgo", () => {
  it("returns 'Just now' for recent dates", () => {
    const result = formatTimeAgo(new Date());
    expect(result).toBe("Just now");
  });
});
