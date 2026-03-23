import { ShowOverviewHeader } from "@/components/layout/ShowOverviewHeader";
import { ShowOverviewBody } from "@/components/overview/ShowOverviewBody";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function ShowOverviewPage({
  params,
}: {
  params: { orgSlug: string; showSlug: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", params.orgSlug)
    .maybeSingle();

  if (!org) notFound();

  const code = params.showSlug.toUpperCase();
  const { data: show } = await supabase
    .from("shows")
    .select("id, name, show_code, frame_rate, project_type")
    .eq("org_id", org.id)
    .eq("show_code", code)
    .maybeSingle();

  if (!show) notFound();

  const { data: episodes } = await supabase
    .from("episodes")
    .select(
      "id, episode_number, title, status, picture_lock_date, delivery_date"
    )
    .eq("show_id", show.id)
    .order("created_at", { ascending: true });

  const episodeList = episodes ?? [];
  const episodeIds = episodeList.map((e) => e.id);

  const { data: deliverables } = episodeIds.length
    ? await supabase
        .from("deliverables")
        .select("episode_id, type, status, version")
        .in("episode_id", episodeIds)
    : { data: [] as { episode_id: string; type: string; status: string; version: number }[] };

  let { data: feed } = await supabase
    .from("activity_log")
    .select("id, action, created_at, metadata, user_id")
    .eq("org_id", org.id)
    .eq("show_id", show.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!feed?.length) {
    const { data: orgFeed } = await supabase
      .from("activity_log")
      .select("id, action, created_at, metadata, user_id")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(50);
    feed = orgFeed ?? [];
  }

  const feedRows =
    feed?.map((r) => ({
      ...r,
      metadata: (r.metadata ?? null) as Record<string, unknown> | null,
    })) ?? [];

  return (
    <>
      <ShowOverviewHeader
        showName={show.name}
        orgSlug={org.slug}
        showSlug={params.showSlug}
        episodes={episodeList.map((e) => ({
          id: e.id,
          episode_number: e.episode_number,
          title: e.title,
        }))}
        userEmail={user.email}
      />

      <ShowOverviewBody
        orgSlug={org.slug}
        showSlug={params.showSlug}
        showId={show.id}
        orgId={org.id}
        initialEpisodes={episodeList}
        initialDeliverables={deliverables ?? []}
        initialFeed={feedRows}
      />
    </>
  );
}
