{
`type`: `application/vnd.ant.code`,
`title`: `Student Portal API Documentation`,
`content`: `# Student Portal API Documentation

## Base URL

```
https://api.edulift.sierra.edu.sl/api/v1
```

## Setup Requirements

### Database Tables

The Student Portal API requires the following database tables:

- `students` - Student accounts
- `personal_access_tokens` - Sanctum authentication tokens
- `courses` - Course catalog
- `modules` - Course modules
- `lessons` - Course lessons
- `mini_lessons` - Lesson content blocks
- `quizzes` - Quiz questions
- `student_course_progress` - Student progress tracking
- `xp_logs` - XP transaction history
- `badges` - Badge definitions
- `student_badges` - Earned badges
- `feed_posts` - Community feed posts

All required tables are created via Laravel migrations included in the backend.

## Authentication

The Student Portal API uses **Bearer Token** authentication via Laravel Sanctum.

### Token Security Features

- ✅ **Token Expiration**: Tokens expire after 24 hours by default
- ✅ **Secure Storage**: Tokens stored securely in database
- ✅ **Token Revocation**: Logout revokes current token
- ✅ **OTP Verification**: Email-based verification before first login

### Token Expiration Configuration

Configure token expiration in `.env`:

```env
# Token expiration in minutes
# Default: 1440 (24 hours)
SANCTUM_TOKEN_EXPIRATION=1440
```

**Recommended Values:**

- **High Security**: 60 minutes (1 hour)
- **Balanced**: 720 minutes (12 hours)
- **Convenient**: 1440 minutes (24 hours)

### Headers

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {your_access_token}
```

---

## Response Format

### Success Response

```json
{
  \"success\": true,
  \"message\": \"Operation successful\",
  \"data\": {
    // Response data here
  },
  \"timestamp\": \"2025-10-14T12:34:56Z\"
}
```

### Error Response

```json
{
  \"success\": false,
  \"error\": {
    \"code\": \"ERROR_CODE\",
    \"message\": \"Human-readable error message\",
    \"details\": {}
  },
  \"timestamp\": \"2025-10-14T12:34:56Z\"
}
```

### Paginated Response

```json
{
  \"success\": true,
  \"data\": [...],
  \"meta\": {
    \"current_page\": 1,
    \"last_page\": 5,
    \"per_page\": 10,
    \"total\": 93,
    \"from\": 1,
    \"to\": 10
  },
  \"links\": {
    \"first\": \"https://api.edulift.sierra.edu.sl/api/v1/courses?page=1\",
    \"last\": \"https://api.edulift.sierra.edu.sl/api/v1/courses?page=5\",
    \"prev\": null,
    \"next\": \"https://api.edulift.sierra.edu.sl/api/v1/courses?page=2\"
  }
}
```

---

## Endpoints

### 1. Authentication & Onboarding

#### Student Signup

**POST** `/auth/signup/student`

Start the signup process. OTP will be sent to email.

**Request Body:**

```json
{
  \"email\": \"student@example.com\",
  \"password\": \"SecurePass123!\"
}
```

**Validation Rules:**

- Email: Required, valid email format, unique
- Password: Required, minimum 8 characters, at least 1 uppercase, 1 number

**Response (201):**

```json
{
  \"success\": true,
  \"message\": \"Registration successful. Please check your email for OTP.\",
  \"data\": {
    \"email\": \"student@example.com\",
    \"otp_sent\": true
  }
}
```

**Error Responses:**

- `409` - Email already exists
- `422` - Validation failed

---

#### Send OTP

**POST** `/auth/send-otp`

Send or resend OTP verification code.

**Request Body:**

```json
{
  \"email\": \"student@example.com\",
  \"purpose\": \"signup\"
}
```

**Purpose Options:**

- `signup` - New account verification
- `reset` - Password reset
- `verify` - Re-verification

**Rate Limiting:**

- 3 requests per hour per email+IP combination
- 60 second cooldown between resend attempts

**Response (200):**

```json
{
  \"success\": true,
  \"message\": \"OTP sent successfully\",
  \"data\": {
    \"email\": \"student@example.com\",
    \"expires_in\": 600,
    \"can_resend_at\": \"2025-10-14T12:35:56Z\"
  }
}
```

**Error Responses:**

- `429` - Rate limit exceeded (Too many OTP requests)
- `404` - Email not found

---

#### Verify OTP

**POST** `/auth/verify-otp`

Verify the OTP code sent to email.

**Request Body:**

```json
{
  \"email\": \"student@example.com\",
  \"otp\": \"123456\",
  \"purpose\": \"signup\",
  \"user_type\": \"student\"
}
```

**OTP Security:**

- 6-digit code
- 10-minute expiry
- Maximum 3 verification attempts
- Stored as bcrypt hash

**Response (200):**

````json
{
  \"success\": true,
  \"message\": \"Email verified successfully.\",
  \"data\": {
    \"verified\": true,
    \"email\": \"student@example.com\"
  }
}

