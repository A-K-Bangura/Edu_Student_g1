// Builds optimized, web-sized WebP images from the full-size source art in
// `src/assets/` and regenerates a typed index next to each output folder (with
// intrinsic dimensions, so <img> tags can reserve layout space and avoid layout
// shift).
//
// Two sets, each with its own output folder and index:
//   landing -> src/assets/landing/  (public landing page; `landingImages` record)
//   brand   -> src/assets/brand/    (logo variants used by app chrome: TopNav and
//                                    the auth pages; one named export per image)
//
// Run with:
//   npm run assets:landing   only the landing set
//   npm run assets:brand     only the brand set
//   npm run assets           every set
//
// Sources are left untouched. Optional sources (the Higgsfield-generated
// mascots/coin) are skipped when absent; the landing page falls back to an
// existing mascot for those slots (see src/components/landing/landingAssets.ts).
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src/assets");

/**
 * @typedef {{
 *   name: string; src: string; width: number; height?: number;
 *   optional?: boolean; quality?: number; alphaQuality?: number;
 *   trim?: boolean;
 * }} Job
 * `trim` (default true) crops transparent margins before scaling. Turn it off
 * when the consumer lays the image out in a fixed box and the source's canvas
 * (margins included) is part of the design.
 */

/** @type {Record<string, { outDir: string; index: "record" | "named"; jobs: Job[] }>} */
const sets = {
  landing: {
    outDir: "landing",
    index: "record",
    jobs: [
      // Logo — hero centerpiece (colored), plus the black/white wordmarks used by
      // the guest header (theme-dependent) and the footer
      { name: "logo-colors", src: "logo/logo_colors.png", width: 1100 },
      { name: "logo-word-black", src: "logo/logo_word_black.png", width: 420 },
      { name: "logo-word-white", src: "logo/logo_word_white.png", width: 420 },

      // Mascots (rendered at roughly 280-520 CSS px; 2x is covered by ~640-760px)
      { name: "mascot-hi", src: "mascots/Hi.png", width: 640, height: 900 },
      { name: "mascot-hat", src: "mascots/vybe_hat.png", width: 640, height: 900 },
      { name: "mascot-learning", src: "mascots/learning.png", width: 760, height: 900 },
      { name: "mascot-smart", src: "mascots/vybe_smart.png", width: 640, height: 900 },
      // Fallback poses for sections whose bespoke mascot has not been added yet
      { name: "mascot-cool", src: "mascots/vybe_cool.png", width: 640, height: 900 },
      { name: "mascot-shrug", src: "mascots/dont_know.png", width: 640, height: 900 },
      { name: "mascot-cool-bust", src: "mascots/cool_profile.png", width: 640, height: 900 },
      // Generated with Higgsfield from the references above (optional)
      { name: "mascot-practical", src: "mascots/practical.png", width: 700, height: 900, optional: true },
      { name: "mascot-coins", src: "mascots/coins.png", width: 700, height: 900, optional: true },
      { name: "mascot-opportunities", src: "mascots/opportunities.png", width: 700, height: 900, optional: true },
      { name: "coin", src: "mascots/coin.png", width: 256, optional: true },

      // Small floating accents (rendered at 56-140 CSS px)
      { name: "float-spark", src: "floatings/spark.png", width: 220 },
      { name: "float-cap", src: "floatings/Ghat.png", width: 280 },
      { name: "float-headset", src: "floatings/headset.png", width: 240 },
      { name: "float-confetti", src: "floatings/confetii.png", width: 240 },
      { name: "float-wave", src: "floatings/wave.png", width: 220 },
      { name: "float-focus", src: "floatings/focus.png", width: 220 },
    ],
  },

  // Logo variants for TopNav and the auth pages. Sized for the rendered size at
  // 2x, and NOT trimmed: the 1024x1024 / 1655x639 canvases (with their
  // transparent margins) are laid out in fixed boxes, so cropping would change
  // the visual size and aspect ratio.
  //
  // Names start with `brand-` on purpose: Vite keeps the source basename in the
  // hashed output (`assets/brand-*.webp`), and vite.config.ts precaches exactly
  // that pattern so the app-chrome logo still renders offline on first visit.
  brand: {
    outDir: "brand",
    index: "named",
    jobs: [
      // App icon. `-160`: TopNav (60 CSS px). `-320`: auth pages (160 CSS px).
      { name: "brand-icon-black-160", src: "logo/Logo_black.png", width: 160, trim: false, alphaQuality: 95 },
      { name: "brand-icon-white-160", src: "logo/Logo_white.png", width: 160, trim: false, alphaQuality: 95 },
      { name: "brand-icon-black-320", src: "logo/Logo_black.png", width: 320, trim: false, alphaQuality: 95 },
      { name: "brand-icon-white-320", src: "logo/Logo_white.png", width: 320, trim: false, alphaQuality: 95 },
      // Wordmark: TopNav, 32-48 CSS px tall (~83-124 CSS px wide)
      { name: "brand-word-black", src: "logo/logo_word_black.png", width: 420, trim: false, alphaQuality: 95 },
      { name: "brand-word-white", src: "logo/logo_word_white.png", width: 420, trim: false, alphaQuality: 95 },
    ],
  },
};

