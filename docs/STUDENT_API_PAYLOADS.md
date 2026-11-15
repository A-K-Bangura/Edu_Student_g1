# Student API - Complete Payload Guide

This document provides complete payload examples, explanations, and response structures for all student API endpoints, verified directly against the current backend implementation (controllers, form requests, and services) as of 2026-09-25.

**A note on accuracy**: every request/response shape below reflects what the code actually does today, not an idealized or planned version. Where the real backend has a quirk, an inconsistency, or a known limitation, it is called out inline with a "⚠️ Known issue" note rather than smoothed over — so you can build against reality and know what to expect.

---

## Base URL

All endpoints are prefixed with: `/api/v1/student`

**Base URL Example**: `https://api.edulift.com/api/v1/`

---

## Authentication

Most endpoints require authentication using Laravel Sanctum bearer tokens.

**Header Format**:

```http
Authorization: Bearer {sanctum_token}
Content-Type: application/json
Accept: application/json
```

Tokens are minted at login/OTP-verification and expire after `SANCTUM_TOKEN_EXPIRATION` minutes (see `config/sanctum.php`; defaults to 1440 minutes / 24 hours if unset).

---

## Response Envelope

**Every** successful response follows this shape:

```json
{
    "success": true,
    "message": "Human-readable summary",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": { "...": "..." }
}
```

The `data` key is **omitted entirely** (not `null` or `[]`) when a controller returns no payload — this happens on several endpoints below (e.g. Logout, Unenroll). Don't assume `data` is always present.

**Every** error response follows this **nested** shape — there is no flat `message`/`error_code` at the top level anywhere in this API:

```json
{
    "success": false,
    "error": {
        "code": "SOME_ERROR_CODE",
        "message": "Human-readable error message",
        "details": { "...": "optional, present on some errors" }
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

**Validation errors (422)** from a Laravel Form Request use this same nested shape, with the field-level messages under `error.details`:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {
            "email": ["The email field is required."]
        }
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Dashboard](#dashboard)
3. [Profile Management](#profile-management)
4. [Course Management](#course-management)
5. [Content (Modules/Lessons/Mini-Lessons/Quizzes)](#content-management)
6. [Gamification](#gamification)
7. [Leaderboard](#leaderboard)
8. [Feed/Social](#feed-social)
9. [Analytics](#analytics)
10. [Search](#search)
11. [File Uploads](#file-uploads)
12. [Vybe Coins](#vybe-coins) — wallet, coin history, exchange to Leones (Mobile Money)
13. [Roadmaps](#roadmaps) — ordered learning journeys over courses: discovery, progress, current course, paginated sequence, completion badge
14. [Resources](#resources) — the academic resource library: browse/search files and links, the daily free allowance, opening/downloading, and buying extra access packs
15. [Opportunities](#opportunities) — scholarships, internships, jobs, competitions and more: public browse/search/filter, open vs closed (decided by the server), external action links
16. [Gigs](#gigs) — small jobs students post and take on: public browse/search/filter, "Interested / contact the creator" (interest recorded before the creator's WhatsApp/email is returned), applicant limits and deadlines decided by the server, ratings and the gig reputation on student profiles, posting gigs as a student

**Note**: Students can have academic levels `UnderGrad`, `100`, `200`, `300`, `400`, `500`, or `graduate`. Students with `UnderGrad` or `graduate` levels are associated with an `Organization` instead of a University/Faculty/Department; regular-level (100-500) students use the University/Faculty/Department hierarchy. A student cannot have both at once — setting one clears the other (see [Update Profile](#9-update-profile)). **`general` is not a student level** (sending it on onboarding or profile update is a `422`): it exists only as a level a *course* or *roadmap* can have, meaning "wider audience, not tied to one academic year" — so a course/roadmap `level` you display may be `"general"` while a student's own `level` never is.

---

# Authentication Endpoints

## 1. Login

### `POST /api/v1/student/auth/login`

**Purpose**: Authenticate an existing student with email/phone and password.

**Authentication**: Not required

**Rate limit**: `throttle:login` (see `App\Providers\ApiServiceProvider`)

### Request Payload

#### Login with Email

```json
{
    "email": "student@university.edu",
    "password": "SecurePassword123!"
}
```

#### Login with Phone

```json
{
    "phone": "+23280123456",
    "password": "SecurePassword123!"
}
```

### Request Fields Explained

| Field      | Type   | Required | Description                                            |
| ---------- | ------ | -------- | ------------------------------------------------------ |
| `email`    | string | Yes\*    | Student email address (required if phone not provided) |
| `phone`    | string | Yes\*    | Student phone number (required if email not provided)  |
| `password` | string | Yes      | Account password                                       |

**Note**: Either `email` OR `phone` must be provided.

⚠️ **Note**: `email`/`phone` are validated with `exists:students,email` / `exists:students,phone`. An **unknown** email or phone therefore fails as a standard `422 VALIDATION_ERROR` *before* the login logic ever runs — the `INVALID_CREDENTIALS` (401) response below is only reachable for a **known** email/phone with the **wrong password**, not for a nonexistent account.

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Login successful",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "token": "1|abcdefghijklmnopqrstuvwxyz1234567890",
        "token_type": "Bearer",
        "expires_in": 2592000,
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "student@university.edu",
            "firstname": "John",
            "lastname": "Doe",
            "full_name": "John Doe",
            "avatar_url": null,
            "xp_total": 250,
            "streak_days": 3,
            "university": { "id": 1, "name": "University of Sierra Leone" },
            "faculty": { "id": 2, "name": "Faculty of Engineering" },
            "department": { "id": 5, "name": "Computer Science" },
            "organization": null,
            "level": "300",
            "status": "active"
        }
    }
}
```

`token_type` and `expires_in` (seconds) are top-level fields alongside `token`. `university`/`faculty`/`department` are `null` for `UnderGrad`/`graduate` students, who have `organization` populated instead (and vice versa for regular-level students) — both are always present in this response now. `expires_in` reflects a **30-day** token lifetime (`SANCTUM_TOKEN_EXPIRATION=43200` minutes) — this is a platform-wide Sanctum setting, so Tutor/Admin tokens share the same lifetime.

#### Example: UnderGrad/graduate student (organization-affiliated)

```json
{
    "university": null,
    "faculty": null,
    "department": null,
    "organization": { "id": 3, "name": "Sierra Leone Institute of Technology" },
    "level": "UnderGrad",
    "status": "active"
}
```

### Error Responses

#### Invalid Credentials (401)