**Error Responses:**

- `400` - Invalid or expired OTP
- `400` - Maximum attempts exceeded

#### POST /api/v1/auth/onboarding

**Purpose:** Complete onboarding (for students)

**Request:**

```json
{
  \"firstname\": \"John\",
  \"lastname\": \"Doe\",
  \"phone\": \"+23276123456\",
  \"role\": \"student\",
  \"university_id\": 1,
  \"faculty_id\": 3,
  \"department_id\": 7,
  \"level\": \"200\",
}
````

**Response (201):**

```json
{
  \"success\": true,
  \"message\": \"Onboarding completed.\",
  \"data\": {
    \"user_id\": 42,
    \"user\": {}
  }
}
```

---

#### Student Login

**POST** `/auth/login/student`

Login with email and password after verification.

**Request Body:**

```json
{
  \"email\": \"student@example.com\",
  \"password\": \"SecurePass123!\"
}
```

**Rate Limiting:**

- 5 attempts per 10 minutes per IP+email

**Response (200):**

```json
{
  \"success\": true,
  \"message\": \"Login successful\",
  \"data\": {
    \"token\": \"1|abc123xyz789...\",
    \"token_type\": \"Bearer\",
    \"expires_at\": \"2025-10-15T12:34:56Z\",
    \"user\": {
      \"id\": 1,
      \"uuid\": \"550e8400-e29b-41d4-a716-446655440000\",
      \"email\": \"student@example.com\",
      \"full_name\": \"Jane Doe\",
      \"firstname\": \"Jane\",
      \"lastname\": \"Doe\",
      \"university\": \"Njala University\",
      \"faculty\": \"Engineering\",
      \"department\": \"Electrical Engineering\",
      \"level\": \"200\",
      \"xp_total\": 340,
      \"streak_days\": 7,
      \"status\": \"active\",
      \"avatar_url\": \"https://cdn.edulift.sierra.edu.sl/avatars/uuid.jpg\"
    }
  }
}
```

**Error Responses:**

- `401` - Invalid credentials
- `403` - Account suspended
- `429` - Too many login attempts

---

#### Logout

**POST** `/auth/logout`

Revoke current authentication token.

**Headers:** Authorization: Bearer {token}

**Response (200):**

```json
{
  \"success\": true,
  \"message\": \"Logged out successfully\"
}
```

---

### 2. Courses

#### List Published Courses

**GET** `/student/courses`

Get all published courses with optional filters.

**Headers:** Authorization: Bearer {token}

**Query Parameters:**

- `university_id` (optional): Filter by university
- `faculty_id` (optional): Filter by faculty
- `department_id` (optional): Filter by department
- `level` (optional): Filter by level (100, 200, 300, 400)
- `search` (optional): Search by title or description
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 20, max: 100)

**Example Request:**

```bash
GET /student/courses?faculty_id=3&level=200&search=engineering&page=1
```

**Response (200):**

```json
{
  \"success\": true,
  \"data\": [
    {
      \"id\": 1,
      \"uuid\": \"550e8400-e29b-41d4-a716-446655440000\",
      \"title\": \"Introduction to Electrical Engineering\",
      \"description\": \"Comprehensive introduction to electrical engineering principles...\",
      \"level\": \"200\",
      \"semester\": \"First Semester\",
      \"thumbnail_url\": \"https://cdn.edulift.sierra.edu.sl/thumbnails/course-1.jpg\",
      \"university\": {
        \"id\": 1,
        \"name\": \"Njala University\"
      },
      \"faculty\": {
        \"id\": 3,
        \"name\": \"Engineering\"
      },
      \"department\": {
        \"id\": 7,
        \"name\": \"Electrical Engineering\"
      },
      \"meta\": {
        \"modules_count\": 8,
        \"lessons_count\": 32,
        \"estimated_hours\": 24,
        \"published_at\": \"2025-09-01T00:00:00Z\"
      },
      \"is_enrolled\": false
    }
  ],
  \"meta\": {
    \"current_page\": 1,
    \"last_page\": 3,
    \"per_page\": 20,
    \"total\": 45
  }
}
```

---

#### Get Course Details

**GET** `/student/courses/{uuid}`

Get detailed course information including full structure.

**Headers:** Authorization: Bearer {token}

**Parameters:**

- `uuid`: Course UUID

**Response (200):**

```json
{
  \"success\": true,
  \"data\": {
    \"id\": 1,
    \"uuid\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"title\": \"Introduction to Electrical Engineering\",
    \"description\": \"Comprehensive introduction to electrical engineering principles...\",
    \"level\": \"200\",
    \"semester\": \"First Semester\",
    \"thumbnail_url\": \"https://cdn.edulift.sierra.edu.sl/thumbnails/course-1.jpg\",
    \"university\": {
      \"id\": 1,
      \"name\": \"Njala University\"
    },
    \"faculty\": {
      \"id\": 3,
      \"name\": \"Engineering\"
    },
    \"department\": {
      \"id\": 7,
      \"name\": \"Electrical Engineering\"
    },
    \"modules\": [
      {
        \"id\": 1,
        \"title\": \"Module 1: Basic Circuit Theory\",
        \"order_index\": 1,
        \"lessons\": [
          {
            \"id\": 1,
            \"title\": \"Lesson 1: Introduction to Circuits\",
            \"description\": \"Understanding basic electrical circuits\",
            \"order_index\": 1,
            \"mini_lessons_count\": 5,
            \"quizzes_count\": 1,
            \"estimated_minutes\": 30,
            \"is_completed\": false
          }
        ]
      }
    ],
    \"instructor\": {
      \"id\": 42,
      \"name\": \"Dr. John Kamara\",
      \"title\": \"Senior Lecturer\",
      \"avatar_url\": \"https://cdn.edulift.sierra.edu.sl/avatars/instructor-42.jpg\"
    },
    \"meta\": {
      \"total_modules\": 8,
      \"total_lessons\": 32,
      \"total_quizzes\": 16,
      \"estimated_hours\": 24,
      \"enrolled_students\": 156,
      \"published_at\": \"2025-09-01T00:00:00Z\"
    },
    \"your_progress\": {
      \"enrolled\": false,
      \"progress_percent\": 0,
      \"completed_lessons\": 0,
      \"xp_earned\": 0
    }
  }
}
```

**Error Responses:**

- `404` - Course not found
- `403` - Course not published

---

### 3. Lessons & Progress

#### Complete Lesson

**POST** `/student/lessons/{lessonId}/complete`

Mark a lesson as complete and receive XP reward.

**Headers:** Authorization: Bearer {token}

**Parameters:**

- `lessonId`: Lesson ID

**Request Body:**

```json
{
  \"time_spent_seconds\": 1800,
  \"mini_lesson_progress\": [
    {
      \"mini_lesson_id\": 1,
      \"completed\": true
    },
    {
      \"mini_lesson_id\": 2,
      \"completed\": true
    }
  ],
  \"client_event_id\": \"660f9511-e29b-41d4-a716-446655440001\"
}
```

**Idempotency:**

- Use `client_event_id` (UUID) to prevent duplicate processing
- Cached for 24 hours

**XP Calculation:**

- Base XP: 10 per lesson
- Streak bonus: +5 XP if streak ≥7 days
- First completion bonus: +10 XP

**Response (200):**

```json
{
  \"success\": true,
  \"message\": \"Lesson completed successfully! 🎉\",
  \"data\": {
    \"lesson_id\": 1,
    \"completed\": true,
    \"xp_awarded\": 25,
    \"badge_earned\": true,
    \"new_badge\": {
      \"id\": 1,
      \"name\": \"Quick Learner\",
      \"description\": \"Complete your first lesson\",
      \"icon_url\": \"https://cdn.edulift.sierra.edu.sl/badges/quick-learner.svg\"
    },
    \"progress\": {
      \"total_xp\": 365,
      \"streak_days\": 8,
      \"course_progress_percent\": 12.5
    }
  }
}
```

**Error Responses:**

- `404` - Lesson not found
- `409` - Already completed (duplicate)
- `400` - Invalid mini_lesson_progress

---

#### Get Student Progress

**GET** `/student/progress`

Get overall learning progress summary.

**Headers:** Authorization: Bearer {token}

**Response (200):**

```json
{
  \"success\": true,
  \"data\": {
    \"total_xp\": 1250,
    \"streak_days\": 12,
    \"current_level\": 5,
    \"xp_to_next_level\": 250,
    \"courses_enrolled\": 3,
    \"courses_in_progress\": 2,
    \"courses_completed\": 1,
    \"lessons_completed\": 45,
    \"quizzes_passed\": 20,
    \"badges\": [
      {
        \"id\": 1,
        \"name\": \"Quick Learner\",
        \"description\": \"Complete your first lesson\",
        \"icon_url\": \"https://cdn.edulift.sierra.edu.sl/badges/quick-learner.svg\",
        \"earned_at\": \"2025-10-01T10:00:00Z\"
      },
      {
        \"id\": 2,
        \"name\": \"Week Warrior\",
        \"description\": \"Maintain a 7-day streak\",
        \"icon_url\": \"https://cdn.edulift.sierra.edu.sl/badges/week-warrior.svg\",
        \"earned_at\": \"2025-10-08T08:30:00Z\"
      }
    ],
    \"course_progress\": [
      {
        \"course_id\": 1,
        \"course_uuid\": \"550e8400-e29b-41d4-a716-446655440000\",
        \"course_title\": \"Introduction to Electrical Engineering\",
        \"progress_percent\": 45.5,
        \"lessons_completed\": 15,
        \"lessons_total\": 33,
        \"xp_earned\": 430,
        \"last_accessed_at\": \"2025-10-14T08:30:00Z\",
        \"next_lesson\": {
          \"id\": 16,
          \"title\": \"AC Circuit Analysis\"
        }
      }
    ],
    \"recent_activity\": [
      {
        \"type\": \"lesson_completed\",
        \"lesson_title\": \"DC Circuit Fundamentals\",
        \"xp_earned\": 20,
        \"timestamp\": \"2025-10-14T08:30:00Z\"
      },
      {
        \"type\": \"badge_earned\",
        \"badge_name\": \"Week Warrior\",
        \"timestamp\": \"2025-10-08T08:30:00Z\"
      }
    ]
  }
}
```

---

### 4. Quizzes

#### Submit Quiz

**POST** `/student/quizzes/{quizId}/submit`

Submit quiz answers and get immediate results.

**Headers:** Authorization: Bearer {token}

**Parameters:**

- `quizId`: Quiz ID

**Request Body:**

```json
{
  \"answers\": [
    {
      \"question_id\": 1,
      \"answer\": \"b\"
    },
    {
      \"question_id\": 2,
      \"answer\": \"Kirchhoff's Current Law\"
    },
    {
      \"question_id\": 3,
      \"answer\": [\"a\", \"c\"]
    }
  ],
  \"time_spent_seconds\": 300,
  \"client_event_id\": \"770g0622-e29b-41d4-a716-446655440002\"
}
```

**Quiz Types Supported:**

- **MCQ (Multiple Choice)**: Single correct answer
- **Multi-Select**: Multiple correct answers
- **Short Answer**: Keyword matching (case-insensitive)
- **One Word**: Exact match (trimmed)
- **Fill Blank**: Positional matching
- **Tap to Fill**: Drag-and-drop answers

**Scoring Logic:**

- MCQ: 100% or 0% per question
- Short Answer: Keyword matching with partial credit
- Multi-Select: Proportional scoring

**XP Calculation:**

```
Base XP = 10
Difficulty Multiplier: Easy (1.0), Medium (1.5), Hard (2.0)
Score Multiplier = score_percentage / 100

