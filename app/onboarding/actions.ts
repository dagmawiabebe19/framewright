"use server";

import { sendInviteEmail } from "@/lib/email/sendInviteEmail";
import { createClient } from "@/lib/supabase/server";
import { showCodeFromName, slugify, uniqueSlugAttempt } from "@/lib/slug";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

export type InviteRow = { email: string; role: string };

export type OnboardingInput = {
  orgName: string;
  memberRole: string;
  showName: string;
  projectType: "feature" | "episodic";
  seasonNumber: number;
  totalEpisodes: number | null;
  frameRate: string;
  invites: InviteRow[];
  skipInvites: boolean;
};

async function ensureUniqueOrgSlug(supabase: Awaited<ReturnType<typeof createClient>>, baseName: string) {
  const root = slugify(baseName);
  for (let i = 0; i < 8; i++) {
    const slug = uniqueSlugAttempt(root, i === 0 ? "" : randomBytes(2).toString("hex"));
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  return `${root}-${randomBytes(4).toString("hex")}`;
}

async function ensureUniqueShowCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  showName: string
) {
  const base = showCodeFromName(showName);
  for (let i = 0; i < 8; i++) {
    const tryCode =
      i === 0
        ? base
        : `${base.slice(0, 2)}${randomBytes(1).toString("hex").toUpperCase().slice(0, 2)}`;
    const { data } = await supabase
      .from("shows")
      .select("id")
      .eq("org_id", orgId)
      .eq("show_code", tryCode)
      .maybeSingle();
    if (!data) return tryCode;
  }
  return `${base.slice(0, 2)}${randomBytes(2).toString("hex").toUpperCase().slice(0, 2)}`;
}

export async function completeOnboarding(input: OnboardingInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { ok: false as const, error: "Not signed in." };
  }

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { ok: false as const, error: "You already belong to an organization." };
  }

  const orgSlug = await ensureUniqueOrgSlug(supabase, input.orgName.trim());

  const { data: orgId, error: rpcError } = await supabase.rpc(
    "create_organization_with_membership",
    {
      org_name: input.orgName.trim(),
      org_slug: orgSlug,
      member_role: input.memberRole,
    }
  );

  if (rpcError || !orgId) {
    return { ok: false as const, error: rpcError?.message ?? "Could not create organization." };
  }

  const showCode = await ensureUniqueShowCode(supabase, orgId, input.showName.trim());

  const { data: showRow, error: showError } = await supabase
    .from("shows")
    .insert({
      org_id: orgId,
      name: input.showName.trim(),
      show_code: showCode,
      project_type: input.projectType,
      season_number: Math.max(1, input.seasonNumber),
      total_episodes:
        input.projectType === "episodic"
          ? Math.max(1, input.totalEpisodes ?? 1)
          : null,
      frame_rate: input.frameRate || "23.976",
    })
    .select("id")
    .single();

  if (showError || !showRow) {
    return { ok: false as const, error: showError?.message ?? "Could not create show." };
  }

  const season = Math.max(1, input.seasonNumber);
  const episodeNumber =
    input.projectType === "feature"
      ? "main"
      : String(season * 100 + 1);
  const episodeTitle =
    input.projectType === "feature"
      ? "Main Picture"
      : `Episode ${episodeNumber}`;

  const { data: epRow, error: epError } = await supabase
    .from("episodes")
    .insert({
      show_id: showRow.id,
      episode_number: episodeNumber,
      title: episodeTitle,
      status: "prep",
    })
    .select("id")
    .single();

  if (epError || !epRow) {
    return { ok: false as const, error: epError?.message ?? "Could not create episode." };
  }

  await supabase.from("activity_log").insert({
    org_id: orgId,
    show_id: showRow.id,
    episode_id: epRow.id,
    user_id: user.id,
    action: "onboarding_completed",
    entity_type: "organization",
    entity_id: orgId,
    metadata: {
      show: input.showName.trim(),
      project_type: input.projectType,
    },
  });

  const inviteResults: { email: string; sent: boolean }[] = [];

  if (!input.skipInvites && input.invites.length > 0) {
    for (const inv of input.invites) {
      const email = inv.email.trim().toLowerCase();
      if (!email) continue;
      const token = randomBytes(32).toString("hex");
      const { error: invErr } = await supabase.from("invitations").insert({
        org_id: orgId,
        email,
        role: inv.role,
        token,
        created_by: user.id,
      });
      if (invErr) {
        inviteResults.push({ email, sent: false });
        continue;
      }

      const sent = await sendInviteEmail({
        to: email,
        orgName: input.orgName.trim(),
        inviteToken: token,
        role: inv.role,
      });
      inviteResults.push({ email, sent: sent.ok });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/${orgSlug}/${showCode.toLowerCase()}`);

  return {
    ok: true as const,
    orgSlug,
    showCode: showCode.toLowerCase(),
    inviteResults,
  };
}
