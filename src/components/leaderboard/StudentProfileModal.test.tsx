import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import type { LeaderboardEntry } from "../../types/leaderboard";
import type { UserProfile } from "../../types/profile";
import type { GigReviewWithReviewer } from "../../types/gig";

vi.mock("../../services/profile", () => ({ getStudentProfile: vi.fn() }));

import { getStudentProfile } from "../../services/profile";
import { StudentProfileModal } from "./StudentProfileModal";

const PHOTO = "https://res.cloudinary.com/demo/image/upload/james.jpg";

const entry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  rank: 4,
  student_id: 10,
  student_name: "James Bangura",
  student_avatar: PHOTO,
  xp_total: 145,
  badges_count: 0,
  ...overrides,
});

const review = (id: string, rating: number, text: string | null): GigReviewWithReviewer => ({
  id,
  rating,
  review: text,
  direction: "creator_to_worker",
  as: "worker",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  reviewer: { type: "student", id: "r1", name: "Fatmata Sesay", avatar_url: null },
  gig: { id: 1, title: "Logo design" },
});

const badge = (id: number, name: string, icon: string | null) => ({
  id,
  name,
  description: `${name} description`,
  // The type says `string`; a badge with no picture really does come back null.
  icon_url: icon as string,
  earned_at: "2026-09-01T00:00:00Z",
});

// What GET /student/students/{id} returns (ProfileController::showStudent) — no email.
const fullProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: "uuid-10",
  email: "",
  firstname: "James",
  lastname: "Bangura",
  full_name: "James Bangura",
  avatar_url: PHOTO,
  bio: "Third-year engineering student.",
  interests: ["Electronics", "Robotics"],
  university: { id: 1, name: "Fourah Bay College" },
  faculty: { id: 2, name: "Faculty of Engineering and Architecture" },
  department: { id: 3, name: "Department of Electrical & Electronic Engineering" },
  organization: null,
  level: "200",
  xp_total: 145,
  streak_days: 3,
  badges_count: 2,
  badges: [badge(1, "First Steps", "https://x.test/b1.png"), badge(2, "Quiz Whiz", null)],
  courses_enrolled: 4,
  courses_completed: 1,
  gig_reputation: {
    average_rating: 4.5,
    rating_count: 2,
    reviews: [review("1", 5, "Great to work with."), review("2", 4, null)],
  },
  social_links: {
    linkedin: "https://www.linkedin.com/in/james",
    github: "github.com/james",
    twitter: "javascript:alert(document.cookie)",
  },
  created_at: "2025-02-14T00:00:00Z",
  ...overrides,
});

const renderModal = (e: LeaderboardEntry | null = entry(), onClose = vi.fn()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <StudentProfileModal entry={e} onClose={onClose} />
    </QueryClientProvider>
  );
  return { ...view, onClose };
};

const sheet = () => screen.getByRole("dialog", { name: "Student profile" });
const axiosError = (status: number) =>
  ({ isAxiosError: true, message: "failed", response: { status, data: {} } }) as unknown as AxiosError;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getStudentProfile).mockResolvedValue(fullProfile());
});

