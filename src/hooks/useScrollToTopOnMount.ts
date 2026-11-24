import { useLayoutEffect } from "react";

/**
 * Makes the page always open at the top, however it was reached.
 *
 * - **Links.** The router (a plain `BrowserRouter`) never resets the window's
 *   scroll, so a page opened from a scrolled-down one inherits that offset —
 *   e.g. tapping a link near the bottom of the Dashboard opens the next page
 *   part-way down. A layout effect, so it is never painted at that offset.
 * - **Back/Forward.** The browser would otherwise re-apply the offset this
 *   history entry had when the student left it — and does so *after* the page
 *   has rendered, undoing the reset above. Switching restoration to manual for
 *   this entry stops that. The flag belongs to the history entry, and a newly
 *   pushed entry starts with the current one's value, so it is set back to
 *   `auto` on unmount; otherwise it would leak onto whatever page the student
 *   visits next. (It must be `auto`, not "whatever it was on mount": coming
 *   back to this entry via Back finds it already `manual`, and restoring that
 *   would leak it.) Nothing else in the app changes this flag.
 *
 * `instant`, because a site-wide `scroll-behavior: smooth` would otherwise
 * animate the jump from deep in the list.
 */
export const useScrollToTopOnMount = (): void => {
  useLayoutEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    return () => {
      window.history.scrollRestoration = "auto";
    };
  }, []);
};
