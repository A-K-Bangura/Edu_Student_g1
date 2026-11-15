# UniVybe — Feed, Opportunities & Gigs Implementation Design Guide

Date: 7 October 2026  
Audience: student-portal frontend coding agent  
Stack: existing React, TypeScript, Tailwind CSS v4; use the current router, API client, authentication, icons, and query/state conventions.

## 1. Product decision and scope

The **Feed** primary-navigation item becomes a shared destination with three separate tabs, in this exact order:

**Feed → Opportunities → Gigs**

On touch devices, swiping left switches Feed to Opportunities, then Opportunities to Gigs. Swiping right reverses that sequence. Users can always tap the labels. Each tab has its own main page, search, filters, data, pagination, and scroll position. Opportunities and gigs remain separate backend content systems; they are not feed posts.

Deliver the shared shell, opportunities discovery/details, gigs discovery/details and contact flow, My interests, student gig posting/management, applicants/ratings, and the small profile reputation addition. Preserve working feed posts, reactions, comments, search, and access behavior. Tutor/admin management interfaces are outside this student-portal guide.

Sources: attached `STUDENT_FRONTEND_API_CHANGES(2).md` Rounds 8–9; `STUDENT_API_PAYLOADS(2).md` §§80–92; `OPPORTUNITIES_API(1).md`; `GIGS_API.md`; current mobile Feed screenshot. API paths below use `/api/v1` as the base. Frontend routes are design recommendations, not backend routes.

## 2. Shared navigation and page shell

Keep the desktop and mobile primary navigation label/icon **Feed**. Keep Resources in its existing main-navigation position. All Feed, Opportunities, Gigs, and their detail/management child routes keep the Feed primary-nav item active. Do not add Opportunities and Gigs as extra bottom-nav items.

Place the three-tab row near the top of the content, below the compact page heading and above search/filters. On mobile it remains sticky below the application header. The existing screenshot's large filter card should become a compact search row plus a Filters control; preserve the existing Feed filter meanings.

The page heading/subtitle changes with the selected tab:

| Tab | Heading | Supporting text |
| --- | --- | --- |
| Feed | Feed | Stay motivated with tips, discussions, and announcements. |
| Opportunities | Opportunities | Discover scholarships, internships, programs, and more. |
| Gigs | Gigs | Find small jobs, put your skills to work, or post a gig. |

Use equally sized mobile tabs, readable labels, and an animated active underline. Keep all three visible at 320px. Selected labels use a darker accessible brand accent; inactive labels use neutral text. Recommended accents: Feed blue, Opportunities purple, Gigs teal with dark teal text. Accent changes are visual only; data and gating remain independent.

Suggested route map:

| Frontend route | Surface |
| --- | --- |
| `/feed` | Existing Feed main page |
| `/feed/opportunities` | Opportunities main page |
| `/feed/opportunities/:id` | Opportunity details |
| `/feed/gigs` | Gigs main page |
| `/feed/gigs/:id` | Public gig details |
| `/feed/gigs/interests` | My interests |
| `/feed/gigs/posted` | My posted gigs |
| `/feed/gigs/new` | Create a gig |
| `/feed/gigs/posted/:id` | Manage my gig |
| `/feed/gigs/posted/:id/edit` | Edit draft/rejected gig |
| `/feed/gigs/posted/:id/applicants` | Interested students |

Use numeric IDs or UUIDs, not invented slugs. Reserve static routes before dynamic routes as needed by the router. Direct links, reload, and browser Back must select the correct tab and restore the list. If existing public routes differ, preserve their links using aliases/redirects rather than breaking them.

Tapping the primary Feed nav item from another primary destination opens the last selected main tab for the current session; first visit opens Feed. The URL is authoritative when loading a direct link. Detail Back links return to the relevant tab/list state.

## 3. Swipe interaction specification

Swipe navigation applies to the **three main discovery pages**, not detail pages, forms, dialogs, or management pages.

