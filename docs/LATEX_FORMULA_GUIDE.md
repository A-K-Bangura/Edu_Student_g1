# LaTeX Formula Guide — UniVybe Student Platform

How to write LaTeX so it renders correctly in the student app.

**How to use this file:** paste **Part 1** into any AI chat (or hand over the whole file), then ask for the formulas you need. Everything below was tested against **KaTeX 0.16.45** (the renderer the app ships) with the same settings the app uses. To re-check any LaTeX, including an AI's answer, run `node scripts/check-latex.mjs <file>` (see Part 5).

---

## How the platform renders math (why the rules exist)

- Math is rendered in **one place only**: a mini-lesson text block whose `text_type` is exactly `formula` (`src/components/course/MiniLessonRenderer.tsx`).
- That block's entire content goes through `katex.renderToString(content, { displayMode: true, throwOnError: false })`. So a formula block holds **bare math** — one expression, centred, display-size (big fractions and limits).
- **Nothing else is math-aware.** Plain, Remember, Simply Put and Important blocks, quiz questions/options/explanations and feed posts all show text literally. `$x^2$` in any of them appears with the dollar signs.
- If KaTeX can't parse the content, the student sees the **raw source in red** instead of a formula (no crash, but obviously broken).
- KaTeX does **not** wrap lines. A wide formula makes the block scroll sideways, which is awkward on a phone.
- The block is light in light mode and dark in dark mode, and the formula's default text colour switches with it (near-black / near-white). A colour you hard-code in LaTeX cannot switch, so it must be readable on **both** backgrounds. Almost none are: see rule 9 below.
- An unrecognised `text_type` falls back to plain text, which shows the LaTeX as raw characters. The type must be spelled `formula`.

---

## Part 1 — Prompt to paste into an AI chat

````text
You write LaTeX formulas for UniVybe, a learning app that renders them with
KaTeX 0.16 in display mode. Follow these rules exactly.

OUTPUT FORMAT
- Put each formula in its own fenced code block tagged latex. Inside the fence
  put ONLY the formula body: no $, $$, \( \), \[ \], no \begin{document}, no
  \usepackage, no % comments, no explanation.
- Put explanations OUTSIDE the fence as plain sentences. They are shown as raw
  text, so never put LaTeX or $...$ in them.
- One expression per fence. For several related lines, stack them inside one
  \begin{aligned}...\end{aligned} or \begin{gathered}...\end{gathered}.
- Keep each line short enough for a phone screen (roughly 30 characters of
  math). Break long expressions with aligned/gathered.

SYNTAX RULES
1. Always use braces: x^{2}, x_{i}, \frac{a}{b}, \sqrt{x}.
2. Escape special characters: \% \& \# \$ \_ \{ \}. An unescaped % silently
   deletes the rest of the line.
3. Words, labels and units go in \text{...} and must be short (text never
   wraps). Units: 5\,\text{J}   9.8\ \text{m/s}^{2}   \mathrm{kg\,m/s^{2}}.
4. Multi-line: \begin{aligned} a &= b \\ &= c \end{aligned} (aligns on &),
   \begin{gathered} ... \end{gathered} (centred), \begin{cases} ... \end{cases},
   \begin{pmatrix} ... \end{pmatrix}. Use \\ or \\[8pt] only INSIDE such an
   environment, never bare at the top level.
5. ASCII only. Write symbols as commands: \mu \Omega \Delta \theta \pi \times
   \cdot \pm \leq \geq \neq \approx \to \rightarrow \infty ^{\circ}.
   Never paste Unicode symbols (µ ² × − ≤ → √ Ω π °). The micro sign µ renders
   as a missing glyph; use \mu.
6. Upright letters for units and differentials: \mathrm{d}x, \mathrm{kg}.
   Functions: \sin \cos \ln \log, or \operatorname{name}.
7. Chemistry: \mathrm{H_2O}, \mathrm{2H_2 + O_2 \rightarrow 2H_2O},
   \xrightarrow{\Delta}, \rightleftharpoons, \uparrow. Do not use \ce.
8. Vectors and accents: \vec{F}, \hat{i}, \overrightarrow{AB}, \bar{x}, \dot{x}.
9. Emphasis: \boxed{...} for final answers. Avoid colour: the block is light
   in light mode and dark in dark mode, and a fixed colour is unreadable on one
   of them. If colour is essential use ONLY \color{red}, \color{green},
   \color{royalblue}, \color{teal} or \color{crimson}. Never black, white,
   blue, navy, purple, orange or yellow, and never \colorbox or \fcolorbox.
