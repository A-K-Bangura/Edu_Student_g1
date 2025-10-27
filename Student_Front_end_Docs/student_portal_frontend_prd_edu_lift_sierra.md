# Student Portal Frontend — Product Requirements Document (PRD)

**Project:** EduLift Sierra — Student Frontend (PWA)

**Author:** (placeholder)

**Version:** 1.0

**Date:** 2025-10-07

---

## Table of contents

1. Overview
2. Goals & Success Metrics
3. Personas & Constraints
4. User Journeys
5. Pages & Routes (Full List)
6. Detailed Page Specifications
   - Authentication (Login / Signup / OTP)
   - Onboarding
   - Dashboard / Home
   - Courses List
   - Course Details (non-enrolled)
   - Course Player (enrolled) — Desktop & Mobile
   - Mini-Lesson Types
   - Quiz Flow
   - Lesson & Module Completion
   - Jotting Pad (Notes)
   - Feed
   - Leaderboard
   - Profile
7. Component Library & Props (developer-focused)
8. Data Models & Database Schema (essential tables)
9. Frontend ↔ Backend API Contract
10. Offline, Caching & Sync Strategy
11. Accessibility, Localization & UX
12. Animations & Microinteractions Guidelines
13. Security & Privacy
14. Testing, QA & Acceptance Criteria
15. Observability & Monitoring
16. Roadmap & Sprint Plan
17. Appendix (UX Copy, Sample Payloads, Wireframes)

---

# 1. Overview

This PRD describes the **Student Portal Frontend** for EduLift Sierra — a lightweight, offline-capable, highly engaging Progressive Web App (PWA) targeted at Sierra Leone learners. The front end delivers bite-sized lessons, quizzes (post-lesson), progress tracking, a simple gamification system (XP + a badge), and an integrated jotting pad.

The document is intentionally developer-focused and contains page-level specifications, component definitions, API contracts, data model suggestions, and QA acceptance criteria so the design and engineering teams can implement the UX with minimal ambiguity.

---

# 2. Goals & Success Metrics

**Primary goals**

- Surface relevant course content to students by university & faculty.
- Make learning fast and accessible on low bandwidth and low-end devices.
- Increase daily and weekly return rates through light gamification and a friendly UX.

**Success metrics (KPIs)**

- DAU (Daily Active Users)
- 7-day retention (target initial: 15–25%)
- Lesson completion rate (per started lesson)
- Average lessons completed per user per week
- Feed unlocks triggered by lesson completion
- Offline sync success rate for lesson-complete events

---

# 3. Personas & Constraints

**Persona A — Senior Secondary Student**

- Device: low-mid Android phone, intermittent connectivity
- Needs: short lessons, low data cost, Krio/English support

**Persona B — University Undergrad (Engineering/Medicine etc)**

- Device: mid-range smartphone or desktop
- Needs: diagrams, downloadable references, tracking for courses

**Constraints**

- Low-bandwidth first design
- Support offline downloads and resumable video progress
- Keep animations and heavy media optional/conditional

---

# 4. User Journeys (Top-level)

1. **Auth & onboarding** — Login → (sign up/OTP) → onboarding (name, phone, university, faculty, department) → Dashboard
2. **Course discovery** — Browse / Search / Filter courses → Course detail → Enroll
3. **Learn** — Start course → Mini-lessons → Quiz (after lesson) → Completion animation → Continue
4. **Engage** — Earn XP & badge → Check leaderboard / profile
5. **Offline** — Download lessons → Learn offline → Sync lesson-complete events when online

---

# 5. Pages & Routes (Full List)

- `/` — Landing (public marketing / login CTA)
- `/auth/login` — Login (email + password)
- `/auth/signup` — Sign up (email/password) → OTP verification flow
- `/auth/verify` — OTP verification
- `/onboarding` — Student profile setup (name, phone, university, faculty, dept, year)
- `/dashboard` — Student home (personalized)
- `/courses` — Courses list (search & filters)
- `/course/:courseId` — Course details (non-enrolled)
- `/course/:courseId/play` or `/course/:courseId/module/:moduleId/lesson/:lessonId` — Course player (enrolled)
- `/lesson/:lessonId/quiz` — Quiz page
- `/progress` — Progress & achievements page
- `/downloads` — Offline manager
- `/leaderboard` — Rank by university/faculty/department
- `/profile` — Profile & settings
- `/feed` — Social feed for posts, news and updates

