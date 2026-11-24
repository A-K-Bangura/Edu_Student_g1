import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  storeCoursePackCheckoutIntent,
  getCoursePackCheckoutIntent,
  clearCoursePackCheckoutIntent,
} from "./coursePackCheckoutIntent";

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("coursePackCheckoutIntent", () => {
  it("returns null when nothing was stored", () => {
    expect(getCoursePackCheckoutIntent()).toBeNull();
  });

  it("stores and reads back an intent", () => {
    storeCoursePackCheckoutIntent({
      purchaseUuid: "pur-1",
      courseId: "7",
      courseTitle: "Intro to Circuits",
    });

    expect(getCoursePackCheckoutIntent()).toEqual({
      purchaseUuid: "pur-1",
      courseId: "7",
      courseTitle: "Intro to Circuits",
      storedAt: expect.any(Number),
    });
  });

  it("replaces an older intent with a newer one", () => {
    storeCoursePackCheckoutIntent({
      purchaseUuid: "pur-1",
      courseId: "7",
      courseTitle: "Intro to Circuits",
    });
    storeCoursePackCheckoutIntent({
      purchaseUuid: "pur-2",
      courseId: "9",
      courseTitle: "Organic Chemistry",
    });

    expect(getCoursePackCheckoutIntent()?.purchaseUuid).toBe("pur-2");
  });

  it("treats an intent older than 30 minutes as absent, and deletes it", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    storeCoursePackCheckoutIntent({
      purchaseUuid: "pur-1",
      courseId: "7",
      courseTitle: "Intro to Circuits",
    });

    vi.spyOn(Date, "now").mockReturnValue(now + 31 * 60 * 1000);
    expect(getCoursePackCheckoutIntent()).toBeNull();
    expect(sessionStorage.getItem("course_pack_checkout_intent")).toBeNull();
  });

  it("keeps an intent still within the window", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    storeCoursePackCheckoutIntent({
      purchaseUuid: "pur-1",
      courseId: "7",
      courseTitle: "Intro to Circuits",
    });

    vi.spyOn(Date, "now").mockReturnValue(now + 5 * 60 * 1000);
    expect(getCoursePackCheckoutIntent()?.purchaseUuid).toBe("pur-1");
  });

  it("drops a malformed stored value instead of throwing", () => {
    sessionStorage.setItem("course_pack_checkout_intent", "{not json");
    expect(() => getCoursePackCheckoutIntent()).not.toThrow();
    expect(getCoursePackCheckoutIntent()).toBeNull();
  });

  it("clears a stored intent", () => {
    storeCoursePackCheckoutIntent({
      purchaseUuid: "pur-1",
      courseId: "7",
      courseTitle: "Intro to Circuits",
    });
    clearCoursePackCheckoutIntent();
    expect(getCoursePackCheckoutIntent()).toBeNull();
  });
});
