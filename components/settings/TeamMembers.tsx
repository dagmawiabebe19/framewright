"use client";

import { inviteMemberAction } from "@/app/[orgSlug]/[showSlug]/settings/actions";
import { useState } from "react";

const ROLES: { value: string; label: string }[] = [
  { value: "editor", label: "Editor" },
  { value: "ae", label: "Assistant editor" },
  { value: "post_coordinator", label: "Post coordinator" },
  { value: "post_supervisor", label: "Post supervisor" },
  { value: "director", label: "Director" },
  { value: "producer", label: "Producer" },
  { value: "vfx_supervisor", label: "VFX supervisor" },
  { value: "colorist", label: "Colorist" },
  { value: "sound_mixer", label: "Sound mixer" },
  { value: "music_supervisor", label: "Music supervisor" },
];

function roleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

function initials(email: string | undefined, userId: string) {
  if (email) {
    const local = email.split("@")[0] ?? "";
    const parts = local.replace(/[._-]+/g, " ").split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
  }
  return userId.replace(/-/g, "").slice(0, 2).toUpperCase();
}

export type TeamMemberRow = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
};

export function TeamMembers({
  orgSlug,
  showSlug,
  members,
  currentUserId,
}: {
  orgSlug: string;
  showSlug: string;
  members: TeamMemberRow[];
  currentUserId: string;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ae");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#f1f0f0]">Team</h2>
          <p className="mt-1 text-sm text-[#5f5e70]">
            People in this organization. Invites use the same flow as onboarding.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setInviteOpen(true);
            setInviteError(null);
          }}
          className="rounded-lg border border-[#6c63ff]/50 px-4 py-2 text-sm font-medium text-[#6c63ff]"
        >
          Invite member
        </button>
      </div>

      <ul className="mt-6 space-y-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-[#2a2a3e] bg-[#0a0a12] px-4 py-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a2e] text-xs font-semibold text-[#f1f0f0]">
              {initials(m.email ?? undefined, m.user_id)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#f1f0f0]">
                {m.email ?? `User ${m.user_id.slice(0, 8)}…`}
              </p>
              <p className="text-[11px] text-[#5f5e70]">
                Joined {new Date(m.created_at).toLocaleDateString()}
                {m.user_id === currentUserId ? " · You" : ""}
              </p>
            </div>
            <span className="rounded-full border border-[#2a2a3e] bg-[#12121e] px-2 py-0.5 text-[11px] text-[#9998b0]">
              {roleLabel(m.role)}
            </span>
          </li>
        ))}
      </ul>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-[#f1f0f0]">
              Invite member
            </h3>
            <p className="mt-1 text-xs text-[#5f5e70]">
              They will receive an email with a link to join using that address.
            </p>
            <label className="mt-4 block space-y-1">
              <span className="text-xs text-[#9998b0]">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-sm text-[#f1f0f0]"
                placeholder="name@company.com"
              />
            </label>
            <label className="mt-3 block space-y-1">
              <span className="text-xs text-[#9998b0]">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-sm text-[#f1f0f0]"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            {inviteError && (
              <p className="mt-2 text-sm text-red-300">{inviteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-lg border border-[#2a2a3e] px-4 py-2 text-sm text-[#9998b0]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={inviting}
                onClick={async () => {
                  setInviting(true);
                  setInviteError(null);
                  const res = await inviteMemberAction(
                    orgSlug,
                    showSlug,
                    email,
                    role
                  );
                  setInviting(false);
                  if (!res.ok) {
                    setInviteError(res.error);
                    return;
                  }
                  setInviteOpen(false);
                  setEmail("");
                }}
                className="rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {inviting ? "Sending…" : "Send invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