- Use a mature pager/gesture implementation or the project's existing gesture utility. A swipe should move content horizontally with a short 180–240ms settlement transition. No page-wide horizontal overflow.
- Activate only after horizontal intent is established. Suggested initial threshold: approximately 12px movement with horizontal displacement clearly greater than vertical displacement. Commit at roughly 20% of panel width or a decisive horizontal flick; tune on real phones.
- Left moves one tab forward; right moves one tab backward. Do not wrap Gigs back to Feed. At either edge, stay on the same tab.
- Preserve ordinary vertical scrolling. Do not call preventDefault for every touch event or set `touch-action: none` on the whole page. Use vertical-scroll-compatible gesture handling.
- Ignore gesture starts on inputs, textareas, selects, editable text, sliders, embedded video, image carousels, horizontally scrolling chip lists, and open sheets/dialogs. Respect browser edge-back gestures by ignoring starts near screen edges.
- A card tap must navigate normally. Suppress a click only after a recognized drag, not every small movement.
- Tap/keyboard tab switching works everywhere, including desktop. Do not require mouse dragging to navigate.
- Preserve each tab's filters, loaded page, and vertical offset independently. A first visit starts at the top; returning restores position. Do not force the previous panel's height/scroll offset onto the next panel.
- Keep adjacent cached data available for smooth switching, but render only the active panel and limited transitional content. Do not continuously fetch all panels.
- Update the URL once a switch commits, never on every drag frame. Use route replacement for peer-tab switches to avoid excessive Back entries; push detail/form navigation. Browser Back must restore the prior destination correctly.
- Reduced motion uses instant or very short fades, with the same tap/swipe behavior.

Use accessible tablist/tab/tabpanel semantics, `aria-selected`, labeled panels, and roving keyboard focus with Left/Right, Home/End, and Enter/Space as appropriate. Inactive panels must not remain keyboard-focusable. Swipe is an additional interaction, never the only one.

### Feed gating boundary

Keep existing feed eligibility, remaining-time, and XP exchange semantics. The locked-feed overlay covers **only the Feed panel**, leaving the tabs reachable. Opportunities and Gigs browsing must remain public even when Feed is locked. Do not send feed-session start/exchange/end calls merely because the user enters the shared shell or switches to another tab. Preserve the current server-based feed session policy; do not invent a paused timer, reset, or refund on tab change. Recheck existing eligibility/session state when returning to Feed as required by the current implementation.

## 4. Visual system and responsive layout

Use the current portal typography. Light page background (`#F8FAFC`), white cards, dark headings (`#0F172A`), secondary text (`#475569`), subtle borders (`#E2E8F0`), 12–16px radii, and restrained shadows. Reuse UniVybe blue `#3A86FF`, purple `#8338EC`, teal `#00F5D4`, yellow `#FFBE0B`, and pink `#FF006E` as accents. Verify contrast; use dark text on teal/yellow and darken saturated button colors when needed.

Max content width 1200px; mobile padding 16px, desktop 24–32px. Body text 14–16px; headings 24–32px. Compact layout with 16–24px gaps. No large hero, looping video, or floating mascot scenes on these practical discovery pages.

Mobile: one-column cards, concise metadata, large tap targets, search plus Filters, filter bottom sheet. Desktop: search plus key filters, additional filters in a popover/drawer, 2–3 columns where card width remains comfortable. Provide normal pagination using server `meta` rather than unbounded loading. Start with 15 items per page; server maximum is 50.

## 5. Opportunities main page

Order: tab row → compact header/subtitle → search/filter toolbar → **Open / Past** segmented control → active chips/results count → cards → pagination.

Search placeholder: **Search scholarships, internships, programs…**. Use opportunity `search`; do not use global search. Default list is open opportunities, newest published first. Past is an explicit secondary view; never mix closed opportunities into the default list.

