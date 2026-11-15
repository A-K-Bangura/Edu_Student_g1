# GUIDANCE API — Student Help & Guidance (V1)

_For the student app (the Get Help form and the onboarding help links), the creation-user portal (every team role submits guides) and the admin portal. 2026-11-10. Needs the `2026_11_10_000001_create_student_guidance_tables` migration. Payloads below were captured from the running API (ids, uuids and dates are illustrative). The same endpoints are summarised as changelogs in `STUDENT_FRONTEND_API_CHANGES.md` (Round 13) and `CREATION_USER_FRONTEND_API_CHANGES.md` (Round 5). Base URL `/api/v1`. All responses use the standard envelope `{ success, message, data, … }`; errors are `{ success:false, error:{ code, message, details? } }`; lists are a flat `data[]` with a sibling `meta` (`current_page,last_page,per_page,total,from,to`). Auth is the usual Bearer token._

## The model in one minute

- A **guide** is a UniVybe team member students can be connected to **on WhatsApp** for university questions. A guide has **no account and never logs in**: they are a name, a WhatsApp number, the **places** they can help with, the **categories** of question they take, and a record that they **agreed to be shared**.
- **UniVybe only provides the contact.** There is no chat, no message sending (the student's own WhatsApp opens with the text typed, the student presses send), no delivery or read tracking, no ticket and no way to know whether a conversation happened or was resolved. A routing record means **"this contact was provided"**, nothing more.
- **Who submits a guide:** any approved **admin, educator, tutor, contributor or moderator**. **Who approves:** admins only — an admin's own submission too. A new guide is `pending` and **no student is ever given it until an admin approves it**.
- **Approval and availability are two separate switches.** A guide is handed to students only while it is **approved AND active AND not removed** (`is_matchable`). Deactivating never un-approves, approving never activates.
- **Places follow the existing University → Faculty → Department tree.** One guide can cover many places: a whole university, a whole faculty, a department, or **all universities** (a general guide, the only kind who can help a student who has not picked a university yet). A broader place also serves the narrower ones inside it. Only a valid, active place can be saved — there is no second hierarchy.
- **Categories are admin-managed data** (Admissions & Applications, Course/Module Registration, Campus Navigation, Fees & Administrative Processes, Student Life & Orientation, General Inquiries, Missing University, Missing Faculty, Missing Department, plus whatever an admin adds). Nobody can invent one by typing it. Each has a **`required_context`**: the least academic detail a student must give for it (`none | university | faculty | department`), so nobody is asked for a field the question does not need.
- **Matching** picks the **most specific suitable guide** — the student's department, then faculty, then university coverage for the exact category; then a guide who handles **General Inquiries** there; then an **all-universities** guide — and **spreads equally suitable guides' turns** (the one assigned least recently goes first). Relevance always comes before fairness, and a guide from an unrelated university is never chosen. If nobody fits, the student gets the **central UniVybe number**, which an **admin** sets at runtime (nothing is hard-coded, no deploy to change it).
- **Onboarding is not a prerequisite.** A student who has not finished onboarding can use all three student endpoints; they never read or change the profile or onboarding state.
- **Privacy.** A guide's WhatsApp number is returned only (a) to the student whose request was routed to it, (b) to the person who submitted that guide, (c) to admins. There is **no** list, search, lookup or "directory" of guides for students or the public, the admin's routing history carries no phone numbers, and the student's optional question is only placed in the WhatsApp message — UniVybe never stores it.

## Who can do what

| | Guest | Student | Admin | Educator / Tutor / Contributor / Moderator |
| --- | :-: | :-: | :-: | :-: |
| Get help (options, inquiry, onboarding help) | ❌ | ✅ (even before onboarding is finished) | ❌ | ❌ |
| Submit a guide, see / edit / withdraw **own** guides | ❌ | ❌ | ✅ (and open any guide) | ✅ |
| Approve / reject a guide, review a proposed change | ❌ | ❌ | ✅ | ❌ |
| Activate / deactivate / remove a guide | ❌ | ❌ | ✅ | ❌ (withdraw own pending or rejected only) |
| Manage categories, the central number, read the routing history | ❌ | ❌ | ✅ | ❌ |

## Endpoint map

| Who | Method & path | What |
| --- | --- | --- |
| student | `GET /student/guidance/options` | categories for the form + the profile's academic context to prefill it |
| student | `POST /student/guidance/inquiries` | **Get help**: category + confirmed academic context + optional question → a guide (or the central contact) and the WhatsApp link |
| student | `POST /student/guidance/onboarding-help` | the **"Can't find your university / faculty / department?"** links → same answer, category implied by the link |
| creation user | `GET /tutor/guidance/guides/options` | categories a guide can support, limits |
| creation user | `GET/POST /tutor/guidance/guides` · `GET/PUT/DELETE /tutor/guidance/guides/{id\|uuid}` | my submissions · submit · show / edit / withdraw one |
| admin | `GET /admin/guidance/guides` · `GET /admin/guidance/guides/{id\|uuid}` | every guide (review queue first) · one guide with its audit trail (also a removed one) |
| admin | `PUT /admin/guidance/guides/{guide}/approve` · `/reject` | decide a submission |
| admin | `PUT /admin/guidance/guides/{guide}/changes/approve` · `/changes/reject` | decide a submitter's proposed change to an approved guide |
| admin | `PUT /admin/guidance/guides/{guide}/activate` · `/deactivate` · `DELETE /admin/guidance/guides/{guide}` | availability · remove |
| admin | `GET/POST /admin/guidance/categories` · `GET/PUT/DELETE /admin/guidance/categories/{id}` | the inquiry categories |
| admin | `GET/PUT /admin/guidance/settings` | the central UniVybe WhatsApp number (+ history) |
| admin | `GET /admin/guidance/inquiries` · `GET /admin/guidance/inquiries/summary` | routing history · assignment counts |

`{guide}` is the guide's `id` (a uuid) or its numeric id.

## How a guide is chosen

For a request the server builds the **context** (as much of university → faculty → department as the student gave; a department implies its faculty and university) and takes the guides that are **approved + active + not removed**, support the requested category **or General Inquiries**, and cover the context. A guide covers the context when it has an entry for the student's **department**, the student's **faculty**, the student's **university**, or **all universities**. The best group wins:

| rank | guides | `match_tier` (admin history only) |
| :-: | --- | --- |
| 1 | exact category, covers the student's **department** | `department_exact` |
| 2 | exact category, covers the student's **faculty** | `faculty_exact` |
| 3 | exact category, covers the student's **university** | `university_exact` |
| 4 | *General Inquiries* guides, most specific first: department · faculty · university | `department_general` · `faculty_general` · `university_general` |
| 5 | an **all-universities** guide, exact category · then General Inquiries | `platform_exact` · `platform_general` |
| 6 | the **central UniVybe contact** | `central` |

- A **partial context never over-matches**: a student who only said "Fourah Bay College" is not given a guide whose coverage is one department of it. An **unrelated university** never matches.
- **Distribution**: inside the winning rank, the guide assigned **least recently** goes first (a newly approved guide goes once, then joins the rotation). Several guides of a *lower* rank are never used while a higher-ranked one exists.
- **Repeats**: asking for the **same thing again** (same category and context) within 10 minutes returns the **same contact** with `200` and `routing.is_repeat: true` — nothing new is recorded and the rotation does not move. Reloading the page cannot cycle through guides.
- **Limits**: 10 **new** contacts per student per rolling 24 hours (`429 GUIDANCE_RATE_LIMITED`; repeats still work) and 10 requests per minute per student (plain `429`). These numbers are configuration.

## The WhatsApp handoff

Every successful answer carries `contact.whatsapp.url` = `https://wa.me/<number, digits only>?text=<the message, URL-encoded>` and the same `contact.message` as plain text. **Open the URL as it is** (new tab, `window.open`, the platform's URL handler). Nothing is sent for the student: WhatsApp opens with the text typed and they press send. The message uses only the context they chose:

> Hello, I found your contact through UniVybe Student Guidance. I am a student at Fourah Bay College, Faculty of Engineering and Architecture, Department of Electrical and Electronics Engineering. I need assistance with course/module registration. My question: _…the optional question…_ Could you please help me?

- To the central contact it begins "Hello UniVybe Support, I am contacting you through UniVybe Student Guidance." With no university: "I am a UniVybe student." The four built-in categories have their own sentence ("I could not find my faculty in the UniVybe list.", "I have a general question.").
- The message never contains the student's name, email, phone or student id. The question has its whitespace collapsed and control characters removed.
- **WhatsApp itself shows the student's own phone number to whoever they message** — that is how WhatsApp works and UniVybe cannot prevent it.

## Error codes

| HTTP | `error.code` | When |
| :-: | --- | --- |
| 401 | `UNAUTHORIZED` | no / invalid token |
| 403 | `FORBIDDEN` | the wrong kind of account (a creation user on a student route, a moderator on an admin route, a student anywhere else), or a guide that is not yours |
| 403 | `ACCOUNT_NOT_ACTIVE` | a suspended student asked for guidance |
| 404 | `NOT_FOUND` | unknown, or removed (outside the admin show), guide |
| 409 | `GUIDANCE_INVALID_STATE` | a step that does not fit the guide's state (approving an approved guide, rejecting an approved one, removing an approved guide as a non-admin) |
| 409 | `GUIDANCE_NO_PENDING_CHANGES` | approving / rejecting a change when there is none |
| 409 | `GUIDANCE_CATEGORY_IN_USE` | deleting a category guides or inquiries use (deactivate it) |
| 409 | `GUIDANCE_CATEGORY_PROTECTED` | deleting / deactivating one of the four built-in categories |
| 422 | `VALIDATION_ERROR` | `details` per field — including `university_id` / `faculty_id` / `department_id` when the category needs it, `coverage.N.field`, `whatsapp_number`, `consent_confirmed`, `category_ids` |
| 429 | `GUIDANCE_RATE_LIMITED` | the student's 24-hour limit of new contacts (`details.limit`) |
| 429 | _(throttle)_ | more than 10 requests a minute |
| 503 | `GUIDANCE_CONTACT_UNAVAILABLE` | no guide fits **and** no central number is configured — **use your emergency fallback** |

---

# Part 1 — The student app

## 1. Form options and prefill — `GET /student/guidance/options`

Student token (a student who has not finished onboarding included). Returns the categories a student can pick (only active ones, in display order) and the student's own academic context from their profile — every part is `null` before onboarding, or for a student without a university. `required_context` tells you which academic field the form must insist on for that category (`none` → none). `key` is non-null only on the four built-in categories.

```json
{
  "success": true,
  "message": "Guidance options retrieved successfully",
  "data": {
    "categories": [
      { "id": 1, "key": null, "slug": "admissions-applications", "name": "Admissions & Applications", "description": null, "required_context": "university" },
      { "id": 2, "key": null, "slug": "course-module-registration", "name": "Course/Module Registration", "description": null, "required_context": "faculty" },
      { "id": 3, "key": null, "slug": "campus-navigation", "name": "Campus Navigation", "description": null, "required_context": "university" },
      { "id": 4, "key": null, "slug": "fees-administrative-processes", "name": "Fees & Administrative Processes", "description": null, "required_context": "university" },
      { "id": 5, "key": null, "slug": "student-life-orientation", "name": "Student Life & Orientation", "description": null, "required_context": "university" },
      { "id": 6, "key": "general_inquiries", "slug": "general-inquiries", "name": "General Inquiries", "description": null, "required_context": "none" },
      { "id": 7, "key": "missing_university", "slug": "missing-university", "name": "Missing University", "description": null, "required_context": "none" },
      { "id": 8, "key": "missing_faculty", "slug": "missing-faculty", "name": "Missing Faculty", "description": null, "required_context": "none" },
      { "id": 9, "key": "missing_department", "slug": "missing-department", "name": "Missing Department", "description": null, "required_context": "none" }
    ],
    "profile_context": {
      "university": { "id": 1, "name": "Fourah Bay College" },
      "faculty": { "id": 1, "name": "Engineering and Architecture" },
      "department": { "id": 1, "name": "Electrical and Electronics Engineering" }
    },
    "question_max_length": 500
  }
}
```

The category list is data: an admin can add, rename, reorder or retire categories, so **render what you receive** and do not hard-code ids or names. Use `key` only if you must recognise one of the four built-in ones.

## 2. Get help — `POST /student/guidance/inquiries`

The general inquiry. Student token.

| field | |
| --- | --- |
| `category_id` | **required**, an active category from the options |
| `university_id`, `faculty_id`, `department_id` | optional integers. **Send none of the three to use the profile; send any of them and only what you send counts.** A child implies its parents (a department alone is enough). Must be a consistent chain of existing places: a faculty that is not in the university (a department not in the faculty) is `422` on the field. Whether enough was given depends on the category's `required_context` |
| `question` | optional, up to 500 characters. It goes into the WhatsApp message and nowhere else — UniVybe does not store it |

```json
{ "category_id": 2, "question": "Which form do I need for adding a module after the deadline?" }
```

**`201`** — a new contact was provided (the student's profile gave the context here):

```json
{
  "success": true,
  "message": "Contact provided",
  "data": {
    "routing": {
      "id": "5c7e8e7f-61a2-4572-aff3-aaff9be85ac1",
      "routed_at": "2026-11-10T14:00:00+00:00",
      "source": "general",
      "category": { "id": 2, "key": null, "slug": "course-module-registration", "name": "Course/Module Registration", "description": null, "required_context": "faculty" },
      "context": {
        "university": { "id": 1, "name": "Fourah Bay College" },
        "faculty": { "id": 1, "name": "Engineering and Architecture" },
        "department": { "id": 1, "name": "Electrical and Electronics Engineering" }
      },
      "contact_type": "guide",
      "is_central_fallback": false,
      "is_repeat": false
    },
    "contact": {
      "type": "guide",
      "name": "Aminata Kamara",
      "whatsapp": {
        "number": "+23276555999",
        "url": "https://wa.me/23276555999?text=Hello%2C%20I%20found%20your%20contact%20through%20UniVybe%20Student%20Guidance.%20I%20am%20a%20student%20at%20Fourah%20Bay%20College%2C%20Faculty%20of%20Engineering%20and%20Architecture%2C%20Department%20of%20Electrical%20and%20Electronics%20Engineering.%20I%20need%20assistance%20with%20course%2Fmodule%20registration.%20My%20question%3A%20Which%20form%20do%20I%20need%20for%20adding%20a%20module%20after%20the%20deadline%3F%20Could%20you%20please%20help%20me%3F"
      },
      "message": "Hello, I found your contact through UniVybe Student Guidance. I am a student at Fourah Bay College, Faculty of Engineering and Architecture, Department of Electrical and Electronics Engineering. I need assistance with course/module registration. My question: Which form do I need for adding a module after the deadline? Could you please help me?"
    },
    "notice": "UniVybe has only shared this contact. Nothing is sent for you: open the WhatsApp link to start the conversation."
  }
}
```

- **Open `contact.whatsapp.url` as it is.** `contact.type` is `"guide"` or `"central"` (then `name` is "UniVybe Support" and `routing.is_central_fallback` is `true`). `contact.message` is the same text, for apps that build their own WhatsApp button.
- **`200`** with `routing.is_repeat: true`, the same `routing.id` and the same contact when this student asked for **the same category and context within the last 10 minutes** (message text is rebuilt from the new request, so a changed `question` is used). Nothing new is recorded.
- A central answer looks the same with `contact.type: "central"`: see the onboarding example in section 3.

**`422`** — the category needs more context than was given. The error names the field to ask for:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed",
  "details": { "university_id": [ "Choose your university so we can find the right guide for \"Campus Navigation\"." ] } } }
```

Other failures: `403 ACCOUNT_NOT_ACTIVE` (suspended student), `429 GUIDANCE_RATE_LIMITED` (below), `503 GUIDANCE_CONTACT_UNAVAILABLE` (below).

```json
{ "success": false, "error": { "code": "GUIDANCE_RATE_LIMITED",
  "message": "You have asked for guidance 10 times in the last 24 hours, which is the daily limit. Please try again tomorrow.",
  "details": { "limit": 10 } } }
```

```json
{ "success": false, "error": { "code": "GUIDANCE_CONTACT_UNAVAILABLE", "message": "No guidance contact is available right now. Please try again later." } }
```

`503` means no guide fits **and** no central number has been configured by an admin. Nothing was recorded. Treat it like any other failure of this service: use the app's own emergency contact.

## 3. The onboarding links — `POST /student/guidance/onboarding-help`

For the existing **"Can't find your university?" / "Can't find your faculty?" / "Can't find your department?"** links. Student token — **the student only needs to have signed in with their emailed code; onboarding does not have to be finished, and nothing on their profile is read or changed.** The UI is untouched: no form, modal or page is added; the click just resolves to a better WhatsApp link.

| field | |
| --- | --- |
| `issue` | **required**: `"university"` · `"faculty"` · `"department"` — which link was clicked. It selects the category (Missing University / Faculty / Department) |
| `university_id`, `faculty_id` | optional: whatever the student had already selected on the onboarding form |

```json
{ "issue": "faculty", "university_id": 1 }
```

- The record the student says is **missing, and everything under it, is ignored even if you send it** (`issue: "university"` ignores every id; `faculty` keeps only the university; `department` keeps the university and faculty). A student is never required to pick the thing they cannot find.
- **Nothing here can fail for lack of context.** With nothing selected the answer is a general guide or the central contact. An id that no longer exists, or a faculty that is not in the chosen university, is dropped silently (the part that still fits is kept) rather than rejected.
- The same response, statuses (`201` / `200` repeat), limits and errors as section 2. The routing record has `source: "onboarding"`. Example — a student who picked Fourah Bay College and clicked "Can't find your faculty?", no guide set up for it, so the central number is returned (`201`):

```json
{
  "success": true,
  "message": "Contact provided",
  "data": {
    "routing": {
      "id": "5bfe2210-8866-4090-a99a-c87f1b47eeae",
      "routed_at": "2026-11-10T14:03:00+00:00",
      "source": "onboarding",
      "category": { "id": 8, "key": "missing_faculty", "slug": "missing-faculty", "name": "Missing Faculty", "description": null, "required_context": "none" },
      "context": { "university": { "id": 1, "name": "Fourah Bay College" }, "faculty": null, "department": null },
      "contact_type": "central",
      "is_central_fallback": true,
      "is_repeat": false
    },
    "contact": {
      "type": "central",
      "name": "UniVybe Support",
      "whatsapp": {
        "number": "+23276000111",
        "url": "https://wa.me/23276000111?text=Hello%20UniVybe%20Support%2C%20I%20am%20contacting%20you%20through%20UniVybe%20Student%20Guidance.%20I%20am%20a%20student%20at%20Fourah%20Bay%20College.%20I%20could%20not%20find%20my%20faculty%20in%20the%20UniVybe%20list.%20Could%20you%20please%20help%20me%3F"
      },
      "message": "Hello UniVybe Support, I am contacting you through UniVybe Student Guidance. I am a student at Fourah Bay College. I could not find my faculty in the UniVybe list. Could you please help me?"
    },
    "notice": "UniVybe has only shared this contact. Nothing is sent for you: open the WhatsApp link to start the conversation."
  }
}
```

An unknown `issue` is `422` with `details.issue`.

### What the apps must change — and what must stay

**Until the apps call this endpoint, the onboarding links keep opening the number from the frontend environment, exactly as today. The backend cannot change them.**

1. **On click**, call `POST /student/guidance/onboarding-help` with `issue` and the `university_id` / `faculty_id` selected so far (omit what is not selected), using the token from `verify-otp`.
2. **Open `data.contact.whatsapp.url`.**
3. **Keep the existing environment-configured number as the emergency fallback, and use it whenever the call fails for any reason** (network error, timeout, `5xx`, `503 GUIDANCE_CONTACT_UNAVAILABLE`, `429`). Do not remove it until the new flow has been seen working in production. Never let this call block or reset onboarding.
4. **Returning from WhatsApp needs no handling**: the call changed nothing on the profile, so the form and its progress are exactly as the student left them. Clicking again within 10 minutes returns the same contact.
5. Existing OTP sign-in, `complete-onboarding` and the profile endpoints are unchanged.

---

# Part 2 — The creation-user portal (admin, educator, tutor, contributor, moderator)

## 4. Submitting a guide — `POST /tutor/guidance/guides`

Any approved admin, educator, tutor, contributor or moderator (`403` for students and for unapproved accounts, `401` for guests). `GET /tutor/guidance/guides/options` returns the categories to choose from and the limits (`max_coverage_per_guide`: 30). Build the place picker from the public `/universities`, `/universities/{id}/faculties` and `/universities/{id}/faculties/{id}/departments` endpoints.

| field | |
| --- | --- |
| `name` | required, 2–120 characters |
| `whatsapp_number` | required. Any way of typing it (`076 555 111`, `+232 76 555 111`, `0023276555111`); a Sierra Leone number is completed with +232, **any other country needs its code** (`+44 7700 900123`). Stored as `+23276555111`. Must not belong to another guide (`422`) |
| `description` | optional note for the reviewing admin (≤ 1000). **Never shown to students** |
| `category_ids` | required, ≥ 1 active category ids |
| `coverage` | required, 1–30 places, see below |
| `consent_confirmed` | **required `true`**: "this person agreed to have their WhatsApp number shared with the students they are matched with" |

A **coverage item** is one place in the existing tree — send whichever ids you have:

| item | covers |
| --- | --- |
| `{ "university_id": 1 }` | the whole university |
| `{ "university_id": 1, "faculty_id": 3 }` or `{ "faculty_id": 3 }` | the whole faculty |
| `{ "university_id": 1, "faculty_id": 3, "department_id": 12 }` or `{ "department_id": 12 }` | that department |
| `{ "all_universities": true }` | every university (a general guide; the only kind that can help a student who has no university yet) |

The same call can list many places (a single guide can cover Electrical Engineering at one university and General Admissions at another). A faculty that is not in the university, a department not in the faculty, an unknown / deleted / **inactive** place, a duplicate place (ignored) or an item with neither a place nor `all_universities` is rejected. A broader place also serves the narrower ones inside it.

```json
{
  "name": "Aminata Kamara",
  "whatsapp_number": "076 555 111",
  "description": "Final-year EEE student, knows the registration process.",
  "category_ids": [2, 3],
  "coverage": [
    { "university_id": 1, "faculty_id": 1, "department_id": 1 },
    { "faculty_id": 2 }
  ],
  "consent_confirmed": true
}
```

**`201`** — the guide is `pending`; **no student is matched to it until an admin approves it**:

```json
{
  "success": true,
  "message": "Guide submitted for review",
  "data": {
    "guide": {
      "id": "47822779-5356-46f0-9c76-e56bfe64e736",
      "name": "Aminata Kamara",
      "whatsapp_number": "+23276555111",
      "description": "Final-year EEE student, knows the registration process.",
      "approval_status": "pending",
      "rejection_reason": null,
      "is_active": true,
      "is_matchable": false,
      "categories": [
        { "id": 2, "key": null, "slug": "course-module-registration", "name": "Course/Module Registration" },
        { "id": 3, "key": null, "slug": "campus-navigation", "name": "Campus Navigation" }
      ],
      "coverage": [
        { "id": 1, "scope": "department", "label": "Fourah Bay College > Engineering and Architecture > Electrical and Electronics Engineering",
          "university": { "id": 1, "name": "Fourah Bay College" }, "faculty": { "id": 1, "name": "Engineering and Architecture" },
          "department": { "id": 1, "name": "Electrical and Electronics Engineering" }, "is_valid": true },
        { "id": 2, "scope": "faculty", "label": "Fourah Bay College > Medicine",
          "university": { "id": 1, "name": "Fourah Bay College" }, "faculty": { "id": 2, "name": "Medicine" }, "department": null, "is_valid": true }
      ],
      "consent_given_at": "2026-11-10T09:30:00+00:00",
      "has_pending_changes": false,
      "pending_changes": null,
      "changes_rejection_reason": null,
      "submitted_at": "2026-11-10T09:30:00+00:00",
      "approved_at": null,
      "created_at": "2026-11-10T09:30:00+00:00",
      "updated_at": "2026-11-10T09:30:00+00:00"
    }
  }
}
```

- `coverage[].scope` is `department` · `faculty` · `university` · `platform` (all universities, `label: "All universities"`). `is_valid: false` means a university / faculty / department on its path was deleted or deactivated since: the entry then matches nobody until it is fixed.
- `is_matchable` is the one flag that says whether students can currently be given this guide: **approved and active and not removed**.
- **Errors are reported in two stages**: shape problems (`name`, `whatsapp_number`, `category_ids`, `consent_confirmed`, a missing `coverage`) first; once those pass, the checks that need the database (`coverage.N.field`, a taken number, an inactive category) follow.

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": {
  "name": [ "The name field must be at least 2 characters." ],
  "whatsapp_number": [ "The whatsapp number must be a valid phone number with its country code, e.g. +232 76 123456." ],
  "category_ids": [ "The category ids field is required." ],
  "consent_confirmed": [ "The consent confirmed field is required." ] } } }
```

## 5. Your guides — list, show, edit, withdraw

- `GET /tutor/guidance/guides?status=pending|approved|rejected` — the guides **you** submitted, newest first, paginated. `GET /tutor/guidance/guides/{id}` — one of them (`403` for someone else's; an admin can open any). A rejected guide shows `rejection_reason`: that is the feedback to act on.
- `PUT /tutor/guidance/guides/{id}` — send only what changes (same fields as above, none required). What happens depends on the guide:
  - **pending** — the edit applies at once and it stays pending.
  - **rejected** — the edit applies and **saving resubmits it** (it becomes `pending` again).
  - **approved** — the **description** changes at once. A change to **name, WhatsApp number, categories or coverage** does **not** touch the live guide: it becomes a proposal for an admin while the approved details keep serving students. A **new number needs `consent_confirmed: true` again** (`422` otherwise). Changing a field back cancels its proposal; re-sending the live value proposes nothing.
  - **an admin's own edit** applies at once.
  - `is_active` and `approval_status` cannot be changed through an edit.
- `DELETE /tutor/guidance/guides/{id}` — withdraw your own **pending or rejected** guide. An approved one can only be removed by an admin (`403`).

An edit of an approved guide answers with what was applied and what is waiting. Here a submitter changed the number and added a department, and updated the description:

```json
{
  "success": true,
  "message": "Your changes were sent to an admin for review. The approved details stay live until then.",
  "data": {
    "guide": {
      "id": "47822779-5356-46f0-9c76-e56bfe64e736",
      "name": "Aminata Kamara",
      "whatsapp_number": "+23276555111",
      "approval_status": "approved",
      "is_active": true,
      "is_matchable": true,
      "has_pending_changes": true,
      "pending_changes": {
        "fields": [ "whatsapp_number", "coverage" ],
        "submitted_at": "2026-11-10T11:00:00+00:00",
        "whatsapp_number": "+23276555999",
        "coverage": [
          { "scope": "department", "label": "Fourah Bay College > Engineering and Architecture > Electrical and Electronics Engineering", "university": { "id": 1, "name": "Fourah Bay College" }, "faculty": { "id": 1, "name": "Engineering and Architecture" }, "department": { "id": 1, "name": "Electrical and Electronics Engineering" }, "is_valid": true },
          { "scope": "department", "label": "Fourah Bay College > Engineering and Architecture > Civil Engineering", "university": { "id": 1, "name": "Fourah Bay College" }, "faculty": { "id": 1, "name": "Engineering and Architecture" }, "department": { "id": 2, "name": "Civil Engineering" }, "is_valid": true }
        ]
      },
      "changes_rejection_reason": null,
      "...": "(the rest as in the submission response — the live name, number, categories and coverage are unchanged)"
    },
    "applied_fields": [ "description" ],
    "queued_fields": [ "whatsapp_number", "coverage" ]
  }
}
```

`pending_changes.fields` lists which of `name`, `whatsapp_number`, `category_ids`, `coverage` are waiting; the proposed values come under `name`, `whatsapp_number`, `categories` and `coverage` (resolved to names, so a reviewer can read them). After a rejection, `pending_changes` is `null` and `changes_rejection_reason` says why.

---

# Part 3 — The admin portal (`role:admin`; moderators get `403`)

## 6. Reviewing guides

- `GET /admin/guidance/guides` — filters `status`, `is_active`, `needs_review` (= pending submissions + approved guides with a change waiting: the review queue), `has_pending_changes`, `category_id`, `submitted_by`, `q` (part of the **name** — a number is deliberately not searchable, URLs are logged), `trashed=with|only`, `per_page` (max 50). Review-queue items come first. Each item has everything in section 4 plus `submitted_by`, `approved_by`, `consent_recorded_by` (`{id,name}`), `last_assigned_at`, `inquiries_count` and `removed_at`.
- `GET /admin/guidance/guides/{id|uuid}` — one guide (a **removed** one too) plus `events[]`, its audit trail:

```json
"events": [
  { "event": "submitted", "by": { "type": "creation_user", "name": "Isha Turay" }, "metadata": null, "at": "2026-11-10T09:30:00+00:00" },
  { "event": "rejected", "by": { "type": "creation_user", "name": "Adama Bangura" }, "metadata": { "reason": "Please confirm this number with the guide first." }, "at": "2026-11-10T09:40:00+00:00" },
  { "event": "approved", "by": { "type": "creation_user", "name": "Adama Bangura" }, "metadata": { "from": "rejected", "comment": "Confirmed by phone" }, "at": "2026-11-10T10:00:00+00:00" },
  { "event": "changes_proposed", "by": { "type": "creation_user", "name": "Isha Turay" }, "metadata": { "fields": [ "whatsapp_number", "coverage" ] }, "at": "2026-11-10T11:00:00+00:00" }
]
```

| action | request | result |
| --- | --- | --- |
| `PUT /guides/{guide}/approve` | optional `comment` | `pending` or `rejected` → `approved`. The places and categories are re-checked first (`422` naming the entry if one became inactive or was removed). It is **matchable only if it is also active** |
| `PUT /guides/{guide}/reject` | **`reason` required** (3–2000) | `pending` → `rejected`; the submitter reads the reason. An approved guide is not rejected: deactivate or remove it |
| `PUT /guides/{guide}/changes/approve` | optional `comment` | applies the whole proposal at once (re-checked); consent time/person come from the proposal |
| `PUT /guides/{guide}/changes/reject` | **`reason` required** | discards the proposal; the guide keeps exactly what was approved; the reason is kept for the submitter |
| `PUT /guides/{guide}/deactivate` · `/activate` | optional `note` | availability only — never touches approval, idempotent |
| `DELETE /guides/{guide}` | — | removes the guide; routing history keeps naming it |

Each returns `{ "data": { "guide": { … } } }`. Conflicts: `409 GUIDANCE_INVALID_STATE` (`{ "details": { "status": "approved" } }` — e.g. approving an approved guide, rejecting an approved one) and `409 GUIDANCE_NO_PENDING_CHANGES`.

Example — `PUT /admin/guidance/guides/{guide}/approve`:

```json
{ "success": true, "message": "Guide approved", "data": { "guide": {
  "id": "df562209-b503-4ce3-bee4-f9d67f01b5d1", "name": "Aminata Kamara", "whatsapp_number": "+23276555111",
  "approval_status": "approved", "rejection_reason": null, "is_active": true, "is_matchable": true,
  "submitted_by": { "id": 3, "name": "Isha Turay" }, "approved_by": { "id": 1, "name": "Adama Bangura" },
  "consent_recorded_by": { "id": 3, "name": "Isha Turay" }, "last_assigned_at": null, "inquiries_count": 0, "removed_at": null,
  "...": "(plus the fields of section 4)" } } }
```

## 7. Categories — `/admin/guidance/categories`

`GET` (all, with `guides_count` and `inquiries_count`), `POST`, `GET/PUT/DELETE /{id}`. Fields: `name` (unique ignoring case and spacing — "campus navigation" is "Campus Navigation"), optional `slug`, `description`, `required_context` (`none` · `university` · `faculty` · `department`: the least academic detail a student must give; default `none`), `is_active`, `sort_order`. Responses add `key`, `is_reserved`.

```json
{ "name": "Hostel Accommodation", "description": "Rooms, hostels and housing questions.", "required_context": "university" }
```
```json
{ "success": true, "message": "Guidance category created", "data": { "category": {
  "id": 10, "key": null, "slug": "hostel-accommodation", "name": "Hostel Accommodation", "description": "Rooms, hostels and housing questions.",
  "required_context": "university", "is_active": true, "sort_order": 0, "is_reserved": false, "guides_count": 0, "inquiries_count": 0,
  "created_at": "2026-11-10T14:03:00+00:00", "updated_at": "2026-11-10T14:03:00+00:00" } } }
```

- **Four categories are built in** (`is_reserved: true`; `key` = `general_inquiries`, `missing_university`, `missing_faculty`, `missing_department`): the matcher and the onboarding links depend on them. Rename and reorder them, but deactivating or deleting one is `409 GUIDANCE_CATEGORY_PROTECTED`.
- Any other category in use cannot be deleted: **deactivate it** (`PUT { "is_active": false }`) — it can no longer be chosen for new inquiries or guides, existing ones keep it. `409 GUIDANCE_CATEGORY_IN_USE` (`details.guides`, `details.inquiries`).

## 8. The central UniVybe number — `GET` / `PUT /admin/guidance/settings`

The contact a student is given when no guide fits. **Not in any env file or frontend build**: set here, used by the next request.

```json
{ "central_whatsapp": "+232 76 000 111", "note": "Student support desk" }
```
```json
{ "success": true, "message": "Central WhatsApp number updated",
  "data": { "settings": { "id": 1, "central_whatsapp": "+23276000111", "note": "Student support desk", "changed_by": "Adama Bangura", "created_at": "2026-11-10T10:05:00+00:00" }, "changed": true } }
```

`GET` returns `settings` (the current one, or `null`), `is_configured` and `history` (up to 50 versions, newest first). Saving the number that is already set answers `changed: false` and adds no history. Until one is set, requests no guide can serve fail with `503 GUIDANCE_CONTACT_UNAVAILABLE`.

## 9. Routing history — `GET /admin/guidance/inquiries` and `/inquiries/summary`

**These count contacts handed out. They cannot show that a WhatsApp message was sent, received, answered or resolved**, and they hold no question text, no phone numbers and no student email / phone / id — only the student's uuid and name (`null` for a student who has not finished onboarding).

Filters (both endpoints): `guide_id`, `student_id` (numeric ids), `category_id`, `university_id`, `source` (`general` | `onboarding`), `central` (`true` = only central-fallback assignments, `false` = only guides), `from`, `to` (dates, inclusive). The list is newest first and paginated (`per_page` max 50).

```json
{
  "success": true, "message": "Guidance inquiries retrieved successfully",
  "data": [
    {
      "id": "eba53d94-8761-46d3-b6f3-8c2c540e844c",
      "routed_at": "2026-11-10T14:03:00+00:00",
      "source": "onboarding",
      "category": { "id": 8, "key": "missing_faculty", "name": "Missing Faculty" },
      "university": { "id": 1, "name": "Fourah Bay College" },
      "faculty": null,
      "department": null,
      "is_central_fallback": true,
      "match_tier": "central",
      "guide": null,
      "student": { "id": "81ac9d4c-9516-4e98-948d-9413576cef3d", "name": null }
    }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 5, "total": 4, "from": 1, "to": 4 }
}
```

`guide` is `{ id, name, is_removed }` when a guide was named (a removed guide still shows, flagged), `null` for the central contact. `match_tier` (`department_exact` … `central`) says why that contact was chosen.

```json
{
  "success": true, "message": "Guidance routing summary retrieved successfully",
  "data": {
    "totals": { "routed": 4, "to_guides": 1, "to_central": 3, "general": 2, "onboarding": 2 },
    "by_category": [ { "category": { "id": 4, "key": null, "name": "Fees & Administrative Processes" }, "count": 1 } ],
    "by_guide": [ { "guide": { "id": "df562209-b503-4ce3-bee4-f9d67f01b5d1", "name": "Aminata Kamara", "approval_status": "approved", "is_active": true, "is_removed": false }, "count": 1, "last_routed_at": "2026-11-10T14:00:00+00:00" } ],
    "by_match_tier": [ { "match_tier": "central", "count": 3 }, { "match_tier": "department_exact", "count": 1 } ]
  }
}
```

`to_central` over a period is the closest thing to a coverage-gap report: it is how often no approved, active guide fitted.

---

# Compatibility and security notes

- **Nothing existing changed.** Every endpoint above is new; student auth (`verify-otp`, `complete-onboarding`, login), the profile, creation-user roles and the academic hierarchy endpoints are untouched. No existing response gained or lost a field.
- **A guide's WhatsApp number** is in exactly three places: the answer to the student's own request, the submitter's own guide, and the admin's guide views. It is in no list or lookup for students or the public, not in the routing history, not in logs, and not in any URL the API logs.
- **Limits**: 10 requests/minute per student, 10 **new** contacts per student per rolling 24 hours, the same request within 10 minutes returns the same contact. All three are configuration (`GUIDANCE_REQUESTS_PER_MINUTE`, `GUIDANCE_MAX_ROUTINGS_PER_DAY`, `GUIDANCE_DEDUPE_MINUTES`).
- **Nothing is sent automatically** and there is no chat, WhatsApp Business API, AI guidance, ticket, rating, delivery tracking or notification in V1.
- **WhatsApp shows the student's own phone number to whoever they message.** That is how WhatsApp works; the generated message adds no other personal detail.
