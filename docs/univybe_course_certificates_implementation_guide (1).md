# UniVybe Course Certificates — Frontend Implementation Guide

Date: 9 October 2026  
Audience: student-portal coding agent  
Stack: existing React, TypeScript, Tailwind CSS v4 and current router/API/query conventions.

## 1. Feature and agreed scope

Celebrate completion of **both free and paid courses** with a frontend-generated Certificate of Completion. Students can preview, download, and share it. Offer two formats: a restrained landscape certificate and a colorful 9:16 story card. Use the student's profile name by default, with an optional display-name correction that does not update their account.

Entry points: course-completion celebration, completed-course page, and a **Certificates** section in Profile. Generate artifacts locally in the browser from existing student/course progress data and bundled brand assets. No new API, certificate database, server rendering, uploads, or public certificate hosting is required.

These artifacts celebrate learning. They are not accredited qualifications or independently verifiable records. Keep this expectation in the copy rather than adding a disruptive warning flow. Do not invent signatures, accreditation seals, certificate numbers, verification QR codes, university endorsements, or public verification links.

V1 has one consistent design for each format. No template gallery, paid certificate upgrade, grade claims, roadmap certificate, or certificate editor beyond the name correction.

## 2. Confirmed API contract

Source: attached `STUDENT_API_PAYLOADS(2).md`, §§8, 13, 15, 17. Existing APIs remain the authority for completion; entirely frontend-generated means the artifact is generated locally, not that completion is calculated locally.

| Endpoint | Use | Important documented fields |
| --- | --- | --- |
| `GET /api/v1/student/profile` | Certificate name | `data.student.full_name`, `firstname`, `lastname`, account `id` |
| `GET /api/v1/student/courses/enrolled` | Profile certificate collection | **Nested paginator** at `data`, records at `data.data[]`; each progress record has nested `course`, `is_completed`, `completed_at` |
| `GET /api/v1/student/courses/{course}/progress` | Verify one course before certificate preview/export | CourseProgressResource including nested `course`, `is_completed`, `completed_at`; confirm the live response wrapper through the existing adapter because §15 abbreviates it |
| `POST /api/v1/student/courses/{course}/progress` | Existing learning flow only | `data.progress.completed_at`; the mutation example does not promise `is_completed` or nested course |

The enrolled list is **not** the flat `data[] + meta` shape used by gigs/resources. Reuse/adapt the existing enrolled-course decoder rather than assuming all APIs paginate identically. Follow returned pagination information/links, or documented current-page/total/per-page values. The file does not document a completed-only query parameter: do not invent `completed=true`, `status=completed`, or a certificate endpoint.

`is_completed` is serialized from `completed_at`. Eligibility uses the authenticated student's server progress, not `progress_percent === 100`, XP, coins, lessons checked on the client, a completion URL parameter, or local storage. Free courses qualify without any coins award. Paid courses qualify on the same completion condition, without a second certificate purchase.

After the existing final progress save succeeds, revalidate the canonical progress GET if the cached response lacks the full resource fields. Display a preparing/verifying state until that completes. Do not POST progress merely to unlock/generate a certificate. If the course's progress is incomplete, do not offer export. If fields disagree, refetch once and report the mismatch; do not silently mint from a locally calculated percentage.

The current APIs expose **current enrolled-course progress**, not a permanent certificate archive. If a course is removed, access becomes unavailable, or a student unenrolls/resets completion, future regeneration may no longer be possible. Previously downloaded files remain on the student's device. Do not promise permanent issuance/history beyond existing backend data. If canonical completion is true but a legacy completion date is absent, omit the date; never use today or download time as a replacement.

## 3. Data model and naming

Build one normalized input for both renderers:

```ts
type CertificateData = {
  studentId: string;             // private context; never printed/exported
  courseId: string;              // private lookup context
  courseTitle: string;
  profileName: string;
  displayName: string;
  completedAt: string | null;    // API timestamp, unchanged
  completionDateLabel: string | null;
  templateVersion: 'v1';
};
type CertificateFormat = 'landscape' | 'story';
```

Name priority: trimmed nonempty `full_name`, then joined nonempty firstname/lastname. If both are absent, ask for a display name before generating. Course title comes from nested `course.title`; never accept an unverified route/query title as the source of truth.

The optional **Name on certificate** input defaults to profileName. Helper: “This changes the name on this certificate only.” Include Reset to profile name. Trim whitespace, preserve Unicode/diacritics, reject blank names and line-break/control-character abuse, and allow up to 120 characters as a frontend layout limit. Avoid restrictive ASCII or first/last-name validation.