---

# 6. Detailed Page Specifications

This section defines each major page, layout behavior, components, data dependencies, and acceptance criteria.

## 6.1 Authentication

**Pages:** `/auth/login`, `/auth/signup`, `/auth/verify`

### Login (`/auth/login`)

- **Fields:** email, password
- **CTA:** "Log in"
- **Footer text:** "Don't have an account? Sign up" → link to `/auth/signup`
- **Behavior:** On success, redirect to `/onboarding` if profile incomplete, else `/dashboard`.

**Acceptance criteria:** Invalid credentials show inline error; network errors show toast. Accessibility: labels, focus order, keyboard nav.

### Sign Up (`/auth/signup`)

- **Fields:** email, password, confirm password
- **CTA:** "Sign up"
- **Behavior:** On submit → `POST /api/auth/signup` triggers OTP email; redirect to `/auth/verify` with email prefilled.

### Verify OTP (`/auth/verify`)

- **Fields:** 6-digit OTP input
- **Actions:** Verify, Resend (throttled with timer)
- **Behavior:** On success → receive auth token → proceed to `/onboarding`.

**Security:** OTP expires in 5 minutes; rate-limit resend.

---

## 6.2 Onboarding (`/onboarding`)

**Purpose:** Collect name, phone, university, faculty, department, year/level

**UX:** Stepper or single form (simplicity recommended). Dropdowns populated from API.

**Fields & Validations:**

- First name, last name (required)
- Phone number (format validation)
- University (dropdown) — fetch `/api/universities`
- Faculty (dropdown) — dependent on university `/api/universities/{id}/faculties`
- Department (dependent on faculty)
- Study level/year (dropdown)

**Behavior:** Successful submission stores user profile and redirects to `/dashboard`. Save progress locally to avoid loss.

---

## 6.3 Dashboard / Home (`/dashboard`)

**Layout:** Responsive, desktop uses header and left column (optional); mobile uses bottom nav icons.

**Sections:**

- Greeting header (Hi [Name] 👋)
- Progress snapshot: current streak, XP counter + single badge displayed
- "Continue learning" card: if there is an in-progress lesson
- My Courses (horizontal scroll or grid)
- Recommended Courses (based on university & faculty)
- Quick actions: Start Quiz Challenge, View Leaderboard

**Data dependencies:** `/api/student/profile`, `/api/student/courses`, `/api/student/recommendations`, `/api/student/progress`

**Acceptance criteria:** Dashboard must show correct enrolled courses and progress; mobile nav visible and functional.

---

## 6.4 Courses List (`/courses`)

**Features:** search, filters (level, faculty, difficulty), sorting (newest, popular), paginated or infinite scroll

**Card fields:** thumbnail, title, short description, level, faculty, enroll button.

**Acceptance criteria:** Search returns relevant courses; filters applied; enroll button disabled if already enrolled.

---

## 6.5 Course Details (`/course/:courseId`) — Non-enrolled

**Sections:**

- Banner (title, cover image, instructor, enroll CTA)
- Course summary, objectives, prerequisites
- Course skeleton (modules → lessons, read-only preview)
- Stats (duration estimate, lessons count, quizzes count)

**Behavior:** Enroll action calls `POST /api/course/:id/enroll`. For paid courses, show payment modal or redirect to payment gateway (not in scope for MVP unless required).

**Acceptance criteria:** Clicking "Preview" plays free sample lesson when available. Enroll updates isEnrolled flag and redirects to course player.

---

## 6.6 Course Player (Enrolled) — Core

**Route patterns:**

- `/course/:courseId/play` — loads first module/lesson
- `/course/:courseId/module/:moduleId/lesson/:lessonId` — direct deep link

