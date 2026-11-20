import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useSwipeTabs } from "./useSwipeTabs";

// Fake timers: the commit rule depends on elapsed time (flick velocity) and on
// the 220ms settle animation, so both need to be under the test's control.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

interface HarnessProps {
  activeIndex?: number;
  tabCount?: number;
  disabled?: boolean;
  canGoTo?: (nextIndex: number) => boolean;
  onCommit: (nextIndex: number) => void;
  children?: React.ReactNode;
  onTap?: () => void;
}

const Harness = ({
  activeIndex = 1,
  tabCount = 3,
  disabled,
  canGoTo,
  onCommit,
  onTap,
  children,
}: HarnessProps) => {
  const { containerProps, isDragging } = useSwipeTabs({
    tabCount,
    activeIndex,
    onCommit,
    disabled,
    canGoTo,
  });
  return (
    <div data-testid="pager" data-dragging={String(isDragging)} {...containerProps}>
      <button type="button" onClick={onTap}>
        tap target
      </button>
      {children}
    </div>
  );
};

// jsdom is 1024px wide: a swipe commits past 20% of it (~205px) or at a flick.
const pointer = (
  el: Element,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  x: number,
  y = 100,
  init: PointerEventInit = {}
) =>
  fireEvent(
    el,
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      clientX: x,
      clientY: y,
      ...init,
    })
  );

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const SETTLE = 250; // > the 220ms settle animation

/** A finger that travels from startX to endX over `ms`, then lifts. */
const swipe = (
  el: Element,
  startX: number,
  endX: number,
  { ms = 400, y = 100 }: { ms?: number; y?: number } = {}
) => {
  pointer(el, "pointerdown", startX, y);
  pointer(el, "pointermove", startX + (endX - startX) / 2, y);
  pointer(el, "pointermove", endX, y);
  advance(ms);
  pointer(el, "pointerup", endX, y);
};

describe("useSwipeTabs — committing a swipe", () => {
  it("goes forward on a long left swipe, only after the settle animation", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const pager = screen.getByTestId("pager");

    swipe(pager, 700, 300);
    expect(onCommit).not.toHaveBeenCalled();
    advance(SETTLE);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(2);
  });

  it("goes back on a long right swipe", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    swipe(screen.getByTestId("pager"), 300, 700);
    advance(SETTLE);
    expect(onCommit).toHaveBeenCalledWith(0);
  });

  it("snaps back, without navigating, on a short slow drag", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const pager = screen.getByTestId("pager");

    swipe(pager, 500, 440, { ms: 400 }); // 60px at 0.15px/ms
    advance(SETTLE);
    expect(onCommit).not.toHaveBeenCalled();
    expect(pager.style.transform).toBe("");
  });

  it("commits a short but fast flick", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    swipe(screen.getByTestId("pager"), 500, 440, { ms: 40 }); // 60px at 1.5px/ms
    advance(SETTLE);
    expect(onCommit).toHaveBeenCalledWith(2);
  });

  it("never arms on vertical-dominant movement, so scrolling is untouched", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const pager = screen.getByTestId("pager");

    pointer(pager, "pointerdown", 500, 100);
    pointer(pager, "pointermove", 530, 400); // mostly down
    expect(pager).toHaveAttribute("data-dragging", "false");
    advance(400);
    pointer(pager, "pointerup", 530, 400);
    advance(SETTLE);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("follows the finger while dragging", () => {
    render(<Harness onCommit={vi.fn()} />);
    const pager = screen.getByTestId("pager");

    pointer(pager, "pointerdown", 600, 100);
    pointer(pager, "pointermove", 500, 100);
    expect(pager).toHaveAttribute("data-dragging", "true");
    expect(pager.style.transform).toBe("translateX(-100px)");
  });

  it("keeps vertical scrolling allowed on the container", () => {
    render(<Harness onCommit={vi.fn()} />);
    expect(screen.getByTestId("pager").style.touchAction).toBe("pan-y");
  });
});

