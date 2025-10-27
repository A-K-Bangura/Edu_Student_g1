# Student Portal — Frontend Engineering Guide

**Project:** EduLift Sierra — Student Portal (PWA, Student Frontend)

**Derived from:** Student Portal Frontend PRD (v1.0). See uploaded PRD for requirements and UX decisions.

---

## Table of contents

1. Overview & goals
2. Tech stack & rationale
3. High-level architecture
4. Folder & repository structure
5. Routing & navigation
6. Component architecture & conventions
7. State management strategy
8. API integration patterns
9. Authentication & security (frontend concerns)
10. Offline, caching & sync implementation
11. Media handling (YouTube, downloads)
12. Jotting Pad (notes) implementation
13. Animations & performance considerations
14. Accessibility & localization
15. Testing strategy (unit, integration, e2e)
16. CI / CD, build & deployment
17. Monitoring, telemetry & error handling
18. Coding standards & linting
19. Developer setup & contribution guide
20. Appendix: Code samples & snippets

---

# 1. Overview & goals

This engineering guide is a frontend-only implementation blueprint for the Student Portal described in the PRD. It translates product requirements into concrete engineering decisions, code organization, APIs, and implementation patterns. Use it as the single-source-of-truth for frontend engineers building the PWA.

Primary goals:

- Fast, resilient PWA optimized for low-bandwidth and low-end devices.
- Clear componentized React + TypeScript codebase with good DX.
- Robust offline-first behavior for lessons and quiz sync.
- Maintainable animations and light gamification.

---

# 2. Tech stack & rationale

**Frontend framework:** React + TypeScript

- Strong ecosystem, type-safety, excellent tooling and community libraries.

**Bundler / framework:** Vite (React)

- **Vite** recommended if you want SPA + PWA simplicity and faster local dev. Use `@vitejs/plugin-react`.

**Styling:** Tailwind CSS (utility-first)

- Small bundle, consistency, rapid styling. Use a Tailwind config with design tokens.

**State management:**

- **React Query (TanStack Query)** for server state (caching API responses, retries, background refetch).
- **Zustand** for lightweight client state (UI-only state, offline queue metadata, small ephemeral states).

**Offline storage:** IndexedDB via `idb` or `localforage`

- For queued network requests and persistent notes storage.

**PWA / Service Worker:** Workbox with custom service worker

- Precache app shell; runtime caching strategies for lesson text/resources.

**Routing:** React Router (v6)

- Nested routes align with course/module/lesson route patterns.

**Animations:** Gsap (for simple, performant animations)

- Conditionally loaded; fall back to CSS transitions in low-bandwidth mode.

**Testing:**

- Unit: Jest + React Testing Library
- E2E: Cypress

**Lint & format:** ESLint + Prettier + TypeScript strict rules

**Build & Deploy:** Vercel, Netlify or static hosting (if Vite) or your chosen cloud.

---

# 3. High-level architecture

```
[Client PWA (React)]
  - Routes, Components, Service Worker, IndexedDB
  - Auth + JWT, Local notes, Offline queue
         |
         v
[API Gateway / Backend] (Laravel or other)
  - Auth, Courses, Lessons, Quizzes, Notes, Leaderboard, Feed
         |
         v
[Storage / CDN]
  - S3 / R2 / Spaces for attachments and images
  - YouTube embeds for videos
```

Notes:

- Frontend expects REST endpoints as defined in PRD. Keep payloads small.
- Use CDN for media; only store URLs in DB.

---

# 4. Folder & repository structure

Opinionated minimal structure (Vite + React):

