# Project State — `edu-student`

*Snapshot as of 2026-09-29. This describes discovered current behavior, not the product vision — update on major changes, don't let it go stale.*

---

## Summary

A working V1 exists (per `CLAUDE.md` §1) — this is not greenfield. The app is a Vite + React 19 + TypeScript SPA/PWA consuming a separate Laravel API (`docs/STUDENT_API_PAYLOADS.md` is the verified backend contract; `docs/STUDENT_FRONTEND_API_CHANGES.md` is the changelog against an older frontend version, now including a "Round 3" covering guest browsing). Recent work brought the frontend's types/services back in line with that contract, added guest browsing (`Landing.tsx`, public `/courses`/`/course/:id`/`/feed`), and — as of 2026-09-29 — closed out most of the open items from the 2026-09-28 onboarding audit (see `docs/KNOWN_ISSUES.md`).

Local dev backend confirmed reachable at `127.0.0.1:8000` during this audit; production API is a plain-HTTP IP address (`35.233.83.200`) fronted by a Vercel rewrite (see `vercel.json`, `docs/ARCHITECTURE.md` §8).

## Teaser branch (2026-10-11)

On the `teaser` branch the app ships as a **teaser**: `/` is the landing page and every other URL shows a route-aware, playful "coming soon" page (`src/TeaserApp.tsx`, `src/pages/ComingSoon.tsx`). It is a build-time flag, on by default on this branch; `VITE_TEASER_MODE=false` builds/runs the full app unchanged. A teaser build contains none of the app's pages (3 JS chunks) and makes no API calls. Design, wiring and the reasoning are in `docs/ARCHITECTURE.md` §15 and `docs/DECISIONS.md` (2026-10-11); open follow-ups are `docs/KNOWN_ISSUES.md` #43–46. Verified: type-check, lint, 141 unit tests, both build modes, and the browser (dev + production build, desktop + mobile width).

## What's verified working end-to-end

Live-tested against the local backend with a real account:
- Login (email + password); `ProtectedRoute`'s onboarding gate is now active and doesn't wrongly bounce an already-onboarded account
- Dashboard: stats, recent activity, enrolled-course card, XP/level display
- Profile: overview, badges tab, achievements tab, settings
- Leaderboard: overall / university / faculty / department scopes, student-profile modal
- Courses: browse/filter list (pagination controls now actually render), course detail with full module → lesson → quiz tree, enrolled-courses list
- **Offline lesson/quiz completion (2026-09-29):** went offline mid-lesson, completed a lesson and passed a quiz, confirmed both queued in IndexedDB and showed the "Saved Offline" UI instead of blocking progress, then came back online and confirmed the queue synced to the real backend and drained. See `docs/KNOWN_ISSUES.md` #3.
- PWA build: `npm run build` produces a valid manifest referencing real icon files (previously missing) and a service worker precache list that includes them.
- `npm test` runs Vitest for real (zero test suites written yet, exits 0 as expected).

