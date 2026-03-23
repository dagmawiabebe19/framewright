import type { DistributionListsState } from "@/app/[orgSlug]/[showSlug]/settings/actions";
import { DistributionLists } from "@/components/settings/DistributionLists";
import {
  ShowInfoSection,
  type EpisodeDateRow,
} from "@/components/settings/ShowInfoSection";
import {
  TeamMembers,
  type TeamMemberRow,
} from "@/components/settings/TeamMembers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function SettingsPage({
  params,
}: {
  params: { orgSlug: string; showSlug: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", params.orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) notFound();

  const code = params.showSlug.toUpperCase();
  const { data: show } = await supabase
    .from("shows")
    .select("id, name, frame_rate, distribution_lists")
    .eq("org_id", org.id)
    .eq("show_code", code)
    .maybeSingle();
  if (!show) notFound();

  const rawDist = show.distribution_lists as {
    dailies?: unknown;
    cuts?: unknown;
    deadlines?: unknown;
  } | null;

  const distInitial: DistributionListsState = {
    dailies: Array.isArray(rawDist?.dailies)
      ? (rawDist.dailies as string[])
      : [],
    cuts: Array.isArray(rawDist?.cuts) ? (rawDist.cuts as string[]) : [],
    deadlines: Array.isArray(rawDist?.deadlines)
      ? (rawDist.deadlines as string[])
      : [],
  };

  const { data: episodeRows } = await supabase
    .from("episodes")
    .select("id, episode_number, title, picture_lock_date, delivery_date")
    .eq("show_id", show.id)
    .order("created_at", { ascending: true });

  const episodes: EpisodeDateRow[] = (episodeRows ?? []).map((e) => ({
    id: e.id,
    episode_number: e.episode_number,
    title: e.title,
    picture_lock_date: e.picture_lock_date,
    delivery_date: e.delivery_date,
  }));

  const { data: memberRows } = await supabase
    .from("members")
    .select("id, user_id, role, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: true });

  const emails: Record<string, string> = {};
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      for (const m of memberRows ?? []) {
        const { data, error } = await admin.auth.admin.getUserById(m.user_id);
        if (!error && data.user?.email) {
          emails[m.user_id] = data.user.email;
        }
      }
    } catch {
      // Service role missing or invalid — list members without emails
    }
  }

  const team: TeamMemberRow[] = (memberRows ?? []).map((m) => ({
    ...m,
    email: emails[m.user_id] ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-[#5a5040]">
          {show.name}
        </p>
        <h1 className="text-2xl font-semibold text-[#F5F0E8]">Settings</h1>
      </header>

      <ShowInfoSection
        orgSlug={params.orgSlug}
        showSlug={params.showSlug}
        initialName={show.name}
        initialFrameRate={show.frame_rate}
        episodes={episodes}
      />

      <DistributionLists
        orgSlug={params.orgSlug}
        showSlug={params.showSlug}
        initial={distInitial}
      />

      <TeamMembers
        orgSlug={params.orgSlug}
        showSlug={params.showSlug}
        members={team}
        currentUserId={user.id}
      />
    </div>
  );
}
