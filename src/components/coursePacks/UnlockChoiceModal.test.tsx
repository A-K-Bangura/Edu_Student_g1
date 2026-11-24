import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnlockChoiceModal } from "./UnlockChoiceModal";
import type { AccessBlock } from "../../types/coursePack";
import type { CoursePack } from "../../types/coursePack";

vi.mock("../../services/courses", () => ({
  enrollInCourse: vi.fn(),
}));
vi.mock("../../services/coursePacks", () => ({
  getCoursePacks: vi.fn(),
  purchaseCoursePack: vi.fn(),
  unlockCourse: vi.fn(),
}));

import { enrollInCourse } from "../../services/courses";
import { getCoursePacks, purchaseCoursePack, unlockCourse } from "../../services/coursePacks";

const samplePack = (overrides: Partial<CoursePack> = {}): CoursePack => ({
  id: 3,
  uuid: "pack-uuid-3",
  name: "Starter 3",
  description: null,
  unlock_count: 3,
  price: 150,
  standard_price: 150,
  currency: "SLE",
  promo_applied: false,
  promotion: null,
  validity_type: "semester",
  academic_period: { id: 12, name: "2026/2027 Semester 1", type: "semester", academic_year: "2026/2027" },
  can_purchase: true,
  blocked_reason: null,
  terms: {
    unlock_scope: "Each unlock opens one eligible paid course.",
    expires_when: "The academic period is closed by the university administrator.",
    unused_unlocks: "Unused unlocks expire with the period.",
    refunds: "Payments are not refunded.",
  },
  ...overrides,
});

const access = (overrides: Partial<AccessBlock> = {}): AccessBlock => ({
  has_access: false,
  source: null,
  enrollment_exists: false,
  expired: false,
  validity: {
    type: "semester",
    academic_period: { id: 12, name: "2026/2027 Semester 1", type: "semester", academic_year: "2026/2027" },
    blocked_reason: null,
    ends_when: "The academic period is closed by the university administrator.",
  },
  options: {
    individual: { available: true, price: 150, currency: "SLE" },
    pack_unlock: {
      eligible: true,
      available: true,
      remaining_unlocks: 2,
      pack: { uuid: "pack-uuid-3", name: "Starter 3", unlocks_granted: 3, unlocks_used: 1, remaining_unlocks: 2, academic_period: null },
    },
  },
  ...overrides,
});

const renderModal = (accessBlock: AccessBlock, onUnlocked = vi.fn()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onUnlocked,
    ...render(
      <QueryClientProvider client={client}>
        <UnlockChoiceModal
          open
          onClose={vi.fn()}
          courseId="7"
          courseTitle="Intro to Circuits"
          access={accessBlock}
          onUnlocked={onUnlocked}
        />
      </QueryClientProvider>
    ),
  };
};

beforeEach(() => {
  vi.mocked(getCoursePacks).mockResolvedValue({ packs: [], unlocks: { available: 2, packs: [] } });
  vi.mocked(enrollInCourse).mockReset();
  vi.mocked(unlockCourse).mockReset();
  vi.mocked(purchaseCoursePack).mockReset();
});