Use the correction for the current course preview/session only in V1. Returning later defaults to the profile name; explain this briefly if needed. Do not update `/student/profile` or persist this as proof of another person's completion. Changing the name invalidates prepared image/PDF/share blobs.

Format completion date using `completed_at` consistently in `Africa/Freetown` with an explicit date label, for example “Completed 9 October 2026.” Browser locale may affect language, but reopening or using another device timezone must not shift the certificate's completion day. Both formats show the same date and name. No student phone/email/ID, birthday, university affiliation, grades, XP, or coin balances are exported.

## 4. Entry points and routes

### Completion celebration

Add **View certificate** as an action after verified course completion. Preserve existing XP/coins/roadmap celebrations and Continue/Back behavior. A missing coins_awarded key must not hide the certificate. Offer the action without automatically downloading, sharing, or opening a new tab. If completion verification fails, retain the celebration's existing navigation and provide Retry for certificate preparation.

### Completed-course page

Show View certificate in the completed-course summary/actions. Make this visible on mobile without adding another primary bottom-nav item. The action opens the preview after canonical completion validation.

### Profile

Add a **Certificates** section/action beside existing learning achievements. Preserve Leaderboard, gig reputation, and existing Profile functions. A compact Profile preview can show up to three available certificates and **View all**; do not label a count as a total until all enrolled pages have been inspected.

Proposed frontend routes: `/profile/certificates` for the collection and `/profile/certificates/:courseId` for the preview. Reuse existing app paths if appropriate. These are protected student routes; direct navigation requires authentication and server progress verification. Return to the previous course/Profile destination with list state preserved.

### Collection pagination

Load existing enrolled progress pages incrementally and filter completed records locally. Deduplicate by course identity. A page containing no completed records does not imply the collection is empty. Offer **Load more courses** while source pages remain, and show “Checking more courses…” during loading. Announce no certificates only after the source list is exhausted. Avoid fetching every enrollment eagerly on each Profile visit.

For a compact Profile preview, stop once enough completed records are found, retaining continuation metadata. The full collection allows the user to continue scanning older pages. Do not sort a partial collection as if it represented all completions. Show “Recent completions” only after all relevant records are gathered/sorted, or use the neutral heading **Your certificates**.

Tile: small branded certificate icon/preview, full course title, completion date if supplied, and View certificate. One column mobile, two or three columns desktop. Empty state: “Your certificates will appear here when you complete a course” with Browse courses. Network failures get Retry, not an empty-state claim.

## 5. Preview experience

Use a dedicated page with an accessible Back action. Title: **Your certificate**. Supporting line: “Celebrate what you've learned.” A segmented control selects **Certificate / Story card**; default landscape. Include the optional name input, preview, and export actions.

Desktop: centered preview within a pale neutral canvas, with compact controls beside/below it. Mobile: stacked controls, aspect-ratio-preserving preview, full-width primary action and compact secondary actions. Scale the artwork visually to fit; do not reflow its internal layout at mobile widths. Export always uses the canonical composition, never a screenshot of the surrounding UI.

Actions: **Download image**, **Download PDF**, **Share**. PDF is offered for landscape; story card offers PNG and Share only in V1. State clearly which selected format will export. If native file sharing is unavailable, Share opens fallback instructions and Download image; it must not pretend a caption/link is the certificate image.

Use 44px tap targets, visible focus, semantic segment controls, live status for Preparing/Ready/Error, and accessible textual certificate content beside an image preview. If the preview is a canvas/image, its alternative text includes the course, student name, and date. Avoid tiny illegible controls. Export controls/safe-area footer must not cover mobile bottom navigation.

## 6. Landscape design

Canonical design canvas: **2400 × 1697px**, approximately A4 landscape. PDF page: **297 × 210mm**, single page. White/off-white background with dark navy text and a restrained blue/purple accent; small touches of yellow/teal/pink unify it with the UniVybe palette.

Composition, top to bottom:

1. Centered or top-left UniVybe wordmark, with generous whitespace.
2. Uppercase small label **CERTIFICATE OF COMPLETION**.
3. Introductory line **This celebrates**.
4. Student display name as the visual centerpiece.
5. **for completing** followed by the full course title.
6. Completion date when available.
7. Footer **A celebration of learning on UniVybe** and a small celebratory Vybe illustration or brand mark.