Final XP = Base XP × Difficulty × Score Multiplier
```

**Response (200):**

```json
{
  \"success\": true,
  \"message\": \"Quiz completed! You scored 85%\",
  \"data\": {
    \"quiz_id\": 1,
    \"score\": 85,
    \"percentage\": 85.0,
    \"passed\": true,
    \"pass_threshold\": 70,
    \"correct_answers\": 9,
    \"total_questions\": 10,
    \"xp_awarded\": 40,
    \"time_taken_seconds\": 300,
    \"results\": [
      {
        \"question_id\": 1,
        \"question\": \"What is Ohm's Law?\",
        \"your_answer\": \"V = IR\",
        \"correct_answer\": \"V = IR\",
        \"is_correct\": true,
        \"explanation\": \"Correct! Ohm's Law states that voltage equals current times resistance.\"
      },
      {
        \"question_id\": 2,
        \"question\": \"What is the unit of capacitance?\",
        \"your_answer\": \"Farad\",
        \"correct_answer\": \"Farad\",
        \"is_correct\": true,
        \"explanation\": \"Correct! The Farad (F) is the SI unit of capacitance.\"
      },
      {
        \"question_id\": 3,
        \"question\": \"Kirchhoff's laws include...\",
        \"your_answer\": [\"a\", \"b\"],
        \"correct_answer\": [\"a\", \"c\"],
        \"is_correct\": false,
        \"partial_credit\": 0.5,
        \"explanation\": \"Kirchhoff's laws are KCL (Current Law) and KVL (Voltage Law).\"
      }
    ],
    \"progress\": {
      \"total_xp\": 1290,
      \"streak_days\": 12
    }
  }
}
```

**Error Responses:**

- `404` - Quiz not found
- `409` - Already submitted
- `422` - Invalid answer format

---

### 5. Leaderboard

#### Get Leaderboard

**GET** `/student/leaderboard`

View XP rankings by scope.

**Headers:** Authorization: Bearer {token}

**Query Parameters:**

- `scope` (required): \"university\", \"faculty\", or \"department\"
- `university_id` (conditional): Required if scope=university
- `faculty_id` (conditional): Required if scope=faculty
- `department_id` (conditional): Required if scope=department
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 50, max: 100)

**Example Request:**

```bash
GET /student/leaderboard?scope=faculty&faculty_id=3&page=1
```

**Response (200):**

```json
{
  \"success\": true,
  \"data\": {
    \"scope\": \"faculty\",
    \"scope_name\": \"Engineering\",
    \"period\": \"all_time\",
    \"updated_at\": \"2025-10-14T12:00:00Z\",
    \"top_students\": [
      {
        \"rank\": 1,
        \"user_id\": 45,
        \"uuid\": \"450e8400-e29b-41d4-a716-446655440045\",
        \"name\": \"Alhaji Bangura\",
        \"xp\": 2340,
        \"streak_days\": 28,
        \"badges_count\": 8,
        \"avatar_url\": \"https://cdn.edulift.sierra.edu.sl/avatars/45.jpg\",
        \"university\": \"Njala University\",
        \"level\": \"300\"
      },
      {
        \"rank\": 2,
        \"user_id\": 78,
        \"name\": \"Isatu Koroma\",
        \"xp\": 2190,
        \"streak_days\": 21,
        \"badges_count\": 7,
        \"avatar_url\": \"https://cdn.edulift.sierra.edu.sl/avatars/78.jpg\",
        \"university\": \"Njala University\",
        \"level\": \"200\"
      }
    ],
    \"your_rank\": {
      \"rank\": 24,
      \"xp\": 1250,
      \"streak_days\": 12,
      \"badges_count\": 5,
      \"name\": \"You\",
      \"percentile\": 78.5
    }
  },
  \"meta\": {
    \"total_students\": 320,
    \"showing_top\": 50
  }
}
```

**Caching:**

- Leaderboard cached for 1 hour
- Updates every 1 hour via background job

---

### 6. Feed

#### Get Feed Posts

**GET** `/student/feed`

Get community feed with study tips, announcements, and memes.

**Headers:** Authorization: Bearer {token}

**Query Parameters:**

- `type` (optional): \"tip\", \"meme\", \"announcement\", \"all\" (default: all)
- `page` (optional): Page number
- `per_page` (optional): Items per page (default: 20)

**Feed Access Gating:**
Feed unlocks when student meets ONE of:

- Completed ≥1 lesson in last 24 hours
- Earned ≥10 XP in last 24 hours

**Response (200) - Unlocked:**

```json
{
  \"success\": true,
  \"data\": {
    \"can_access\": true,
    \"posts\": [
      {
        \"id\": 51,
        \"type\": \"tip\",
        \"content_html\": \"<p>Study tip: Use spaced repetition for better retention! 📚</p>\",
        \"media_url\": \"https://cdn.edulift.sierra.edu.sl/feed/tip-51.jpg\",
        \"author\": {
          \"id\": 42,
          \"name\": \"Dr. John Kamara\",
          \"role\": \"educator\",
          \"avatar_url\": \"https://cdn.edulift.sierra.edu.sl/avatars/42.jpg\"
        },
        \"likes_count\": 124,
        \"is_liked\": false,
        \"created_at\": \"2025-10-14T10:00:00Z\"
      }
    ]
  },
  \"meta\": {
    \"current_page\": 1,
    \"total\": 156
  }
}
```

**Response (403) - Locked:**

```json
{
  \"success\": false,
  \"error\": {
    \"code\": \"FEED_LOCKED\",
    \"message\": \"Complete a lesson to unlock the feed!\",
    \"details\": {
      \"can_access\": false,
      \"reason\": \"You need to earn XP or complete a lesson to access the feed\",
      \"requirements\": {
        \"min_xp_today\": 10,
        \"min_lessons_today\": 1
      },
      \"current\": {
        \"xp_today\": 5,
        \"lessons_today\": 0
      },
      \"unlock_message\": \"Complete any lesson to unlock! 🎯\"
    }
  }
}
```

---

#### Check Feed Access

**GET** `/student/feed/access`

Check if feed is currently accessible.

**Headers:** Authorization: Bearer {token}

**Response (200):**

```json
{
  \"success\": true,
  \"data\": {
    \"can_access\": true,
    \"reason\": null,
    \"requirements\": {
      \"min_xp_today\": 10,
      \"min_lessons_today\": 1
    },
    \"current\": {
      \"xp_today\": 25,
      \"lessons_today\": 2
    },
    \"unlocked_until\": \"2025-10-15T00:00:00Z\"
  }
}
```

---

#### Like Feed Post

**POST** `/student/feed/{postId}/like`

Like or unlike a feed post.

**Headers:** Authorization: Bearer {token}

**Parameters:**

- `postId`: Feed post ID

**Response (200):**

```json
{
  \"success\": true,
  \"data\": {
    \"post_id\": 51,
    \"is_liked\": true,
    \"likes_count\": 125
  }
}
```

---

### 7. Profile & Settings

#### Get Profile

**GET** `/student/profile`

Get your profile information.

**Headers:** Authorization: Bearer {token}

**Response (200):**

```json
{
  \"success\": true,
  \"data\": {
    \"id\": 1,
    \"uuid\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"email\": \"student@example.com\",
    \"firstname\": \"Jane\",
    \"lastname\": \"Doe\",
    \"full_name\": \"Jane Doe\",
    \"phone\": \"+23276123456\",
    \"university\": {
      \"id\": 1,
      \"name\": \"Njala University\"
    },
    \"faculty\": {
      \"id\": 3,
      \"name\": \"Engineering\"
    },
    \"department\": {
      \"id\": 7,
      \"name\": \"Electrical Engineering\"
    },
    \"level\": \"200\",
    \"xp_total\": 1250,
    \"streak_days\": 12,
    \"current_level\": 5,
    \"badges_count\": 5,
    \"avatar_url\": \"https://cdn.edulift.sierra.edu.sl/avatars/uuid.jpg\",
    \"status\": \"active\",
    \"settings\": {
      \"dark_mode\": true,
      \"notifications\": {
        \"email\": true,
        \"push\": false
      },
      \"language\": \"en\"
    },
    \"statistics\": {
      \"courses_enrolled\": 3,
      \"courses_completed\": 1,
      \"lessons_completed\": 45,
      \"quizzes_passed\": 20,
      \"total_study_hours\": 48.5
    },
    \"created_at\": \"2025-09-01T10:00:00Z\"
  }
}
```

---

#### Update Profile

**PATCH** `/student/profile`

Update profile information.

**Headers:** Authorization: Bearer {token}

**Request Body:**

```json
{
  \"firstname\": \"Jane\",
  \"lastname\": \"Doe-Smith\",
  \"phone\": \"+23276654321\",
  \"avatar_url\": \"https://cdn.edulift.sierra.edu.sl/avatars/new-uuid.jpg\"
}
```

**Response (200):**

```json
{
  \"success\": true,
  \"message\": \"Profile updated successfully\",
  \"data\": {
    \"id\": 1,
    \"firstname\": \"Jane\",
    \"lastname\": \"Doe-Smith\",
    \"phone\": \"+23276654321\",
    \"updated_at\": \"2025-10-14T14:30:00Z\"
  }
}
```

---

#### Update Settings

**PATCH** `/student/profile/settings`

Update user preferences.

**Headers:** Authorization: Bearer {token}

**Request Body:**

```json
{
  \"dark_mode\": true,
  \"notifications\": {
    \"email\": true,
    \"push\": false
  },
  \"language\": \"en\"
}
```

**Response (200):**

```json
{
  \"success\": true,
  \"message\": \"Settings updated successfully\",
  \"data\": {
    \"dark_mode\": true,
    \"notifications\": {
      \"email\": true,
      \"push\": false
    },
    \"language\": \"en\"
  }
}
```

---

### 8. File Uploads

#### Request Presigned Upload URL

**POST** `/uploads/presign`

Get a presigned URL for direct upload to Cloudflare R2.

**Headers:** Authorization: Bearer {token}

**Rate Limit:** 10 requests per minute

**Request Body:**

```json
{
  \"filename\": \"profile-picture.jpg\",
  \"content_type\": \"image/jpeg\",
  \"purpose\": \"avatar\",
  \"size\": 524288
}
```

**Purpose Options & Limits:**

- `avatar`: 5MB max, JPG/PNG/WebP
- `document`: 10MB max, PDF/DOCX

**Response (200):**

```json
{
  \"success\": true,
  \"data\": {
    \"upload_url\": \"https://edulift-sierra.r2.cloudflarestorage.com/uploads/uuid.jpg?X-Amz-Signature=...\",
    \"public_url\": \"https://cdn.edulift.sierra.edu.sl/uploads/uuid.jpg\",
    \"key\": \"uploads/uuid.jpg\",
    \"expires_at\": \"2025-10-14T15:34:56Z\",
    \"max_size_bytes\": 5242880
  }
}
```

**Upload Process:**

1. Request presigned URL from API
2. Upload file directly to `upload_url` using PUT method
3. Confirm upload via `/uploads/confirm` endpoint
4. Use `public_url` in profile update

**Error Responses:**

- `400` - Invalid file type or size
- `429` - Rate limit exceeded

---

#### Confirm Upload

**POST** `/uploads/confirm`

Confirm successful upload and store metadata.

**Headers:** Authorization: Bearer {token}

**Request Body:**

```json
{
  \"key\": \"uploads/uuid.jpg\",
  \"public_url\": \"https://cdn.edulift.sierra.edu.sl/uploads/uuid.jpg\",
  \"purpose\": \"avatar\"
}
```

**Response (200):**

````json
{
  \"success\": true,
  \"message\": \"Upload confirmed successfully\",
  \"data\": {
    \"confirmed\": true,
    \"url\": \"https://cdn.`,
  `language`: `markdown`
}

