import { describe, expect, it } from "vitest";
import { getDefaultLeaderboardScope } from "./leaderboardScope";

const group = (id: number) => ({ id, name: `Group ${id}` });

describe("getDefaultLeaderboardScope", () => {
  it("is the student's department when they have one", () => {
    expect(
      getDefaultLeaderboardScope({
        department: group(7),
        faculty: group(3),
        university: group(1),
      })
    ).toBe("department");
  });

  it("narrows to the next-most-specific group when there's no department", () => {
    expect(
      getDefaultLeaderboardScope({ faculty: group(3), university: group(1) })
    ).toBe("faculty");
    expect(getDefaultLeaderboardScope({ university: group(1) })).toBe("university");
  });

  it("uses the organization for a student who is affiliated that way instead", () => {
    expect(getDefaultLeaderboardScope({ organization: group(9) })).toBe("organization");
    expect(
      getDefaultLeaderboardScope({ organization: group(9), university: group(1) })
    ).toBe("university");
  });

  it("prefers the department even when an organization is also set", () => {
    expect(
      getDefaultLeaderboardScope({ department: group(7), organization: group(9) })
    ).toBe("department");
  });

  it("stays overall when the student has no group at all, or there's no user", () => {
    expect(getDefaultLeaderboardScope({})).toBe("overall");
    expect(getDefaultLeaderboardScope({ organization: null })).toBe("overall");
    expect(getDefaultLeaderboardScope(null)).toBe("overall");
    expect(getDefaultLeaderboardScope(undefined)).toBe("overall");
  });

  it("ignores a group object that has no usable id (the scoped endpoints 422 without one)", () => {
    expect(
      getDefaultLeaderboardScope({
        department: { id: 0, name: "" },
        faculty: group(3),
      })
    ).toBe("faculty");
  });
});
