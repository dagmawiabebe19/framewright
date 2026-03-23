import { HelpArticle, HelpTip } from "@/components/help/HelpArticle";

export default function DailiesTrackerHelpPage() {
  return (
    <HelpArticle
      title="Using the dailies tracker"
      readMinutes={5}
      related={[
        { href: "/help/cut-log", title: "Logging cut versions" },
        { href: "/help/getting-started", title: "Setting up your first show" },
      ]}
    >
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          Go to <strong className="text-[#F5F0E8]">Editorial → Dailies tracker</strong>{" "}
          in the sidebar.
        </li>
        <li>
          Use <strong className="text-[#F5F0E8]">Add roll</strong> in the
          Expected column to log rolls: name (e.g. A012), camera, card count,
          optional notes.
        </li>
        <li>
          Drag cards across the board as work progresses: Expected → Received →
          Ingested → Synced → Uploaded → Confirmed.
        </li>
        <li>
          Use <strong className="text-[#F5F0E8]">Send status email</strong> to
          draft a team update from the current board. AI writes the body from
          your roll data; you edit recipients and text, then send.
        </li>
        <li>
          If you have multiple episodes, pick the episode from the dropdown at
          the top of the tracker. Shoot day controls which day&apos;s rolls you
          are viewing.
        </li>
      </ol>
      <HelpTip>
        Add dailies (and cut / deadline) distribution lists under{" "}
        <strong className="text-[#e8e6ff]">Settings → Distribution lists</strong>{" "}
        so status email “To” defaults correctly.
      </HelpTip>
    </HelpArticle>
  );
}
