# GIGS API — the Student Gig Marketplace (Gigs V1)

_For the student app, the creation-user portal (tutors, educators, contributors) and the admin portal. 2026-10-06. Needs the `2026_10_06_000001_create_gigs_tables` migration. Payloads below were captured from the running API (ids, uuids and dates are illustrative). The same endpoints with more payloads are also in `STUDENT_API_PAYLOADS.md` → **Gigs** (student side), `CREATION_USER_API_PAYLOADS.md` → **Gigs (Create & Manage)** / **Gig Moderation & Categories** (creation-user and admin side), and the changelogs `STUDENT_FRONTEND_API_CHANGES.md` (Round 9) and `CREATION_USER_FRONTEND_API_CHANGES.md`. Base URL `/api/v1`. All responses use the standard envelope `{ success, message, data, … }`; errors are `{ success:false, error:{ code, message, details? } }`; lists are a flat `data[]` with a sibling `meta` (`current_page,last_page,per_page,total,from,to`). Auth is the usual Bearer token where one is needed._

## The model in one minute

- A **gig** is a small job someone posts for UniVybe **students** to take on, for money, experience or both: graphic design, web or mobile development, tutoring, photography, videography, writing, proofreading, data entry, social media, event help, research help, translation, technical support, errands, and anything else legitimate.
- **UniVybe is only the notice board.** It handles discovery, moderation, *who is interested*, and reputation. **Payment and conversation happen outside UniVybe** — over WhatsApp or email. There is **no** payment, escrow, wallet, in-app chat, proposal/CV form, contract or "work completed" check, and the price on a gig is only what the creator wrote on it.
- **Who posts:** students, admins, educators, tutors and contributors. **Moderators cannot.** **Who takes gigs:** students only — creation users can browse but never express interest.
- **Every gig is approved by an admin before anyone can see it — no exceptions, an admin's own included.** `draft → pending approval → published`, or `rejected` with feedback the creator reads, fixes and resubmits.
- **Browsing is public** (no sign-in): list, search, filter, open a gig. **Contacting the creator needs a student account**: the student taps **Interested**, the backend **records that interest first**, and only then returns the creator's WhatsApp / email.
- **The contact details belong to the gig.** The creator types a WhatsApp number and/or an email *for that gig*; nothing is ever copied from their account, and the numbers/addresses are in **no** public response — only the interest endpoint (and the creator's/admin's own views) return them.
- **One interested student = one applicant record per gig**, however many times they click. An optional **applicant limit** closes the gig by itself when it is reached, enforced on the server even when many students tap at the same instant.
- **Multi-hire:** a gig can work with several students. The creator marks the ones they actually **worked with** ("Worked With" — their word only; UniVybe verifies no payment or delivery) and can then **rate** them 1-5 stars with an optional review. **If the creator is a student, the worker can rate them back.** Creation users (admin/educator/tutor/contributor) cannot be rated through gigs.
- Ratings build a public **gig reputation** (average + count + written reviews) on each **student's** profile, whether they were rated as a worker or as a gig creator.
- **Open vs closed is decided by the server** from the deadline, the clock and the applicant count — never compute it from dates on the client.

## Who can do what

| | Guest | Student | Admin | Educator / Tutor / Contributor | Moderator |
| --- | :-: | :-: | :-: | :-: | :-: |
| Browse, search, filter, open a gig | ✅ | ✅ | ✅ | ✅ | ✅ |
| Express interest / get contact details | sign in | ✅ (not their own gig) | ❌ | ❌ | ❌ |
| Post a gig (own, needs approval) | ❌ | ✅ `/student/posted-gigs` | ✅ `/tutor/gigs` | ✅ `/tutor/gigs` | ❌ |
| Edit own gig's content | — | draft / rejected only | any gig, any state | draft / rejected only | — |
| Change a live gig's limit / deadline, close, reopen | — | own gigs | any gig | own gigs | — |
| See own gig's interested students, mark Worked With, rate them | — | own gigs | *(see the interested students of any gig; marking / rating is the creator's alone)* | own gigs | — |
| Rate a student creator | — | ✅ if marked Worked With | ❌ | ❌ | ❌ |
| Approve / reject / unpublish / restore / delete, manage categories | ❌ | ❌ | ✅ `/admin/…` | ❌ | ❌ |

## Statuses

`status` as the **management** endpoints return it (the public API shows only `open` / `closed`):

| `status` | Meaning | Public? | Creator can edit content? |
| --- | --- | :-: | :-: |
| `draft` | being prepared, never submitted | no | yes |
| `pending_approval` | submitted, waiting for an admin | no | no (locked while under review) |
| `rejected` | an admin said no — `rejection_reason` says why | no | yes, then resubmit |
| `published` | approved and live | **yes** | no (an admin can); limit/deadline/close still allowed |
| `closed` | closed **by hand** by its creator or an admin | **yes**, as closed | no |
| `unpublished` | an admin removed it from public view (reversible) | no | no |

Whether a `published` gig is **open** is *computed on every request*: published **and** the application deadline (if any) has not passed **and** a spot is left (open capacity, or `applicant_count < applicant_limit`). So a `published` gig can read `status:"closed"` on the public API. Fields on every gig: `status` (public: `"open"` | `"closed"`), `is_accepting_interest`, and `closed_reason` = `null` | `"manually_closed"` | `"deadline_passed"` | `"capacity_reached"` (if several apply: manual first, then deadline, then capacity). Closed gigs stay public and fully viewable; they are in their own list.

## Endpoint map