```json
{
    "success": false,
    "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid credentials"
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

#### Account Inactive (403)

```json
{
    "success": false,
    "error": {
        "code": "ACCOUNT_INACTIVE",
        "message": "Your account is not active. Please contact support."
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

#### Unknown email/phone (422)

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {
            "email": ["The selected email is invalid."]
        }
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

---

## 2. Send OTP

### `POST /api/v1/student/auth/send-otp`

**Purpose**: Send a 6-digit one-time verification code by email, for login/registration without a password.

**Authentication**: Not required

**Rate limit**: `throttle:otp`

### Request Payload

```json
{
    "email": "student@university.edu"
}
```

### Request Fields Explained

| Field   | Type   | Required | Description                    |
| ------- | ------ | -------- | ------------------------------ |
| `email` | string | Yes      | Email address to send the OTP to |

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "OTP sent successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "message": "OTP sent successfully",
        "expiry_minutes": 10
    }
}
```

⚠️ Note the response echoes `expiry_minutes` (an integer count of **minutes**, currently `10`), not `expires_in`/seconds, and does **not** echo the `email` back.

### Error Responses

#### Too Many Requests (429, via `throttle:otp`)

Standard Laravel throttle response — not a custom envelope.

#### Rate-limited by OTP service (422)

```json
{
    "success": false,
    "error": {
        "code": "OTP_RATE_LIMITED",
        "message": "Too many OTP requests. Please try again later.",
        "details": { "retry_after_seconds": 3540 }
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

---

## 3. Verify OTP

### `POST /api/v1/student/auth/verify-otp`

**Purpose**: Verify a previously-sent OTP and authenticate. Creates a new `Student` record automatically on the **first** successful verification for a given email (with a random unusable password), so this endpoint doubles as registration.

**Authentication**: Not required

**Rate limit**: `throttle:otp`

### Request Payload

```json
{
    "email": "student@university.edu",
    "otp": "123456"
}
```

### Request Fields Explained

| Field   | Type   | Required | Description                       |
| ------- | ------ | -------- | ---------------------------------- |
| `email` | string | Yes      | Email address the OTP was sent to |
| `otp`   | string | Yes      | The 6-digit code (exactly 6 digits)|

### Response Example (Success - 200)

Same `user` shape as [Login](#1-login) (`avatar_url`, `xp_total`, `streak_days`, `level`, `status`, `university`, `faculty`, `department`, `organization`), plus `token`/`token_type`/`expires_in`. There is **no `is_onboarded` field anywhere in this response** — determine onboarding status client-side from whether `firstname`/`lastname`/`university` etc. are populated, or call [Complete Onboarding](#4-complete-onboarding) unconditionally on first login and let the backend no-op/update as needed.

```json
{
    "success": true,
    "message": "OTP verified successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "token": "2|abcdefghijklmnopqrstuvwxyz1234567890",
        "token_type": "Bearer",
        "expires_in": 2592000,
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "student@university.edu",
            "firstname": null,
            "lastname": null,
            "full_name": null,
            "avatar_url": null,
            "xp_total": 0,
            "streak_days": 0,
            "university": null,
            "faculty": null,
            "department": null,
            "organization": null,
            "level": null,
            "status": "active"
        }
    }
}
```

(On this first-verification/registration path, `level` is always `null` and `university`/`faculty`/`department`/`organization` are always `null` — none of these are set until [Complete Onboarding](#4-complete-onboarding) runs.)

### Error Responses

#### Invalid OTP (422)

```json
{
    "success": false,
    "error": {
        "code": "INVALID_OTP",
        "message": "Invalid or expired verification code",
        "details": { "remaining_attempts": 2 }
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

Note `remaining_attempts` is nested under `error.details`, not top-level `data`.

---

## 4. Complete Onboarding

### `POST /api/v1/student/auth/complete-onboarding`

**Purpose**: Fill in the profile fields collected right after first sign-in.

**Authentication**: Required (`auth:sanctum`)

### Request Payload

#### For Regular Academic Levels (100-500)

```json
{
    "firstname": "John",
    "lastname": "Doe",
    "level": "300",
    "university_id": 1,
    "faculty_id": 2,
    "department_id": 5,
    "student_id": "STU2024001",
    "phone": "+23280123456",
    "date_of_birth": "2000-05-15",
    "gender": "male",
    "password": "SecurePass123",
    "password_confirmation": "SecurePass123"
}
```

#### For UnderGrad or Graduate Levels

```json
{
    "firstname": "Jane",
    "lastname": "Smith",
    "level": "UnderGrad",
    "organization_id": 3,
    "phone": "+23280123457",
    "password": "SecurePass123",
    "password_confirmation": "SecurePass123"
}
```

### Request Fields Explained

| Field            | Type    | Required                          | Description |
| ---------------- | ------- | ---------------------------------- | ------------ |
| `firstname`      | string  | Yes                                 | |
| `lastname`       | string  | Yes                                 | |
| `level`          | string  | Yes — one of `UnderGrad,100,200,300,400,500,graduate` | |
| `university_id`  | integer | Yes, for levels 100-500             | |
| `faculty_id`     | integer | Yes, for levels 100-500             | |
| `department_id`  | integer | Yes, for levels 100-500             | |
| `organization_id`| integer | Yes, for `UnderGrad`/`graduate`     | |
| `student_id`     | string  | Yes, for levels 100-500             | |
| `phone`          | string  | No                                  | |
| `date_of_birth`  | date    | No — was previously documented as required; it is not | |
| `gender`         | string  | No, one of `male,female,other` — was previously documented as required; it is not | |
| `password`       | string  | **Yes** — min 8 chars, must match `password_confirmation`. The OTP-created account has a random unusable password (see [Verify OTP](#3-verify-otp)); this is where the student actually sets their real one. **Was missing from this table entirely** — the same gap already caught and fixed on the Tutor side (`KNOWN_ISSUES.md` #25) had never been applied here. |
| `password_confirmation` | string | **Yes** — must exactly match `password` (Laravel's `confirmed` rule requires this exact field name, not `confirm_password`). | |

(See ####Fetching-dropdown-options-(university/faculty/department/organization) for how to get university/faculty/department/organization options)

### Response Example (Success - 200)

Same shape as Login's `user` object. ⚠️ **Note**: there is no `is_onboarded` field in the response (nor anywhere else in the API) — infer onboarding completion from whether `firstname`, `lastname`, and the relevant affiliation fields are populated.

### Error Responses

#### Validation Error (422)

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {
            "university_id": ["The university id field is required when level is 300."]
        }
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

---

## 5. Logout

### `POST /api/v1/student/auth/logout`

**Purpose**: Revoke the current Sanctum token.

**Authentication**: Required

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Logged out successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

⚠️ There is **no `data` key** in this response at all (not `[]`) — the controller passes `null`, which `ApiResponse::success()` omits entirely.

---

## 6. Get Profile (Auth)

### `GET /api/v1/student/auth/profile`

**Purpose**: Get the currently authenticated student's identity summary (lighter-weight than [Get Profile](#8-get-profile) under Profile Management).

**Authentication**: Required

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Profile retrieved successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "student@university.edu",
            "firstname": "John",
            "lastname": "Doe",
            "full_name": "John Doe",
            "phone": "+23280123456",
            "date_of_birth": "2000-05-14",
            "gender": "male",
            "avatar_url": null,
            "bio": null,
            "xp_total": 2450,
            "streak_days": 3,
            "last_activity_date": "2026-09-25",
            "university": { "id": 1, "name": "University of Sierra Leone" },
            "faculty": { "id": 2, "name": "Faculty of Engineering" },
            "department": { "id": 5, "name": "Computer Science" },
            "organization": null,
            "level": "300",
            "student_id": "STU123456",
            "status": "active",
            "preferences": null,
            "created_at": "2026-01-10T09:00:00.000000Z",
            "last_login_at": "2026-09-25T11:45:00.000000Z"
        }
    }
}
```

This response now always includes `organization` (previously missing entirely — a student whose affiliation is `organization_id`-based, i.e. `UnderGrad`/`graduate`, would show `university`/`faculty`/`department` all `null` here with no indication of their actual organization). It is `null` for university-affiliated students and populated the same way for organization-affiliated ones as shown in [Login](#1-login)'s UnderGrad/graduate example.

Note this response's field set differs from [Login](#1-login)/[Verify OTP](#3-verify-otp)'s `user` object — it additionally includes `phone`, `date_of_birth`, `gender`, `bio`, `last_activity_date`, `student_id`, `preferences`, `created_at`, `last_login_at` (a richer identity summary); don't assume the two shapes are identical.

---

# Dashboard

## 7. Get Dashboard

### `GET /api/v1/student/dashboard`

**Purpose**: Aggregated home-screen data: stats, recent activity, enrolled courses, badges, leaderboard position, streak/XP summaries.

**Authentication**: Required

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Dashboard data retrieved successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "student": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "John Doe",
            "avatar_url": null,
            "level": "300",
            "score_level": 3,
            "total_xp": 2450,
            "coins": { "available": 500, "reserved": 0, "redeemed": 0, "total_earned": 500 },
            "profile_completion": 85
        },
        "stats": {
            "enrolled_courses": 4,
            "completed_courses": 1,
            "in_progress_courses": 3,
            "lessons_completed": 18,
            "quizzes_passed": 12,
            "badges_earned": 5,
            "current_streak": 3
        },
        "recent_activity": [
            {
                "action_type": "lesson_completion",
                "reason": "Completed lesson: Introduction to Variables",
                "xp_change": 10,
                "created_at": "2026-09-24T18:00:00.000000Z"
            }
        ],
        "enrolled_courses": [
            {
                "id": 1,
                "title": "Intro to Programming",
                "thumbnail_url": null,
                "progress_percentage": 45.5,
                "status": "in_progress"
            }
        ],
        "progress_summary": {
            "courses": { "total": 4, "completed": 1, "in_progress": 3 },
            "lessons": { "total": 40, "completed": 18 },
            "quizzes": { "total": 20, "completed": 12 }
        },
        "badges": [
            {
                "badge": { "id": 1, "name": "First Steps", "icon_url": null, "rarity": "common" },
                "has_badge": true,
                "progress": 100,
                "awarded_at": "2026-09-01T00:00:00.000000Z"
            }
        ],
        "streak_stats": {
            "current_streak": 3,
            "longest_streak": 10,
            "active_days": 45,
            "average_activity": 2.1,
            "streak_history": []
        },
        "xp_stats": {
            "total_xp": 2450,
            "xp_by_action": { "lesson_completion": 1200, "quiz_completion": 800 },
            "recent_xp": 120
        }
    }
}
```

Important notes:
- `student.level` is the same raw academic level string used everywhere else in the API (`"100"`-`"500"`/`UnderGrad`/`graduate`). `student.score_level` is a separate, new field: a plain integer (e.g. `3`) computed via `XpService::calculateLevel()`'s progressive formula (each level requires more XP than the last) — this is the XP-tier number, distinct from the academic `level`.
- `badges` is the **entire badge catalog** (earned and unearned), not just earned ones — filter client-side on `has_badge === true` if you only want earned badges.
- `achievements` and `leaderboard_position` were **removed** from this response (they duplicated data already available from the dedicated Gamification endpoints — see [Get Achievements](#33-get-achievements) and [Get Leaderboard Position](#31-get-leaderboard-position)).

---
# Profile Management

## 8. Get Profile

### `GET /api/v1/student/profile`

**Purpose**: Get the full profile, including academic affiliation and preferences.

**Authentication**: Required

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Profile retrieved successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "student": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "student@university.edu",
            "firstname": "John",
            "lastname": "Doe",
            "full_name": "John Doe",
            "phone": "+23280123456",
            "date_of_birth": "2000-05-15",
            "gender": "male",
            "avatar_url": null,
            "bio": null,
            "interests": ["programming", "music"],
            "university": { "id": 1, "name": "University of Sierra Leone", "logo_url": null },
            "faculty": { "id": 2, "name": "Faculty of Engineering" },
            "department": { "id": 5, "name": "Computer Science" },
            "organization": null,
            "student_id": "STU2024001",
            "level": "300",
            "year_of_study": "300",
            "score_level": 3,
            "xp_total": 2450,
            "coins": { "available": 500, "reserved": 0, "redeemed": 0, "total_earned": 500 },
            "streak_days": 3,
            "gpa": null,
            "status": "active",
            "verified_at": null,
            "preferences": { "theme": "dark", "notifications": true },
            "social_links": null,
            "created_at": "2026-01-15T00:00:00.000000Z",
            "updated_at": "2026-09-20T14:30:00.000000Z",
            "last_login_at": "2026-09-25T08:00:00.000000Z",
            "profile_completion": 85
        }
    }
}
```

This response now includes `level` (raw academic string), `xp_total`, `streak_days`, `updated_at`, and `organization` (all previously missing despite being real columns/relations on the model), plus a new `score_level` field.

- `level` and `year_of_study` are deliberately the **same value** — the raw academic level string (e.g. `"300"`, or `"UnderGrad"`/`"graduate"`). `year_of_study` is kept only as an alias for backward compatibility; prefer `level`.
- `score_level` is the **XP-tier** integer, computed via `XpService::calculateLevel($student->xp_total)` — an entirely different number from the academic `level`/`year_of_study`. This is the field to show if you want a gamification "level" (e.g. "Level 3"), consistent with the same field on [Get Dashboard](#7-get-dashboard), [Update Profile](#9-update-profile), and [Get Gamification Dashboard](#27-get-gamification-dashboard)'s `xp_stats`.
- `organization` is `null` for university-affiliated students, and populated (with `university`/`faculty`/`department` all `null`) for `UnderGrad`/`graduate` students — same pattern as [Login](#1-login).

---

## 9. Update Profile

### `PUT /api/v1/student/profile`

**Purpose**: Update basic info, academic affiliation, or preferences.

**Authentication**: Required

### Request Payload

#### Basic Update

```json
{
    "firstname": "John",
    "lastname": "Doe",
    "phone": "+23280123456",
    "bio": "Computer science student",
    "interests": ["programming", "music", "sports"]
}
```

#### University Affiliation Update

```json
{
    "university_id": 1,
    "faculty_id": 2,
    "department_id": 5,
    "student_id": "STU2024001",
    "year_of_study": 3
}
```

### Request Fields Explained

| Field             | Type    | Required | Notes |
| ----------------- | ------- | -------- | ----- |
| `firstname`       | string  | No       | |
| `lastname`        | string  | No       | |
| `phone`           | string  | No       | |
| `date_of_birth`   | date    | No       | Must be before today |
| `gender`          | string  | No       | `male`,`female`,`other` |
| `bio`             | string  | No       | Max 1000 chars |
| `interests`       | array   | No       | Max 10 items |
| `university_id`   | integer | No       | See ⚠️ below — not `exists`-validated at the form level |
| `faculty_id`      | integer | No       | Must belong to `university_id`; enforced manually |
| `department_id`   | integer | No       | Must belong to `faculty_id`; enforced manually |
| `organization_id` | integer | No       | **Is** validated with `exists:organizations,id` at the form level (inconsistent with the three fields above) |
| `level`           | string  | No       | `UnderGrad,100,200,300,400,500,graduate` |
| `year_of_study`   | integer | No       | 1-10; converted server-side to `level` format (`year_of_study * 100`) when `level` isn't also sent |
| `student_id`      | string  | No       | Unique per student |
| `preferences`     | object  | No       | |
| `social_links`    | object  | No       | `linkedin`/`twitter`/`github`/`portfolio`, each validated as a URL if present |

⚠️ **Note — existence checking**: `university_id`/`faculty_id`/`department_id` are only validated as `integer` at the form-request level (no `exists:` rule). Existence (and the university→faculty→department relationship) is instead checked **manually in the controller**, which returns dedicated 404 error codes — see below. This is intentional (it lets the controller enforce the parent-child relationship, which a simple `exists:` rule can't express), but it means a generic "must exist" validation message will never appear for these three fields; you'll get the specific 404 codes below instead.

#### Fetching dropdown options (university/faculty/department/organization)

These four IDs are meant to be populated from **public, unauthenticated** endpoints (`routes/api/v1.php`'s "Public Routes" group) rather than hardcoded — the frontend should fetch the current list and let the student pick, then submit the chosen ID here.

| Method & Path | Purpose |
| --- | --- |
| `GET /api/v1/universities` | List active universities (paginated, searchable by `name`/`code`/`country`/`state`). Each item: `id, name, code, country, city, website, description, faculties_count, is_active`. |
| `GET /api/v1/universities/{university}` | Single active university's detail (adds `created_at`); `404` if inactive. |
| `GET /api/v1/universities/{university}/faculties` | Paginated active faculties of that university (searchable by `name`/`code`). Each item: `id, name, code, description, departments_count, is_active`. |
| `GET /api/v1/universities/{university}/faculties/{faculty}/departments` | Paginated active departments of that faculty (validates the faculty actually belongs to the university). Each item: `id, name, code, description, is_active`. |
| `GET /api/v1/organizations` | List active organizations (paginated, searchable by `name`/`code`/`description`, filterable by `country`). Each item: `id, name, code, country, city, website, description, is_active`. |
| `GET /api/v1/organizations/{organization}` | Single active organization's detail (adds `created_at`); `404` if inactive. |

None of these require a `Bearer` token. All are served by `Shared\UniversityController`/`Shared\OrganizationController` and share this API's standard `{success, message, data}` envelope.

⚠️ **Note — cascading resets**: changing `university_id` resets `faculty_id`/`department_id`/`organization_id` to `null` server-side. Changing `faculty_id` resets `department_id`. Changing `level` to/from `UnderGrad`/`graduate` resets the university/organization affiliation accordingly. None of this is surfaced in the response. Changing from the top level means reselecting corresponding lower level options.

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Profile updated successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "student": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "student@university.edu",
            "firstname": "John",
            "lastname": "Doe",
            "full_name": "John Doe",
            "phone": "+23280123456",
            "date_of_birth": "2000-05-15",
            "gender": "male",
            "bio": "Computer science student",
            "interests": ["programming", "music", "sports"],
            "university": { "id": 1, "name": "University of Sierra Leone" },
            "faculty": { "id": 2, "name": "Faculty of Engineering" },
            "department": { "id": 5, "name": "Computer Science" },
            "organization": null,
            "student_id": "STU2024001",
            "level": "300",
            "year_of_study": "300",
            "score_level": 3,
            "preferences": { "theme": "dark", "notifications": true },
            "social_links": null,
            "avatar_url": null,
            "status": "active",
            "updated_at": "2026-09-25T12:00:00.000000Z",
            "profile_completion": 90
        }
    }
}
```

Note this response is considerably richer than the basic example above suggests — it always returns the full updated profile object. `year_of_study` is now the same raw academic-level string as `level` (it previously computed a numeric year here, inconsistently with [Get Profile](#8-get-profile)'s plain alias of the same name — both now behave the same way). The computed number that `year_of_study` used to hold here is now its own field, `score_level` (XP-tier integer via `XpService::calculateLevel()`, same as [Get Profile](#8-get-profile) and [Get Dashboard](#7-get-dashboard)).

### Error Responses

#### University Not Found (404)

```json
{
    "success": false,
    "error": { "code": "UNIVERSITY_NOT_FOUND", "message": "University not found" },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

#### Faculty Not Found (404)

```json
{
    "success": false,
    "error": {
        "code": "FACULTY_NOT_FOUND",
        "message": "Faculty not found or not associated with the selected university"
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

#### Department Not Found (404)

```json
{
    "success": false,
    "error": {
        "code": "DEPARTMENT_NOT_FOUND",
        "message": "Department not found or not associated with the selected faculty"
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

---

## 10. Update Avatar (Cloudinary Flow)

Avatar uploads (and all other media) go through a **Cloudinary presign flow** rather than posting the file directly to this API. This is a general-purpose upload flow — see [File Uploads](#file-uploads) for the complete reference covering all purposes (`avatar`, `credential`, `lesson_media`, `feed_media`, `thumbnail`, `document`).

### Step 1: Get Upload Signature

`POST /api/v1/upload/presign`

```json
{
    "purpose": "avatar",
    "file_type": "image/jpeg",
    "file_size": 204800
}
```

`file_type` and `file_size` are only validated as `required|string` / `required|integer|min:1` at the form level — the actual size/MIME enforcement (5MB max, `image/jpeg|png|webp` for the `avatar` purpose) happens inside `CloudinaryService::validateUploadPurpose()` and returns a `422 VALIDATION_ERROR` if violated, not a declarative form-rule rejection.

Response:

```json
{
    "success": true,
    "message": "Upload signature generated successfully",
    "data": {
        "signature": "a1b2c3...",
        "timestamp": 1758800000,
        "api_key": "917571849136557",
        "cloud_name": "di3re2vkx",
        "folder": "edulift/avatars",
        "upload_url": "https://api.cloudinary.com/v1_1/di3re2vkx/image/upload"
    }
}
```

### Step 2: Upload to Cloudinary

The client uploads the file **directly to Cloudinary** using the signature above (this API is never in the request path for the actual file bytes).

### Step 3: Store Metadata and Update Avatar

`POST /api/v1/upload/store-metadata`

```json
{
    "purpose": "avatar",
    "cloudinary_data": {
        "public_id": "edulift/avatars/abc123",
        "secure_url": "https://res.cloudinary.com/di3re2vkx/image/upload/v1/edulift/avatars/abc123.jpg",
        "url": "http://res.cloudinary.com/di3re2vkx/image/upload/v1/edulift/avatars/abc123.jpg",
        "resource_type": "image"
    }
}
```

Only `cloudinary_data.public_id`, `.secure_url`, `.url`, and `.resource_type` (`image|video|raw`) are required by `StoreFileMetadataRequest`. Other commonly-sent fields (`format`, `bytes`, `width`, `height`, `asset_id`, `version`, `created_at`) are accepted but **ignored — only the four required fields are stored** (so `format`, `bytes`, `width` and `height` come back `null`/`0` on the record; this has always been so). Just forward Cloudinary's upload response as it is.

**The URLs are checked (changed 2026-10-02).** `secure_url` must be `https://res.cloudinary.com/<your cloud>/…` and `url` must be on the same host and cloud (`http` or `https` — Cloudinary returns an `http://` `url`; that is fine). Anything else is a `422` on `cloudinary_data.secure_url` / `cloudinary_data.url`. The cloud is the `cloud_name` the presign step returned.

**Optional: attach the upload to a record** with `entity_type` + `entity_id` (changed 2026-10-02):

```json
{ "purpose": "thumbnail", "cloudinary_data": { "…": "…" }, "entity_type": "App\\Models\\Course", "entity_id": 12 }
```

`entity_type` must be the **full class name** (JSON-escaped backslashes) of one of: `App\Models\Student`, `App\Models\CreationUser`, `App\Models\FeedPost`, `App\Models\Course`, `App\Models\Lesson`, `App\Models\MiniLesson`, `App\Models\MiniLessonBlock`, `App\Models\Roadmap`. Anything else (a short name like `"course"`, a leading `\`, any other model) is a `422` on `entity_type`. You may only attach to a record you manage: yourself (`Student` / `CreationUser` — and only yourself), your own feed post, a course (or its lesson / mini-lesson / block) you created, or anything if you are an admin; roadmaps are admin-only. Otherwise → `403` with `error.code: "FORBIDDEN"` and nothing is stored. A deleted record is `404 ENTITY_NOT_FOUND`; an id that does not exist is a `422` on `entity_id`. Both fields are optional: without them the upload is stored unattached (the usual thumbnail flow), and `purpose: "avatar"` with no entity applies to the signed-in user.

For `purpose: "avatar"`, `avatar_url` is set on the **signed-in user's own** record only.

Response (`201`):

```json
{
    "success": true,
    "message": "File metadata stored successfully",
    "data": {
        "file_upload": {
            "id": 42,
            "uuid": "…",
            "user_id": 7,
            "user_type": "App\\Models\\Student",
            "upload_purpose": "avatar",
            "cloudinary_public_id": "edulift/avatars/abc123",
            "cloudinary_url": "http://res.cloudinary.com/di3re2vkx/image/upload/v1/edulift/avatars/abc123.jpg",
            "cloudinary_secure_url": "https://res.cloudinary.com/di3re2vkx/image/upload/v1/edulift/avatars/abc123.jpg",
            "resource_type": "image",
            "format": null,
            "bytes": 0,
            "width": null,
            "height": null,
            "duration": null,
            "metadata": { "public_id": "…", "secure_url": "…", "url": "…", "resource_type": "image" },
            "entity_type": "App\\Models\\Student",
            "entity_id": 7,
            "is_temp": false,
            "user": { "id": 7, "…": "the signed-in user's own record" },
            "created_at": "…",
            "updated_at": "…"
        }
    }
}
```

The response is `data.file_upload` (an earlier version of this document showed `data.file` and `avatar_url`; the API never returned those). **It no longer includes an `entity` object** (removed 2026-10-02 — it contained the linked record's data); use `entity_type` / `entity_id` if you need to know what it is attached to. Read the avatar from `data.file_upload.cloudinary_secure_url`.

### Legacy Direct Upload (still functional, distinct from the deprecated `/upload/*` endpoints below)

`POST /api/v1/student/profile/avatar` — accepts a direct `multipart/form-data` upload (`avatar`: image, max 2MB) and stores it on the **local `public` disk** (not Cloudinary). This is a separate, older code path that still works.

```json
// multipart/form-data
// avatar: <file>
```

```json
{
    "success": true,
    "message": "Avatar updated successfully",
    "data": {
        "avatar_url": "http://your-app.test/storage/avatars/students/abc123.jpg",
        "profile_completion": 90
    }
}
```

⚠️ **Do not confuse this with `POST /api/v1/upload/avatar`** (no `/student/profile/` in the path) — that is a *different*, unrelated route that is now a hard `410 Gone` deprecated stub (see [File Uploads](#file-uploads)).
Do not use this route.

---

## 11. View Student Profile

### `GET /api/v1/student/students/{student}`

**Purpose**: View another student's public profile.

**Authentication**: Required

### Request Example

`GET /api/v1/student/students/550e8400-e29b-41d4-a716-446655440000`

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Student profile retrieved successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "student": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "full_name": "Jane Smith",
            "avatar_url": null,
            "bio": "Aspiring engineer",
            "university": { "id": 1, "name": "University of Sierra Leone" },
            "faculty": { "id": 2, "name": "Faculty of Engineering" },
            "department": { "id": 5, "name": "Computer Science" },
            "social_links": null,
            "badges": [
                { "id": 1, "name": "First Steps", "icon_url": null, "earned_at": "2026-09-01T00:00:00.000000Z" }
            ],
            "courses_enrolled": 4,
            "courses_completed": 1
        }
    }
}
```

Private fields (email, phone, XP, streak, exact date of birth) are excluded from this public view.

### Error Responses

#### Student Not Found (404)

```json
{
    "success": false,
    "error": { "code": "STUDENT_NOT_FOUND", "message": "Student not found" },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

---
# Course Management

`List Courses`, `Get Enrolled Courses`, `Get Course Details`, and `Get Course Progress` all now return a **curated subset of fields** via dedicated API Resource classes (`App\Http\Resources\Student\{CourseResource,ModuleResource,LessonResource,QuizResource,CourseProgressResource}`) instead of raw Eloquent model dumps — internal/admin-only columns (`approved_by`, `rejection_reason`, `created_by`, `deleted_at`, raw `metadata`) are no longer exposed. The exact shape is documented per endpoint below; the `Course` shape (and its nested `modules`/`lessons`/`quizzes`) is shared across all four.

## 12. List Courses

### `GET /api/v1/student/courses`

**Purpose**: Browse published courses.

**Authentication**: Not required — publicly viewable so guests can browse before creating an account. Sending a valid Bearer token has no effect on this endpoint's response (it doesn't personalize per-item).

### Query Parameters

| Param             | Type    | Notes |
| ----------------- | ------- | ----- |
| `search`          | string  | Matches title/description, **and the title or code of the official academic module a course is tagged with** — `EEE 101`, `eee101`, `EEE-101` and `Circuit Theory` all find the courses tagged `EEE 101 — Circuit Theory I` (see [ACADEMIC_MODULES_API.md](ACADEMIC_MODULES_API.md)) |
| `level`           | string  | Exact match. A course's level is `UnderGrad`, `100`–`500`, `graduate`, or `general` (wider audience); `?level=200` does **not** include `general` courses — ask for `?level=general` separately |
| `university_id`   | integer | |
| `faculty_id`      | integer | |
| `department_id`   | integer | |
| `academic_module_id` | integer | Only courses tagged with that official academic module (ids come from `GET /api/v1/academic-modules?department_id=…`). A faculty-level module matches its courses across all of the faculty's departments. Unknown id → empty list; non-integer → `422` |
| `organization_id` | integer | Newly added — courses can belong to an organization instead of a university/faculty/department |
| `sort_by`         | string  | Default `created_at` |
| `sort_order`      | string  | `asc`/`desc`, default `desc` |
| `per_page`        | integer | Default 15 |

### Response Example (Success - 200)

Paginated `Course` list via `CourseResource`. `modules` is included when loaded but only carries module-level fields (no nested `lessons`) on this endpoint — use [Get Course Details](#14-get-course-details) for the full curriculum tree.

```json
{
    "success": true,
    "message": "Courses retrieved successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "current_page": 1,
        "data": [
            {
                "id": 1,
                "uuid": "...",
                "title": "Intro to Programming",
                "description": "Learn the basics...",
                "short_description": "Learn the basics",
                "slug": "intro-to-programming",
                "level": "100",
                "semester": "1",
                "course_code": "CS101",
                "status": "published",
                "thumbnail_url": null,
                "tags": ["programming", "beginner"],
                "learning_objectives": ["Understand variables", "Write basic programs"],
                "prerequisites": [],
                "estimated_duration_hours": 10,
                "estimated_lessons_count": 8,
                "estimated_quizzes_count": 8,
                "enrolled_students_count": 42,
                "completed_students_count": 5,
                "average_rating": "4.50",
                "total_ratings_count": 12,
                "total_xp_available": 400,
                "is_paid": true,
                "price": 150.0,
                "currency": "SLE",
                "coin_reward": 500,
                "published_at": "2026-08-01T00:00:00.000000Z",
                "creator": { "id": 3, "uuid": "...", "firstname": "Amara", "lastname": "Kamara", "full_name": "Amara Kamara", "avatar_url": null },
                "university": { "id": 1, "name": "University of Sierra Leone" },
                "faculty": null,
                "department": null,
                "academic_module": null,
                "organization": null,
                "modules": [
                    { "id": 1, "uuid": "...", "title": "Module 1", "description": null, "order_index": 0, "is_published": true, "estimated_duration_minutes": 60, "learning_objectives": [] }
                ]
            }
        ],
        "per_page": 15,
        "total": 1
    }
}
```

**`academic_module` (new, optional).** `null` for a course that is not tagged; otherwise the official university module the creator tagged it with, code and title together, so the card can render `EEE 101 — Circuit Theory I` without another request: `{ "id": 12, "code": "EEE 101", "title": "Circuit Theory I", "label": "EEE 101 — Circuit Theory I", "scope": "department", "is_active": true, "university": {…}, "faculty": {…}, "department": {…} }` (`scope` is `faculty` or `department`; `department` is `null` for a faculty module; `is_active: false` means the module was retired but the course keeps it). It is **independent of the course's own `modules`** (the internal chapters, unchanged) and never replaces the course's title. The same key appears on Get Course Details, `GET /student/courses/enrolled`, the progress response and the search results. Full reference: [ACADEMIC_MODULES_API.md](ACADEMIC_MODULES_API.md).

⚠️ Each module's `lessons_count` and `lessons` keys are **entirely absent** here (not `0`/`[]`) — they use Laravel's `whenLoaded()` pattern, and `modules.lessons` isn't eager-loaded on this endpoint (only `modules` is). They do appear on [Get Course Details](#14-get-course-details), which loads the full curriculum tree.

Internal/admin-only fields (`approved_by`, `rejection_reason`, `created_by`, `deleted_at`, raw `metadata`) are no longer present in this response.

**Vybe Coin reward.** Every course object also carries `coin_reward` (integer): the Vybe Coins a student is paid **once**, when they complete this *paid* course (see [Vybe Coins](#vybe-coins)). It is always `0` for a free course, and for a paid course an admin hasn't set a reward on. Use it for an "Earn 500 Vybe Coins" badge. It is what the course pays *now* — a later admin change never alters coins a student already received.

**Pricing (paid courses).** Every course now carries `is_paid` (boolean), `price` (number in major units — `150.0` means SLE 150.00 — or `null` when free) and `currency` (`"SLE"`). This is always the **admin-approved** price; the creator's suggestion is never exposed to students. `modules` is returned for free **and** paid courses alike — the module outline is public; only the actual content is behind enrollment (see [Get Course Details](#14-get-course-details)).

---

## 13. Get Enrolled Courses

### `GET /api/v1/student/courses/enrolled`

**Purpose**: Courses the student is currently enrolled in, with progress.

**Authentication**: Required

### Response Example (Success - 200)

Paginated `StudentCourseProgress` list via `CourseProgressResource`, each with a nested `course` (`CourseResource`, same shape as [List Courses](#12-list-courses) — including `creator`/`university`/`faculty`/`department`/`organization` since `enrolled()` eager-loads them, but without nested `modules.lessons`).

```json
{
    "success": true,
    "message": "Enrolled courses retrieved successfully",
    "data": {
        "current_page": 1,
        "data": [
            {
                "id": 10,
                "uuid": "...",
                "course": { "id": 1, "uuid": "...", "title": "Intro to Programming", "...": "full CourseResource shape" },
                "progress_percent": 45.5,
                "xp_earned": 120,
                "lessons_completed": 5,
                "quizzes_completed": 3,
                "quizzes_passed": 3,
                "streak_count": 2,
                "last_lesson_id": 16,
                "last_module_id": 3,
                "last_accessed_date": "2026-09-24",
                "last_accessed_at": "2026-09-24T18:00:00.000000Z",
                "completed_at": null,
                "is_completed": false,
                "created_at": "2026-09-01T00:00:00.000000Z",
                "updated_at": "2026-09-24T18:00:00.000000Z"
            }
        ],
        "per_page": 15,
        "total": 1
    }
}
```

⚠️ **Note**: `completed_lessons`/`completed_quizzes` (the raw JSON tracking arrays) and the internal `student_id`/`course_id` foreign keys are **not** included in this curated response — use the `lessons_completed`/`quizzes_completed` counters, and `course.id`/`course.uuid` if you need the course reference. `is_completed` is now a real serialized field (derived from `completed_at`), unlike the raw model's unused accessor before this fix.

---

## 14. Get Course Details

### `GET /api/v1/student/courses/{course}`

**Purpose**: Full details of one course (accepts numeric ID, UUID, or slug).

**Authentication**: Not required — publicly viewable so guests can see a course's outline before signing up. `is_enrolled` is `false` for a guest (and for a logged-in student who hasn't enrolled). Send a valid Bearer token to get a real `is_enrolled` and `enrollment_state` (see below).

**Outline vs. content (paid courses).** The module/lesson **outline** — module and lesson titles, descriptions, types, durations, objectives, XP — is public for free *and* paid courses. What is behind enrollment is the **actual content**: mini-lessons/blocks and quiz questions. Concretely, for a paid course the requester hasn't enrolled in (`is_paid: true`, not enrolled), the `quizzes` array is **omitted** from each lesson here (free courses, and enrolled students, still get it, as before). All content endpoints (`/courses/{course}/modules`, `/modules/{module}`, `/lessons/{lesson}` and its `/mini-lessons` and `/quizzes`, `/mini-lessons/{miniLesson}`, `/quizzes/{quiz}`) return `403 NOT_ENROLLED` until the student is enrolled — unchanged. Details, price and `enrollment_state` are returned so the page can render an "Enroll for SLE 150.00" button.

**Library resources.** A course can reference resources from the Resources library (lecture notes, slides, past questions, playlists, …). They are **not** part of this response — fetch them with [Get a Course's Resources](#76-get-a-courses-resources) (`GET /student/courses/{course}/resources`). Opening one uses the normal daily allowance; see [Resources](#resources).

### Response Example (Success - 200)

Full `CourseResource`, with `modules` (and each module's `lessons`, and each lesson's `quizzes`) fully loaded — this is the one course endpoint that returns the complete curriculum tree. `is_enrolled` is merged directly into the `course` object.

```json
{
    "success": true,
    "message": "Course retrieved successfully",
    "data": {
        "course": {
            "id": 1,
            "uuid": "...",
            "title": "Intro to Programming",
            "description": "Learn the basics...",
            "short_description": "Learn the basics",
            "slug": "intro-to-programming",
            "level": "100",
            "semester": "1",
            "course_code": "CS101",
            "status": "published",
            "thumbnail_url": null,
            "tags": ["programming", "beginner"],
            "learning_objectives": ["Understand variables"],
            "prerequisites": [],
            "estimated_duration_hours": 10,
            "estimated_lessons_count": 8,
            "estimated_quizzes_count": 8,
            "enrolled_students_count": 42,
            "completed_students_count": 5,
            "average_rating": "4.50",
            "total_ratings_count": 12,
            "total_xp_available": 400,
            "is_paid": false,
            "price": null,
            "currency": "SLE",
            "published_at": "2026-08-01T00:00:00.000000Z",
            "creator": { "id": 3, "uuid": "...", "firstname": "Amara", "lastname": "Kamara", "full_name": "Amara Kamara", "avatar_url": null },
            "university": { "id": 1, "name": "University of Sierra Leone" },
            "faculty": null,
            "department": null,
            "organization": null,
            "modules": [
                {
                    "id": 1,
                    "uuid": "...",
                    "title": "Module 1",
                    "description": null,
                    "order_index": 0,
                    "is_published": true,
                    "estimated_duration_minutes": 60,
                    "learning_objectives": [],
                    "lessons_count": 1,
                    "lessons": [
                        {
                            "id": 1,
                            "uuid": "...",
                            "title": "Variables",
                            "description": null,
                            "lesson_type": "video",
                            "order_index": 0,
                            "is_published": true,
                            "estimated_duration_minutes": 15,
                            "learning_objectives": [],
                            "prerequisites": [],
                            "xp_reward": 10,
                            "quizzes": [
                                {
                                    "id": 4,
                                    "uuid": "...",
                                    "quiz_type": "mcq",
                                    "question": "What is a variable?",
                                    "options": ["A container for storing data values", "A function", "A loop", "A class"],
                                    "image_url": null,
                                    "xp_reward": 5,
                                    "attempts_allowed": 3,
                                    "time_limit_seconds": null,
                                    "order_index": 0,
                                    "is_published": true
                                }
                            ]
                        }
                    ]
                }
            ],
            "is_enrolled": true,
            "enrollment_state": "enrolled",
            "roadmaps": [
                { "id": 1, "uuid": "5f1c6097-…", "slug": "software-engineering-path", "title": "Software Engineering Path", "thumbnail_url": null, "position": 3, "total_courses": 10 }
            ]
        }
    }
}
```

`roadmaps` (new, **details only** — not in the list/enrolled/progress course objects) lists the **published** roadmaps this course is part of, with the course's place in each (`position` of `total_courses`, counting only courses students can take). `[]` when the course is in no roadmap. Informational: a roadmap never gates the course. See [Roadmaps](#roadmaps).

`enrollment_state` drives the enroll button (computed from local data only, no call to Monime):

| `enrollment_state` | Meaning | Button |
| --- | --- | --- |
| `available` | Not enrolled (also what a guest sees) | **Enroll** (free) / **Enroll for SLE 150.00** (`is_paid`) |
| `payment_pending` | A Monime checkout is open and still payable | **Continue Payment** |
| `payment_processing` | The student came back from checkout but payment isn't confirmed yet | **Confirming Payment…** (disabled; poll [Enrollment Status](#16a-get-enrollment-status)) |
| `enrolled` | Enrolled — free, or paid & confirmed | **Start Course / Continue Course** |

There is **no separate `progress` object** alongside `course` at all — use [Get Course Progress](#15-get-course-progress) for progress data.

⚠️ **`correct_answer`/`explanation` are deliberately absent from the quiz objects shown here** — this is a public curriculum-preview endpoint now, so quiz answers are stripped regardless of auth state (see `KNOWN_ISSUES.md` #53). This is endpoint-specific: `GET /student/lessons/{lesson}/quizzes` and `GET /student/quizzes/{quiz}` (both still enrollment-gated, see [#25](#25-get-lesson-quizzes)/[#26](#26-get-quiz-details)) still return both fields once a student actually reaches a quiz during a lesson — that's a separate, still-open judgment call (Known Issues item #20).

### Error Responses

#### Course Not Found (404)

Standard `COURSE_NOT_FOUND`.

---

## 15. Get Course Progress

### `GET /api/v1/student/courses/{course}/progress`

**Purpose**: This student's progress in one course.

**Authentication**: Required

### Response Example (Success - 200)

Same `CourseProgressResource` shape as [Get Enrolled Courses](#13-get-enrolled-courses), except the nested `course.modules` here **does** include the full `lessons`/`quizzes` tree (matching [Get Course Details](#14-get-course-details)'s eager-loading), unlike the enrolled-courses list.

---

## 16. Enroll in Course

### `POST /api/v1/student/courses/{course}/enroll`

**Purpose**: Enroll the student in a published, approved course. **Free course** → enrolled immediately (response below, unchanged). **Paid course** → starts (or resumes) a Monime checkout and returns its URL; the student is **not** enrolled until Monime confirms the payment (see [Paid courses](#paid-courses-monime-checkout)).

**Authentication**: Required

### Paid courses (Monime checkout)

Flow: `Course Details → Enroll → redirect to checkout_url → pay on Monime → back to the portal → Enrollment Activated → Course Unlocked`.

1. `POST .../enroll` on a paid course returns **200** with `requires_payment: true` and a `checkout_url`. Redirect the browser to `checkout_url` (Monime's hosted page: Mobile Money, card, bank).
2. Calling `enroll` again while that checkout is still open returns the **same** `checkout_url` (no duplicate checkout is created). If the price changed or the checkout expired, a fresh one is created.
3. After paying (or cancelling) Monime sends the browser to the **backend** (its hosted checkout page submits a form `POST` to the success/cancel URL; a plain `GET` works too), which asks Monime what really happened and then redirects the student (`303` after a POST, `302` after a GET) to `{STUDENT_PORTAL_URL}/courses/{course-slug}?payment=<outcome>&payment_id=<payment uuid>` (path configurable via `STUDENT_PORTAL_PAYMENT_RETURN_PATH`). `<outcome>` is one of:
   - `success` — payment confirmed, the student is already enrolled.
   - `processing` — the student paid but Monime hasn't confirmed it to us yet. **Not a failure.** Show "Confirming Payment…" and poll [Enrollment Status](#16a-get-enrollment-status) until `state` becomes `enrolled`.
   - `cancelled` / `expired` — nothing was charged; the course stays locked and **Enroll** works again.
   The `?payment=` value is only a UI hint. **Never treat it as proof of payment** — reading `state`/`is_enrolled` from the API is the only source of truth (a forged URL changes nothing server-side).
4. Enrollment is activated only after Monime independently confirms the payment (signed webhook, or the API check made on return/status polling). Content endpoints keep returning `403 NOT_ENROLLED` until then.

### Response Example — paid course, payment required (Success - 200)

```json
{
    "success": true,
    "message": "Payment required to complete enrollment",
    "data": {
        "requires_payment": true,
        "enrollment_state": "payment_pending",
        "checkout_url": "https://checkout.monime.io/cos-...",
        "payment": {
            "uuid": "3f0c...",
            "status": "pending",
            "amount": 150.0,
            "currency": "SLE",
            "expires_at": "2026-09-29T12:30:00.000000Z",
            "paid_at": null,
            "created_at": "2026-09-29T12:00:00.000000Z"
        }
    }
}
```

If the student already came back from checkout and we're waiting on confirmation, the same call returns `"message": "Confirming your payment"`, `"enrollment_state": "payment_processing"` and `"checkout_url": null` — do **not** send them back to checkout, show "Confirming Payment…".

If the payment was confirmed in between (e.g. the webhook landed just before the click), the response is the enrolled shape below, plus a `payment` object.

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Successfully enrolled in course",
    "data": {
        "progress": {
            "id": 10,
            "uuid": "...",
            "course": { "id": 1, "uuid": "...", "title": "Intro to Programming", "...": "full CourseResource shape" },
            "progress_percent": 0.0,
            "xp_earned": 0,
            "lessons_completed": 0,
            "quizzes_completed": 0,
            "quizzes_passed": 0,
            "streak_count": null,
            "last_lesson_id": null,
            "last_module_id": null,
            "last_accessed_date": null,
            "last_accessed_at": null,
            "completed_at": null,
            "is_completed": false,
            "created_at": "2026-09-25T12:00:00.000000Z",
            "updated_at": "2026-09-25T12:00:00.000000Z"
        },
        "xp_awarded": 10
    }
}
```

`xp_awarded` is now included (previously silently discarded — enrollment XP is awarded via `XpService::awardXp()`, and the response now surfaces the actual amount credited, which can differ from the base `config('api.xp.enrollment')` value of `10` once `XpMultiplierService`'s bonus multipliers are applied). Note `progress.xp_earned` stays `0` here — the enrollment bonus is tracked in the student's overall `xp_total`/`XpLog`, not folded into this course-specific counter.

### Error Responses

#### Already Enrolled (409)

```json
{
    "success": false,
    "error": { "code": "ALREADY_ENROLLED", "message": "Already enrolled in this course" },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

#### Course Not Published (403 / `COURSE_NOT_AVAILABLE`-style code)

Enrollment is blocked for unpublished/unapproved courses via `CoursePolicy`.

#### Paid-course errors

| HTTP | `error.code` | When |
| --- | --- | --- |
| 503 | `PAYMENT_UNAVAILABLE` | Monime is unreachable/misconfigured. No enrollment; safe to retry. |
| 409 | `PRICING_UNAVAILABLE` | Course is marked paid but has no valid price (admin needs to fix it). |
| 409 | `ENROLLMENT_IN_PROGRESS` | A double-click / parallel request for the same course is mid-flight; retry shortly. |
| 409 | `ALREADY_ENROLLED` | Currently enrolled. (A student who paid earlier and later unenrolled is re-enrolled for free, not charged again.) |

---

## 16a. Get Enrollment Status

### `GET /api/v1/student/courses/{course}/enrollment-status`

**Purpose**: Where this student stands with a course. This is the endpoint to **poll** while showing "Confirming Payment…". When the student has an open checkout it also asks Monime about it, so a payment whose webhook was delayed or lost is still picked up and enrollment gets activated. (Course Details' `enrollment_state` is a cheaper read of the same thing but never contacts Monime.)

**Authentication**: Required

```json
{
    "success": true,
    "message": "Enrollment status retrieved successfully",
    "data": {
        "state": "payment_pending",
        "is_enrolled": false,
        "is_paid": true,
        "price": 150.0,
        "currency": "SLE",
        "checkout_url": "https://checkout.monime.io/cos-...",
        "payment": { "uuid": "3f0c...", "status": "pending", "amount": 150.0, "currency": "SLE", "expires_at": "2026-09-29T12:30:00.000000Z", "paid_at": null, "created_at": "2026-09-29T12:00:00.000000Z" }
    }
}
```

`state` is `available` | `payment_pending` | `payment_processing` | `enrolled` (see the table under [Get Course Details](#14-get-course-details)). `checkout_url` is only set for `payment_pending` (the "Continue Payment" link); `payment` is `null` when there's no open checkout. Returns `404` for an unpublished course.

---

## 17. Update Course Progress

### `POST /api/v1/student/courses/{course}/progress`

**Purpose**: Mark a lesson or quiz complete/incomplete and recalculate course progress.

**Authentication**: Required

### Request Payload

```json
{
    "lesson_id": 12,
    "completed": true
}
```

or

```json
{
    "quiz_id": 4,
    "completed": true
}
```

### Request Fields Explained

| Field       | Type    | Required | Notes |
| ----------- | ------- | -------- | ----- |
| `lesson_id` | integer | Yes\*    | Required unless `quiz_id` is present |
| `quiz_id`   | integer | Yes\*    | Required unless `lesson_id` is present |
| `completed` | boolean | Yes      | |

\* At least one of `lesson_id`/`quiz_id` must be provided (`required_without` on both fields). A request with **neither** field set now returns a `422 VALIDATION_ERROR` instead of silently succeeding with no change — this was previously unenforced (both fields were plain `nullable` with no cross-field check anywhere).

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Progress updated successfully",
    "data": {
        "progress": {
            "id": 10,
            "progress_percent": 50,
            "xp_earned": 130,
            "lessons_completed": 6,
            "quizzes_completed": 3,
            "quizzes_passed": 3,
            "completed_lessons": [12, 13, 14, 15, 16, 17],
            "completed_quizzes": [],
            "last_lesson_id": 17,
            "last_module_id": 3,
            "last_accessed_at": "2026-09-25T12:00:00.000000Z",
            "last_accessed_date": "2026-09-25",
            "completed_at": null
        },
        "xp_awarded": {
            "lesson": 10,
            "quiz": 0,
            "course_completion": 0,
            "total": 10
        }
    }
}
```

This is the most accurately-documented endpoint in the Course Management section — the field names above genuinely match the real column names.

**`coins_awarded` (new, only when it happens).** When this request is the one that completes a **paid** course the student paid for, and the course has a coin reward, the response also includes:

```json
"coins_awarded": {
    "amount": 500,
    "balance": { "available": 500, "reserved": 0, "redeemed": 0, "total_earned": 500 }
}
```

The key is **absent** in every other case — partial progress, a free course, a course with no reward, and (importantly) **any repeat of a completion**: marking a lesson incomplete and complete again, or unenrolling and retaking the course, never pays a second time. Show a "You earned 500 Vybe Coins!" moment only when the key is present. Coins are separate from XP; `xp_awarded` behaves exactly as before.

**`roadmaps_completed` (new, only when it happens).** When this request completes a course that was the last missing piece of one or more [roadmaps](#roadmaps), the response also includes `roadmaps_completed: [{ "id", "uuid", "title", "badge": { "id", "name", "earned_at" } }]`. Absent otherwise — including when the student re-completes a course in a roadmap whose badge they already hold. Nothing else about this endpoint changed.

### Error Responses

#### Lesson Not Found (404)

```json
{
    "success": false,
    "error": { "code": "LESSON_NOT_FOUND", "message": "Lesson not found" },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

#### Lesson/Course Mismatch (400)

```json
{
    "success": false,
    "error": { "code": "LESSON_COURSE_MISMATCH", "message": "Lesson does not belong to this course" },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

#### Quiz Not Found (404)

```json
{
    "success": false,
    "error": { "code": "QUIZ_NOT_FOUND", "message": "Quiz not found" },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

#### Quiz/Course Mismatch (400)

```json
{
    "success": false,
    "error": { "code": "QUIZ_COURSE_MISMATCH", "message": "Quiz does not belong to this course" },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

#### Neither lesson_id nor quiz_id provided (422)

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {
            "lesson_id": ["Either lesson_id or quiz_id must be provided."],
            "quiz_id": ["Either lesson_id or quiz_id must be provided."]
        }
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

---

## 18. Unenroll from Course

### `POST /api/v1/student/courses/{course}/unenroll`

**Purpose**: Remove the enrollment record entirely.

**Authentication**: Required

### Response Example (Success - 200)

```json
{
    "success": true,
    "message": "Unenrolled successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

No `data` key (controller passes `null`).

**Paid courses can be unenrolled too — with no refund.** Unenrolling works the same for a course the student paid for, but the payment is final: nothing is refunded (there is no refund feature). In that case the response is `200` with a different message and a `data` flag:

```json
{ "success": true, "message": "Successfully unenrolled from course. Payments for paid courses are not refunded.", "data": { "refunded": false } }
```

Show a confirmation like "You won't get a refund and your progress will be reset" before calling it for a paid course. The payment record is kept, so if the student enrolls again later they are **not charged a second time** — `POST .../enroll` re-enrolls them immediately (progress starts from zero) and includes the earlier `payment` (`status: "succeeded"`) in the response. Free courses respond exactly as before (`data: []`).

---
# Content Management

These endpoints enforce **sequential access**: a module/lesson/mini-lesson/quiz is only visible once the student is enrolled in the parent course and (where applicable) has reached it in order. This part of the doc was already accurate and is unchanged.

## 19. Get Course Modules

### `GET /api/v1/student/courses/{course}/modules`

**Authentication**: Required. Requires enrollment in the course.

```json
{
    "success": true,
    "message": "Modules retrieved successfully",
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123",
    "data": {
        "modules": [
            {
                "id": 1,
                "uuid": "...",
                "course_id": 1,
                "title": "Module 1: Getting Started",
                "order_index": 0,
                "is_published": true,
                "learning_objectives": ["Understand the course structure"],
                "estimated_duration_minutes": 60
            }
        ]
    }
}
```

`is_published`, `learning_objectives`, `estimated_duration_minutes` were previously undocumented but always present.

### Error Responses

#### Course Not Found (404)

Returned both when the course truly doesn't exist and when it exists but isn't published yet (`status !== 'published'` or `published_at` is null) — both cases are indistinguishable to the client, code `NOT_FOUND`.

#### Not Enrolled (403)

```json
{
    "success": false,
    "error": { "code": "NOT_ENROLLED", "message": "You must be enrolled in this course to view its content" },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

## 20. Get Module Details

### `GET /api/v1/student/modules/{module}`

**Authentication**: Required. Requires enrollment, and all previous modules must be completed (sequential access).

```json
{
    "success": true,
    "message": "Module retrieved successfully",
    "data": {
        "module": {
            "id": 1,
            "uuid": "...",
            "course_id": 1,
            "title": "Module 1: Getting Started",
            "order_index": 0,
            "is_published": true,
            "course": { "id": 1, "title": "Intro to Programming" },
            "lessons": [
                { "id": 12, "title": "Introduction to Variables", "order_index": 0 }
            ]
        }
    }
}
```

### Error Responses

`NOT_FOUND` (404) if the module/course doesn't exist or isn't published; `NOT_ENROLLED` (403) if not enrolled; `SEQUENTIAL_ACCESS_REQUIRED` (403) if a previous module isn't finished:

```json
{
    "success": false,
    "error": {
        "code": "SEQUENTIAL_ACCESS_REQUIRED",
        "message": "You must complete all lessons in previous modules before accessing this module",
        "details": { "message": "Please complete all lessons in the previous modules first", "module_order": 2 }
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

## 21. Get Module Lessons

### `GET /api/v1/student/modules/{module}/lessons`

Same access rules as [Get Module Details](#20-get-module-details).

```json
{
    "success": true,
    "message": "Lessons retrieved successfully",
    "data": {
        "lessons": [
            { "id": 12, "uuid": "...", "module_id": 1, "title": "Introduction to Variables", "lesson_type": "interactive", "order_index": 0, "xp_reward": 10, "is_published": true }
        ]
    }
}
```

## 22. Get Lesson Details

### `GET /api/v1/student/lessons/{lesson}`


```json
{
    "success": true,
    "message": "Lesson retrieved successfully",
    "data": {
        "lesson": {
            "id": 12,
            "uuid": "...",
            "title": "Introduction to Variables",
            "description": "Learn how variables work",
            "lesson_type": "interactive",
            "estimated_duration_minutes": 15,
            "xp_reward": 10,
            "order_index": 0,
            "is_published": true
        }
    }
}
```

`lesson_type` is one of `video, reading, interactive, quiz` — not `text`/`live` as sometimes assumed.

## 23. Get Lesson Mini-Lessons

### `GET /api/v1/student/lessons/{lesson}/mini-lessons`

Requires enrollment, all previous modules completed, and all previous lessons in the same module completed (`SEQUENTIAL_ACCESS_REQUIRED` otherwise). Each mini-lesson is a container; its content lives in its ordered `blocks` array.

```json
{
    "success": true,
    "message": "Mini-lessons retrieved successfully",
    "data": {
        "mini_lessons": [
            {
                "id": 5,
                "uuid": "...",
                "lesson_id": 12,
                "title": "Variables Explained",
                "description": "A quick walkthrough",
                "order_index": 0,
                "is_published": true,
                "blocks": [
                    {
                        "id": 20,
                        "uuid": "...",
                        "content_type": "text",
                        "text_type": "plain",
                        "content": "A variable is a named container for storing a data value.",
                        "media_url": null,
                        "media_metadata": null,
                        "order_index": 0
                    }
                ]
            }
        ]
    }
}
```

## 24. Get Mini-Lesson Details

### `GET /api/v1/student/mini-lessons/{miniLesson}`

Same access rules as above (enrollment + sequential module/lesson completion).

```json
{
    "success": true,
    "message": "Mini-lesson retrieved successfully",
    "data": {
        "mini_lesson": {
            "id": 5,
            "uuid": "...",
            "lesson_id": 12,
            "title": "Variables Explained",
            "description": "A quick walkthrough",
            "order_index": 0,
            "blocks": [
                { "id": 20, "content_type": "text", "text_type": "plain", "content": "A variable is a named container for storing a data value.", "media_url": null, "media_metadata": null, "order_index": 0 },
                { "id": 21, "content_type": "image", "text_type": null, "content": null, "media_url": "https://res.cloudinary.com/.../diagram.png", "media_metadata": { "width": 800, "height": 600 }, "order_index": 1 },
                { "id": 22, "content_type": "text", "text_type": "link", "content": "https://chatgpt.com/", "media_url": null, "media_metadata": { "label": "Open ChatGPT" }, "order_index": 2 },
                { "id": 23, "content_type": "text", "text_type": "prompt", "content": "You are a patient maths tutor.\n\nExplain \"fractions\" step by step.\nQuestion: [paste your question here]", "media_url": null, "media_metadata": null, "order_index": 3 }
            ]
        }
    }
}
```

`content_type` is one of `text|image|video|embed|document`; `text_type` (`plain|simply_put|important|remember|formula|link|prompt`) only applies to `text` blocks.

**How to render the two tool-teaching types** (used by courses that send students to AI tools and external sites; for any other `text_type` nothing changed):

- **`link`** — `content` is exactly one absolute `http(s)` URL (validated server-side: never `javascript:`/`data:`, no username/password in it, no spaces). Render it as a clickable link that opens in a new tab: `<a href={content} target="_blank" rel="noopener noreferrer">`. It is the student's way onto a third-party site, so make the destination visible (show the URL, or at least its host) and build the `href` from `content` only. **Label:** `media_metadata` may be `null` or an object with an optional `label` (plain text, ≤ 100 characters, one line; the server refuses labels containing a web address). When `media_metadata?.label` is present show it as the link text, with the destination (host) next to it; otherwise show the URL as the link text. Render the label as text (escape it), never as HTML.
- **`prompt`** — `content` is plain text meant to be pasted into an AI tool: it can be long and multi-line and may contain `<tags>`, `{{placeholders}}`, `[brackets]` and ``` fences. Show it in a monospace box that keeps line breaks and indentation (`white-space: pre-wrap`) with a **Copy** button that puts exactly `content` on the clipboard (`navigator.clipboard.writeText(content)`, with a "select all" fallback where the Clipboard API is unavailable, e.g. non-HTTPS pages). **Render it as text, not as HTML or Markdown** — escape it, otherwise `<role>…</role>` vanishes from what the student copies (and it is an injection risk).
- Treat an **unknown `text_type` as plain text** so that a type added later never leaves a blank block.

## 25. Get Lesson Quizzes

### `GET /api/v1/student/lessons/{lesson}/quizzes`

⚠️ **Note**: there is **no `points` field on Quiz** — the correct XP field name is `xp_reward` (same field name used for lessons). Also, `correct_answer` is cast as a JSON **array** on the model (e.g. `["A container for storing data values"]`), not a plain string, and there is currently **no `$hidden`/filtering** applied — the answer is returned to students in full via this endpoint and quiz details, before they attempt the quiz. Undocumented extra fields also present: `image_url`, `attempts_allowed`, `is_published`.

The platform-wide XP-awarding system was reviewed and partially centralized (see `KNOWN_ISSUES.md` #39 / `docs/FUTURE_WORK.md`): fixed *amounts* (enrollment, course completion, feed actions) now come from `config('api.xp')` instead of scattered magic numbers, and a live bug (a streak-milestone bonus that would crash on an invalid DB enum value) was fixed by removing that mechanism in favor of the existing percentage-based streak multiplier. Per-item lesson/quiz XP (`xp_reward` shown above) is unchanged by this — it remains set individually by the tutor per lesson/quiz, which is intentional (not part of the centralization).

```json
{
    "success": true,
    "message": "Quizzes retrieved successfully",
    "data": {
        "quizzes": [
            {
                "id": 4,
                "uuid": "...",
                "quiz_type": "mcq",
                "question": "What is a variable?",
                "options": ["A container for storing data values", "A function", "A loop", "A class"],
                "correct_answer": ["A container for storing data values"],
                "explanation": "Variables store data values for later use.",
                "image_url": null,
                "xp_reward": 5,
                "attempts_allowed": 3,
                "time_limit_seconds": null,
                "order_index": 0,
                "is_published": true
            }
        ]
    }
}
```

## 26. Get Quiz Details

`GET /api/v1/student/quizzes/{quiz}` — same shape/caveats as above (single quiz object instead of an array).

---
# Gamification

⚠️ **This entire section was restructured in the backend at some point and the previous version of this doc described an unrelated, older shape for nearly every endpoint below.** Everything here reflects the current `GamificationController` / `XpService` / `StreakService` / `BadgeService` / `LeaderboardService` implementations.

## 27. Get Gamification Dashboard

### `GET /api/v1/student/gamification/dashboard`

```json
{
    "success": true,
    "message": "Gamification dashboard retrieved successfully",
    "data": {
        "xp_stats": { "total_xp": 2450, "xp_by_action": { "lesson_completion": 1200 }, "recent_xp": 120, "score_level": 3 },
        "streak_stats": { "current_streak": 3, "longest_streak": 10, "active_days": 45, "average_activity": 2.1, "streak_history": [] },
        "badges": [
            { "badge": { "id": 1, "name": "First Steps" }, "has_badge": true, "progress": 100, "awarded_at": "2026-09-01T00:00:00.000000Z" }
        ],
        "leaderboard_position": { "rank": 12, "position": 12, "total_students": 500, "percentile": 97.6, "top_students": [] },
        "recent_achievements": [
            { "id": 1, "name": "First Steps", "description": "Complete your first lesson", "icon_url": null, "category": "milestone", "rarity": "common", "earned_at": "2026-09-24T10:00:00.000000Z" }
        ]
    }
}
```

⚠️ Known issues:
- `xp_stats` has **no `xp_to_next_level`** field. It does now include `score_level` (added — a plain integer computed via `XpService::calculateLevel()`, the same XP-tier number used on [Get Dashboard](#7-get-dashboard)/[Get Profile](#8-get-profile)).
- `streak_stats` has **no `next_milestone`** field — see [Get Streaks](#29-get-streaks) for milestone data.
- `badges` is the **entire catalog** (earned + unearned), not just earned badges.
- `leaderboard_position` is **global scope only** — there is no per-university/faculty/department breakdown in this object.
- `recent_achievements` is now **personal to this student** (previously a global, platform-wide "top performers this week" feed with no connection to the requesting student at all). As an interim fix, it returns the student's own recently-earned **badges** — the same shape as [Get Achievements](#33-get-achievements). A dedicated `Achievement` concept distinct from badges is deferred; see `docs/FUTURE_WORK.md`.

## 28. Get Badges

### `GET /api/v1/student/gamification/badges`

```json
{
    "success": true,
    "message": "Badges retrieved successfully",
    "data": {
        "badges": [
            {
                "badge": { "id": 1, "name": "First Steps", "description": "...", "icon_url": null, "category": "achievement", "rarity": "common" },
                "has_badge": true,
                "progress": 100,
                "awarded_at": "2026-09-01T00:00:00.000000Z"
            },
            {
                "badge": { "id": 2, "name": "Century Club", "description": "...", "icon_url": null, "category": "milestone", "rarity": "uncommon" },
                "has_badge": false,
                "progress": 45,
                "awarded_at": null
            }
        ]
    }
}
```

⚠️ Returns **every badge in the system** (earned and unearned, with a `has_badge` flag and `progress` toward earning it) — there is no `total_earned`/`total_available` summary field. Filter/count client-side as needed.

**Roadmap badges (new).** Each [roadmap](#roadmaps) has its own completion badge. Only the ones the student has **earned** appear in this list (there is one per roadmap, so unearned ones are not listed as locked entries — they're shown on the roadmap itself via `badge.earned`). Such an entry has `has_badge: true`, `progress: { current: 1, target: 1, percentage: 100, is_completed: true }`, `awarded_at`, and an extra `roadmap: { id, uuid, slug, title }` (absent on ordinary badges). Ordinary badges are unchanged.

## 29. Get Streaks

### `GET /api/v1/student/gamification/streaks`

```json
{
    "success": true,
    "message": "Streak data retrieved successfully",
    "data": {
        "streak_stats": {
            "current_streak": 3,
            "longest_streak": 10,
            "active_days": 45,
            "average_activity": 2.1,
            "streak_history": [{ "date": "2026-09-25", "active": true }]
        },
        "milestones": {
            "achieved": [{ "days": 3, "label": "3-Day Streak" }],
            "upcoming": [{ "days": 7, "label": "7-Day Streak", "days_remaining": 4 }]
        }
    }
}
```

⚠️ Everything is nested under `streak_stats`/`milestones` — there is no top-level `current_streak`/`longest_streak`/`next_milestone`/`recent_activity` as previously documented. `milestones` is split into two buckets (`achieved`/`upcoming`), not one flat list.

## 30. Get Leaderboards

### `GET /api/v1/student/gamification/leaderboards`

**Query params**: `period` (`all|week|month|year`), `type` (`global|university|course`, default `global`), `university_id` (required if `type=university`), `limit`.

⚠️ Previously documented as accepting `scope`/`limit` with `scope` in `overall|university|faculty|department` — the real parameter is `type`, accepting only `global|university|course`, and there's no `faculty`/`department` scope on this specific endpoint (use [Get Specific Leaderboards](#37-40-get-specific-leaderboards) for those).

```json
{
    "success": true,
    "message": "Leaderboard retrieved successfully",
    "data": {
        "leaderboard": [
            { "rank": 1, "student": { "id": "...", "firstname": "Amara", "lastname": "Kamara", "avatar_url": null }, "xp_total": 5200 }
        ],
        "stats": { "total_students": 500, "total_xp": 850000, "average_xp": 1700, "top_student": { "id": "...", "name": "Amara Kamara" } },
        "period": "all",
        "type": "global"
    }
}
```

⚠️ There is no `overall/university/faculty/department` object and no `user_position` field in this response.

## 31. Get Leaderboard Position

### `GET /api/v1/student/gamification/position`

**Query params**: `type` (default `global`, now validated — must be one of `global,university,faculty,department,organization`), plus a scope id matching the chosen `type`: `university_id`, `faculty_id`, `department_id`, or `organization_id` (a generic `scope_id` param also works for any type).

```json
{
    "success": true,
    "message": "Student position retrieved successfully",
    "data": {
        "position": { "rank": 12, "position": 12, "total_students": 500, "percentile": 97.6, "top_students": [] }
    }
}
```

⚠️ Single-scope object wrapped in a `position` key — not the previously-documented flat `{overall, university, faculty, department}` multi-scope shape.

`type` previously accepted any string with **no validation** and only `university` actually did anything (`faculty`/`department`/`organization` silently fell through to the global/unscoped calculation). Both are now fixed: `type` is validated against the 5 supported values, and `faculty`/`department`/`organization` scoping now works the same way `university` always did — e.g. `GET /gamification/position?type=department&department_id=5` scopes the ranking to that department.

#### Error: invalid type (422)

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": { "type": ["The selected type is invalid."] }
    },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

## 32. Get XP History

### `GET /api/v1/student/gamification/xp-history`

**Query params**: `limit` (default 50) only — `offset` and `type` (awarded/deducted filter) are **not implemented** despite being previously documented.

```json
{
    "success": true,
    "message": "XP history retrieved successfully",
    "data": {
        "xp_history": [
            { "action_type": "lesson_completion", "xp_change": 10, "reason": "Completed lesson: Intro to Variables", "created_at": "2026-09-24T18:00:00.000000Z" }
        ]
    }
}
```

⚠️ Response key is `xp_history`, not `history`. No `total`/`total_awarded`/`total_deducted` fields.

## 33. Get Achievements

### `GET /api/v1/student/gamification/achievements`

**Query params**: `limit` (default 20).

This is now **personal to the requesting student** — previously it was the same global, platform-wide top-performer feed described (before this fix) in [Get Gamification Dashboard](#27-get-gamification-dashboard)'s `recent_achievements`, with no connection to the requesting student at all. As an interim fix, "achievements" means the student's own recently-earned **badges** (via `BadgeService::getRecentAchievements()`), ordered most-recent-first. A dedicated `Achievement` concept distinct from badges is deferred — see `docs/FUTURE_WORK.md`.

```json
{
    "success": true,
    "message": "Achievements retrieved successfully",
    "data": {
        "achievements": [
            { "id": 1, "name": "First Steps", "description": "Complete your first lesson", "icon_url": null, "category": "milestone", "rarity": "common", "earned_at": "2026-09-24T10:00:00.000000Z", "type": "badge", "roadmap": null },
            { "id": 7, "name": "Roadmap Completed: Software Engineering Path", "description": "Completed every course in the \"Software Engineering Path\" roadmap.", "icon_url": null, "category": "milestone", "rarity": "rare", "earned_at": "2026-10-01T10:00:00.000000Z", "type": "roadmap_completion", "roadmap": { "id": 1, "uuid": "5f1c6097-…", "slug": "software-engineering-path", "title": "Software Engineering Path" } }
        ]
    }
}
```

Each achievement now has two more fields: `type` (`"badge"`, or `"roadmap_completion"` for finishing a [roadmap](#roadmaps)) and `roadmap` (`null` unless `type` is `roadmap_completion`). The roadmap's title is the one recorded when it was earned, so it still reads correctly if the roadmap is later renamed or deleted. Existing fields are unchanged. The same two fields appear on `recent_achievements` in [Get Gamification Dashboard](#27-get-gamification-dashboard) (it uses the same data).

## 34. Check Badges

### `POST /api/v1/student/gamification/check-badges`

**Purpose**: Manually trigger a badge-eligibility check (badges are also checked automatically on XP-awarding actions).

```json
{
    "success": true,
    "message": "Badge check completed",
    "data": {
        "awarded_badges": [
            { "id": 3, "name": "Quiz Master", "description": "...", "icon_url": null }
        ],
        "count": 1
    }
}
```

⚠️ Response key is `awarded_badges` (full `Badge` model objects), not `new_badges`. There is no `checked: true` boolean field.

## 35. Get Gamification Stats

### `GET /api/v1/student/gamification/stats`

```json
{
    "success": true,
    "message": "Gamification stats retrieved successfully",
    "data": {
        "xp_stats": { "total_xp": 2450, "xp_by_action": { "lesson_completion": 1200 }, "recent_xp": 120 },
        "streak_stats": { "current_streak": 3, "longest_streak": 10, "active_days": 45, "average_activity": 2.1, "streak_history": [] },
        "badge_stats": { "total_badges": 19, "earned_badges": 5, "completion_percentage": 26.3 }
    }
}
```

⚠️ Every key was renamed from the previous version of this doc (`xp_stats`/`streak_stats`/`badge_stats`, not `xp`/`badges`/`streaks`), and there is **no `leaderboard` key at all** in this response.

---
# Leaderboard

These are a separate set of endpoints from `gamification/leaderboards` above (`LeaderboardController` vs `GamificationController`) — both exist, with overlapping but not identical shapes.

## 36. Get Leaderboard

### `GET /api/v1/student/leaderboard`

**Query params**: `period`, `limit`. ⚠️ `offset` is **not supported**, despite prior documentation.

```json
{
    "success": true,
    "message": "Leaderboard retrieved successfully",
    "data": {
        "leaderboard": [
            { "id": 5, "firstname": "Amara", "lastname": "Kamara", "avatar_url": null, "university_id": 1, "university_name": "University of Sierra Leone", "xp_total": 5200 }
        ],
        "stats": { "total_students": 500, "total_xp": 850000, "average_xp": 1700, "top_student": { "id": 5, "name": "Amara Kamara" } },
        "period": "all"
    }
}
```

⚠️ Known issues: no top-level `user_position` field; no top-level `total_users` (only `stats.total_students`); leaderboard rows do **not** include `badges_count` or `streak_days` despite being previously documented — those columns aren't selected by this query.

## 37-40. Get Specific Leaderboards

- `GET /api/v1/student/leaderboard/university?university_id={id}&period={period}`
- `GET /api/v1/student/leaderboard/faculty?faculty_id={id}&period={period}`
- `GET /api/v1/student/leaderboard/department?department_id={id}&period={period}`
- `GET /api/v1/student/leaderboard/organization?organization_id={id}&period={period}` — newly added, mirrors the university/faculty/department variants exactly.

⚠️ **Known issue**: the `university`/`faculty`/`department`/`organization` variants each **require** the corresponding `*_id` query parameter (`required|exists:...`) — omitting it returns a `422`. These do **not** auto-scope to the requesting student's own university/faculty/department/organization as previously documented; the caller must supply the ID explicitly. Each also accepts an undocumented `period` param (`all|week|month|year`).

#### Example: Organization leaderboard response

```json
{
    "success": true,
    "message": "Organization leaderboard retrieved successfully",
    "data": {
        "leaderboard": [
            { "rank": 1, "student": { "id": 8, "name": "Fatmata Sesay", "avatar_url": null }, "xp_total": 3200, "period": "all" }
        ],
        "stats": { "total_students": 40, "total_xp": 68000, "average_xp": 1700, "top_student": { "name": "Fatmata Sesay", "xp": 3200 } },
        "organization_id": 3,
        "period": "all"
    }
}
```

⚠️ `GET /api/v1/student/leaderboard/achievements` has been **removed** — it was a thin wrapper around the same broken global-feed method already covered by [Get Achievements](#33-get-achievements), and duplicated that endpoint. Use `GET /student/gamification/achievements` instead.

Two further endpoints exist and were previously entirely undocumented:

### `GET /api/v1/student/leaderboard/course`

**Required query params**: `course_id`, `limit`. Returns the leaderboard scoped to one course.
This should be used for getting the leaderboard for a course that the user or student is enrolled is.

### `GET /api/v1/student/leaderboard/stats`

Returns the same `stats` object shown in [Get Leaderboard](#36-get-leaderboard) (`total_students`, `total_xp`, `average_xp`, `top_student`) as a standalone endpoint.

---
# Feed/Social

Feed access is metered by a separate "feed-time" seconds balance (distinct from XP), automatically topped up to 30 minutes on lesson completion, or purchasable by exchanging XP (10 XP → 10 seconds). See [Get Remaining Feed Time](#48-get-remaining-feed-time) / [Exchange XP for Feed Time](#49-exchange-xp-for-feed-time).

## 41. Get Feed Posts

### `GET /api/v1/student/feed`

**Authentication**: Not required — publicly viewable so guests can browse the feed before signing up. **The `FEED_LOCKED` gating below only ever applies to an authenticated Student** — a guest (no token) or a logged-in Tutor/Admin always gets the feed with no time-based lock and no feed-time session created. `has_liked` is always `false` for a guest.

If feed access is locked for an authenticated Student (balance exhausted and not exempt), returns:

```json
{
    "success": false,
    "error": { "code": "FEED_LOCKED", "message": "Feed locked — complete a lesson or exchange 10 XP to gain access." },
    "timestamp": "2026-09-25T12:00:00.000000Z"
}
```

(this specific error has no `request_id` field, unlike the rest of the API — it's built via a raw `response()->json()` call rather than the shared `ApiResponse` helper).

Otherwise, a paginated list of raw `FeedPost` models:

```json
{
    "success": true,
    "message": "Feed retrieved successfully",
    "data": {
        "current_page": 1,
        "data": [
            {
                "id": 1,
                "uuid": "...",
                "author_id": 3,
                "type": "tip",
                "title": "Study Tip",
                "content_html": "<p>...</p>",
                "content_text": "...",
                "media_url": null,
                "tags": ["study-tips"],
                "likes_count": 12,
                "comments_count": 3,
                "shares_count": 1,
                "views_count": 200,
                "status": "approved",
                "has_liked": false,
                "author": {
                    "id": 3,
                    "uuid": "...",
                    "firstname": "Amara",
                    "lastname": "Kamara",
                    "display_name": null,
                    "avatar_url": null,
                    "bio": null,
                    "social_links": null,
                    "preferences": null,
                    "university": { "id": 1, "name": "University of Sierra Leone" },
                    "role": { "id": 2, "name": "tutor" }
                },
                "created_at": "2026-09-24T10:00:00.000000Z"
            }
        ],
        "per_page": 15,
        "total": 1
    }
}
```

⚠️ **Known issue**: `author` has **no `name` field** — build a display name from `firstname`/`lastname`/`display_name` client-side. Post items are otherwise raw model dumps with several undocumented fields.

## 42. Get Trending Posts

### `GET /api/v1/student/feed/trending`

**Authentication**: Not required — same public/guest behavior as [Get Feed Posts](#41-get-feed-posts).

⚠️ There is **no `trending_score` field** — ranking is implicit via `ORDER BY likes_count, comments_count, views_count DESC` and not surfaced as a numeric score. Items are the same raw `FeedPost` shape as above (un-reduced `author`).

## 43. Get Posts by Tags

### `POST /api/v1/student/feed/tags`

**Authentication**: Not required — same public/guest behavior as [Get Feed Posts](#41-get-feed-posts), despite the `POST` verb (this endpoint is read-only; `POST` is used only because `tags` is an array in the body).

```json
{ "tags": ["study-tips", "exams"], "per_page": 15 }
```

| Field | Type | Required |
| --- | --- | --- |
| `tags` | array of strings | Yes, min 1 item, each max 50 chars |
| `per_page` | integer | No, default 15 |

Same `FEED_LOCKED` gating as [Get Feed Posts](#41-get-feed-posts). Response is the **raw paginator passed directly as `data`** (not wrapped in a `posts` key):

```json
{
    "success": true,
    "message": "Posts by tags retrieved successfully",
    "data": {
        "current_page": 1,
        "data": [
            { "id": 1, "uuid": "...", "author_id": 3, "type": "tip", "title": "Study Tip", "tags": ["study-tips"], "author": { "id": 3, "firstname": "Amara", "lastname": "Kamara" } }
        ],
        "per_page": 15,
        "total": 1
    }
}
```

## 44. Get Post Details

### `GET /api/v1/student/feed/{post}`

**Authentication**: Not required — same public/guest behavior as [Get Feed Posts](#41-get-feed-posts). `has_liked` is always `false` for a guest.

The `post` object itself has the same raw-model exposure as [Get Feed Posts](#41-get-feed-posts) (expect extra raw columns beyond what's shown below), with `author` reduced to a safe subset. `comments[].user` is **also now reduced** — previously it was the raw Student/CreationUser model (leaking fields like `email`/`phone`), with no field reduction at all.

```json
{
    "success": true,
    "message": "Post retrieved successfully",
    "data": {
        "post": {
            "id": 5,
            "uuid": "...",
            "author_id": 3,
            "type": "resource",
            "title": "Understanding Recursion",
            "content_html": "<p>...</p>",
            "has_liked": false,
            "likes_count": 12,
            "comments_count": 1,
            "shares_count": 2,
            "views_count": 40,
            "author": {
                "id": 3,
                "uuid": "...",
                "firstname": "Amara",
                "lastname": "Kamara",
                "display_name": "Dr. Amara Kamara",
                "avatar_url": null,
                "bio": "Computer science lecturer",
                "social_links": null,
                "preferences": null,
                "university": { "id": 1, "name": "University of Sierra Leone" },
                "role": { "id": 2, "name": "tutor" }
            },
            "comments": [
                {
                    "id": 8,
                    "content": "Great explanation, thanks!",
                    "user_type": "student",
                    "is_approved": true,
                    "created_at": "2026-09-25T09:00:00.000000Z",
                    "user": {
                        "id": 12,
                        "uuid": "...",
                        "firstname": "John",
                        "lastname": "Doe",
                        "avatar_url": null
                    }
                }
            ]
        }
    }
}
```

`comments[].user` is now reduced to `{id, uuid, firstname, lastname, avatar_url}` regardless of whether the commenter is a `Student` or `CreationUser` (the relation is polymorphic) — `email`/`phone`/and other raw model fields are no longer exposed. Also note `comments` here only ever contains **approved** comments — a previously-broken eager-load (`'comments.approved'`, which tried to treat a query scope as a nested Eloquent relation) crashed this entire endpoint with a `500` whenever a post had any comments at all; this is now fixed as `'comments' => fn ($q) => $q->approved()->with('user')`.

### Error Responses

#### Post Not Found (404)

```json
{
    "success": false,
    "error": { "code": "POST_NOT_FOUND", "message": "Post not found" },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

Returned both for a truly nonexistent post ID and for a post that exists but isn't approved (pending posts are treated as not-found for students, rather than returning a distinct "not approved" error).

## 45. Like/Unlike Post

### `POST /api/v1/student/feed/{post}/like`

**Authentication**: Required — a Student account. Unlike browsing the feed, engaging with it (like/comment/share) still requires signing up; redirect a guest to signup here.

**Purpose**: Toggles like state (calling it again on an already-liked post unlikes it). No request body.

⚠️ **Known issue**: the response is simply `{"liked": true|false}` — there is **no `likes_count` in this response** (previously assumed to be present). Liking costs the student 2 XP (`config('api.xp.feed_like')`, default 2) via `XpService::deductXp()`; unliking does not refund it.

```json
{ "success": true, "message": "Post liked successfully", "data": { "liked": true } }
```

```json
{ "success": true, "message": "Post unliked successfully", "data": { "liked": false } }
```

## 46. Comment on Post

### `POST /api/v1/student/feed/{post}/comment`

**Authentication**: Required — a Student account. Redirect a guest to signup here.

```json
{
    "success": true,
    "message": "Comment added successfully",
    "data": {
        "comment": {
            "id": 20,
            "uuid": "...",
            "user_id": 1,
            "user_type": "student",
            "feed_post_id": 5,
            "content": "Great tip!",
            "is_approved": true,
            "created_at": "2026-09-25T12:00:00.000000Z"
        }
    }
}
```

⚠️ **Known issue**: the response is the **raw, just-created `FeedComment` model with no `user` relation loaded** — there is **no** nested `user:{id,name,avatar_url}` object as previously documented. If you need to render the commenter immediately, use the student data you already have client-side rather than expecting it in this response.

## 47. Share Post

### `POST /api/v1/student/feed/{post}/share`

**Authentication**: Required — a Student account. Redirect a guest to signup here.

```json
{ "platform": "whatsapp" }
```

`platform` is optional (nullable string, max 50 chars — e.g. `whatsapp`, `twitter`, `facebook`; not validated against a fixed enum). Deducts 3 XP (`config('api.xp.feed_share')`, default 3) via `XpService::deductXp()`.

```json
{ "success": true, "message": "Post shared successfully", "data": [] }
```

`data` is an empty array here (not omitted) — the controller explicitly passes `[]`.

## 48. Get Remaining Feed Time

### `GET /api/v1/student/feed/remaining`

**Authentication**: Required — a Student account (feed-time balance is a per-student concept; there's nothing to report for a guest).

```json
{ "success": true, "message": "Remaining feed time retrieved successfully", "data": { "seconds": 1500, "unlimited": false } }
```

`seconds` is `null` when `unlimited: true` (student not enrolled in any course and no published courses exist in their scope).

## 49. Exchange XP for Feed Time

### `POST /api/v1/student/feed/exchange`

**Authentication**: Required — a Student account (exchanges the student's own XP balance).

```json
{ "xp": 20 }
```

⚠️ **Known issue**: the request field is `xp` — **not `xp_amount`** as sometimes assumed. Required, integer, minimum 10, must be a multiple of 10.

```json
{ "success": true, "message": "XP exchanged for feed time successfully", "data": { "seconds": 1820 } }
```

`seconds` is the student's new total feed-time balance (not just the seconds just added). An `X-Client-Event-Id` request header makes the exchange idempotent (retry-safe).

### Error Responses

```json
{ "success": false, "error": { "code": "INVALID_XP_AMOUNT", "message": "..." }, "timestamp": "2026-09-25T12:00:00.000000Z", "request_id": "req_abc123" }
```

```json
{ "success": false, "error": { "code": "INSUFFICIENT_XP", "message": "..." }, "timestamp": "2026-09-25T12:00:00.000000Z", "request_id": "req_abc123" }
```

Both `400`.

## 50. End Feed Session

### `POST /api/v1/student/feed/session/end`

**Authentication**: Required — a Student account (ends the student's own feed session).

No request body. Ends the student's currently-active feed session (deducting elapsed seconds from their balance).

```json
{ "success": true, "message": "Feed session ended successfully", "data": [] }
```

### Error Responses

#### No Active Session (404)

```json
{ "success": false, "error": { "code": "NO_ACTIVE_SESSION", "message": "No active session found" }, "timestamp": "2026-09-25T12:00:00.000000Z", "request_id": "req_abc123" }
```

---

# Analytics **Not ready for consumption yet**

⚠️ **General note**: several sub-metrics in this section (`daily_patterns`, `weekly_patterns`, `content_preferences`, `peak_hours`, and some fields inside `insights`) are currently computed by backend helper methods that return **hard-coded placeholder values regardless of the actual student's data** (e.g. always `'Monday','Wednesday','Friday'`, always `75.0`, always `'improving'`). This is a known backend limitation, not a documentation error — real per-student computation for these specific sub-fields hasn't been implemented yet. Everything else in this section reflects real, student-specific data.
**These aren't meant to be displayed to students for now.**

## 51. Get Analytics Dashboard

### `GET /api/v1/student/analytics/dashboard`

```json
{
    "success": true,
    "message": "Analytics dashboard retrieved successfully",
    "data": {
        "learning": {
            "total_time_spent": 36000,
            "average_completion_rate": 68.5,
            "total_lessons_completed": 18,
            "average_score": 82.3,
            "performance_distribution": { "excellent": 5, "good": 10, "average": 3 },
            "recent_activity": [],
            "strengths": ["Consistent daily practice"],
            "weaknesses": ["Quiz retry rate is high"],
            "recommendations": ["Review Module 2 before the next quiz"]
        },
        "engagement": {
            "total_active_minutes": 320,
            "average_session_duration": 18.5,
            "total_sessions": 25,
            "engagement_score": 72,
            "engagement_level": "high",
            "content_interaction": { "lessons_viewed": 30, "quizzes_attempted": 15 },
            "social_engagement": { "comments_made": 4, "likes_given": 12, "shares_made": 1, "questions_asked": 2 },
            "achievements": { "xp_earned": 2450, "badges_earned": 5, "streak_days": 3 }
        },
        "period": "month",
        "period_start": "2026-08-25T00:00:00.000000Z",
        "period_end": "2026-09-25T23:59:59.000000Z"
    }
}
```

⚠️ `total_time_spent` is in **seconds**, not minutes. `learning`/`engagement` field names above are the real ones — the previous version of this doc used entirely different, fictional field names (`courses_completed`, `time_spent_minutes`, `daily_active_days`, `posts_liked`, etc.) for this same endpoint.

## 52. Get Course Analytics

### `GET /api/v1/student/analytics/course/{course:uuid}`

⚠️ Returns the **same generic `learning`/`engagement` object shape as [Get Analytics Dashboard](#51-get-analytics-dashboard)** (filtered to the one course), plus a `course: {id, title, description}` object — there is **no** separate `progress`/`time_spent`/`performance` breakdown as previously documented.

## 53. Get Progress Analytics

### `GET /api/v1/student/analytics/progress`

Returns a **day-by-day timeline**, not a dashboard-style summary:

```json
{
    "success": true,
    "message": "Progress analytics retrieved successfully",
    "data": {
        "progress": [
            { "date": "2026-09-24", "total_time_spent": 1800, "lessons_completed": 2, "average_score": 85, "engagement_score": 70 }
        ],
        "period": "month",
        "course_id": null
    }
}
```

## 54. Get Insights

### `GET /api/v1/student/analytics/insights`

```json
{
    "success": true,
    "message": "Insights retrieved successfully",
    "data": {
        "performance_summary": {
            "overall_performance": "good",
            "learning_velocity": "steady",
            "consistency_score": 75.0,
            "improvement_trend": "improving"
        },
        "strengths": ["Consistent daily practice"],
        "weaknesses": ["Quiz retry rate is high"],
        "recommendations": ["Review Module 2 before the next quiz"],
        "improvement_areas": ["Time management on timed quizzes"],
        "next_goals": ["Complete 3 more lessons this week"]
    }
}
```

⚠️ There is **no `insights` array** as previously documented — the real top-level keys are `performance_summary`, `strengths`, `weaknesses`, `recommendations`, `improvement_areas`, `next_goals`. `consistency_score` and `improvement_trend` are currently hard-coded placeholders (see the section-wide note above).

## 55. Get Engagement Analytics

### `GET /api/v1/student/analytics/engagement`

```json
{
    "success": true,
    "message": "Engagement analytics retrieved successfully",
    "data": {
        "metrics": { "...": "same shape as the engagement object in #51" },
        "patterns": {
            "daily_patterns": "hard-coded placeholder, see section note",
            "weekly_patterns": "hard-coded placeholder, see section note",
            "content_preferences": "hard-coded placeholder, see section note",
            "peak_hours": ["Monday", "Wednesday", "Friday"]
        },
        "period": "month"
    }
}
```

## 56. Generate Performance Report

### `POST /api/v1/student/analytics/reports`

```json
{
    "report_type": "learning_progress",
    "period_type": "monthly",
    "course_id": 1,
    "include_recommendations": true
}
```

| Field                      | Type    | Required | Notes |
| -------------------------- | ------- | -------- | ----- |
| `report_type`               | string  | Yes      | `learning_progress,engagement_summary,performance_analysis` |
| `period_type`                | string  | Yes      | `daily,weekly,monthly,quarterly,yearly` |
| `course_id`                  | integer | No       | |
| `include_recommendations`    | boolean | No       | |

⚠️ **Known issue**: previously documented request fields (`period`, `include_courses`, `include_engagement`) don't exist — sending that payload would fail `422` against this endpoint. `report_type`/`period_type` are the real required fields.

```json
{
    "success": true,
    "message": "Report generation started successfully",
    "data": {
        "report": { "id": 1, "uuid": "...", "report_type": "learning_progress", "status": "completed", "period_start": "...", "period_end": "..." },
        "download_url": "https://your-app.test/api/v1/student/analytics/reports/{uuid}/download"
    }
}
```

Report generation runs **synchronously** within this request (despite an internal code comment calling it asynchronous) — by the time this response returns, `report.status` is usually already `completed` (or `failed`, if something went wrong collecting the data) and `download_url` reflects that immediately.

## 57. Get Reports List

### `GET /api/v1/student/analytics/reports`

⚠️ Returns the **raw paginator directly** as `data` — there is **no `reports` wrapper key** as previously documented (`data.data[]`, not `data.reports[]`). Only `completed`, non-expired reports are returned.

## 58. Download Report

### `GET /api/v1/student/analytics/reports/{report:uuid}/download`

⚠️ **Known issue — this does not stream a file.** Despite the name, this returns **JSON metadata**, not a PDF/binary download:

```json
{
    "success": true,
    "message": "Download URL generated successfully",
    "data": {
        "download_url": "https://your-app.test/api/v1/student/analytics/reports/{uuid}/download",
        "file_size": "12.4 KB",
        "file_format": "json"
    }
}
```

### Error Responses

`REPORT_NOT_READY` (409) if the report hasn't finished generating, `REPORT_FILE_MISSING` (404) if the underlying file is gone, `UNAUTHORIZED`/403 if it belongs to another student.

---
# Search

## 59. Global Search

### `GET /api/v1/student/search`

```json
{
    "success": true,
    "message": "Search completed successfully",
    "data": {
        "query": "mathematics",
        "results": [
            { "id": 1, "uuid": "...", "type": "Course", "category": "courses", "title": "Intro to Mathematics", "description": "...", "tags": ["math"] }
        ],
        "total_count": 1,
        "has_more": false,
        "filters_applied": {},
        "category": null
    }
}
```

This reflects the current, corrected response shape (`total_count`/`has_more`/`filters_applied`/`category`, flat `results` array) — an earlier version of this backend endpoint returned a different, broken shape (`total_results`/`categories`/results nested by type) that has since been fixed.

## 60. Search Courses

### `GET /api/v1/student/search/courses`

`level` (optional filter) accepts `UnderGrad`, `100`–`500`, `graduate` or `general`; anything else is a `422`. It is an exact match: only courses at that level come back (`total_count` counts only those).

```json
{
    "success": true,
    "message": "Course search completed successfully",
    "data": {
        "query": "programming",
        "results": [
            {
                "id": 1, "uuid": "...", "title": "Intro to Programming", "description": "...",
                "level": "100", "status": "published", "creator": { "id": 3, "name": "Dr. Amara Kamara" },
                "tags": ["programming"], "enrollments_count": 42, "thumbnail_url": null
            }
        ],
        "total_count": 1,
        "has_more": false,
        "filters_applied": { "level": "100" },
        "category": "courses"
    }
}
```

## 61. Search Posts

### `GET /api/v1/student/search/posts`

Same envelope as Search Courses (`total_count`, `has_more`, `filters_applied`, `category: "posts"`), with post-shaped result items: `{id, uuid, title, content_text, type, tags, author, likes_count, comments_count}`.

## 62. Get Search Suggestions

### `GET /api/v1/student/search/suggestions`

```json
{ "success": true, "message": "Search suggestions retrieved successfully", "data": { "suggestions": ["mathematics", "math tutoring"] } }
```

⚠️ No echoed `query` field in the response.

## 63. Get Popular Search Queries

### `GET /api/v1/student/search/popular`

⚠️ The `days` query parameter is **not accepted** by this endpoint (only `category`, `limit`) — sending it is silently ignored.

```json
{ "success": true, "message": "Popular queries retrieved successfully", "data": { "queries": [{ "query": "mathematics", "frequency": 42 }] } }
```

Item shape is `{query, frequency}` — not `{query, count, category}`, and there is no `period_days` field.

## 64. Get Recent Search Queries

### `GET /api/v1/student/search/recent`

```json
{ "success": true, "message": "Recent queries retrieved successfully", "data": { "queries": [{ "query": "mathematics", "category": "courses", "executed_at": "2026-09-25T10:00:00.000000Z" }] } }
```

Accurate as previously documented.

## 65. Get Search Analytics **Not ready to be consumed**

### `GET /api/v1/student/search/analytics`

⚠️ **Known issue**: despite the name and the "personal search patterns" framing this had previously, this endpoint computes **platform-wide, global** statistics — it is **not scoped to the requesting student at all**. It also accepts an undocumented `days` param (1-365, default 30).

```json
{
    "success": true,
    "message": "Search analytics retrieved successfully",
    "data": {
        "total_searches": 1204,
        "unique_queries": 340,
        "popular_queries": [{ "query": "mathematics", "frequency": 42 }],
        "searches_by_category": [{ "category": "courses", "count": 600 }],
        "searches_by_day": [{ "date": "2026-09-25", "count": 80 }]
    }
}
```

There is no `most_searched_topics`, `average_searches_per_day`, or `search_success_rate` field anywhere in the actual response.

---
# File Uploads

All media (avatars, course thumbnails, feed media, documents) shares one general-purpose Cloudinary presign flow under `/api/v1/upload/*` (**not** under `/student/*` — these routes are shared across student, tutor, and admin). See [Update Avatar](#10-update-avatar-cloudinary-flow) for the full 3-step walkthrough; the `purpose` field there can be any of `avatar, credential, lesson_media, feed_media, thumbnail, document`, each with its own size/MIME-type limits enforced in `CloudinaryService`.

> **The Resources library does not use this flow.** Library files (PDF/PowerPoint/Word/Excel for the academic resource library) live in a separate private store and are uploaded by tutors/educators/contributors/admins through their own handshake (`POST /tutor/resources/uploads` → direct `PUT` to the storage link → `POST /tutor/resources`); see `CREATION_USER_API_PAYLOADS.md` → *Resource Library* and `RESOURCES_API.md`. **Students cannot upload resources.** Nothing in the Cloudinary flow above changed.

### `POST /api/v1/upload/presign`

Step 1 of the flow — see [Update Avatar](#10-update-avatar-cloudinary-flow).

### `POST /api/v1/upload/store-metadata`

Step 3 of the flow — see [Update Avatar](#10-update-avatar-cloudinary-flow).

### `DELETE /api/v1/upload/{file}`

Deletes a previously-uploaded file from both Cloudinary and the local `file_uploads` record. Only the uploader (or an admin) may delete it.

```json
{ "success": true, "message": "File deleted successfully", "timestamp": "2026-09-25T12:00:00.000000Z", "request_id": "req_abc123" }
```

⚠️ This endpoint exists and works but was previously undocumented entirely.

### Deprecated legacy endpoints (all return `410 Gone`)

`POST /api/v1/upload/avatar`, `POST /api/v1/upload/credential`, `POST /api/v1/upload/lesson-media`, `POST /api/v1/upload/feed-media` are **hard-deprecated stubs**:

```json
{
    "success": false,
    "error": { "code": "DEPRECATED_ENDPOINT", "message": "This endpoint has been deprecated. Use the presigned upload flow instead." },
    "timestamp": "2026-09-25T12:00:00.000000Z",
    "request_id": "req_abc123"
}
```

⚠️ **Do not confuse these with `POST /api/v1/student/profile/avatar`** (a *different* route, under `/student/profile/`, which is still fully functional — see [Update Avatar](#10-update-avatar-cloudinary-flow)'s "Legacy Direct Upload" note). The four routes above, without `/student/profile/` in the path, are the ones that now always return 410.

---

# Vybe Coins

_Added 2026-09-30. Needs the `2026_09_30_*` migrations._

Vybe Coins are a second reward currency, **separate from XP** and worth real money. In V1 there is exactly **one way to earn them**: completing a **paid** course you paid for (the reward is the course's `coin_reward`, paid **once per student per course, ever**). They can be exchanged for Leones: you request an exchange, the coins are **reserved**, and an admin pays the Leones **by hand over Mobile Money** and records the result. Nothing is paid automatically. Coins do not expire, and there is no way to send, gift or transfer them to another student.

Every endpoint below requires a **Student** account (`401` for a guest, `403` for a tutor/admin token).

**The three balances** (all whole coins):

| Field | Meaning |
| --- | --- |
| `available` | What the student can use right now. **Excludes** reserved coins. |
| `reserved` | Locked against a pending/processing exchange request. Can't be spent or exchanged again. |
| `redeemed` | Coins whose exchange was paid out (permanently spent). |
| `total_earned` | `available + reserved + redeemed` — everything ever earned. |

Lifecycle of a coin: **available → reserved → redeemed**. A rejected or failed exchange returns its reserved coins to `available`; coins never just disappear.

## 66. Get Wallet

### `GET /api/v1/student/coins`

Everything the wallet/exchange screen needs in one call: the balances, the **live** rate, the minimum, and whether exchanging is open.

```json
{
    "success": true,
    "message": "Vybe Coins retrieved successfully",
    "data": {
        "balance": { "available": 1000, "reserved": 1000, "redeemed": 0, "total_earned": 2000 },
        "exchange": {
            "available": true,
            "payout_method": "mobile_money",
            "rate": { "coins": 100, "leones": 10.0, "currency": "SLE" },
            "min_exchange_coins": 500
        },
        "open_exchanges_count": 1
    }
}
```

- `rate` reads "**100 Coins = Le 10.00**". It is set by an admin and can change; **don't hard-code it**. `exchange.available` is `false` (and `rate`/`min_exchange_coins` are `null`) until an admin has set a rate — show "Exchange coming soon".
- **Leone value of N coins** = `floor(N × rate.leones × 100 / rate.coins) / 100` — i.e. rounded **down** to the smallest unit (10 coins at 3 Coins = Le 1.00 is Le 3.33). Use it for the live "you will receive" preview; the server recomputes and stores its own figure at submission.
- The same `balance` object is also on `GET /student/dashboard` (`data.student.coins`) and `GET /student/profile` (`data.student.coins`).
- Rate changes are announced in the **feed** as an `announcement` post (tag `vybe-coins`), so students aren't surprised.

## 67. Coin History

### `GET /api/v1/student/coins/transactions`

The student's statement, newest first. Query: `type` (`course_reward` | `exchange_reserve` | `exchange_release` | `exchange_redeem`), `per_page` (1–100, default 20), `page`. Standard `data[]` + `meta` pagination.

```json
{
    "success": true,
    "message": "Coin history retrieved successfully",
    "data": [
        {
            "id": "b0c1…-uuid",
            "type": "exchange_reserve",
            "direction": "debit",
            "amount": 1000,
            "available_delta": -1000,
            "reserved_delta": 1000,
            "redeemed_delta": 0,
            "balance_after": { "available": 1000, "reserved": 1000, "redeemed": 0 },
            "description": "Exchange requested: 1,000 Coins → Le 100.00",
            "course": null,
            "exchange": { "id": "e7d2…-uuid", "status": "pending", "coins": 1000, "leone_amount": 100.0, "currency": "SLE" },
            "created_at": "2026-09-30T12:00:00.000000Z"
        },
        {
            "id": "a3f9…-uuid",
            "type": "course_reward",
            "direction": "credit",
            "amount": 500,
            "available_delta": 500,
            "reserved_delta": 0,
            "redeemed_delta": 0,
            "balance_after": { "available": 2000, "reserved": 0, "redeemed": 0 },
            "description": "Completed course: Introduction to Accounting",
            "course": { "id": 7, "title": "Introduction to Accounting", "slug": "introduction-to-accounting" },
            "exchange": null,
            "created_at": "2026-09-29T09:30:00.000000Z"
        }
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 20, "total": 2, "from": 1, "to": 2 }
}
```

| `type` | `direction` | Shown as | Effect |
| --- | --- | --- | --- |
| `course_reward` | `credit` | **+500** Completed "…" | `available` ↑ |
| `exchange_reserve` | `debit` | **−1,000** Coin exchange — Le 100 (pending) | `available` ↓, `reserved` ↑ |
| `exchange_release` | `credit` | **+1,000** Exchange rejected/failed — coins returned | `reserved` ↓, `available` ↑ |
| `exchange_redeem` | `neutral` | Exchange completed — Le 100 paid out | `reserved` ↓, `redeemed` ↑ (`available` unchanged — those coins already left it at the reserve step) |

Use `available_delta` for the signed number in the list, and `direction` to colour it. `balance_after` is a running balance.

## 68. Submit an Exchange Request

### `POST /api/v1/student/coins/exchanges`

Asks to exchange coins for Leones. **This does not pay anyone.** It reserves the coins and queues the request for an admin, who sends the Mobile Money payment manually. Rate-limited to 10/minute.

**Headers**: `Idempotency-Key: <unique string>` — **required** (or send it as an `idempotency_key` body field). Generate one (e.g. a UUID) **when the exchange form is opened** and send the *same* value on every retry of that submission. 8–64 characters from `A–Z a–z 0–9 . _ : -`.

```json
{ "coins": 1000, "mobile_money_number": "+232 76 123456" }
```

| Field | Rules |
| --- | --- |
| `coins` | required, whole number ≥ 1. Must also be ≥ the current `min_exchange_coins` and ≤ `balance.available`. |
| `mobile_money_number` | required. A Sierra Leone number, written any usual way — `+232 76 123456`, `076123456`, `23276123456`, `76-123-456`. Stored/returned normalised as `+23276123456`. |

**`201` on success:**

```json
{
    "success": true,
    "message": "Exchange request submitted. Your coins are reserved until it is processed.",
    "data": {
        "exchange": {
            "id": "e7d2…-uuid",
            "coins": 1000,
            "rate": { "coins": 100, "leones": 10.0 },
            "leone_amount": 100.0,
            "currency": "SLE",
            "payout_method": "mobile_money",
            "mobile_money_number": "+23276123456",
            "status": "pending",
            "coins_reserved": true,
            "rejection_reason": null,
            "payout_reference": null,
            "processed_at": null,
            "created_at": "2026-09-30T12:00:00.000000Z",
            "history": [ { "status": "pending", "at": "2026-09-30T12:00:00.000000Z" } ]
        },
        "balance": { "available": 1000, "reserved": 1000, "redeemed": 0, "total_earned": 2000 },
        "idempotent_replay": false
    }
}
```

`rate` and `leone_amount` are **frozen at the moment of the request** — a later admin rate change never alters them. Show the returned `balance` immediately.

**Retrying is safe.** Re-sending the same `Idempotency-Key` with the same body returns `200` with the **original** exchange and `idempotent_replay: true` — no second request, no extra coins reserved (even if the balance has changed since). Use this for double-clicks, timeouts and "retry" buttons. Reusing a key with a *different* body is `409 IDEMPOTENCY_KEY_REUSED`. As a second safety net, an identical request (same coins + same number) made within 60 seconds of an open one is refused as `409 DUPLICATE_EXCHANGE_REQUEST` even with a fresh key.

### Errors

The backend enforces every rule itself; show `error.message` to the student. All use the standard error envelope.

| HTTP | `error.code` | When | `error.details` |
| --- | --- | --- | --- |
| 422 | `VALIDATION_ERROR` | bad/missing `coins`, `mobile_money_number` or `Idempotency-Key` | per-field messages |
| 422 | `BELOW_MINIMUM_EXCHANGE` | `coins` < the current minimum | `{ min_exchange_coins, requested_coins }` |
| 422 | `INSUFFICIENT_COINS` | `coins` > `available` (reserved coins don't count) | `{ available_coins, requested_coins }` |
| 422 | `EXCHANGE_VALUE_TOO_SMALL` | worth less than the smallest currency unit at the current rate | — |
| 503 | `EXCHANGE_UNAVAILABLE` | an admin hasn't set a rate yet | — |
| 403 | `ACCOUNT_NOT_ACTIVE` | suspended/pending account | — |
| 409 | `DUPLICATE_EXCHANGE_REQUEST` / `IDEMPOTENCY_KEY_REUSED` | see above | — |
| 409 | `CONCURRENT_MODIFICATION` | the balance changed mid-request (rare) — just retry with the **same** key | — |
| 429 | — | more than 10 submissions in a minute | — |

## 69. List / View My Exchange Requests

### `GET /api/v1/student/coins/exchanges` and `GET /api/v1/student/coins/exchanges/{exchange}`

List: `status` filter (`pending` | `processing` | `completed` | `rejected` | `failed`), `per_page`, standard `data[]` + `meta`. Detail: `{ "data": { "exchange": {…} } }` (same shape as above; `{exchange}` is the `id` uuid). Someone else's request is a `404`.

| `status` | What the student should see | Coins |
| --- | --- | --- |
| `pending` | "Waiting for review" | reserved (`coins_reserved: true`) |
| `processing` | "Being processed" — an admin is sending the payment | reserved |
| `completed` | "Paid — Le 100.00 sent to +232…" (`payout_reference` is the Mobile Money reference) | **redeemed** |
| `rejected` | "Rejected" + `rejection_reason` | **returned** to `available` |
| `failed` | "Payment could not be completed" + `rejection_reason` | **returned** to `available` |

`rejected`, `failed` and `completed` are final. `history[]` is a simple status timeline (`{status, at}`). `rejection_reason` is only set for `rejected`/`failed`; `payout_reference` only for `completed`. Admin-only details (internal notes, which admin handled it) are never returned to students.

---

# Roadmaps

A **roadmap** is an admin-curated, **ordered** learning journey over existing courses (`Course A → B → C → …`). It *recommends* a sequence; it never restricts one.

- **There is no "enroll in a roadmap".** A student becomes a participant of a roadmap by enrolling in / taking **any** of its courses (even the last one) — `is_participant` flips to `true` on its own. Don't build a "Join roadmap" button.
- **Nothing is ever locked.** Course 2 is not locked because Course 1 is unfinished. Free/Paid enrollment, paid checkout and all content endpoints are exactly as before; a paid course inside a roadmap still goes through the normal payment flow (and counts as "taken" only once payment has enrolled the student).
- **Course state belongs to the course, not the roadmap.** Admins can add / remove / re-order a roadmap's courses at any time; that never changes anyone's enrollment or completion. The roadmap just re-presents the new sequence and re-derives progress from it.
- **Progress** = `completed_courses / total_courses` over the **whole** roadmap — never just the page you loaded. **Current course** = the first course, in the whole sequence, the student hasn't completed (even if they entered through a later course); it is reported with its absolute `position` and the `page` it is on, so the client can jump to it.
- **Total / numbering count only courses a student can take** (published, not deleted). A course an admin has since unpublished disappears from the roadmap for students and the numbering closes up.
- **Metadata** (`university`, `faculty`, `department`, `organization`, `level` = academic year, `semester`): `null` means **general / open**. A roadmap's `level` can also be the explicit value **`"general"`** (wider audience, not tied to one year) — show it as a label, don't treat it as a number; for ordering it counts as open, never as a mismatch. It only affects *ordering* in discovery; every roadmap stays viewable and joinable whatever its metadata.
- Guests can browse (list / detail / pages) like course browsing; they just get no personal standing (`progress: null`, `is_participant: false`).

Common shapes (all numbers below are computed over the whole roadmap):

```json
"progress": { "completed_courses": 1, "total_courses": 4, "percent": 25 },
"current_course": {
    "position": 3,                // 1-based place in the WHOLE roadmap
    "page": 2,                    // page this course is on at the page size of this request
    "course": { "id": 3, "uuid": "…", "slug": "databases", "title": "Databases", "thumbnail_url": null, "is_paid": false, "price": null }
},
"badge": {                        // the roadmap's completion badge
    "id": 1, "uuid": "…", "name": "Roadmap Completed: Software Engineering Path",
    "description": "Completed every course in the \"Software Engineering Path\" roadmap.",
    "icon_url": null, "rarity": "rare",
    "earned": false, "earned_at": null     // earned is permanent once true
}
```

`percent` is rounded to 2 decimals (`33.33`). `current_course` is `null` for a guest, for someone who hasn't taken any course of the roadmap, and for someone who has finished it. `is_completed` is *live* (it goes back to `false` if the roadmap later gains a course the student hasn't done); `badge.earned` is *permanent*.

## 70. List / Discover Roadmaps

### `GET /api/v1/student/roadmaps`

**Authentication**: Optional (public, like course browsing). Send the Bearer token to get personal standing and profile-based ordering.

**Query params** (all optional): `search` (title/description), `university_id`, `faculty_id`, `department_id`, `organization_id`, `level` (`general` is a value like any other: `?level=general` returns only the `general` roadmaps; `?level=200` does not include them), `semester` (exact-match narrowing — leave them out to get everything), `participating` (`true`/`1` = only roadmaps I'm taking part in; **needs a Student token**, a guest gets `401`), `sort` (`relevance` | `newest` | `title`), `page`, `per_page` (default 15, max 50).

**Ordering.** A signed-in student gets `sort=relevance` by default: roadmaps closest to their profile first (their department, then faculty, university, organization, academic year), then **open** roadmaps, then ones aimed at other departments/universities. This only *orders* — nothing is hidden. Guests get `newest`. Only **published** roadmaps that have at least one course students can take are listed.

```json
{
    "success": true,
    "message": "Roadmaps retrieved successfully",
    "data": [
        {
            "id": 1, "uuid": "5f1c6097-…", "slug": "software-engineering-path",
            "title": "Software Engineering Path",
            "description": "From first program to deployed app.",
            "thumbnail_url": null,
            "published_at": "2026-10-01T00:44:43.000000Z",
            "level": "200", "semester": null,
            "university": { "id": 1, "name": "University of Sierra Leone" },
            "faculty": { "id": 1, "name": "Engineering" },
            "department": { "id": 1, "name": "Computer Science" },
            "organization": null,
            "total_courses": 4,
            "is_participant": true,
            "is_completed": false,
            "progress": { "completed_courses": 1, "total_courses": 4, "percent": 25 },
            "current_course": { "position": 1, "page": 1, "course": { "id": 1, "uuid": "…", "slug": "intro-to-programming", "title": "Intro to Programming", "thumbnail_url": null, "is_paid": false, "price": null } },
            "badge": { "id": 1, "uuid": "…", "name": "Roadmap Completed: Software Engineering Path", "description": "…", "icon_url": null, "rarity": "rare", "earned": false, "earned_at": null },
            "relevance_score": 30
        }
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 1, "from": 1, "to": 1 }
}
```

`relevance_score` (integer, higher = closer to the profile) is present for a signed-in student whatever the `sort` (it only *orders* the list when `sort=relevance`, the default); guests don't get it. In this list `current_course.page` is computed at the **default** course page size; the detail endpoints compute it at the page size you ask for. For a guest, `progress` and `current_course` are `null` and `is_participant`/`is_completed` are `false`. The standard `data[]` + `meta` pagination shape applies.

## 71. Get a Roadmap (with one page of its courses)

### `GET /api/v1/student/roadmaps/{roadmap}`

`{roadmap}` is the numeric id, the `uuid` or the `slug`. **Authentication**: Optional. A draft/archived/deleted roadmap is a `404`.

**Query params**: `page` — a positive integer **or the word `current`** (the page holding the student's current course; page 1 if they have none) — and `per_page` (default **7**, server cap **50**; the *client picks* the size that fits its viewport — 6 or 7 is only a default, not a rule).

```json
{
    "success": true,
    "message": "Roadmap retrieved successfully",
    "data": {
        "roadmap": {
            "id": 1, "uuid": "5f1c6097-…", "slug": "software-engineering-path", "title": "Software Engineering Path",
            "description": "From first program to deployed app.", "thumbnail_url": null, "published_at": "2026-10-01T00:44:43.000000Z",
            "level": "200", "semester": null,
            "university": { "id": 1, "name": "University of Sierra Leone" }, "faculty": { "id": 1, "name": "Engineering" },
            "department": { "id": 1, "name": "Computer Science" }, "organization": null,
            "total_courses": 4,
            "is_participant": true,
            "is_completed": false,
            "progress": { "completed_courses": 1, "total_courses": 4, "percent": 25 },
            "current_course": { "position": 1, "page": 1, "course": { "id": 1, "uuid": "…", "slug": "intro-to-programming", "title": "Intro to Programming", "thumbnail_url": null, "is_paid": false, "price": null } },
            "badge": { "id": 1, "uuid": "…", "name": "Roadmap Completed: Software Engineering Path", "description": "…", "icon_url": null, "rarity": "rare", "earned": false, "earned_at": null }
        },
        "courses": [
            {
                "position": 1,
                "is_current": true,
                "status": "not_enrolled",
                "is_enrolled": false,
                "progress_percent": 0,
                "completed_at": null,
                "course": { "id": 1, "uuid": "…", "title": "Intro to Programming", "slug": "intro-to-programming", "level": "500", "status": "published", "is_paid": false, "price": null, "coin_reward": 0 }
            },
            {
                "position": 2,
                "is_current": false,
                "status": "completed",
                "is_enrolled": true,
                "progress_percent": 100,
                "completed_at": "2026-10-01T00:44:43.000000Z",
                "course": { "id": 2, "uuid": "…", "title": "Data Structures", "slug": "data-structures", "level": "300", "status": "published", "is_paid": false, "price": null, "coin_reward": 0 }
            }
        ]
    },
    "meta": { "current_page": 1, "last_page": 2, "per_page": 2, "total": 4, "from": 1, "to": 2 }
}
```

- `courses[]` is **one page**, in the roadmap's exact order. `course` is the same object as in `GET /student/courses` (trimmed above). `meta` describes **that page of courses** (`total` = all courses in the roadmap that students can take, `last_page` = number of pages) — use it to build the "levels"/journey pagination.
- `courses[].position` is **absolute** (3rd page, 1st item at size 7 → `15`), not page-relative. `is_current` marks the student's current course when it is on this page; `roadmap.current_course` tells you where it is even when it isn't (`current_course.page`).
- `courses[].status`: `not_enrolled` | `in_progress` (enrolled, not finished — `progress_percent` is the course's own progress) | `completed`. Always `not_enrolled` for a guest. Tapping any node is allowed regardless of state — enroll through the existing course endpoints.
- A page past the last returns `courses: []` with the right `meta` (not an error). Invalid `page`/`per_page` (`0`, negative, non-numeric) → `422 VALIDATION_ERROR`; an over-large `per_page` is clamped to the cap.
- Loading a page never changes progress, the current course, or any course state.
- If the student has completed everything in the roadmap but the completion badge wasn't recorded yet (e.g. an admin unpublished their last unfinished course), this call records it — so `is_completed: true` always comes with `badge.earned: true`.

## 72. Get a Page of a Roadmap's Courses

### `GET /api/v1/student/roadmaps/{roadmap}/courses`

The lighter call for flipping pages in a long roadmap: same `page` (number or `current`) / `per_page` params, same `courses[]` items as above, but in the standard flat shape (`data[]` + `meta`) and **without** the roadmap block — progress and the current course are unaffected by paging, so fetch them from [Get a Roadmap](#71-get-a-roadmap-with-one-page-of-its-courses) once (and again after the student finishes a course).

```json
{
    "success": true,
    "message": "Roadmap courses retrieved successfully",
    "data": [
        { "position": 3, "is_current": false, "status": "in_progress", "is_enrolled": true, "progress_percent": 0, "completed_at": null, "course": { "id": 3, "title": "Databases", "…": "…" } },
        { "position": 4, "is_current": false, "status": "not_enrolled", "is_enrolled": false, "progress_percent": 0, "completed_at": null, "course": { "id": 4, "title": "Web Development", "…": "…" } }
    ],
    "meta": { "current_page": 2, "last_page": 2, "per_page": 2, "total": 4, "from": 3, "to": 4 }
}
```

## Where roadmaps show up elsewhere

- **Course details** (`GET /student/courses/{course}`, [§14](#14-get-course-details)) gains `data.course.roadmaps`: the published roadmaps this course is part of, with its place in each — `[{ "id", "uuid", "slug", "title", "thumbnail_url", "position", "total_courses" }]`. Empty array `[]` for a standalone course. Use it for "Part of the *X* roadmap — course 3 of 10" and a link to the journey. This is how a student who found a course on its own discovers its roadmap.
- **Update Course Progress** (`POST /student/courses/{course}/progress`, [§17](#17-update-course-progress)) gains `data.roadmaps_completed` **only when that request just finished a roadmap** — see below.
- **Achievements** ([§33](#33-get-achievements)) and **Badges** ([§28](#28-get-badges)) include roadmap completions — see below.

## Finishing a roadmap

A student completes a roadmap when **every course currently in it** (that students can take) is completed — in any order. That earns the roadmap's own completion badge, once, permanently:

```json
// POST /api/v1/student/courses/{course}/progress — only present when this request completed a roadmap
"roadmaps_completed": [
    { "id": 1, "uuid": "5f1c6097-…", "title": "Software Engineering Path",
      "badge": { "id": 1, "name": "Roadmap Completed: Software Engineering Path", "earned_at": "2026-10-01T10:00:00.000000Z" } }
]
```

Show a "Roadmap complete!" moment only when this key is present. One course can finish several roadmaps at once (several entries). The badge also appears in the achievements feed and the badge list (below). If an admin later adds a course to the roadmap, `is_completed` goes back to `false` and `progress` drops below 100 % — but `badge.earned` stays `true`.


# Resources

_Added 2026-10-01. Needs the `2026_10_01_000004`–`000006` migrations, the Cloudflare R2 bucket configured on the backend (`R2_*` env vars) for file resources, and — for students to buy extra accesses — an admin to set the access pack. Payloads below were captured from the running API (against a test bucket, so the file link is shown in its real R2 shape instead of the test stub; sizes/ids are illustrative). The full standalone reference, including everything tutors/admins do, is `RESOURCES_API.md`._

The **Resources library** is a set of academic materials students browse **independently of courses**: uploaded **files** (PDF, PowerPoint, Word, Excel — lecture notes, slides, books, past questions, …) and **external links** (YouTube videos/playlists, articles, websites). A course can also *reference* resources (§76), but a resource never needs a course.

- **Browsing is free and needs no account** (list, details, a course's resources — like course browsing). **Opening or downloading is not free:** it goes through one call, [Open / Download a Resource](#78-open--download-a-resource), where the backend decides.
- **Daily allowance.** Every student gets **3 free resources per day** (an admin can change the number). The **first** time a student opens/downloads a resource on a given day uses **one** access; **opening or downloading that same resource again the same day costs nothing** (open → download → open = 1 access). Uploaded files and external links count **identically**.
- **Extra accesses.** When the free ones are used up, the student can buy a **pack** (an admin sets how many accesses and the price) through Monime. Purchased accesses are used **after** the day's free ones, and they **carry over until used** — they don't reset with the free allowance.
- **"Today"** is the **Sierra Leone business day** (`Africa/Freetown`), not the device's clock. The response tells you when it resets (`usage.resets_at`) — show a countdown from that, don't compute it yourself.
- **Never enforce or count the limit in the app.** The backend is the only authority; always call the access endpoint and render what it says (including the `402`).
- **What discovery deliberately does not return:** the external link's URL and anything about where a file is stored. A link is only handed out by the access call — a visible URL would let anyone skip the allowance. Treat the file link you get back as a **secret that expires in ~20 minutes** (don't cache or share it; ask again — re-asking for a resource already opened today is free).
- **Resource type is independent of the file/link type.** `resource_type` (Lecture Notes, Past Question, Playlist, …) says what it *is*; `format` says what it is *stored as* (`pdf`, `pptx`, … or `youtube_video`, …); `source_type` (`file` | `external`) says whether it is an uploaded file or a link.
- **Academic context is for ordering/filtering only.** `university`, `faculty`, `department`, `organization`, `level` (= academic year) and `semester` are `null` when a resource is **general/open**. They never restrict who can open a resource — they only push closer-to-your-profile resources to the top of your list.
- Students **cannot upload** resources. Resources uploaded by tutors/educators/contributors only appear after an admin approves them.

Endpoints marked *(public)* work without a token (send one to get personal fields); the others need a **Student** account (`401` for a guest, `403` for a tutor/admin token).

## 73. Resource Vocabulary *(public)*

### `GET /api/v1/resources/types`

Everything needed to build the type filters. Not under `/student` — it is shared with the tutor/admin portals.

```json
{
    "success": true,
    "message": "Resource types retrieved successfully",
    "data": {
        "resource_types": [
            { "value": "lecture_notes", "label": "Lecture Notes" },
            { "value": "lecture_slides", "label": "Lecture Slides" },
            { "value": "book", "label": "Book" },
            { "value": "past_question", "label": "Past Question" },
            { "value": "assignment", "label": "Assignment" },
            { "value": "study_guide", "label": "Study Guide" },
            { "value": "video", "label": "Video" },
            { "value": "playlist", "label": "Playlist" },
            { "value": "article", "label": "Article" },
            { "value": "reference_material", "label": "Reference Material" },
            { "value": "other", "label": "Other" }
        ],
        "link_types": [
            { "value": "youtube_video", "label": "YouTube Video" },
            { "value": "youtube_playlist", "label": "YouTube Playlist" },
            { "value": "article", "label": "Article" },
            { "value": "website", "label": "Website" },
            { "value": "other", "label": "Other" }
        ],
        "source_types": [
            { "value": "file", "label": "Uploaded File" },
            { "value": "external", "label": "External Link" }
        ],
        "file_formats": [
            { "value": "pdf", "label": "PDF", "mime_type": "application/pdf" },
            { "value": "ppt", "label": "PowerPoint (legacy)", "mime_type": "application/vnd.ms-powerpoint" },
            { "value": "pptx", "label": "PowerPoint", "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
            { "value": "doc", "label": "Word (legacy)", "mime_type": "application/msword" },
            { "value": "docx", "label": "Word", "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
            { "value": "xls", "label": "Excel (legacy)", "mime_type": "application/vnd.ms-excel" },
            { "value": "xlsx", "label": "Excel", "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
        ],
        "max_file_size_bytes": 52428800,
        "max_tags": 15
    }
}
```

(The list is the whole vocabulary: filter by `format` using a `file_formats[].value` **or** a `link_types[].value`. `max_file_size_bytes` is the upload limit, 50 MB by default.)

## 74. Discover Resources

### `GET /api/v1/student/resources`

**Authentication**: Optional *(public)*. Send the Bearer token to get profile-based ordering, `relevance_score` and `accessed_today`.

**Query params** (all optional; they combine with AND):

| Param | Meaning |
| --- | --- |
| `search` | Text search over title, description, author, subject, module, source **and tags** |
| `resource_type` | One of `resource_types[].value` |
| `source_type` | `file` or `external` |
| `format` | A file format (`pdf`, `pptx`, …) **or** a link type (`youtube_playlist`, …) |
| `subject`, `module` | Free text, "contains" match (`subject=math` finds "Mathematics") |
| `tags` | `tags[]=calculus&tags[]=past%20papers` or `tags=calculus,past%20papers` — **all** the given tags must match; case-insensitive |
| `university_id`, `faculty_id`, `department_id`, `organization_id`, `level`, `semester`, `publication_year` | Exact match. Leave them out for the profile-ordered default |
| `course_id` | Only resources used by that **published** course (another course id returns an empty list) |
| `sort` | `relevance` (default when signed in) \| `newest` (default for guests) \| `title` |
| `page`, `per_page` | Default 15, max 50 |

**Ordering.** A signed-in student gets the resources **closest to their profile first** (their department, then faculty, university, organization, academic year), then **open** resources, then ones aimed at other departments/universities. This only *orders* — nothing is hidden. Only **approved, available** resources are listed (never pending, rejected or deleted ones).

```json
{
    "success": true,
    "message": "Resources retrieved successfully",
    "data": [
        {
            "id": 1,
            "uuid": "d8979eb5-b5c4-46a8-ad66-3b1b4e3f2b0b",
            "title": "Week 1 - Intro to Algorithms",
            "description": "Slides for the first lecture.",
            "source_type": "file",
            "resource_type": "lecture_slides",
            "resource_type_label": "Lecture Slides",
            "format": "pptx",
            "link_type": null,
            "author": "Dr. Kamara",
            "subject": "Algorithms",
            "module": "CS201",
            "source": null,
            "publication_year": 2026,
            "tags": ["algorithms", "week 1"],
            "academic_context": {
                "university_id": 1, "faculty_id": 1, "department_id": 1, "organization_id": null,
                "level": "200", "semester": "First Semester",
                "university": { "id": 1, "name": "University of Sierra Leone" },
                "faculty": { "id": 1, "name": "Engineering" },
                "department": { "id": 1, "name": "Computer Science" },
                "organization": null
            },
            "file": {
                "original_filename": "Week 1 - Intro to Algorithms.pptx",
                "format": "pptx",
                "size_bytes": 2481133,
                "version": 1,
                "uploaded_at": "2026-10-01T13:21:39.000000Z"
            },
            "uploaded_by": "Cali Towne",
            "relevance_score": 30,
            "accessed_today": false,
            "created_at": "2026-10-01T13:21:39.000000Z",
            "updated_at": "2026-10-01T13:21:39.000000Z"
        }
    ],
    "meta": { "current_page": 1, "last_page": 2, "per_page": 3, "total": 4, "from": 1, "to": 3 }
}
```

- `file` is present **only** for uploaded files (`source_type: "file"`) and has no storage location in it. For an external link there is no `file`, and `link_type` says what kind of link it is (`format` = `link_type` then). **There is no `external_url` anywhere in this response** — see the access endpoint.
- `academic_context.university/faculty/department/organization` are `{id,name}` or `null`; a `null` dimension means "general/open".
- `relevance_score` (integer, higher = closer to the profile; can be negative for resources aimed at a different department/year) and `accessed_today` (`true` = the student already opened this resource today, so opening it again is free — use it for an "Opened today" tick) are present **only for a signed-in student**; guests don't get either key.
- `uploaded_by` is a display name only.
- The standard flat `data[]` + `meta` pagination applies. `resource_type`, `source_type` with an unknown value → `422 VALIDATION_ERROR`.

## 75. Get a Resource

### `GET /api/v1/student/resources/{resource}`

`{resource}` is the numeric id or the `uuid`. **Authentication**: Optional *(public)*.

```json
{
    "success": true,
    "message": "Resource retrieved successfully",
    "data": {
        "resource": { "…": "same object as one item of the list above (with accessed_today for a signed-in student)" },
        "usage": null
    }
}
```

`usage` is `null` for a guest and the allowance object from [§77](#77-get-todays-allowance) for a signed-in student, so the detail screen can say "You've used 2 of 3 free resources today" without a second call. No link/URL here either — only [§78](#78-open--download-a-resource) returns it.

`404` if the resource isn't approved/available (`{ "error": { "code": "NOT_FOUND" } }`) and a bare framework `404` if the id doesn't exist or was deleted (see "Resources errors" below).

## 76. Get a Course's Resources

### `GET /api/v1/student/courses/{course}/resources`

**Authentication**: Optional *(public)*. `{course}` is id, uuid or slug. The resources a **published** course uses, **in the creator's order** (`404` if the course isn't published). Only approved, available resources appear. Same item shape as the list (no `meta` — it is the whole list), plus `usage` like [§75](#75-get-a-resource):

```json
{
    "success": true,
    "message": "Course resources retrieved successfully",
    "data": {
        "resources": [ { "id": 1, "title": "Week 1 - Intro to Algorithms", "accessed_today": false, "…": "…" } ],
        "usage": { "free_daily_allowance": 3, "free_used": 0, "…": "…" }
    }
}
```

Opening a resource **through a course uses exactly the same endpoint and the same allowance** as opening it from the library — there is no separate course access, and being enrolled in the course doesn't make its resources free. Browsing a course's resources costs nothing. (`GET /student/resources?course_id=…` returns the same set in the library's list shape, with filtering and paging.)

## 77. Get Today's Allowance

### `GET /api/v1/student/resources/usage`

**Authentication**: Required (Student).

```json
{
    "success": true,
    "message": "Resource usage retrieved successfully",
    "data": {
        "usage": {
            "date": "2026-10-01",
            "timezone": "Africa/Freetown",
            "resets_at": "2026-10-02T00:00:00+00:00",
            "free_daily_allowance": 3,
            "free_used": 0,
            "free_remaining": 3,
            "purchased_remaining": 0,
            "total_remaining": 3,
            "resources_accessed_today": 0,
            "can_access_new_resource": true,
            "summary": "0 of 3 free resources used today",
            "pack_offer": null
        }
    }
}
```

| Field | Meaning |
| --- | --- |
| `free_daily_allowance` / `free_used` / `free_remaining` | Today's free accesses (the allowance is admin-configurable; `free_used` never exceeds it) |
| `purchased_remaining` | Extra accesses the student has bought and not used yet. **Carries over day to day** |
| `total_remaining` | `free_remaining + purchased_remaining` — how many **new** resources the student can still open today |
| `resources_accessed_today` | Distinct resources opened today (all of them stay re-openable for free) |
| `can_access_new_resource` | `total_remaining > 0` |
| `summary` | Ready-made text, e.g. `"2 of 3 free resources used today"` |
| `resets_at` | When the free allowance comes back (start of the next Sierra Leone day), ISO-8601 UTC |
| `pack_offer` | `{ accesses, price, currency }` — the pack the student can buy now, or `null` while an admin hasn't set one (hide the buy button). `price` is in major units (Leones) |

The same `usage` object is returned by [§78](#78-open--download-a-resource), by the `402` error and by the purchase calls, so you can keep one piece of state up to date from every response. If the student has just come back from a Monime checkout, this call also confirms the payment, so a freshly bought pack shows up here.

## 78. Open / Download a Resource

### `POST /api/v1/student/resources/{resource}/access`

**Authentication**: Required (Student). Throttled (60/min). **This is the only call that returns a file link or an external URL**, and it is where the allowance is checked and spent. Call it **every time** the student taps *Open* or *Download*; never reuse an old link.

**Request** (body optional): `{ "disposition": "inline" | "attachment" }` — how the file should open: `inline` shows a PDF in the browser, `attachment` (default) downloads it. Either way it is the same single access. Ignored for external links.

**What the backend decides:**
1. Not opened today and a free access is left → spends a **free** one.
2. Not opened today, free ones used up, purchased ones left → spends a **purchased** one.
3. **Already opened today → free**, always (even when nothing else is left).
4. Not opened today and nothing left → **`402`**, no link is issued, nothing changes.
5. If the file store is down the whole request is rolled back — **nothing is spent**.

#### Response — an uploaded file (200)

```json
{
    "success": true,
    "message": "Resource access granted",
    "data": {
        "resource": { "id": 4, "uuid": "1a7e5005-7cb7-4f5c-b255-41137a514ddc", "title": "Calculus I Past Questions 2025" },
        "access": {
            "type": "file",
            "url": "https://<bucket>.<account>.r2.cloudflarestorage.com/resources/1a7e5005-…/v2-pqlsx4yw2u5in9fe.pdf?response-content-disposition=inline%3B%20filename%3D%22…%22&response-content-type=application%2Fpdf&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=1200&X-Amz-Signature=…",
            "expires_at": "2026-10-01T13:41:39+00:00",
            "disposition": "inline",
            "filename": "Calculus I Past Questions 2025 (corrected).pdf",
            "format": "pdf",
            "size_bytes": 482113,
            "version": 2
        },
        "counted": true,
        "usage": {
            "date": "2026-10-01", "timezone": "Africa/Freetown", "resets_at": "2026-10-02T00:00:00+00:00",
            "free_daily_allowance": 3, "free_used": 1, "free_remaining": 2,
            "purchased_remaining": 0, "total_remaining": 2,
            "resources_accessed_today": 1, "can_access_new_resource": true,
            "summary": "1 of 3 free resources used today", "pack_offer": null
        }
    }
}
```

- `access.url` is a **temporary signed link** (valid until `access.expires_at`, ~20 minutes — long enough for a slow connection to start a large download). Navigate to it / start the download **right away**. It stops working afterwards and must not be stored, logged or shared; ask again instead. It works without any `Authorization` header (it is signed) — the file host is not this API.
- `access.version` is the file's current version: if a tutor/admin replaced the file, students automatically get the new one.
- `counted` is `true` when **this call used an access**, `false` when the student had already opened this resource today (then `usage` is unchanged). Use it to show "1 free access used" vs nothing.

#### Response — an external link (200)

```json
{
    "success": true,
    "message": "Resource access granted",
    "data": {
        "resource": { "id": 2, "uuid": "…", "title": "Algorithms Playlist" },
        "access": { "type": "external", "url": "https://www.youtube.com/playlist?list=PLabc123", "link_type": "youtube_playlist" },
        "counted": true,
        "usage": { "…": "as above" }
    }
}
```

Open `access.url` in a new tab/the platform's link handler. Same counting rule as files: the **first** open each day costs one access; opening the same link again that day is free.

### Error Responses

#### Daily limit reached (402)

The student has used every free and purchased access for today **and** has not opened this resource today:

```json
{
    "success": false,
    "error": {
        "code": "RESOURCE_ACCESS_LIMIT_REACHED",
        "message": "You have used all your resource accesses for today. Come back tomorrow or buy more accesses.",
        "details": {
            "usage": {
                "date": "2026-10-01", "timezone": "Africa/Freetown", "resets_at": "2026-10-02T00:00:00+00:00",
                "free_daily_allowance": 3, "free_used": 3, "free_remaining": 0,
                "purchased_remaining": 0, "total_remaining": 0,
                "resources_accessed_today": 3, "can_access_new_resource": false,
                "summary": "3 of 3 free resources used today",
                "pack_offer": { "accesses": 5, "price": 25000, "currency": "SLE" }
            },
            "purchase_available": true
        }
    }
}
```

This is the moment to show the **"Buy more accesses"** option: `details.purchase_available` says whether a pack is on sale and `details.usage.pack_offer` has the size and price ("Buy 5 more resources — Le 25,000"). Remind the student that resources they've already opened today still work, and when the free allowance resets (`resets_at`). **No link is returned and nothing was spent.**

#### Other errors

| Status | Code | When |
| --- | --- | --- |
| `404` | `RESOURCE_NOT_FOUND` | The resource exists but isn't approved or has no file right now |
| `404` | *(bare framework 404)* | The id doesn't exist or the resource was deleted (see "Resources errors" below) |
| `403` | `ACCOUNT_NOT_ACTIVE` | Suspended student |
| `503` | `STORAGE_UNAVAILABLE` | The file store couldn't be reached — **nothing was spent**; retry |
| `401` / `403` | `UNAUTHORIZED` / `FORBIDDEN` | Guest / a tutor or admin token (students only) |
| `422` | `VALIDATION_ERROR` | `disposition` isn't `inline` or `attachment` |

## 79. Buy an Access Pack

An **access pack** is a bundle of extra resource accesses (e.g. **5 for Le 25,000**) sold through Monime — the same hosted checkout as paid courses. Both the pack size and the price are set by an admin at runtime and appear in `usage.pack_offer`; **never hard-code them**. A student can start a purchase any time (the app normally offers it after a `402`). Purchased accesses are credited **only after Monime confirms the payment**, **exactly once** — however many times a payment callback is repeated.

### `POST /api/v1/student/resources/purchases`

**Authentication**: Required (Student). Throttled (10/min). No body. Starts a Monime checkout for the pack currently on offer — or **resumes** the open one for the same offer instead of creating another.

`201` (new checkout) / `200` (resuming), message `Checkout created` / `Resuming your open checkout`:

```json
{
    "success": true,
    "message": "Checkout created",
    "data": {
        "purchase": {
            "id": "36ea832f-c610-4907-a3d0-23468d2a4d14",
            "status": "pending",
            "state": "payment_pending",
            "accesses": 5,
            "amount": 25000,
            "currency": "SLE",
            "checkout_url": "https://checkout.monime.io/cos-R85F8wAZHhVb",
            "expires_at": "2026-10-01T13:51:40.000000Z",
            "paid_at": null,
            "created_at": "2026-10-01T13:21:40.000000Z"
        }
    }
}
```

**Redirect the student to `checkout_url`.** `accesses`/`amount` are a snapshot taken when the checkout was created: if an admin changes the pack afterwards, an open checkout still buys what it was created for. `state` is `payment_pending` (send them to `checkout_url`) or `payment_processing` (they came back from Monime and we're waiting for confirmation — show "Confirming your payment…" rather than a pay button). `checkout_url` is present only while the checkout can still be continued.

**Errors:** `503 ACCESS_PACK_UNAVAILABLE` (no pack is on sale — hide the buy button when `pack_offer` is `null`), `503 PAYMENT_UNAVAILABLE` (Monime unreachable/not configured; try again shortly), `409 PURCHASE_IN_PROGRESS` (a double-click; retry), `403 ACCOUNT_NOT_ACTIVE`.

### After checkout — the return redirect

Monime sends the student back through the backend, which redirects to your student portal at **`STUDENT_PORTAL_URL` + `/resources`** (path configurable on the backend) with:

```
https://<student-portal>/resources?purchase=success|processing|cancelled|expired&purchase_id=<purchase uuid>
```

⚠️ **The query string is only a display hint — it grants nothing.** `purchase=success` means "Monime confirmed it" and the accesses are already credited; `processing` means the student came back before confirmation arrived (show "Confirming your payment…" and poll, below); `cancelled`/`expired` mean no payment was taken. Always re-read the real numbers from `GET /student/resources/usage` (or the purchase) before showing "5 accesses added".

### `GET /api/v1/student/resources/purchases/{purchase}`

One of the student's own purchases (`{purchase}` = the `id` uuid; someone else's is `404`). A still-pending purchase is re-checked with Monime first, so a lost webhook corrects itself when you poll — **poll this every few seconds while `status` is `pending` after a `purchase=processing` return**.

```json
{
    "success": true,
    "message": "Purchase retrieved successfully",
    "data": {
        "purchase": {
            "id": "36ea832f-c610-4907-a3d0-23468d2a4d14",
            "status": "succeeded",
            "accesses": 5, "amount": 25000, "currency": "SLE",
            "expires_at": "2026-10-01T13:51:40.000000Z",
            "paid_at": "2026-10-01T13:21:40.000000Z",
            "created_at": "2026-10-01T13:21:40.000000Z"
        },
        "usage": { "free_used": 3, "free_remaining": 0, "purchased_remaining": 5, "total_remaining": 5, "can_access_new_resource": true, "…": "…" }
    }
}
```

`status`: `pending` (not confirmed yet) → `succeeded` (**accesses credited**) | `cancelled` | `expired` | `failed`. Only `succeeded` credits anything. The credited accesses show in `usage.purchased_remaining`.

### `GET /api/v1/student/resources/purchases`

The student's purchases, newest first, in the standard flat `data[]` + `meta` shape (default 15 per page); each item is the `purchase` object above (without the `usage`).

## Resources errors

| Status | Code | Meaning |
| --- | --- | --- |
| `402` | `RESOURCE_ACCESS_LIMIT_REACHED` | No free or purchased access left for a **new** resource today (`error.details.usage`, `error.details.purchase_available`) |
| `404` | `RESOURCE_NOT_FOUND` | (access) The resource isn't approved/available |
| `404` | `NOT_FOUND` | (details) The resource isn't approved/available |
| `404` | *(none)* | The id/uuid doesn't exist or the resource was deleted. This is **Laravel's default 404 body** — `{ "message": "No query results for model [App\\Models\\Resource] 12" }` (plus debug fields when the backend runs with `APP_DEBUG`) — **not** the `{ success, error }` envelope. It's the same for an unknown course/roadmap id. Key off the HTTP status, not the body |
| `401` | `UNAUTHORIZED` | Guest on an endpoint that needs a student |
| `403` | `FORBIDDEN` / `ACCOUNT_NOT_ACTIVE` | A tutor/admin token / a suspended student |
| `503` | `ACCESS_PACK_UNAVAILABLE` / `PAYMENT_UNAVAILABLE` / `PURCHASE_IN_PROGRESS` (409) / `STORAGE_UNAVAILABLE` | See the endpoints above |
| `422` | `VALIDATION_ERROR` | Bad filter value / `disposition` |

## Where resources show up elsewhere

- **Course details** (`GET /student/courses/{course}`, [§14](#14-get-course-details)) is **unchanged**. To show a course's resources, call [§76](#76-get-a-courses-resources) (or `GET /student/resources?course_id=…`). A course with no resources returns `resources: []`.
- **Search** (§59–§65) does **not** include resources; use the library's own `search` parameter ([§74](#74-discover-resources)).
- Nothing about courses, enrollment, XP, coins, roadmaps or the feed changed: resources have no effect on them, and reading the library never changes any state.


# Opportunities

_Added 2026-10-02. Needs the `2026_10_02_000001_create_opportunities_tables` migration. Payloads below were captured from the running API (ids, uuids and dates are illustrative). The full standalone reference, including everything tutors/educators/contributors/admins do, is `OPPORTUNITIES_API.md`._

**Opportunities** are real-world things a student can **act on**: scholarships, internships, jobs, graduate programmes, competitions, hackathons, conferences/events, fellowships, grants, training, volunteering, student programmes, calls for applications. They are **not Feed posts** — a separate list with its own search and filters. UniVybe does **not** process applications: every opportunity carries **external links** (Apply → a Google Form, Register → an event page, Learn More → the provider's site) and the student simply follows one.

- **Public — no account, no token.** Browse, search, filter, open an opportunity and follow its links all work for guests, and a signed-in student gets **exactly the same response** (a token is ignored — there is no personal state to return). ⚠️ These endpoints are **not under `/student`**: the base is **`/api/v1/opportunities`**.
- **Only published opportunities exist as far as you are concerned.** Draft, pending, rejected, unpublished and deleted ones are a `404`. A new opportunity reaches students only after an admin approves it, so "I submitted one and can't see it" is normal.
- **Open vs closed is decided by the server — never compute it from dates on the client.** Every item carries `status` (`"open"` | `"closed"`), `is_open` (boolean) and `closed_reason` (`null` | `"deadline_passed"` | `"manually_closed"`). With an `application_deadline`, an opportunity is open **until that moment passes**, then it moves to the **closed/past** list by itself — no event is pushed to you, so re-fetch rather than caching "open". **With no deadline it stays open until an admin closes it.** The default list contains only **open** opportunities; **closed ones are in their own list** ([§82](#82-past-closed-opportunities)) and stay viewable.
- **Three different dates, don't mix them up.** `start_date` / `end_date` are the opportunity's own **calendar dates** (`"2026-12-04"`, no time or timezone). `application_deadline` is an **instant** (ISO 8601, e.g. `"2026-11-27T23:59:59+00:00"`) and is the **only** date that closes anything. Format it in the student's locale; Sierra Leone is UTC+0.
- **Links: one primary, any number of secondary.** `primary_action` is the main button ("Apply now"); `actions[]` is the full list (the primary one is included, flagged `is_primary: true`). Open `url` in a new tab (`rel="noopener noreferrer"`). **Nothing is tracked** — the backend records no views, clicks, applications or bookmarks, so there is **no "applied" / "saved" state** to show and nothing per student.
- **Cover image** (optional): `cover_image` is `null` or `{ source, url, public_id }`. `source: "cloudinary"` → a UniVybe upload; use `url` as is, or build resized Cloudinary URLs from `public_id`. `source: "external"` → a direct image URL; use `url` as is (`public_id` is `null`).
- **All text is plain text** stored exactly as typed — render it **escaped**, never as HTML. `contact_information`, the organization and every link are public.
- **Ordering:** newest **published** first (stable: the publication time never changes). There is no personalisation, and **no university / faculty / department / level / semester filter** — opportunities are not tied to a student's academic profile.
- **No notifications** about opportunities (no "new opportunity", no deadline reminders) in this version.

## 80. Opportunity Vocabulary *(public)*

### `GET /api/v1/opportunities/types`

The values to build the type filter from — don't hard-code them (the list can grow).

```json
{
    "success": true,
    "message": "Opportunity types retrieved successfully",
    "data": {
        "opportunity_types": [
            { "value": "scholarship", "label": "Scholarship" },
            { "value": "internship", "label": "Internship" },
            { "value": "job", "label": "Job" },
            { "value": "graduate_program", "label": "Graduate Program" },
            { "value": "competition", "label": "Competition" },
            { "value": "hackathon", "label": "Hackathon" },
            { "value": "conference_event", "label": "Conference / Event" },
            { "value": "fellowship", "label": "Fellowship" },
            { "value": "grant", "label": "Grant" },
            { "value": "training", "label": "Training" },
            { "value": "volunteer", "label": "Volunteer" },
            { "value": "student_program", "label": "Student Program" },
            { "value": "call_for_applications", "label": "Call for Applications" },
            { "value": "other", "label": "Other" }
        ],
        "action_types": [
            { "value": "apply", "label": "Apply" },
            { "value": "register", "label": "Register" },
            { "value": "learn_more", "label": "Learn More" },
            { "value": "check_eligibility", "label": "Check Eligibility" },
            { "value": "submit_application", "label": "Submit Application" },
            { "value": "join", "label": "Join" },
            { "value": "other", "label": "Open Link" }
        ],
        "cover_image_sources": [
            { "value": "cloudinary", "label": "UniVybe Upload (Cloudinary)" },
            { "value": "external", "label": "Image URL" }
        ],
        "statuses": [
            { "value": "open", "label": "Open" },
            { "value": "closed", "label": "Closed" }
        ],
        "max_actions": 10,
        "max_tags": 15
    }
}
```

`action_types` tells you what an action's `type` means (handy for an icon); `cover_image_sources`, `max_actions` and `max_tags` are for the tutor/admin forms and can be ignored by the student app.

## 81. Discover Opportunities

### `GET /api/v1/opportunities`

**Authentication**: none *(public)*. Returns the **open** opportunities, newest published first.

**Query params** (all optional; they combine with AND, except several `type`s, which match **any** of them):

| Param | Meaning |
| --- | --- |
| `search` | Text search over the title, short description, **full description**, organization and **tags** (case-insensitive "contains") |
| `type` | One or several of `opportunity_types[].value`: `type=scholarship`, `type=job,internship` or `type[]=job&type[]=internship` |
| `location` | Free text, "contains" match (`location=freetown` finds "Freetown, Sierra Leone") |
| `tags` | `tags[]=stem&tags[]=women` or `tags=stem,women` — **all** the given tags must match; case-insensitive |
| `deadline_from`, `deadline_to` | `YYYY-MM-DD`; opportunities whose **application deadline** falls on or between those whole days (Sierra Leone time, both ends inclusive). Opportunities with no deadline never match a range |
| `has_deadline` | `1`/`true` = only ones with a deadline ("closing soon" screens); `0`/`false` = only open-ended ones |
| `status` | `open` (default) or `closed` — `closed` returns the same as [`/opportunities/closed`](#82-past-closed-opportunities) |
| `page`, `per_page` | Default 15, max 50 (a larger value is clamped) |

Any other parameter (for example `university_id`) is **ignored** — there are no academic-profile filters.

```json
{
    "success": true,
    "message": "Opportunities retrieved successfully",
    "data": [
        {
            "id": 4,
            "uuid": "649faca8-bd50-4bd1-8cf3-644cc025ff2a",
            "title": "Graduate Trainee Programme",
            "short_description": "Rolling intake for recent graduates.",
            "opportunity_type": "graduate_program",
            "opportunity_type_label": "Graduate Program",
            "organization_name": "Rokel Commercial Bank",
            "cover_image": null,
            "location": "Freetown",
            "start_date": null,
            "end_date": null,
            "application_deadline": null,
            "status": "open",
            "is_open": true,
            "closed_reason": null,
            "published_at": "2026-10-02T10:00:00+00:00",
            "tags": [],
            "primary_action": { "id": 8, "type": "apply", "label": "Apply", "url": "https://example.org/trainee", "is_primary": true },
            "actions": [
                { "id": 8, "type": "apply", "label": "Apply", "url": "https://example.org/trainee", "is_primary": true }
            ],
            "updated_at": "2026-10-02T10:00:00+00:00"
        },
        {
            "id": 3,
            "uuid": "e4ff52ea-d743-4287-a875-3cd0ad93afe7",
            "title": "Sierra Leone National Hackathon",
            "short_description": "A 48-hour hackathon for student developers, with cash prizes.",
            "opportunity_type": "hackathon",
            "opportunity_type_label": "Hackathon",
            "organization_name": "Ministry of Communication",
            "cover_image": { "source": "external", "url": "https://images.example.org/hackathon-banner.jpg", "public_id": null },
            "location": "Freetown",
            "start_date": "2026-12-04",
            "end_date": "2026-12-06",
            "application_deadline": "2026-11-27T23:59:59+00:00",
            "status": "open",
            "is_open": true,
            "closed_reason": null,
            "published_at": "2026-10-02T10:00:00+00:00",
            "tags": ["coding", "prizes"],
            "primary_action": { "id": 7, "type": "register", "label": "Register", "url": "https://example.org/hackathon", "is_primary": true },
            "actions": [
                { "id": 7, "type": "register", "label": "Register", "url": "https://example.org/hackathon", "is_primary": true }
            ],
            "updated_at": "2026-10-02T10:00:00+00:00"
        }
    ],
    "meta": { "current_page": 1, "last_page": 2, "per_page": 3, "total": 4, "from": 1, "to": 3 }
}
```

(Trimmed to two of the three items on the page.) The standard flat `data[]` + `meta` pagination applies.

**Item fields**

| Field | Meaning |
| --- | --- |
| `id`, `uuid` | Either works in the details URL |
| `title`, `short_description` | Always present. The short description is ≤ 500 characters |
| `opportunity_type`, `opportunity_type_label` | e.g. `scholarship` / `Scholarship` — use the label for display |
| `organization_name` | Free text (`null` if not given) — **not** the same thing as a UniVybe `organization` |
| `cover_image` | `null`, or `{ source, url, public_id }` (see above) |
| `location` | Free text, or `null` (e.g. `"Remote"`) |
| `start_date`, `end_date` | `"YYYY-MM-DD"` or `null` — the opportunity's own dates |
| `application_deadline` | ISO 8601 instant, or `null` = no deadline (open until an admin closes it) |
| `status`, `is_open`, `closed_reason` | See the intro. In **this** API `status` is only ever `open` or `closed` |
| `published_at` | When it went live (never changes afterwards) |
| `tags` | Lower-case strings |
| `primary_action` | `{ id, type, label, url, is_primary: true }` or `null` if the opportunity has no links |
| `actions` | Every link, primary included, in the creator's order; `type` is one of `action_types[].value` |

**The list is lean on purpose:** it has **no** `description`, `eligibility`, `requirements` or `contact_information` (they can be long) — those come with [§83](#83-get-an-opportunity).

**Examples:** `GET /opportunities?type=hackathon,training&location=freetown&has_deadline=1` · `GET /opportunities?search=scholarship` · `GET /opportunities?tags=stem,women&deadline_from=2026-11-01&deadline_to=2026-11-30`.

**Errors:** `422 VALIDATION_ERROR` for a bad value (an unknown `type`, `per_page=0`, a malformed date):

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {
            "per_page": ["The per page field must be at least 1."],
            "type.0": ["The selected type.0 is invalid."]
        }
    }
}
```

The endpoint is rate-limited to **120 requests per minute** per IP/user (a `429` beyond that).

## 82. Past (Closed) Opportunities

### `GET /api/v1/opportunities/closed`

**Authentication**: none *(public)*. The opportunities that are **no longer open** — their **deadline has passed** or **an admin closed them** — newest published first. They are never part of the default list, but they stay public and fully viewable (so a student can still see what a programme was, and when it ran). Same query params, same item shape and same pagination as [§81](#81-discover-opportunities); `GET /opportunities?status=closed` returns the identical result.

```json
{
    "success": true,
    "message": "Opportunities retrieved successfully",
    "data": [
        {
            "id": 5,
            "title": "Commonwealth Youth Award 2025",
            "status": "closed",
            "is_open": false,
            "closed_reason": "manually_closed",
            "application_deadline": "2026-09-15T23:59:59+00:00",
            "…": "same fields as an item in §81"
        },
        {
            "id": 6,
            "title": "Mandela Washington Fellowship 2026",
            "status": "closed",
            "is_open": false,
            "closed_reason": "deadline_passed",
            "application_deadline": "2026-09-30T23:59:59+00:00",
            "…": "same fields as an item in §81"
        }
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 2, "from": 1, "to": 2 }
}
```

- `closed_reason: "deadline_passed"` — its deadline went by (it closed automatically at that moment). `"manually_closed"` — an admin closed it (with or without a deadline).
- Use this for a "Past opportunities" tab/archive. An opportunity an admin later **reopens** (or whose deadline an admin extends) leaves this list and returns to the default one — re-fetch, don't cache.
- Closing never deletes anything: the links, dates and description are all still there.

## 83. Get an Opportunity

### `GET /api/v1/opportunities/{opportunity}`

`{opportunity}` is the numeric `id` or the `uuid`. **Authentication**: none *(public)*. Works for an **open or a closed** opportunity (check `is_open` before showing an "Apply" button); anything else is a `404`.

```json
{
    "success": true,
    "message": "Opportunity retrieved successfully",
    "data": {
        "opportunity": {
            "id": 1,
            "uuid": "92e9f227-85ea-43eb-9943-5b32e55b99f3",
            "title": "Chevening Scholarship 2027",
            "short_description": "A fully funded one-year master's scholarship in the UK for future leaders.",
            "description": "Chevening is the UK government's global scholarship programme. It covers tuition, a monthly stipend, flights and visa costs.\n\nApplications open once a year.",
            "opportunity_type": "scholarship",
            "opportunity_type_label": "Scholarship",
            "organization_name": "British Council Sierra Leone",
            "cover_image": {
                "source": "cloudinary",
                "url": "https://res.cloudinary.com/univybe/image/upload/v1759400000/edulift/thumbnails/thumb_9fK2xQ7LmA.jpg",
                "public_id": "edulift/thumbnails/thumb_9fK2xQ7LmA"
            },
            "eligibility": "Sierra Leonean citizens with an undergraduate degree and two years of work experience.",
            "requirements": "Two references, a personal statement and an IELTS result.",
            "contact_information": "chevening@example.org",
            "location": "United Kingdom",
            "start_date": "2027-09-01",
            "end_date": "2028-09-30",
            "application_deadline": "2026-11-07T23:59:59+00:00",
            "status": "open",
            "is_open": true,
            "closed_reason": null,
            "published_at": "2026-10-02T10:00:00+00:00",
            "tags": ["masters", "scholarship", "uk"],
            "primary_action": {
                "id": 1,
                "type": "apply",
                "label": "Apply on the Chevening portal",
                "url": "https://www.chevening.org/apply/",
                "is_primary": true
            },
            "actions": [
                { "id": 1, "type": "apply", "label": "Apply on the Chevening portal", "url": "https://www.chevening.org/apply/", "is_primary": true },
                { "id": 2, "type": "check_eligibility", "label": "Check Eligibility", "url": "https://www.chevening.org/scholarships/eligibility/", "is_primary": false },
                { "id": 3, "type": "learn_more", "label": "Learn More", "url": "https://www.chevening.org/", "is_primary": false }
            ],
            "updated_at": "2026-10-02T10:00:00+00:00"
        }
    }
}
```

The detail is the list item **plus** four long-text fields: `description` (full text, may contain line breaks), `eligibility`, `requirements` ("additional requirements/information") and `contact_information` — each `null` when the creator didn't give it. **Few opportunities fill in everything**: an opportunity may be nothing but a title, a short description, a type and one "Learn more" link (the rest lives on the provider's own site), so every optional field can be `null` and `actions` can be empty — design the page to look right with only the basics. `label` is already display-ready ("Apply on the Chevening portal", or the type's standard label — "Check Eligibility" — when the creator gave only a type).

A **closed** opportunity has the same shape with `status: "closed"`, `is_open: false` and a `closed_reason` — show it read-only (hide or disable the Apply button; the links are still returned so a student can read about it):

```json
{ "data": { "opportunity": { "id": 5, "title": "Commonwealth Youth Award 2025", "status": "closed", "is_open": false, "closed_reason": "manually_closed", "application_deadline": "2026-09-15T23:59:59+00:00", "…": "…" } } }
```

**There is no internal moderation or ownership information in any public response** — no creator, no approver, no review notes — only what a student should see.

**Errors:**
- `404` in the standard envelope when it exists but isn't public (pending, rejected, unpublished — you can't tell which, by design):

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Opportunity not found" } }
```

- `404` as **Laravel's default body** when the id/uuid doesn't exist or the opportunity was deleted: `{ "message": "No query results for model [App\\Models\\Opportunity] 99999" }` (plus debug fields when the backend runs with `APP_DEBUG`). Not the `{ success, error }` envelope — same as an unknown course or resource id. **Key off the HTTP status.**

## Opportunities errors

| Status | Code | Meaning |
| --- | --- | --- |
| `404` | `NOT_FOUND` | (details) The opportunity isn't public: pending, rejected, unpublished (or never existed as far as you can tell) |
| `404` | *(none)* | The id/uuid doesn't exist or the opportunity was deleted — Laravel's default 404 body, **not** the envelope. Key off the HTTP status |
| `422` | `VALIDATION_ERROR` | A bad filter value (`type`, `status`, `per_page`, `page`, a date, `has_deadline`) — field messages in `error.details` |
| `429` | *(Laravel default)* | More than 120 requests/minute |

There are no `401`/`403` errors here: these endpoints are public, and a token (valid or not) is ignored.

## Where opportunities show up elsewhere

- **Nowhere else.** Opportunities are not in the **feed**, the **search** endpoints (§59–§65 — use the opportunity list's own `search`), the **dashboard**, courses, roadmaps or resources, and reading them never changes any state (no XP, streak, view count, or "seen" mark).
- **Nothing about a student is stored against an opportunity**, so there is no per-student field to look for (no `applied`, `saved`, `viewed`) — and none will appear without a separate announcement.
- Creating and managing opportunities is for tutors, educators, contributors and admins (`CREATION_USER_API_PAYLOADS.md`); students cannot create them.

---

# Gigs

_Added 2026-10-06. Needs the `2026_10_06_000001_create_gigs_tables` migration. Payloads below were captured from the running API (ids, uuids and dates are illustrative). The full standalone reference, including everything creation users and admins do, is `GIGS_API.md`._

**Gigs** are small jobs that other students — and tutors, educators, contributors or admins — post for UniVybe students to take on, for money, experience or both: logo design, a web page, maths tutoring, event photography, proofreading, a delivery errand. A student can **do gigs** (browse, show interest, contact the poster) and **post gigs** (create, get them approved, see who is interested, mark who they worked with, rate them). UniVybe is the notice board only: **payment and conversation happen outside UniVybe** — over WhatsApp or email. There is no payment, escrow, in-app chat, proposal or CV form, and no "work completed" check.

- **Browsing is public — no account, no token.** Base **`/api/v1/gigs`** (⚠️ not under `/student`). A signed-in student's token only adds a per-viewer `viewer` block; the gigs and their order are the same for everyone.
- **Only approved gigs exist as far as you are concerned.** Every gig, whoever posted it, is approved by an admin first; draft, pending, rejected, unpublished and deleted gigs (and gigs of a suspended account) are a `404`.
- **Contacting the creator needs a student account.** Tapping **Interested** calls `POST /student/gigs/{gig}/interest`: the backend **records the interest first**, then returns the creator's WhatsApp/email and ready-made `wa.me` / `mailto:` links. The contact details are **in no other response** — not the list, not the detail.
- **Same student, same gig = one applicant**, however often the button is tapped (`201` the first time, `200` after). If the creator set an **applicant limit**, the gig closes by itself when it is reached — decided by the server even when many students tap at once.
- **Open vs closed is decided by the server — never from dates on the client.** Every gig has `status` (`"open"` | `"closed"`), `is_accepting_interest` and `closed_reason` (`null` | `"manually_closed"` | `"deadline_passed"` | `"capacity_reached"`). The default list holds only **open** gigs; closed ones are in `/gigs/closed` and stay fully viewable.
- **Enable the Interested button from `viewer.can_contact`.** It is `false` for the gig's own creator, for full/closed gigs (for students who are not already in), and `viewer` is `null` for guests.
- **Three different dates:** `application_deadline` (an *instant*; the only date that stops new interest) and `expected_start_date` / `expected_completion_date` (plain calendar dates about the *work*). A bare date typed as a deadline means the end of that day.
- **Price is a label, not a payment.** `price_label` is display-ready ("Le 500", "Negotiable (Le 300 – Le 500)"); nothing is charged or held by UniVybe.
- **Reputation:** students rate each other after working together (the **creator** marks a student "worked with", then rates them; if the creator is a student, the worker can rate them back). Ratings show on the student profile as `gig_reputation`. Creation users have no gig rating.
- **No notifications.** A student sees "the creator marked you as worked with" by reading `GET /student/gigs/interests`; a student creator sees approval/rejection by reading their list.

## 84. Gig Vocabulary & Categories *(public)*

### `GET /api/v1/gigs/options`

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
        "capacity_types": [
            { "value": "open", "label": "Open (no limit)" },
            { "value": "limited", "label": "Limited" }
        ],
        "contact_methods": [ { "value": "whatsapp", "label": "WhatsApp" }, { "value": "email", "label": "Email" } ],
        "cover_image_sources": [
            { "value": "cloudinary", "label": "UniVybe Upload (Cloudinary)" },
            { "value": "external", "label": "Image URL" }
        ],
        "statuses": [ { "value": "open", "label": "Open" }, { "value": "closed", "label": "Closed" } ],
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


### `GET /api/v1/gigs/categories`

Admin-managed; only active categories. Use `slug` (or `id`) as the filter value.

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


## 85. Discover Gigs

### `GET /api/v1/gigs`

**Authentication**: none *(public; send the token if you have one to get `viewer`)*. Returns the **open** gigs, newest published first.

**Query params** (all optional; they combine with AND, except several `category` / `pricing_type` / `work_mode` values, which match **any** of them):

| Param | Meaning |
| --- | --- |
| `search` | text over title, short + full description, **location**, category name, **skills** and **tags** (case-insensitive "contains") |
| `category`, `category_id` | category **slug(s)** / id(s): `category=tutoring`, `category=a,b`, `category[]=a&category[]=b` |
| `pricing_type` | `fixed` and/or `negotiable` |
| `work_mode` | `remote`, `physical`, `hybrid` |
| `location` | free text, "contains" |
| `skills`, `tags` | `skills=figma,branding` or `skills[]=…` — **all** must match |
| `deadline_from`, `deadline_to` | `YYYY-MM-DD`, whole days, both ends inclusive (gigs with no deadline never match) |
| `has_deadline` | `1`/`true` = only gigs with a deadline; `0`/`false` = only open-ended |
| `status` | `open` (default) or `closed` (= [`/gigs/closed`](#86-closed-gigs)) |
| `page`, `per_page` | default 15, max 50 |

Other parameters are ignored — there are **no** university / faculty / department / level filters and **no** price filter.

`GET /api/v1/gigs` — as **a guest (no token)**

Response `200`:

```json
{
    "success": true,
    "message": "Gigs retrieved successfully",
    "data": [
        {
            "id": 2,
            "uuid": "365dc202-4f6e-414d-b72f-3d3c6672a230",
            "title": "Maths tutoring for first-year students",
            "short_description": "Weekly online maths tutoring for two first-year engineering students.",
            "category": { "id": 4, "slug": "tutoring", "name": "Tutoring" },
            "pricing_type": "negotiable",
            "pricing_type_label": "Negotiable",
            "price_amount": 200,
            "price_max": 300,
            "currency": "SLE",
            "price_label": "Negotiable (Le 200 – Le 300)",
            "work_mode": "remote",
            "work_mode_label": "Remote",
            "location": null,
            "application_deadline": null,
            "expected_start_date": null,
            "expected_completion_date": null,
            "capacity_type": "open",
            "applicant_limit": null,
            "applicant_count": 0,
            "spots_remaining": null,
            "status": "open",
            "is_accepting_interest": true,
            "closed_reason": null,
            "published_at": "2026-10-07T09:00:00+00:00",
            "skills": [ "algebra", "calculus" ],
            "tags": [ "tutoring" ],
            "cover_image": null,
            "contact_methods": [ "whatsapp" ],
            "contact_method": "whatsapp",
            "creator": {
                "type": "student",
                "id": "f3ec5ebf-1e6e-4229-8f24-4bda9bc09c91",
                "name": "Mariama Sesay",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/mariama.jpg",
                "university": "Fourah Bay College",
                "gig_rating": { "average_rating": null, "rating_count": 0 }
            },
            "viewer": null,
            "updated_at": "2026-10-07T09:00:00+00:00"
        },
        {
            "id": 1,
            "uuid": "b25a71ac-266c-4462-bfef-a7f2f66d5359",
            "title": "Design a logo for my bakery",
            "short_description": "A simple, modern logo (PNG + SVG) for a small bakery in Freetown, needed by mid-January.",
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
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 2, "from": 1, "to": 2 }
}
```


Example with filters (`?category=graphic-design&work_mode=hybrid&search=logo`):

Response `200`:

```json
{ "current_page": 1, "last_page": 1, "per_page": 15, "total": 1, "from": 1, "to": 1 }
```


A bad value is a `422`:

`GET /api/v1/gigs?work_mode=underwater` — as **a guest (no token)**

Response `422`:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": { "work_mode.0": [ "The selected work_mode.0 is invalid." ] }
    }
}
```


## 86. Closed Gigs

### `GET /api/v1/gigs/closed`

Gigs that are closed by hand, past their deadline, or **full** — same filters and shape as above. A gig whose last spot was just taken moves from the open list to this one immediately:

`GET /api/v1/gigs/closed` — as **a guest (no token)**

Response `200`:

```json
{
    "success": true,
    "message": "Gigs retrieved successfully",
    "data": [
        {
            "id": 1,
            "uuid": "b25a71ac-266c-4462-bfef-a7f2f66d5359",
            "title": "Design a logo for my bakery",
            "short_description": "A simple, modern logo (PNG + SVG) for a small bakery in Freetown, needed by mid-January.",
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
            "application_deadline": "2026-12-31T23:59:59+00:00",
            "expected_start_date": "2027-01-05",
            "expected_completion_date": "2027-01-20",
            "capacity_type": "limited",
            "applicant_limit": 3,
            "applicant_count": 3,
            "spots_remaining": 0,
            "status": "closed",
            "is_accepting_interest": false,
            "closed_reason": "capacity_reached",
            "published_at": "2026-10-07T09:00:00+00:00",
            "skills": [
                "branding",
                /* … 1 more … */
            ],
            "tags": [
                "bakery",
                /* … 1 more … */
            ],
            "cover_image": null,
            "contact_methods": [
                "whatsapp",
                /* … 1 more … */
            ],
            "contact_method": "both",
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
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 1, "from": 1, "to": 1 }
}
```


## 87. Get a Gig

### `GET /api/v1/gigs/{gig}` — `{gig}` is the numeric `id` or the `uuid`

Open or closed gigs are served. The detail adds `description`, `requirements`, `address` and `contact_action`; the list omits them. As a guest (`viewer: null`, `contact_action.requires_sign_in: true`):

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


As a signed-in student, `viewer` says what *they* can do:

`GET /api/v1/gigs/1` — as **a signed-in student**

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


A gig posted by a **student** shows that student's public card with their gig rating (creation users show their `role`, no rating):

Response `200`:

```json
{
    "type": "student",
    "id": "f3ec5ebf-1e6e-4229-8f24-4bda9bc09c91",
    "name": "Mariama Sesay",
    "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/mariama.jpg",
    "university": "Fourah Bay College",
    "gig_rating": { "average_rating": null, "rating_count": 0 }
}
```


Not public → `404` in the envelope; an id that does not exist or a deleted gig → Laravel's default `404` body (key off the status):

`GET /api/v1/gigs/3` — as **a guest (no token)**

Response `404`:

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Gig not found" } }
```


`GET /api/v1/gigs/999999` — as **a guest (no token)**

Response `404`:

```json
{ "message": "No query results for model [App\\Models\\Gig] 999999" }
```


## 88. Express Interest / Contact the Creator

### `POST /api/v1/student/gigs/{gig}/interest`

**Authentication**: student token. Optional body `{ "method": "whatsapp" | "email" }` — the action the student chose; it must be one the gig offers. The interest is recorded **before** anything is returned. First tap → **`201`**, `newly_registered: true`:

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
        },
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
            "applicant_count": 1,
            "spots_remaining": 2,
            "status": "open",
            "is_accepting_interest": true,
            "closed_reason": null,
            "published_at": "2026-10-07T09:00:00+00:00",
            "skills": [ "branding", "illustrator" ],
            "tags": [ "bakery", "logo" ],
            "cover_image": null,
            "contact_methods": [ "whatsapp", "email" ],
            "contact_method": "both",
            "contact_action": { "available": true, "requires_sign_in": false, "student_only": true },
            "creator": {
                "type": "creation_user",
                "id": "27158023-ada5-4930-9bc1-2e50e1002947",
                "name": "Fatmata Kamara",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/fatmata.jpg",
                "role": "tutor",
                "role_label": "Tutor",
                "gig_rating": null
            },
            "viewer": {
                "type": "student",
                "is_student": true,
                "is_own_gig": false,
                "has_expressed_interest": true,
                "can_contact": true
            },
            "updated_at": "2026-10-07T09:00:00+00:00"
        }
    }
}
```


- `contact.whatsapp.url` / `contact.email.url` are ready-to-open links with the suggested message in them; `contact.whatsapp.number` / `contact.email.address` are the raw values for your own UI. They are the creator's contact details **for this gig** (never their account email/phone) and `null` when the creator did not give that method.
- `gig` is the updated gig (new `applicant_count`, `spots_remaining`, `is_accepting_interest`).

Every later tap → **`200`**, `newly_registered: false`. No duplicate, no extra spot, no higher count:

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
        "newly_registered": false,
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
        },
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
            "applicant_count": 1,
            "spots_remaining": 2,
            "status": "open",
            "is_accepting_interest": true,
            "closed_reason": null,
            "published_at": "2026-10-07T09:00:00+00:00",
            "skills": [
                "branding",
                /* … 1 more … */
            ],
            "tags": [
                "bakery",
                /* … 1 more … */
            ],
            "cover_image": null,
            "contact_methods": [
                "whatsapp",
                /* … 1 more … */
            ],
            "contact_method": "both",
            "contact_action": { "available": true, "requires_sign_in": false, "student_only": true },
            "creator": {
                "type": "creation_user",
                "id": "27158023-ada5-4930-9bc1-2e50e1002947",
                "name": "Fatmata Kamara",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/fatmata.jpg",
                "role": "tutor",
                "role_label": "Tutor",
                "gig_rating": null
            },
            "viewer": {
                "type": "student",
                "is_student": true,
                "is_own_gig": false,
                "has_expressed_interest": true,
                "can_contact": true
            },
            "updated_at": "2026-10-07T09:00:00+00:00"
        }
    }
}
```


**Refusals** (nothing is recorded and no contact detail is in the body):

A **full** gig (`reason`: `capacity_reached` | `deadline_passed` | `manually_closed`):

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


A student's **own** gig (`403`):

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


A method the gig does not offer (`422`; nothing recorded):

`POST /api/v1/student/gigs/2/interest` — as **a signed-in student**

Request body:

```json
{ "method": "email" }
```

Response `422`:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": { "method": [ "This gig cannot be contacted by email." ] }
    }
}
```


A gig that is not public (`404`), a guest (`401`) or a creation user (`403`):

`POST /api/v1/student/gigs/3/interest` — as **a signed-in student**

Response `404`:

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Gig not found" } }
```