Use a thin frame or light abstract corner shapes instead of heavy gradients or stock gold seals. Keep decorative elements outside the text area. Suggested safe inset: 140px. Suggested type sizes at design resolution: wordmark ~300–400px wide, heading 55–70px, name 90–120px, course title 60–80px, body 35–45px. Final sizes must respond to measured text fit rather than character count alone.

Name may wrap to two lines. Course title may wrap to three or more lines when necessary; reduce spacing/font within readable bounds. Never ellipsize the student's name or course title on an export. For extreme titles, expand the allotted text zone and reduce decoration before reducing type below readable size. Test Unicode, long words, and real long course titles. No fabricated educator signature or institutional seal.

## 7. Story-card design

Canonical export: **1080 × 1920px PNG**, opaque background. Colorful UniVybe brand composition with dark readable text or high-contrast text on dark color blocks. One static celebratory Vybe asset, abstract shapes/confetti, and large phone-readable typography.

Content: wordmark → **I completed a course!** → course title → student display name → completion date if present → **A new vibe for learning** or the existing approved brand slogan. Keep the course and name readable; mascot and decorations support the content.

Reserve roughly 180px top/bottom and 80px side margins for important content as a design allowance for social-app overlays; it is not a guarantee for every app. No buttons or controls appear in the exported artwork. No exported animation/video is needed. Do not display a coin/cash reward unless independently scoped later; certificates apply equally to free and paid courses.

Use existing approved mascot/wordmark assets first. If a suitable mascot is missing, implement a tasteful brand-shape fallback so export works. Asset creation is a separate task; do not invent a new mascot identity or block the feature on generation.

## 8. Browser rendering and export architecture

Use a shared normalized data object and one deterministic renderer per format. Keep rendering/export utilities separate from page state. Reuse installed export libraries where suitable; if adding a package, verify its current official documentation and project compatibility before selecting it. No external rendering service.

Prefer a controlled canvas composition with explicit text measurement, bundled fonts, paths/shapes, and decoded local images. A fixed-layout DOM-to-image approach is acceptable if it produces the same verified output across supported browsers. Do not capture a responsive preview element at its mobile display size. Both methods must use fixed design coordinates and full-resolution output.

Wait for required fonts (`document.fonts.ready` where applicable) and image decoding before generating. Bundle approved brand assets/fonts under the app's origin. Avoid arbitrary remote course thumbnails or profile avatars in certificate exports; they add no required information and may taint a canvas. Do not solve image/CORS problems through a new backend proxy. Missing decorative assets fall back gracefully; missing required data blocks generation.

Generate PNG as a Blob, not a massive base64 string stored in React state. Export with an opaque white/brand background. Landscape PDF may embed the high-resolution landscape image on one A4 landscape page; note this means PDF text is rasterized, not searchable. That is sufficient for V1. Keep ratio and placement correct with no unexpected second page or clipped border.

Create only the selected format initially. Generate PDF on demand. Cache a bounded number of prepared artifacts in memory keyed by account/course/name/completion timestamp/format/template version. Invalidate when any input changes. Do not keep all enrolled-course images in memory, persist blobs in local storage, or regenerate on every render. Lazy-load the export module so unrelated portal pages stay lightweight.

Use sanitized filenames such as `UniVybe_Intro-to-Programming_Certificate.png`, `.pdf`, or `_Story.png`. Course-derived filenames need length limits and filesystem-safe characters; avoid putting private student IDs in them. Release/revoke Blob URLs after consumers are finished or the page unmounts, rather than immediately before navigation/share completes. Clear artifacts on logout/account change.

No certificate creation upload, database write, new completion request, or storage bucket access occurs. Regeneration can use current data/template, so identical appearance forever is not promised.

## 9. Downloading and sharing

### Downloads

Create the artifact, then offer an explicit download/open action. Some mobile browsers open images/PDFs instead of writing directly to a Photos/Gallery app; provide a short Save image/use the device share controls instruction. Do not label a browser handoff “Saved to gallery” when the app cannot confirm that.

### Native file sharing

Use feature detection rather than a browser-name list. Check `navigator.share` and `navigator.canShare({files:[file]})` for the actual PNG File. Run on HTTPS; embedding permissions may affect availability. Share targets are chosen by the browser/OS/user. The web page cannot select WhatsApp Status or guarantee a particular destination.

Prepare the PNG **before** the final Share button click. Calling navigator.share needs a fresh user gesture; waiting for a long rendering job inside the same click may lose activation. While preparing, show Preparing image. When ready, the user taps Share to invoke the native sheet synchronously with the prepared File. If needed after a first request, show a clear second **Share image** button rather than an endless spinner.

