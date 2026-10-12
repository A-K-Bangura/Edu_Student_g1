import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { LandingButton } from "../components/landing/LandingButton";
import { LandingImg } from "../components/landing/LandingImg";
import { pickImage } from "../components/landing/landingAssets";
import {
  peekTopics,
  resolveTopic,
  type TeaserTopic,
} from "../components/teaser/comingSoonContent";
import { gsap } from "../utils/gsapSetup";

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-azure-500";

/**
 * The page the teaser shows in place of everything except the landing page.
 * Always light, like the landing page. Which topic it shows (mascot, colour,
 * copy) depends on the path the visitor was trying to reach.
 */
export const ComingSoon = () => {
  const { pathname } = useLocation();
  const topic = resolveTopic(pathname);

  // Placeholder pages shouldn't be indexed: the landing page's links would
  // otherwise get crawled into a pile of near-identical "coming soon" URLs.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Coming soon · UniVybe";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      robots.remove();
    };
  }, []);

  // Keyed so hopping between topics (the chips) resets Vybe's quip and replays
  // the entrance for the new topic.
  return <ComingSoonScene key={topic.id} topic={topic} />;
};

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ComingSoonScene = ({ topic }: { topic: TeaserTopic }) => {
  const { accent, quips } = topic;
  const rootRef = useRef<HTMLDivElement>(null);
  const squishRef = useRef<HTMLDivElement>(null);
  const [quipIndex, setQuipIndex] = useState(0);

  // Entrance: text blocks rise in, then Vybe pops. Skipped entirely for
  // reduced motion, which renders the finished layout.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const q = gsap.utils.selector(root);
        gsap.from(q("[data-enter]"), {
          y: 22,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.08,
        });
        gsap.from(q("[data-stage]"), {
          scale: 0.88,
          opacity: 0,
          duration: 0.7,
          ease: "back.out(1.6)",
        });
      },
      root,
    );
    return () => mm.revert();
  }, []);

  // A tween started by a tap can outlive the page if the visitor navigates.
  useEffect(() => {
    const squish = squishRef.current;
    return () => {
      if (squish) gsap.killTweensOf(squish);
    };
  }, []);

  const nudgeVybe = () => {
    setQuipIndex((index) => (index + 1) % quips.length);
    const squish = squishRef.current;
    if (!squish || prefersReducedMotion()) return;
    gsap.fromTo(
      squish,
      { scaleX: 1.08, scaleY: 0.9 },
      {
        scaleX: 1,
        scaleY: 1,
        duration: 0.6,
        ease: "elastic.out(1, 0.35)",
        overwrite: true,
      },
    );
  };

  return (
    <div
      ref={rootRef}
      className="landing-root relative isolate min-h-svh w-full overflow-x-clip bg-white text-gray-900"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 ${accent.glow}`}
      />

      <header className="mx-auto flex h-16 max-w-6xl items-center justify-center px-5 sm:justify-start sm:px-8">
        <Link
          to="/"
          aria-label="UniVybe home"
          className={`rounded-md ${focusRing}`}
        >
          <LandingImg
            image={pickImage("logo-word-black")}
            alt="UniVybe"
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>
      </header>

      <main
        id="main"
        className="mx-auto grid max-w-6xl items-center gap-4 px-5 pb-12 pt-2 sm:px-8 lg:min-h-[calc(100svh-9rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-16"
      >
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p
            data-enter
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-1.5 text-sm font-extrabold tracking-wide text-white"
          >
            <Sparkles aria-hidden className="h-4 w-4" />
            {topic.eyebrow}
          </p>

          <h1
            data-enter
            className="mt-5 text-balance font-accent text-4xl leading-[1.2] tracking-wider text-gray-900 sm:text-5xl lg:text-6xl"
          >
            {topic.title.lead}{" "}
            <span
              className={`inline-block -rotate-2 rounded-xl px-3 pb-0.5 ${accent.chip}`}
            >
              {topic.title.hot}
            </span>
          </h1>

          <p
            data-enter
            className="mx-auto mt-5 max-w-xl text-lg font-medium leading-relaxed text-gray-600 sm:text-xl lg:mx-0"
          >
            {topic.copy}
          </p>

          <div
            data-enter
            className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <LandingButton to="/" size="lg" arrow>
              Take me back home
            </LandingButton>
          </div>

          <nav data-enter aria-label="More of what's coming" className="mt-10">
            <p className="text-sm font-extrabold uppercase tracking-widest text-gray-500">
              Peek at what's cooking
            </p>
            <ul className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
              {peekTopics(topic.id).map((peek) => (
                <li key={peek.id}>
                  <Link
                    to={peek.route}
                    className={`inline-flex items-center gap-2 rounded-full border-2 border-gray-900 bg-white px-4 py-1.5 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-900 hover:text-white ${focusRing}`}
                  >
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full ${peek.accent.dot}`}
                    />
                    {peek.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div
          data-stage
          className="order-1 mx-auto flex h-[360px] w-full max-w-[420px] flex-col items-center sm:h-[420px] lg:order-2 lg:h-[520px] lg:max-w-[460px]"
        >
          {/* Vybe's speech bubble: the live region announces each new line. */}
          <div className="relative z-20 mb-4 flex min-h-[4.5rem] w-full max-w-[17rem] items-center justify-center rounded-2xl border-2 border-gray-900 bg-white px-4 py-3 text-center shadow-[0_4px_0_0_rgba(17,24,39,1)]">
            <p
              role="status"
              aria-live="polite"
              className="text-base font-bold leading-snug text-gray-900"
            >
              {quips[quipIndex]}
            </p>
            <span
              aria-hidden
              className="absolute -bottom-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-gray-900 bg-white"
            />
          </div>

          <div className="relative min-h-0 w-full flex-1">
            {/* Brand-colour disc and dots behind Vybe, echoing the landing bands. */}
            <span
              aria-hidden
              className={`absolute inset-x-[12%] bottom-0 top-[8%] rounded-full ${accent.disc}`}
            />
            <span
              aria-hidden
              className="absolute left-[2%] top-[22%] h-[9%] w-[9%] rounded-full bg-rose-500"
            />
            <span
              aria-hidden
              className="absolute right-[3%] top-[48%] h-[7%] w-[7%] rounded-full bg-amber-500"
            />
            <LandingImg
              image={pickImage("float-spark")}
              className="vybe-float pointer-events-none absolute right-[4%] top-[2%] z-20 h-14 w-auto sm:h-16"
            />
            <LandingImg
              image={pickImage("float-cap")}
              className="vybe-float pointer-events-none absolute bottom-[6%] left-[1%] z-20 h-10 w-auto -rotate-12 sm:h-12"
            />

            <button
              type="button"
              onClick={nudgeVybe}
              aria-label="Tap Vybe for another message"
              className={`absolute inset-0 z-10 flex cursor-pointer items-end justify-center rounded-3xl border-0 bg-transparent p-0 ${focusRing}`}
            >
              <div ref={squishRef} className="h-full origin-bottom">
                <LandingImg
                  image={pickImage(...topic.mascot)}
                  priority
                  className="vybe-float h-full w-auto max-w-full object-contain drop-shadow-xl"
                />
              </div>
            </button>
          </div>
        </div>
      </main>

      <footer className="px-5 pb-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} UniVybe. Launching soon.
      </footer>
    </div>
  );
};
