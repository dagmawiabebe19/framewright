import { HelpArticle, HelpTip } from "@/components/help/HelpArticle";

export default function GettingStartedHelpPage() {
  return (
    <HelpArticle
      title="Setting up your first show"
      readMinutes={4}
      related={[
        { href: "/help/inviting-team", title: "Inviting your team" },
        { href: "/help/episode-hub", title: "Understanding the episode hub" },
      ]}
    >
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          After signing in, you&apos;ll create your organization — your studio
          or production company name. This is the workspace everyone joins.
        </li>
        <li>
          Create your first show: name, Feature Film or Episodic TV, and frame
          rate. A short show code (four characters) is used in filenames and
          shot IDs.
        </li>
        <li>
          Your first episode is created during onboarding. Add more from{" "}
          <strong className="text-[#f1f0f0]">Episodes</strong> in the sidebar.
        </li>
        <li>
          Invite collaborators from{" "}
          <strong className="text-[#f1f0f0]">Settings → Team</strong>. They get
          a magic link by email.
        </li>
        <li>
          Set picture lock and delivery targets per episode in{" "}
          <strong className="text-[#f1f0f0]">Settings → Show info</strong>, or
          from the episode hub quick stats when that control is available.
        </li>
      </ol>
      <HelpTip>
        The show code is used for shot naming. For a project nicknamed “The
        Bear”, you might use <code className="font-mono text-[#c4b5fd]">bear</code>{" "}
        so standard IDs stay consistent across vendors.
      </HelpTip>
    </HelpArticle>
  );
}
