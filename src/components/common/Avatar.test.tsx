import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { Avatar } from "./Avatar";

const img = (container: HTMLElement) => container.querySelector("img");

describe("Avatar", () => {
  it("shows initials when there's no photo", () => {
    const { container } = render(<Avatar name="Amara Kamara" />);

    expect(container).toHaveTextContent("AK");
    expect(img(container)).toBeNull();
  });

  it("treats an empty or missing photo address as no photo", () => {
    const empty = render(<Avatar name="Amara Kamara" src="" />);
    expect(img(empty.container)).toBeNull();
    const none = render(<Avatar name="Amara Kamara" src={null} />);
    expect(img(none.container)).toBeNull();
  });

  it("keeps the initials showing until the photo has actually loaded", () => {
    const { container } = render(<Avatar name="Amara Kamara" src="https://x.test/a.jpg" />);

    // Photo requested, not here yet: initials still on screen (no blank circle).
    expect(img(container)).toHaveAttribute("src", "https://x.test/a.jpg");
    expect(container).toHaveTextContent("AK");

    fireEvent.load(img(container) as HTMLImageElement);

    expect(container).not.toHaveTextContent("AK");
    expect(img(container)).not.toBeNull();
  });

  it("falls back to the initials, with no broken-image icon, when the photo fails", () => {
    const { container } = render(<Avatar name="Amara Kamara" src="https://x.test/gone.jpg" />);

    fireEvent.error(img(container) as HTMLImageElement);

    expect(img(container)).toBeNull();
    expect(container).toHaveTextContent("AK");
  });

  it("gives a replacement photo a fresh try after the old address failed", () => {
    const view = render(<Avatar name="Amara Kamara" src="https://x.test/old.jpg" />);
    fireEvent.error(img(view.container) as HTMLImageElement);
    expect(img(view.container)).toBeNull();

    view.rerender(<Avatar name="Amara Kamara" src="https://x.test/new.jpg" />);

    expect(img(view.container)).toHaveAttribute("src", "https://x.test/new.jpg");
  });

  it("loads lazily when asked, eagerly otherwise", () => {
    const lazy = render(<Avatar name="A B" src="https://x.test/a.jpg" lazy />);
    expect(img(lazy.container)).toHaveAttribute("loading", "lazy");
    const eager = render(<Avatar name="A B" src="https://x.test/a.jpg" />);
    expect(img(eager.container)).toHaveAttribute("loading", "eager");
  });

  it("reports whether the photo could be shown", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <Avatar name="A B" src="https://x.test/a.jpg" onStatusChange={onStatusChange} />
    );

    fireEvent.load(img(container) as HTMLImageElement);
    expect(onStatusChange).toHaveBeenLastCalledWith("loaded");

    const failing = vi.fn();
    const broken = render(<Avatar name="A B" src="https://x.test/b.jpg" onStatusChange={failing} />);
    fireEvent.error(img(broken.container) as HTMLImageElement);
    expect(failing).toHaveBeenCalledWith("failed");
  });

  it("is decorative: hidden from screen readers, since the name is always beside it", () => {
    const { container } = render(<Avatar name="Amara Kamara" src="https://x.test/a.jpg" />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(img(container)).toHaveAttribute("alt", "");
  });

  it("takes its size and styling from className", () => {
    const { container } = render(<Avatar name="A B" className="size-10 text-base ring-4" />);

    expect(container.firstElementChild?.className).toMatch(/size-10.*text-base.*ring-4/);
  });

  it("doesn't use the removed Tailwind opacity utilities", () => {
    const { container } = render(<Avatar name="A B" src="https://x.test/a.jpg" />);

    expect(container.innerHTML).not.toMatch(/-opacity-\d/);
  });
});