| Filter | API field | Behavior |
| --- | --- | --- |
| Opportunity type | `type` | Multi-select from vocabulary; selected types match any |
| Location | `location` | Free-text contains match |
| Tags | `tags[]` | All selected tags must match |
| Deadline range | `deadline_from`, `deadline_to` | Inclusive `YYYY-MM-DD` range |
| Deadline presence | `has_deadline` | Any / Has deadline / No deadline |
| Open/Past | `status` or closed endpoint | Open by default |

Fetch `GET /opportunities/types` for `data.opportunity_types`, `action_types`, and statuses. Do not hard-code the vocabulary. No academic/profile filters, personalized recommendations, price filter, or sort selector are supported. Show “Newest published first” if useful.

Cards: optional 16:9 cover, type pill, title (two lines), `short_description` (two or three lines), organization if available, location, and application deadline when present. Include **View details** as the principal card action. Keep the entire content link separate from any external action to avoid nested links.

Use cover URL; transform Cloudinary images only when source/public_id supports it. External covers use their URL as supplied. For null/broken covers, use a compact deterministic brand-colored abstract shape/icon strip; do not generate an image per opportunity. Sparse cards with only title/type/short description should still look complete.

For no deadline, say **No deadline listed**; do not promise permanent availability. Past cards show Closed and a reason label. Do not display “Applied,” “Saved,” view counts, or application counts.

## 6. Opportunity details and external actions

Fetch `GET /opportunities/{id|uuid}` → `data.opportunity`. Show title, type, organization, cover if present, short summary, full description, eligibility, requirements, location, opportunity start/end dates, application deadline, tags, and public contact information. Omit absent sections. Render plain text escaped, with line breaks preserved; never use raw HTML rendering.

Desktop: main column with a small action/summary sidebar. Mobile: one column with the primary action below the summary and optionally a safe-area-aware sticky footer. Do not cover the bottom navigation or last paragraph.

Use `primary_action.label` and `.url` directly for the primary external button. Render secondary `actions` excluding the primary one by ID / `is_primary`; do not repeat it. External links open in a new tab with `rel="noopener noreferrer"`. Include “Applications and registration happen on the provider's website.” No signup is required.

When `is_open === false`, show the closed reason and disable/hide application/register/submit/join actions. Non-application informational links such as Learn more or Check eligibility may remain as secondary links. A closed item must never present an enabled primary Apply action. If there are no actions, omit the action panel and show “No action link provided” where helpful; do not invent a URL.

Only the server decides open/closed. Start/end are plain calendar dates; the application deadline is an instant. Format calendar dates without timezone-induced day shifts; show deadline time and timezone when displaying its full detail. A display countdown never overrides `is_open`.

## 7. Gigs main page

Order: tab row → header/subtitle → student actions → search/filters → **Open / Closed** selector → cards → pagination.

Student actions: **Post a gig**, **My interests**, and **My posted gigs**. Mobile uses one visible Post a gig button and compact secondary links/menu. Guests can browse; Post a gig invites student signup/login with a return destination. Creator/moderator accounts do not get student-only controls; creator posting belongs to their existing portal.

Search placeholder: **Search gigs, skills, or locations**. Default newest published first. No personalization or academic filtering.

| Filter | API field |
| --- | --- |
| Categories | `category` slugs or `category_id` |
| Work mode | `work_mode`: Remote / Physical / Hybrid |
| Pricing | `pricing_type`: Fixed / Negotiable |
| Location | `location` |
| Skills and tags | `skills[]`, `tags[]`; each list requires all values |
| Deadline range/presence | `deadline_from`, `deadline_to`, `has_deadline` |
| Open/Closed | `status` or `/gigs/closed` |

Categories come from `/gigs/categories` → `data.categories`, in admin order; options come from `/gigs/options`. Use response labels and supported limits. Selected category/pricing/work-mode values match any within that filter, with different filters AND-combined. No price range filter, academic filters, sort options, or saved-gig control.

