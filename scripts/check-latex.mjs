// Checks LaTeX against the exact settings the student app uses for `formula`
// blocks (src/components/course/MiniLessonRenderer.tsx: katex.renderToString
// with displayMode: true), plus a few traps KaTeX itself doesn't report.
//
// Usage (see docs/LATEX_FORMULA_GUIDE.md):
//   node scripts/check-latex.mjs file.md      checks every ```latex fence
//   node scripts/check-latex.mjs formula.tex  no fences -> whole file is ONE formula
//   node scripts/check-latex.mjs --bad file.md   asserts every ```latex-bad fence is rejected
//
// Exit code is 1 if any formula FAILs (WARNs are reported but don't fail).

import katex from "katex";
import { readFileSync } from "node:fs";

// An unusual colour, so we can tell "KaTeX rendered an unsupported command as
// error text" (e.g. \href with trust off) apart from a deliberate \color.
const ERROR_COLOR = "#fe01fe";

// The two backgrounds a formula block sits on (MiniLessonRenderer.tsx):
// light = bg-gray-50, dark = bg-gray-800/60 over the page's bg-gray-900.
const LIGHT_BG = [249, 250, 251];
const DARK_BG = [24, 35, 50];
// A hard-coded colour can't follow the theme, so it has to read on both. Of the
// 148 CSS colour names only these were measured at >= 3:1 on both backgrounds
// (nothing reaches 4.5:1). The guide recommends the first five.
const SAFE_COLOR_NAMES = new Set([
  "red", "green", "royalblue", "teal", "crimson",
  "chocolate", "darkcyan", "darkgoldenrod", "deeppink", "dodgerblue",
  "forestgreen", "fuchsia", "gray", "grey", "indianred", "lightslategray",
  "lightslategrey", "magenta", "mediumorchid", "mediumpurple",
  "mediumslateblue", "olive", "olivedrab", "orangered", "seagreen",
  "slategray", "slategrey", "steelblue",
]);

const luminance = ([r, g, b]) => {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const parseHex = (value) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

/** WARN messages for colours that won't read on both the light and dark block. */
const colourWarnings = (src) => {
  const out = [];
  for (const m of src.matchAll(/\\(?:text)?color\s*\{([^{}]*)\}/g)) {
    const value = m[1].trim().toLowerCase();
    const rgb = parseHex(value);
    if (rgb) {
      const onLight = contrast(rgb, LIGHT_BG);
      const onDark = contrast(rgb, DARK_BG);
      if (Math.min(onLight, onDark) < 3) {
        out.push(
          `colour ${value} is ${onLight.toFixed(1)}:1 on the light block and ${onDark.toFixed(1)}:1 on the dark one (aim for 3:1 on both, or leave the colour alone)`
        );
      }
    } else if (!SAFE_COLOR_NAMES.has(value)) {
      out.push(
        `colour "${value}" is hard to read on either the light or the dark block — use red, green, royalblue, teal or crimson, or leave the colour alone`
      );
    }
  }
  if (/\\f?colorbox\s*\{/.test(src)) {
    out.push(
      "\\colorbox/\\fcolorbox keep the theme's text colour, so the text is pale-on-pale (dark mode) or dark-on-dark — use \\boxed instead"
    );
  }
  return out;
};

const args = process.argv.slice(2);
const expectBad = args.includes("--bad");
const files = args.filter((a) => !a.startsWith("--"));

if (files.length === 0) {
  console.error("usage: node scripts/check-latex.mjs [--bad] <file> [...]");
  process.exit(2);
}

const fences = (text, lang) => {
  const re = new RegExp("^```" + lang + "[ \\t]*\\r?\\n([\\s\\S]*?)^```", "gm");
  return [...text.matchAll(re)].map((m) => m[1].trim());
};

/** Returns [{ level: "FAIL" | "WARN", msg }] — empty means clean. */
const analyse = (src) => {
  const problems = [];
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (m) => warnings.push(String(m).split("\n")[0]);
  let html = "";
  try {
    html = katex.renderToString(src, {
      displayMode: true,
      throwOnError: true,
      strict: "warn",
      errorColor: ERROR_COLOR,
    });
  } catch (e) {
    problems.push({ level: "FAIL", msg: String(e.message).split("\n")[0] });
  } finally {
    console.warn = originalWarn;
  }

  for (const w of warnings) problems.push({ level: "WARN", msg: w });

  if (html.includes(ERROR_COLOR)) {
    problems.push({
      level: "FAIL",
      msg: "unsupported command is rendered as red text (links/images such as \\href, \\url, \\includegraphics are disabled)",
    });
  }
  if (/(^|[^\\])%/.test(src)) {
    problems.push({
      level: "FAIL",
      msg: "unescaped % starts a comment and silently drops the rest of the line — write \\%",
    });
  }
  if (/[^\x00-\x7F]/.test(src)) {
    problems.push({
      level: "WARN",
      msg: "non-ASCII character (e.g. the micro sign µ has no glyph) — use commands such as \\mu, \\times, \\Omega, ^{\\circ}",
    });
  }
  for (const msg of colourWarnings(src)) problems.push({ level: "WARN", msg });
  return problems;
};

const preview = (src) => src.split("\n")[0].slice(0, 60);
let failures = 0;

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lang = expectBad ? "latex-bad" : "latex";
  let blocks = fences(text, lang);
  if (blocks.length === 0 && !expectBad && !/^```/m.test(text)) {
    blocks = [text.trim()]; // plain file: the whole thing is one formula
  }
  console.log(`\n${file}: ${blocks.length} ${lang} block(s)`);

  blocks.forEach((src, i) => {
    const problems = analyse(src);
    const label = `  #${String(i + 1).padStart(2, "0")} ${preview(src)}`;
    if (expectBad) {
      if (problems.length === 0) {
        failures++;
        console.log(`${label}\n      UNEXPECTEDLY CLEAN — this "bad" example is not actually rejected`);
      } else {
        console.log(`${label}\n      rejected as expected: ${problems[0].msg.slice(0, 100)}`);
      }
      return;
    }
    const hasFail = problems.some((p) => p.level === "FAIL");
    if (hasFail) failures++;
    console.log(`${label}\n      ${problems.length === 0 ? "OK" : hasFail ? "FAIL" : "WARN"}`);
    for (const p of problems) console.log(`        ${p.level}: ${p.msg.slice(0, 140)}`);
  });
}

console.log(failures === 0 ? "\nAll good." : `\n${failures} problem block(s).`);
process.exit(failures === 0 ? 0 : 1);
