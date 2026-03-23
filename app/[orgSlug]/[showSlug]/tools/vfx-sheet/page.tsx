import VfxSheetGenerator from "@/components/vfx/VfxSheetGenerator";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ContextualVfxSheetPage({
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
    .select("id, show_code")
    .eq("org_id", org.id)
    .eq("show_code", code)
    .maybeSingle();
  if (!show) notFound();

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, episode_number, title")
    .eq("show_id", show.id)
    .order("created_at", { ascending: true });

  const episodeOptions =
    episodes?.map((e) => ({
      id: e.id,
      episode_number: e.episode_number,
      title: e.title,
      orgId: org.id,
      showId: show.id,
      orgSlug: org.slug,
      showSlug: params.showSlug,
    })) ?? [];

  return (
    <div className="min-h-screen bg-fw-bg">
      <div className="border-b border-fw-border bg-[#12121e]/80 px-4 py-3 text-sm text-[#9998b0] md:px-8">
        <Link href="/dashboard" className="text-[#6c63ff] hover:underline">
          Dashboard
        </Link>
        <span className="mx-2 text-[#5f5e70]">/</span>
        <Link
          href={`/${org.slug}/${params.showSlug}`}
          className="text-[#6c63ff] hover:underline"
        >
          Show
        </Link>
        <span className="mx-2 text-[#5f5e70]">/</span>
        <span className="text-[#f1f0f0]">VFX Sheet Generator</span>
      </div>
      <VfxSheetGenerator
        saveContext={{
          episodes: episodeOptions,
          defaultEpisodeId: searchParams.episode,
        }}
      />
    </div>
  );
}