| Who | Method & path | What |
| --- | --- | --- |
| public | `GET /gigs/options` · `GET /gigs/categories` | vocabularies for filters and the creation form · the active categories |
| public | `GET /gigs` · `GET /gigs/closed` · `GET /gigs/{id\|uuid}` | open gigs · closed gigs · one gig |
| any signed-in | `GET /gigs/students/{studentUuid}/reviews` | a student's written gig reviews |
| student | `POST /student/gigs/{gig}/interest` | **Interested / contact the creator** (records interest, returns contact details) |
| student | `GET /student/gigs/interests` | gigs I showed interest in (+ worked-with state, ratings) |
| student | `PUT /student/gigs/{gig}/creator-rating` | rate the (student) creator of a gig I was marked Worked With on |
| student | `GET/POST /student/posted-gigs` · `GET/PUT/DELETE /student/posted-gigs/{gig}` | list / create · show / edit / delete gigs **I posted** |
| creation user | `GET/POST /tutor/gigs` · `GET/PUT/DELETE /tutor/gigs/{gig}` | the same, for admin / educator / tutor / contributor |
| both portals | `POST …/{gig}/submit` · `PUT …/{gig}/settings` · `POST …/{gig}/close` · `POST …/{gig}/reopen` | submit for approval · limit / deadline · close · reopen |
| both portals | `GET …/{gig}/applicants` · `PUT …/{gig}/applicants/{interest}/worked-with` · `PUT …/{gig}/applicants/{interest}/rating` | who is interested · mark Worked With · rate a worker |
| admin | `GET /admin/gigs` · `GET /admin/gigs/{id\|uuid}` | every gig incl. deleted (pending first) · one gig with its audit trail |
| admin | `PUT /admin/gigs/{gig}/approve\|reject\|unpublish\|restore\|close\|reopen` · `DELETE /admin/gigs/{gig}` | moderation and lifecycle |
| admin | `GET/POST /admin/gig-categories` · `GET/PUT/DELETE /admin/gig-categories/{id}` | manage categories |

`…` = `/student/posted-gigs` for a student, `/tutor/gigs` for a creation user: **same behaviour, same payloads**. `{gig}` is the numeric `id` or the `uuid`; `{interest}` is the applicant record's `id` (a uuid) from the applicants list.

## Public discovery

### `GET /gigs/options` — vocabularies
Response `200`:

```json
{
    "success": true,
    "message": "Gig options retrieved successfully",
    "data": {
        "pricing_types": [
            { "value": "fixed", "label": "Fixed price" },
            { "value": "negotiable", "label": "Negotiable" }
        ],
        "work_modes": [
            { "value": "remote", "label": "Remote" },
            { "value": "physical", "label": "Physical / On-site" },
            { "value": "hybrid", "label": "Hybrid" }
        ],
        "closed_reasons": [
            { "value": "capacity_reached", "label": "Applicant limit reached" },
            { "value": "deadline_passed", "label": "Deadline passed" },
            { "value": "manually_closed", "label": "Closed" }
        ],
        "currency": "SLE",
        "rating": { "min": 1, "max": 5, "review_max_length": 1000 },
        "limits": { "max_skills": 15, "max_tags": 15, "max_applicant_limit": 10000 }
    }
}
```


Build filters and the creation form from this response (`limits` are the caps the validation enforces).

### `GET /gigs/categories` — the categories a gig can be in
Response `200`:

```json
{
    "success": true,
    "message": "Gig categories retrieved successfully",
    "data": {
        "categories": [
            { "id": 1, "slug": "graphic-design", "name": "Graphic Design", "description": null },
            { "id": 2, "slug": "web-development", "name": "Web Development", "description": null },
            /* … 14 more … */
        ]
    }
}
```


Admin-managed and ordered by the admin; only **active** ones are listed. Filter by `slug` (`?category=graphic-design`) or `id` (`?category_id=1`).

### `GET /gigs` — open gigs
Newest **published** first (stable: the publication time never changes; unpublishing and restoring never reorders). Public; send the Bearer token if you have one to also get the `viewer` block. Query (all optional, AND-combined):

| Param | Meaning |
| --- | --- |
| `search` | text over title, short + full description, **location**, category name, **skills** and **tags** (case-insensitive "contains") |
| `category` | one or several category **slugs**: `category=tutoring`, `category=a,b` or `category[]=a&category[]=b` (any of them). `category_id` does the same with ids |
| `pricing_type` | `fixed` and/or `negotiable` (any of the given) |
| `work_mode` | `remote`, `physical`, `hybrid` (any of the given) |
| `location` | free text, "contains" (`location=freetown`) |
| `skills`, `tags` | `skills=figma,branding` or `skills[]=…` — **all** must match (case-insensitive); skills and tags are separate lists |
| `deadline_from`, `deadline_to` | `YYYY-MM-DD`, whole days (Sierra Leone time), both ends inclusive; gigs with no deadline never match a range |
| `has_deadline` | `1`/`true` only gigs with a deadline; `0`/`false` only open-ended ones |
| `status` | `open` (default) or `closed` — `closed` is the same as `GET /gigs/closed` |
| `page`, `per_page` | default 15, max 50 (larger is clamped) |

Any other parameter is ignored. A bad value is a `422 VALIDATION_ERROR` (details in `error.details`).

`GET /api/v1/gigs?category=graphic-design&work_mode=hybrid&search=logo` — as **a guest (no token)**

Response `200`:

```json
{ "current_page": 1, "last_page": 1, "per_page": 15, "total": 1, "from": 1, "to": 1 }
```


Items are **lean** (no long text, no address). The full field reference is under *Gig detail* below.

### `GET /gigs/closed` — closed gigs
Same filters and shape for gigs that are **closed by hand, past their deadline, or full**. They never appear in the default list but stay public with all their data.