describe("UnlockChoiceModal", () => {
  it("shows the owned-unlock balance and the single-course option, each with its period", async () => {
    renderModal(access());

    expect(screen.getByText("Choose how to unlock")).toBeInTheDocument();
    expect(screen.getByText("You have 2 unlocks available.")).toBeInTheDocument();
    expect(screen.getByText("This course only")).toBeInTheDocument();
    expect(screen.getByText("SLE 150.00")).toBeInTheDocument();
    expect(screen.getAllByText("2026/2027 Semester 1").length).toBeGreaterThan(0);
  });

  it("shows 'Renew access' copy when access has expired", () => {
    renderModal(access({ expired: true }));
    expect(screen.getByText("Renew access")).toBeInTheDocument();
    expect(
      screen.getByText("Your progress is saved. Renew to pick up where you left off.")
    ).toBeInTheDocument();
  });

  it("confirms before spending an unlock, then calls onUnlocked on success", async () => {
    vi.mocked(unlockCourse).mockResolvedValue({
      outcome: "unlocked",
      unlock_used: true,
      remaining_unlocks: 1,
      access: access({ has_access: true }),
    });
    const { onUnlocked } = renderModal(access());

    fireEvent.click(screen.getByRole("button", { name: "Use 1 unlock" }));
    expect(
      screen.getByText((_, el) => el?.textContent === "Use 1 unlock for Intro to Circuits?")
    ).toBeInTheDocument();
    expect(unlockCourse).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(unlockCourse).toHaveBeenCalledWith("7"));
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
  });

  it("lets a student cancel out of the unlock confirmation without spending one", () => {
    renderModal(access());

    fireEvent.click(screen.getByRole("button", { name: "Use 1 unlock" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Use 1 unlock" })).toBeInTheDocument();
    expect(unlockCourse).not.toHaveBeenCalled();
  });

  it("starts an individual enrollment when continuing with this course alone", async () => {
    vi.mocked(enrollInCourse).mockResolvedValue({
      requires_payment: true,
      enrollment_state: "payment_pending",
      checkout_url: "https://pay.example/checkout",
      payment: { uuid: "p1", status: "pending", amount: 150, currency: "SLE", expires_at: null, paid_at: null, created_at: "" },
    });
    renderModal(access());

    fireEvent.click(screen.getByRole("button", { name: "Continue with this course" }));

    await waitFor(() => expect(enrollInCourse).toHaveBeenCalledWith("7"));
  });

  it("hides the unlock-balance row when the student has none available for this course", () => {
    renderModal(
      access({
        options: {
          individual: { available: true, price: 150, currency: "SLE" },
          pack_unlock: { eligible: true, available: false, remaining_unlocks: 0, pack: null },
        },
      })
    );

    expect(screen.queryByText(/unlocks available/)).not.toBeInTheDocument();
    expect(screen.getByText("This course only")).toBeInTheDocument();
  });

  it("hides the Course Pack catalogue when this course isn't pack-eligible", () => {
    renderModal(
      access({
        options: {
          individual: { available: true, price: 150, currency: "SLE" },
          pack_unlock: { eligible: false, available: false, remaining_unlocks: 0, pack: null },
        },
      })
    );

    expect(screen.queryByText("Choose a Course Pack")).not.toBeInTheDocument();
  });

  it("shows the Course Pack catalogue, and lets a student choose a pack", async () => {
    vi.mocked(getCoursePacks).mockResolvedValue({
      packs: [samplePack()],
      unlocks: { available: 0, packs: [] },
    });
    vi.mocked(purchaseCoursePack).mockResolvedValue({
      id: 41,
      uuid: "purchase-uuid",
      name: "Starter 3",
      unlocks_granted: 3,
      validity_type: "semester",
      amount: 150,
      standard_price: 150,
      currency: "SLE",
      promo_applied: false,
      promotion: null,
      academic_period: null,
      payment_status: "pending",
      state: "payment_pending",
      checkout_url: "https://pay.example/pack-checkout",
      paid_at: null,
      pack_state: "pending",
      unlocks_used: 0,
      unlocks_expired: 0,
      remaining_unlocks: 0,
      activated_at: null,
      expired_at: null,
      lapsed_before_activation: false,
      created_at: "",
    });

    renderModal(access());

    expect(screen.getByText("Choose a Course Pack")).toBeInTheDocument();
    expect(await screen.findByText("Starter 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Choose this pack" }));

    await waitFor(() => expect(purchaseCoursePack).toHaveBeenCalledWith("pack-uuid-3"));
  });

  it("surfaces a blocked validity reason (e.g. no open academic period)", () => {
    renderModal(
      access({
        validity: {
          type: "semester",
          academic_period: null,
          blocked_reason: "NO_ACTIVE_ACADEMIC_PERIOD",
          ends_when: "",
        },
      })
    );

    expect(screen.getByText(/doesn't have an open semester/)).toBeInTheDocument();
  });
});
