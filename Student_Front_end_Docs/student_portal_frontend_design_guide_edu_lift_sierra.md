# Student Portal — Frontend Design Guide

**Project:** EduLift Sierra — Student Portal (PWA)

**Derived from:** Student Portal Frontend PRD & Engineering Guide  
**Version:** 1.0  
**Audience:** UI/UX Designers, Frontend Engineers

---

## Table of Contents

1. Design Overview & Principles
2. Brand Identity & Visual Language
3. Layout System & Grid
4. Responsive Design Guidelines
5. Navigation Patterns
6. Color Palette
7. Typography System
8. Components & UI Patterns
9. Animations & Motion Design
10. Accessibility Standards
11. Iconography & Illustration
12. Image & Media Guidelines
13. UX Writing & Tone
14. Dark Mode Design
15. Gamification Elements
16. Design Assets & Handoff Process
17. Design QA Checklist

---

# 1. Design Overview & Principles

EduLift Sierra’s student portal is a **learning-first, fun, and lightweight** design system. The primary goal is to make structured education feel engaging and achievable through small, interactive lesson flows.

**Core principles:**

- **Simplicity:** Prioritize clarity and focus. Minimal clutter.
- **Motivation:** Visual feedback (XP, streaks, badges, gentle animations).
- **Accessibility:** Legible typography, high contrast, clear focus states.
- **Scalability:** Components should adapt to mobile and desktop layouts.
- **Delight:** Use light microinteractions that reward progress.

---

# 2. Brand Identity & Visual Language

**Logo & Wordmark:**

- Simple typographic wordmark “EduLift Sierra” with accent underline resembling a learning curve.

**Core message:**

> “Learn better, one lesson at a time.”

**Visual tone:**

- Friendly, warm, and modern — trust-building but youthful and fun.

**Design language keywords:** Accessible · Interactive · Playful · Structured.

---

# 3. Layout System & Grid

**Grid system:** 12-column fluid grid (based on Tailwind’s default breakpoints)

- **Desktop:** max-width 1280px, gutter 24px.
- **Tablet:** 8-column layout.
- **Mobile:** single-column, horizontal padding 16px.

**Spacing scale (Tailwind units):**

- 4px baseline grid → `p-1 = 4px`, `p-2 = 8px`, etc.

**Breakpoints:**
| Device | Width | Tailwind Class |
|---------|--------|----------------|
| Mobile | <640px | `sm:` |
| Tablet | 641–1024px | `md:` |
| Desktop | 1025–1536px | `lg:` |
| Large Desktop | >1536px | `xl:` |

---

# 4. Responsive Design Guidelines

- Use **mobile-first** design approach.
- Primary navigation changes from **top navbar (desktop)** to **bottom tab bar (mobile)**.
- Sidebar panels (e.g., course outline, notes pad) slide in/out on mobile.
- Font sizes and spacing scale proportionally based on screen width.

**Responsive break behavior examples:**

- Course Player: 3-column → collapsible sidebars.
- Dashboard: grid of course cards → stacked cards.
- Leaderboard: table layout → vertical list.

---

# 5. Navigation Patterns

### Desktop

- Top fixed navigation bar.
- Active tab indicated by bold text and underline.

### Mobile

- Bottom fixed navigation with icons.
- Center icon (Home) larger for emphasis.
- Smooth transitions between tabs (fade/slide).

**Primary nav items:** Home · Courses · Feed · Leaderboard · Profile

Use consistent iconography from `lucide-react` or Feather Icons.

---

# 6. Color Palette

| Role           | Color   | Tailwind Token | Description                            |
| -------------- | ------- | -------------- | -------------------------------------- |
| Primary        | #3B82F6 | `blue-500`     | Main brand color (buttons, highlights) |
| Primary Dark   | #2563EB | `blue-600`     | Hover, dark mode primary               |
| Secondary      | #10B981 | `green-500`    | Success states, XP feedback            |
| Accent         | #F59E0B | `amber-500`    | Streaks, motivational highlights       |
| Danger         | #EF4444 | `red-500`      | Errors, warnings                       |
| Background     | #F9FAFB | `gray-50`      | Default background                     |
| Surface        | #FFFFFF | `white`        | Card surface                           |
| Text Primary   | #111827 | `gray-900`     | Headings, main text                    |
| Text Secondary | #6B7280 | `gray-500`     | Muted text                             |
| Border         | #E5E7EB | `gray-200`     | Dividers                               |

**Gradient (XP rewards):** `linear-gradient(90deg, #10B981 0%, #3B82F6 100%)`

---

# 7. Typography System

**Font Family:** Inter (sans-serif, Google Fonts)

| Type  | Font Weight | Size (Desktop) | Size (Mobile) | Line Height |
| ----- | ----------- | -------------- | ------------- | ----------- |
| H1    | 700         | 32px           | 24px          | 120%        |
| H2    | 600         | 24px           | 20px          | 130%        |
| H3    | 600         | 20px           | 18px          | 130%        |
| Body  | 400         | 16px           | 15px          | 150%        |
| Small | 400         | 14px           | 13px          | 150%        |

**Rules:**

- Always use `rem` units (scalable).
- Limit body text width to ~70ch for readability.
- Use bold and color accents for emphasis, not underlines.

