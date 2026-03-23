import { HelpArticle, HelpTip } from "@/components/help/HelpArticle";

export default function DeliverablesOverviewHelpPage() {
  return (
    <HelpArticle
      title="Deliverables overview"
      readMinutes={2}
      related={[
        { href: "/help/vfx-sheets", title: "Generating a VFX sheet" },
        { href: "/help/shot-tracker", title: "Using the shot tracker" },
      ]}
    >
      <p>
        The show overview includes a <strong className="text-[#f1f0f0]">deliverables matrix</strong>{" "}
        — rows are episodes, columns are package types (VFX sheet, sound turnover,
        color turnover, etc.).
      </p>
      <ul className="list-disc space-y-3 pl-5">
        <li>
          Dots are green when the latest version of that package is approved,
          amber when a draft or turnover is in flight, and gray when nothing
          exists yet.
        </li>
        <li>
          Version numbers come from the deliverables table so everyone sees the
          same revision.
        </li>
        <li>
          Dedicated flows for sound turnovers, music cue sheets, and change
          lists are rolling out; today you can track placeholders and manual
          packages from the hub.
        </li>
      </ul>
      <HelpTip>
        Generate a VFX sheet from the episode hub to create both the Excel file
        and the tracked deliverable in one step.
      </HelpTip>
    </HelpArticle>
  );
}
