# Architecture — `edu-student` (UniVybe Student Frontend)

*Discovered by inspection, not assumption. Written 2026-09-28. Update this file when the architecture actually changes — don't let it drift into aspiration.*

---

## 1. Stack

Confirmed from `package.json`:

- **Core:** React 19, TypeScript ~5.9 (strict), Vite 7, `@vitejs/plugin-react`
- **Routing:** `react-router-dom` v7, `BrowserRouter`, all routes declared flat in `src/App.tsx`
- **Server state:** `@tanstack/react-query` v5 (`retry: 1`, `refetchOnWindowFocus: false` globally)
- **Client state:** `zustand` v5 with `persist` middleware (one store: `uiStore`)
- **HTTP:** `axios`, single configured instance in `src/services/api.ts`
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` — **CSS-first config**, no `tailwind.config.js` exists. Design tokens (custom color scale: azure/amber/rose/aquamarine/blue-violet) are defined in `src/index.css` under `@theme`.
- **Animation:** `gsap` · **Icons:** `lucide-react` · **Math rendering:** `katex` (loaded globally in `main.tsx` via `katex/dist/katex.min.css`)
- **Offline/PWA:** `vite-plugin-pwa` (Workbox), `idb` (two independent IndexedDB databases — see §7)
- **Quality tooling:** ESLint 9 flat config (`eslint.config.js`) with `typescript-eslint` recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- **No path aliases** — `tsconfig.app.json` has no `baseUrl`/`paths`; all imports are relative.
- **Test tooling:** Vitest configured 2026-09-29 (`vitest.config.ts`, `src/test/setup.ts` for jest-dom matchers). `@testing-library/react`, `jest-dom`, `user-event`, `jsdom` are devDependencies and wired up; no test suites have been written yet, that's a separate deferred task.
- **Image tooling:** `sharp` + `png-to-ico` (devDependencies, added 2026-09-29) back `scripts/generate-pwa-icons.mjs` for regenerating the PWA icon set from a single source image.

### Commands
| Task | Command | Notes |
|---|---|---|
| Dev server | `npm run dev` | Vite, default port 5173 |
| Type-check | `npm run type-check` | `tsc -b --noEmit` (fixed 2026-09-28 — previously `tsc --noEmit` against a root `tsconfig.json` with an empty `files: []`, which checked nothing; see KNOWN_ISSUES) |
| Lint | `npm run lint` | `eslint .` |
| Build | `npm run build` | `tsc -b && vite build` |
| Preview | `npm run preview` | serves the built bundle |
| Tests | `npm test` / `npm run test:watch` | Vitest, run-once / watch mode |
| Regenerate PWA icons | `npm run icons:generate` | Re-run after changing `public/pwa_manifest.png` |

TypeScript uses project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`); always invoke `tsc` in `-b` (build) mode or point directly at `tsconfig.app.json`, never bare `tsc --noEmit` against the root config.

---

## 2. Folder Structure

```
src/
  App.tsx              route tree, QueryClientProvider, ErrorBoundary, dark-mode effect
  main.tsx             React root, global CSS/KaTeX CSS imports
  assets/               animations (webm), logo, fonts (Super Greatly + Bangers TTFs),
                         mascots/ + floatings/ (full-size source art — never imported
                         directly), landing/ (GENERATED optimized WebP + typed index,
                         see "Landing page" below), brand/ (GENERATED optimized logo
                         WebP + typed index for TopNav/auth pages, see "Image pipeline")
  components/
    common/             ErrorBoundary, ProtectedRoute, OfflineIndicator, StatCard,
                         StreakIndicator, XPCounter, CompletionModal, BottomSheet,
                         EmptyState, Mascot (pose registry), GuestBanner
    auth/                AuthLayout, MascotCompanion (MascotInline / MascotStage) — see §12
    discovery/           DiscoveryToolbar, FilterSelect/FilterToggle, SectionHeader (shared
                         by the Courses and Roadmaps pages) — see §11
    roadmap/             RoadmapTile, RoadmapsPreviewSection, RoadmapGrid, the journey
                         (RoadmapPath/Node/NodePreviewCard/StageNavigation/…), CourseRoadmapLinks
    landing/             public landing page: HeroSection, FeatureBand,
                         FeatureScenes (+ SceneParts/SceneCards), FinalCtaSection,
                         LandingFooter, LandingButton/LandingImg, landingSections.ts
                         (copy + routes), landingAssets.ts (image lookup w/ fallbacks)
    course/              CourseCard, CourseCover/CourseFallbackCover, CourseSection, OutlineSidebar,
                         QuizRenderer, MiniLessonRenderer, JottingPad
    dashboard/           CompletionExample (demo/example component)
    layout/              PageShell (wraps TopNav/BottomNav), TopNav, BottomNav,
                         GuestHeader (the landing page's menu, reused for guests — see below)
  config/
    env.ts               VITE_* resolution incl. mixed-content workaround (see §8)
  constants/
    inspirationMessages.ts
  hooks/
    useAuth.ts            thin wrapper around services/auth.ts mutations
    useFeatureSectionAnimation.ts   GSAP hover/scroll choreography for landing bands
    useMediaQuery.ts      live matchMedia boolean (journey: phone layout, hover-capable pointer)
  pages/                 one file per route (Dashboard, Courses, CourseDetail, CoursePlayer,
                          EnrolledCourses, Feed, Leaderboard, Onboarding, Profile, Landing,
                          Roadmaps, RoadmapJourney, Auth/{Login,Signup,VerifyOtp})
  services/               one file per API area, thin axios wrappers unwrapping the
                          {success,data,error} envelope — see §5
  store/
    uiStore.ts             zustand, persisted (darkMode, lowBandwidthMode, mobile panel, current mini-lesson)
  types/                  one file per API area, hand-written interfaces (no codegen)
  utils/
    apiError.ts             ApiError class + fromAxiosError + getUserFriendlyMessage
    db.ts                   IndexedDB (`EduLiftDB`): offline action queue + API cache — see §7
    debug.ts, format.ts, quizValidation.ts
    brandColors.ts, courseCover.ts   deterministic brand-colour picking / fallback covers
    roadmap.ts, roadmapQueries.ts    roadmap labels, grouping, journey geometry; cache invalidation
```

Naming convention: `services/X.ts` + `types/X.ts` pairs, one per backend "area" (auth, profile, dashboard, courses, lessons, gamification, leaderboard, feed, analytics, search, upload, notes, onboarding, sync, coins, roadmaps, resources). This mirrors the backend's own grouping (see `docs/STUDENT_API_PAYLOADS.md`). `services/quiz.ts` was removed 2026-09-29 (dead code — see §3 and `docs/KNOWN_ISSUES.md` #17); `types/quiz.ts` stays, it's still used directly by `CoursePlayer.tsx`/`QuizRenderer.tsx`.

---

## 3. Routing

> **Teaser branch (2026-10-11):** on the `teaser` branch none of the route table below is served — `/` is the landing page and every other path is a "coming soon" page. See §15. The table describes the full app (`VITE_TEASER_MODE=false`).


Routes are declared in `src/App.tsx`, lazy-loaded via `React.lazy` + one shared `<Suspense>` fallback. Almost all are flat — `PageShell` (top nav + bottom nav) composed manually inside each page, not via a layout route — **except `/feed` and its three tabs**, which use React Router's nested `<Outlet>` layout-route pattern for the first time in this codebase (`src/pages/FeedShell.tsx`; see §14 and `docs/DECISIONS.md` 2026-10-09 for why).