### Desktop Layout (3-column)

- **Left Column (Course Outline):**
  - Collapsible modules with lesson list
  - Current lesson highlighted; completed lessons show check icons
  - Progress bar for module & course
- **Center Column (Lesson Content):**
  - Breadcrumbs and lesson title
  - Top progress indicator (mini progress summary)
  - Content viewport: renders mini-lesson content pages (see 6.7)
  - Bottom sticky controls: Prev | Continue | Mark Complete (disabled until last mini-lesson or quiz passed)
- **Right Column (Jotting & Quick Links):**
  - Jotting pad (autosave)
  - Quick links and downloadable attachments
  - Small "Help" or glossary widget

### Mobile Layout (single-column)

- Main content full width
- Left outline accessible via hamburger icon (slides from left)
- Jotting pad accessible via floating button (slides up or dialog)
- Bottom fixed nav: Prev | Continue | Notes

**Behavior & Rules**

- **Mini-lesson pagination** is linear. "Continue" moves to the next mini-lesson. After final mini-lesson → Quiz page.
- **Progress sync:** Only when a full _lesson_ is completed (i.e., after quiz completion and lesson-complete flow). If user leaves mid-lesson, show motivational modal. If they choose to leave anyway, progress for that lesson is discarded.
- **Media loading:** Load text first, lazy-load YouTube embed or attachments. Provide low-bandwidth fallback (audio-only or placeholder image) when network is slow.
- **Video resume:** Persist video playback position per user & mini-lesson.

**Acceptance criteria:** Desktop shows 3-column layout on >= 1024px width. Mobile shows single-column with accessible slide-ins. Left outline shows current lesson and correctly updates after lesson-complete.

---

## 6.7 Mini-Lesson Types

Supported mini-lesson `type` values and behaviors:

- `text` — contentHTML block (Markdown -> sanitized HTML)
- `image` — inline image + caption
- `video` — YouTube embed (iframe) or hosted video player with resume
- `download` — attachment link, file metadata (size), and view/download button