```
/src
  /assets
  /components
    /common
    /layout
    /course
      CourseCard.tsx
      OutlineSidebar.tsx
      LessonPlayer/
        index.tsx
        MiniLessonRenderer.tsx
        QuizRenderer.tsx
  /hooks
    useAuth.ts
    useOfflineQueue.ts
    useVideoResume.ts
  /pages
    Auth/
      Login.tsx
      Signup.tsx
      VerifyOtp.tsx
    Onboarding.tsx
    Dashboard.tsx
    Courses.tsx
    CourseDetail.tsx
    CoursePlayer.tsx
    LessonQuiz.tsx
    Feed.tsx
    Leaderboard.tsx
    Profile.tsx
    Downloads.tsx
  /services
    api.ts
    auth.ts
    notes.ts
    offlineSync.ts
  /store
    uiStore.ts (Zustand)
  /utils
    format.ts
    validators.ts
  /styles
  /i18n
  main.tsx
  App.tsx

/tests
  /unit
  /e2e

/package.json
/vite.config.ts
/tsconfig.json
/README.md
```

Conventions:

- Use `components/*` for purely presentational UI bits.
- Use `pages/*` for route-level containers that orchestrate data fetching and compose components.
- Keep components small (<200 LOC); split into subcomponents as needed.

---

# 5. Routing & navigation

Use React Router v6 with nested routes. Example route tree:

```tsx
<BrowserRouter>
  <AppShell>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/*" element={<AuthRoutes />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <Courses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/course/:courseId/*"
        element={
          <ProtectedRoute>
            <CourseRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lesson/:lessonId/quiz"
        element={
          <ProtectedRoute>
            <LessonQuiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
    </Routes>
  </AppShell>
</BrowserRouter>
```

**ProtectedRoute** reads auth token (React Query or auth hook) and redirects to `/auth/login` if no valid token.

**Deep linking:** support `/course/:courseId/module/:moduleId/lesson/:lessonId` for sharing and resume.

**Mobile bottom nav:** conditionally render bottom tab bar when `isMobile` (use CSS breakpoints or `useMediaQuery`).

---

# 6. Component architecture & conventions

### Patterns

- **Presentational vs Container**: Keep presentational components free of data fetching; page containers handle queries and pass props.
- **Composition over inheritance**: prefer composing small components.
- **Props-first**: Components should be deterministic and rely on props; avoid global side-effects.

### Core components (suggested)

- `PageShell` — header, optional sidebar, responsive layout.
- `TopNav`, `BottomNav` — responsive navigation.
- `CourseCard`, `ModuleList`, `LessonCard`.
- `OutlineSidebar` — renders nested modules/lessons with current position.
- `MiniLessonRenderer` — switch-case renderer for `text|image|video|download`.
- `QuizRenderer` — question flow UI.
- `JottingPad` — notes editor and save controls.
- `CompletionModal` — XP animation + CTA.

### Accessibility

- Buttons use `<button>` with `aria-label` when icon-only.
- Use semantic sections: `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>`.
- Focus management: shift focus to modals and restore on close.

---

# 7. State management strategy

**Server state (React Query):**

- Use React Query to fetch: courses list, course details, lesson content, quizzes, profile, leaderboard, feed.
- Configure cache-times: courseOutline (10m), lesson content (1h), profile (1m).
- Use `stale-while-revalidate` semantics: show cached content while background fetch updates.

**Client state (Zustand):**

- UI flags: `lowBandwidthMode`, `isMobilePanelOpen`, `currentMiniLessonId`.
- Offline queue metadata: queued mutation ids, last synced timestamp.

**Local persistence:**

- Notes saved to IndexedDB and mirrored to server (via `notes` service).
- Video progress saved locally by `useVideoResume` hook.

**Optimistic updates:**

- When awarding XP and badges on lesson complete, update UI optimistically and reconcile server result when response arrives. React Query `mutate` with `onMutate`, `onError`, `onSettled` patterns.

---

# 8. API integration patterns

**API client:** create a single `api.ts` that exports a typed Axios instance with interceptors for auth token refresh.

```ts
// services/api.ts
import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use((config) => {
  /* attach token */
});
```

**React Query usage example**

```ts
const { data, isLoading } = useQuery(["course", courseId], () =>
  api.get(`/course/${courseId}`).then((r) => r.data)
);
```

**Mutations**

- `completeLesson` mutation: `POST /api/lesson/:lessonId/complete`. If offline, push to IndexedDB and mark local progress as pending.
- `submitQuiz` mutation: same offline queue behavior.

