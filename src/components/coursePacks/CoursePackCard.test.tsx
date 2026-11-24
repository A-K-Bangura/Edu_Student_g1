import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CoursePackCard } from "./CoursePackCard";
import type { CoursePack } from "../../types/coursePack";

const pack = (overrides: Partial<CoursePack> = {}): CoursePack => ({
  id: 3,
  uuid: "pack-uuid-3",
  name: "Starter 3",
  description: "Three paid courses for the semester.",
  unlock_count: 3,
  price: 150,
  standard_price: 200,
  currency: "SLE",
  promo_applied: true,
  promotion: { promo_price: 150, starts_at: null, ends_at: null },
  validity_type: "semester",
  academic_period: {
    id: 12,
    name: "2026/2027 Semester 1",
    type: "semester",
    academic_year: "2026/2027",
    semester: 1,
  },
  can_purchase: true,
  blocked_reason: null,
  terms: {
    unlock_scope: "Each unlock opens one eligible paid course. Free courses never use one.",
    expires_when: "The academic period is closed by the university administrator.",
    unused_unlocks: "Unused unlocks expire with the period and do not roll over.",
    refunds: "Payments are not refunded.",
  },
  ...overrides,
});

describe("CoursePackCard", () => {
  it("shows a % off tag, struck-through standard price, savings (no repeated percent) and period, for an active promotion", () => {
    render(<CoursePackCard pack={pack()} onChoose={vi.fn()} />);

    // The tag carries the discount percentage, so the savings line omits it.
    expect(screen.getByText("25% off")).toBeInTheDocument();
    expect(screen.getByText("3 course unlocks")).toBeInTheDocument();
    expect(screen.getByLabelText("Standard price")).toHaveTextContent("SLE 200.00");
    expect(screen.getByLabelText("Now")).toHaveTextContent("SLE 150.00");
    expect(screen.getByText("Save SLE 50.00")).toBeInTheDocument();
    expect(screen.getByText("2026/2027 Semester 1")).toBeInTheDocument();
  });

  it("shows an unlock-count tag and a single price with no promo styling when no promotion applies", () => {
    render(
      <CoursePackCard
        pack={pack({ promo_applied: false, promotion: null })}
        onChoose={vi.fn()}
      />
    );

    expect(screen.getByText("3 unlocks")).toBeInTheDocument();
    expect(screen.getByText("3 course unlocks")).toBeInTheDocument();
    expect(screen.queryByLabelText("Standard price")).not.toBeInTheDocument();
    expect(screen.getByText("SLE 150.00")).toBeInTheDocument();
  });

  it("falls back to the unlock-count tag instead of a misleading '0% off' for a negligible promotion", () => {
    render(
      <CoursePackCard
        pack={pack({ standard_price: 1000.3, price: 1000 })}
        onChoose={vi.fn()}
      />
    );

    expect(screen.getByText("3 unlocks")).toBeInTheDocument();
    expect(screen.queryByText("0% off")).not.toBeInTheDocument();
    // Still priced/struck through as a promotion, just without the badge.
    expect(screen.getByLabelText("Standard price")).toHaveTextContent("SLE 1,000.30");
    expect(screen.getByText(/^Save SLE 0\.30$/)).toBeInTheDocument();
  });

  it("calls onChoose when the button is clicked", () => {
    const onChoose = vi.fn();
    render(<CoursePackCard pack={pack()} onChoose={onChoose} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose this pack" }));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it("disables the button and explains why when blocked", () => {
    render(
      <CoursePackCard
        pack={pack({
          can_purchase: false,
          blocked_reason: "NO_ACTIVE_ACADEMIC_PERIOD",
          academic_period: null,
        })}
        onChoose={vi.fn()}
      />
    );

    expect(
      screen.getByText(/doesn't have an open semester/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose this pack" })).toBeDisabled();
  });

  it("shows the busy label and an error message when choosing failed", () => {
    render(
      <CoursePackCard
        pack={pack()}
        onChoose={vi.fn()}
        isChoosing
        errorMessage="Something went wrong."
      />
    );

    expect(screen.getByRole("button", { name: "Starting checkout…" })).toBeInTheDocument();
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });
});
