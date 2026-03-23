import { HelpArticle, HelpTip } from "@/components/help/HelpArticle";

export default function InvitingTeamHelpPage() {
  return (
    <HelpArticle
      title="Inviting your team"
      readMinutes={2}
      related={[
        { href: "/help/getting-started", title: "Setting up your first show" },
      ]}
    >
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          Open any show, then go to{" "}
          <strong className="text-[#F5F0E8]">Settings → Team</strong>.
        </li>
        <li>
          Click <strong className="text-[#F5F0E8]">Invite member</strong>, enter
          their email, and choose a role (AE, post coordinator, post supervisor,
          etc.).
        </li>
        <li>
          FRAMEWRIGHT emails a magic link. They must sign in with the same email
          address to accept.
        </li>
      </ol>
      <HelpTip>
        Invites are stored in the <code className="font-mono text-[#c4b5fd]">invitations</code>{" "}
        table and follow the same flow as onboarding invites.
      </HelpTip>
    </HelpArticle>
  );
}
