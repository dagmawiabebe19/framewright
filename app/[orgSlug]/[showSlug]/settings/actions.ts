"use server";

import { sendInviteEmail } from "@/lib/email/sendInviteEmail";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

export type DistributionListsState = {
  dailies: string[];
  cuts: string[];
  deadlines: string[];
};

export type NotificationPrefsState = {
  digest: boolean;
  deadlines: boolean;
  vfx_updates: boolean;
  cut_versions: boolean;
};

const MEMBER_ROLES = [
  "editor",
  "ae",
  "post_coordinator",
  "post_supervisor",
  "director",
  "producer",
  "vfx_supervisor",
  "colorist",
  "sound_mixer",
  "music_supervisor",
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

function isMemberRole(r: string): r is MemberRole {
  return (MEMBER_ROLES as readonly string[]).includes(r);
}

async function requireShowContext(orgSlug: string, showSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) return { ok: false as const, error: "Not found" };

  const { data: member } = await supabase
    .from("members")
    .select("id, role")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { ok: false as const, error: "Not found" };

  const code = showSlug.toUpperCase();
  const { data: show } = await supabase
    .from("shows")
    .select("id")
    .eq("org_id", org.id)
    .eq("show_code", code)
    .maybeSingle();
  if (!show) return { ok: false as const, error: "Show not found" };

  return {
    ok: true as const,
    supabase,
    user,
    org,
    member,
    show,
  };
}

/**
 * Persists to `shows.distribution_lists` (jsonb). Column is added by
 * `supabase/migrations/20250323000000_phase3.sql` or
 * `20250326000000_ensure_shows_distribution_lists.sql` — run `supabase db push`
 * if updates fail with an undefined-column error.
 */
export async function updateDistributionListsAction(
  orgSlug: string,
  showSlug: string,
  lists: DistributionListsState
) {
  const ctx = await requireShowContext(orgSlug, showSlug);
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("shows")
    .update({
      distribution_lists: {
        dailies: lists.dailies.map((e) => e.trim().toLowerCase()).filter(Boolean),
        cuts: lists.cuts.map((e) => e.trim().toLowerCase()).filter(Boolean),
        deadlines: lists.deadlines.map((e) => e.trim().toLowerCase()).filter(Boolean),
      },
    })
    .eq("id", ctx.show.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/${orgSlug}/${showSlug}/settings`);
  revalidatePath(`/${orgSlug}/${showSlug}`);
  return { ok: true as const };
}

export async function updateShowBasicsAction(
  orgSlug: string,
  showSlug: string,
  payload: { name: string; frame_rate: string }
) {
  const ctx = await requireShowContext(orgSlug, showSlug);
  if (!ctx.ok) return ctx;

  const name = payload.name.trim();
  if (!name) {
    return { ok: false as const, error: "Show name is required" };
  }
  const frame_rate = payload.frame_rate.trim() || "23.976";

  const { error } = await ctx.supabase
    .from("shows")
    .update({ name, frame_rate })
    .eq("id", ctx.show.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/${orgSlug}/${showSlug}/settings`);
  revalidatePath(`/${orgSlug}/${showSlug}`);
  return { ok: true as const };
}

export async function updateEpisodeDatesAction(
  orgSlug: string,
  showSlug: string,
  episodeId: string,
  payload: { picture_lock_date: string | null; delivery_date: string | null }
) {
  const ctx = await requireShowContext(orgSlug, showSlug);
  if (!ctx.ok) return ctx;

  const { data: ep } = await ctx.supabase
    .from("episodes")
    .select("id")
    .eq("id", episodeId)
    .eq("show_id", ctx.show.id)
    .maybeSingle();
  if (!ep) {
    return { ok: false as const, error: "Episode not found" };
  }

  const picture_lock_date = payload.picture_lock_date?.trim() || null;
  const delivery_date = payload.delivery_date?.trim() || null;

  const { error } = await ctx.supabase
    .from("episodes")
    .update({
      picture_lock_date,
      delivery_date,
    })
    .eq("id", episodeId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/${orgSlug}/${showSlug}/settings`);
  revalidatePath(`/${orgSlug}/${showSlug}`);
  return { ok: true as const };
}

export async function updateNotificationPrefsAction(
  orgSlug: string,
  showSlug: string,
  prefs: NotificationPrefsState
) {
  const ctx = await requireShowContext(orgSlug, showSlug);
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("members")
    .update({ notification_prefs: prefs })
    .eq("id", ctx.member.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/${orgSlug}/${showSlug}/settings`);
  return { ok: true as const };
}

export async function inviteMemberAction(
  orgSlug: string,
  showSlug: string,
  email: string,
  role: string
) {
  const ctx = await requireShowContext(orgSlug, showSlug);
  if (!ctx.ok) return ctx;

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false as const, error: "Invalid email" };
  }
  if (!isMemberRole(role)) {
    return { ok: false as const, error: "Invalid role" };
  }

  const token = randomBytes(32).toString("hex");
  const { error: invErr } = await ctx.supabase.from("invitations").insert({
    org_id: ctx.org.id,
    email: trimmed,
    role,
    token,
    created_by: ctx.user.id,
  });
  if (invErr) {
    return { ok: false as const, error: invErr.message };
  }

  const sent = await sendInviteEmail({
    to: trimmed,
    orgName: ctx.org.name,
    inviteToken: token,
    role,
  });
  if (!sent.ok) {
    return { ok: false as const, error: sent.error ?? "Email failed" };
  }

  revalidatePath(`/${orgSlug}/${showSlug}/settings`);
  return { ok: true as const };
}
