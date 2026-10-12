// Copy and styling for the teaser's "coming soon" page (pages/ComingSoon.tsx).
// Every route except the landing page lands there; the page the visitor was
// trying to reach picks which topic they see, so each landing-page link pays
// off with something different instead of one generic wall.

export type TeaserTopicId =
  | "auth"
  | "courses"
  | "roadmaps"
  | "resources"
  | "opportunities"
  | "gigs"
  | "feed"
  | "coins"
  | "home"
  | "lost";

// Literal Tailwind classes so the scanner picks them up. Same five brand
// colours (and light/dark text pairing) as the landing page's feature bands.
const ACCENTS = {
  amber: {
    chip: "bg-amber-500 text-gray-900",
    disc: "bg-amber-500",
    dot: "bg-amber-500",
    glow: "bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,190,11,0.2),transparent_70%),radial-gradient(40%_40%_at_90%_80%,rgba(58,134,255,0.1),transparent_70%)]",
  },
  azure: {
    chip: "bg-azure-500 text-white",
    disc: "bg-azure-500",
    dot: "bg-azure-500",
    glow: "bg-[radial-gradient(60%_50%_at_50%_0%,rgba(58,134,255,0.18),transparent_70%),radial-gradient(40%_40%_at_90%_80%,rgba(255,0,110,0.08),transparent_70%)]",
  },
  aquamarine: {
    chip: "bg-aquamarine-500 text-gray-900",
    disc: "bg-aquamarine-500",
    dot: "bg-aquamarine-500",
    glow: "bg-[radial-gradient(60%_50%_at_50%_0%,rgba(0,245,212,0.2),transparent_70%),radial-gradient(40%_40%_at_90%_80%,rgba(131,56,236,0.08),transparent_70%)]",
  },
  rose: {
    chip: "bg-rose-500 text-white",
    disc: "bg-rose-500",
    dot: "bg-rose-500",
    glow: "bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,0,110,0.14),transparent_70%),radial-gradient(40%_40%_at_90%_80%,rgba(255,190,11,0.14),transparent_70%)]",
  },
  violet: {
    chip: "bg-blue-violet-500 text-white",
    disc: "bg-blue-violet-500",
    dot: "bg-blue-violet-500",
    glow: "bg-[radial-gradient(60%_50%_at_50%_0%,rgba(131,56,236,0.16),transparent_70%),radial-gradient(40%_40%_at_90%_80%,rgba(0,245,212,0.14),transparent_70%)]",
  },
} as const;

export type TeaserAccent = (typeof ACCENTS)[keyof typeof ACCENTS];

export interface TeaserTopic {
  id: TeaserTopicId;
  /** Short name for the "peek at what's cooking" chips. */
  label: string;
  /** A route that resolves to this topic (what the chips link to). */
  route: string;
  eyebrow: string;
  /** `hot` is set as a highlighted chip at the end of the headline. */
  title: { lead: string; hot: string };
  copy: string;
  /** Vybe's lines; tapping the mascot cycles through them. */
  quips: readonly string[];
  /** Landing-image names, first available wins (see landingAssets.pickImage). */
  mascot: readonly string[];
  accent: TeaserAccent;
}

