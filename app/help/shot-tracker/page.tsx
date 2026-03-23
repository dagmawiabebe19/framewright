import { HelpArticle, HelpTip } from "@/components/help/HelpArticle";

export default function ShotTrackerHelpPage() {
  return (
    <HelpArticle
      title="Using the shot tracker"
      readMinutes={4}
      related={[
        { href: "/help/vfx-sheets", title: "Generating a VFX sheet" },
        { href: "/help/deliverables-overview", title: "Deliverables overview" },
      ]}
    >
      <p>
        The shot tracker lists VFX shots for the show (usually created when a
        VFX sheet deliverable is saved). Each row carries status, priority,
        vendor, and timecodes.
      </p>
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          Open <strong className="text-[#F5F0E8]">VFX → Shot tracker</strong>{" "}
          from the sidebar.
        </li>
        <li>
          Filter or scan by status (pending, in progress, delivered, approved)
          to see what still needs vendor attention.
        </li>
        <li>
          Use priority fields to bubble urgent work for picture lock and finals.
        </li>
        <li>
          Tie communication back to the episode hub: deliverables and the
          phase timeline reflect when turnovers and finals are complete.
        </li>
      </ol>
      <HelpTip>
        Generating a new VFX sheet version creates a fresh deliverable row and
        shot set for that episode — keep versions aligned with what you actually
        sent vendors.
      </HelpTip>
    </HelpArticle>
  );
}
