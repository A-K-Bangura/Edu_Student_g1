# Academic Module Registry — API reference

_Added 2026-10-27. Base URL, auth headers and the response envelope are the same as in `STUDENT_API_PAYLOADS.md` / `CREATION_USER_API_PAYLOADS.md`._

## What an academic module is (and is not)

An **academic module** is an *official university module* — `EEE 101 — Circuit Theory I` — kept in one central registry that **only admins** can edit. A UniVybe course may *optionally* point at one, purely so students can find it by the module name or code they already know. It is **not** a container for lessons: it has nothing to do with a course's own internal `modules` (`Course → Modules → Lessons → Mini-lessons`), which are unchanged. A course keeps its own title; the module's title never replaces it.

- The **code and the title are one record**. They are always returned together. A course never carries free-text module fields — it references a registered module by id (`academic_module_id`).
- **Scopes.** `faculty` — belongs to a faculty and is offered to every department of that faculty. `department` — belongs to one department only. A department module's faculty and university are read through the existing University → Faculty → Department hierarchy, never copied.
- Everything is **optional and additive**: a course can have no university, faculty, department or module; existing courses and existing clients are unaffected.

### The `academic_module` object

The same compact shape is used in the module lists below and embedded in course payloads as `academic_module` (`null` when the course has none).

```json
{
    "id": 12,
    "code": "EEE 101",
    "title": "Circuit Theory I",
    "label": "EEE 101 — Circuit Theory I",
    "scope": "department",
    "is_active": true,
    "university": { "id": 1, "name": "Fourah Bay College" },
    "faculty": { "id": 3, "name": "Engineering and Architecture" },
    "department": { "id": 7, "name": "Electrical and Electronics Engineering" }
}
```

- `label` is `"{code} — {title}"`, ready to render. `code` keeps the official formatting exactly as the admin typed it.
- `scope` tells a picker how to group the entries (`faculty` | `department`). For a faculty module `department` is `null`.
- `is_active: false` means the module was retired: courses that already have it keep showing it, but it can no longer be assigned to a course.

## 1. Pick a module for a course / filter by module (public)

### `GET /api/v1/academic-modules`

No authentication, like the university lists. Returns the **active** modules of **one academic context** — never the whole registry. At least one of `department_id`, `faculty_id`, `university_id` is required (`422` otherwise), and the ids given must agree (department in faculty, faculty in university).

| Param | Type | Notes |
| ----- | ---- | ----- |
| `department_id` | integer | The modules a course in this department may use: its **faculty's faculty-level modules plus the department's own**. Nothing from sibling departments. |
| `faculty_id` | integer | Only that faculty's **faculty-level** modules (`scope=faculty`). To also get a department's, call again with its `department_id`. |
| `university_id` | integer | Every module under the university (both scopes). |
| `scope` | `faculty` \| `department` | Narrows any of the above. |
| `search` | string (max 100) | Module title, or code **ignoring case, spaces and punctuation** (`eee101`, `EEE-101`, `eee 101` all find `EEE 101`). |
| `per_page` | integer | Default 15, max 50. |

Modules of an inactive faculty/department/university, and inactive modules, are not listed.

```json
{
    "success": true,
    "message": "Academic modules retrieved successfully",
    "data": [
        { "id": 9,  "code": "ENG 101", "title": "Engineering Mathematics I", "label": "ENG 101 — Engineering Mathematics I", "scope": "faculty",
          "is_active": true, "university": { "id": 1, "name": "Fourah Bay College" }, "faculty": { "id": 3, "name": "Engineering and Architecture" }, "department": null },
        { "id": 12, "code": "EEE 101", "title": "Circuit Theory I", "label": "EEE 101 — Circuit Theory I", "scope": "department",
          "is_active": true, "university": { "id": 1, "name": "Fourah Bay College" }, "faculty": { "id": 3, "name": "Engineering and Architecture" },
          "department": { "id": 7, "name": "Electrical and Electronics Engineering" } }
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 2, "from": 1, "to": 2 }
}
```

Items are ordered by code (case/space-insensitive), then title. The frontend decides how to group them using `scope`.

## 2. Choose a module on a course (creators)

`POST /api/v1/tutor/courses` and `PUT /api/v1/tutor/courses/{course}` accept one new optional field:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `academic_module_id` | integer \| `null` | The id of a registered module. **Optional.** On update, `null` clears it; leaving the key out leaves it as it is. |

The module is checked against the course's own `university_id` / `faculty_id` / `department_id` (as they will be after the request):