`POST /api/v1/student/gigs/1/interest` — as **a guest (no token)**

Response `401`:

```json
{
    "success": false,
    "error": {
        "code": "UNAUTHORIZED",
        "message": "Unauthenticated. Please provide a valid authentication token."
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


A student who is **already an applicant** can call it again while the gig is `published` even after it filled up or passed its deadline (they were admitted while it was open). A suspended student gets `403 ACCOUNT_NOT_ACTIVE`.

## 89. My Gig Interests

### `GET /api/v1/student/gigs/interests`

Gigs I showed interest in, newest first. Query: `worked_with=true|false`, `page`, `per_page`. Each item carries `can_rate_creator`, the ratings each way (`rating_received` = what the creator rated me, `rating_given` = what I rated the creator), and `availability` (`open` | `closed` | `unavailable` — a removed gig is reduced to `{id, title, availability:"unavailable"}`). **No contact details here** — call the interest endpoint again.

`GET /api/v1/student/gigs/interests?worked_with=true` — as **a signed-in student**

Response `200`:

```json
{
    "success": true,
    "message": "Your gig interests retrieved successfully",
    "data": [
        {
            "id": "d8495f77-21a3-40e6-953f-449bfe9a72b8",
            "gig": {
                "id": 2,
                "uuid": "365dc202-4f6e-414d-b72f-3d3c6672a230",
                "title": "Maths tutoring for first-year students",
                "short_description": "Weekly online maths tutoring for two first-year engineering students.",
                "category": { "id": 4, "slug": "tutoring", "name": "Tutoring" },
                "pricing_type": "negotiable",
                "pricing_type_label": "Negotiable",
                "price_amount": 200,
                "price_max": 300,
                "currency": "SLE",
                "price_label": "Negotiable (Le 200 – Le 300)",
                "work_mode": "remote",
                "work_mode_label": "Remote",
                "location": null,
                "application_deadline": null,
                "expected_start_date": null,
                "expected_completion_date": null,
                "capacity_type": "open",
                "applicant_limit": null,
                "applicant_count": 1,
                "spots_remaining": null,
                "status": "open",
                "is_accepting_interest": true,
                "closed_reason": null,
                "published_at": "2026-10-07T09:00:00+00:00",
                "skills": [ "algebra", "calculus" ],
                "tags": [ "tutoring" ],
                "cover_image": null,
                "contact_methods": [ "whatsapp" ],
                "contact_method": "whatsapp",
                "creator": {
                    "type": "student",
                    "id": "f3ec5ebf-1e6e-4229-8f24-4bda9bc09c91",
                    "name": "Mariama Sesay",
                    "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/mariama.jpg",
                    "university": "Fourah Bay College",
                    "gig_rating": { "average_rating": 5, "rating_count": 1 }
                },
                "viewer": {
                    "type": "student",
                    "is_student": true,
                    "is_own_gig": false,
                    "has_expressed_interest": true,
                    "can_contact": true
                },
                "updated_at": "2026-10-07T09:00:00+00:00"
            },
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
        {
            "id": "64de22d4-fc27-4091-aae2-d619a2450cad",
            "gig": {
                "id": 1,
                "uuid": "b25a71ac-266c-4462-bfef-a7f2f66d5359",
                "title": "Design a logo for my bakery",
                "short_description": "A simple, modern logo (PNG + SVG) for a small bakery in Freetown, needed by mid-January.",
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
                "application_deadline": "2026-12-31T23:59:59+00:00",
                "expected_start_date": "2027-01-05",
                "expected_completion_date": "2027-01-20",
                "capacity_type": "limited",
                "applicant_limit": 3,
                "applicant_count": 3,
                "spots_remaining": 0,
                "status": "closed",
                "is_accepting_interest": false,
                "closed_reason": "capacity_reached",
                "published_at": "2026-10-07T09:00:00+00:00",
                "skills": [ "branding", "illustrator" ],
                "tags": [ "bakery", "logo" ],
                "cover_image": null,
                "contact_methods": [ "whatsapp", "email" ],
                "contact_method": "both",
                "creator": {
                    "type": "creation_user",
                    "id": "27158023-ada5-4930-9bc1-2e50e1002947",
                    "name": "Fatmata Kamara",
                    "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/fatmata.jpg",
                    "role": "tutor",
                    "role_label": "Tutor",
                    "gig_rating": null
                },
                "viewer": {
                    "type": "student",
                    "is_student": true,
                    "is_own_gig": false,
                    "has_expressed_interest": true,
                    "can_contact": true
                },
                "updated_at": "2026-10-07T09:00:00+00:00"
            },
            "availability": "closed",
            "interested_at": "2026-10-07T09:00:00+00:00",
            "last_contacted_at": "2026-10-07T09:00:00+00:00",
            "contact_method": "whatsapp",
            "worked_with": true,
            "worked_with_at": "2026-10-07T09:00:00+00:00",
            "rating_received": {
                "rating": 4,
                "review": "Delivered a clean logo early and took feedback well.",
                "created_at": "2026-10-07T09:00:00+00:00"
            },
            "rating_given": null,
            "can_rate_creator": false
        }
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 2, "from": 1, "to": 2 }
}
```


## 90. Rate a Gig Creator

### `PUT /api/v1/student/gigs/{gig}/creator-rating`

Body `{ "rating": 1-5, "review": "optional, ≤1000 chars" }`. Only for a gig posted by a **student**, only if you showed interest **and the creator marked you Worked With**. `201` the first time, `200` when it replaces your earlier rating of that creator for that gig (never two):

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


Refusals:

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
        "code": "GIG_NOT_APPLICANT",
        "message": "This student has not shown interest in this gig."
    }
}
```


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


## 91. Gig Reputation on Student Profiles

`GET /api/v1/student/profile` (own) and `GET /api/v1/student/students/{student}` (another student's public profile) both gain **`gig_reputation`** — the only change to those responses:

`GET /api/v1/student/students/2ff98d2f-596a-4628-a33a-cc433977833f` — as **a signed-in student**

Response `200`:

```json
{
    "average_rating": 4,
    "rating_count": 2,
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
        {
            "id": "e9a85a55-1dbb-4dd5-97d5-df1c49a27d8e",
            "rating": 4,
            "review": "Delivered a clean logo early and took feedback well.",
            "direction": "creator_to_worker",
            "as": "worker",
            "reviewer": {
                "type": "creation_user",
                "id": "27158023-ada5-4930-9bc1-2e50e1002947",
                "name": "Fatmata Kamara",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/fatmata.jpg",
                "role": "tutor"
            },
            "gig": { "id": "b25a71ac-266c-4462-bfef-a7f2f66d5359", "title": "Design a logo for my bakery" },
            "created_at": "2026-10-07T09:00:00+00:00",
            "updated_at": "2026-10-07T09:00:00+00:00"
        }
    ]
}
```


- `average_rating` is `null` and `rating_count` `0` until the student is rated. The numbers cover **every rating received**, as a worker *and* as a student who posted a gig.
- `reviews` holds the latest **written** reviews (a rating without text counts in the numbers but is not listed). `as` is `"worker"` or `"creator"`; `reviewer` is who wrote it; `gig` names the gig (still, after it was removed).

### `GET /api/v1/gigs/students/{studentUuid}/reviews`

All of a student's written reviews, paginated, newest first (`page`, `per_page`). Any signed-in account. `{studentUuid}` is the student's `id` from a profile or an applicant:

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
            {
                "id": "e9a85a55-1dbb-4dd5-97d5-df1c49a27d8e",
                "rating": 4,
                "review": "Delivered a clean logo early and took feedback well.",
                "direction": "creator_to_worker",
                "as": "worker",
                "reviewer": {
                    "type": "creation_user",
                    "id": "27158023-ada5-4930-9bc1-2e50e1002947",
                    "name": "Fatmata Kamara",
                    "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/fatmata.jpg",
                    "role": "tutor"
                },
                "gig": { "id": "b25a71ac-266c-4462-bfef-a7f2f66d5359", "title": "Design a logo for my bakery" },
                "created_at": "2026-10-07T09:00:00+00:00",
                "updated_at": "2026-10-07T09:00:00+00:00"
            }
        ]
    },
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 2, "from": 1, "to": 2 }
}
```


## 92. Posting a Gig as a Student

A student creates and manages the gigs **they** post under **`/api/v1/student/posted-gigs`** — the same endpoints and payloads creation users have under `/tutor/gigs` (`CREATION_USER_API_PAYLOADS.md` → *Gigs (Create & Manage)* has every field). In short:

| Call | What it does |
| --- | --- |
| `POST /student/posted-gigs` | create (a private draft; `"submit": true` also sends it for approval) |
| `POST …/{gig}/submit` | draft or rejected → `pending_approval` — **always** reviewed by an admin first |
| `GET /student/posted-gigs` · `GET …/{gig}` | my gigs with `status`, `rejection_reason`, `permissions`, `contact` |
| `PUT …/{gig}` | edit content — only while draft or rejected |
| `PUT …/{gig}/settings` | change the applicant limit / deadline, also on a live gig |
| `POST …/{gig}/close` · `POST …/{gig}/reopen` | close by hand · reopen (must leave the gig genuinely open) |
| `GET …/{gig}/applicants` | who is interested, with their public profile and gig rating |
| `PUT …/{gig}/applicants/{interest}/worked-with` | `{worked_with:true}` — "I worked with this student" |
| `PUT …/{gig}/applicants/{interest}/rating` | rate that student 1-5 (only if Worked With) |
| `DELETE …/{gig}` | delete a draft or rejected gig |

Create (the contact details are the gig's own — at least one of WhatsApp/email — and are never copied from the account):

`POST /api/v1/student/posted-gigs` — as **a signed-in student**

Request body:

```json
{
    "title": "Maths tutoring for first-year students",
    "short_description": "Weekly online maths tutoring for two first-year engineering students.",
    "category_id": 4,
    "pricing_type": "negotiable",
    "price_amount": 200,
    "price_max": 300,
    "work_mode": "remote",
    "contact_whatsapp": "+232 77 654321",
    "skills": [ "Calculus", "Algebra" ],
    "tags": [ "tutoring" ],
    "submit": true
}
```

Response `201`:

```json
{
    "success": true,
    "message": "Gig submitted for approval",
    "data": {
        "gig": {
            "id": 2,
            "uuid": "365dc202-4f6e-414d-b72f-3d3c6672a230",
            "title": "Maths tutoring for first-year students",
            "short_description": "Weekly online maths tutoring for two first-year engineering students.",
            "description": null,
            "requirements": null,
            "category": { "id": 4, "slug": "tutoring", "name": "Tutoring" },
            "pricing_type": "negotiable",
            "pricing_type_label": "Negotiable",
            "price_amount": 200,
            "price_max": 300,
            "currency": "SLE",
            "price_label": "Negotiable (Le 200 – Le 300)",
            "work_mode": "remote",
            "work_mode_label": "Remote",
            "location": null,
            "address": null,
            "application_deadline": null,
            "expected_start_date": null,
            "expected_completion_date": null,
            "capacity_type": "open",
            "applicant_limit": null,
            "applicant_count": 0,
            "spots_remaining": null,
            "status": "pending_approval",
            "is_accepting_interest": false,
            "closed_reason": null,
            "published_at": null,
            "skills": [ "algebra", "calculus" ],
            "tags": [ "tutoring" ],
            "cover_image": null,
            "contact_methods": [ "whatsapp" ],
            "contact_method": "whatsapp",
            "contact_action": { "available": false, "requires_sign_in": true, "student_only": true },
            "creator": {
                "type": "student",
                "id": "f3ec5ebf-1e6e-4229-8f24-4bda9bc09c91",
                "name": "Mariama Sesay",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/mariama.jpg",
                "university": "Fourah Bay College",
                "gig_rating": { "average_rating": null, "rating_count": 0 }
            },
            "viewer": null,
            "updated_at": "2026-10-07T09:00:00+00:00",
            "contact": { "method": "whatsapp", "whatsapp": "+23277654321", "email": null },
            "rejection_reason": null,
            "submitted_at": "2026-10-07T09:00:00+00:00",
            "approved_at": null,
            "approved_by": null,
            "closed_at": null,
            "closed_by_role": null,
            "creator_type": "student",
            "creator_id": 1,
            "creator_in_good_standing": true,
            "permissions": {
                "can_edit": false,
                "can_delete": false,
                "can_submit": false,
                "can_manage_settings": false,
                "can_close": false,
                "can_reopen": false,
                "can_view_applicants": true,
                "can_rate_workers": false
            },
            "deleted_at": null,
            "created_at": "2026-10-07T09:00:00+00:00"
        }
    }
}
```


My gigs (the creator's view carries the stored `status`, the review feedback and a `permissions` block):

`GET /api/v1/student/posted-gigs` — as **a signed-in student**

Response `200`:

```json
{
    "success": true,
    "message": "Gigs retrieved successfully",
    "data": [
        {
            "id": 2,
            "uuid": "365dc202-4f6e-414d-b72f-3d3c6672a230",
            "title": "Maths tutoring for first-year students",
            "short_description": "Weekly online maths tutoring for two first-year engineering students.",
            "description": null,
            "requirements": null,
            "category": { "id": 4, "slug": "tutoring", "name": "Tutoring" },
            "pricing_type": "negotiable",
            "pricing_type_label": "Negotiable",
            "price_amount": 200,
            "price_max": 300,
            "currency": "SLE",
            "price_label": "Negotiable (Le 200 – Le 300)",
            "work_mode": "remote",
            "work_mode_label": "Remote",
            "location": null,
            "address": null,
            "application_deadline": null,
            "expected_start_date": null,
            "expected_completion_date": null,
            "capacity_type": "open",
            "applicant_limit": null,
            "applicant_count": 1,
            "spots_remaining": null,
            "status": "published",
            "is_accepting_interest": true,
            "closed_reason": null,
            "published_at": "2026-10-07T09:00:00+00:00",
            "skills": [
                "algebra",
                /* … 1 more … */
            ],
            "tags": [ "tutoring" ],
            "cover_image": null,
            "contact_methods": [ "whatsapp" ],
            "contact_method": "whatsapp",
            "contact_action": { "available": true, "requires_sign_in": true, "student_only": true },
            "creator": {
                "type": "student",
                "id": "f3ec5ebf-1e6e-4229-8f24-4bda9bc09c91",
                "name": "Mariama Sesay",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/mariama.jpg",
                "university": "Fourah Bay College",
                "gig_rating": { "average_rating": 5, "rating_count": 1 }
            },
            "viewer": null,
            "updated_at": "2026-10-07T09:00:00+00:00",
            "contact": { "method": "whatsapp", "whatsapp": "+23277654321", "email": null },
            "rejection_reason": null,
            "submitted_at": "2026-10-07T09:00:00+00:00",
            "approved_at": "2026-10-07T09:00:00+00:00",
            "approved_by": "Amara Conteh",
            "closed_at": null,
            "closed_by_role": null,
            "creator_type": "student",
            "creator_id": 1,
            "creator_in_good_standing": true,
            "worked_with_count": 1,
            "permissions": {
                "can_edit": false,
                "can_delete": false,
                "can_submit": false,
                "can_manage_settings": true,
                "can_close": true,
                "can_reopen": false,
                "can_view_applicants": true,
                "can_rate_workers": true
            },
            "deleted_at": null,
            "created_at": "2026-10-07T09:00:00+00:00"
        }
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 1, "from": 1, "to": 1 }
}
```


Who is interested, with the public side of their profile (never their email/phone):

`GET /api/v1/student/posted-gigs/2/applicants` — as **a signed-in student**

Response `200`:

```json
{
    "success": true,
    "message": "Interested students retrieved successfully",
    "data": [
        {
            "id": "d8495f77-21a3-40e6-953f-449bfe9a72b8",
            "student": {
                "id": "2ff98d2f-596a-4628-a33a-cc433977833f",
                "name": "Ibrahim Bangura",
                "firstname": "Ibrahim",
                "lastname": "Bangura",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/ibrahim.jpg",
                "bio": "Graphic designer, loves branding.",
                "interests": [
                    "graphic design",
                    /* … 2 more … */
                ],
                "level": "300",
                "university": { "id": 1, "name": "Fourah Bay College", "code": "FBC" },
                "faculty": null,
                "department": null,
                "organization": null,
                "gig_rating": { "average_rating": 4, "rating_count": 1 }
            },
            "interested_at": "2026-10-07T09:00:00+00:00",
            "last_contacted_at": "2026-10-07T09:00:00+00:00",
            "contact_method": "whatsapp",
            "worked_with": false,
            "worked_with_at": null,
            "rating_given": null,
            "rating_received": null
        }
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 15, "total": 1, "from": 1, "to": 1 }
}
```


Mark Worked With, then rate (`rating_given` on the applicant becomes the rating; the worker can rate back via §90):

`PUT /api/v1/student/posted-gigs/2/applicants/d8495f77-21a3-40e6-953f-449bfe9a72b8/worked-with` — as **a signed-in student**

Request body:

```json
{ "worked_with": true }
```

Response `200`:

```json
true
```


`PUT /api/v1/student/posted-gigs/2/applicants/d8495f77-21a3-40e6-953f-449bfe9a72b8/rating` — as **a signed-in student**

Request body:

```json
{ "rating": 4, "review": "Patient and well prepared." }
```

Response `201`:

```json
{
    "success": true,
    "message": "Rating saved",
    "data": {
        "rating": {
            "id": "a39dc805-3171-4490-aeea-884669e9d574",
            "rating": 4,
            "review": "Patient and well prepared.",
            "direction": "creator_to_worker",
            "as": "worker",
            "created_at": "2026-10-07T09:00:00+00:00",
            "updated_at": "2026-10-07T09:00:00+00:00"
        },
        "applicant": {
            "id": "d8495f77-21a3-40e6-953f-449bfe9a72b8",
            "student": {
                "id": "2ff98d2f-596a-4628-a33a-cc433977833f",
                "name": "Ibrahim Bangura",
                "firstname": "Ibrahim",
                "lastname": "Bangura",
                "avatar_url": "https://res.cloudinary.com/univybe/image/upload/v1/avatars/ibrahim.jpg",
                "bio": "Graphic designer, loves branding.",
                "interests": [
                    "graphic design",
                    /* … 2 more … */
                ],
                "level": "300",
                "university": { "id": 1, "name": "Fourah Bay College", "code": "FBC" },
                "faculty": null,
                "department": null,
                "organization": null,
                "gig_rating": { "average_rating": 4, "rating_count": 2 }
            },
            "interested_at": "2026-10-07T09:00:00+00:00",
            "last_contacted_at": "2026-10-07T09:00:00+00:00",
            "contact_method": "whatsapp",
            "worked_with": true,
            "worked_with_at": "2026-10-07T09:00:00+00:00",
            "rating_given": {
                "id": "a39dc805-3171-4490-aeea-884669e9d574",
                "rating": 4,
                "review": "Patient and well prepared.",
                "created_at": "2026-10-07T09:00:00+00:00",
                "updated_at": "2026-10-07T09:00:00+00:00"
            },
            "rating_received": null
        }
    }
}
```


A gig an **admin closed** can't be reopened by its creator:

`POST /api/v1/student/posted-gigs/2/reopen` — as **a signed-in student**

Response `403`:

```json
{
    "success": false,
    "error": {
        "code": "GIG_CLOSED_BY_ADMIN",
        "message": "An admin closed this gig, so only an admin can reopen it."
    }
}
```


## Gigs errors

| Status | Code | Meaning |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | no token on a student endpoint |
| `403` | `FORBIDDEN` | the wrong kind of account |
| `403` | `ACCOUNT_NOT_ACTIVE` | suspended student |
| `403` | `GIG_OWN_GIG` | interest in your own gig |
| `403` | `GIG_CREATOR_NOT_RATEABLE` | rating the creator of a gig posted by a creation user |
| `403` | `GIG_CLOSED_BY_ADMIN` | reopening a gig an admin closed |
| `404` | `NOT_FOUND` | the gig isn't public (details, interest) |
| `404` | *(none)* | the id doesn't exist or the gig was deleted — Laravel's default body, **not** the envelope |
| `409` | `GIG_NOT_ACCEPTING_INTEREST` | new interest in a full / expired / closed gig — `error.details.reason` |
| `409` | `GIG_NOT_APPLICANT`, `GIG_NOT_WORKED_WITH`, `GIG_INVALID_STATE`, `GIG_HAS_RATINGS` | the rating and lifecycle rules |
| `422` | `VALIDATION_ERROR` / `GIG_DEADLINE_PASSED` / `GIG_CAPACITY_REACHED` | bad input; reopening without making room |
| `429` | *(Laravel default)* | reads 120/min, interest 60/min, creating 30/min |

A **policy denial** (editing a gig under review, opening someone else's gig) is Laravel's default `403` body, also not in the envelope.

## Where gigs show up elsewhere

- **`gig_reputation`** on the two student profile responses (above) — additive, nothing else changed.
- **Nowhere else.** Gigs are not in the **feed**, the **search** endpoints (§59–§65 — use the gig list's own `search`), the **dashboard**, courses, roadmaps, resources or opportunities, and reading gigs never changes state (no XP, streak or view count).
- Posting gigs does not change a student's courses, XP or coins; UniVybe takes no cut and processes no payment.
- Creation users (tutors, educators, contributors, admins) post gigs under `/tutor/gigs` and review them under `/admin/gigs`: `CREATION_USER_API_PAYLOADS.md`.

---

*Document verified against the backend as of 2026-09-25 (Vybe Coins section added 2026-09-30; Roadmaps and Resources sections added 2026-10-01; Opportunities section added 2026-10-02; Gigs section added 2026-10-06 — all captured from the running API). If the backend changes, re-verify before trusting any shape above.*

## 93. Student Help & Guidance (added 2026-11-10)

A student asks for help and is connected to an approved UniVybe guide **on WhatsApp**, or to the central UniVybe number; the onboarding links "Can't find your university / faculty / department?" use the same service. UniVybe only provides the contact — no chat, nothing is sent for the student, and nothing tracks whether a conversation happens. **All three endpoints take a normal student token and work before onboarding is finished.** The full reference with request/response examples captured from the running API is `GUIDANCE_API.md` (Part 1); the frontend changes needed are in `STUDENT_FRONTEND_API_CHANGES.md` (Round 13).

| Endpoint | What |
| --- | --- |
| `GET /student/guidance/options` | categories (`id, key, slug, name, description, required_context`) + `profile_context` (`university`, `faculty`, `department`, each `{id,name}` or `null`) to prefill the form |
| `POST /student/guidance/inquiries` | body `{ category_id, university_id?, faculty_id?, department_id?, question? }` (no academic field = use the profile) → `201` (or `200` for the same request within 10 minutes) with `data.routing`, `data.contact` (`type`, `name`, `whatsapp.number`, **`whatsapp.url`**, `message`) and `data.notice` |
| `POST /student/guidance/onboarding-help` | body `{ issue: "university"\|"faculty"\|"department", university_id?, faculty_id? }` → the same answer; the missing record and everything under it is ignored; never fails for lack of context |

Errors: `422` `details.university_id|faculty_id|department_id` (the category needs it), `403 ACCOUNT_NOT_ACTIVE`, `429 GUIDANCE_RATE_LIMITED` (10 new contacts per 24 h), `503 GUIDANCE_CONTACT_UNAVAILABLE` (no guide fits and no central number set — **use the app's emergency number**). Open `contact.whatsapp.url` as it is.