**Rendering rules:** Always render text first. Lazy-load heavy elements after text render. Sanitize HTML to prevent XSS.`

---

## 6.8 Quiz Flow (`/lesson/:lessonId/quiz`)

**Flow:**

1. After final mini-lesson: redirect to Quiz route.
2. Present one question per screen (MCQ / Short answer / Tap fill in the blanks depending on quiz type). Show progress (1/5).
3. On answer submit: immediate feedback (correct/incorrect) and short explanation.
4. After all questions: show summary modal with score, correct answers, xp awarded. Offer "Review answers" and "Continue to next lesson".

**Acceptance criteria:** Quiz must work offline (queue result and sync when online). Agreement between local scoring and server scoring after reconciliation.

---

## 6.9 Lesson Completion UX

**Elements:**

- Full-screen modal or overlay with celebratory animation (conditioned on low-bandwidth settings)
- Animated XP increment (e.g., +20 XP)
- Simple badge icon if earned
- Motivational copy (see Appendix)

**Action:** Continue to next lesson or return to course outline. On continue, progress posted to `POST /api/lesson/:lessonId/complete` and dashboard updated.

---

## 6.10 Jotting Pad (Notes)

**Capabilities:**

- Small rich-text or plain-text editor in right column.
- Autosave with debounce to `POST /api/notes`.
- Manual download (TXT / PDF)
- Provide basic formatting (bold, bullet lists) optional (plain text is acceptable initially)

**Persistence:** Stored in DB under `notes` table and retrievable per lesson.

**Acceptance criteria:** Notes saved and retrievable across devices; download button works and produces correct content.

---

## 6.11 Feed, Leaderboard & Profile

These pages form the community and progress layers of the student experience. They are not deferred; each will be implemented in the initial release with core functionality.

---

### 6.11.1 Feed Page

#### **Purpose**

The Feed Page provides a social and motivational space where students can view updates, study tips, and community posts (memes, motivational quotes, short articles). It encourages daily engagement and creates a sense of belonging.

#### **Layout (Desktop & Mobile)**

- **Top Bar:**
  - Page title: “Feed”
  - Filter/Sort icon (top-right): toggles between “All”, “Study Tips”, “Memes”, “Announcements”.
- **Main Feed Area:**
  - Vertical scrollable list of post cards.
  - Each post card includes:
    - Author (name + university/faculty)
    - Time posted
    - Content (text, image, or embedded media)
    - Reaction buttons (Like 👍, Share 🔁)
  - Posts load via **infinite scroll** (lazy loading as user scrolls down).
- **Access Gating:**
  - If user has not completed a lesson recently or has insufficient XP, a soft lock overlay appears:
    - Message: “Take a quick lesson to unlock the Feed! Keep learning 🎓”
    - CTA: “Go to My Courses”
  - Unlock rules:
    - Feed access unlocks if the student completes at least **1 lesson** in the past 24 hours **or** has earned **≥10 XP** that day.

#### **Functionality**

- View feed items (paginated or infinite scroll).
- Like/unlike posts.
- Share posts (copy link / share modal).
- Filter feed by category.
- Access gating based on progress or XP (dynamic overlay).

#### **States**

- **Unlocked (default)**: normal feed browsing.
- **Locked (low-activity)**: overlay prompt to study.
- **Loading**: skeleton cards during fetch.
- **Empty**: “No posts yet. Check back soon!”

---

### 6.11.2 Leaderboard Page

#### **Purpose**

The Leaderboard ranks students by their XP points and motivates engagement through friendly competition across institutions and departments.

#### **Layout (Desktop & Mobile)**

- **Top Bar:**
  - Page title: “Leaderboard”
  - Dropdown filter: “University | Faculty | Department”
- **Leaderboard List:**
  - Simple list of ranked entries.
  - Each entry shows:
    - Rank number (1, 2, 3…)
    - Profile avatar (initials or image)
    - Student name
    - University/faculty tag (depending on filter)
    - XP value
  - Logged-in user’s own rank always visible at the bottom in a “sticky” card, even if far from top.

#### **Functionality**

- Filter leaderboard scope (university, faculty, department).
- Highlight top 3 with badges or glow.
- Show current user rank and XP.
- Refresh leaderboard periodically (or on manual reload).

#### **States**

- **Loading**: shimmer placeholders for list rows.
- **Empty**: “No ranking data yet. Keep learning to enter the leaderboard!”
- **Error**: retry message with reload button.

---

### 6.11.3 Profile Page

#### **Purpose**

The Profile page consolidates all personal learning data — XP, streaks, badges, and account info. It also provides access to settings and personalization features (e.g., dark mode).

#### **Layout (Desktop & Mobile)**

- **Top Section:**
  - Avatar / profile picture (editable placeholder if none)
  - Full name
  - University, Faculty, Department
- **Stats Section:**
  - XP total
  - Current streak days
  - Badge(s) earned (display as icons or small cards)
  - “Courses Completed” count
- **Courses Summary Section:**
  - List of recently completed or in-progress courses with thumbnails and progress bars.
  - Clicking opens Course Details.
- **Settings Section:**
  - Toggle switches:
    - Dark Mode
    - Notification Preferences (Email, Push)
  - Edit Profile Info button
  - Logout button

#### **Functionality**

- Edit basic profile information (name, university, faculty, etc.).
- View XP and streak progress.
- Switch dark mode on/off (persists via backend settings).
- View earned badges and completed courses.
- Log out.

#### **States**

- **Loading**: shimmer placeholders for profile card and stats.
- **Empty**: default “No badges yet” or “No completed courses” placeholders.
- **Error**: “Unable to load profile. Please refresh.”

---

### 6.11.4 Common Technical Notes

- Feed and leaderboard data should be **paginated API calls** with lazy loading to improve performance.
- Profile stats (XP, badges, streak) fetched from `/api/student/profile`.
- Feed gating logic handled client-side but validated by backend (XP or lesson completion check).
- Dark mode preference stored in user settings table and persisted on login.

---

# 7. Component Library & Props

A curated set of components to implement the UI. Provide predictable props and acceptance rules.

> **Note:** Use React + TypeScript. Use Tailwind CSS for styling and Gsap / lightweight CSS transitions for animations. Persist state using React Query + IndexedDB queue.

### `PageShell` (layout wrapper)

Props: `{ children, title, showBottomNav?: boolean }`

### `CourseCard` (for listing)

Props: `{ id, title, thumbnailUrl, level, faculty, progressPercent?, isEnrolled?, onEnroll? }`

### `LessonPlayer` (core)

Props: `{ courseId, moduleId, lessonId, miniLessonId?, onComplete() }`

### `MiniLessonRenderer`

Props: `{ miniLesson: MiniLesson }`

- `MiniLesson` type:

```ts
type MiniLesson = {
  id: number;
  type: "text" | "image" | "video" | "download";
  contentHtml?: string;
  mediaUrl?: string;
  durationSeconds?: number;
};
```

### `QuizRenderer`

Props: `{ quiz: Quiz, onSubmit: (results) => void }`

### `OutlineSidebar`

Props: `{ courseStructure, currentLessonId, onNavigate(lessonId) }`

### `JottingPad`

Props: `{ lessonId, initialContent, onSave }`

### `CompletionModal`

Props: `{ xpGained, badge?: Badge | null, onContinue }`

Include unit tests for all components; ensure props are typed and require accessibility attributes on interactive elements.

---

# 8. Data Models & Database Schema (essential)

Below are suggested tables and key fields. Implementers may adapt these to their existing schema and conventions.

### `users`

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  xp_total INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  language VARCHAR(10) DEFAULT 'en',
  dark_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `universities`, `faculties`, `departments`

Basic lookup tables with `id, name, parent_id` relationships.

### `courses`

```sql
CREATE TABLE courses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  description TEXT,
  thumbnail_url VARCHAR(500),
  level VARCHAR(50),
  instructor_id BIGINT,
  duration_estimate_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `modules`