{
  `id`: `backend-prd`,
  `new_str`: `**Response (200):**
```json
{
  \"success\": true,
  \"message\": \"Upload confirmed successfully\",
  \"data\": {
    \"confirmed\": true,
    \"url\": \"https://cdn.edulift.sierra.edu.sl/uploads/uuid.jpg\"
  }
}
````

**Error Responses:**

- `404` - File not found in storage
- `400` - Invalid key or URL

---

## Error Codes

| Code                   | Status | Description                  |
| ---------------------- | ------ | ---------------------------- |
| `AUTH_FAILED`          | 401    | Invalid credentials          |
| `INVALID_CREDENTIALS`  | 401    | Wrong email or password      |
| `TOKEN_EXPIRED`        | 401    | Authentication token expired |
| `TOKEN_INVALID`        | 401    | Malformed token              |
| `UNAUTHORIZED`         | 401    | Authentication required      |
| `USER_SUSPENDED`       | 403    | Account suspended            |
| `EMAIL_ALREADY_EXISTS` | 409    | Email already registered     |
| `OTP_INVALID`          | 400    | Invalid or expired OTP       |
| `OTP_EXPIRED`          | 400    | OTP has expired              |
| `OTP_RATE_LIMIT`       | 429    | Too many OTP requests        |
| `COURSE_NOT_FOUND`     | 404    | Course does not exist        |
| `LESSON_NOT_FOUND`     | 404    | Lesson not found             |
| `QUIZ_NOT_FOUND`       | 404    | Quiz not found               |
| `ALREADY_COMPLETED`    | 409    | Already completed            |
| `FEED_LOCKED`          | 403    | Feed access locked           |
| `VALIDATION_ERROR`     | 422    | Input validation failed      |
| `FILE_TOO_LARGE`       | 400    | File exceeds size limit      |
| `INVALID_FILE_TYPE`    | 400    | Unsupported file type        |
| `RATE_LIMIT_EXCEEDED`  | 429    | Too many requests            |
| `SERVER_ERROR`         | 500    | Internal server error        |

