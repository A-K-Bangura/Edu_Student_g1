import { useCallback, useRef, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";

const ARM_THRESHOLD_PX = 12;
const COMMIT_FRACTION = 0.2;
const FLICK_VELOCITY_PX_MS = 0.5;
const EDGE_GUARD_PX = 24;
const SETTLE_MS = 220;
const REDUCED_MOTION_MS = 100;

const IGNORE_SELECTOR =
  'input, textarea, select, audio, [role="slider"], video, [data-no-swipe], [role="dialog"]';

const allowAnyTarget = () => true;

/**
 * True when the gesture starts inside a box that scrolls sideways (a wide
 * formula, table or code block): that box owns the swipe, not the pager.
 * `container` itself is excluded — it's the pager.
 */
const startsInHorizontalScroller = (
  target: HTMLElement,
  container: HTMLElement
): boolean => {
  for (
    let el: HTMLElement | null = target;
    el && el !== container;
    el = el.parentElement
  ) {
    if (el.scrollWidth > el.clientWidth) {
      const { overflowX } = window.getComputedStyle(el);
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
  }
  return false;
};

interface UseSwipeTabsOptions {
  /** Number of panels, e.g. 3 for Feed/Opportunities/Gigs. */
  tabCount: number;
  activeIndex: number;
  /** Called once a swipe commits to a new tab (caller navigates with `{replace:true}`). */
  onCommit: (nextIndex: number) => void;
  disabled?: boolean;
  /**
   * Vetoes a destination (beyond the first/last edges, which are always
   * refused). A vetoed swipe resists like an edge and snaps back, rather than
   * sliding away and then jumping back when `onCommit` declines.
   */
  canGoTo?: (nextIndex: number) => boolean;
}

interface UseSwipeTabsResult {
  containerProps: {
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerUp: (event: React.PointerEvent) => void;
    onPointerCancel: (event: React.PointerEvent) => void;
    onClickCapture: (event: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
  isDragging: boolean;
}

/**
 * Touch-only horizontal swipe between an ordered set of panels: the
 * Feed/Opportunities/Gigs discovery tabs, and the screens of a lesson in the
 * course player. Pointer Events (filtered to `pointerType === "touch"`) rather than
 * raw Touch Events — one listener set, and mouse/trackpad drag is never
 * armed since the guide only asks for touch-device swipe (tap/keyboard are
 * handled separately, by the tablist itself, not this hook).
 *
 * Only the active panel is ever mounted (see FeedShell/App.tsx routing), so
 * there is no adjacent panel to slide into view during the drag — the active
 * panel translates during the gesture, then a route change mounts the next
 * one fresh on commit. A true dual-panel pager would need both tabs mounted
 * mid-drag, which conflicts with "never continuously fetch hidden panels."
 */
export const useSwipeTabs = ({
  tabCount,
  activeIndex,
  onCommit,
  disabled = false,
  canGoTo = allowAnyTarget,
}: UseSwipeTabsOptions): UseSwipeTabsResult => {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [settling, setSettling] = useState(false);

  const state = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    startTime: number;
    armed: boolean;
    containerWidth: number;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    armed: false,
    containerWidth: 1,
  });

  const justDraggedRef = useRef(false);

  const reset = useCallback(() => {
    state.current.pointerId = null;
    state.current.armed = false;
    setIsDragging(false);
  }, []);

  const settleTo = useCallback(
    (target: number, after: () => void) => {
      setSettling(true);
      setDragOffsetPx(target);
      const duration = prefersReducedMotion ? REDUCED_MOTION_MS : SETTLE_MS;
      window.setTimeout(() => {
        setSettling(false);
        setDragOffsetPx(0);
        after();
      }, duration);
    },
    [prefersReducedMotion]
  );

  const cancelGesture = useCallback(() => {
    const wasArmed = state.current.armed;
    reset();
    if (wasArmed) settleTo(0, () => {});
  }, [reset, settleTo]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled || event.pointerType !== "touch") return;
      if (!event.isPrimary) {
        // A second finger is a pinch, not a swipe: drop whatever the first
        // finger had started rather than let the pair commit a page change.
        cancelGesture();
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest(IGNORE_SELECTOR)) return;

      const container = event.currentTarget as HTMLElement;
      if (startsInHorizontalScroller(target, container)) return;

      const viewportWidth = window.innerWidth;
      if (event.clientX < EDGE_GUARD_PX || event.clientX > viewportWidth - EDGE_GUARD_PX) {
        return; // leave room for the browser's own edge-back gesture
      }

      state.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now(),
        armed: false,
        containerWidth: container.offsetWidth || viewportWidth,
      };
    },
    [disabled, cancelGesture]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (state.current.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.current.startX;
      const dy = event.clientY - state.current.startY;

      if (!state.current.armed) {
        if (Math.abs(dx) < ARM_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) {
          return; // ambiguous — let native scroll proceed
        }
        state.current.armed = true;
        setIsDragging(true);
      }

      event.preventDefault();

      // Resist (rubber-band) when there is nowhere to go: past either edge, or
      // to a destination the caller has vetoed.
      const destination = activeIndex + (dx < 0 ? 1 : -1);
      const blocked =
        destination < 0 || destination > tabCount - 1 || !canGoTo(destination);
      setDragOffsetPx(prefersReducedMotion ? 0 : blocked ? dx * 0.35 : dx);
    },
    [activeIndex, tabCount, canGoTo, prefersReducedMotion]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (state.current.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.current.startX;
      const elapsed = Math.max(1, performance.now() - state.current.startTime);
      const wasArmed = state.current.armed;
      reset();
      if (!wasArmed) return;

      const velocity = Math.abs(dx) / elapsed;
      const commit =
        Math.abs(dx) > state.current.containerWidth * COMMIT_FRACTION ||
        velocity > FLICK_VELOCITY_PX_MS;

      if (!commit) {
        settleTo(0, () => {});
        return;
      }

      const direction = dx < 0 ? 1 : -1; // left swipe -> next tab
      const nextIndex = Math.min(tabCount - 1, Math.max(0, activeIndex + direction));

      if (nextIndex === activeIndex || !canGoTo(nextIndex)) {
        // At an edge, or the caller vetoed this destination — snap back, no navigation.
        settleTo(0, () => {});
        return;
      }

      justDraggedRef.current = true;
      settleTo(direction * state.current.containerWidth, () => {
        // A touch drag normally produces no click at all. If none arrived by
        // now, the flag would otherwise sit there and swallow the student's
        // next real tap (e.g. the first answer tapped on a quiz screen).
        justDraggedRef.current = false;
        onCommit(nextIndex);
      });
    },
    [activeIndex, tabCount, canGoTo, onCommit, reset, settleTo]
  );

  // Swallows only the one synthetic click that immediately follows a
  // recognized drag release, so a card underneath the finger doesn't
  // accidentally navigate — an ordinary tap is never touched (preventDefault
  // only ever fires after arming at >12px of horizontal-dominant movement).
  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      event.stopPropagation();
      event.preventDefault();
    }
  }, []);

  return {
    isDragging,
    containerProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: cancelGesture,
      onClickCapture,
      style: {
        touchAction: "pan-y",
        transform: dragOffsetPx ? `translateX(${dragOffsetPx}px)` : undefined,
        transition: settling
          ? `transform ${prefersReducedMotion ? REDUCED_MOTION_MS : SETTLE_MS}ms ease-out`
          : undefined,
      },
    },
  };
};