Gig cards: optional small cover, category, title, short description, prominent `price_label`, `work_mode_label`, location if present, deadline if present, creator name/avatar, student reputation where supplied, and **View gig**. Show limited capacity with API `spots_remaining` (“2 interest slots left”) and optionally `applicant_count`; explain these count expressions of interest, not confirmed hires. Open capacity shows “Open interest,” never a fabricated spots number. A student's already-recorded interest can show **Interested** from `viewer.has_expressed_interest`; it is not a hiring status.

Use neutral **No ratings yet** for null averages; creation users show role_label and no student rating. Do not label approval as verified skill, guaranteed payment, or endorsed employer. Price is a creator-provided label; do not assume negotiable with null amounts means free work.

## 8. Gig details and contact flow

Fetch `/gigs/{id|uuid}` → `data.gig` with student token when available. Detail adds full description, requirements, address, and `contact_action`. Layout mirrors opportunity details, with a price/work summary and contact action panel. Include expected start/completion dates separately from the application deadline, skills, tags, creator card, and capacity information.

A short note reads: **Discuss the work and payment directly with the creator. UniVybe records interest; conversations and payments happen outside the platform.** Do not create escrow, payment, proposal, CV, chat, contract, or verified-completion flows.

### Button state priority

| Viewer/state | Action |
| --- | --- |
| Guest, `contact_action.available` true | Sign in to express interest; preserve gig destination |
| Guest, unavailable | No longer accepting interest |
| Signed-in nonstudent | Explain only students can express interest |
| Student, `viewer.is_own_gig` true | Manage your gig link; no interest action |
| Student, `viewer.can_contact` true and not interested yet | Interested — contact creator |
| Student, `viewer.can_contact` true and already interested | Contact creator |
| Student, `viewer.can_contact` false | No longer accepting interest / appropriate account restriction |

**For signed-in students, `viewer.can_contact` is authoritative**, even if public `is_accepting_interest` is false. Existing applicants may be able to contact after capacity/deadline closure. The documents contain differing shorthand about manually closed gigs; do not assume all closed gigs can be contacted. Respect viewer flags and the interest endpoint's response, and report a backend discrepancy if observed.

### Contact methods and mutation

When WhatsApp is offered, make it the primary method; email is the secondary method if offered. Method selection happens **before** recording interest so cancelling a method sheet does not create an applicant. Explain “Continuing records your interest and opens WhatsApp/email.” Do not add a separate mandatory confirmation screen.

Each deliberate contact action calls `POST /student/gigs/{gig}/interest` with `{ "method": "whatsapp" }` or `{ "method": "email" }`. Disable duplicate actions while pending. On first success 201 / `newly_registered:true`, show “Interest recorded”; repeats return 200 and do not consume another spot. Read `data.gig` for refreshed counts/status and update or revalidate affected lists. Do not increment counts locally.

Immediately open the returned `data.contact.whatsapp.url` or `.email.url` **as supplied**, preserving the prefilled message. Do not construct links from account contact details or display contact fields on list/detail pages. Handle browser popup blocking through a gesture-created tab or explicit same-tab/app-handler fallback; keep portal and external opener isolated. A launcher failure after successful recording means interest was still registered; offer Contact again through a fresh endpoint call.

Do not persist or log contact responses/URLs, place them in shared query caches, or reuse them for later contact attempts. Refresh through the idempotent endpoint on each deliberate contact. Handle null methods. If a captured abbreviated response lacks contact/gig fields, do not fabricate them; show a recoverable launch error and verify the live contract.

On 409 `GIG_NOT_ACCEPTING_INTEREST`, no interest/contact is granted. Show the API reason (full, deadline passed, closed), refresh detail/list, and retain a readable closed detail. Race conditions are normal: a displayed slot does not reserve one. No client date/count comparison may grant eligibility.

## 9. My interests and student ratings

Use `GET /student/gigs/interests`, flat `data[]` + `meta`. Optional Worked With filter maps to `worked_with=true|false`; preserve an All option. List each gig, interest date, availability, Worked With status, rating received, rating given, and actions.

