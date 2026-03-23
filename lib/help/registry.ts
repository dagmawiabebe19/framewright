export type HelpArticleMeta = {
  href: string;
  title: string;
  section: string;
  summary: string;
  keywords: string;
  readMinutes: number;
};

export const HELP_ARTICLES: HelpArticleMeta[] = [
  {
    href: "/help/getting-started",
    title: "Setting up your first show",
    section: "Getting started",
    summary:
      "Organization, first show, episodes, invites, and picture lock basics.",
    keywords:
      "onboard organization show code invite team picture lock episode",
    readMinutes: 4,
  },
  {
    href: "/help/episode-hub",
    title: "Understanding the episode hub",
    section: "Getting started",
    summary:
      "How the episode hub ties together cuts, dailies, VFX, and deliverables.",
    keywords: "episode hub command center deliverables cuts",
    readMinutes: 3,
  },
  {
    href: "/help/dailies-tracker",
    title: "Using the dailies tracker",
    section: "Editorial",
    summary:
      "Rolls, Kanban columns, status email, and distribution lists.",
    keywords: "dailies rolls ingest sync email distribution",
    readMinutes: 5,
  },
  {
    href: "/help/cut-log",
    title: "Logging cut versions",
    section: "Editorial",
    summary:
      "Cut types, duration timecode (HH:MM:SS:FF), and reference files.",
    keywords: "cut log version timecode assembly directors picture lock",
    readMinutes: 4,
  },
  {
    href: "/help/phase-timeline",
    title: "Understanding the phase timeline",
    section: "Editorial",
    summary:
      "How phases advance from shooting through delivery on the episode hub.",
    keywords: "phase timeline picture lock vfx finals delivery",
    readMinutes: 3,
  },
  {
    href: "/help/vfx-sheets",
    title: "Generating your first VFX sheet",
    section: "VFX",
    summary:
      "EDL/XML upload, thumbnails, Excel export, and deliverable versioning.",
    keywords: "vfx sheet edl xml excel markers vendor",
    readMinutes: 6,
  },
  {
    href: "/help/shot-tracker",
    title: "Using the shot tracker",
    section: "VFX",
    summary:
      "Shot status, priorities, vendors, and tying work back to deliverables.",
    keywords: "vfx shots tracker vendor priority approved",
    readMinutes: 4,
  },
  {
    href: "/help/inviting-team",
    title: "Inviting your team",
    section: "Getting started",
    summary:
      "Magic-link invites from Settings and roles for your post team.",
    keywords: "invite team settings email role coordinator supervisor",
    readMinutes: 2,
  },
  {
    href: "/help/deliverables-overview",
    title: "Deliverables overview",
    section: "Deliverables",
    summary:
      "Matrix view, turnovers, and packages coming soon in FRAMEWRIGHT.",
    keywords: "deliverables sound turnover music cue change list",
    readMinutes: 2,
  },
];

export function searchHelpArticles(query: string): HelpArticleMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_ARTICLES;
  return HELP_ARTICLES.filter((a) => {
    const hay = `${a.title} ${a.summary} ${a.keywords} ${a.section}`.toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
  });
}