```sql
CREATE TABLE modules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  title VARCHAR(255),
  position INT DEFAULT 1
);
```

### `lessons` (grouping of mini-lessons)

```sql
CREATE TABLE lessons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  module_id BIGINT NOT NULL,
  title VARCHAR(255),
  position INT DEFAULT 1
);
```

### `mini_lessons`

```sql
CREATE TABLE mini_lessons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  lesson_id BIGINT NOT NULL,
  type ENUM('text','image','video','download') NOT NULL,
  content_html TEXT,
  media_url VARCHAR(500),
  duration_seconds INT DEFAULT 0,
  position INT DEFAULT 1
);
```

### `quizzes`, `questions`, `options`

Simple quiz tables connected to `lesson_id`.

### `user_course_enrollments`

```sql
CREATE TABLE user_course_enrollments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `user_progress` (lesson-level)

```sql
CREATE TABLE user_progress (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  lesson_id BIGINT NOT NULL,
  status ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
  score DECIMAL(5,2) DEFAULT 0,
  time_spent_seconds INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `notes`

```sql
CREATE TABLE notes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  lesson_id BIGINT NOT NULL,
  content TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `badges`

```sql
CREATE TABLE badges (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(100) UNIQUE,
  title VARCHAR(255),
  description TEXT
);
```

### `user_badges`

```sql
CREATE TABLE user_badges (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  badge_id BIGINT NOT NULL,
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 9. Frontend ↔ Backend API Contract (detailed)

**Note:** Use HTTPS, JSON payloads, and JWT bearer tokens for auth. Keep responses minimal to reduce data transfer.

### Auth / Onboarding

```http
POST /api/auth/login
Body: { "email": "...", "password": "..." }
Response: { "token": "<jwt>", "user": { id, first_name, last_name, xp_total, streak_days } }

POST /api/auth/signup
Body: { "email": "...", "password": "..." }
Response: { "success": true, "otp_sent": true }

POST /api/auth/verify-otp
Body: { "email": "...", "otp": "123456" }
Response: { "token": "<jwt>", "user": { ... } }

POST /api/student/onboard
Body: { "firstName", "lastName", "phone", "universityId", "facultyId", "departmentId", "level" }
Response: { "user": { ... } }
```

### Courses

```http
GET /api/courses?facultyId=&universityId=&search=&page=&limit=
Response: { "data": [{ id, title, thumbnailUrl, level, shortDescription, isEnrolled }] }

GET /api/course/:courseId
Response: { id, title, description, modules: [ { id, title, lessons: [{ id, title, miniLessonCount, durationEstimate, isCompleted }] } ], metadata: { duration, level, instructor } }

POST /api/course/:courseId/enroll
Body: { }
Response: { success: true }
```

### Lessons & Mini-Lessons

```http
GET /api/lesson/:lessonId
Response: {
  id, moduleId, title,
  miniLessons: [ { id, position, type, contentHtml, mediaUrl, durationSeconds } ]
}

POST /api/lesson/:lessonId/complete
Body: { timeSpentSeconds: 240 }
Response: { success: true, newXP: 10, badgeEarned: true, badgeId: 1 }
```

### Quiz

```http
GET /api/quiz/:lessonId
Response: { id, questions: [{ id, text, type, options: [{ id, text }] }] }

POST /api/quiz/:quizId/submit
Body: { answers: [{ questionId, answer }] }
Response: { score: 80, xpEarned: 20, correctAnswers: [ ... ], badgeEarned: false }
```

### Notes

```http
POST /api/notes
Body: { lessonId, content }
Response: { noteId, savedAt }

GET /api/notes?lessonId=
Response: [{ noteId, content, updatedAt }]
```

### Leaderboard / Feed / Profile

```http
GET /api/leaderboard?scope=university|faculty|department
GET /api/feed?page=
GET /api/student/profile
```

### 8.x Feed, Leaderboard & Profile APIs

These endpoints support the Feed, Leaderboard, and Profile pages within the Student Portal.  
All routes are protected and require a valid user authentication token.

---

#### 8.x.1 Feed APIs

##### **GET /api/feed**

**Purpose:**  
Fetch a paginated list of feed posts (study tips, memes, announcements, etc.) for the main feed page.

**Query Parameters:**
| Parameter | Type | Required | Description |
|------------|------|-----------|--------------|
| `page` | integer | No | Page number (default = 1) |
| `limit` | integer | No | Number of items per page (default = 10) |
| `category` | string | No | Optional filter: `all`, `tips`, `memes`, `announcements` |

**Response:**

````json
{
  "page": 1,
  "hasNextPage": true,
  "posts": [
    {
      "id": 51,
      "author": { "name": "Kadiatu Conteh", "university": "FBC" },
      "type": "meme",
      "contentHtml": "<p>When you pass your exam without studying 🤣</p>",
      "mediaUrl": "https://cdn.educationapp.com/uploads/meme123.jpg",
      "likes": 124,
      "isLiked": false,
      "createdAt": "2025-10-07T14:20:12Z"
    }
  ]
}

##### **POST** `/api/feed/:postId/like`

**Purpose:**
Like or unlike a feed post.

**Request Body:**
```json
{ "userId": 1 }
```

**Response:**
```json
{ "success": true, "isLiked": true, "likesCount": 125 }
```

---

##### **GET** `/api/feed/access`

**Purpose:**
Check if the user has feed access unlocked (based on XP or lesson completion).

**Response:**
```json
{
  "canAccess": true,
  "reason": null,
  "requirements": {
    "minXpToday": 10,
    "minLessonsToday": 1
  }
}
```

**Notes:**
If `canAccess` is `false`, the frontend should show the motivational overlay with a **“Go to My Courses”** CTA.

---

#### 8.x.2 Leaderboard APIs

##### **GET** `/api/leaderboard`

**Purpose:**
Retrieve ranked students based on XP totals.

**Query Parameters:**

| Parameter     | Type     | Required | Description                                                  |
|----------------|----------|-----------|--------------------------------------------------------------|
| `scope`        | string   | Yes       | Ranking scope — options: `university`, `faculty`, or `department` |
| `universityId` | integer  | Conditional | Required if `scope=university`                               |
| `facultyId`    | integer  | Conditional | Required if `scope=faculty`                                  |
| `departmentId` | integer  | Conditional | Required if `scope=department`                               |
| `limit`        | integer  | No        | Max number of top entries to return (default = 50)           |

**Response:**
```json
{
  "scope": "faculty",
  "topStudents": [
    {
      "rank": 1,
      "userId": 4,
      "name": "Alhaji Bangura",
      "xp": 1230,
      "university": "Njala University",
      "faculty": "Engineering"
    },
    {
      "rank": 2,
      "userId": 7,
      "name": "Isatu Koroma",
      "xp": 1190,
      "university": "Njala University",
      "faculty": "Engineering"
    }
  ],
  "currentUser": {
    "rank": 24,
    "xp": 330,
    "name": "You",
    "faculty": "Engineering"
  }
}
```

**Notes:**
- Always return the current user’s ranking (`currentUser`) even if they’re outside the top results.
- Rankings update daily or every N hours (depending on caching policy).

---

#### 8.x.3 Profile APIs

##### **GET** `/api/student/profile`

**Purpose:**
Fetch the student’s full profile, learning statistics, and progress summary.

**Response:**
```json
{
  "userId": 1,
  "name": "Alhaji Bangura",
  "email": "alhajibangura@email.com",
  "university": "Njala University",
  "faculty": "Engineering",
  "department": "Electrical Engineering",
  "xpTotal": 1250,
  "streakDays": 7,
  "badges": [
    { "id": 1, "name": "Quick Learner", "iconUrl": "https://cdn.educationapp.com/badges/quicklearner.svg" }
  ],
  "completedCourses": [
    { "courseId": 10, "title": "Intro to Circuits", "thumbnailUrl": "https://cdn.educationapp.com/courses/intro_circuits.png" }
  ],
  "settings": {
    "darkMode": true,
    "notifications": { "email": true, "push": false }
  }
}
```

---

##### **PATCH** `/api/student/profile`

**Purpose:**
Update basic student information or preferences.

**Request Body:**
```json
{
  "name": "Alhaji Bangura",
  "universityId": 2,
  "facultyId": 5,
  "departmentId": 12
}
```

**Response:**
```json
{ "success": true, "updatedAt": "2025-10-08T11:02:15Z" }
```

---

##### **PATCH** `/api/student/settings`

**Purpose:**
Update UI and notification preferences.

**Request Body:**
```json
{
  "darkMode": true,
  "notifications": { "email": true, "push": false }
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "darkMode": true,
    "notifications": { "email": true, "push": false }
  }
}
```

---


**Errors & status codes**

- Use 400 for validation errors, 401 for auth, 403 for forbidden, 404 for not found, 500 for server error.
- Provide `error.code` and `error.message` in error responses.

---

# 10. Offline, Caching & Sync Strategy

**Goals:** fast text-first lesson load; reliable lesson completion sync on reconnection.

**Service worker (Workbox recommended)**

- Precache: app shell (JS/CSS/critical assets)
- Runtime caching: lesson text responses (stale-while-revalidate), course outlines
- Cache media cautiously: respect storage budget and prefer streaming via CDN

**IndexedDB Queue**

- Use IndexedDB to queue `lessonComplete` and `quizSubmit` events while offline. Implement a retry mechanism and exponential backoff.

**Sync rules**

- **Only** call `POST /api/lesson/:lessonId/complete` when the full lesson and quiz are finished. Queue if offline.
- Video playback position persisted locally and synced to `POST /api/lesson/:lessonId/progress` optional endpoint if implemented.

**Low-bandwidth mode**

- Detect via Network Information API & user setting. When enabled:
  - Disable heavy animations
  - Do not auto-load YouTube embeds (show play placeholder)
  - Prefer text + images compressed

---

# 11. Accessibility, Localization & UX

**Accessibility**

- Semantic HTML, alt text for images, keyboard navigable controls, aria labels on buttons and inputs, color contrast >= 4.5:1 for primary text.

**Localization (i18n)**

- Use `react-i18next` or equivalent. Support `en` and `kr` (Krio) locales.
- Lesson content translations live in backend (translations table). Frontend should request the appropriate language variant.

**UX Copy**

- Keep motivating, short copy. Example motivational popup text included in Appendix.

---

# 12. Animations & Microinteractions Guidelines

**Principles:** subtle, performant, optional for low-end devices.

- Use Gsap or CSS transitions (avoid heavy Lottie unless optimized).
- Animations to implement:
  - Progress bar fills (smooth)
  - Mini confetti/particle on lesson complete (small, short-lived)
  - XP increment counter animation
  - Slide-in sidebars
- Load animation assets conditionally (only after main content loads and if `lowBandwidth=false`).

---

# 13. Security & Privacy

- Use HTTPS strictly. JWT tokens with short expiry; refresh token via httpOnly cookie.
- Sanitize server-provided HTML content to prevent XSS.
- Minimal PII stored client-side; always prefer server-side storage.
- For minors, include parental consent flow later; ensure data retention and deletion endpoints exist.

---

# 14. Testing, QA & Acceptance Criteria

**Testing types:** unit tests, component tests, e2e (Cypress), manual QA on low-end devices and throttled networks.

**Important test scenarios:**

- Auth flows (login, signup, OTP verification, resend throttle)
- Onboarding dropdown dependencies (university→faculty→department)
- Course enrollment and outline rendering
- Lesson navigation: exit mid-lesson triggers modal; leaving discards progress
- Quiz submission offline → queued → reconciled on reconnect
- Jotting pad autosave and download
- Dark mode toggling persists

**Performance tests:** Lighthouse on 3G throttling for main lesson page (LCP ≤ 2.5s for text content).

---

# 15. Observability & Monitoring

- Sentry for UI errors
- Telemetry events (Analytics) via simple event bus:
  - `lesson_viewed`, `mini_lesson_viewed`, `lesson_complete`, `quiz_submitted`, `note_saved`, `course_enrolled`
- Log offline sync failures for analysis
- Track API latency metrics

---

# 16. Roadmap & Sprint Plan (initial)

**Phase 1 — MVP (8 weeks)**

- Sprint 1 (2w): Auth (login/signup/OTP), Onboarding, Dashboard skeleton, routing
- Sprint 2 (2w): Courses list, Course details, enroll flow
- Sprint 3 (2w): Course player (text mini-lessons, media placeholder), outline sidebar
- Sprint 4 (2w): Quizzes, lesson completion flow (XP, badge), jotting pad, offline queue basics
- Sprint 5 (2w): Feed page, limited access, Time-out screen.
- Sprint 6 (2w): Leaderboard integration

**Phase 2 — (next 6–10 weeks)**

- Video resume, YouTube embedding optimizations
- Dark mode, Krio localization, Feed gating
- Analytics dashboard for tutors (light)

**Phase 3**

- Advanced personalization, discussion threads, payments, certificates

---

# 17. Appendix

## 17.1 UX Copy examples

**Leave mid-lesson modal**

> You’re almost there! Finish this quick part to earn XP and keep your streak alive.\n\n[Continue lesson] [Leave anyway]

**Lesson completion modal**

> Nice work! +20 XP\nKeep going — you’re building momentum!\n\n[Continue to next lesson]

## 17.2 Wireframe notes

- Desktop course player: left outline (25% width) | center content (55%) | right jotting (20%)
- Mobile: content full width; outline accessible with left drawer; notes floating button bottom-right

## 17.3 Sample API payload (lesson complete)

```json
POST /api/lesson/123/complete
{
  "timeSpentSeconds": 310
}

Response:
{
  "success": true,
  "newXP": 20,
  "badgeEarned": true,
  "badgeId": 1
}
````

---