---

## Rate Limits

| Endpoint Pattern       | Limit       | Window     |
| ---------------------- | ----------- | ---------- |
| `/auth/login/*`        | 5 requests  | 10 minutes |
| `/auth/otp/*`          | 3 requests  | 1 hour     |
| `/uploads/presign`     | 10 requests | 1 minute   |
| `/student/*` (general) | 60 requests | 1 minute   |

**Rate Limit Headers:**

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1697294400
```

When rate limit is exceeded:

```json
{
  \"success\": false,
  \"error\": {
    \"code\": \"RATE_LIMIT_EXCEEDED\",
    \"message\": \"Too many requests. Please try again later.\",
    \"details\": {
      \"retry_after\": 60
    }
  }
}
```

---

## Pagination

All list endpoints support pagination with these parameters:

**Query Parameters:**

- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)

**Response Meta:**

```json
{
  \"meta\": {
    \"current_page\": 1,
    \"last_page\": 5,
    \"per_page\": 20,
    \"total\": 93,
    \"from\": 1,
    \"to\": 20
  },
  \"links\": {
    \"first\": \"https://api.edulift.sierra.edu.sl/api/v1/courses?page=1\",
    \"last\": \"https://api.edulift.sierra.edu.sl/api/v1/courses?page=5\",
    \"prev\": null,
    \"next\": \"https://api.edulift.sierra.edu.sl/api/v1/courses?page=2\"
  }
}
```

---

## Testing with cURL

### Signup Example

```bash
curl -X POST https://api.edulift.sierra.edu.sl/api/v1/auth/signup/student \\
  -H \"Content-Type: application/json\" \\
  -H \"Accept: application/json\" \\
  -d '{
    \"email\": \"student@example.com\",
    \"password\": \"SecurePass123!\"
  }'