An unavailable gig may be only `{id,title,availability:"unavailable"}`. Show its remaining title and “No longer available”; avoid dead detail/contact links. A Contact again action requires current eligibility from gig detail before using the same interest mutation. My interests contains no contact details.

Worked With means the creator marked that they worked with the student; it does not verify delivery/payment. Do not replace it with Hired, Completed, Paid, or a platform verification badge.

When `can_rate_creator` is true, show **Rate creator** or **Edit your rating**. An accessible 1–5 radio/star selector plus optional review uses limits from gig options (currently 1000 characters). Send `PUT /student/gigs/{gig}/creator-rating` with `{rating,review?}`. 201 creates; 200 replaces. Do not support rating creation-user creators or applicants not marked Worked With. Refresh interests/reputation after saving. No withdraw-interest, remove-rating, or hide-review action is documented.

## 10. Post a gig — student form

Keep a single manageable form with grouped sections, optional advanced fields collapsed, and a sticky/visible action footer. Use `POST /student/posted-gigs`; edit uses `PUT /student/posted-gigs/{gig}`. Do not autosubmit drafts.

| Section | Inputs and request fields |
| --- | --- |
| Gig basics | Required `title` ≤200, `short_description` ≤500, active `category_id`; optional `description` ≤10000, `requirements` ≤5000 |
| Work and price | Required `work_mode`, `pricing_type`; fixed requires positive `price_amount`, max two decimals; negotiable may omit amounts or use `price_amount` and `price_max` |
| Location | `location`, `address` for physical/hybrid; hide/clear for remote |
| Contact | `contact_whatsapp`, `contact_email`; at least one; deliberate entry, no automatic account autofill |
| Timing and capacity | Optional `application_deadline`, expected start/completion dates; `capacity_type:open|limited`, positive `applicant_limit` only for limited |
| Optional extras | Skills, tags, cover image upload or external HTTPS URL |

Use options limits for skills/tags/applicant count. Fixed price has no maximum; negotiable range needs a minimum and cannot end below it. Completion date cannot precede start. Open capacity sends null/omits applicant limit appropriately. Deadline date input is labeled “End of this day, Sierra Leone time”; a bare date means end-of-day. Keep expected-work dates as `YYYY-MM-DD` values.

Contact helper: “Enter the contact details you want interested students to use for this gig.” Accept local Sierra Leone WhatsApp formats supported by the backend, and international numbers with country code. Display normalization from the response; do not guess the creator's number from their profile.

Optional cover uses existing Cloudinary `/upload/presign` with purpose thumbnail followed by `/upload/store-metadata`, then `{source:"cloudinary",public_id}`. External source sends `{source:"external",url}`. Use the attached upload contract for complete payloads; do not invent entity attachment types. Plain text throughout.

Footer actions: **Save draft** (`submit:false`), **Submit for approval** (`submit:true`), Cancel. Explain that every gig requires admin approval before appearing publicly. Do not display a student Publish now button. Validation errors appear beside matching inputs, including the combined `contact` error; preserve entered data after failure. Warn before leaving an unsaved form; disable shell swiping on this route.

## 11. My posted gigs, lifecycle, and applicants

Use `GET /student/posted-gigs` and `GET /student/posted-gigs/{gig}`. Show stored management status and public availability separately: a stored Published gig may be publicly Closed because its deadline/capacity ended. Status chips: Draft, Pending approval, Needs changes (Rejected), Published, Closed, Unpublished. Show `rejection_reason` prominently on rejected gigs, with Edit then Resubmit.

Drive actions from response `permissions`: `can_edit`, `can_delete`, `can_submit`, `can_manage_settings`, `can_close`, `can_reopen`, `can_view_applicants`, `can_rate_workers`. A missing/false permission must not expose an enabled mutation. Pending content is read-only; live content editing is unavailable to the student. Delete confirms only a permitted draft/rejected gig.

