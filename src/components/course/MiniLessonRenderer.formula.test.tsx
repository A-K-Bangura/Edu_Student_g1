import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MiniLessonRenderer } from "./MiniLessonRenderer";
import type { MiniLesson, MiniLessonBlock } from "../../types/lesson";
// The guide's examples are the contract for what authors (and AI tools) send
// us, so render them through the real component rather than trusting the docs.
import guide from "../../../docs/LATEX_FORMULA_GUIDE.md?raw";

vi.mock("../../services/lessons", () => ({
  getAudioBlockPlaybackUrl: vi.fn(),
}));

const formulaBlock = (content: string): MiniLessonBlock => ({
  id: 1,
  mini_lesson_id: 5,
  content_type: "text",
  text_type: "formula",
  content,
  media_url: null,
  media_metadata: null,
  order_index: 0,
});

const renderFormula = (content: string) => {
  const miniLesson: MiniLesson = {
    id: 5,
    lesson_id: 12,
    order_index: 0,
    blocks: [formulaBlock(content)],
  };
  return render(<MiniLessonRenderer miniLesson={miniLesson} />);
};

const goodExamples = [
  ...guide.matchAll(/^```latex[ \t]*\r?\n([\s\S]*?)^```/gm),
].map((m) => m[1].trim());

describe("MiniLessonRenderer — formula blocks (docs/LATEX_FORMULA_GUIDE.md)", () => {
  it("finds the guide's examples (guards against this suite passing vacuously)", () => {
    expect(goodExamples.length).toBeGreaterThanOrEqual(15);
  });

  it.each(goodExamples.map((src) => [src.split("\n")[0], src]))(
    "renders %s as math, with no KaTeX error",
    (_label, src) => {
      const { container } = renderFormula(src);

      expect(container.querySelector(".katex")).not.toBeNull();
      expect(container.querySelector(".katex-error")).toBeNull();
    }
  );

  it("shows the raw source as an error when the content is wrapped in \\[ \\] delimiters", () => {
    const { container } = renderFormula("\\[ W = QV \\]");

    expect(container.querySelector(".katex-error")).not.toBeNull();
  });

  it("shows an error for $...$ delimiters", () => {
    const { container } = renderFormula("$W = QV$");

    expect(container.querySelector(".katex-error")).not.toBeNull();
  });

  it("silently drops everything after an unescaped %", () => {
    const { container } = renderFormula("x = 50% + 3");

    expect(container.querySelector(".katex-error")).toBeNull();
    // `.katex-html` is the visible layer; the hidden MathML annotation still
    // carries the original source, so don't read the whole container.
    expect(container.querySelector(".katex-html")?.textContent).toBe("x=50");
  });

  it("keeps everything when the % is escaped", () => {
    const { container } = renderFormula("x = 50\\% + 3");

    expect(container.querySelector(".katex-error")).toBeNull();
    expect(container.querySelector(".katex-html")?.textContent).toBe("x=50%+3");
  });
});

// Dark-mode contrast regression. jsdom has no Tailwind CSS (and Vitest blanks
// index.css), so computed colours can't be asserted here; these pin the markup
// side. The --formula-error values live in index.css (:root and html.dark) and
// were checked in the browser.
describe("MiniLessonRenderer — formula block colours", () => {
  it("sets an explicit text colour for light and dark mode", () => {
    // Without it KaTeX inherits the light-theme :root colour (#213547), which is
    // ~1.3:1 on the dark block background.
    const { container } = renderFormula("W = QV");
    const block = container.querySelector('[role="math"]');

    expect(block).not.toBeNull();
    expect(block).toHaveClass("text-gray-900", "dark:text-gray-100");
  });

  it.each([
    ["a parse error", "\\[ W = QV \\]"],
    ["an undefined command", "\\ce{H2O}"],
  ])("draws %s in the theme-aware error colour", (_label, src) => {
    const { container } = renderFormula(src);

    // The inline style is how KaTeX applies errorColor (it can't take dark:).
    expect(container.innerHTML).toContain("var(--formula-error)");
    expect(container.innerHTML).not.toContain("#cc0000");
  });
});