```

### Login Example

```bash
curl -X POST https://api.edulift.sierra.edu.sl/api/v1/auth/login/student \\
  -H \"Content-Type: application/json\" \\
  -H \"Accept: application/json\" \\
  -d '{
    \"email\": \"student@example.com\",
    \"password\": \"SecurePass123!\"
  }'
```

### Authenticated Request Example

```bash
curl -X GET https://api.edulift.sierra.edu.sl/api/v1/student/courses \\
  -H \"Content-Type: application/json\" \\
  -H \"Accept: application/json\" \\
  -H \"Authorization: Bearer YOUR_ACCESS_TOKEN\"
```

### Complete Lesson Example

```bash
curl -X POST https://api.edulift.sierra.edu.sl/api/v1/student/lessons/1/complete \\
  -H \"Content-Type: application/json\" \\
  -H \"Accept: application/json\" \\
  -H \"Authorization: Bearer YOUR_ACCESS_TOKEN\" \\
  -d '{
    \"time_spent_seconds\": 1800,
    \"mini_lesson_progress\": [
      {\"mini_lesson_id\": 1, \"completed\": true},
      {\"mini_lesson_id\": 2, \"completed\": true}
    ],
    \"client_event_id\": \"660f9511-e29b-41d4-a716-446655440001\"
  }'