export const TOPICS: Record<TeaserTopicId, TeaserTopic> = {
  auth: {
    id: "auth",
    label: "Sign-ups",
    route: "/auth/signup",
    eyebrow: "Sign-ups · Coming soon",
    title: { lead: "We're still cutting the", hot: "keys" },
    copy: "Accounts, log-ins and your very first lesson are being polished behind the scenes. Check back soon, Vybe is saving you a front-row seat.",
    quips: [
      "Psst… the keys are almost done.",
      "Your seat is saved. I checked twice.",
      "I tried the door. Still locked. Rude.",
      "Be the first one through when it opens!",
    ],
    mascot: ["mascot-secure", "mascot-cool", "mascot-hi"],
    accent: ACCENTS.amber,
  },
  courses: {
    id: "courses",
    label: "Courses",
    route: "/courses",
    eyebrow: "Courses · Coming soon",
    title: { lead: "Courses are still", hot: "in the oven" },
    copy: "Bite-sized lessons, quizzes and streaks are getting their finishing touches. Smells good already, right?",
    quips: [
      "Don't open the oven! You'll deflate the lessons.",
      "Bite-sized, as promised. Just not served yet.",
      "There's a quiz in here with your name on it…",
      "Fresh knowledge, out of the oven soon.",
    ],
    mascot: ["mascot-learning", "mascot-smart", "mascot-hat", "mascot-hi"],
    accent: ACCENTS.azure,
  },
  roadmaps: {
    id: "roadmaps",
    label: "Roadmaps",
    route: "/roadmaps",
    eyebrow: "Roadmaps · Coming soon",
    title: { lead: "We're still drawing", hot: "the map" },
    copy: "Step-by-step roadmaps that take you from “where do I even start?” to “I did it” are almost ready to explore.",
    quips: [
      "X marks the spot. We just haven't drawn the X yet.",
      "Left, right, or straight to graduation?",
      "Pack light. The journey's worth it.",
    ],
    mascot: ["mascot-hat", "mascot-cool", "mascot-hi"],
    accent: ACCENTS.aquamarine,
  },
  resources: {
    id: "resources",
    label: "Resources",
    route: "/resources",
    eyebrow: "Resources · Coming soon",
    title: { lead: "The shelves are still", hot: "being stacked" },
    copy: "Notes, slides, past questions and books are being sorted into one tidy place, so you spend less time searching and more time learning.",
    quips: [
      "Shhh, this is a library. Almost.",
      "Lecture notes: alphabetised. Past questions: nervous.",
      "I found a book. It was upside down.",
    ],
    mascot: ["mascot-smart", "mascot-hat", "mascot-hi"],
    accent: ACCENTS.violet,
  },
  opportunities: {
    id: "opportunities",
    label: "Opportunities",
    route: "/feed/opportunities",
    eyebrow: "Opportunities · Coming soon",
    title: { lead: "Opportunities are", hot: "lining up" },
    copy: "Internships, scholarships, competitions and programs are queueing at the door. We're just making sure there's room for everyone.",
    quips: [
      "Knock knock. Who's there? A scholarship. Wait your turn!",
      "Dust off your CV. Just in case.",
      "Good things come to those who check back soon.",
    ],
    mascot: ["mascot-opportunities", "mascot-hat", "mascot-hi"],
    accent: ACCENTS.azure,
  },
  gigs: {
    id: "gigs",
    label: "Gigs",
    route: "/feed/gigs",
    eyebrow: "Gigs · Coming soon",
    title: { lead: "The gig board is", hot: "warming up" },
    copy: "Small jobs from fellow students, tutors and the platform, the kind you can fit around lectures, are on their way.",
    quips: [
      "Hustle mode: loading…",
      "Your side hustle is still putting its shoes on.",
      "First gig of the day is waiting politely.",
    ],
    mascot: ["mascot-gigs", "mascot-cool", "mascot-hi"],
    accent: ACCENTS.aquamarine,
  },
  feed: {
    id: "feed",
    label: "Feed",
    route: "/feed",
    eyebrow: "Feed · Coming soon",
    title: { lead: "The feed is still", hot: "gathering gossip" },
    copy: "Campus buzz, study tips and updates, all in one scroll. We're collecting the good stuff first.",
    quips: [
      "Nothing to scroll yet. Touch grass in the meantime?",
      "I've got tea. It's not ready yet, though.",
      "Soon: all the campus buzz, none of the noise.",
    ],
    mascot: ["mascot-cool", "mascot-hi"],
    accent: ACCENTS.rose,
  },
  coins: {
    id: "coins",
    label: "Vybe Coins",
    route: "/wallet",
    eyebrow: "Vybe Coins · Coming soon",
    title: { lead: "The coin jar is", hot: "still empty" },
    copy: "Finish courses, earn Vybe Coins and turn steady learning into real rewards. The jar is ready, we're just minting.",
    quips: [
      "Shake the jar all you like. Nothing yet.",
      "Learn. Complete. Earn. In that order!",
      "I'm already counting my coins. Don't tell anyone.",
    ],
    mascot: ["mascot-coins", "mascot-hat", "mascot-hi"],
    accent: ACCENTS.rose,
  },
  home: {
    id: "home",
    label: "Dashboard",
    route: "/dashboard",
    eyebrow: "Your space · Coming soon",
    title: { lead: "Your dashboard is", hot: "getting a glow-up" },
    copy: "Streaks, XP, badges and leaderboards are being set up. It's going to look good on you.",
    quips: [
      "Streaks, XP, badges. I've seen the plans. Wow.",
      "Your future rank is stretching.",
      "Day one of your streak starts at launch!",
    ],
    mascot: ["mascot-cool", "mascot-learning", "mascot-hi"],
    accent: ACCENTS.amber,
  },
  lost: {
    id: "lost",
    label: "Elsewhere",
    route: "/",
    eyebrow: "Coming soon",
    title: { lead: "Whoa, this corner isn't", hot: "ready yet" },
    copy: "UniVybe is still being put together. The landing page is wide open though, pop back and see what's on the way.",
    quips: [
      "I'm lost too. Let's pretend we meant to come here.",
      "Nothing to see here… yet.",
      "Wrong turn? Right turn? Very early turn.",
    ],
    mascot: ["mascot-shrug", "mascot-hi"],
    accent: ACCENTS.violet,
  },
};

// Which topic the chips offer, in the order the landing page tells the story.
const PEEK_ORDER: readonly TeaserTopicId[] = [
  "courses",
  "roadmaps",
  "resources",
  "opportunities",
  "gigs",
  "coins",
];

export const peekTopics = (current: TeaserTopicId): TeaserTopic[] =>
  PEEK_ORDER.filter((id) => id !== current).map((id) => TOPICS[id]);

/** Which topic a pathname belongs to. Unknown paths get the generic one. */
export const resolveTopic = (pathname: string): TeaserTopic => {
  const [first = "", second = ""] = pathname
    .toLowerCase()
    .split("/")
    .filter(Boolean);

  switch (first) {
    case "auth":
    case "onboarding":
      return TOPICS.auth;
    case "courses":
    case "course":
      return TOPICS.courses;
    case "roadmaps":
      return TOPICS.roadmaps;
    case "resources":
      return TOPICS.resources;
    case "feed":
      if (second === "opportunities") return TOPICS.opportunities;
      if (second === "gigs") return TOPICS.gigs;
      return TOPICS.feed;
    case "wallet":
      return TOPICS.coins;
    case "dashboard":
    case "profile":
    case "leaderboard":
      return TOPICS.home;
    default:
      return TOPICS.lost;
  }
};
