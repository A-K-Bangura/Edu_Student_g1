import { describe, expect, it } from "vitest";
import { TOPICS, peekTopics, resolveTopic } from "./comingSoonContent";

describe("resolveTopic", () => {
  it.each([
    ["/auth/login", "auth"],
    ["/auth/signup", "auth"],
    ["/auth/verify", "auth"],
    ["/onboarding", "auth"],
    ["/courses", "courses"],
    ["/courses/enrolled", "courses"],
    ["/courses/intro-to-python", "courses"],
    ["/course/intro-to-python/play", "courses"],
    ["/roadmaps", "roadmaps"],
    ["/roadmaps/data-science", "roadmaps"],
    ["/resources", "resources"],
    ["/resources/purchases", "resources"],
    ["/feed", "feed"],
    ["/feed/opportunities", "opportunities"],
    ["/feed/opportunities/12", "opportunities"],
    ["/feed/gigs", "gigs"],
    ["/feed/gigs/posted/3/edit", "gigs"],
    ["/wallet", "coins"],
    ["/dashboard", "home"],
    ["/profile", "home"],
    ["/leaderboard", "home"],
    ["/something/else", "lost"],
  ])("sends %s to the %s topic", (path, id) => {
    expect(resolveTopic(path).id).toBe(id);
  });

  it("ignores case and trailing slashes", () => {
    expect(resolveTopic("/Courses/").id).toBe("courses");
    expect(resolveTopic("/FEED/Gigs").id).toBe("gigs");
  });

  it("gives every topic at least one quip and a mascot", () => {
    for (const topic of Object.values(TOPICS)) {
      expect(topic.quips.length).toBeGreaterThan(0);
      expect(topic.mascot.length).toBeGreaterThan(0);
    }
  });

  it("round-trips: every peek chip resolves back to its own topic", () => {
    for (const topic of peekTopics("lost")) {
      expect(resolveTopic(topic.route).id).toBe(topic.id);
    }
  });
});

describe("peekTopics", () => {
  it("offers the other topics but never the one being viewed", () => {
    const ids = peekTopics("courses").map((t) => t.id);
    expect(ids).not.toContain("courses");
    expect(ids).toContain("resources");
    expect(ids).toContain("coins");
  });
});
