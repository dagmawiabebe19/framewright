import { HelpArticle, HelpTip } from "@/components/help/HelpArticle";

export default function PhaseTimelineHelpPage() {
  return (
    <HelpArticle
      title="Understanding the phase timeline"
      readMinutes={3}
      related={[
        { href: "/help/cut-log", title: "Logging cut versions" },
        { href: "/help/episode-hub", title: "Understanding the episode hub" },
      ]}
    >
      <p>
        The phase timeline on the episode hub mirrors a typical scripted post
        path: cuts, picture lock, color &amp; sound turnovers, VFX finals, and
        delivery.
      </p>
      <ul className="list-disc space-y-3 pl-5">
        <li>
          <strong className="text-[#f1f0f0]">Cut phases</strong> advance when you
          log the matching cut type in the cut log.
        </li>
        <li>
          <strong className="text-[#f1f0f0]">Color / Sound</strong> look for
          approved color and sound turnover deliverables.
        </li>
        <li>
          <strong className="text-[#f1f0f0]">VFX finals</strong> completes only
          when there is at least one VFX shot and every shot is approved — if
          there are zero shots, the phase stays upcoming until you add work.
        </li>
        <li>
          <strong className="text-[#f1f0f0]">Delivery</strong> follows the
          episode status when the room marks delivered.
        </li>
      </ul>
      <HelpTip>
        Click any phase dot to see context — latest cut name, turnover status, or
        approved shot counts.
      </HelpTip>
    </HelpArticle>
  );
}