```

---

## Testing with Postman

### Setup

1. **Import Collection**: Create new collection \"EduLift Student API\"
2. **Set Base URL**: `https://api.edulift.sierra.edu.sl/api/v1`
3. **Set Headers** (Collection level):
   - `Content-Type`: `application/json`
   - `Accept`: `application/json`

### Authentication Flow

1. **Signup**: POST to `/auth/signup/student`
2. **Verify OTP**: POST to `/auth/verify-otp` with code from email
3. **Onboard**: POST to `/auth/login/onboard`
4. **Login**: POST to `/auth/login/student`
5. **Copy Token**: Save `access_token` from response
6. **Set Auth**: Collection → Authorization → Type: Bearer Token → Paste token
7. **Test**: GET `/student/courses` should return 200

### Environment Variables (Optional)

```json
{
  \"base_url\": \"https://api.edulift.sierra.edu.sl/api/v1\",
  \"access_token\": \"{{access_token}}\",
  \"student_email\": \"student@example.com\"
}
```

---

## WebSocket Support (Future)

Real-time features planned for v2.0:

- Live notifications
- Real-time leaderboard updates
- Live study sessions
- Chat support

Currently, use HTTP polling for real-time-like updates:

- Poll `/student/progress` every 30 seconds for XP updates
- Poll `/student/leaderboard` every 5 minutes for rank changes