const exists = (p) =>
  fs
    .access(p)
    .then(() => true)
    .catch(() => false);

const ident = (name) =>
  name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c);

const requested = process.argv.slice(2);
const unknown = requested.filter((name) => !(name in sets));
if (unknown.length > 0) {
  console.error(
    `Unknown asset set(s): ${unknown.join(", ")}. Available: ${Object.keys(sets).join(", ")}`,
  );
  process.exit(1);
}
const setNames = requested.length > 0 ? requested : Object.keys(sets);

/** Index file text for the landing set: a string-keyed record (some entries are optional). */
const recordIndex = (entries, script) => [
  `// AUTO-GENERATED by ${script} — do not edit by hand.`,
  "// Re-run `npm run assets:landing` after adding or changing source art.",
  "",
  ...entries.map((e) => `import ${ident(e.name)} from "./${e.name}.webp";`),
  "",
  "export interface LandingImage {",
  "  src: string;",
  "  width: number;",
  "  height: number;",
  "}",
  "",
  "export const landingImages: Record<string, LandingImage> = {",
  ...entries.map(
    (e) =>
      `  "${e.name}": { src: ${ident(e.name)}, width: ${e.width}, height: ${e.height} },`,
  ),
  "};",
  "",
];

/** Index file text for the brand set: one named export per image, so a typo is a compile error. */
const namedIndex = (entries, script) => [
  `// AUTO-GENERATED by ${script} — do not edit by hand.`,
  "// Re-run `npm run assets:brand` after adding or changing source art.",
  "",
  ...entries.map((e) => `import ${ident(e.name)}Src from "./${e.name}.webp";`),
  "",
  "export interface BrandImage {",
  "  src: string;",
  "  width: number;",
  "  height: number;",
  "}",
  "",
  ...entries.map(
    (e) =>
      `export const ${ident(e.name)}: BrandImage = { src: ${ident(e.name)}Src, width: ${e.width}, height: ${e.height} };`,
  ),
  "",
];

for (const setName of setNames) {
  const { outDir: outFolder, index, jobs } = sets[setName];
  const outDir = path.join(srcDir, outFolder);

  // Resolve sources before touching the output folder, so a missing required
  // source can't leave it wiped.
  const resolved = [];
  for (const job of jobs) {
    const input = path.join(srcDir, job.src);
    if (!(await exists(input))) {
      if (job.optional) {
        console.log(`skip   ${job.name} (optional source missing: ${job.src})`);
        continue;
      }
      throw new Error(`Missing required source: ${input}`);
    }
    resolved.push({ job, input });
  }

  await fs.mkdir(outDir, { recursive: true });
  // Clear stale outputs so removed jobs don't linger in the bundle.
  for (const f of await fs.readdir(outDir)) {
    if (f.endsWith(".webp")) await fs.rm(path.join(outDir, f));
  }

  const entries = [];
  let totalBytes = 0;

  for (const { job, input } of resolved) {
    // Trim transparent margins (unless the job opts out), then scale down (never up).
    const source =
      job.trim === false
        ? sharp(input)
        : sharp(await sharp(input).trim({ threshold: 8 }).toBuffer());
    const out = path.join(outDir, `${job.name}.webp`);
    const info = await source
      .resize({
        width: job.width,
        height: job.height,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: job.quality ?? 80,
        alphaQuality: job.alphaQuality ?? 85,
        effort: 6,
      })
      .toFile(out);

    totalBytes += info.size;
    entries.push({ name: job.name, width: info.width, height: info.height });
    console.log(
      `wrote  ${setName}/${job.name}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`,
    );
  }

  const script = "scripts/optimize-assets.mjs";
  const lines = index === "named" ? namedIndex(entries, script) : recordIndex(entries, script);
  await fs.writeFile(path.join(outDir, "index.ts"), lines.join("\n"));

  console.log(
    `\n[${setName}] ${entries.length} images, ${(totalBytes / 1024).toFixed(0)} KB total -> src/assets/${outFolder}/\n`,
  );
}
