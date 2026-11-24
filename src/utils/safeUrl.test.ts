import { describe, expect, it } from "vitest";
import { getSafeExternalUrl } from "./safeUrl";

describe("getSafeExternalUrl", () => {
  it("passes http and https addresses through", () => {
    expect(getSafeExternalUrl("https://www.linkedin.com/in/amara")).toBe(
      "https://www.linkedin.com/in/amara"
    );
    expect(getSafeExternalUrl("http://example.com/a?b=1")).toBe("http://example.com/a?b=1");
  });

  it("fills in https for the bare domain people actually type", () => {
    expect(getSafeExternalUrl("github.com/amara")).toBe("https://github.com/amara");
    expect(getSafeExternalUrl("www.example.com")).toBe("https://www.example.com/");
  });

  it("ignores surrounding whitespace", () => {
    expect(getSafeExternalUrl("  https://example.com/x \n")).toBe("https://example.com/x");
  });

  it.each([
    ["javascript:", "javascript:alert(document.cookie)"],
    ["JavaScript: in odd case", "JaVaScRiPt:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["vbscript:", "vbscript:msgbox(1)"],
    ["file:", "file:///etc/passwd"],
    ["blob:", "blob:https://example.com/abc"],
    ["mailto:", "mailto:someone@example.com"],
  ])("refuses a %s address, which would run or leak when tapped", (_label, value) => {
    expect(getSafeExternalUrl(value)).toBeNull();
  });

  it("refuses a site-relative path, which would point back into this app", () => {
    expect(getSafeExternalUrl("/profile")).toBeNull();
    expect(getSafeExternalUrl("//evil.example/x")).toBeNull();
  });

  it("returns null for nothing, or for something that isn't an address", () => {
    expect(getSafeExternalUrl(null)).toBeNull();
    expect(getSafeExternalUrl(undefined)).toBeNull();
    expect(getSafeExternalUrl("")).toBeNull();
    expect(getSafeExternalUrl("   ")).toBeNull();
    expect(getSafeExternalUrl("not a url at all")).toBeNull();
  });
});