**Error handling**

- Show toast for transient errors; show blocking modal for auth errors (401) and redirect to login.

---

# 9. Authentication & security (frontend concerns)

**Auth model**

- JWT access token returned from `/api/auth/verify-otp` and `/api/auth/login`.
- Store access token **in-memory** (React Query auth cache) and refresh via httpOnly refresh cookie or re-login flows.

**Why not localStorage?**

- To minimize XSS risks. If persistent storage needed, use secure same-site httpOnly cookies set by backend.

**Implementation notes**

- `useAuth` hook to expose `{ user, token, login, logout, isAuthenticated }`.
- Axios interceptor to `401 -> trigger refresh` or `logout`.
- Protect routes via `ProtectedRoute` wrapper.

**OTP flow**

- Sign up triggers `POST /api/auth/signup`; verify OTP via `POST /api/auth/verify-otp` to receive token.

---

# 10. Offline, caching & sync implementation

This is critical. Implement a robust queue and reconciliation mechanism.

## Service Worker (Workbox)

- Precache: app shell files, CSS, critical images.
- Runtime caching:
  - Lesson text endpoints: stale-while-revalidate (short TTL)
  - Course outlines: stale-while-revalidate
  - Media (images): cache-first with max entries; evict old entries.

## IndexedDB offline queue

- Schema: store queued items with `id, type, payload, retries, createdAt`.
- Types: `lessonComplete`, `quizSubmit`, `noteSave` (note: noteSave should be immediate write-through to DB as well as API).

**Queue worker**

- Background sync: attempt to flush queue on `navigator.onLine` or `visibilitychange` to `visible`.
- Use exponential backoff on failures; log failures to local telemetry.

**Sync logic example**

1. User completes quiz → frontend calls `submitQuizMutation`.
2. Mutation detects offline: write item to `idb.queue` and show local success UI.
3. When online, `offlineSync.flush()` processes queue items in order and calls server APIs.
4. For each item, reconcile server response and update React Query caches.

**Conflict handling**

- Server authoritative: if server returns different scoring or XP, show reconciliation toast: "Server updated your score to X" and update local cache.

**Low-bandwidth mode**

- Disable heavy assets and animations; only basic content loads.

---

# 11. Media handling (YouTube, downloads)

**YouTube embedding**

- Use lightweight placeholder for YouTube (thumbnail with play button). Only load iframe when user taps play.
- Persist playback position using `useVideoResume` hook. Save to IndexedDB and optionally to server via optional endpoint.

**Downloads & attachments**

- Use pre-signed URLs from backend so files served via CDN but auth-protected.
- For PDF preview, use browser native PDF rendering or `pdf.js` for in-app preview.

**Optimization**

- Lazy-load images and media components with `loading="lazy"` and intersection observer.
- For low-bandwidth users, offer audio-only or text-only view.

---

# 12. Jotting Pad (notes) implementation

**Requirements:** autosave, download (.txt/.pdf), persisted across devices.

**Implementation plan**

- Use a small rich-text editor (TipTap or a simple contenteditable) OR a plain `<textarea>` for simplicity.
- On change (debounced 800ms), write to IndexedDB and call `POST /api/notes` to save server-side.
- On mount, fetch existing note via `GET /api/notes?lessonId=...` and populate editor.
- Provide export:
  - **TXT:** simple text blob download via `URL.createObjectURL(new Blob([text]))`.
  - **PDF:** use `jsPDF` to render text -> PDF client-side for download (avoid heavy libs if possible).

**Edge cases**

- If offline and user writes notes, save to IDB and mark note as `pendingSync`. Sync when online.

---

# 13. Animations & performance considerations

**Strategy**

- Keep animations subtle and conditional.
- Use Gsap for entry/exit animations and a simple confetti library for the completion screen.

**Performance tips**

- Code-split route-level bundles: `React.lazy` and `Suspense` for pages like `Feed` and `CoursePlayer`.
- Avoid loading animation assets on initial render; load them on demand.
- Use image optimization (responsive `srcset`, WebP where possible).