Default payload is the PNG file. An optional caption can be offered separately via **Copy caption**: “I completed [course title] on UniVybe! A new vibe for learning.” Do not assume every app preserves a caption alongside an image. Do not share protected certificate routes, account identifiers, Blob URLs, or fake public certificate links.

If canShare/files support is absent, show **Download the image, then upload it to your status or story**. Provide Download image and Copy caption. Do not substitute a WhatsApp text link for sharing the actual image, force a destination, or announce direct posting.

Handle user cancellation quietly (`AbortError`); no error toast or automatic download. Other failures offer Retry/Download image. Do not report “Posted to WhatsApp” or “Published”; successful handoff does not confirm social publication. User completes posting in their chosen app.

Technical reference: [W3C Web Share API](https://www.w3.org/TR/web-share/) — feature checks, files, secure contexts, user activation, and user-agent-provided destinations. Verify current library-specific instructions against official sources during coding.

## 10. States, privacy, and recovery

| State | Behavior |
| --- | --- |
| Verifying completion | Skeleton/status; export disabled until resolved |
| Incomplete course | Explain certificates become available after completion; return to course |
| Eligible, fonts/assets loading | Preparing preview; no partial artifact download |
| Name/title input changed | Invalidate old exports; prepare current version |
| PNG/PDF render fails | Retry; keep inputs and completed-course data |
| Optional mascot asset fails | Render approved brand-shape fallback |
| Profile name missing | Require display name before export |
| Resource/API unavailable | Retry/back; no fabricated completion |
| Logout/account switched | Clear previous student's previews and files immediately |

Do not render raw HTML from a course title/name. Export only the required public-facing name/title/date/brand information. Do not add telemetry that records image contents or corrected student names. Existing completion caching may improve responsiveness, but an unverified local record or route flag must not grant new eligibility. Preserve working offline behavior without promising newly verified certificates offline.

## 11. Suggested component boundaries

- `CertificatesPage`: incremental completed-course collection.
- `CertificatePreviewPage`: canonical data and eligibility, format selection, name correction, actions.
- `CertificatePreview`: fitted visual preview plus accessible text.
- `CertificateActions`: render readiness, download, native share/fallback.
- `normalizeCertificateData`: profile/progress adapters and date formatting.
- `renderLandscapeCertificate` / `renderStoryCard`: deterministic art/rendering.
- `exportCertificatePdf`: A4 landscape PDF wrapper.
- `useCertificateArtifacts`: bounded account-scoped artifact preparation/invalidation.

These are suggested boundaries; fit the existing codebase rather than duplicating shared primitives. Preview and export should derive from the same rendering rules so students do not download a different name, layout, or date from what they approved.

## 12. Acceptance criteria and meaningful validation

- Free and paid courses qualify only after server-recorded completion; progress percentage alone does not qualify.
- Completion screen, completed-course page, Profile collection, and protected direct links work.
- An older completion on a later enrolled page is discoverable; empty intermediate pages do not falsely end the collection.
- Profile name is used correctly; display correction affects only current certificate/story, not account data.
- Completion date is the recorded date in a consistent timezone; missing date is omitted.
- Both formats use the same verified name/course/date and contain no private IDs or fabricated verification claims.
- PNG sizes are 2400×1697 and 1080×1920; PDF is one A4 landscape page with no clipped content.
- Long names/titles, Unicode, font load failure, absent decoration, and 320px preview layout are checked.
- Native image-file sharing is capability-tested; cancellation, unavailable sharing, user-activation loss, and fallback download are handled.
- Student can post the downloaded story image manually to status/social apps; the UI does not promise automated posting.
- Prepared blobs are refreshed after edits, cleared on account change, and do not accumulate unbounded memory.
- Generate/export sample artifacts with fixtures and visually inspect them at full size; test actual mobile download/share handoff where available. Do not assert social publishing succeeded from a share API return.
- Run relevant build/type checks and meaningful tests for normalization, completion gating, pagination, date consistency, and artifact invalidation. Use fixtures/test accounts; do not mutate real course completion merely to test certificates.

## 13. Coding-agent handoff

Inspect existing progress parsing, Profile, completed-course routes, celebration UI, and brand assets first. Implement the feature entirely in the student frontend using the attached API contract. Confirm the abbreviated single-course progress wrapper from the actual client/code before adding an adapter. Do not change the backend, payment eligibility, rewards, completion rules, or profile identity. Record a genuine API mismatch rather than adding an invented certificate endpoint. Finish with working downloadable sample exports, responsive/accessibility checks, and a short report of browser-sharing limitations observed during testing.