---

## Offline Support

The Student Portal API supports offline-first functionality:

### Idempotency Keys

Use `client_event_id` (UUID) in POST requests to prevent duplicate operations:

```json
{
  \"client_event_id\": \"550e8400-e29b-41d4-a716-446655440000\",
  ...
}
```

The server caches successful responses for 24 hours.

### Offline Queue Strategy

1. Store failed requests locally (IndexedDB)
2. Include `client_event_id` with each request
3. Retry when connection restored
4. Server deduplicates using `client_event_id`

### Sync Behavior

- Lesson completions: Queued and synced when online
- Quiz submissions: Queued and synced when online
- Profile updates: Immediate sync required
- Course browsing: Cache responses locally

---

## Best Practices

### Security

✅ **Always use HTTPS** in production  
✅ **Store tokens securely** (not in localStorage for web)  
✅ **Implement token refresh** before expiry  
✅ **Validate all user inputs** client-side first  
✅ **Use client_event_id** for idempotency

### Performance

✅ **Cache course data** locally (1 hour TTL)  
✅ **Lazy load images** and media  
✅ **Paginate large lists** (max 100 items)  
✅ **Debounce search inputs** (300ms minimum)  
✅ **Prefetch next lesson** in course player

### User Experience

✅ **Show loading states** for all API calls  
✅ **Handle offline gracefully** with queue  
✅ **Display XP animations** on completion  
✅ **Celebrate achievements** (badges, streaks)  
✅ **Provide meaningful error messages**

### Data Management

✅ **Sync progress regularly** (every 5 minutes)  
✅ **Clear old cached data** (>7 days)  
✅ **Compress large payloads** (gzip)  
✅ **Use cursor pagination** for feeds  
✅ **Implement exponential backoff** for retries

---

## Changelog

### Version 1.0.0 (October 2025)

- Initial release
- Authentication & OTP verification
- Course browsing and enrollment
- Lesson completion with XP awards
- Quiz system with multiple types
- Leaderboard rankings
- Feed with access gating
- Profile management
- File upload support

---
