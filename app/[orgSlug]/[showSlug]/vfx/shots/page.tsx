import { ShotTracker, type ShotRow } from "@/components/vfx/ShotTracker";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function VfxShotsPage({
  params,
  searchParams,
}: {
  params: { orgSlug: string; showSlug: string };
  searchParams: { deliverable?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug")
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
    .select("id, name, frame_rate")
    .eq("org_id", org.id)
    .eq("show_code", code)
    .maybeSingle();
  if (!show) notFound();

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, episode_number")
    .eq("show_id", show.id);

  const epIds = episodes?.map((e) => e.id) ?? [];
  const epMap = new Map(episodes?.map((e) => [e.id, e.episode_number]));

  const { data: deliverables } = epIds.length
    ? await supabase
        .from("deliverables")
        .select("id, episode_id")
        .in("episode_id", epIds)
    : { data: [] as { id: string; episode_id: string }[] };

  const delIds = deliverables?.map((d) => d.id) ?? [];
  const delToEp = new Map(
    deliverables?.map((d) => [d.id, d.episode_id]) ?? []
  );

  const { data: shotRows } = delIds.length
    ? await supabase.from("vfx_shots").select("*").in("deliverable_id", delIds)
    : { data: [] };

  const rows: ShotRow[] =
    shotRows?.map((s) => ({
      ...(s as ShotRow),
      deliverable_id: s.deliverable_id,
      episode_id: delToEp.get(s.deliverable_id) ?? "",
      episode_number: epMap.get(delToEp.get(s.deliverable_id) ?? "") ?? "",
    })) ?? [];

  return (
    <ShotTracker
      showId={show.id}
      showName={show.name}
      frameRate={show.frame_rate}
      metaDefaults={{
        showName: show.name,
        projectType: "episodic",
        seasonNumber: 1,
      }}
      initialShots={rows}
      deliverableIds={delIds}
      initialDeliverableId={searchParams.deliverable ?? null}
    />
  );
}