describe("useSwipeTabs — edges and vetoes", () => {
  it("does nothing past the first or last panel, and resists the drag", () => {
    const onCommit = vi.fn();
    const first = render(<Harness activeIndex={0} onCommit={onCommit} />);
    swipe(screen.getByTestId("pager"), 300, 700); // right, at the start
    advance(SETTLE);
    first.unmount();

    render(<Harness activeIndex={2} onCommit={onCommit} />);
    swipe(screen.getByTestId("pager"), 700, 300); // left, at the end
    advance(SETTLE);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("refuses a destination the caller vetoes, resisting like an edge instead of sliding away", () => {
    const onCommit = vi.fn();
    const canGoTo = (next: number) => next < 1; // forward (to 2) is locked
    render(<Harness onCommit={onCommit} canGoTo={canGoTo} />);
    const pager = screen.getByTestId("pager");

    pointer(pager, "pointerdown", 600, 100);
    pointer(pager, "pointermove", 500, 100); // dx -100, toward the vetoed panel
    expect(pager.style.transform).toBe("translateX(-35px)"); // rubber-banded
    pointer(pager, "pointerup", 300, 100);
    advance(SETTLE);
    expect(onCommit).not.toHaveBeenCalled();
    expect(pager.style.transform).toBe("");
  });

  it("still allows the other direction when only one is vetoed", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} canGoTo={(next) => next < 1} />);

    swipe(screen.getByTestId("pager"), 300, 700); // right -> panel 0, allowed
    advance(SETTLE);
    expect(onCommit).toHaveBeenCalledWith(0);
  });

  it("does nothing while disabled", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} disabled />);

    swipe(screen.getByTestId("pager"), 700, 300);
    advance(SETTLE);
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("useSwipeTabs — gestures that belong to something else", () => {
  it("ignores mouse and pen pointers", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const pager = screen.getByTestId("pager");

    for (const pointerType of ["mouse", "pen"]) {
      pointer(pager, "pointerdown", 700, 100, { pointerType });
      pointer(pager, "pointermove", 300, 100, { pointerType });
      advance(400);
      pointer(pager, "pointerup", 300, 100, { pointerType });
    }
    advance(SETTLE);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("leaves the browser's edge-back gesture alone", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const pager = screen.getByTestId("pager");

    swipe(pager, 10, 600); // starts in the left 24px
    swipe(pager, 1015, 400); // starts in the right 24px
    advance(SETTLE);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it.each([
    ["an input", <input key="i" aria-label="answer" />],
    ["a textarea", <textarea key="t" aria-label="notes" />],
    ["an audio player", <audio key="a" aria-label="recording" controls />],
    ["a video", <video key="v" aria-label="clip" controls />],
    ["a slider", <div key="s" role="slider" aria-label="seek" aria-valuenow={1} tabIndex={0} />],
    ["an opted-out region", <div key="n" data-no-swipe aria-label="opted out" />],
    ["a dialog", <div key="d" role="dialog" aria-label="preview" />],
  ])("ignores a swipe that starts on %s", (_label, child) => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit}>{child}</Harness>);

    const target = screen.getByLabelText(/answer|notes|recording|clip|seek|opted out|preview/);
    swipe(target, 700, 300);
    advance(SETTLE);
    expect(onCommit).not.toHaveBeenCalled();
  });

  describe("sideways-scrolling content (wide formula, table, code)", () => {
    const scroller = (scrollWidth: number, clientWidth: number) => (
      <div
        aria-label="wide formula"
        role="group"
        style={{ overflowX: "auto" }}
        ref={(el) => {
          if (el) {
            Object.defineProperty(el, "scrollWidth", { value: scrollWidth, configurable: true });
            Object.defineProperty(el, "clientWidth", { value: clientWidth, configurable: true });
          }
        }}
      >
        <span>x = (-b ± √(b² - 4ac)) / 2a</span>
      </div>
    );

    it("leaves a swipe that starts inside an overflowing box to that box", () => {
      const onCommit = vi.fn();
      render(<Harness onCommit={onCommit}>{scroller(900, 300)}</Harness>);

      // Start on the text *inside* the scroller: it's an ancestor that scrolls.
      swipe(screen.getByText(/x = /), 700, 300);
      advance(SETTLE);
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("still pages when the box isn't actually overflowing", () => {
      const onCommit = vi.fn();
      render(<Harness onCommit={onCommit}>{scroller(300, 300)}</Harness>);

      swipe(screen.getByText(/x = /), 700, 300);
      advance(SETTLE);
      expect(onCommit).toHaveBeenCalledWith(2);
    });
  });

  it("abandons the swipe when a second finger lands (a pinch is not a page turn)", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const pager = screen.getByTestId("pager");

    pointer(pager, "pointerdown", 700, 100);
    pointer(pager, "pointermove", 500, 100);
    expect(pager).toHaveAttribute("data-dragging", "true");

    pointer(pager, "pointerdown", 400, 200, { pointerId: 2, isPrimary: false });
    expect(pager).toHaveAttribute("data-dragging", "false");

    pointer(pager, "pointermove", 300, 100);
    advance(400);
    pointer(pager, "pointerup", 300, 100);
    advance(SETTLE);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("cancels cleanly when the browser takes the gesture over (pointercancel)", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const pager = screen.getByTestId("pager");

    pointer(pager, "pointerdown", 700, 100);
    pointer(pager, "pointermove", 500, 100);
    pointer(pager, "pointercancel", 500, 100);
    advance(SETTLE);
    expect(pager).toHaveAttribute("data-dragging", "false");
    expect(pager.style.transform).toBe("");
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("useSwipeTabs — taps around a swipe", () => {
  it("swallows the click a browser sends right after a recognised drag", () => {
    const onTap = vi.fn();
    render(<Harness onCommit={vi.fn()} onTap={onTap} />);
    const pager = screen.getByTestId("pager");

    swipe(pager, 700, 300);
    fireEvent.click(screen.getByRole("button", { name: "tap target" })); // synthetic click
    expect(onTap).not.toHaveBeenCalled();
  });

  it("doesn't swallow the student's next real tap when the drag produced no click", () => {
    const onTap = vi.fn();
    render(<Harness onCommit={vi.fn()} onTap={onTap} />);
    const pager = screen.getByTestId("pager");

    swipe(pager, 700, 300); // touch drags normally send no click at all
    advance(SETTLE);
    fireEvent.click(screen.getByRole("button", { name: "tap target" }));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("never interferes with an ordinary tap", () => {
    const onTap = vi.fn();
    render(<Harness onCommit={vi.fn()} onTap={onTap} />);
    const pager = screen.getByTestId("pager");

    pointer(pager, "pointerdown", 500, 100);
    pointer(pager, "pointerup", 500, 100);
    fireEvent.click(screen.getByRole("button", { name: "tap target" }));
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
