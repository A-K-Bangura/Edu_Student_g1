# OPPORTUNITIES API — Scholarships, Internships, Jobs, Competitions … (Opportunities V1)

_For the public/student, tutor and admin frontends. 2026-10-02. The same endpoints, with payloads captured from the running API, are also in `STUDENT_API_PAYLOADS.md` → **Opportunities** (public side), `CREATION_USER_API_PAYLOADS.md` → **Opportunities (Create & Manage)** / **Opportunity Moderation & Lifecycle** (tutor/admin side) and `STUDENT_FRONTEND_API_CHANGES.md` → Round 8. Base URL `/api/v1`. All responses use the standard envelope `{ success, message, data, … }`; errors are `{ success:false, error:{ code, message, details? } }`; lists are a flat `data[]` with a sibling `meta` (`current_page,last_page,per_page,total,from,to`). Auth is the usual Bearer token where one is needed._

## The model in one minute

- An **opportunity** is something a student can **act on** (apply, register, join, learn more). It is **not** a Feed post and has its own approval workflow.
- **Public.** Browsing, searching, filtering, opening one and following its links need **no sign-in**; guests and students get **identical** responses. Only **published** opportunities are ever returned — draft, pending, rejected and unpublished ones simply don't exist as far as the public endpoints are concerned (404).
- **UniVybe does not process applications.** An opportunity carries **external action links** (Apply → a Google Form, Register → an event page, Learn More → the provider's site …). Exactly **one is primary**, any number are secondary (max 10). Nothing is tracked: no views, clicks, applications, bookmarks.
- **Active vs closed is decided by the server** (never compare dates on the client). An opportunity is **open** while it is published and its optional `application_deadline` has not passed. With **no deadline it stays open until an admin closes it**. After the deadline passes (or an admin closes it) it moves to the **closed / past** list automatically and stays viewable. The `status` you get is `open` or `closed`, with `closed_reason` = `deadline_passed` | `manually_closed`.
- **Who creates:** admin, educator, tutor, contributor (students can't). A non-admin's opportunity goes **draft → submit → pending approval → an admin approves (live) or rejects with feedback → the creator edits and resubmits**. An admin's own opportunity goes live when submitted. Once live, only admins can change it.
- **No notifications:** a creator sees the state and rejection feedback by reading their own list / opportunity.
- **Not here (V1):** university/faculty/department/semester filters or personalisation, saved/bookmarked opportunities, application tracking, in-app applications, Feed sharing.

## Public

### `GET /opportunities/types` — vocabularies
```json
{ "data": {
  "opportunity_types": [{"value":"scholarship","label":"Scholarship"}, "internship","job","graduate_program","competition","hackathon","conference_event","fellowship","grant","training","volunteer","student_program","call_for_applications","other"],
  "action_types": [{"value":"apply","label":"Apply"}, "register","learn_more","check_eligibility","submit_application","join","other"],
  "cover_image_sources": [{"value":"cloudinary","label":"UniVybe Upload (Cloudinary)"},{"value":"external","label":"Image URL"}],
  "statuses": [{"value":"open","label":"Open"},{"value":"closed","label":"Closed"}],
  "max_actions": 10, "max_tags": 15 } }
```
Types are a list the backend can extend; build filters from this response rather than hard-coding.

### `GET /opportunities` — active (open) opportunities
Newest **published** first (a stable order: the publication time never changes). Query (all optional, AND-combined): `search` (title, short + full description, organization, tags) · `type` (one, `type=job,internship` or `type[]=job&type[]=internship` — any of them) · `location` (contains) · `tags=a,b` or `tags[]=a&tags[]=b` (**all** must match) · `deadline_from`, `deadline_to` (`YYYY-MM-DD`, whole days, inclusive) · `has_deadline` (`1|0|true|false`) · `status` = `open` (default) | `closed` · `page`, `per_page` (default 15, max 50). Anything else (e.g. `university_id`) is ignored.

Item (lean — no long text; use the detail for that):
```json
{ "id": 7, "uuid": "…", "title": "Chevening Scholarship", "short_description": "A fully funded one-year master's in the UK.",
  "opportunity_type": "scholarship", "opportunity_type_label": "Scholarship",
  "organization_name": "British Council",
  "cover_image": { "source": "cloudinary", "url": "https://res.cloudinary.com/…/cover.jpg", "public_id": "edulift/thumbnails/…" },   // or null
  "location": "Freetown", "start_date": "2027-01-10", "end_date": "2027-06-30",
  "application_deadline": "2026-12-31T23:59:59+00:00",                // or null (open until an admin closes it)
  "status": "open", "is_open": true, "closed_reason": null,
  "published_at": "2026-10-02T09:30:00+00:00",
  "tags": ["stem","women"],
  "primary_action": { "id": 21, "type": "apply", "label": "Apply Now", "url": "https://forms.gle/…", "is_primary": true },   // or null
  "actions": [ { …primary… }, { "id": 22, "type": "learn_more", "label": "Learn More", "url": "https://…", "is_primary": false } ],
  "updated_at": "…" }
```
- `start_date`/`end_date` are the thing's own **calendar dates** (`YYYY-MM-DD`); `application_deadline` is an **instant** (ISO 8601). They are different concepts — only the deadline closes an opportunity.
- `cover_image.source` tells you how to render it: `cloudinary` → you may build Cloudinary transformation URLs from `public_id`; `external` → use `url` as is (`public_id` is `null`).
- Following an action = just open `url` (new tab). The backend records nothing.

### `GET /opportunities/closed` — past opportunities
Same filters, same shape, for opportunities whose **deadline passed** or that **an admin closed** (`?status=closed` on the list is the same query). Closed ones never appear in the default list.

### `GET /opportunities/{id|uuid}` — detail
`{ opportunity: {…item…, "description": "…", "eligibility": "…", "requirements": "…", "contact_information": "…"} }` — open **or** closed ones. `404 NOT_FOUND` if it isn't public (pending, rejected, unpublished …); a bare framework `404` if the id doesn't exist or it was deleted (see "Two shapes that are not in the envelope").
`contact_information`, the organization and every link are public — don't expect internal data here (no creator, no moderation info).

## Creators — admin, educator, tutor, contributor
Guard: Bearer token of an **approved** creation user with one of those roles (students/moderators get `403`).

### `POST /tutor/opportunities` — create
**Required:** `title` (≤200), `short_description` (≤500), `opportunity_type` (a value from `/opportunities/types`). **Everything else is optional** — an opportunity can be just those three plus one "Learn more" link.
```json
{ "title": "Chevening Scholarship", "short_description": "…", "opportunity_type": "scholarship",
  "description": "…", "organization_name": "British Council", "eligibility": "…", "requirements": "…", "contact_information": "…",
  "location": "Freetown", "start_date": "2027-01-10", "end_date": "2027-06-30",
  "application_deadline": "2026-12-31",                    // see below
  "tags": ["STEM","Women"],                                // trimmed + lower-cased, max 15 × 40 chars
  "actions": [ { "type": "apply", "label": "Apply on Google Forms", "url": "https://forms.gle/…", "is_primary": true },
               { "type": "learn_more", "url": "https://example.org/about" } ],
  "cover_image": { "source": "external", "url": "https://images.example.org/banner.jpg" },
  "submit": false }
```
- It is created as a **`draft`** (private). `"submit": true` also sends it for approval (an admin's goes live at once). **You cannot send `status`, `created_by`, approval fields or `published_at`** — they are ignored.
- **`application_deadline`:** `"2026-12-31"` (a bare date) means **the end of that day** (23:59:59, Sierra Leone time); `"2026-12-31T17:00:00Z"` / `"…+01:00"` is that exact instant; a date-time without an offset is read in Sierra Leone time. Must be in the future when set or changed. `null` = no deadline.
- **`actions`:** each needs a `url` (`http`/`https`, a real host, no `user@` part, no spaces) and a `label` and/or a `type` (a type alone gets its standard label). Mark at most one `is_primary`; if none is marked the first becomes primary; two is a `422`. **Sending `actions` replaces the whole list**; leaving the key out keeps it.
- **`cover_image`** (optional): `{ "source":"cloudinary", "public_id":"…" }` — must be an image **you** uploaded with `POST /upload/presign` using **`purpose: "thumbnail"`** and registered with `POST /upload/store-metadata` (**without** `entity_type`/`entity_id` — an opportunity isn't an attachable record type; the URL is taken from that stored record, not from you) — **or** `{ "source":"external", "url":"https://…" }` (https only). `null` removes it; leaving the key out keeps it.
- `end_date` must not be before `start_date`.
Response `201` → `{ opportunity: {…management shape…} }`.

### Management shape
The public detail **plus**: `status` (the **stored** lifecycle value — `draft | pending_approval | rejected | published | closed | unpublished`; use `is_open`/`closed_reason` for "is it live"), `rejection_reason` (the feedback, while rejected), `submitted_at`, `approved_at`, `approved_by`, `closed_at`, `closed_by`, `created_by`, `creator {id,name}`, `deleted_at`, `created_at`, and
```json
"permissions": { "can_edit": true, "can_delete": true, "can_submit": true }
```
Drive the buttons from `permissions` (they are the rules the endpoints enforce).

### Other creator endpoints
| | |
|---|---|
| `GET /tutor/opportunities` | **Your own** (filters: `status`, `search`, `type`, `location`, `tags`, deadline filters, `page`, `per_page`), newest first. This is where creators see `pending_approval` / `rejected` + `rejection_reason`. |
| `GET /tutor/opportunities/{id}` | One of yours (an admin can open any). |
| `PUT /tutor/opportunities/{id}` | Edit — **send only what changes** (same fields as create; `actions`/`tags` replace, `cover_image:null` removes). **Editing never changes the status**: a rejected opportunity stays `rejected` (feedback still visible) until submitted again. `"submit": true` saves and submits in one request. |
| `POST /tutor/opportunities/{id}/submit` | Send a `draft` — or a `rejected` one you have revised — for approval → `pending_approval` (never straight to public; an admin's own goes live). Creator only. |
| `DELETE /tutor/opportunities/{id}` | Delete (soft). |

**Who can edit/delete what:** a creator can change or delete **their own only while it is a `draft` or `rejected`** — not while it is `pending_approval`, not once published. An admin can edit **any** opportunity in **any** state (content, type, dates, links, cover, metadata) with the same endpoints; an admin's edit never changes the owner or the status.

## Admin — review and lifecycle
Guard: `role:admin`. All of these are `PUT` and return `{ opportunity }`; a transition that doesn't fit the current state is `409 OPPORTUNITY_INVALID_STATE`.

| Endpoint | From → to | Body |
|---|---|---|
| `GET /admin/opportunities` | every status, incl. deleted | filters as public + `status` (stored value), `created_by`, `trashed=with\|only`; **pending submissions first**, then newest |
| `GET /admin/opportunities/{id\|uuid}` | — | also resolves deleted ones; adds `events` (the audit trail: who/what/when + metadata) |
| `PUT …/{id}/approve` | `pending_approval` or `rejected` → `published` | `comment?` |
| `PUT …/{id}/reject` | `pending_approval` → `rejected` | **`reason` (required)** — what the creator reads |
| `PUT …/{id}/publish` | `draft` or `unpublished` → `published` | — |
| `PUT …/{id}/unpublish` | `published` or `closed` → `unpublished` (removed from public discovery, reversible) | `note?` |
| `PUT …/{id}/close` | `published` → `closed` (stays public in the past list; deadline or not) | `note?` |
| `PUT …/{id}/reopen` | `closed`, or `published` whose deadline passed → `published` (open) | `application_deadline?` — **required if the stored deadline has passed**: a new future date/instant, or `null` to remove it; otherwise `422 OPPORTUNITY_DEADLINE_PASSED`. `note?` (kept in the audit trail) |
| `DELETE …/{id}` | any → soft-deleted | — |

Editing others' opportunities (dates, type, links, cover, anything) is `PUT /tutor/opportunities/{id}` (admins are allowed on any).

## Error codes
| Code | HTTP | Meaning |
|---|---|---|
| `OPPORTUNITY_INVALID_STATE` | 409 | The transition doesn't fit the current status (approve twice, close a draft, submit a published one …) — `details.status` is the current one |
| `OPPORTUNITY_NOT_EDITABLE` | 409 | A creator's edit/delete raced with a submission/publication; reload |
| `OPPORTUNITY_DEADLINE_PASSED` | 422 | Submitting/reopening with a deadline that has passed |
| `NOT_FOUND` | 404 | (public detail) not a public opportunity |
| `FORBIDDEN` | 403 | Wrong **role** (student/moderator on a creator route, non-admin on an admin route): standard envelope |
| `VALIDATION_ERROR` | 422 | Field errors in `error.details` (e.g. `application_deadline`, `actions.0.url`, `cover_image.public_id`, `end_date`, `reason`) |

### Two shapes that are not in the envelope (pre-existing, app-wide — `KNOWN_ISSUES.md` #102)
- A **policy denial** (a creator editing someone else's opportunity, or their own once it is under review/published) is **403 in Laravel's default JSON**: `{ "message": "This opportunity has been published, so only an admin can change or remove it." }` (+ `exception`/trace only under `APP_DEBUG`). The `message` is readable.
- A **route-bound id that doesn't exist, or a deleted opportunity**, is **404** as `{ "message": "No query results for model [App\\Models\\Opportunity] 12" }`.

**Key off the HTTP status** for these two; everything else uses the envelope.

## Notes for implementers
- Never decide open/closed on the client: use `status` / `is_open` / `closed_reason`. Re-fetch rather than caching "open" for long — an opportunity closes the moment its deadline passes, with no event pushed to you.
- The public list is throttled (120 requests/minute per IP).
- Show `rejection_reason` prominently on a creator's rejected opportunities and offer **Edit** then **Resubmit**; there are no notifications, so surface "needs changes" from `GET /tutor/opportunities?status=rejected`.
- Tell creators that organization, contact information and links are public.
- Every text field is **plain text** stored exactly as typed (no HTML sanitising on the backend): render it **escaped**, never as HTML. Links should be opened with `rel="noopener noreferrer"`.
- Deadlines are stored in UTC and shown as ISO 8601 with an offset (Sierra Leone is UTC+0); format them in the user's locale on the client.