Not live-tested: roadmaps (fixtures only, see KNOWN_ISSUES #31), feed, onboarding submission (the form itself, not the completeness check), search, file upload flow, course enrollment/feed offline behavior (explicitly out of scope for the offline-queue work — see below).

**Course certificates (2026-11-11).** Students can open a Certificate of Completion from the course-completion celebration, the completed course page and Profile → Certificates (`/profile/certificates`, `/profile/certificates/:courseId`): a landscape certificate (PNG + A4 PDF) and a 9:16 story card (PNG), with an optional per-visit name correction, native image sharing where the browser supports it and download / copy-caption fallbacks. Generated in the browser; eligibility is the server's completion record. See ARCHITECTURE §17 and KNOWN_ISSUES #53–60 (pagination/wrapper assumptions and real-device sharing still unverified).

## Known-incomplete / stubbed areas

- **Offline support** now covers lesson/quiz completion writes (queued + synced, see above). Course enrollment and feed actions (like/comment/share) are **not** queued when offline — they still fail hard. The API response cache (`getCachedResponse`/`setCachedResponse`) is still unused; offline *reads* were out of scope for this pass.
- **Notes** (`services/notes.ts` + `JottingPad.tsx`) are now explicitly a frontend-only feature by design — confirmed with the owner that the backend has no notes endpoint. Fully local via IndexedDB; no backend calls.
- **Analytics** (`services/analytics.ts` + `types/analytics.ts`) is fully typed against the backend contract but no page consumes it. Confirmed with the owner this stays deferred — not a "for now" gap, just not being built in this pass. The backend docs themselves still mark several of its sub-metrics as hard-coded placeholders.
- **Dead code cluster removed** (`pages/Quiz.tsx` + its route, `services/quiz.ts` in full, `services/lessons.ts::completeLesson`, `hooks/useCompletion.ts`) — found while wiring offline support, all superseded by logic `CoursePlayer.tsx` implements inline, confirmed unreachable and removed with the owner's approval. See `docs/KNOWN_ISSUES.md` #17.
- **PWA icons**: fixed. `favicon.ico`/`icon-192.png`/`icon-512.png` are generated from `public/pwa_manifest.png` via `npm run icons:generate` (uses `sharp` + `png-to-ico`, added as devDependencies). Re-run that script if the source image changes.
- Two items explicitly deferred by the owner, not fixed this pass: the Workbox `NetworkFirst` API-caching rule (pattern doesn't match the real API host) and `public/offline.html` (still unreferenced/orphaned).

## Recent activity (from `git log`, most recent first)

```
8bf3f40 Update .gitignore
feecbd6 Avoid mixed-content by resolving API_URL at runtime
83e1dad Rename site to UniVybe and add favicon
1bb9069 Add SPA fallback rewrite to vercel.json
14a79b3 Add KaTeX formula rendering support
764ba3d Support API URL env and add Vercel proxy
e62a02d Improve typings and handle varied API responses
ba20e10 Add animations, logo and completion UI
b94b384 Add lesson locking and inspiration messages
4cd38b0 Improve course UI, progress tracking, and search
34642f4 Enhance course, lesson, and quiz rendering features
e7896bf Delete Student_Front_end_Docs directory
314dbd6 / c939a50 Initial commit(s)
```
Plus uncommitted work across two sessions: (2026-09-28) the backend-alignment pass and this onboarding audit; (2026-09-29, a separate session) guest browsing / `Landing.tsx` / new logo assets; (2026-09-29, this session) working through the audit's open items — offline write queueing, notes made fully local, PWA icons generated, `ProtectedRoute` onboarding fix + activation, dead-code removal (`submitOnboarding`, then the larger `Quiz.tsx`/`services/quiz.ts`/`completeLesson`/`useCompletion` cluster found along the way), `.env.example`, `PaginatedResponse<T>` fix (which also fixed real pagination/infinite-scroll bugs), and Vitest setup.

**2026-10-01 — Landing page rebuild.** `Landing.tsx` (the guest homepage at `/`) was rebuilt from `docs/designs/univybe_landing_page_implementation_design_guide.md`: hero with the full-colour wordmark, six alternating colour bands (Super Greatly titles, GSAP hover/scroll mascot scenes, reduced-motion safe), final CTA, own header/footer. New: `src/components/landing/*`, `useFeatureSectionAnimation`, `utils/gsapSetup.ts`, `scripts/optimize-assets.mjs` (`npm run assets:landing`; renamed 2026-10-01, see below), `@font-face` + `font-title`/`font-accent` tokens, a `landing-assets` PWA runtime cache, and `Landing.test.tsx`. Open items are `docs/KNOWN_ISSUES.md` #25, #27–#29 (notably: three CTAs go to sign-up because the pages don't exist). The Higgsfield-generated mascots + coin were added the same day (#26 resolved). Also the same day: the landing page's menu was generalized into `GuestHeader` and now shows on every guest page on desktop (Courses, Course detail, Feed, Login, Signup, Verify) — see `docs/DECISIONS.md`. See `docs/ARCHITECTURE.md` "Landing page" and `docs/DECISIONS.md`.

**2026-10-01 — Logo image optimization.** `TopNav` and `Auth/{Login,Signup,VerifyOtp}` now import small WebP logos from the new generated `src/assets/brand/` instead of the 1.4 MB / 260 KB source PNGs. `scripts/optimize-landing-assets.mjs` became `scripts/optimize-assets.mjs` with two sets (`landing`, `brand`); new commands `npm run assets:brand` and `npm run assets` (`assets:landing` unchanged). `vite.config.ts` precaches `assets/brand-*.webp`. Workbox precache 8,925.6 → 5,685.0 KiB. KNOWN_ISSUES #28 fixed; #30 (unreferenced `public/*.png` still precached) opened. See `docs/ARCHITECTURE.md` "Image pipeline" and `docs/DECISIONS.md`.

**2026-10-03 — Roadmaps, discovery upgrade, mascots.** Implemented the Round 6 backend (`docs/STUDENT_API_PAYLOADS.md` "Roadmaps") per `docs/designs/univybe_course_discovery_roadmaps_design_guide.md`: new public pages `/roadmaps` (grouped discovery: recommended / continue / completed / explore all, filters, mobile filter sheet) and `/roadmaps/:id` (dark winding-path journey, stage paging, per-stage brand colour, hover preview / tap sheet, completion badge); the Courses page got a cleaner header, a search/filter toolbar and a "Learning Roadmaps" preview; `CourseCard` and Course Details use deterministic branded fallback covers; Course Details link to their roadmaps; the lesson-complete modal celebrates a finished roadmap; Profile links roadmap badges. Contextual Vybe mascots now appear on sign in, sign up, verify and all four onboarding steps (two new poses generated with Higgsfield). Verified against fixture responses (no published roadmap exists on the dev backend yet); see `docs/KNOWN_ISSUES.md` #31–#38, `docs/ARCHITECTURE.md` §11–12 and `docs/DECISIONS.md`. Tests: 78 passing across 10 files (`npm test`); `type-check`, `lint` and `build` clean.

**2026-10-04 — Journey ambient assets generated (not wired in).** 5 small generic Vybe poses (`src/assets/journey/pose-*.webp`) and 3 seamless looping animated WebPs with alpha (`src/assets/animations/journey/vybe-{wave,cool,cheer}.webp` + posters), for the negative space around the roadmap journey's course nodes; new `journey` asset set (`npm run assets:journey`). See `docs/ARCHITECTURE.md` "Roadmap journey ambient assets", `docs/DECISIONS.md`, `docs/KNOWN_ISSUES.md` #39–40. The journey page itself is unchanged and will be refined next.

**2026-10-05 — Roadmap journey redesigned around the nodes.** The header is now one compact collapsible row (chevron, title, small tags; details behind the chevron; Explore button removed); the completion badge is one slim row, collapsed until the roadmap is finished; the 5 poses and 3 loops from 10-04 are placed beside the nodes only, evenly spaced and alternating, at most 2 per phone stage / 4 per desktop stage (so never more than 2 / 5 on screen). See `docs/ARCHITECTURE.md` §11 "Journey layout", `docs/DECISIONS.md` (2026-10-05), `docs/KNOWN_ISSUES.md` #39, #41–42. Tests: 92 passing across 11 files.

**2026-10-26 — Onboarding resume + WhatsApp institution support.** A verified student who closes the browser, refreshes, or goes to WhatsApp now returns to onboarding on the same step with the same answers (account-scoped, versioned, no passwords; restore previously didn't work at all). `/` sends a pending student back to onboarding; an expired pending session routes to email re-verification with the draft kept; institution lists get failure/Retry/empty/refresh states and revalidate on focus; each of university/faculty/department has an always-visible "Can't find your …?" that opens a pre-filled `wa.me` message for the student to review and send. Needs `VITE_SUPPORT_WHATSAPP_NUMBER` (none existed). See `docs/ARCHITECTURE.md` §16, `docs/DECISIONS.md` (2026-10-26), `docs/KNOWN_ISSUES.md` #47–52 (notably #47: lookups may be paginated, unverified). Tests: 157 passing across 18 files; `type-check`, `lint`, `build` clean; also driven in a real browser against a throwaway fake API.

## Open questions for the project owner

- Does `GET /student/courses/enrolled` honour `?page=N` and which paginator keys does it return, and is `GET .../progress` wrapped in `progress` (`docs/KNOWN_ISSUES.md` #53–54)? Certificates depend on both.
- Support WhatsApp number for `VITE_SUPPORT_WHATSAPP_NUMBER`, and whether the university/faculty/department lookup endpoints are paginated (`docs/KNOWN_ISSUES.md` #47, #49).

- The Workbox API-caching pattern and `public/offline.html` (`docs/KNOWN_ISSUES.md` #8–#9) — still open, deferred by choice, not forgotten.