10. Do NOT use: \ce, siunitx (\SI \si \num \unit), \label \ref \eqref, \mbox,
    \textsc, \newcommand, \def, \DeclareMathOperator, \usepackage,
    \href \url \includegraphics, eqnarray, tabular, bare \\ at top level, or
    $ outside \text{...}.

BEFORE ANSWERING, CHECK EVERY FORMULA
[ ] No delimiters ($, $$, \( \), \[ \]) and no document/package commands
[ ] All special characters escaped, especially %
[ ] ASCII only, with symbols written as commands
[ ] Braces balanced; every \begin has its \end
[ ] \\ only inside aligned/gathered/cases/array/matrix
[ ] Text only inside \text{...}, and short
[ ] Nothing from the "Do NOT use" list
````

---

## Part 2 — What works (all tested on KaTeX 0.16.45)

Write these exactly as shown.

| Need | Use |
| --- | --- |
| Fractions | `\frac{a}{b}`, `\dfrac{a}{b}`, `\tfrac{a}{b}`, `\binom{n}{k}` |
| Roots | `\sqrt{x}`, `\sqrt[3]{x}` |
| Powers, indices | `x^{2}`, `x_{i}`, `x_{i}^{2}`, `T = 25^{\circ}\mathrm{C}` |
| Sums, integrals, limits | `\sum_{i=1}^{n}`, `\prod`, `\int_{0}^{1}`, `\oint`, `\lim_{x \to 0}` |
| Greek | `\alpha \beta \gamma \delta \theta \lambda \mu \pi \sigma \omega \varepsilon`, `\Delta \Omega \Sigma \Phi` |
| Operators | `\cdot \times \div \pm \mp \sqrt{}` |
| Relations | `\leq \geq \neq \approx \propto \equiv \sim \in \notin \subset \subseteq` |
| Arrows | `\to \rightarrow \Rightarrow \leftrightarrow \Leftrightarrow \implies \iff \rightleftharpoons \uparrow \downarrow` |
| Reaction arrows | `\xrightarrow{\Delta}`, `\xrightarrow{\text{heat}}`, `\xleftarrow{}` |
| Vectors, accents | `\vec{F}`, `\overrightarrow{AB}`, `\hat{i}`, `\bar{x}`, `\overline{AB}`, `\dot{x}`, `\ddot{x}` |
| Brackets that scale | `\left( \right)`, `\left[ \right]`, `\left\{ \right\}`, `\left\lvert \right\rvert`, `\left\langle \right\rangle`, and `\left.` for an invisible side |
| Absolute value, floor | `\lvert x \rvert`, `\lVert x \rVert`, `\lfloor x \rfloor`, `\lceil x \rceil` |
| Functions | `\sin \cos \tan \log \ln \exp \max \min`, `\operatorname{sinc}` |
| Calculus, logic, sets | `\nabla \partial \forall \exists \infty \emptyset \cup \cap`, `\mid` |
| Multi-line | `aligned`, `gathered`, `align`, `align*`, `split`, `cases`, `equation` |
| Tables, matrices | `array`, `matrix`, `pmatrix`, `bmatrix`, `vmatrix`, `Vmatrix`, `Bmatrix`, `smallmatrix` (`\hline` works inside `array`) |
| Emphasis | `\boxed{}`, `\fbox{}`, `\cancel{}`, `\bcancel{}`, `\xcancel{}` (these follow the theme's text colour) |
| Colour (sparingly) | `\color{red}{x}`, `\textcolor{green}{x}`: only `red`, `green`, `royalblue`, `teal`, `crimson` (see the note below) |
| Braces over/under | `\underbrace{a+b}_{\text{sum}}`, `\overbrace{a+b}^{\text{sum}}`, `\overset{def}{=}`, `\underset{x}{\lim}` |
| Fonts | `\mathrm{}` upright, `\mathbf{}` bold, `\boldsymbol{\alpha}` bold Greek, `\mathbb{R}`, `\mathcal{L}`, `\mathit{}`, `\textbf{}`, `\textit{}` |
| Spacing | `\,` thin, `\;` medium, `\ ` word space, `\quad`, `\qquad`, `\!` negative |
| Dots | `\ldots \cdots \vdots \ddots` |
| Equation number | `\tag{1}` |
| Text size | `\Large`, `\small` (rarely needed) |

Notes:

- The app already uses display mode, so `\displaystyle` is unnecessary. Use `\tfrac` or `\textstyle` for deliberately small fractions.
- Inside `\text{...}` you can drop back into math with `$...$`, as in `\text{speed $v$ is}`. The `$` must sit *inside* the braces. This is the **only** place a `$` is allowed.
- `\begin{equation}` and friends work but add nothing; the whole block is already one display equation.
- **Colour:** every CSS colour name was measured against both formula backgrounds (light `#f9fafb`, dark `#182332`). No colour reaches the WCAG AA text ratio of 4.5:1 on both. Only 28 reach 3:1 on both (the large-text minimum, which display-size math roughly meets); the five listed above are the recognisable hues among them. `blue` is 1.8:1 on the dark background, `orange` and `yellow` are under 2:1 on the light one, and `black`, `navy` and `purple` nearly vanish on dark. `\colorbox`/`\fcolorbox` only change the box, not the text colour, so they give pale-on-pale or dark-on-dark in one theme whatever colour you pick.

---

## Part 3 — Cookbook (copy, then adapt)

Every `latex` block below is checked by `scripts/check-latex.mjs`. Paste only what is inside the fence into a `formula` block.

### Physics

A boxed result:

```latex
\boxed{W = QV}
```

Definitions with short labels (keep the labels short; long text won't wrap):

```latex
\begin{aligned}
W &= \text{energy transferred (J)} \\[6pt]
Q &= \text{charge (C)} \\[6pt]
V &= \text{potential difference (V)}
\end{aligned}
```

Units:

```latex
1\,\text{J} = 1\,\text{C} \times 1\,\text{V}
```

```latex
a = 9.8\ \text{m/s}^{2}
```

Vectors:

```latex
\vec{F} = m\vec{a}
```

A relationship in words:

```latex
\text{speed} = \frac{\text{distance}}{\text{time}}
```

### Maths

Quadratic formula:

```latex
x = \frac{-b \pm \sqrt{b^{2} - 4ac}}{2a}
```

Integral:

```latex
\int_{0}^{1} x^{2}\,\mathrm{d}x = \frac{1}{3}
```

Limit:

```latex
\lim_{x \to 0} \frac{\sin x}{x} = 1
```

Worked steps, aligned on the equals sign:

```latex
\begin{aligned}
2x + 3 &= 11 \\
2x &= 8 \\
x &= 4
\end{aligned}
```

Piecewise function:

```latex
f(x) = \begin{cases}
x^{2} & \text{if } x \geq 0 \\
-x & \text{if } x < 0
\end{cases}
```

Matrix:

```latex
\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}
```

### Chemistry

```latex
\mathrm{2H_2 + O_2 \rightarrow 2H_2O}
```

```latex
\mathrm{CaCO_3 \xrightarrow{\Delta} CaO + CO_2 \uparrow}
```

```latex
\mathrm{N_2 + 3H_2 \rightleftharpoons 2NH_3}
```

```latex
\mathrm{pH} = -\log_{10}\left[\mathrm{H^{+}}\right]
```

### Statistics and probability

```latex
\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_{i}
```

```latex
P(A \mid B) = \frac{P(B \mid A)\,P(A)}{P(B)}
```

### Several lines in one block

Use `gathered` to centre several separate lines, or `aligned` to line them up on `=`:

```latex
\begin{gathered}
\boxed{W = QV} \\[10pt]
1\,\text{J} = 1\,\text{C} \times 1\,\text{V}
\end{gathered}
```

### What a good AI answer looks like

> **Energy transferred when a charge moves through a potential difference** (goes in a plain-text block)
>
> ```latex
> \boxed{W = QV}
> ```
>
> (goes in a `formula` block). Then the labels go in a second formula block or, better, as plain text: "W is energy in joules, Q is charge in coulombs, V is potential difference in volts."

---

## Part 4 — Common mistakes

Everything in this table was run through the app's renderer. "What the student sees" is the real outcome.

| Don't write | Why | Write instead |
| --- | --- | --- |
| `$W = QV$` or `$$W = QV$$` | `$` is not allowed in math mode, so the block fails and shows raw red source | `W = QV` |
| `\[ W = QV \]` or `\( W = QV \)` | Delimiters are for documents, not for `renderToString`; fails | `W = QV` |
| `x = 50% + 3` | `%` starts a comment: it shows `x = 50` **with no error** | `x = 50\% + 3` |
| `\ce{H2O}` | mhchem isn't loaded; fails | `\mathrm{H_2O}` |
| `\SI{5}{m}`, `\si{m}`, `\num{5}`, `\unit{m}` | siunitx isn't available; fails | `5\,\text{m}` |
| `\mbox{x}`, `\textsc{x}` | not supported; fails | `\text{x}` |
| `\label{eq}`, `\ref{eq}`, `\eqref{eq}` | no cross-references; fails | `\tag{1}` for a visible number |
| `\begin{eqnarray} … \end{eqnarray}` | not supported; fails | `\begin{aligned} … \end{aligned}` |
| `\begin{tabular}{cc} … \end{tabular}` | not supported; fails | `\begin{array}{cc} … \end{array}` |
| `\documentclass`, `\usepackage`, `\begin{document}` | there is no document; fails | Nothing; send only the formula |
| `\href{url}{text}`, `\url{…}`, `\includegraphics{…}` | links and images are disabled; shows the command in red | Use a `link` block or an image block, not a formula |
| `a \\ b` at the top level | line break outside an environment (warns, unreliable) | `\begin{gathered} a \\ b \end{gathered}` |
| `\text{ 3 × 10² }`, `\text{Ω}`, `\text{→}` | Unicode inside `\text{}` has no glyph | `3 \times 10^{2}`, `\Omega`, `\to` |
| `5 µm` (micro sign), `√x`, `é` in math | missing glyph or accent warning | `5\,\mu\text{m}`, `\sqrt{x}` |
| `\color{black}{x}`, `\color{white}{x}`, `\textcolor{blue}{x}`, navy, purple, orange, yellow | unreadable (under 2:1) on the light or the dark block background | leave the colour alone, or use `red`/`green`/`royalblue`/`teal`/`crimson` |
| `\colorbox{yellow}{x}`, `\fcolorbox{…}{…}{x}` | the text stays the theme colour, so it is pale-on-pale in dark mode | `\boxed{x}` |
| `\newcommand{\R}{\mathbb{R}}` | `\R` already exists; avoid macros so each formula stands alone | `\mathbb{R}` |

Two more things to remember:

- **Long `\text{...}` labels never wrap.** A 60-character label will scroll sideways on a phone. Put sentences in a normal text block and keep formulas short.
- **Send the right block type.** Math only renders when `text_type` is `formula`. The same LaTeX in a `plain`, `remember`, `simply_put` or `important` block shows up as raw characters.

---

## Part 5 — Verify before you publish

From the repo root (uses the KaTeX already in `node_modules`):

```bash
node scripts/check-latex.mjs path/to/ai-answer.md
```

- A file with ` ```latex ` fences: every fence is checked.
- A file with no fences: the whole file is treated as one formula.
- It reports **FAIL** (the student would see red source, or content would be silently lost) and **WARN** (renders, but with a missing glyph or non-ASCII input). Exit code is 1 on any FAIL.
- Beyond KaTeX's own errors it catches an unescaped `%`, links/images that render as red text, non-ASCII characters and colours that are hard to read on the light or dark block (any `\color`/`\textcolor` outside the five safe names, hex colours under 3:1 on either background, and `\colorbox`/`\fcolorbox`).

If an AI returns JSON for an API instead of text to paste, every backslash must be doubled in the JSON string (`"\\frac{a}{b}"`). Paste raw LaTeX, not the escaped form, into an editor.

To re-verify this guide itself:

```bash
node scripts/check-latex.mjs docs/LATEX_FORMULA_GUIDE.md
```

The cases in Part 4 are covered by the failure fences below, which must all be rejected (`node scripts/check-latex.mjs --bad docs/LATEX_FORMULA_GUIDE.md`):

```latex-bad
$W = QV$
```

```latex-bad
\[ W = QV \]
```

```latex-bad
x = 50% + 3
```

```latex-bad
\ce{H2O}
```

```latex-bad
\SI{5}{m}
```

```latex-bad
\mbox{x}
```

```latex-bad
\label{eq} x = 1
```

```latex-bad
\begin{eqnarray} a &=& b \end{eqnarray}
```

```latex-bad
\begin{tabular}{cc} a & b \end{tabular}
```

```latex-bad
\usepackage{amsmath}
```

```latex-bad
\href{https://example.com}{link}
```

```latex-bad
a \\ b
```

```latex-bad
5 µm
```

```latex-bad
\text{3 × 10² Ω}
```

```latex-bad
\color{black}{x}
```

```latex-bad
\textcolor{blue}{F = ma}
```

```latex-bad
\colorbox{yellow}{x}
```

```latex-bad
\color{#0a1a4a}{x}
```