- A **faculty module** fits a course of that faculty (the course's faculty may be given directly or through its department).
- A **department module** fits only a course of that department.
- A module of an unrelated university, faculty or department is rejected. So is a course with no faculty/department at all (a university alone is not enough), and a course whose department is not in its faculty / faculty not in its university.
- A module that is **inactive** cannot be newly assigned.
- **Changing the course's university/faculty/department revalidates the module it already has.** If it no longer fits, the update is rejected (nothing is saved) with `422` on `academic_module_id`; resend the request with a module that fits, or with `academic_module_id: null`.
- An unrelated edit (title, tags, …) is never blocked by a module that was deactivated after it was assigned, and re-sending the same module id unchanged is not treated as assigning it again.

All of these fail with the standard validation envelope:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": { "academic_module_id": ["EEE 101 — Circuit Theory I belongs to a different department than this course."] }
    }
}
```

Course responses (`POST`/`PUT`/`GET /tutor/courses…`, `publish`) now include `academic_module_id` and `academic_module` (the object above, or `null`). Many courses can share one module.

## 3. Discover courses by module (students)

`GET /api/v1/student/courses` (public, paginated) now also:

- matches `search` against the **module's title and code** as well as the course's title/description — `search=EEE 101`, `search=eee101` and `search=Circuit Theory` all return the courses tagged with that module; ordinary title/description search is unchanged;
- accepts **`academic_module_id`** (integer): only courses tagged with that module. For a faculty module this naturally spans all departments of the faculty. Unknown ids simply match nothing; a non-integer is a `422`.

They combine with the existing `university_id`, `faculty_id`, `department_id`, `organization_id`, `level`, sorting and `page` / `per_page`.

Every course in the list, the course details, `GET /student/courses/enrolled` and the progress response carries `academic_module` (the object above, or `null`). It reflects admin edits immediately, so a client never needs a second request per course.

`GET /api/v1/student/search/courses?q=…` (and the global `GET /student/search`) also match module code/title, accept `academic_module_id`, and put `academic_module` on each result. The tutor `search/my-courses`, admin `search/courses`, and the admin/tutor course lists (`search=`) find courses by module too; the admin course list additionally accepts `academic_module_id`.

## 4. Admin management

All under `/api/v1/admin/academic-modules`, **admin only** (`401` without a token, `403` for students, tutors, educators and contributors).

### `GET /admin/academic-modules`

Lists modules, **active or not**, each with `courses_count`, `created_at`, `updated_at`.

| Param | Notes |
| ----- | ----- |
| `university_id` | every module under the university |
| `faculty_id` | every module under the faculty: its own **and** its departments' |
| `department_id` | only that department's own modules (the faculty's are `faculty_id` + `scope=faculty`) |
| `scope` | `faculty` \| `department` |
| `is_active` | `true`/`false`/`1`/`0` |
| `search` | title, or code ignoring case/spaces/punctuation |
| `per_page` | default 15, max 100 |

### `POST /admin/academic-modules`

Follows the hierarchy University → Faculty → (Department) → module.

```json
// faculty module
{ "scope": "faculty", "university_id": 1, "faculty_id": 3, "code": "ENG 101", "title": "Engineering Mathematics I" }

// department module
{ "scope": "department", "university_id": 1, "faculty_id": 3, "department_id": 7, "code": "EEE 101", "title": "Circuit Theory I", "is_active": true }
```

| Field | Rules |
| ----- | ----- |
| `scope` | required, `faculty` or `department` |
| `university_id`, `faculty_id` | required, must exist, and the faculty must belong to the university (`422` on `faculty_id` otherwise) |
| `department_id` | required when `scope=department` (must belong to the faculty, else `422` on `department_id`); **not allowed** for a faculty module |
| `code` | required, ≤ 30 chars, starts with a letter/digit, only letters, digits, space and `. _ / -` |
| `title` | required, ≤ 255 chars |
| `is_active` | optional, default `true` |

Returns `201` with `{ "data": { "academic_module": { …object, plus courses_count, created_at, updated_at } } }`.

**Duplicates (`422` on `code`).** Codes are compared after normalising: upper-case letters and digits only, so `CSC101`, `CSC 101` and `csc-101` are the same code (the typed formatting is what is stored and shown). A code must be unique **within its faculty** (faculty modules) and **within its department** (department modules). The same code is allowed in a different faculty, university or department. A department module also may not reuse a code of its own faculty's faculty-level modules, nor the reverse (both appear in that department's picker). Titles are never compared: two modules with the same or similar titles but different codes are distinct. The message names the module that already has the code, and says if it is inactive (reactivate that one instead).

### `GET /admin/academic-modules/{id}`, `PUT /admin/academic-modules/{id}`

`PUT` accepts any of `code`, `title`, `is_active`, and the association (`scope`, `university_id`, `faculty_id`, `department_id`); whatever is not sent keeps its value. Retitling, recoding and (de)activating are always allowed and courses show the new text at once. **Moving** a module to another faculty/department/scope is validated like a create (hierarchy, duplicates at the destination) and is refused with `409 ACADEMIC_MODULE_IN_USE` while any course uses it.

### `DELETE /admin/academic-modules/{id}`

Deletes a module **no course has ever used** (the code becomes free again). If any course — a deleted one included — references it: `409`

```json
{ "success": false, "error": { "code": "ACADEMIC_MODULE_IN_USE", "message": "This academic module is used by 3 course(s) and cannot be deleted. Deactivate it instead (is_active = false): its courses keep it, but it can no longer be assigned to new ones.", "details": { "courses_count": 3 } } }
```

To retire a module that is in use, `PUT { "is_active": false }`: no course, enrollment, progress or content changes; the courses keep it (shown with `is_active: false`) and stay discoverable by it.

### Effects on the rest of the academic tree

- `DELETE /admin/faculties/{id}` and `/admin/departments/{id}` additionally refuse with `422 FACULTY_HAS_ACADEMIC_MODULES` / `DEPARTMENT_HAS_ACADEMIC_MODULES` while the faculty (or any of its departments) / department owns modules.
- `PUT /admin/faculties/{id}` with a different `university_id`, and `PUT /admin/departments/{id}` with a different `faculty_id`, are refused with the same codes while modules would move with them. Renaming is unaffected.