| Endpoint below `/student/posted-gigs` | Action |
| --- | --- |
| `POST /{gig}/submit` | Submit revised draft/rejected gig for review |
| `PUT /{gig}/settings` | Change only capacity/limit and application deadline |
| `POST /{gig}/close` | Close with optional note |
| `POST /{gig}/reopen` | Reopen with needed capacity/deadline changes and optional note |
| `DELETE /{gig}` | Delete permitted draft/rejected gig |
| `GET /{gig}/applicants` | Paginated interested students |
| `PUT /{gig}/applicants/{interest}/worked-with` | `{worked_with:true|false}` |
| `PUT /{gig}/applicants/{interest}/rating` | `{rating,review?}` |

Settings sheet shows current applicants and the server minimum: a limit cannot go below applicant_count. Reopening a full gig requires more capacity or open capacity; an expired deadline requires a new future deadline or null. A manually closed gig with other conditions satisfied can reopen without changes. Admin-closed gigs require admin reopening. Present all necessary fields together so a gig closed for multiple reasons can genuinely reopen in one request. Backend acceptance is authoritative.

Applicants: public student avatar/name, academic context, gig rating, interest date, Worked With toggle, and Rate/Edit rating when permitted. Use the **interest UUID** in applicant mutation routes, not the student UUID. Student UUID is used for profiles/reviews. No private student phone/email is supplied. Marking Worked With requires deliberate action with a short explanatory confirmation; do not mark it automatically on contact/close. Reversal can be refused once ratings exist (`GIG_HAS_RATINGS`). Keep its current state on failure. Only the creator marks/rates their own applicants.

No continuous polling is required. Re-fetch on view/focus and provide Refresh; approval and new applicants have no notification stream.

## 12. Reputation on Profile

Render the additive `gig_reputation` in existing own/public student profile surfaces: average rating or No ratings yet, rating_count, and recent written reviews. Explain ratings may relate to work or gig creation. For all reviews, any signed-in account can use `GET /gigs/students/{studentUuid}/reviews` with pagination. Guest gig cards can display the embedded student gig_rating but must not call the protected full-reviews endpoint.

Show creator type/role plainly. No creation-user rating form, endorsement badge, or hidden-review action. Preserve the Profile Leaderboard link and all existing profile sections.

## 13. Endpoint and response map

All paths below are relative to `/api/v1`. Public lists are flat `data[]` with sibling `meta`, not `data.items`.

| Endpoint | Access | Response/data purpose |
| --- | --- | --- |
| `GET /opportunities/types` | Public | `data.opportunity_types`, action vocabulary, statuses |
| `GET /opportunities` / `/opportunities/closed` | Public | Lean cards + meta; identical for guests/students |
| `GET /opportunities/{id|uuid}` | Public | `data.opportunity` including long text/public links |
| `GET /gigs/options` | Public | Pricing/work vocabularies, currency, rating/limits |
| `GET /gigs/categories` | Public | `data.categories` active choices |
| `GET /gigs` / `/gigs/closed` | Public, token adds viewer | Lean gig cards + meta |
| `GET /gigs/{id|uuid}` | Public, token adds viewer | `data.gig`, long text/contact-action flags |
| `POST /student/gigs/{gig}/interest` | Student | `data.interest`, `newly_registered`, contact, refreshed gig |
| `GET /student/gigs/interests` | Student | Interest items, availability, ratings, can_rate_creator + meta |
| `PUT /student/gigs/{gig}/creator-rating` | Student | `data.rating` |
| `GET/POST /student/posted-gigs` | Student | Own list / created draft or submitted gig |
| `GET/PUT/DELETE /student/posted-gigs/{gig}` | Owner student | Management details / edit / delete |
| `GET /gigs/students/{studentUuid}/reviews` | Any signed-in | Paginated written reviews |

Do not create student opportunity submission screens: students cannot post opportunities. The attached opportunity tutor/admin endpoints are for their portals, not this shared student tab.

