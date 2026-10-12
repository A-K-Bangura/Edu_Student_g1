import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TOPICS } from "../components/teaser/comingSoonContent";
import { ComingSoon } from "./ComingSoon";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ComingSoon />
    </MemoryRouter>,
  );

describe("ComingSoon page", () => {
  it("speaks to the page the visitor was trying to reach", () => {
    renderAt("/courses");

    expect(
      screen.getByRole("heading", { level: 1, name: /courses are still in the oven/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i, { selector: "p" })).toBeInTheDocument();
  });

  it("falls back to a generic message for unknown paths", () => {
    renderAt("/definitely/not/a/page");

    expect(
      screen.getByRole("heading", { level: 1, name: /this corner isn't ready yet/i }),
    ).toBeInTheDocument();
  });

  it("always offers a way back to the landing page", () => {
    renderAt("/auth/login");

    expect(screen.getByRole("link", { name: /take me back home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "UniVybe home" })).toHaveAttribute("href", "/");
  });

  it("offers the other topics as chips, but not the current one", () => {
    renderAt("/courses");

    const chips = screen.getByRole("navigation", { name: /what's coming/i });
    expect(within(chips).getByRole("link", { name: "Resources" })).toHaveAttribute(
      "href",
      "/resources",
    );
    expect(within(chips).getByRole("link", { name: "Gigs" })).toHaveAttribute(
      "href",
      "/feed/gigs",
    );
    expect(within(chips).queryByRole("link", { name: "Courses" })).not.toBeInTheDocument();
  });

  it("cycles Vybe's lines when the mascot is tapped", async () => {
    const user = userEvent.setup();
    renderAt("/courses");

    const { quips } = TOPICS.courses;
    const line = screen.getByRole("status");
    expect(line).toHaveTextContent(quips[0]);

    const vybe = screen.getByRole("button", { name: /tap vybe/i });
    await user.click(vybe);
    expect(line).toHaveTextContent(quips[1]);

    for (let i = 1; i < quips.length; i++) await user.click(vybe);
    expect(line).toHaveTextContent(quips[0]); // wrapped around
  });

  it("keeps the placeholder out of search results and restores the title", () => {
    document.title = "UniVybe";
    const { unmount } = renderAt("/resources");

    expect(document.title).toBe("Coming soon · UniVybe");
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex",
    );

    unmount();
    expect(document.title).toBe("UniVybe");
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("gives the decorative art empty alt text", () => {
    renderAt("/feed/gigs");

    // The only informative image is the logo; the mascot lives in a labelled button.
    for (const img of document.querySelectorAll("img")) {
      expect(img.hasAttribute("alt")).toBe(true);
      expect(img).toHaveAttribute("width");
      expect(img).toHaveAttribute("height");
    }
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });
});