| Path | Page | Auth |
|---|---|---|
| `/auth/login`, `/auth/signup`, `/auth/verify` | `Auth/Login`, `Auth/Signup`, `Auth/VerifyOtp` | public |
| `/onboarding` | `Onboarding` | `ProtectedRoute` (allows pending-token access — see §4) |
| `/dashboard` | `Dashboard` | protected |
| `/courses` | `Courses` | **public** (guest browsing, added 2026-09-29 — see `docs/DECISIONS.md`) |
| `/courses/enrolled` | `EnrolledCourses` | protected |
| `/course/:courseId`, `/courses/:courseId` | `CourseDetailPage` (in `pages/CourseDetail.tsx`) | **public** (guest browsing; `is_enrolled` is `false` for a guest, and the enroll button redirects to `/auth/signup` instead of calling the API — `src/utils/guestGuard.ts`) |
| `/course/:courseId/play`, `/course/:courseId/module/:moduleId/lesson/:lessonId` | `CoursePlayer` | protected (enrollment-gated content, unaffected by guest browsing) — quizzes are taken inline inside this screen flow, not a separate route |
| `/roadmaps` | `Roadmaps` (2026-10-03 — roadmap discovery) | **public** (a guest browses; `?participating=true` — "My roadmaps" — needs a student token) |
| `/roadmaps/:roadmapId` | `RoadmapJourney` (`:roadmapId` = slug, id or uuid) | **public** (a guest sees the roadmap with no personal standing) |
| `/feed`, `/feed/opportunities`, `/feed/gigs` | `FeedShell` (layout route, 2026-10-09) wrapping `Feed` / `Opportunities` / `Gigs` via `<Outlet>` | **public** (three peer tabs, swipeable on touch — see §14) |
| `/feed/opportunities/:id` | `OpportunityDetail` | **public** |
| `/feed/gigs/:id` | `GigDetail` | **public, token adds `viewer`** (express-interest needs a student account) |
| `/feed/gigs/interests` | `GigInterests` | protected |
| `/feed/gigs/posted` | `PostedGigs` | protected |
| `/feed/gigs/new`, `/feed/gigs/posted/:id/edit` | `PostGigPage` (shared component, mode from the presence of `:id`) | protected |
| `/feed/gigs/posted/:id` | `PostedGigDetail` | protected |
| `/feed/gigs/posted/:id/applicants` | `PostedGigApplicants` | protected |
| `/resources` | `Resources` (new, 2026-10-06 — resource library) | **public** (guest browses/reads; opening/downloading redirects to `/auth/signup`) |
| `/resources/:resourceId` | `ResourceDetail` (`:resourceId` = id or uuid) | **public** (same as above; a guest's "Log in" CTA carries `?redirect=` back here — see §12) |
| `/resources/purchases` | `ResourcePurchases` | protected |
| `/leaderboard` | `Leaderboard` | protected (unchanged — only its nav entry point moved, see §12) |
| `/profile` | `Profile` | protected |
| `/wallet` | `Wallet` (new, 2026-09-30 — Vybe Coins) | protected |
| `/` | `Landing` (rebuilt 2026-10-01 from `docs/designs/univybe_landing_page_implementation_design_guide.md`) for a guest; redirects to `/dashboard` if authenticated | — |
| `*` | redirects to `/` (guest) or `/dashboard` (authenticated) | — |

Note: the course-detail route is mounted at **both** `/course/:courseId` (singular — used by every in-app link) and `/courses/:courseId` (plural, added 2026-09-30) — the same `CourseDetailPage` component either way. The plural alias exists solely to match the backend's Monime checkout-return redirect target, `{STUDENT_PORTAL_URL}/courses/{slug}?payment=...` (see §5 and `docs/DECISIONS.md`); `/courses/enrolled` still resolves to `EnrolledCourses`, not the alias, since React Router ranks the static `enrolled` segment above the dynamic `:courseId` one.

**Guest menu (2026-10-01, Resources added 2026-10-06, Feed link made dynamic 2026-10-09):** on desktop (`md+`), an unauthenticated visitor sees the landing page's menu — `components/layout/GuestHeader.tsx` (logo, Courses, Feed, Resources, Log in, Get started) — on every page: `TopNav` renders `<GuestHeader variant="app" />` (plus an `h-[65px]` spacer, because the header is `fixed`) when `!isAuthenticated()`, which covers Courses/CourseDetail/Feed via `PageShell`; `Login`/`Signup`/`VerifyOtp` render it directly (with `md:pt-*` on their root). The landing page uses the same component as `variant="landing"` (responsive hamburger, always light). The `app` variant is `hidden md:block` (mobile guests keep `BottomNav`), follows the in-app dark mode, keeps the dark-mode toggle guests had in the old `TopNav`, and highlights the current page (`NavLink`/`aria-current`); it returns `null` for signed-in users. `/onboarding` is deliberately excluded (a signup step, not a guest page). `Courses`/`CourseDetail`/`Feed`/`Resources`/`ResourceDetail` render a `GuestBanner` (`components/common/GuestBanner.tsx`) when logged out. The Feed link's `to` now reads `useFeedTabStore().lastVisitedFeedTab` (defaults to `/feed`) instead of a hardcoded string, so it reopens whichever of Feed/Opportunities/Gigs the visitor last used — see §14. `/wallet` deliberately has **no nav item** (owner's explicit choice, 2026-09-30) — it's reached via a Dashboard stat card/quick-action and a Profile overview stat tile instead, matching how Badges/Achievements are nested inside `Profile.tsx` rather than given their own nav slot — see `docs/DECISIONS.md`.

**Primary nav (2026-10-06 — Resources replaces Leaderboard):** both `TopNav`'s and the authenticated branch of `BottomNav`'s `navItems` are Home/Feed/Courses/**Resources**/Profile — `Library` icon, `/resources`. This is a deliberate departure from the `/wallet`/`/roadmaps` no-nav-slot precedent above, on the Resources design guide's explicit instruction (see `docs/DECISIONS.md`). `Leaderboard`'s own route/content is untouched; it's now reached only via a new action row in `Profile.tsx`'s Overview tab (icon + label + "See student rankings" + chevron — the first instance of that row pattern in this codebase). `BottomNav`'s `isActive` gained an opt-in `matchPrefix` flag, set only on the Resources item, so `/resources/:id` and `/resources/purchases` still highlight it; the other four items keep exact-match (unchanged). `TopNav` still has no active-highlighting for any item — pre-existing gap, not touched here. The guest `navItems` in both `GuestHeader.tsx` (desktop app-guest nav, the landing page's own nav, and its mobile hamburger menu — all three share one `navLinks` array) and `BottomNav.tsx` (mobile guest nav, inserted before "Log In" with the same `matchPrefix` treatment) gained a Resources entry on 2026-10-06, after initially shipping guest-reach-by-link-only — explicit owner request. The landing page's "Browse resources" feature-section CTA (`landingSections.ts::RESOURCES_ROUTE`) was also repointed from `/auth/signup` to `/resources` at the same time — it had been aliased to sign-up as a placeholder (like `PRACTICAL_SESSIONS_ROUTE`/`OPPORTUNITIES_ROUTE`, which still are, those pages not existing yet) from before this round shipped a real route.

**Feed nav entry (2026-10-09 — Opportunities & Gigs, no new nav items):** the existing Feed item in every nav surface (`TopNav`, `BottomNav`, `GuestHeader`'s shared `navLinks`) gained `matchPrefix: true` (BottomNav) / equivalent `/feed`-prefix highlighting, and its link target became `useFeedTabStore().lastVisitedFeedTab` instead of the literal string `"/feed"` — see §14. Opportunities and Gigs are **not** separate nav items anywhere; they're reachable only through the in-shell tab row, per the design guide's explicit instruction, consistent with the `/wallet`/`/roadmaps` no-nav-slot precedent above (this round just extends the existing Feed slot rather than adding new ones). `landingSections.ts::OPPORTUNITIES_ROUTE` was repointed from `/auth/signup` to `/feed/opportunities` at the same time, same mechanism as the Resources fix above.

---

## 4. Auth

- **Token storage:** `localStorage`, two keys — `auth_token` (fully logged in) and `pending_auth_token` (set after OTP verification when `requires_onboarding` is true, moved to `auth_token` once `completeOnboarding` succeeds). User object mirrored at `user` / `pending_user`.
- **Request interceptor** (`services/api.ts`): attaches `Authorization: Bearer <pending_auth_token || auth_token>` to every request.
- **Response interceptor:** on `401`, clears all four localStorage keys and hard-redirects to `/auth/login` (`window.location.href`, not a router navigation) — skipped if already on the login page (redirect-loop guard) **or if `auth_token` was never set** (added 2026-09-29 — a guest browsing a public page was never logged in, so there's no session to expire and nothing to redirect away from; see `docs/DECISIONS.md`).
- **Session exclusivity (2026-10-26):** a session is *either* full (`auth_token` + `user`) *or* pending (`pending_auth_token` + `pending_user`), never both — `services/auth.ts` `storeFullSession`/`storePendingSession` clear the other half, so a previous account's token can't linger when a new email is verified. `verifyOtp` also doesn't trust `requires_onboarding` alone: the session goes pending if the flag is true **or** the returned user has no names/level.
- **401 on a pending token (2026-10-26):** the interceptor now also reacts when only `pending_auth_token` exists: it clears tokens, **keeps the onboarding draft**, and redirects to `/auth/signup?reason=session-expired` (not `/auth/login` — an account that only verified its email has a random unusable password, so password login can't recover it; email-code re-verification can). The redirect goes through `utils/navigation.ts::redirectTo` so it is testable.
- **Route guard** (`components/common/ProtectedRoute.tsx`): `canAccess = isAuthenticated() || (path === "/onboarding" && hasPendingToken)`; a signed-out-but-pending visitor is sent to `/onboarding` rather than `/auth/login`. `requireOnboarding` is passed on every protected route except `/onboarding` itself (activated 2026-09-29). Since 2026-10-26 the check lives in `utils/onboardingSession.ts` and reads the *active* session's user (pending user when a pending token exists, else `user`):
  ```ts
  isOnboardingComplete(user) = !!(user?.firstname && user?.lastname && user?.level)
  ```
  `components/common/HomeGate.tsx` (used for `/` and `*`) sends a pending student back to `/onboarding` instead of the guest landing page.
  `level` is only ever set once Complete Onboarding has run (`null` on a fresh OTP-verified account per `docs/STUDENT_API_PAYLOADS.md`), so its presence reliably signals completion for both university-affiliated and organization-affiliated (UnderGrad/graduate) students — unlike the old check, which used a nonexistent `is_onboarded` field and only accounted for the university-affiliation case.
- **Flows:** Login (email+password or phone+password) · OTP send/verify (doubles as registration on first verification) · Complete Onboarding (`services/auth.ts::completeOnboarding`, posts to `/student/auth/complete-onboarding`) · Logout (best-effort server call, always clears local state).
- `hooks/useAuth.ts` wraps the login/OTP mutations with navigation side-effects; most pages call `services/auth.ts` functions directly rather than through this hook.

---

## 5. API Layer

- **Base URL:** resolved in `src/config/env.ts` from `VITE_API_URL` (prod) or `VITE_BASE_DEV_URL` (dev), with a same-origin `/api/v1` fallback in production if the baked-in URL is `http:` on an `https:` page (mixed-content guard — see §8 for the Vercel rewrite that makes this work).
- **Envelope:** every backend response is `{success, message, timestamp, request_id, data?}` on success or `{success:false, error:{code,message,details?}, timestamp, request_id}` on failure (per `docs/STUDENT_API_PAYLOADS.md`). Every service function checks `response.data.success && response.data.data` before unwrapping, and throws a plain `Error` (not always `ApiError`) on failure — inconsistent, but low-impact since most call sites just read `.message`.
- **`utils/apiError.ts`**: `ApiError` class + `ApiError.fromAxiosError()` correctly parses the nested `error.code`/`error.message`/`error.details` shape, plus a `getUserFriendlyMessage()` map for a handful of known codes (`LOGIN_FAILED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `VALIDATION_ERROR`, etc.). Only `services/auth.ts::login` currently constructs `ApiError` explicitly; other services just `throw new Error(...)`, so `ApiError`'s richer handling isn't uniformly available to callers.
- **Endpoint prefix convention:** everything under `/student/...` — `services/notes.ts` used to be the one exception (`/notes`, no prefix); as of 2026-09-29 notes are entirely local (see §7) and make no API calls at all, so this is moot.
- **Pagination:** list endpoints return a raw Laravel paginator (`{current_page, data: [...], per_page, total, ...}`) as `data`. `PaginatedResponse<T>` (`types/index.ts`) was fixed 2026-09-29 to match this shape exactly (previously modeled a nonexistent `{success, data, meta, links}` wrapper) — this also fixed two real bugs: `Courses.tsx`'s pagination controls and `Feed.tsx`'s infinite-scroll "load more" both silently never worked because they read a `.meta` that never existed on the real response.
- **Paid courses (Monime checkout, added 2026-09-30):** `Course`/`CourseDetail` now carry `is_paid`/`price`/`currency`; `CourseDetail` also carries `enrollment_state` (`available|payment_pending|payment_processing|enrolled`), which drives `CourseDetail.tsx`'s enroll button label/action. `services/courses.ts::enrollInCourse` returns a discriminated union — `{requires_payment: true, checkout_url, ...}` for a paid course (redirect via `window.location.href`, not router `navigate`, since it leaves the SPA) vs. the original `{progress, xp_awarded}` for a free course or an already-confirmed payment. `getEnrollmentStatus` (`GET .../enrollment-status`) is polled every 3s while showing "Confirming Payment…" after the Monime return trip — see `docs/DECISIONS.md` for why this and the `/courses/:courseId` route alias exist. `unenrollFromCourse` remains unused dead code (no UI entry point) — not addressed by this change.
- **Vybe Coins (added 2026-09-30):** a second reward currency, separate from XP — `services/coins.ts` + `types/coins.ts` (own per-area pair, per this file's §2 convention). `getWallet` (`GET /student/coins`) returns balances + live exchange rate; `Course`/`CourseDetail` gained `coin_reward`; `services/courses.ts::updateCourseProgress`'s response type gained an optional `coins_awarded` (only present when that request completes a paid course with a reward — see `docs/DECISIONS.md` for why this is only threaded into `CoursePlayer.tsx`'s lesson-completion path). `submitExchange` requires an `Idempotency-Key` header, generated once per exchange-modal-open (`crypto.randomUUID()`) and reused across retries. **Pagination quirk:** `getCoinTransactions`/`getExchanges` (Coin History / exchange list) put `meta` as a **sibling of `data` at the top level of the response envelope** — a genuinely different shape from `PaginatedResponse<T>` above (which models the raw Laravel paginator, pagination fields flat on `data` itself). Typed as `ApiResponse<T[]> & {meta?: PageMeta}` and reconstructed into `{data, meta}` in the service layer — see `docs/DECISIONS.md` for the bug this caused on the first pass.

---

## 6. State Management

- **Server state → React Query.** Query keys are ad hoc arrays (e.g. `["dashboard"]`, `["leaderboard", type, limit, ...scopeIds]`, `["student-profile", id]`) — no central key-factory; keep new keys consistent with the nearest existing usage.
- **Client state → Zustand (`store/uiStore.ts`), persisted to `localStorage` under `edulift-ui-storage`:** `darkMode`, `lowBandwidthMode`, `isMobilePanelOpen`, `currentMiniLessonId`. `darkMode` is applied to `<html class="dark">` via a `useEffect` in `App.tsx`.
- **Auth "state"** lives outside both of the above — plain `localStorage` reads via `services/auth.ts::getCurrentUser()`/`isAuthenticated()`, read fresh on each call (no cached/reactive auth context). Components call `getCurrentUser()` directly rather than subscribing to any store.
- **Component-local state** (`useState`) is used for forms, modals, and page-level UI (tabs, filters).

---

## 7. Offline / PWA

**Two independent IndexedDB databases exist, for two different purposes:**

1. **`EduLiftDB`** (`utils/db.ts`, via `idb`) — two stores:
   - `offlineActions`: queue of `{type, method, url, payload, timestamp, retryCount}`. As of 2026-09-29, `services/courses.ts::updateCourseProgress` (the endpoint both quiz submission and lesson completion go through) is the queue's producer: when offline or the request can't reach the server, it calls `utils/db.ts::queueOfflineAction` and throws `OfflineQueuedError` instead of returning normally. `services/sync.ts::syncOfflineActions()` drains the queue on reconnect (wired up via `initSync()` in `OfflineIndicator.tsx`, which also invalidates the whole React Query cache once anything syncs, and now correctly increments/persists `retryCount` on failure, dropping an action after 3 failed attempts instead of retrying it forever). `CoursePlayer.tsx` catches `OfflineQueuedError` specifically and shows a "Saved Offline — will sync automatically" state instead of blocking the student's progress. **Course enrollment and feed actions (like/comment/share) are not wired into this queue** — explicitly out of scope, they still fail hard offline. Live-verified end to end (see `docs/PROJECT_STATE.md`).
   - `apiCache`: `getCachedResponse`/`setCachedResponse`/`clearCache` helpers exist but are still **never called** — offline *reads* were out of scope for the 2026-09-29 pass.

2. **`edulift-notes-db`** (`services/notes.ts`, separate `openDB` call) — a `notes` object store, used by `components/course/JottingPad.tsx`. Notes are a **frontend-only feature by design** (confirmed with the owner: the backend has no notes endpoint at all) — `services/notes.ts` was rewritten 2026-09-29 to make zero API calls; `getNote`/`saveNote`/`updateNote` read/write this IndexedDB store directly, and the old broken `queueNoteForSync` (which opened a `syncQueue` store that was never created) was deleted along with every backend call. `downloadNoteAsText`/`downloadNoteAsPDF` are unchanged.

**Service worker** (`vite-plugin-pwa`, configured in `vite.config.ts`):
- `registerType: "autoUpdate"`, precaches `**/*.{js,css,html,ico,png,svg}`.
- Runtime caching: `NetworkFirst` for `https://api.*` (1h TTL) — **this pattern still doesn't match the actual API host** (`127.0.0.1:8000` in dev, an IP-based Vercel rewrite in prod — see §8); explicitly deferred by the owner, not fixed.
- `navigateFallback: "index.html"` for SPA routing.
- References `/icon-192.png`, `/icon-512.png` (manifest) and `favicon.ico` (`includeAssets`) — **these now exist**, generated 2026-09-29 from `public/pwa_manifest.png` via `npm run icons:generate` (see §1's Commands table). Verified via `npm run build`.
- `public/offline.html` still appears orphaned — explicitly deferred by the owner, not fixed.

**Bottom line:** offline *write* support for the two actions that matter most (lesson/quiz completion) is now real and verified. Offline *reads* (the `apiCache` store) and offline writes for enrollment/feed actions remain unbuilt — don't assume those are covered.

---

## 8. Config / Deploy

- **Env vars** (all `VITE_*`, exposed in the client bundle — never put secrets in them): `VITE_API_URL`, `VITE_BASE_DEV_URL`, `VITE_ENV`, `VITE_ENABLE_DEBUG_LOGS`. Documented in `.env.example` (added 2026-09-29).
- **Mixed-content workaround** (`config/env.ts`): if built for production, served over HTTPS, and the baked-in API URL is `http:`, the app forces same-origin `/api/v1` instead and relies on a Vercel rewrite.
- **`vercel.json`:** rewrites `/api/v1/:path*` → `http://35.233.83.200/api/v1/:path*` (the backend is plain HTTP, hence the mixed-content handling above), plus a SPA catch-all rewrite (`/(.*) → /index.html`).
- `docs/` was removed from `.gitignore` on 2026-09-28 — the API reference docs and these four working-state docs are now trackable.

---

## 9. Rendering conventions

- **Math:** `katex` renders formulas in exactly one place — `MiniLessonRenderer`'s `text_type: "formula"` blocks (`katex.renderToString(content, { displayMode: true, throwOnError: false })`, one bare expression per block, no `$`/`\[ \]` delimiter handling). `QuizRenderer`, plain/remember/simply_put/important blocks and feed posts do **not** render math. `katex.min.css` is imported once globally in `main.tsx`. Theming: KaTeX draws in `currentColor`, so the block wrapper must set its own text colour (`text-gray-900 dark:text-gray-100`) or it inherits the light-theme `:root` colour; error text uses `errorColor: "var(--formula-error)"`, defined per theme in `index.css`. How to write compatible LaTeX: `docs/LATEX_FORMULA_GUIDE.md` (checker: `node scripts/check-latex.mjs`).
- **Rich content:** lesson/feed content includes `content_html` fields rendered via `dangerouslySetInnerHTML` in places — per CLAUDE.md §9, treat this as a sanitization concern; verify the backend sanitizes before trusting it blindly on the frontend.
- **Animation:** GSAP is used for completion/celebration UI (`CompletionModal`, `components/dashboard/CompletionExample.tsx`) and, since 2026-10-01, the landing page. No global `prefers-reduced-motion` handling exists for the in-app screens; the landing page handles it itself (below).
- **Fonts:** `index.css` declares `@font-face` for Super Greatly and Bangers (TTFs in `src/assets/fonts/`, `font-display: swap`) and exposes Tailwind tokens `font-title` (Super Greatly, used for the six landing section titles) and `font-accent` (Bangers: hero/final-CTA headlines, eyebrows). Faces download only when text using them renders, so authenticated pages pay nothing.

### Landing page (`/`, guests only)

- **Standalone brand surface.** Doesn't use `PageShell` (no app top/bottom nav) and is always light, independent of the in-app dark-mode toggle. Root has class `landing-root`, which `index.css` uses to exempt its links from the global unlayered `a { color; font-weight }` rule (that rule would otherwise beat Tailwind's layered `text-*`/`font-*` utilities on every landing link).
- **Structure:** hero → six `FeatureBand`s (config in `landingSections.ts`, scenes in `FeatureScenes.tsx`) → `FinalCtaSection` → footer. Bands alternate sides on `lg+`; mobile always stacks copy first, scene below.
- **Animation contract** (`hooks/useFeatureSectionAnimation.ts`): scene markup carries `data-scene|mascot|item|float|sway|spin|accent|draw|glint`. The CSS (un-animated) state of every element is its final readable state; GSAP applies the idle/hidden state only inside `gsap.matchMedia` when `prefers-reduced-motion: no-preference`. Desktop (`≥1024px`, hover + fine pointer): one timeline per band, played on hover/focus-within and reversed on leave; the mascot rests ~30% visible. Touch / small screens: the same timeline plays via ScrollTrigger (`top 82%`, `play none play reverse`). Idle float/sway only runs while the band is on screen and settled. `utils/gsapSetup.ts` registers ScrollTrigger once.
- **Images:** never import from `assets/mascots|floatings|logo` in landing code. `npm run assets:landing` (`scripts/optimize-assets.mjs landing`, uses `sharp`) trims, resizes and converts the sources to WebP in `src/assets/landing/` and regenerates `src/assets/landing/index.ts` (typed `landingImages` with intrinsic width/height). ~510 KB for all 16 images vs >7 MB of source PNGs; images below the fold are `loading="lazy"`. See "Image pipeline" below for the shared script.
- **Bespoke (Higgsfield-generated) art, with fallbacks:** `mascot-practical`, `mascot-coins`, `mascot-opportunities` and `coin` come from `src/assets/mascots/{practical,coins,opportunities,coin}.png` (generated from the existing Vybe mascot references, `gpt_image_2_5`, transparent background) and are present. They are still declared `optional` in the pipeline: `landingAssets.ts::pickImage` would fall back to an existing pose (`mascot-cool`, `mascot-shrug`, `mascot-cool-bust`; CSS coin) if one were removed. Because those mascots have props baked in (desk + flask, coins + check, trophy + briefcase + star), the scenes keep supporting cards minimal: `CoinsScene` layers only 2 extra coins, the practical scene has no flask chip, and the project board / Scholarship card are hidden below `sm`.
- **Auth/onboarding poses:** `mascot-mail` and `mascot-secure` (2026-10-03, from `src/assets/mascots/{mail,secure}.png`) live in the same `landing` set and index; they're consumed through `components/common/Mascot.tsx` (§12), not the landing page.
- **Offline:** landing WebP/fonts are not precached (keeps first install small); `vite.config.ts` has a `CacheFirst` runtime rule (`landing-assets`, 60 entries / 30 days) so they work offline after first view.

### Image pipeline (`scripts/optimize-assets.mjs`)

One `sharp` script, four **sets**, each with its own output folder and generated `index.ts` (sources in `src/assets/{logo,mascots,floatings}/` are never modified; outputs are committed and regenerated by hand — it is not part of `build`):

| Command | Set | Output | Index |
|---|---|---|---|
| `npm run assets:landing` | `landing` | `src/assets/landing/*.webp` | `landingImages` record (string-keyed; some entries optional) |
| `npm run assets:brand` | `brand` | `src/assets/brand/*.webp` | one named export per image (`brandIconBlack160`, …) so a typo is a compile error |
| `npm run assets:journey` | `journey` | `src/assets/journey/*.webp` | `journeyImages` record (`pose-*`) |
| `npm run assets:player` | `player` | `src/assets/player/*.webp` | `playerImages` record (`player-*`) |
| `npm run assets` | all | all four | all four |

- **`brand` set** feeds app chrome: `TopNav` (icon 60 CSS px → `brandIcon{Black,White}160`; wordmark 32/48 CSS px tall → `brandWord{Black,White}`) and the small app icon on `AuthLayout` (48 CSS px, phones only → `brandIcon{Black,White}160`). Dark mode picks the white variant. ~32 KB for four files vs ~3.3 MB of source PNGs that used to ship in the bundle. (The 320 px icon variants were dropped 2026-10-03 once the auth pages stopped using them.)
- **Brand jobs set `trim: false`.** The icon is a 509×644 glyph on a 1024×1024 transparent canvas and the wordmark has margins too; both are laid out in fixed boxes (`w-40 h-40`, `h-8 w-auto`), so trimming (what `landing` does) would stretch the icon and resize the wordmark. Keep the canvas; WebP compresses the transparent margin to nothing.
- **Why two folders:** the script wipes stale `*.webp` in an output folder before writing, so sharing `landing/` would have put app-chrome logos in the landing index and made the landing set own them. Each set is regenerated independently.
- **Offline:** brand files are named `brand-*` because Vite keeps the source basename in the hashed output, and `vite.config.ts` precaches `assets/brand-*.webp` (the PNGs they replaced were precached, so the TopNav/auth logo must still render offline on a first visit). Landing WebP is still runtime-cached only.
- Adding a variant: add a job to the set's `jobs` array, run the set's command, import from `src/assets/brand` (never from `assets/logo`).

### Roadmap journey ambient assets (generated 2026-10-04, wired into the journey 2026-10-05)

Generic Vybe art for the negative space around the journey's course nodes (see §11). Used only by `RoadmapNodeDecor` (placement rules in §11 "Journey layout"). The loops are indexed by hand in `src/assets/animations/journey/index.ts` (the image poses by the generated `journeyImages`). `.webp` isn't precached; the existing `landing-assets` runtime rule caches them on first view.

| Asset | Where | Size | Notes |
|---|---|---|---|
| 5 poses: `pose-thumbs-up`, `pose-notes`, `pose-pointing`, `pose-cheer`, `pose-aha` | `src/assets/journey/*.webp` + typed `journeyImages` (`npm run assets:journey`); sources in `src/assets/mascots/journey/*.png` | 360 px tall WebP, 15–17 KB each (81 KB total); sources 640 px tall, ~270 KB each | Generic (no course props), transparent, on-model. Meant to be picked pseudo-randomly (e.g. from a hash of `slug + position`, like the stage colours) so a given stage always shows the same cast. |
| 3 short loops: `vybe-wave`, `vybe-cool`, `vybe-cheer` | `src/assets/animations/journey/vybe-*.webp` | animated WebP **with alpha**, 240×352, 12 fps, 62 frames (5.2 s), loops forever; 344–418 KB each | Seamless (first frame = last frame; measured difference ≈ 1/255). Each has a `vybe-*-poster.webp` (first frame, ~7 KB) to use as the static fallback for `prefers-reduced-motion` / before load — an animated `<img>` cannot be paused. |

How they were made (so they can be redone or extended): stills — Higgsfield `gpt_image_2_5` with the existing mascot as reference on a **flat white** backdrop, then `remove_background`, stray fragments dropped and trimmed with `sharp`. Loops — `minimax_h3_max` (480p, 5 s) image-to-video with the **same image as start and end frame** (that is what makes them loop), from white-backdrop frames of the existing `Hi` and `vybe_cool` art and of the cheer pose. The remover returns the cut-out video on a *black* backdrop (MP4 has no alpha, and black would swallow the hoodie), so true alpha was recovered per frame from the white-backdrop original *W* and the cut-out *B* (`alpha = 1 − mean(W − B)/255`, colour = `B/alpha`; pixels that are pure black in *B* but bright in *W* were deleted sparkle lines/shadows and are dropped), sampled in headless Chrome and encoded with `sharp`. No `ffmpeg`/WebM-alpha tooling exists on this machine, hence animated WebP. Higgsfield job ids (gallery masters): stills `f43c57cb-aa6d-43e8-b199-91a960f7a01d` thumbs-up, `6c8c6637-65f4-46ce-8cbf-192e89b592d6` notes, `59bd5fc7-43de-4ee0-a00a-1db8ce410158` pointing, `d210763a-9dc8-47c2-9b7e-fd7c614dd81b` cheer, `116a1a94-6551-4eaf-b27f-add7b8f5aec9` aha; loops `122be740-31c2-4347-9b42-401b95d08937` wave, `fefd7fda-af72-47d7-bb4e-103f9df95072` cool, `17749451-4102-4fcd-aadc-157748f78ff2` cheer (the first cheer render, `e02ab704-67e9-4150-b00c-c87fd02f2d6d`, was replaced: its start frame was too tight and the hop clipped the top of the bulb).

### Course-player Vybe poses (generated 2026-10-04, not wired in yet)

Eleven full-body poses for the course player (lesson page, `QuizRenderer`, the lesson- and course-completion modals in `CoursePlayer.tsx`). **Nothing imports them yet** — the player pages are being redesigned around them separately — so they add nothing to the bundle until they are. Each pose is tied to a moment, and none duplicates an existing pose (`hi/cool/hat/smart/learning/shrug/mail/secure/coins` in `components/common/Mascot.tsx`, or the `journey` set).

| Key (`playerImages["player-…"]`) | Prop / gesture | Intended moment |
|---|---|---|
| `thinking` | chin on finger, azure "?" | question open, answer being checked, content loading |
| `hint` | whispering behind a hand, wink, sparkles | hint reveal |
| `quiz` | clipboard + pencil, determined grin | quiz intro / "start quiz" |
| `correct` | green check badge held up | correct answer |
| `oops` | scratching head, sweat drop, thumbs-up (encouraging, not sad) | wrong answer / "try again" |
| `star` | hopping with a gold star raised | lesson complete |
| `streak` | flame floating over an open palm | streak stat (`streak_count`) |
| `trophy` | trophy raised, confetti | top quiz score / course mastered |
| `graduate` | mortarboard + diploma | course complete (`courseCompleted`) |
| `medal` | gold medal on blue ribbon | roadmap badge earned (`roadmapsCompleted`) |
| `saved` | phone showing a cloud with a check, thumbs-up | the "Saved Offline" modal (`lessonCompletionStatus === "queued"`) |

Files: sources `src/assets/mascots/player/*.png` (538×800, 65–89 KB, 0.8 MB total); optimized `src/assets/player/player-*.webp` (≈720 px tall, 32–68 KB each, 453 KB total) + typed `playerImages` via `npm run assets:player`. Jobs trim to content, so widths differ by pose (`trophy` is the widest — its confetti counts as content): **size by height and use the index's intrinsic `width`/`height`**, not a fixed aspect ratio, or Vybe will look smaller in some poses. Props use semantic colours (green check, flame orange) rather than only the brand palette on purpose. Decorative by default (`alt=""`); give `correct`/`oops` an `alt` only if the surrounding text doesn't already say the result.

How they were made: Higgsfield `gpt_image_2_5` (`quality: high`, 2:3, `background: opaque`) with `src/assets/mascots/Hi.png` as the sole reference, "isolated on a plain pure white background, no ground shadow" — one prompt per pose. **Cut out locally, not with `remove_background`** (see `docs/DECISIONS.md` 2026-10-04): flood-fill the outer white, un-mix a 2 px edge band and any pale/translucent props against white (colour-to-alpha), keep enclosed whites (eyes, soles), and use the remover's alpha only as a guide for white-on-white parts and to confirm a soft glow is backdrop. Overhead-arm first drafts of `star` and `trophy` hid the bulb behind the arms/prop (the head read as a small ball), so both were re-rolled with the arm out to the side. Higgsfield job ids (gallery masters, white-backdrop versions): `b9b41877-0c53-4940-810c-ebf02b47dfb8` thinking, `6c761171-733e-4830-a9a7-0c8847ca4efb` hint, `2dcac27b-9fe9-44f5-9bb8-99cfe254ac9e` quiz, `ba11338b-6453-4bcf-9e25-1393f0739ea5` correct, `0d455f9b-d73a-49b7-9a48-9a63d1aa2839` oops, `50e458fa-9f10-4fe5-8983-ab35bb31cf6a` star, `8edfde30-a180-4f70-90f3-9a2d507c6806` streak, `c8b19169-fd52-484d-8cbd-bff738a256da` trophy, `fecf4368-6aaa-48f2-afb8-32f586e20e76` graduate, `bab885f0-7900-4d62-8bf4-65089f803d09` medal, `1595d6ba-7e5e-4826-9164-cd4f95e85e4e` saved. Unused alternates: star `ef57b14e-43a2-4632-baeb-5e547d6766e0` (star held at the chest), trophy `d2a34eaf-d11f-47e5-ae87-1a56f3598e22` (hugging the trophy, eyes closed).

## 10. UI conventions

- `PageShell` (top nav + bottom nav, mobile-first bottom tab bar) wraps almost every authenticated page.
- Design tokens: custom Tailwind v4 `@theme` color scale (`azure`, `amber`, `rose`, `aquamarine`, `blue-violet`, each with a 100–900 ramp) defined in `src/index.css` — use these instead of introducing new ad hoc colors.
- Dark mode via a `dark:` Tailwind variant driven by the `dark` class on `<html>`, toggled through `uiStore`.

---

## 11. Roadmaps and course discovery (2026-10-03)

Built from `docs/designs/univybe_course_discovery_roadmaps_design_guide.md` against the Round 6 backend contract (`docs/STUDENT_API_PAYLOADS.md` §70–72). **A roadmap is an ordered recommendation, not a gate**: there is no "join" action, nothing is locked by order, and a student becomes a participant by taking *any* course in it (the backend flips `is_participant`).

**Data layer**
- `types/roadmap.ts`, `services/roadmaps.ts` (`getRoadmaps`, `getRoadmap`, `getRoadmapCourses`). These endpoints use the sibling `{ data, meta }` envelope (shared `PageMeta` in `types/index.ts`, same as coins), **not** the raw Laravel paginator that `/student/courses` uses. The Bearer token (added by the axios interceptor) personalises the response; a guest gets `progress: null`. `participating=true` is a 401 for guests, so "My roadmaps" is only offered when signed in.
- Additive fields now typed: `CourseDetail.roadmaps`, `updateCourseProgress().roadmaps_completed`, `PersonalAchievement.type/roadmap`, and `roadmap` on earned badge entries. Earned roadmap badges send `progress` as an **object** (`{current,target,percentage,is_completed}`) where ordinary badges send a number; the badge types are a union.
- Query keys: `["roadmaps","list"|"preview"|"mine", signedIn, …]`, `["roadmap", id, signedIn, STAGE_SIZE]`, `["roadmap-courses", id, signedIn, STAGE_SIZE, page]`. `signedIn` is in the key because the responses are personalised. `utils/roadmapQueries.ts::invalidateRoadmapQueries` is called wherever enrollment/completion can change (`CourseDetail` enroll/payment, both progress calls in `CoursePlayer`). Progress is re-fetched, never cached across sessions (admins can edit roadmaps at any time).

**Pages** — `Courses` (updated), `Roadmaps` (new), `RoadmapJourney` (new). Shared pieces: `DiscoveryToolbar` (large search, primary filters inline, deeper ones behind "More filters"; on phones just search + a **Filters** button that opens everything in a `BottomSheet`), `FilterSelect`, `SectionHeader`, `EmptyState`.
- **Courses:** header → toolbar → `RoadmapsPreviewSection` (5 portrait tiles fetched; 3/4/5 shown at md/lg/xl, swipe carousel on phones; renders nothing when there are no roadmaps or the call fails) → recommended rows → Explore All. State/queries are the pre-existing ones. Applying a filter now switches to the flat results view (before, it changed state while the curated rows stayed on screen); sort-by + sort-order became one "Sort" control.
- **Roadmaps:** signed-in default view = Recommended for you (top of the relevance-ordered list where `relevance_score > 0` and not started — the score is used, never shown) / Continue (`is_participant && !is_completed`) / Completed / Explore all (paged). Guests: Featured (first 4, newest) / Explore all. Any active filter, search or "My roadmaps" collapses to one flat Results grid.
- **Journey:** dark immersive page (`#0b1026`, glows tinted by the stage colour). Loads `GET /roadmaps/{id}?page=current&per_page=8` (lands a returning student on the stage holding their current course); other stages use the lighter `/courses` endpoint. **Stage = one page of 8 courses** (the client picks the size; short roadmaps fit on one stage). `RoadmapPath` lays nodes on a winding SVG trail (`utils/roadmap.ts::buildJourneyGeometry`; wide swing on desktop, tight and centred on phones; one 400-unit canvas scaled to the container, nodes placed in %). Node state is shown by shape/text as well as colour: check = completed, progress ring = in progress, "Continue here" tag = current (first incomplete course in the whole roadmap), plus a full `aria-label`. **Each node is a plain `<Link>` to the course** — hover/focus (hover-capable pointer: `(hover: hover) and (pointer: fine)`) opens a floating `RoadmapNodePreviewCard`; on touch, tapping opens the same card in a bottom sheet instead of navigating. The title bar (see below) has no call-to-action button; participants get a "Go to current course" button in its details that only scrolls/jumps to the current course; it never enrols. Each stage's accent colour is `getRoadmapPageThemeColor(slug, page)`: a pure hash of slug+page from the five brand colours that never repeats the previous page's colour. The last stage ends with a slim, collapsed completion-badge row (open by default once earned; `badge.earned` is permanent). GSAP: nodes fade out before a stage change and rise in after (`gsap.matchMedia`, reduced-motion = instant); the CSS state is always the final readable one.

- **Journey layout (2026-10-05).** The nodes are the focus, so everything around them is quiet:
  - **Title bar** (`RoadmapJourneyHeader`): one compact row — a chevron on the left, the title, the level (phones) or level + place (≥ `sm`) as small tags, and an icon link back to `/roadmaps`. A thin accent progress line under the row for participants. The chevron opens a panel with the full title (phones), description, all details (courses, department/faculty/university/organization, level, semester), progress (or the "start anywhere, nothing is locked" note, with a sign-up nudge for guests) and, for participants, "Go to current course". There is **no Explore/Continue button**.
  - **Completion badge** (`RoadmapCompletionBadgeSection`): one slim row (icon with a lock until earned, "Roadmap badge", one line of status, chevron). Collapsed while the roadmap is unfinished; open once completed. No mascot, ring or glow.
  - **Ambient** (`RoadmapAmbient`): glows and a faint star field only. The old floating icons/mascot were removed.
  - **Vybe around the nodes** (`RoadmapNodeDecor` + `utils/journeyDecor.ts`): the 5 poses and 3 loops from "Roadmap journey ambient assets" are placed **only inside the node canvas**, in the gutters beside the path (anchored just outside the node band: `50% ± swing% ± clearance`), never overlapping a node. A stage holds at most **2 (phone) / 4 (desktop)** of them in total — 2 for phone stages of ≥ 5 nodes (1 for shorter), `round(nodes/2)` capped at 4 on desktop — so a screen, which only ever shows part of one stage, can never show more than 2 / 5. They are evenly spaced down the path (equal bands, centred), **alternate left/right**, and are a seeded shuffle of the eight assets per `slug:stage` (the same stage always shows the same cast; no repeats within a stage; never two loops back to back). They're `aria-hidden`, non-interactive, lazy-loaded; loops swap to their still poster under `prefers-reduced-motion`; poses get the idle float. Measured in Chrome at 320–1440 px: ≥ 39 px (phone) / ≥ 66 px (desktop) clear of every node, no horizontal spill, and 2 / 4 on screen at most at any scroll position.
- **Elsewhere:** Course Details shows "Part of a roadmap — course 3 of 10" (`CourseRoadmapLinks`); the lesson-complete modal shows "Roadmap complete!" only when `roadmaps_completed` is present; Profile links earned roadmap badges/achievements to their journey.

**Fallback covers.** A course or roadmap without a thumbnail (or whose image fails to load) renders `CourseFallbackCover` — inline SVG shapes + a monogram, from `utils/courseCover.ts`: a pure function of the course slug/uuid, so it is stable across renders and visits, using only the five brand colours. No raster art is generated or fetched. The monogram uses the Super Greatly face (`font-title`) and scales with the cover (`cqw` units).

**`.own-links`.** The global unlayered `a { color }` rule beats Tailwind's layered utilities. Surfaces that style their own links opt out with an ancestor carrying `.landing-root` (landing, GuestHeader) or `.own-links` (roadmap tiles/journey, section "See all" links, cards that can be portalled out of the page). An `<a>` can't opt itself out — the class goes on a wrapper.

---

## 12. Mascots on the auth and onboarding screens (2026-10-03)

`components/common/Mascot.tsx` maps a **pose by meaning** (`hi, cool, hat, learning, smart, shrug, mail, secure, coins`) to an ordered list of optimized images (`pickImage`), so a pose whose art is missing falls back to an existing one instead of rendering nothing. `AuthLayout` (sign in, sign up, verify) and `Onboarding` pair a pose with a one-line speech bubble: on `lg+` Vybe stands on a `MascotStage` panel beside the form; below that a compact `MascotInline` (mascot + bubble) sits above the heading. Pose map: sign in → `cool`; sign up → `learning`; "check your email" / verify code → `mail`; onboarding steps 1–4 → `hi` / `hat` / `smart` / `secure`. `mail` and `secure` are new, generated with Higgsfield (`gpt_image_2_5` with the existing mascot as reference, then `remove_background` — the model's "transparent" output is a baked-in checkerboard; see `docs/DECISIONS.md`). The mascot's idle float is a CSS animation (`.vybe-float`) that is off for `prefers-reduced-motion`. The old 160 px app icon on the auth pages became a 48 px icon shown only below `md` (where there is no header).

---

## 13. Resources (2026-10-06)

Built from `docs/designs/univybe_resources_implementation_design_guide.md` against the Round 7 backend contract (`docs/STUDENT_API_PAYLOADS.md` §73–79). A **resource** is an uploaded file or external link browsed independently of courses, with a daily free-access allowance (admin-configurable, 3/day by default) and purchasable access packs (Monime, same mechanism as paid courses/coins). Browsing (list/details/course-resources) is free and public; opening/downloading is the one metered action.

**Data layer**
- `types/resource.ts`, `services/resources.ts` (`getResources`, `getResource`, `getCourseResources`, `getResourceUsage`, `accessResource`, `purchaseResourcePack`, `getResourcePurchase`, `getResourcePurchases`, `getResourceVocabulary`). List/purchase-list endpoints use the sibling `{data, meta}` envelope (shared `PageMeta`), same as coins/roadmaps — not the raw Laravel paginator `/student/courses` uses.
- `GET /resources/types` (no `/student` prefix — shared with tutor/admin portals) supplies the filter/format vocabulary; cached with a 1-hour `staleTime` since it's effectively static.
- `hooks/useResourceAccess.ts` is the **single shared "resource access" controller** every surface (library list, detail page, `CourseResourcesSection`) calls through, so the allowance never drifts between surfaces: one `["resource-usage"]` query (enabled only when signed in), one `open(resource, navigate, disposition?)` function that POSTs the access endpoint, replaces the usage cache with the server's authoritative value via `setQueryData` (not just invalidation), and — on a `402 RESOURCE_ACCESS_LIMIT_REACHED` — captures `error.details` into local `limitDetails` state instead of throwing, which `ResourceAccessDialog` (a `BottomSheet`) renders. Every other error (storage unavailable, not found, suspended account) rethrows for the caller to show inline.
- **Popup-safe opening:** for a PDF's "Open" (`disposition: "inline"`) or an external link, `window.open("", "_blank")` is called *synchronously before* the access `await` (so the browser's popup allowance, tied to the user gesture, isn't lost), then `.location.href` is set once the signed URL comes back; `pendingTab.opener = null` guards against the opened page reaching back into the portal. A file's "Download" (`disposition: "attachment"`) instead clicks a temporary `<a href>` — no SPA navigation, no fetch-to-blob. Access responses (the signed URL) are never put in a persisted query key, localStorage, or logged.
- Query keys: `["resources","list", signedIn, filters]`, `["resources","detail", id, signedIn]`, `["resources","course", courseId, signedIn]`, `["resource-usage"]` (shared, student-only), `["resource-purchases"]`, `["resource-purchase", id]`.

**Pages** — `Resources` (list + the Monime checkout-return banner/poll, same pattern as `CourseDetail.tsx`'s `?payment=` flow but for `?purchase=success|processing|cancelled|expired&purchase_id=`), `ResourceDetail`, `ResourcePurchases` (protected). Shared pieces: `DiscoveryToolbar`/`FilterSelect` (reused as-is from Courses/Roadmaps), `BottomSheet` (the paywall dialog), `EmptyState` with no `pose` (no mascots on this surface, per the design guide).
- **List filters:** primary (always visible) = Sort, Resource type, Format; secondary (behind "More filters") = Source, University→Faculty→Department (cascading, same lookups as Courses), Organization, Level, Semester. Format's option pool narrows to `file_formats` or `link_types` when Source is set, and an incompatible selected format is cleared automatically. Free-text search is debounced ~300ms (unlike Courses'/Roadmaps' submit-on-Enter search) — the design guide asks for this specifically.
- **Course resources** (`components/resources/CourseResourcesSection.tsx`): a new sibling section appended after "Course Structure" in `CourseDetail.tsx` (that page has no tabs — it's a flat single-scroll stack of cards, so a new tab wasn't introduced for this). Same `ResourceListItem` + `useResourceAccess` controller as the library — a course's resources use the student's normal allowance, enrollment doesn't bypass it.
- **Purchase history** (`/resources/purchases`): a pending row's "Check status" one-shot-fetches `GET .../purchases/{id}`; "Resume payment" re-POSTs `purchaseResourcePack()` rather than reading a `checkout_url` off that GET response — the GET/list shapes never carry `checkout_url`/`state` (only the POST response does), and POST is documented to resume rather than duplicate an open checkout. See `docs/DECISIONS.md` for the bug this was before the fix.

**Navigation:** Resources replaced Leaderboard in the primary/authenticated nav (`TopNav`, `BottomNav`'s `navItems`) on the design guide's explicit instruction — a departure from the `/wallet`/`/roadmaps` no-nav-slot precedent. Leaderboard moved to a new action-row pattern in `Profile.tsx`'s Overview tab (first use of that row shape in this codebase). See §3's "Primary nav" note and `docs/DECISIONS.md` for the full reasoning, including the narrowly-scoped login-only `?redirect=` param (`hooks/useAuth.ts`) that lets a guest sent to log in from a resource's detail page land back on it.

---

## 14. Feed shell, Opportunities & Gigs (2026-10-09)

Built from `docs/designs/univybe_feed_opportunities_gigs_design_guide.md` against the Round 8 (`docs/STUDENT_API_PAYLOADS.md` §80–83, `docs/OPPORTUNITIES_API.md`) and Round 9 (§84–92, `docs/GIGS_API.md`) backend contracts. **Opportunities** are a public, read-only, external-apply-link list (scholarships/internships/jobs/…). **Gigs** are small paid jobs students (or tutors/admins) post; browsing is public, "Interested" records an applicant and hands back the creator's WhatsApp/email, and students can also post/manage their own gigs, mark applicants Worked With, and rate each other. Both are independent content systems, not Feed posts.

**Shell** — `src/pages/FeedShell.tsx` is a nested `<Outlet>` layout route (`/feed` → `index`/`opportunities`/`gigs`), the first use of that React Router pattern in this codebase (§3, `docs/DECISIONS.md`). It owns one `PageShell`, the accessible tab row (`role="tablist"`, roving focus, Left/Right/Home/End/Enter/Space), the per-tab heading/subtitle, and `src/hooks/useSwipeTabs.ts` (Pointer Events, touch-only, 12px/horizontal-dominant arm threshold, 20%-width-or-flick commit, rubber-banded at either end, `prefers-reduced-motion`-aware). Detail/management/form routes (`/feed/opportunities/:id`, `/feed/gigs/*` except the three tabs) are flat siblings *outside* the layout route — no tab row, no swipe, matching the guide's "swipe applies to the three main discovery pages only." `Feed.tsx` kept all its existing feed-session logic (feed-time query, 5-min poll, `endFeedSession()` on unmount, the lock overlay) completely unchanged — only its outer `PageShell`/heading JSX was stripped, since `<Outlet>` mounting/unmounting the Feed panel already makes those effects fire exactly when the Feed tab is active, satisfying "no session calls merely from entering the shell or switching tabs." Each tab (`Opportunities.tsx`, `Gigs.tsx`) keeps its own filters/page in its own URL search params (not component state), since `<Outlet>` unmounts the outgoing tab on switch.

**Data layer**
- `types/opportunity.ts`, `services/opportunities.ts` (`getOpportunityVocabulary`, `getOpportunities`, `getOpportunity`, `isOpportunityNotFoundError`). Public, no `/student` prefix, identical response for guest and student (no `isAuthenticated()` segment in its query keys). List pagination is the sibling `{data, meta}` envelope, like resources/roadmaps/coins.
- `types/gig.ts`, `services/gigs.ts` (public: `getGigOptions`, `getGigCategories`, `getGigs`, `getGig`; student: `expressGigInterest`, `getGigInterests`, `rateGigCreator`, the full `posted-gigs` CRUD + lifecycle set, `getGigApplicants`, `setApplicantWorkedWith`, `rateApplicant`, `getStudentGigReviews`). Gigs' public list/detail query keys **do** include `isAuthenticated()` since the response's `viewer` block differs by account. `setApplicantWorkedWith` returns a bare boolean, not the usual envelope — see `docs/DECISIONS.md`.
- `hooks/useGigInterest.ts` mirrors `useResourceAccess.ts`'s shape for the "Interested / contact creator" flow: popup-safe tab (`window.open("", "_blank")` before the `await`), the server's refreshed `gig` replaces the one known detail-cache entry via `setQueryData` and invalidates list caches, and the hook deliberately never exposes the mutation's `data` for later reads — only the one-shot return value of `contact()` — per the guide's "never cache/log/persist the contact response."
- New shared filter primitives in `components/discovery/`: `FilterMultiSelect` (checkbox popover — Opportunities' type, Gigs' category/pricing/work-mode, all documented as "match any within that filter"), `TagListInput` (free-text add/remove chips for AND-semantics tag/skill filters, generalized from `Profile.tsx`'s Interests editor), `SegmentedToggle` (Open/Past, Open/Closed).
- `components/course/CourseFallbackCover.tsx` (generic `{seed,title}` branded placeholder, built for course/roadmap covers) is reused as-is for Opportunity/Gig cards with no cover image — no new cover-art util was written.

**Pages** — `Opportunities`/`OpportunityDetail`; `Gigs`/`GigDetail`/`GigContactSheet` (method-picker `BottomSheet`, records interest only on a deliberate tap); `GigInterests` (My interests + rate-creator); `PostedGigs`/`PostedGigDetail` (management actions driven *only* by the response's `permissions` block, never inferred from `status`) /`PostedGigApplicants`/`GigApplicantsTable` (Worked With + rating, using the **interest UUID**, not the student id, in mutation URLs); `PostGigPage`/`PostGigForm` (shared create/edit form, grouped sections per the guide's §10 table). The form's unsaved-changes guard is `beforeunload`-only plus a manual Cancel confirm — `useBlocker` needs a data router and this app uses a plain `<BrowserRouter>` (see `docs/DECISIONS.md`); in-app nav-link clicks are not intercepted. Its cover-image upload reuses the existing 3-step Cloudinary flow (`services/upload.ts`) but skips `storeUploadMetadata` (no `entity_id` exists pre-creation), building `{source:"cloudinary",public_id}` straight from the raw upload response.

**Reputation** — the additive `gig_reputation` field (average rating, count, recent written reviews) on `GET /student/profile` and `GET /student/students/{id}` is rendered in the two existing surfaces that already fetch those responses: a new card in `Profile.tsx`'s Overview tab (own profile) and a new section in `Leaderboard.tsx`'s student-profile modal (public profile) — both read data already on the page's existing query, no new network call. `RatingStars` (`components/gigs/RatingStars.tsx`) is the shared 1–5 star control, used both as an input (rate-creator, rate-applicant) and read-only (reputation display). The full paginated reviews endpoint (`GET /gigs/students/{uuid}/reviews`) is not wired to any UI yet — a documented nice-to-have, not required by the guide's minimum.

**Navigation:** see §3's "Feed nav entry" note — no new nav items; the existing Feed slot's link became dynamic (`src/store/feedTabStore.ts`, a tiny unpersisted Zustand store tracking the last-visited tab) and gained prefix-based active highlighting.


---

## 15. Teaser mode (branch `teaser`, 2026-10-11)

Purpose: keep visitors engaged with what UniVybe offers while the backend and hosting are finished. Only the landing page is reachable; every other URL shows a playful "coming soon" page.

**How it is wired**
- `vite.config.ts` injects a compile-time constant `__TEASER_MODE__` via `define` (typed in `src/globals.d.ts`). It is **true unless `VITE_TEASER_MODE=false`**, i.e. on by default on this branch. It is read at *build* time (`loadEnv`, so `.env*` files and CI/host env vars both work); changing it needs a rebuild or a dev-server restart.
- `src/main.tsx` chooses the root with `__TEASER_MODE__ ? import("./TeaserApp") : import("./App")`. Because the constant is a literal, the bundler drops the unused branch: a teaser build emits **no** page chunks (3 JS files: entry, `TeaserApp`, `ComingSoon`; 22 precache entries vs 119 for the full app), and the service worker precaches none of the app. Verified by building both modes.
- `src/TeaserApp.tsx` — `BrowserRouter` + `ErrorBoundary`, two routes: `/` → `Landing` (imported eagerly), `*` → `ComingSoon` (lazy). No `QueryClientProvider`, no `OfflineIndicator`, no auth redirect (a stale `auth_token` still sees the landing page; the full app would send it to `/dashboard`). A `ScrollToTop` component resets scroll on PUSH/REPLACE navigations only, so Back restores the landing page's scroll position.
- `src/pages/ComingSoon.tsx` — one component; the topic comes from the pathname via `resolveTopic` in `src/components/teaser/comingSoonContent.ts` (auth, courses, roadmaps, resources, opportunities, gigs, feed, coins, dashboard/profile/leaderboard, generic). Each topic has its own mascot pose (existing `landingImages` art, no new media), brand accent colour, headline, copy and Vybe quips. Tapping Vybe cycles the quips (GSAP squish, skipped under reduced motion). "Peek at what's cooking" chips link to the other topics, so each landing-page link pays off differently. Always light (no `dark:` classes); sets a `noindex` robots meta and a `Coming soon · UniVybe` title while mounted.
- The landing page itself is **unchanged**; its CTAs and nav links ("Get started", "Courses", "Find gigs", …) now simply land on the matching "coming soon" topic.

**Why `OfflineIndicator` is excluded:** it starts `initSync`, which replays queued offline actions against the API and drops each after `MAX_RETRIES` (3) failures (`services/sync.ts`). With no live backend, a returning student's queued quiz/lesson progress would be silently destroyed.

**Switching the full app back on:** set `VITE_TEASER_MODE=false` (e.g. in `.env.local` for local work, or as a build env var on the host). Nothing else changes. To retire teaser mode permanently: delete `TeaserApp.tsx`, `ComingSoon.tsx`, `components/teaser/`, the `define` in `vite.config.ts` and `src/globals.d.ts`, and restore `main.tsx` to a plain `import App`.

**Dev:** `.claude/launch.json` has an `edu-student-teaser` config on port 5180 (5173/5174 were occupied by other apps on the owner's machine).

## 16. Onboarding resume and "Can't find your institution?" (2026-10-26)

**Resume.** `pages/Onboarding.tsx` restores an interrupted onboarding from `utils/onboardingDraft.ts`: key `onboarding_draft:<accountId>` (user id of the active session), payload `{version: 1, accountId, step, savedAt, fields}`. Only `firstname, lastname, phone, level, university_id, faculty_id, department_id, organization_id, student_id` are stored — **never** the password pair. Loading rejects a draft whose version/accountId doesn't match and coerces every field to a safe type. Restoring happens in `useState` initialisers (an effect-based restore used to lose a race with the autosave effect and overwrite the draft with a blank form). `reachableStep` (in `utils/onboardingValidation.ts`) keeps a restored draft from opening past an incomplete step. The draft is cleared on successful onboarding, on explicit logout (all accounts' drafts, for shared devices), and when the server profile says onboarding is already complete; it is **kept** across session expiry. On mount the page also calls `getAuthProfile` (server is authoritative): complete → promote any pending token, drop the draft, go to `/dashboard`; failures are ignored so the form still works offline.

**Institution lookups.** `hooks/useInstitutionLookups.ts` owns the four queries (same keys as Courses/Roadmaps/Resources/Profile: `["universities"]`, `["faculties", uni]`, `["departments", uni, fac]`, `["organizations"]`), with `staleTime` 30 s and `refetchOnWindowFocus: true` (the app default is `false`) so returning from WhatsApp revalidates without polling. Faculties load only once the university is confirmed in the list, departments only once the faculty is confirmed in *that university's* list, so a stale/mismatched pair is never requested or submitted. `Onboarding.tsx` drops (and announces) any selection no longer in the live list and blocks steps 3–4 until every regular-level selection is confirmed; it never picks a replacement. `services/onboarding.ts` accepts either a bare array or a Laravel-paginator `{data: [...]}` payload.

**Support flow.** `components/onboarding/InstitutionField.tsx` (select + loading / failed-with-Retry / empty / "Can't find your …?" / "Refresh list" — the help link is always rendered) and `MissingInstitutionDialog.tsx` (built on `BottomSheet`: labelled modal, focus trap, Escape). `utils/whatsapp.ts` builds the message (names only; student text is whitespace-flattened and capped at 120 chars) and a `https://wa.me/<digits>?text=<encoded>` link. The primary action is a real `<a target="_blank" rel="noopener noreferrer">`, not `window.open`, so it works with popup blockers and long-press; opening it never submits or clears anything and the UI says "nothing has been sent yet". The number comes from `VITE_SUPPORT_WHATSAPP_NUMBER` (`config/env.ts` → `env.SUPPORT_WHATSAPP_NUMBER`); unset/invalid shows "WhatsApp support isn't available right now" and no link.

Tests: `utils/whatsapp.test.ts`, `utils/onboardingDraft.test.ts`, `components/common/ProtectedRoute.test.tsx` (also `HomeGate`), `services/authSession.test.ts` (session storage, logout, 401 recovery), `hooks/useAuth.test.tsx`, `pages/Onboarding.test.tsx`.

## 17. Course certificates (2026-11-11)

Frontend-only Certificate of Completion for **free and paid** courses (spec: `docs/univybe_course_certificates_implementation_guide (1).md`). No new API, table, upload or public link: everything is generated in the browser from the existing progress endpoints. Samples: `docs/certificate-samples/`.

**Routes** (both `ProtectedRoute requireOnboarding`, lazy): `/profile/certificates` (collection, `pages/CertificatesPage.tsx`) and `/profile/certificates/:courseId` (preview/export, `pages/CertificatePreviewPage.tsx`). `:courseId` is the course uuid (or id) — the same identifier `GET /student/courses/{course}/progress` takes.

**Entry points.** (1) Course-completion celebration in `CoursePlayer.tsx`: `components/certificates/CertificateCelebrationAction.tsx` shows "Preparing…" → "View certificate" only after a fresh server progress read says complete; a failed/contradictory read shows Retry; the existing Finish/Continue buttons and XP/coins/roadmap blocks are untouched (the modal card gained `max-h-[92dvh] overflow-y-auto` so the extra row can't push it off a short phone). (2) `CourseDetail.tsx`: a "View certificate" button beside Continue Learning when the course's own progress record is complete. (3) `Profile.tsx` overview: `components/certificates/CertificatesProfileSection.tsx` (up to 3 tiles + View all; never prints a total).

**Eligibility** is the server record only (`utils/certificates/data.ts::evaluateCompletion`): `is_completed === true`, or a `completed_at` when the flag is absent (the API derives one from the other). `is_completed: false` **with** a date is a *mismatch*: re-read once (`services/certificates.ts::getCertificateEligibility`), then reported, never minted. `progress_percent`, XP, coins, `course_completed` from the POST, route params and local storage never grant eligibility. The course title comes from the verified record's nested `course.title`.

**Collection pagination.** `GET /student/courses/enrolled` is a *nested* Laravel paginator (`data.data[]`), not the flat `data[] + meta` of gigs/resources. `utils/certificates/enrolledPage.ts` decodes the nested, flat and bare-array shapes and works out "has more" from `next_page_url` → `links.next` → `last_page` → `total/per_page`, else "unknown" (keep going until an empty page; a page of already-seen records also stops it). `hooks/useCertificateCollection.ts` (react-query `useInfiniteQuery`) loads pages incrementally, filters completed records locally and de-duplicates by course. The first page loads automatically; Profile auto-loads until 3 certificates are found (max 3 pages), the collection page until 1 (max 3 pages); after that "Load more courses". "No certificates" is only shown once the source list is exhausted; the list is date-sorted only then. No completed-only filter exists in the docs, so none is invented. The existing `getEnrolledCourses` (dashboard / My courses) is unchanged and still reads page 1 only.

**Rendering.** One deterministic canvas renderer per format, drawn at fixed design coordinates and shared by preview, PNG, PDF and share (`utils/certificates/render/`: `landscape.ts` 2400×1697, `story.ts` 1080×1920, `assets.ts`, `shapes.ts`, `pdf.ts`, `index.ts`). The whole folder is loaded with `import()` (its own ~14 kB chunk). Layout is *planned* separately from drawing (`planLandscape`/`planStory` + `utils/certificates/layout.ts`): text is wrapped by grapheme-safe greedy wrapping and sized down through tiers until it fits; decoration (the mascot) yields before type; if text cannot fit at a readable size (or the title is over 500 characters) it throws `CertificateTextOverflowError` — it never ellipsizes or clips. Fonts (the bundled "Super Greatly"/"Bangers" faces from `index.css`) and the four bundled images are awaited first; a failed font falls back to the system stack, a failed image to a brand-shape stand-in / text wordmark. Image loading waits on the `load` event (a backgrounded tab can stall `decode()`). Blob output only (no base64 in state).

**PDF.** A tiny single-image PDF writer (`render/pdf.ts`, no dependency): one A4 landscape page (297 × 210 mm) with the landscape image, lossless (zlib via `CompressionStream`) with a JPEG fallback. The text is rasterised, so it isn't searchable (accepted for V1). Generated on demand only.

**Artifacts & session.** `utils/certificates/artifactCache.ts`: a 4-entry in-memory LRU keyed by account + course + printed name + title + `completed_at` + format + kind + template version, with reference-counted Blob URLs (revoked only when evicted *and* unused). `utils/certificates/session.ts` ties it to the signed-in account: `clearCertificateSession()` runs from `clearFullSession` (logout), the 401 handler in `api.ts`, and `storeFullSession` when a *different* account signs in; `App.tsx`'s `CertificateSessionCleanup` drops every `["certificates", …]` query on the same event. All certificate query keys are `["certificates", kind, accountId, …]` — the shared `["user-profile"]` key is not account-scoped, so the preview page reads the profile under its own key. `hooks/useCertificateArtifact.ts` prepares the selected format *before* the buttons enable (so Share keeps its user activation), derives status from the current key (no stale image flashes after a name edit), and debounces name edits 350 ms.

**Sharing.** `utils/certificates/share.ts`: `canShareFile` feature-detects `navigator.canShare({files:[file]})` on the real PNG; `shareCertificateFile` calls `navigator.share` synchronously with only `{files, title}`; `AbortError` is a quiet cancel; anything else shows "Share image" again plus Download. Without file sharing, Share opens "Download the image, then upload it to your status or story" with Download image / Copy caption — never a WhatsApp text link, and no copy ever claims anything was posted.

**Name.** Defaults to `full_name`, else joined first/last. "Name on certificate" is validated (trim, collapse spaces, ≤120 code points, no control/line-separator/bidi-override characters, any script) and only affects that page visit; it is never sent anywhere. Date: `completed_at` formatted en-GB in `Africa/Freetown` ("Completed 9 October 2026"); absent/unparseable → omitted, never today's date.

**Tests.** `utils/certificates/*.test.ts` (data, enrolledPage, layout, artifactCache, pdf, share, render/render.test.ts), `pages/CertificatePreviewPage.test.tsx`, `pages/CertificatesPage.test.tsx` (also the Profile section), `components/certificates/CertificateCelebrationAction.test.tsx`.