## 14. Data, loading, errors, and accessibility

Maintain separate queries/state for all three tabs. Debounce discovery search around 300ms, cancel stale responses, reset page on filter change, and serialize applied filters in the URL. Vocabulary can cache longer; availability-sensitive list/detail data should use short freshness (suggested 30 seconds), revalidate on focus/return, and recheck around meaningful actions. No websocket, local deadline closure rule, or applicant-count eligibility rule.

Public opportunities can share guest/student caches. Gigs cache keys include account identity because viewer flags differ. Own gigs, interests, applicants, and reviews are account-scoped and cleared on logout. Never cache interest contact responses. Mutations invalidate affected list/detail/interests/management/reputation queries. Avoid full-detail requests for every card; lean payloads are intentional.

Skeletons match cards. Independent errors stay within their tab and do not block switching. Empty Open opportunities: “No open opportunities right now”; Empty Open gigs: “No open gigs right now,” with student Post a gig and a Closed-view link. Filtered empties offer Clear filters. Removed details show Back to the appropriate list.

| Error | Handling |
| --- | --- |
| 401 on protected action | Student authentication, preserve destination; no auto-interest after login |
| 403 wrong role / own gig / inactive account | Relevant explanation; no login redirect loop |
| 404 envelope or framework body | No longer available; key off HTTP status |
| 409 contact refusal | Explain reason and refresh availability; no contact launch |
| 409 lifecycle/rating conflict | Reload relevant data and preserve unsaved input where useful |
| 422 validation/deadline/capacity | Field errors; offer correct settings instead of pretending success |
| 403 policy denial / admin closure | Read-only/current permissions; no workaround action |
| 429 / network failure | Retry feedback and respect Retry-After when supplied; avoid automatic mutation storms |

Use visible focus, 44px targets, semantic headings, named form inputs, accessible radio ratings, focus-trapped sheets with Escape, and focus restoration. Format all plain text escaped. Optimize/lazy-load cover images with reserved dimensions; handle broken images. Mobile sticky tabs/footers must honor bottom-nav height and safe areas. Check 320px through desktop, long titles, sparse fields, closed states, and keyboard-only operation.

## 15. Acceptance checklist for implementation

- Feed, Opportunities, Gigs appear as three separate peer tabs under the existing Feed nav item.
- Left/right swipe moves one tab in the specified order; taps, keyboard, vertical scrolling, browser Back, input gestures, and edge-back remain functional.
- Independent filter/page/scroll state survives switching and returning from detail.
- Feed gating never covers or locks opportunity/gig tabs; existing feed session behavior remains correct.
- Public browsing works for guests; opportunity actions stay external and untracked; no academic/personalized filters are invented.
- Gigs contact records interest before opening supplied links; repeated contact is idempotent and private contact data is not cached.
- Eligibility comes from viewer/server flags; capacity/deadline races produce useful recoverable states.
- Student posting, approval feedback, permissions, settings, close/reopen, applicants, Worked With, and reciprocal ratings follow documented payloads.
- Public status and management status are not confused; manually closed contact eligibility is verified through viewer/API responses.
- Profile reputation and review pagination work without implying platform-verified work or payment.
- Empty/loading/error/sparse-image states, reduced motion, focus behavior, and mobile safe areas are verified.
- Use mocks or test accounts for mutation validation. Do not submit live gigs, register live interest, publish external content, or change real ratings merely to test the UI.

## 16. Handoff instruction

Inspect existing feed routing/components, query conventions, and mobile navigation first. Implement this guide incrementally within the current architecture. Use full captured payloads in `STUDENT_API_PAYLOADS(2).md` to validate abbreviated examples in the standalone docs. Preserve current features and record concrete backend-contract conflicts instead of fabricating fields, endpoints, or eligibility rules. Finish with appropriate build/type checks and meaningful interaction verification for swiping, contact races, and permission-driven management.