---

# 8. Components & UI Patterns

### Buttons

| Variant   | Style                                         | Example          |
| --------- | --------------------------------------------- | ---------------- |
| Primary   | Solid blue background, white text, rounded-xl | Enroll, Continue |
| Secondary | Outline, text-blue-500                        | View Details     |
| Danger    | Solid red background                          | Delete           |
| Ghost     | Transparent with hover background             | Menu, Dismiss    |

### Cards

- Used for courses, feed posts, and leaderboard entries.
- Rounded-2xl, subtle shadow `shadow-md`, hover lift.

### Input Fields

- Rounded-lg, border-gray-200, focus:ring-2 focus:ring-blue-400.
- Labels above inputs; errors below in red.

### Modals

- Semi-transparent black backdrop, white card with drop shadow.
- Used for OTP, motivational popups, completion XP modal.

### Progress Indicators

- Linear progress bar for lessons.
- Circular ring for XP or streaks.

### Toasts / Snackbars

- Appear bottom-right (desktop), bottom-center (mobile).
- Auto-dismiss after 4s.

---

# 9. Animations & Motion Design

**Goal:** Reward progress, avoid distraction.

**Framework:** Gsap.

| Type         | Usage             | Timing |
| ------------ | ----------------- | ------ |
| Fade-in      | Page transitions  | 250ms  |
| Slide-in     | Mobile panels     | 300ms  |
| Confetti     | Lesson completion | 1.2s   |
| XP counter   | Number count-up   | 800ms  |
| Button press | Scale ripple      | 150ms  |

**Low-bandwidth mode:** disable confetti and reduce transition durations.

---

# 10. Accessibility Standards

- Color contrast ratio ≥ 4.5:1 for text.
- Focus ring visible and color consistent (blue-400).
- Use semantic elements and ARIA roles.
- Keyboard navigation for all interactive elements.
- Test with screen readers (NVDA, VoiceOver).

---

# 11. Iconography & Illustration

**Icon set:** lucide-react(main) and phosphor-react(gamification/interactions).

- Line icons, 2px stroke, rounded edges.
- Consistent color: `gray-600` default, `blue-500` active.

**Illustrations:**

- Use flat minimal illustrations for onboarding and motivational screens (undraw.co / custom SVGs).
- Limit illustration sizes (<200KB optimized SVG).

---

# 12. Image & Media Guidelines

- Images served from CDN in WebP or AVIF when possible.
- Max width 1200px for banners.
- Use placeholder blur (LQIP) for progressive loading.
- Compress with `sharp` or TinyPNG before upload.
- YouTube videos use thumbnail preview (load iframe only on play).

---

# 13. UX Writing & Tone

**Voice:** encouraging, simple, human.
**Tone:** friendly and helpful — never robotic.

**Examples:**

- "Great work! You just earned 20 XP."
- "One more lesson to keep your streak alive!"
- "Ready to continue? Let’s go!"

**Error messages:** short and clear.

> ❌ “Something went wrong. Please try again.”

**Buttons:**

- Primary CTAs are verbs: Start, Continue, Enroll.

---

# 14. Dark Mode Design

**Backgrounds:** `#111827` primary, `#1F2937` surfaces.
**Text:** `#F9FAFB` main, `#9CA3AF` muted.
**Primary:** lighter blue variant (`#60A5FA`).
**Shadows:** replaced with soft borders and subtle glows.

Toggle persists via `/api/student/settings` (frontend theme state mirrors backend preference).

---

# 15. Gamification Elements

### XP Counter

- Animated + gradient text.
- Increases numerically after quiz completion.

### Streak Indicator

- Fire icon (🔥) with day count.
- Flash animation on streak extension.

### Badge Earn Modal

- Confetti burst (optional low-bandwidth).
- Display badge icon + motivational line: “You earned the Quick Learner badge!”

### Leaderboard Highlight

- Top 3 users get color-glow frames (gold, silver, bronze).

---

# 16. Design Assets & Handoff Process

**Design tools:** Figma (primary), Zeplin or Storybook for handoff.

**Asset storage:** `/design/assets` folder in repo or cloud drive.

**Naming convention:**

- `component_[name]_v1.fig`
- `icon_[purpose].svg`

**Design → Dev workflow:**

1. Figma design finalized → exported to Storybook tokens.
2. Dev builds React component → Designer verifies via Storybook preview.

---

# 17. Design QA Checklist

| Area              | Check                                           |
| ----------------- | ----------------------------------------------- |
| **Typography**    | Font sizes and weights match style guide        |
| **Spacing**       | Consistent padding and margins (4px grid)       |
| **Colors**        | Follow palette, check contrast                  |
| **Responsive**    | Layout behaves at 3 breakpoints                 |
| **Accessibility** | Tab order, focus states, alt text present       |
| **Interactions**  | Buttons, toasts, and animations feel responsive |
| **Gamification**  | XP and badges appear with correct feedback      |
| **Dark Mode**     | All pages readable and correctly themed         |
| **Performance**   | Image compression verified                      |

---

**Final note:**
The design system should evolve with feedback from real student users. Each iteration should preserve the balance between **simplicity, motivation, and accessibility** — the pillars of EduLift Sierra’s learning experience.
