import { describe, expect, it } from "vitest";
import { formatAcademicLevel, getInitials } from "./profileDisplay";

describe("getInitials", () => {
  it("is the first and last word's initials", () => {
    expect(getInitials("Amara Kamara")).toBe("AK");
    expect(getInitials("Mary Jane Watson")).toBe("MW");
  });

  it("is one letter for a single name, upper-cased", () => {
    expect(getInitials("amara")).toBe("A");
  });

  it("ignores extra whitespace", () => {
    expect(getInitials("  Amara   Kamara  ")).toBe("AK");
  });

  it("falls back to the email, then to a placeholder", () => {
    expect(getInitials("", "amara@example.com")).toBe("A");
    expect(getInitials(null, "  zed@example.com")).toBe("Z");
    expect(getInitials(undefined, undefined)).toBe("?");
    expect(getInitials("   ", "")).toBe("?");
  });

  it("takes whole characters, never half of one", () => {
    expect(getInitials("Élise Núñez")).toBe("ÉN");
    expect(getInitials("😀 Smile")).toBe("😀S");
  });
});

describe("formatAcademicLevel", () => {
  it("turns the stored hundreds into a year", () => {
    expect(formatAcademicLevel("100")).toBe("Year 1");
    expect(formatAcademicLevel("200")).toBe("Year 2");
    expect(formatAcademicLevel("400")).toBe("Year 4");
  });

  it("shows an already-written level unchanged", () => {
    expect(formatAcademicLevel("Year 2")).toBe("Year 2");
    expect(formatAcademicLevel("Postgraduate")).toBe("Postgraduate");
  });

  it("doesn't invent a fractional year for a number that isn't a whole year", () => {
    expect(formatAcademicLevel("150")).toBe("150");
    expect(formatAcademicLevel("0")).toBe("0");
  });

  it("is null when there's no level", () => {
    expect(formatAcademicLevel(undefined)).toBeNull();
    expect(formatAcademicLevel(null)).toBeNull();
    expect(formatAcademicLevel("  ")).toBeNull();
  });
});
