import { HelpArticle, HelpTip } from "@/components/help/HelpArticle";

export default function EpisodeHubHelpPage() {
  return (
    <HelpArticle
      title="Understanding the episode hub"
      readMinutes={3}
      related={[
        { href: "/help/cut-log", title: "Logging cut versions" },
        { href: "/help/phase-timeline", title: "Understanding the phase timeline" },
      ]}
    >
      <p>
        The episode hub is the per-episode workspace: quick stats, phase
        timeline, cut log, dailies shortcuts, VFX counts, deliverable tabs, and
        notes.
      </p>
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          From <strong className="text-[#f1f0f0]">Episodes</strong>, click any
          episode card to open its hub.
        </li>
        <li>
          Scan <strong className="text-[#f1f0f0]">Quick stats</strong> for
          picture lock / delivery proximity and high-level counts.
        </li>
        <li>
          Use <strong className="text-[#f1f0f0]">Deliverables</strong> tabs to
          open packages, download VFX sheets, and jump to the generator with{" "}
          <code className="font-mono text-[#c4b5fd]">?episode=…</code> in the URL.
        </li>
        <li>
          The <strong className="text-[#f1f0f0]">Phase timeline</strong> shows
          which milestones are complete; VFX finals only turn green when every
          tracked shot is approved.
        </li>
      </ol>
      <HelpTip>
        Keep the hub URL handy in call sheets or Slack — it is the fastest way
        for post sup and coordinator to see the same truth.
      </HelpTip>
    </HelpArticle>
  );
}