### `GET /gigs/{id|uuid}` — one gig
Open **or** closed. Not public (draft, pending, rejected, unpublished, deleted, or its creator's account is suspended) → `404 NOT_FOUND`. A non-existent or deleted id is a bare framework `404` (see *Two response shapes…*).

`GET /api/v1/gigs/1` — as **a guest (no token)**

Response `200`:

```json
{
    "success": true,
    "message": "Gig retrieved successfully",
    "data": {
        "gig": {
            "id": 1,
            "uuid": "b25a71ac-266c-4462-bfef-a7f2f66d5359",
            "title": "Design a logo for my bakery",
            "short_description": "A simple, modern logo (PNG + SVG) for a small bakery in Freetown, needed by mid-January.",
            "description": "We bake bread and pastries in Lumley and want a logo for our sign, menu and packaging.\nDeliver PNG and SVG files.",
            "requirements": "Send two samples of earlier logo work.",
            "category": { "id": 1, "slug": "graphic-design", "name": "Graphic Design" },
            "pricing_type": "fixed",
            "pricing_type_label": "Fixed price",
            "price_amount": 500,
            "price_max": null,
            "currency": "SLE",
            "price_label": "Le 500",
            "work_mode": "hybrid",
            "work_mode_label": "Hybrid",
            "location": "Freetown",
            "address": "Lumley Beach Road, near the roundabout",
            "application_deadline": "2026-12-31T23:59:59+00:00",
            "expected_start_date": "2027-01-05",
            "expected_completion_date": "2027-01-20",
            "capacity_type": "limited",
            "applicant_limit": 3,
            "applicant_count": 0,
            "spots_remaining": 3,
            "status": "open",
            "is_accepting_interest": true,
            "closed_reason": null,
            "published_at": "2026-10-07T09:00:00+00:00",
            "skills": [ "branding", "illustrator" ],
            "tags": [ "bakery", "logo" ],
            "cover_image": null,
            "contact_methods": [ "whatsapp", "email" ],
            "contact_method": "both",
            "contact_action": { "available": true, "requires_sign_in": true, "student_only": true },
            "creator": {
                "type": "creation_user",
                "id": "27158023-ada5-4930-9bc1-2e50e1002947",
                "name": "Fatmata Kamara",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/fatmata.jpg",
                "role": "tutor",
                "role_label": "Tutor",
                "gig_rating": null
            },
            "viewer": null,
            "updated_at": "2026-10-07T09:00:00+00:00"
        }
    }
}
```


**Field reference** (list items have the same fields except `description`, `requirements`, `address`, `contact_action`):

| Field | Notes |
| --- | --- |
| `id`, `uuid` | either works in URLs |
| `title`, `short_description`, `description`, `requirements` | plain text — render **escaped**, never as HTML |
| `category` | `{id, slug, name}` |
| `pricing_type` | `fixed` or `negotiable` (`pricing_type_label` is display text) |
| `price_amount`, `price_max`, `currency`, `price_label` | numbers in Leones (or `null`). **Fixed** → `price_amount` is the price. **Negotiable** → optional indicative amount, optionally a range up to `price_max`. **`price_label` is display-ready** ("Le 500", "Negotiable", "Negotiable (Le 300 – Le 500)"). UniVybe moves no money |
| `work_mode` | `remote` / `physical` / `hybrid` (`work_mode_label`) |
| `location`, `address` | only what the creator typed for this gig; `null` for remote gigs. `address` (meeting place) is on the detail only |
| `application_deadline` | ISO 8601 **instant** or `null` (no deadline). The only date that stops new interest |
| `expected_start_date`, `expected_completion_date` | plain calendar dates (`"2027-01-05"`) or `null` — about the *work*, not about applying |
| `capacity_type`, `applicant_limit`, `applicant_count`, `spots_remaining` | `open` (limit `null`, `spots_remaining: null`) or `limited`. `applicant_count` = unique interested students |
| `status`, `is_accepting_interest`, `closed_reason` | `"open"`/`"closed"`, whether a **new** student can express interest right now, and why not |
| `skills[]`, `tags[]` | lower-case strings |
| `cover_image` | `null` or `{source, url, public_id}` — `source:"cloudinary"` → use `url` or build resized URLs from `public_id`; `source:"external"` → use `url` as is |
| `contact_methods[]`, `contact_method` | which methods exist: `["whatsapp","email"]` and `"whatsapp"`/`"email"`/`"both"`. **Never the number or address itself** |
| `contact_action` *(detail)* | `{available, requires_sign_in, student_only}` — drive the button: `available:false` → show "no longer accepting interest"; `requires_sign_in:true` → send guests to sign in |
| `creator` | `{type, id, name, avatar_url, …}`: for a **student** `type:"student"`, `university` and `gig_rating:{average_rating,rating_count}`; for a **creation user** `type:"creation_user"`, `role` (`tutor`…), `role_label`, `gig_rating:null`. Never an email or phone |
| `viewer` | `null` for a guest. For a signed-in account: `{type, is_student, is_own_gig, has_expressed_interest, can_contact}` — **`can_contact` is the single flag for enabling the Interested button** |
| `published_at`, `updated_at` | ISO 8601 |

**Never in a public response:** the stored status, who approved it, rejection feedback, the audit trail, the creator's account email/phone, and the contact details.

A student who is signed in and already showed interest sees `viewer.has_expressed_interest: true`:

Response `200`:

```json
{
    "type": "student",
    "is_student": true,
    "is_own_gig": false,
    "has_expressed_interest": false,
    "can_contact": true
}
```


## Student: Interested / contact the creator

### `POST /student/gigs/{gig}/interest`
The one call behind the **Interested / Contact the creator** button. Student token required (`401` guest, `403` for any creation user). Optional body `{ "method": "whatsapp" | "email" }` — the contact action the student chose; it must be one the gig offers (`422` otherwise, **nothing is recorded**). The backend:

1. checks the gig is public, the account is an active student, and it is not the student's own gig;
2. if the student is **new**: checks the gig is open (not closed, deadline not passed, a spot left), **records the interest** (one row per student per gig) and counts it;
3. if the student **already** showed interest: records nothing new — no duplicate, no extra spot, no higher count — and just refreshes the "last contacted" time;
4. returns the creator's contact details and ready-made links.

`POST /api/v1/student/gigs/1/interest` — as **a signed-in student**

Request body:

```json
{ "method": "whatsapp" }
```

Response `201`:

```json
{
    "success": true,
    "message": "Interest recorded",
    "data": {
        "interest": {
            "id": "64de22d4-fc27-4091-aae2-d619a2450cad",
            "interested_at": "2026-10-07T09:00:00+00:00",
            "last_contacted_at": "2026-10-07T09:00:00+00:00",
            "contact_method": "whatsapp",
            "worked_with": false
        },
        "newly_registered": true,
        "contact": {
            "selected_method": "whatsapp",
            "message": "Hi, I saw your \"Design a logo for my bakery\" gig on UniVybe and I'm interested.",
            "whatsapp": {
                "number": "+23276123456",
                "url": "https://wa.me/23276123456?text=Hi%2C%20I%20saw%20your%20%22Design%20a%20logo%20for%20my%20bakery%22%20gig%20on%20UniVybe%20and%20I%27m%20interested."
            },
            "email": {
                "address": "bakery@example.com",
                "url": "mailto:bakery@example.com?subject=Interested%20in%20your%20%22Design%20a%20logo%20for%20my%20bakery%22%20gig%20on%20UniVybe&body=Hi%2C%20I%20saw%20your%20%22Design%20a%20logo%20for%20my%20bakery%22%20gig%20on%20UniVybe%20and%20I%27m%20interested."
            }
        }
    }
}
```


- **`201`** the first time (`newly_registered: true`), **`200`** on every repeat (`newly_registered: false`) — so it is safe to call on every tap, and a double-click is harmless.
- `contact.whatsapp` / `contact.email` are `null` when the creator did not give that method. `contact.whatsapp.url` is a ready `https://wa.me/<number>?text=…` link with the suggested message, `contact.email.url` a `mailto:` link with subject and body — **open them as they are** (new tab / `window.open` / the platform's URL handler); `contact.message` is the same opening line if you build your own UI: *Hi, I saw your "<gig title>" gig on UniVybe and I'm interested.*
- `gig` in the response is the updated gig (new `applicant_count`, `spots_remaining`, and `is_accepting_interest` — the gig may have just filled up).
- **Repeat tap:**

`POST /api/v1/student/gigs/1/interest` — as **a signed-in student**

Response `200`:

```json
{
    "success": true,
    "message": "You have already shown interest in this gig",
    "data": {
        "interest": {
            "id": "64de22d4-fc27-4091-aae2-d619a2450cad",
            "interested_at": "2026-10-07T09:00:00+00:00",
            "last_contacted_at": "2026-10-07T09:00:00+00:00",
            "contact_method": "whatsapp",
            "worked_with": false
        },
        "newly_registered": false
    }
}
```


- **Refusals** (nothing recorded, **no contact details in the body**):

`POST /api/v1/student/gigs/1/interest` — as **a signed-in student**

Response `409`:

```json
{
    "success": false,
    "error": {
        "code": "GIG_NOT_ACCEPTING_INTEREST",
        "message": "This gig has reached its applicant limit and is no longer accepting interest.",
        "details": { "reason": "capacity_reached" }
    }
}
```


`POST /api/v1/student/gigs/1/interest` — as **a signed-in tutor**

Response `403`:

```json
{
    "success": false,
    "error": { "code": "FORBIDDEN", "message": "Insufficient permissions" }
}
```


`POST /api/v1/student/gigs/2/interest` — as **a signed-in student**

Response `403`:

```json
{
    "success": false,
    "error": {
        "code": "GIG_OWN_GIG",
        "message": "You cannot express interest in a gig you posted yourself."
    }
}
```


`POST /api/v1/student/gigs/3/interest` — as **a signed-in student**

Response `404`:

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Gig not found" } }
```


A student who is **already an applicant** can still call it while the gig is `published`, even if it has since filled up or passed its deadline (they were admitted while it was open) — so "Contact creator" keeps working for people already in. A gig closed by hand, unpublished, or whose creator's account is suspended gives nobody contact details.

### `GET /student/gigs/interests` — gigs I showed interest in
Newest first, paginated (`?worked_with=true|false`, `page`, `per_page`). Each item: `id` (the interest uuid), `gig` (the lean public gig, or `{id,title,availability:"unavailable"}` once it is removed/unavailable), `availability` (`open` / `closed` / `unavailable`), `interested_at`, `last_contacted_at`, `contact_method`, `worked_with`, `worked_with_at`, `rating_received` (what the creator rated *me*), `rating_given` (what I rated the creator) and **`can_rate_creator`** (worked with + the creator is a student + the gig is live/closed). **Never contains contact details** — call the interest endpoint again for those.

`GET /api/v1/student/gigs/interests?worked_with=true` — as **a signed-in student**

Response `200`:

```json
{
    "success": true,
    "message": "Your gig interests retrieved successfully",
    "data": [
        {
            "id": "d8495f77-21a3-40e6-953f-449bfe9a72b8",
            "availability": "open",
            "interested_at": "2026-10-07T09:00:00+00:00",
            "last_contacted_at": "2026-10-07T09:00:00+00:00",
            "contact_method": "whatsapp",
            "worked_with": true,
            "worked_with_at": "2026-10-07T09:00:00+00:00",
            "rating_received": {
                "rating": 4,
                "review": "Patient and well prepared.",
                "created_at": "2026-10-07T09:00:00+00:00"
            },
            "rating_given": {
                "rating": 5,
                "review": "Clear brief, paid on time.",
                "created_at": "2026-10-07T09:00:00+00:00",
                "updated_at": "2026-10-07T09:00:00+00:00"
            },
            "can_rate_creator": true
        },
        /* … 1 more … */
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 2, "from": 1, "to": 2 }
}
```


### `PUT /student/gigs/{gig}/creator-rating` — rate the creator back
Body `{ "rating": 1-5, "review": "optional, ≤1000 chars" }`. Allowed **only** if the creator is a **student**, the signed-in student showed interest in this gig **and was marked Worked With**, and the gig is published or closed. `201` the first time, `200` when it replaces their earlier rating (one rating per student per gig, never two).

`PUT /api/v1/student/gigs/2/creator-rating` — as **a signed-in student**

Request body:

```json
{ "rating": 5, "review": "Clear brief, paid on time." }
```

Response `201`:

```json
{
    "success": true,
    "message": "Rating saved",
    "data": {
        "rating": {
            "id": "d68cff8f-4f1d-4fd0-b245-1cd0a8e4ccb4",
            "rating": 5,
            "review": "Clear brief, paid on time.",
            "direction": "worker_to_creator",
            "as": "creator",
            "created_at": "2026-10-07T09:00:00+00:00",
            "updated_at": "2026-10-07T09:00:00+00:00"
        }
    }
}
```


Refusals — creator is not a student (`403 GIG_CREATOR_NOT_RATEABLE`), student never showed interest (`409 GIG_NOT_APPLICANT`), not marked Worked With (`409 GIG_NOT_WORKED_WITH`), bad stars (`422`):

`PUT /api/v1/student/gigs/1/creator-rating` — as **a signed-in student**

Request body:

```json
{ "rating": 5 }
```

Response `403`:

```json
{
    "success": false,
    "error": {
        "code": "GIG_CREATOR_NOT_RATEABLE",
        "message": "Only gigs posted by students can have their creator rated."
    }
}
```


`PUT /api/v1/student/gigs/2/creator-rating` — as **a signed-in student**

Request body:

```json
{ "rating": 5 }
```

Response `409`:

```json
{
    "success": false,
    "error": {
        "code": "GIG_NOT_WORKED_WITH",
        "message": "Only a student who was marked as worked with on this gig can be rated."
    }
}
```


## Reputation on the student profile

`GET /student/profile` (own) and `GET /student/students/{id}` (another student) now carry **`gig_reputation`** — **additive**, nothing else changed:

```json
"gig_reputation": {
    "average_rating": 4.5,        // 2 decimals, null while there are no ratings
    "rating_count": 2,            // every 1-5 rating received, as a worker OR as a student creator
    "reviews": [ /* the latest 5 WRITTEN reviews, newest first */ ]
}
```

A review (`reviews[]` and the list below): `{ id, rating, review, direction, as, reviewer, gig, created_at, updated_at }` — `as` is the role the rated student had (`"worker"` | `"creator"`), `reviewer` is `{type, id, name, avatar_url, role?}`, `gig` is `{id, title}` (still named after the gig was removed). A rating **without text** counts in the average and the count but is not a review.

### `GET /gigs/students/{studentUuid}/reviews` — all of a student's written reviews
Any signed-in account (student **or** creation user — a tutor looking at an applicant uses this, since only students can open the student profile endpoint). Paginated (`page`, `per_page`), newest first. `{studentUuid}` is the `student.id` from an applicant or a profile; an unknown, suspended or deleted student is `404`.

`GET /api/v1/gigs/students/2ff98d2f-596a-4628-a33a-cc433977833f/reviews` — as **a signed-in tutor**

Response `200`:

```json
{
    "success": true,
    "message": "Reviews retrieved successfully",
    "data": {
        "student": {
            "id": "2ff98d2f-596a-4628-a33a-cc433977833f",
            "name": "Ibrahim Bangura",
            "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/ibrahim.jpg"
        },
        "gig_rating": { "average_rating": 4, "rating_count": 2 },
        "reviews": [
            {
                "id": "a39dc805-3171-4490-aeea-884669e9d574",
                "rating": 4,
                "review": "Patient and well prepared.",
                "direction": "creator_to_worker",
                "as": "worker",
                "reviewer": {
                    "type": "student",
                    "id": "f3ec5ebf-1e6e-4229-8f24-4bda9bc09c91",
                    "name": "Mariama Sesay",
                    "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/mariama.jpg"
                },
                "gig": {
                    "id": "365dc202-4f6e-414d-b72f-3d3c6672a230",
                    "title": "Maths tutoring for first-year students"
                },
                "created_at": "2026-10-07T09:00:00+00:00",
                "updated_at": "2026-10-07T09:00:00+00:00"
            },
            /* … 1 more … */
        ]
    },
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 2, "from": 1, "to": 2 }
}
```


## Posting and managing gigs (both portals)

A **student** uses `/student/posted-gigs…`; an **admin, educator, tutor or contributor** uses `/tutor/gigs…`. Identical endpoints and payloads. Only **approved** creation-user accounts and **active** students can post (`403` otherwise; moderators and guests are refused by the role gate).

### `POST …` — create a gig (a private draft)

| Field | Required | Notes |
| --- | :-: | --- |
| `title` | ✅ | ≤200, **one line** |
| `short_description` | ✅ | ≤500 |
| `category_id` | ✅ | an **active** category id (`GET /gigs/categories`) |
| `pricing_type` | ✅ | `fixed` or `negotiable` |
| `price_amount` | fixed: ✅ | > 0, ≤2 decimals, Leones. For **negotiable** an optional indicative amount |
| `price_max` | no | negotiable only, with `price_amount`; not below it. **A fixed price has no maximum** (422) |
| `work_mode` | ✅ | `remote` / `physical` / `hybrid` |
| `location`, `address` | no | only meaningful for `physical` / `hybrid`; **ignored (stored `null`) for `remote`** |
| `contact_whatsapp`, `contact_email` | **at least one** | this gig's own contact details (error key `contact` when both are missing). WhatsApp may be typed `076 123456`, `+232 76 123456` or `0023276123456` — Sierra Leone numbers are completed with +232, **any other country needs its code** (`+44 7700 900123`); it is stored normalised as `+23276123456`. Email is lower-cased and must have a dotted host |
| `description`, `requirements` | no | ≤10000 / ≤5000 |
| `application_deadline` | no | a date (`2026-12-31` = the **end of that day**, Sierra Leone time) or an ISO 8601 instant (`2026-12-31T17:00:00Z`); must be in the future; `null` = no deadline |
| `expected_start_date`, `expected_completion_date` | no | `YYYY-MM-DD`; completion not before start |
| `capacity_type`, `applicant_limit` | no | `open` (default: unlimited until closed or the deadline) or `limited` with `applicant_limit` 1-10000. Sending `applicant_limit` needs `capacity_type: "limited"` |
| `skills[]`, `tags[]` | no | up to 15 each; lower-cased and de-duplicated |
| `cover_image` | no | `{source:"cloudinary", public_id}` (**your own** upload, purpose `thumbnail`, registered through `/upload/store-metadata`) or `{source:"external", url}` (https only); `null` removes it |
| `submit` | no | `true` = also send for approval in the same request |

Everything else (`status`, owner, review fields, counts) is **not accepted** — a payload cannot publish, reassign or inflate a gig.

`POST /api/v1/tutor/gigs` — as **a signed-in tutor**

Request body:

```json
{
    "title": "Design a logo for my bakery",
    "short_description": "A simple, modern logo for a small bakery in Freetown.",
    "description": "We bake bread and pastries in Lumley and want a logo for our sign, menu and packaging.\nDeliver PNG and SVG files.",
    "requirements": "Send two samples of earlier logo work.",
    "category_id": 1,
    "pricing_type": "fixed",
    "price_amount": 500,
    "work_mode": "hybrid",
    "location": "Freetown",
    "address": "Lumley Beach Road, near the roundabout",
    "contact_whatsapp": "076 123456",
    "contact_email": "bakery@example.com",
    "application_deadline": "2026-12-31",
    "expected_start_date": "2027-01-05",
    "expected_completion_date": "2027-01-20",
    "capacity_type": "limited",
    "applicant_limit": 3,
    "skills": [ "Illustrator", "Branding" ],
    "tags": [ "logo", "bakery" ]
}
```

Response `201`:

```json
{
    "success": true,
    "message": "Gig saved as a draft",
    "data": {
        "gig": {
            "id": 1,
            "uuid": "b25a71ac-266c-4462-bfef-a7f2f66d5359",
            "title": "Design a logo for my bakery",
            "short_description": "A simple, modern logo for a small bakery in Freetown.",
            "description": "We bake bread and pastries in Lumley and want a logo for our sign, menu and packaging.\nDeliver PNG and SVG files.",
            "requirements": "Send two samples of earlier logo work.",
            "pricing_type": "fixed",
            "pricing_type_label": "Fixed price",
            "price_amount": 500,
            "price_max": null,
            "currency": "SLE",
            "price_label": "Le 500",
            "work_mode": "hybrid",
            "work_mode_label": "Hybrid",
            "location": "Freetown",
            "address": "Lumley Beach Road, near the roundabout",
            "application_deadline": "2026-12-31T23:59:59+00:00",
            "expected_start_date": "2027-01-05",
            "expected_completion_date": "2027-01-20",
            "capacity_type": "limited",
            "applicant_limit": 3,
            "applicant_count": 0,
            "spots_remaining": 3,
            "status": "draft",
            "is_accepting_interest": false,
            "closed_reason": null,
            "published_at": null,
            "skills": [ "branding", "illustrator" ],
            "tags": [ "bakery", "logo" ],
            "cover_image": null,
            "contact_methods": [ "whatsapp", "email" ],
            "contact_method": "both",
            "updated_at": "2026-10-07T09:00:00+00:00",
            "contact": { "method": "both", "whatsapp": "+23276123456", "email": "bakery@example.com" },
            "rejection_reason": null,
            "submitted_at": null,
            "approved_at": null,
            "approved_by": null,
            "closed_at": null,
            "closed_by_role": null,
            "creator_type": "creation_user",
            "creator_id": 2,
            "creator_in_good_standing": true,
            "deleted_at": null,
            "created_at": "2026-10-07T09:00:00+00:00"
        }
    }
}
```


Validation errors use the standard `422` envelope (`error.details` = `{field: [messages]}`):

`POST /api/v1/tutor/gigs` — as **a signed-in tutor**

Response `422`:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {
            "title": [ "The title field is required." ],
            "short_description": [ "The short description field is required." ],
            "category_id": [ "The category id field is required." ],
            "pricing_type": [ "The pricing type field is required." ],
            "work_mode": [ "The work mode field is required." ],
            "contact": [ "Provide a WhatsApp number or an email address students can contact you on." ]
        }
    }
}
```


### `POST …/{gig}/submit` — send for approval
Draft → `pending_approval`; a **rejected** gig the creator revised → `pending_approval` again (the rejection feedback is cleared). **Never straight to public.** Allowed only for the creator (`403` for anyone else — an admin cannot submit someone else's draft), only from `draft`/`rejected` (`409 GIG_INVALID_STATE` otherwise), and not if the deadline has already passed (`422 GIG_DEADLINE_PASSED`) or the category was deactivated meanwhile (`422` on `category_id`).

`POST /api/v1/tutor/gigs/1/submit` — as **a signed-in tutor**

Response `200`:

```json
"pending_approval"
```


### `GET …` and `GET …/{gig}` — my gigs
Own gigs, newest first (filters as in discovery plus `status` = a stored status: `draft | pending_approval | rejected | published | closed | unpublished`). `GET …/{gig}` is one gig (an admin can open any). The management shape = everything public **plus** `status`, `rejection_reason`, `submitted_at`, `approved_at`, `approved_by`, `closed_at`, `closed_by_role`, `contact` (`{method, whatsapp, email}`), `creator_type`, `creator_id`, `worked_with_count`, and a **`permissions`** block — **drive your buttons from it**:

Response `200`:

```json
{
    "can_edit": true,
    "can_delete": true,
    "can_submit": true,
    "can_manage_settings": true,
    "can_close": false,
    "can_reopen": false,
    "can_view_applicants": true,
    "can_rate_workers": false
}
```


`can_edit` (content), `can_manage_settings` (limit/deadline), `can_close`, `can_reopen` (false when an admin closed it and you are not an admin), `can_submit`, `can_delete`, `can_view_applicants`, `can_rate_workers`.

### `PUT …/{gig}` — edit content
Send only what changes (`skills`/`tags` replace the whole list; `cover_image: null` removes it; `submit: true` also resubmits). Allowed while the gig is a **draft or rejected** (creator) — editing never changes the status, so a rejected gig stays rejected with its feedback until it is submitted again. Once it is pending or published a creator gets a `403` (an admin can edit any gig). The *limit and deadline* can still be changed on a live gig, below.

### `PUT …/{gig}/settings` — applicant limit and deadline (also on a live gig)
Body: any of `capacity_type` (+ `applicant_limit`) and `application_deadline` (`null` removes it). No new review needed. A limit **below the number of students already interested** is a `422` on `applicant_limit`; raising the limit of a full gig makes it take interest again. Not allowed while the gig is pending review or after an admin removed it (`403`).

`PUT /api/v1/tutor/gigs/1/settings` — as **a signed-in tutor**

Request body:

```json
{ "capacity_type": "limited", "applicant_limit": 2 }
```

Response `422`:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {
            "applicant_limit": [
                "3 student(s) have already shown interest, so the applicant limit cannot be lower than that."
            ]
        }
    }
}
```


`PUT /api/v1/tutor/gigs/1/settings` — as **a signed-in tutor**

Request body:

```json
{ "application_deadline": "2027-01-31" }
```

Response `200`:

```json
"2027-01-31T23:59:59+00:00"
```


### `POST …/{gig}/close` · `POST …/{gig}/reopen`
**Close** (optional `note`): only a published gig. It stays public **as closed** with every applicant, Worked With record and rating intact — closing never deletes anything. **Reopen** (all body fields optional: `capacity_type`, `applicant_limit`, `application_deadline`, `note`) applies to a gig closed by hand, one past its deadline, or a full one — and it must leave the gig **genuinely open**, otherwise it is refused and **nothing changes**:

| Situation | What the request must include | Otherwise |
| --- | --- | --- |
| closed by hand | nothing | — |
| deadline passed | a new `application_deadline` (a future date) **or** `application_deadline: null` | `422 GIG_DEADLINE_PASSED` |
| all spots taken | a higher `applicant_limit` (with `capacity_type:"limited"`) **or** `capacity_type:"open"` | `422 GIG_CAPACITY_REACHED` |
| closed by an **admin** | only an **admin** can reopen it | `403 GIG_CLOSED_BY_ADMIN` |
| not closed / already open / unpublished / draft / pending | — | `409 GIG_INVALID_STATE` |

`POST /api/v1/tutor/gigs/1/reopen` — as **a signed-in tutor**

Response `422`:

```json
{
    "success": false,
    "error": {
        "code": "GIG_CAPACITY_REACHED",
        "message": "All 3 spots are already taken, so it cannot be reopened. Increase the applicant limit or switch to open capacity first.",
        "details": { "applicant_limit": 3 }
    }
}
```


`POST /api/v1/tutor/gigs/1/reopen` — as **a signed-in tutor**

Request body:

```json
{ "capacity_type": "limited", "applicant_limit": 5 }
```

Response `200`:

```json
"Gig reopened"
```


### `DELETE …/{gig}`
A creator can delete only a **draft or rejected** gig (a published one is *closed*, never deleted — `403`); an admin can delete any (soft delete; applicants, ratings and history are kept).

## Interested students, Worked With, ratings

### `GET …/{gig}/applicants`
The creator's (or an admin's) view of who is interested, newest first, paginated (`?worked_with=true|false`, `?search=<name>`). Each applicant carries the **public** side of the student's profile — name, picture, bio, `interests` (the profile has no separate skills field), level, university / faculty / department / organization and **`gig_rating`** — **never** their email, phone, date of birth, student number or anything private. `id` here is the **interest id** to use in the URLs below.

`GET /api/v1/tutor/gigs/1/applicants` — as **a signed-in tutor**

Response `200`:

```json
{
    "success": true,
    "message": "Interested students retrieved successfully",
    "data": [
        {
            "id": "e0c2c614-8a53-4f91-807f-e219032e6468",
            "student": {
                "id": "38895bbc-25e3-4c79-8f7b-b314489e857c",
                "name": "Sorie Turay",
                "firstname": "Sorie",
                "lastname": "Turay",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/sorie.jpg",
                "bio": "Third-year student at FBC.",
                "interests": [
                    "design",
                    /* … 1 more … */
                ],
                "level": "300",
                "university": { "id": 1, "name": "Fourah Bay College", "code": "FBC" },
                "faculty": null,
                "department": null,
                "organization": null,
                "gig_rating": { "average_rating": null, "rating_count": 0 }
            },
            "interested_at": "2026-10-07T09:00:00+00:00",
            "last_contacted_at": "2026-10-07T09:00:00+00:00",
            "contact_method": null,
            "worked_with": false,
            "worked_with_at": null,
            "rating_given": null,
            "rating_received": null
        },
        /* … 2 more … */
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 3, "from": 1, "to": 3 }
}
```


Suspended students are left out of the list (but keep their spot).

### `PUT …/{gig}/applicants/{interest}/worked-with`
Body `{ "worked_with": true }` (or `false` to take it back). **Only the gig's creator** (not an admin acting on someone else's gig — it is the creator's own statement) and only for a student who showed interest in *this* gig, while the gig is published or closed (`409 GIG_INVALID_STATE` otherwise). It means "I actually worked with this student" — **it is not a payment or delivery check.** Taking it back is refused once the student has been rated (`409 GIG_HAS_RATINGS`). Idempotent.

`PUT /api/v1/tutor/gigs/1/applicants/64de22d4-fc27-4091-aae2-d619a2450cad/worked-with` — as **a signed-in tutor**

Request body:

```json
{ "worked_with": true }
```

Response `200`:

```json
true
```


### `PUT …/{gig}/applicants/{interest}/rating`
Body `{ "rating": 1-5, "review": "optional" }`. **Only for a student marked Worked With** (`409 GIG_NOT_WORKED_WITH` otherwise), only by the gig's creator. `201` the first time, `200` when it replaces the creator's earlier rating of that student for that gig — **never a second one**. The rating counts towards the *student's* public gig reputation.

`PUT /api/v1/tutor/gigs/1/applicants/64de22d4-fc27-4091-aae2-d619a2450cad/rating` — as **a signed-in tutor**

Request body:

```json
{ "rating": 5, "review": "Delivered a clean logo two days early and took feedback well." }
```

Response `201`:

```json
{
    "id": "e9a85a55-1dbb-4dd5-97d5-df1c49a27d8e",
    "rating": 5,
    "review": "Delivered a clean logo two days early and took feedback well.",
    "direction": "creator_to_worker",
    "as": "worker",
    "created_at": "2026-10-07T09:00:00+00:00",
    "updated_at": "2026-10-07T09:00:00+00:00"
}
```


`PUT /api/v1/tutor/gigs/1/applicants/29e13b4c-ea6c-427a-a2ee-fe4e1858bb6e/rating` — as **a signed-in tutor**

Request body:

```json
{ "rating": 5 }
```

Response `409`:

```json
{
    "success": false,
    "error": {
        "code": "GIG_NOT_WORKED_WITH",
        "message": "Only a student who was marked as worked with on this gig can be rated."
    }
}
```


## Admin: review and moderation

`role:admin` only (moderators are refused). Creating and editing (content, limit, deadline) use the shared endpoints above, which admins can use on **any** gig; here is the review side.

| Endpoint | Body | Notes |
| --- | --- | --- |
| `GET /admin/gigs` | filters as discovery + `status` (stored), `creator_type` (`student` \| `creation_user`) with `creator_id`, `trashed=with\|only` | **pending submissions first**, then newest; deleted ones hidden unless `trashed` |
| `GET /admin/gigs/{id\|uuid}` | — | the gig + `events[]` (audit trail: who did what, when, with notes). Also opens a **deleted** gig |
| `PUT /admin/gigs/{gig}/approve` | `comment?` | pending (or previously rejected) → **published**. Nothing else can publish a gig |
| `PUT /admin/gigs/{gig}/reject` | **`reason`** (required, ≤2000) | pending only. The creator reads the reason, fixes the gig and resubmits |
| `PUT /admin/gigs/{gig}/unpublish` | `note?` | published or closed → `unpublished` (not public, nobody can express interest). Applicants, Worked With and ratings are kept |
| `PUT /admin/gigs/{gig}/restore` | — | unpublished → back **exactly as it was** (a gig that had been closed comes back closed) |
| `PUT /admin/gigs/{gig}/close` · `…/reopen` | `note?` · reopen options as above | an admin-closed gig can only be reopened by an admin |
| `DELETE /admin/gigs/{gig}` | — | soft delete, any status |

`PUT /api/v1/admin/gigs/1/reject` — as **a signed-in admin**

Request body:

```json
{ "reason": "Please say which file formats you need and when the logo is needed." }
```

Response `200`:

```json
"rejected"
```


`GET /api/v1/admin/gigs?status=pending_approval` — as **a signed-in admin**

Response `200`:

```json
{ "current_page": 1, "last_page": 1, "per_page": 15, "total": 1, "from": 1, "to": 1 }
```


An admin's **own** gig also goes `draft → pending_approval`; they approve it with the same call. Acting against a bad **account** uses the existing `/admin/users/{id}/suspend`: a suspended account's gigs drop out of public view by themselves (and come back if it is reinstated).

### Categories — `/admin/gig-categories`
`GET` (every category incl. inactive, in display order, with `gigs_count`), `POST {name, slug?, description?, sort_order?, is_active?}`, `GET/PUT/DELETE /{id}`. The slug is made from the name when omitted. **Deactivate** (`PUT {is_active:false}`) to retire a category: it disappears from the public list and from the choices for new gigs, while gigs already in it keep it. **Delete** only a category no gig has ever used (`409 GIG_CATEGORY_IN_USE` otherwise). The starting list (Graphic Design, Web Development, Mobile Development, Tutoring, Photography, Videography, Writing, Editing/Proofreading, Data Entry, Social Media, Event Assistance, Research Assistance, Translation, Technical Support, Errands, Other) is seeded by the migration.

`DELETE /api/v1/admin/gig-categories/4` — as **a signed-in admin**

Response `409`:

```json
{
    "success": false,
    "error": {
        "code": "GIG_CATEGORY_IN_USE",
        "message": "This category is used by 1 gig(s) and cannot be deleted. Deactivate it instead.",
        "details": { "gigs": 1 }
    }
}
```


## Error codes

All in the standard envelope unless noted.

| Status | Code | When |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | no / invalid token on a protected endpoint |
| `403` | `FORBIDDEN` | wrong role (moderator posting, student on `/tutor/gigs`, creation user on `/student/…`) |
| `403` | `ACCOUNT_NOT_ACTIVE` | a suspended student expressing interest |
| `403` | `GIG_OWN_GIG` | a student expressing interest in their own gig |
| `403` | `GIG_CLOSED_BY_ADMIN` | a creator reopening a gig an admin closed |
| `403` | `GIG_CREATOR_NOT_RATEABLE` | rating the creator of a gig posted by a creation user |
| `404` | `NOT_FOUND` | the gig is not public / not available (public detail, interest) |
| `409` | `GIG_INVALID_STATE` | a transition that does not fit the gig's current state (approve something already approved, close a closed gig, mark Worked With on a pending gig …) — `error.details.status` is the current status |
| `409` | `GIG_NOT_EDITABLE` | a creator's edit/delete raced with the gig going to review |
| `409` | `GIG_NOT_ACCEPTING_INTEREST` | a new student on a full / expired / closed gig — `error.details.reason` = `capacity_reached` \| `deadline_passed` \| `manually_closed` |
| `409` | `GIG_NOT_APPLICANT` / `GIG_NOT_WORKED_WITH` / `GIG_HAS_RATINGS` | Worked With and rating rules (above) |
| `409` | `GIG_CATEGORY_IN_USE` | deleting a category gigs use |
| `422` | `VALIDATION_ERROR` | bad input — `error.details` is `{field: [messages]}` (keys such as `contact`, `applicant_limit`, `price_amount`, `category_id`, `contact_whatsapp`, `application_deadline`, `method`, `rating`) |
| `422` | `GIG_DEADLINE_PASSED` | submit/reopen with a deadline already in the past |
| `422` | `GIG_CAPACITY_REACHED` | reopen without making room |
| `429` | *(Laravel default)* | rate limit: public reads 120/min, interest 60/min, creating gigs 30/min, ratings 30-60/min |

## Two response shapes that are not in the envelope

Both are pre-existing behaviours of the API (same as courses, resources and opportunities), not specific to gigs — key off the **HTTP status**:

1. **A policy denial** — e.g. a creator editing a gig that is under review, or opening someone else's gig. Captured:

`PUT /api/v1/tutor/gigs/1` — as **a signed-in tutor**

Request body:

```json
{ "title": "Too late" }
```

Response `403`:

```json
{ "message": "This gig is waiting for admin review, so it cannot be changed right now." }
```


2. **An id that does not exist or a deleted gig** returns Laravel's default `404` body:

`GET /api/v1/gigs/999999` — as **a guest (no token)**

Response `404`:

```json
{ "message": "No query results for model [App\\Models\\Gig] 999999" }
```


## Things to design around

- **Never compute open/closed on the client.** Use `status`, `is_accepting_interest` and `closed_reason`; re-fetch rather than caching "open" — a gig can fill up or expire between two requests, and a closed gig stays in the **closed** list, not the open one.
- **Always enable the Interested button from `viewer.can_contact`** (and send guests to sign in when `viewer` is `null` and `contact_action.available` is true). When it is `false` for a signed-in student because the gig is full/closed, show "no longer accepting interest"; a student who already showed interest keeps `can_contact: true` while the gig is published.
- **Show the interest result from the response**, not from your own state: the `201`/`200` and `newly_registered`, and the refreshed `gig.spots_remaining`.
- **Contact details are only in the interest response** — don't try to find them in a list or detail, and don't cache them: call the interest endpoint again (it is free and idempotent) whenever the student taps *Contact* again.
- **Applicant `id` is the interest id**, not the student's id. The student's id (for the reviews endpoint) is `applicant.student.id`.
- **Dates:** `application_deadline` is an instant; `expected_*` are plain dates; they are different things. A bare date typed as a deadline means the end of that day.
- **Text is plain text** — render it escaped. Skills and tags are lower-case; title-case them for display if you like.
- **No notifications.** A creator learns about approval or rejection by reading their list (`status`, `rejection_reason`); a student learns they were marked Worked With from `GET /student/gigs/interests`.
- **Not in this version:** payments, in-app chat, proposals/CVs, completion verification, saved gigs, withdrawing interest, removing an applicant, hiding a review, a price filter.
