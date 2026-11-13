import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AxiosError } from "axios";
import { MiniLessonRenderer } from "./MiniLessonRenderer";
import type { MiniLesson, MiniLessonBlock } from "../../types/lesson";

vi.mock("../../services/lessons", () => ({
  getAudioBlockPlaybackUrl: vi.fn(),
}));

import { getAudioBlockPlaybackUrl } from "../../services/lessons";

const block = (overrides: Partial<MiniLessonBlock>): MiniLessonBlock => ({
  id: 1,
  mini_lesson_id: 5,
  content_type: "text",
  text_type: "plain",
  content: "",
  media_url: null,
  media_metadata: null,
  order_index: 0,
  ...overrides,
});

const miniLesson = (blocks: MiniLessonBlock[]): MiniLesson => ({
  id: 5,
  lesson_id: 12,
  order_index: 0,
  blocks,
});

describe("MiniLessonRenderer — link blocks", () => {
  it("renders a new-tab link, using the label and showing the host when one is given", () => {
    render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({
            id: 22,
            text_type: "link",
            content: "https://chatgpt.com/",
            media_metadata: { label: "Open ChatGPT" },
          }),
        ])}
      />
    );

    const link = screen.getByRole("link", { name: /open chatgpt/i });
    expect(link).toHaveAttribute("href", "https://chatgpt.com/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("chatgpt.com")).toBeInTheDocument();
  });

  it("falls back to showing the raw URL as the link text when there is no label", () => {
    render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({ id: 22, text_type: "link", content: "https://example.com/tool" }),
        ])}
      />
    );

    expect(
      screen.getByRole("link", { name: /example\.com\/tool/i })
    ).toHaveAttribute("href", "https://example.com/tool");
  });

  it("ignores a non-string label instead of crashing", () => {
    render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({
            id: 22,
            text_type: "link",
            content: "https://example.com/",
            media_metadata: { label: 123 },
          }),
        ])}
      />
    );

    expect(
      screen.getByRole("link", { name: /example\.com/i })
    ).toBeInTheDocument();
  });
});

describe("MiniLessonRenderer — prompt blocks", () => {
  const promptContent =
    'You are a patient maths tutor.\n\nExplain "fractions" step by step.\nQuestion: [paste your question here]';

  it("preserves line breaks and escapes any HTML-like text instead of rendering it", () => {
    const { container } = render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({
            id: 23,
            text_type: "prompt",
            content: "<role>tutor</role>\nLine two",
          }),
        ])}
      />
    );

    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre).toHaveTextContent("<role>tutor</role>");
    expect(pre?.querySelector("role")).toBeNull();
  });

  it("copies the exact prompt text via the Clipboard API and shows confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({ id: 23, text_type: "prompt", content: promptContent }),
        ])}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(promptContent));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("falls back to select-all when the Clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({ id: 23, text_type: "prompt", content: promptContent }),
        ])}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith("copy"));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});

describe("MiniLessonRenderer — forgiving fallback", () => {
  it("renders an unrecognised text_type as plain text rather than an empty block", () => {
    render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({
            id: 24,
            // Simulates a future backend value this build doesn't know about yet.
            text_type: "mnemonic" as MiniLessonBlock["text_type"],
            content: "Some future block type's text.",
          }),
        ])}
      />
    );

    expect(screen.getByText("Some future block type's text.")).toBeInTheDocument();
  });
});

describe("MiniLessonRenderer — audio blocks", () => {
  const axiosError = (code: string, status = 403): AxiosError =>
    ({
      response: {
        status,
        data: { success: false, error: { code, message: "error" } },
      },
    }) as unknown as AxiosError;

  beforeEach(() => {
    vi.mocked(getAudioBlockPlaybackUrl).mockReset();
  });

  it("shows the title and duration from media_metadata without fetching a link, and never autoplays", () => {
    render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({
            id: 30,
            content_type: "audio",
            media_metadata: {
              title: "Week 1: why limits matter",
              duration_seconds: 47,
              format: "m4a",
            },
          }),
        ])}
      />
    );

    expect(screen.getByText("Week 1: why limits matter")).toBeInTheDocument();
    expect(screen.getByText("0:47 · M4A")).toBeInTheDocument();
    expect(getAudioBlockPlaybackUrl).not.toHaveBeenCalled();
    expect(document.querySelector("audio")).not.toBeInTheDocument();
  });

  it("fetches a fresh playback link on Play and renders a native, non-autoplaying-until-loaded player", async () => {
    vi.mocked(getAudioBlockPlaybackUrl).mockResolvedValue({
      playback_url: "https://audio-bucket.example.com/signed?x=1",
      expires_at: "2026-11-13T10:40:00+00:00",
    });

    render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({ id: 31, content_type: "audio", media_metadata: null }),
        ])}
      />
    );

    expect(screen.getByText("Audio")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /play/i }));

    await waitFor(() =>
      expect(getAudioBlockPlaybackUrl).toHaveBeenCalledWith(31)
    );

    const audio = await screen.findByText(
      "Your browser does not support the audio tag."
    );
    expect(audio.closest("audio")).toHaveAttribute(
      "src",
      "https://audio-bucket.example.com/signed?x=1"
    );
  });

  it("shows a friendly message when the student isn't enrolled, and still offers to retry", async () => {
    vi.mocked(getAudioBlockPlaybackUrl).mockRejectedValue(
      axiosError("NOT_ENROLLED")
    );

    render(
      <MiniLessonRenderer
        miniLesson={miniLesson([
          block({ id: 32, content_type: "audio", media_metadata: null }),
        ])}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /play/i }));

    expect(
      await screen.findByText(
        "You need to be enrolled in this course to access this content."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
  });
});
