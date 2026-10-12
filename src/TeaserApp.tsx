import { Suspense, lazy, useLayoutEffect } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Landing } from "./pages/Landing";

const ComingSoon = lazy(() =>
  import("./pages/ComingSoon").then((m) => ({ default: m.ComingSoon }))
);

// Plain white, matching the landing page: the app's PageShell fallback would
// flash nav links to pages that don't exist yet.
const Blank = () => <div className="min-h-svh bg-white" aria-busy="true" />;

// BrowserRouter keeps the scroll offset across navigations. A CTA far down the
// long landing page would open the short "coming soon" page scrolled past its
// mascot and headline, and "Take me back home" would open the landing page
// partway down. Back/forward (POP) is left to the browser, which restores the
// scroll position the visitor left.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  useLayoutEffect(() => {
    if (navigationType !== "POP") window.scrollTo(0, 0);
  }, [pathname, navigationType]);
  return null;
};

/**
 * Teaser routes: the landing page, and "coming soon" for everything else.
 * Landing is the only page here, so it's imported eagerly (no Suspense flash).
 */
export const TeaserRoutes = () => (
  <>
    <ScrollToTop />
    <Suspense fallback={<Blank />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </Suspense>
  </>
);

/**
 * Root for teaser builds (selected in main.tsx). Deliberately not the full
 * app's shell: no API client calls, no QueryClient, and no OfflineIndicator,
 * whose sync loop would replay (and after 3 failures, drop) a returning
 * student's queued offline actions against a backend that isn't live yet.
 * Always light, so a persisted dark-mode setting is ignored here.
 */
function TeaserApp() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <TeaserRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default TeaserApp;