**Device detection**

- Use `Network Information API` and `navigator.hardwareConcurrency` to decide whether to enable heavy animations.

---

# 14. Accessibility & localization

**Accessibility checklist**

- Keyboard accessible navigation and tab order.
- ARIA roles for dynamic content (modals, sidebars).
- Alt text for images and accessible labels for icons.
- Color contrast checks via automated tests.

**Localization**

- Use `react-i18next` with namespaced translation JSON files.
- Load UI translations dynamically; lesson content translations served from backend.

---

# 15. Testing strategy

**Unit tests**

- Test components with React Testing Library (props and accessibility). Mock API calls with MSW (Mock Service Worker).

**Integration tests**

- Test pages with React Query and API mocks.

**E2E tests (Cypress)**

- Critical flows: login/signup/OTP, onboarding, course enroll, lesson play, quiz submit (offline simulation), notes save/download.

**Performance tests**

- Lighthouse CI for key pages (dashboard, lesson page) on throttled network.

---

# 16. CI / CD, build & deployment

**Recommended pipeline**

- GitHub Actions for CI:
  - `lint` -> `build` -> `test` -> `deploy-preview` on PRs
- Deploy to Vercel/Netlify for preview builds; production deploy on `main` branch.

**Secrets & env**

- Store keys in CI secret store. Use `VITE_API_URL`, `VITE_ENV` and analytics keys.

**Versioning**

- Follow semantic versioning for releases; tag releases in Git.

---

# 17. Monitoring, telemetry & error handling

**Error monitoring:** Sentry
**Analytics:** Segment or simple event collector -> backend events table.

**Events to track:**

- `lesson_started`, `mini_lesson_viewed`, `lesson_completed`, `quiz_submitted`, `note_saved`, `feed_unlock`.

**Logging:**

- Capture offline sync failures and API error rates. Surface metrics in Grafana/Datadog (if available).

---

# 18. Coding standards & linting

**ESLint rules** (recommended):

- `eslint:recommended`, `plugin:react/recommended`, `plugin:@typescript-eslint/recommended`.
- Enforce `strict` TypeScript settings.

**Prettier** for formatting. Run `pre-commit` hooks via `husky` to run `lint-staged` checks.

---

# 19. Developer setup & contribution guide

**Local dev**

1. Clone repo
2. `cp .env.example .env` and set `VITE_API_URL`
3. `pnpm install` or `npm install`
4. `pnpm dev` to run local server

**Testing**

- `pnpm test` runs unit tests
- `pnpm cypress:open` runs E2E in dev

**Branches**

- `main` protected; `develop` for integration; feature branches named `feat/<short-desc>`

---

# 20. Appendix: Code samples & snippets

## API client (axios + auth)

```ts
import axios from "axios";
import { getAuthToken, logout } from "./auth";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use(async (config) => {
  const token = getAuthToken();
  if (token)
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});
api.interceptors.response.use(undefined, async (error) => {
  if (error.response?.status === 401) {
    // handle logout or refresh
    logout();
  }
  return Promise.reject(error);
});
```

## React Query lesson fetch example

```ts
function useLesson(lessonId: number) {
  return useQuery(
    ["lesson", lessonId],
    () => api.get(`/lesson/${lessonId}`).then((r) => r.data),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  );
}
```

## Offline queue (simplified)

```ts
// services/offlineQueue.ts
import { openDB } from "idb";
const DB_NAME = "edulift-db";
export async function addToQueue(item) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
    },
  });
  await db.add("queue", item);
}
export async function flushQueue() {
  const db = await openDB(DB_NAME, 1);
  const tx = db.transaction("queue", "readwrite");
  const all = await tx.objectStore("queue").getAll();
  for (const item of all) {
    try {
      if (item.type === "lessonComplete")
        await api.post(
          `/lesson/${item.payload.lessonId}/complete`,
          item.payload.body
        );
      await tx.objectStore("queue").delete(item.id);
    } catch (e) {
      // leave item for retry
    }
  }
  await tx.done;
}
```

---
