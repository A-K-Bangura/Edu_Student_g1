import { describe, expect, it } from "vitest";
import { getEmbedSource } from "./youtubeEmbed";

const ID = "dQw4w9WgXcQ";
const EMBED = `https://www.youtube.com/embed/${ID}`;

describe("getEmbedSource — YouTube links", () => {
  it.each([
    ["watch page", `https://www.youtube.com/watch?v=${ID}`],
    ["watch page with extra params", `https://www.youtube.com/watch?v=${ID}&t=42s&list=PLabcdefghijk`],
    ["bare domain", `https://youtube.com/watch?v=${ID}`],
    ["mobile site", `https://m.youtube.com/watch?v=${ID}`],
    ["short link", `https://youtu.be/${ID}`],
    ["short link with share tracking", `https://youtu.be/${ID}?si=AbC123xyz`],
    ["live stream", `https://www.youtube.com/live/${ID}`],
    ["legacy /v/ path", `https://www.youtube.com/v/${ID}`],
  ])("turns a %s link into the embeddable player", (_label, url) => {
    expect(getEmbedSource(url)).toEqual({ src: EMBED, vertical: false });
  });

  // The reported bug: /shorts/<id> has no ?v= and isn't youtu.be, so it used
  // to fall through unchanged — YouTube answers it with
  // `X-Frame-Options: SAMEORIGIN`, which the browser shows as an error box.
  it.each([
    ["shorts", `https://www.youtube.com/shorts/${ID}`],
    ["shorts without www", `https://youtube.com/shorts/${ID}`],
    ["shorts on mobile", `https://m.youtube.com/shorts/${ID}`],
    ["shorts with share tracking", `https://youtube.com/shorts/${ID}?feature=share&si=xyz`],
    ["shorts with a trailing slash", `https://www.youtube.com/shorts/${ID}/`],
  ])("embeds a YouTube %s link as a portrait player", (_label, url) => {
    expect(getEmbedSource(url)).toEqual({ src: EMBED, vertical: true });
  });

  it("never returns the framing-blocked /shorts/ or /watch page as the iframe src", () => {
    for (const url of [
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/watch?v=${ID}`,
    ]) {
      expect(getEmbedSource(url)?.src).not.toMatch(/\/(shorts|watch)/);
    }
  });

  it("keeps an existing embed URL as-is, including its player options", () => {
    const url = `https://www.youtube.com/embed/${ID}?start=30&rel=0`;
    expect(getEmbedSource(url)).toEqual({ src: url, vertical: false });
  });

  it("embeds a playlist link as the playlist player", () => {
    expect(
      getEmbedSource("https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG")
    ).toEqual({
      src: "https://www.youtube.com/embed/videoseries?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
      vertical: false,
    });
  });

  it("keeps an existing playlist embed URL working ('videoseries' is 11 characters, like a video id)", () => {
    const url = "https://www.youtube.com/embed/videoseries?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG";
    expect(getEmbedSource(url)).toEqual({ src: url, vertical: false });
  });

  it("shows the single video, not the playlist, when a watch link carries both", () => {
    expect(
      getEmbedSource(`https://www.youtube.com/watch?v=${ID}&list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG`)?.src
    ).toBe(EMBED);
  });

  it("tolerates surrounding whitespace from a copy-paste", () => {
    expect(getEmbedSource(`  https://youtu.be/${ID}\n`)?.src).toBe(EMBED);
  });

  it("returns null for a YouTube page with no playable video (rather than framing a page that will be refused)", () => {
    for (const url of [
      "https://www.youtube.com/",
      "https://www.youtube.com/@somechannel",
      "https://www.youtube.com/channel/UC1234567890",
      "https://www.youtube.com/watch",
      "https://www.youtube.com/shorts/",
      "https://youtu.be/",
    ]) {
      expect(getEmbedSource(url), url).toBeNull();
    }
  });

  it("rejects an id that isn't a real video id, so it can't smuggle path segments into the embed URL", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=..%2F..%2Faccount",
      "https://www.youtube.com/shorts/short",
      `https://www.youtube.com/watch?v=${ID}extra`,
    ]) {
      expect(getEmbedSource(url), url).toBeNull();
    }
  });

  it("matches the YouTube host exactly, not as a substring", () => {
    // Previously `hostname.includes("youtube.com")`: lookalike hosts counted.
    expect(getEmbedSource(`https://notyoutube.com/watch?v=${ID}`)).toEqual({
      src: `https://notyoutube.com/watch?v=${ID}`,
      vertical: false,
    });
    expect(getEmbedSource(`https://youtube.com.evil.example/shorts/${ID}`)?.src).toBe(
      `https://youtube.com.evil.example/shorts/${ID}`
    );
  });
});

describe("getEmbedSource — other providers and bad input", () => {
  it("passes a non-YouTube http(s) URL through unchanged (e.g. a Vimeo player URL)", () => {
    const url = "https://player.vimeo.com/video/76979871";
    expect(getEmbedSource(url)).toEqual({ src: url, vertical: false });
  });

  it.each([
    ["javascript:", "javascript:alert(document.cookie)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["file:", "file:///etc/passwd"],
  ])("never frames a %s URL (it would run in the app's own origin)", (_label, url) => {
    expect(getEmbedSource(url)).toBeNull();
  });

  it.each([["empty string", ""], ["whitespace", "   "], ["not a URL", "watch this on youtube"]])(
    "returns null for %s",
    (_label, url) => {
      expect(getEmbedSource(url)).toBeNull();
    }
  );
});
