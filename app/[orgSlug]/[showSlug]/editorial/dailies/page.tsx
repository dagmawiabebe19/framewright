import {
  DailiesBoard,
  type DailiesRollRow,
} from "@/components/dailies/DailiesBoard";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function DailiesPage({
  params,
  searchParams,
}: {
  params: { orgSlug: string; showSlug: string };
  searchParams: { episode?: string };
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
    .select("id, name")
    .eq("org_id", org.id)
    .eq("show_code", code)
    .maybeSingle();
  if (!show) notFound();

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, episode_number, title")
    .eq("show_id", show.id)
    .order("created_at", { ascending: true });

  const epList = episodes ?? [];
  const episodeId =
    searchParams.episode && epList.some((e) => e.id === searchParams.episode)
      ? searchParams.episode
      : epList[epList.length - 1]?.id;

  if (!episodeId) {
    return (
      <div className="px-4 py-10 text-sm text-[#A09880]">
        Create an episode before tracking dailies.
      </div>
    );
  }

  const { data: maxDayRow } = await supabase
    .from("dailies_rolls")
    .select("shoot_day")
    .eq("episode_id", episodeId)
    .order("shoot_day", { ascending: false })
    .limit(1)
    .maybeSingle();

  const shootDay = maxDayRow?.shoot_day ?? 1;

  const { data: rolls } = await supabase
    .from("dailies_rolls")
    .select("*")
    .eq("episode_id", episodeId)
    .eq("shoot_day", shootDay);

  const ep = epList.find((e) => e.id === episodeId);

  return (
    <DailiesBoard
      orgSlug={org.slug}
      showSlug={params.showSlug}
      showId={show.id}
      episodeId={episodeId}
      episodeOptions={epList.map((e) => ({
        id: e.id,
        episode_number: e.episode_number,
        title: e.title,
      }))}
      episodeLabel={`${show.name} · Ep ${ep?.episode_number ?? ""}`}
      showName={show.name}
      episodeNumber={ep?.episode_number ?? ""}
      episodeTitle={ep?.title ?? `Episode ${ep?.episode_number ?? ""}`}
      initialRolls={(rolls ?? []) as DailiesRollRow[]}
      initialShootDay={shootDay}
    />
  );
}
