import { EpisodeHubColumns } from "@/components/episode/EpisodeHubColumns";
import type { DeliverableRow } from "@/components/episode/DeliverableCard";
import type { QuickStatsSnapshot } from "@/components/episode/QuickStats";
import type { CutVersionRow } from "@/components/episode/AddCutModal";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EpisodeHubPage({
  params,
}: {
  params: { orgSlug: string; showSlug: string; episodeId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", params.orgSlug)
    .maybeSingle();

  if (!org) notFound();

  const code = params.showSlug.toUpperCase();
  const { data: show } = await supabase
    .from("shows")
    .select("id, name, frame_rate")
    .eq("org_id", org.id)
    .eq("show_code", code)
    .maybeSingle();

  if (!show) notFound();

  const { data: episode } = await supabase
    .from("episodes")
    .select(
      "id, episode_number, title, status, picture_lock_date, delivery_date"
    )
    .eq("id", params.episodeId)
    .eq("show_id", show.id)
    .maybeSingle();

  if (!episode) notFound();

  const { data: cutsRaw } = await supabase
    .from("cut_versions")
    .select("*")
    .eq("episode_id", episode.id)
    .order("created_at", { ascending: false });

  const cuts = (cutsRaw ?? []) as CutVersionRow[];

  const { data: deliverablesRaw } = await supabase
    .from("deliverables")
    .select("*")
    .eq("episode_id", episode.id)
    .order("created_at", { ascending: false });

  const deliverables: DeliverableRow[] = (deliverablesRaw ?? []).map((d) => ({
    id: d.id,
    episode_id: d.episode_id,
    type: d.type,
    version: d.version,
    status: d.status,
    file_url: d.file_url,
    created_by: d.created_by,
    created_at: d.created_at,
    metadata:
      d.metadata && typeof d.metadata === "object"
        ? (d.metadata as Record<string, unknown>)
        : {},
  }));

  const delIds = deliverables.map((d) => d.id);
  let vfxTotal = 0;
  let vfxApproved = 0;
  let vfxPending = 0;
  if (delIds.length) {
    const { data: shots } = await supabase
      .from("vfx_shots")
      .select("status")
      .in("deliverable_id", delIds);
    const rows = shots ?? [];
    vfxTotal = rows.length;
    vfxApproved = rows.filter((s) => s.status === "approved").length;
    vfxPending = rows.filter((s) => s.status === "pending").length;
  }

  const { data: dailiesRolls } = await supabase
    .from("dailies_rolls")
    .select("id,notes,status")
    .eq("episode_id", episode.id);

  const rollsTotal = dailiesRolls?.length ?? 0;
  const rollsConfirmed =
    dailiesRolls?.filter((r) => r.status === "confirmed").length ?? 0;
  const problemRolls =
    dailiesRolls?.filter(
      (r) => r.notes && /problem|issue/i.test(String(r.notes))
    ).length ?? 0;

  const cutIds = cuts.map((c) => c.id);
  let openNotes = 0;
  let cutVersionsWithOpenNotes = 0;
  if (cutIds.length) {
    const { data: openRows } = await supabase
      .from("cut_notes")
      .select("cut_version_id")
      .in("cut_version_id", cutIds)
      .eq("status", "open");
    openNotes = openRows?.length ?? 0;
    cutVersionsWithOpenNotes = new Set(
      openRows?.map((r) => r.cut_version_id) ?? []
    ).size;
  }

  const initialStats: QuickStatsSnapshot = {
    vfxTotal,
    vfxApproved,
    vfxPending,
    rollsTotal,
    rollsConfirmed,
    rollsPending: Math.max(0, rollsTotal - rollsConfirmed),
    problemRolls,
    openNotes,
    cutVersionsWithOpenNotes,
  };

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/${org.slug}/${params.showSlug}/episodes`}
            className="text-xs text-[#6c63ff] hover:underline"
          >
            All episodes
          </Link>
          <h1 className="mt-3 font-mono text-3xl text-[#f1f0f0]">
            {episode.episode_number}{" "}
            <span className="text-[#9998b0]">— {episode.title}</span>
          </h1>
          <p className="mt-2 text-sm text-[#9998b0]">
            Status:{" "}
            <span className="font-medium text-[#f1f0f0]">{episode.status}</span>
            {episode.picture_lock_date
              ? ` · Picture lock ${episode.picture_lock_date}`
              : ""}
            {episode.delivery_date
              ? ` · Delivery ${episode.delivery_date}`
              : ""}
          </p>
        </div>
        <Link
          href={`/${org.slug}/${params.showSlug}`}
          className="text-sm text-[#6c63ff] hover:underline"
        >
          Show overview
        </Link>
      </div>

      <EpisodeHubColumns
        orgId={org.id}
        showId={show.id}
        orgSlug={org.slug}
        showSlug={params.showSlug}
        episodeId={episode.id}
        episodeStatus={episode.status}
        frameRate={show.frame_rate}
        initialCuts={cuts}
        initialDeliverables={deliverables}
        initialStats={initialStats}
        initialEpisodeDates={{
          picture_lock_date: episode.picture_lock_date,
          delivery_date: episode.delivery_date,
        }}
        currentUserId={user?.id ?? null}
      />
    </div>
  );
}
