# AUDIO BLOCKS API — voice-note content blocks (Audio Blocks V1)

_For the tutor and student frontends. 2026-11-13. Base URL `/api/v1`. All responses use the standard envelope `{ success, message, data, … }`; errors are `{ success:false, error:{ code, message, details? } }`. Auth is the usual Bearer token._

## The model in one minute

- **Audio is a new mini-lesson `content_type`** (`text | image | video | embed | document | audio`), not a new lesson type. A mini-lesson can mix any number of audio blocks with any other block type, in the creator's chosen order (`order_index`, same as every other block).
- An audio block's file is **never inlined** in a block's JSON (`media_url` is always `null` for `content_type: "audio"`). Instead the block carries non-sensitive, read-only facts in `media_metadata`: `format`, `duration_seconds`, `size_bytes`, `original_filename`, and an optional creator-set `title`. These are computed from the verified upload — a client never sends them directly (only `title` is ever creator-writable).
- **Playing an audio block always goes through a dedicated endpoint** (`GET …/mini-lesson-blocks/{id}/audio-url`), which returns a short-lived, presigned R2 link **only after the backend has checked the request is authorised** — course enrollment for a student, ownership for a tutor. This is true for free *and* paid courses alike: there is no permanent public URL for a paid course's audio anywhere in the API.
- Recordings live in their **own, private Cloudflare R2 bucket** (separate from the Resources library's bucket, same Cloudflare account). The upload handshake is the same shape as Resources: presign → the browser PUTs the file straight to R2 → register it, and the backend verifies the file's own bytes (not the filename) for its real format and duration before accepting it.
- **Max duration: 10 minutes**, enforced server-side from the uploaded file's own bytes — a client-reported duration is never trusted. **Supported formats: MP3, WAV, M4A/AAC, WebM/Opus** — also detected from the file's bytes, never from its extension.
- Listening to an audio block is never required to advance, and playback never awards XP or Vybe Coins on its own — existing lesson/course completion and reward rules are completely unchanged.

## Tutor (educator / tutor / admin — contributors cannot manage course content, same as every other block type)

### Step 1 — `POST /tutor/content/mini-lesson-blocks/audio-uploads`
Body: `{ "filename": "voice-note.m4a", "size_bytes": 842311 }`. Rate-limited like every other upload endpoint.

```json
{ "data": {
  "upload_token": "eyJpdiI6...",
  "upload_url": "https://<audio-bucket>.<acct>.r2.cloudflarestorage.com/pending/...?X-Amz-...",
  "method": "PUT",
  "headers": { "Content-Type": "audio/mp4" },
  "upload_url_expires_at": "2026-11-13T10:30:00+00:00",
  "upload_token_expires_at": "2026-11-13T11:15:00+00:00",
  "max_size_bytes": 125829120,
  "max_duration_seconds": 600
} }
```

**Step 2** (the frontend, not the backend): `PUT upload_url` with the raw file bytes and the given `headers`. The file never passes through the API server.

### Step 3 — create the block: `POST /tutor/content/mini-lesson-blocks`
Same endpoint as every other block type. For audio:
```json
{ "mini_lesson_id": 42, "content_type": "audio", "upload_token": "eyJpdiI6...",
  "media_metadata": { "title": "Week 1: why limits matter" },
  "order_index": 3, "is_published": true }
```
- `upload_token` is **required** for `content_type: "audio"` and refused for every other type.
- `media_url` must not be sent for audio (it means nothing there).
- `media_metadata` on create/update of an audio block only ever accepts `title` (≤150 chars) — any other key is a `422`.

`201`:
```json
{ "data": { "block": {
  "id": 501, "uuid": "…", "mini_lesson_id": 42, "content_type": "audio", "text_type": "plain",
  "content": null, "media_url": null,
  "media_metadata": { "format": "m4a", "duration_seconds": 47, "size_bytes": 842311,
                       "original_filename": "voice-note.m4a", "title": "Week 1: why limits matter" },
  "order_index": 3, "is_published": true,
  "audio_file": { "id": 9, "uuid": "…", "version": 1, "status": "active", "created_at": "…" }
  // (no storage_key — it is never serialised)
} } }
```
Errors (all `422` unless noted): `INVALID_UPLOAD_TOKEN` (expired, already used, or minted for someone else) · `UPLOAD_NOT_FOUND` (nothing was PUT to the link yet) · `UPLOAD_TOO_LARGE` · `UPLOAD_TYPE_MISMATCH` (the bytes aren't a supported format) · `AUDIO_DURATION_UNREADABLE` (couldn't verify duration from the file's own bytes — ask the creator to re-export/re-record) · `AUDIO_DURATION_TOO_LONG` (`error.details = { max_duration_seconds, duration_seconds }`). A rejected upload's pending object is deleted; nothing is created.

### Replace the recording: `POST /tutor/content/mini-lesson-blocks/{id}/audio`
Body: `{ "upload_token": "…" }` (from a fresh Step 1/2). Same block, same order, same title — only the recording and its computed `format`/`duration_seconds`/`size_bytes`/`original_filename` change; `audio_file.version` increments. **A failed replacement never touches the working recording** — the old one keeps playing until a new one is fully verified and stored. `422 AUDIO_WRONG_CONTENT_TYPE` if the block isn't audio.

### Update title / order / publish state: `PUT /tutor/content/mini-lesson-blocks/{id}`
The existing endpoint, unchanged for every other block type. For an audio block:
- `media_metadata: { "title": "New title" }` (or `{"title": null}` to clear it) updates only the title — `format`/`duration_seconds`/`size_bytes`/`original_filename` are preserved from the stored file automatically.
- `content_type`, `upload_token` and `media_url` are **refused** (`422`) on an audio block's update — content type can't be changed away from (or into) audio here, and the file is only ever replaced through the endpoint above.

### Preview (creator/admin): `GET /tutor/content/mini-lesson-blocks/{id}/audio-url`
```json
{ "data": { "playback_url": "https://<audio-bucket>...?X-Amz-...", "expires_at": "2026-11-13T10:40:00+00:00" } }
```
Same ownership rule as update/delete (the course's creator, or an admin) — `403` for anyone else. Works on an unpublished/unapproved block, so a creator can preview a draft.

### Delete: `DELETE /tutor/content/mini-lesson-blocks/{id}`
Unchanged — the existing endpoint (a soft delete, same as every block type). The recording stays in R2 until a future storage-lifecycle pass; it is simply no longer reachable once the block is gone.

## Student

### `GET /student/mini-lesson-blocks/{id}/audio-url`
The **only** way to reach an audio block's recording. Requires the same enrollment the rest of the course's content requires (free or paid — a payment must already have created the enrollment): `403 NOT_ENROLLED` otherwise, `404` if the block/course doesn't exist, isn't published, or isn't an audio block.

```json
{ "data": { "playback_url": "https://<audio-bucket>...?X-Amz-...", "expires_at": "2026-11-13T10:40:00+00:00" } }
```
Call this fresh **every time playback starts** — don't cache or persist the link; it is short-lived (10 minutes by default) and re-issued on every authorised call. `401` for a guest.

### Everywhere else (lessons, mini-lessons)
No change in shape — `GET /student/mini-lessons/{id}`, `.../lessons/{id}`, `.../lessons/{id}/mini-lessons` already return each mini-lesson's `blocks[]`, which now may include `content_type: "audio"` entries with `media_url: null` and the `media_metadata` shape above (no `audio_file` key — that only appears in the tutor create/replace response).

## Player behaviour (frontend)

- Play / pause / resume / seek, a duration display, and an adjustable playback speed (0.75× / 1× / 1.25× / 1.5× / 2× suggested) — standard HTML5 `<audio>` behaviour works directly against the presigned URL (R2 serves range requests, so seeking works).
- **Never autoplay** when a mini-lesson opens.
- No minimum-listening requirement: a student can skip/seek freely and still advance. Existing lesson/course completion and XP/Vybe-Coins logic is untouched — audio never triggers it.

## Environment / infra the owner needs to set (see `.env.example`)

- `R2_AUDIO_BUCKET` (a **second**, private R2 bucket — audio never shares the Resources bucket) and `R2_AUDIO_ACCESS_KEY_ID` / `R2_AUDIO_SECRET_ACCESS_KEY` (a token scoped to that bucket only). `R2_AUDIO_ACCOUNT_ID` / `R2_AUDIO_ENDPOINT` default to the main `R2_*` values (same Cloudflare account).
- The audio bucket needs the same CORS (PUT from the tutor portal origin) and lifecycle setup as the Resources bucket: a rule expiring the `pending/` prefix (1 day) and the `trash/` prefix (30 days, the recovery window after a replace).
