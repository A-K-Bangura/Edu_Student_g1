/**
 * Turns the URL a tutor stored on an `embed` block into something that is safe
 * and able to go in an `<iframe src>`.
 *
 * YouTube only allows its *player* (`/embed/<id>`) to be framed; every other
 * page — `/watch`, `/shorts/<id>`, `/live/<id>` — is served with
 * `X-Frame-Options: SAMEORIGIN`, so framing one shows the browser's
 * "refused to connect" error box instead of the video. Share links are almost
 * always one of those pages, so they have to be rewritten to the player URL.
 */

export interface EmbedSource {
  /** URL for the iframe `src`. */
  src: string;
  /** Portrait media (YouTube Shorts): size the player 9:16, not 16:9. */
  vertical: boolean;
}

// A YouTube video id is always exactly 11 URL-safe characters. Checking it also
// stops a crafted `?v=` from adding path segments to the embed URL.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,64}$/;

const YOUTUBE_EMBED_ORIGIN = "https://www.youtube.com/embed";

/** `youtube.com` and its subdomains (www, m, music) — an exact match, not a substring. */
const isYouTubeHost = (host: string): boolean =>
  host === "youtube.com" ||
  host.endsWith(".youtube.com") ||
  host === "youtube-nocookie.com" ||
  host.endsWith(".youtube-nocookie.com");

const isShortLinkHost = (host: string): boolean =>
  host === "youtu.be" || host === "www.youtu.be";

const videoEmbed = (id: string, vertical = false): EmbedSource => ({
  src: `${YOUTUBE_EMBED_ORIGIN}/${id}`,
  vertical,
});

const playlistEmbed = (listId: string): EmbedSource => ({
  src: `${YOUTUBE_EMBED_ORIGIN}/videoseries?list=${listId}`,
  vertical: false,
});

/**
 * Returns the iframe source for a stored embed URL, or `null` when there is
 * nothing safe/playable to show (not a URL, a non-http(s) scheme such as
 * `javascript:`, or a YouTube page with no video in it).
 */
export const getEmbedSource = (rawUrl: string): EmbedSource | null => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  // An iframe `src` of `javascript:`/`data:` would run inside the app's origin.
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const [first, second] = parsed.pathname.split("/").filter(Boolean);

  if (isShortLinkHost(host)) {
    return first && VIDEO_ID.test(first) ? videoEmbed(first) : null;
  }

  if (!isYouTubeHost(host)) {
    // Another provider's player URL (Vimeo, Slides, …): frame it as given.
    return { src: parsed.toString(), vertical: false };
  }

  const playlistId = parsed.searchParams.get("list");
  const hasPlaylist = playlistId !== null && PLAYLIST_ID.test(playlistId);

  // Already the player: keep it exactly as stored, so options the tutor chose
  // (?start=30, ?rel=0, …) survive. Checked before the video-id rule because
  // the playlist player's path segment, "videoseries", is itself 11 characters.
  if (first === "embed") {
    if (second === "videoseries") {
      return hasPlaylist ? { src: parsed.toString(), vertical: false } : null;
    }
    return second && VIDEO_ID.test(second)
      ? { src: parsed.toString(), vertical: false }
      : null;
  }

  if (first === "shorts") {
    return second && VIDEO_ID.test(second) ? videoEmbed(second, true) : null;
  }

  if (first === "live" || first === "v") {
    return second && VIDEO_ID.test(second) ? videoEmbed(second) : null;
  }

  if (first === "watch") {
    const id = parsed.searchParams.get("v");
    return id && VIDEO_ID.test(id) ? videoEmbed(id) : null;
  }

  if (first === "playlist") {
    return hasPlaylist ? playlistEmbed(playlistId) : null;
  }

  return null;
};
