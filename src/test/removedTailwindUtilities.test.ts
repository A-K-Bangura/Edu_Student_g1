import { describe, expect, it } from "vitest";

// Tailwind v4 dropped some v3 utilities. A removed class does not error: it
// matches nothing, so the element silently loses that style. That is how an
// avatar became a solid white disc (`bg-white bg-opacity-20`) and a modal
// backdrop became opaque black (`bg-black bg-opacity-50`) without any warning.
//
// This fails the build of tests if one is reintroduced, with what to write
// instead. Tests are skipped: they may legitimately mention a class by name.
const sources = import.meta.glob<string>("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

const REMOVED: Array<{ name: string; pattern: RegExp; instead: string }> = [
  {
    name: "bg-opacity-* / text-opacity-* / border-opacity-* / divide-opacity-* / ring-opacity-* / placeholder-opacity-*",
    pattern: /(?<![\w-])(?:bg|text|border|divide|ring|placeholder)-opacity-\d+/g,
    instead: "put the opacity in the colour: `bg-black/50`, `text-white/80`, `border-white/30`",
  },
];

const appFiles = Object.entries(sources).filter(
  ([path]) => !/\.test\.[tj]sx?$/.test(path) && !path.startsWith("../test/")
);

describe("removed Tailwind v3 utilities", () => {
  it("scans the app's source (and not nothing)", () => {
    expect(appFiles.length).toBeGreaterThan(100);
  });

  it.each(REMOVED)("$name is not used anywhere", ({ pattern, instead }) => {
    const offenders = appFiles.flatMap(([path, text]) =>
      text
        .split(/\r?\n/)
        .flatMap((line, index) =>
          [...line.matchAll(pattern)].map((m) => `${path.replace("../", "src/")}:${index + 1}  ${m[0]}`)
        )
    );

    expect(offenders, `Tailwind v4 no longer has these — ${instead}`).toEqual([]);
  });

  it("the check itself can tell the difference (it flags the old spelling, not the new one)", () => {
    const [{ pattern }] = REMOVED;
    expect("bg-white bg-opacity-20".match(pattern)).toEqual(["bg-opacity-20"]);
    expect("text-white text-opacity-80".match(pattern)).toEqual(["text-opacity-80"]);
    expect("bg-black/50 text-white/80 opacity-50 bg-opacity".match(pattern)).toBeNull();
  });
});