describe("StudentProfileModal — opening", () => {
  it("renders nothing without a row to show", () => {
    const { container } = renderModal(null);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getStudentProfile).not.toHaveBeenCalled();
  });

  it("is a labelled modal dialog, fetching that student's profile", async () => {
    renderModal();

    expect(sheet()).toHaveAttribute("aria-modal", "true");
    await screen.findByText("Third-year engineering student.");
    expect(getStudentProfile).toHaveBeenCalledWith(10);
  });

  it("shows who it is straight away, from the leaderboard row, while the details load", () => {
    vi.mocked(getStudentProfile).mockReturnValue(new Promise(() => {}));
    renderModal(entry({ rank: 7, student_name: "Isatu Bangura" }));

    expect(within(sheet()).getByRole("heading", { name: "Isatu Bangura" })).toBeInTheDocument();
    expect(within(sheet()).getByText("Rank #7")).toBeInTheDocument();
    expect(within(sheet()).getByRole("status")).toHaveTextContent("Loading profile");
  });

  it("closes with the close button and with Escape", async () => {
    const { onClose } = renderModal();
    await screen.findByText("Third-year engineering student.");

    await userEvent.click(within(sheet()).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("StudentProfileModal — the details", () => {
  it("shows XP, streak, badges and courses as stat tiles", async () => {
    renderModal();
    await screen.findByText("Total XP");

    expect(screen.getByText("145 XP")).toBeInTheDocument();
    expect(screen.getByText("Day streak")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Badges")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("1 completed")).toBeInTheDocument();
  });

  it("doesn't repeat 'XP' (it used to read \"145 XP XP\")", async () => {
    renderModal();
    await screen.findByText("Total XP");

    expect(within(sheet()).queryByText(/XP\s*XP/)).not.toBeInTheDocument();
  });

  it("reads the stored level as a year, not the raw '200'", async () => {
    renderModal();
    await screen.findByText("Total XP");

    expect(within(sheet()).getByText("Year 2")).toBeInTheDocument();
    expect(within(sheet()).queryByText(/Level 200/)).not.toBeInTheDocument();
  });

  it("lists university, faculty and department as labelled rows", async () => {
    renderModal();
    await screen.findByText("Total XP");

    const list = screen.getByText("University", { selector: "dt" }).closest("dl") as HTMLElement;
    expect(within(list).getAllByRole("term").map((t) => t.textContent)).toEqual([
      "University",
      "Faculty",
      "Department",
    ]);
    expect(within(list).getByText("Fourah Bay College")).toBeInTheDocument();
    expect(
      within(list).getByText("Department of Electrical & Electronic Engineering")
    ).toBeInTheDocument();
  });

  it("shows bio, interests and the member-since date", async () => {
    renderModal();

    expect(await screen.findByText("Third-year engineering student.")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Robotics")).toBeInTheDocument();
    expect(screen.getByText(/Member since\s+February 2025/)).toBeInTheDocument();
  });

  it("shows gig reputation with its reviews, and says so when there are no ratings", async () => {
    const first = renderModal();
    expect(await screen.findByText("4.5 · 2 ratings")).toBeInTheDocument();
    expect(screen.getByText("Great to work with.")).toBeInTheDocument();
    first.unmount();

    vi.mocked(getStudentProfile).mockResolvedValue(
      fullProfile({ gig_reputation: { average_rating: null, rating_count: 0, reviews: [] } })
    );
    renderModal();
    expect(await screen.findByText("No ratings yet.")).toBeInTheDocument();
  });

  it("uses a singular 'rating' for one", async () => {
    vi.mocked(getStudentProfile).mockResolvedValue(
      fullProfile({
        gig_reputation: { average_rating: 5, rating_count: 1, reviews: [review("1", 5, null)] },
      })
    );
    renderModal();

    expect(await screen.findByText("5.0 · 1 rating")).toBeInTheDocument();
  });

  it("shows only what the student has — a bare profile gets no empty sections", async () => {
    vi.mocked(getStudentProfile).mockResolvedValue(
      fullProfile({
        bio: null as unknown as string,
        interests: [],
        university: undefined,
        faculty: undefined,
        department: undefined,
        badges: [],
        gig_reputation: undefined,
        social_links: null,
        created_at: undefined,
        level: undefined,
      })
    );
    renderModal();
    await screen.findByText("Total XP");

    for (const heading of ["About", "Academic", "Interests", "Gig reputation", "Links"]) {
      expect(within(sheet()).queryByRole("heading", { name: heading })).not.toBeInTheDocument();
    }
    expect(within(sheet()).queryByText(/Member since/)).not.toBeInTheDocument();
  });

  it("never prints 'Invalid Date' when the join date can't be read", async () => {
    vi.mocked(getStudentProfile).mockResolvedValue(fullProfile({ created_at: "not a date" }));
    renderModal();
    await screen.findByText("Total XP");

    expect(within(sheet()).queryByText(/Member since/)).not.toBeInTheDocument();
    expect(within(sheet()).queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it("leaves out a stat tile when the API didn't send that number, but shows a real zero", async () => {
    vi.mocked(getStudentProfile).mockResolvedValue(
      fullProfile({ streak_days: undefined, xp_total: 0, courses_enrolled: undefined, badges_count: undefined, badges: undefined })
    );
    renderModal();
    await screen.findByText("Total XP");

    expect(within(sheet()).queryByText("Day streak")).not.toBeInTheDocument();
    expect(within(sheet()).queryByText("Courses")).not.toBeInTheDocument();
    expect(within(sheet()).queryByText("Badges")).not.toBeInTheDocument();
    // Zero XP is a value, not a missing one.
    expect(within(sheet()).getByText("0 XP")).toBeInTheDocument();
  });

  it("falls back to the row's name when the profile has none", async () => {
    vi.mocked(getStudentProfile).mockResolvedValue(
      fullProfile({ full_name: undefined, firstname: null, lastname: null })
    );
    renderModal(entry({ student_name: "  Mariama Bah " }));
    await screen.findByText("Total XP");

    expect(within(sheet()).getByRole("heading", { name: "Mariama Bah" })).toBeInTheDocument();
  });
});

describe("StudentProfileModal — links", () => {
  it("opens safe links in a new tab, and completes a bare domain with https", async () => {
    renderModal();

    const linkedin = await screen.findByRole("link", { name: "LinkedIn" });
    expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/james");
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/james"
    );
  });

  it("never renders a javascript: link that another student could tap", async () => {
    renderModal();
    await screen.findByRole("link", { name: "LinkedIn" });

    expect(screen.queryByRole("link", { name: "Twitter" })).not.toBeInTheDocument();
    for (const link of within(sheet()).getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^https?:/);
    }
  });
});

describe("StudentProfileModal — badges", () => {
  const many = () =>
    Array.from({ length: 8 }, (_, i) => badge(i + 1, `Badge ${i + 1}`, i === 1 ? null : `https://x.test/${i}.png`));

  it("shows the first six, and the rest on request", async () => {
    vi.mocked(getStudentProfile).mockResolvedValue(fullProfile({ badges: many(), badges_count: 8 }));
    renderModal();
    await screen.findByText("Badge 1");

    expect(screen.getByText("Badge 6")).toBeInTheDocument();
    expect(screen.queryByText("Badge 7")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /Show all 8 badges/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);

    expect(screen.getByText("Badge 8")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show fewer/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("offers no toggle when there are only a few", async () => {
    renderModal();
    await screen.findByText("First Steps");

    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });

  it("uses a medal in place of a missing or broken badge picture", async () => {
    renderModal();
    await screen.findByText("First Steps");

    const items = within(sheet()).getAllByRole("listitem").filter((li) => /First Steps|Quiz Whiz/.test(li.textContent ?? ""));
    const withPicture = items.find((li) => li.textContent?.includes("First Steps")) as HTMLElement;
    const withoutPicture = items.find((li) => li.textContent?.includes("Quiz Whiz")) as HTMLElement;
    expect(withPicture.querySelector("img")).not.toBeNull();
    expect(withoutPicture.querySelector("img")).toBeNull();

    fireEvent.error(withPicture.querySelector("img") as HTMLImageElement);
    expect(withPicture.querySelector("img")).toBeNull();
  });
});

describe("StudentProfileModal — the photo", () => {
  const openPhoto = () => userEvent.click(screen.getByRole("button", { name: "View James Bangura's photo" }));

  it("opens the photo full size when it's clicked, view-only (no 'Change photo')", async () => {
    renderModal();
    await screen.findByText("Total XP");

    await openPhoto();

    const viewer = screen.getByRole("dialog", { name: "Profile photo" });
    expect(within(viewer).getByAltText("James Bangura's profile photo")).toHaveAttribute("src", PHOTO);
    expect(within(viewer).queryByRole("button", { name: /Change photo|Add a photo/ })).not.toBeInTheDocument();
  });

  it("is available straight away, from the row's photo, before the details arrive", async () => {
    vi.mocked(getStudentProfile).mockReturnValue(new Promise(() => {}));
    renderModal();

    await openPhoto();

    expect(screen.getByRole("dialog", { name: "Profile photo" })).toBeInTheDocument();
  });

  it("closes the photo without closing the profile behind it — including on Escape", async () => {
    const { onClose } = renderModal();
    await screen.findByText("Total XP");

    await openPhoto();
    const viewer = screen.getByRole("dialog", { name: "Profile photo" });
    await userEvent.click(within(viewer).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Profile photo" })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await openPhoto();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Profile photo" })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled(); // one Escape = one layer
    expect(sheet()).toBeInTheDocument();
  });

  it("gives focus back to the photo when the viewer closes", async () => {
    renderModal();
    await screen.findByText("Total XP");
    const avatar = screen.getByRole("button", { name: "View James Bangura's photo" });

    await userEvent.click(avatar);
    await userEvent.keyboard("{Escape}");

    expect(avatar).toHaveFocus();
  });

  it("has nothing to enlarge when the student has no photo", async () => {
    vi.mocked(getStudentProfile).mockResolvedValue(fullProfile({ avatar_url: undefined }));
    renderModal(entry({ student_avatar: undefined }));
    await screen.findByText("Total XP");

    expect(screen.queryByRole("button", { name: /View .* photo/ })).not.toBeInTheDocument();
    expect(within(sheet()).getByLabelText("James Bangura, summary")).toHaveTextContent("JB");
  });

  it("stops offering to enlarge a photo that turns out to be broken", async () => {
    const { baseElement } = renderModal();
    await screen.findByText("Total XP");
    const hero = within(sheet()).getByLabelText("James Bangura, summary");

    fireEvent.error(hero.querySelector("img") as HTMLImageElement);

    expect(screen.queryByRole("button", { name: /View .* photo/ })).not.toBeInTheDocument();
    expect(hero).toHaveTextContent("JB");
    expect(baseElement.querySelector("[role='dialog'][aria-label='Profile photo']")).toBeNull();
  });
});

describe("StudentProfileModal — when it can't load", () => {
  it("says so and lets the student try again", async () => {
    vi.mocked(getStudentProfile)
      .mockRejectedValueOnce(axiosError(500))
      .mockResolvedValueOnce(fullProfile());
    renderModal();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("couldn't load this profile");
    // The top of the sheet is still there.
    expect(within(sheet()).getByRole("heading", { name: "James Bangura" })).toBeInTheDocument();

    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Third-year engineering student.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([403, 404])("explains an unavailable profile (%i) without offering a pointless retry", async (status) => {
    vi.mocked(getStudentProfile).mockRejectedValue(axiosError(status));
    renderModal();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("isn't available");
    expect(within(alert).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});

describe("StudentProfileModal — styling that works in Tailwind v4", () => {
  it("doesn't use the removed opacity utilities, and the header is dark enough for white text", async () => {
    renderModal();
    await screen.findByText("Total XP");

    const hero = within(sheet()).getByLabelText("James Bangura, summary");
    expect(sheet().outerHTML).not.toMatch(/-opacity-\d/);
    expect(hero.className).toContain("from-azure-400");
    expect(hero.className).not.toContain("from-azure-500");
  });

  it("waits for the details without leaving the page jumpy: loading placeholders, then content", async () => {
    renderModal();
    expect(within(sheet()).getByRole("status")).toBeInTheDocument();

    await waitFor(() => expect(within(sheet()).queryByRole("status")).not.toBeInTheDocument());
  });
});
