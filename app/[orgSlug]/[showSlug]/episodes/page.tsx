import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateEpisodeForm } from "./ui";

export default async function EpisodesIndexPage({
  params,
}: {
  params: { orgSlug: string; showSlug: string };
}) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", params.orgSlug)
    .maybeSingle();

  if (!org) notFound();

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
    .select("id, episode_number, title, status")
    .eq("show_id", show.id)
    .order("created_at", { ascending: true });

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#5a5040]">
            Production
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#F5F0E8]">Episodes</h1>
          <p className="mt-2 text-sm text-[#A09880]">
            {show.name} — add editorial episodes as they come online.
          </p>
        </div>
        <Link
          href={`/${org.slug}/${params.showSlug}`}
          className="text-sm text-[#D4A853] hover:underline"
        >
          Back to overview
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {(episodes ?? []).map((ep) => (
            <Link
              key={ep.id}
              href={`/${org.slug}/${params.showSlug}/episodes/${ep.id}`}
              className="flex items-center justify-between rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4 transition hover:border-[#D4A853]/35"
            >
              <div>
                <p className="font-mono text-sm text-[#F5F0E8]">
                  {ep.episode_number}
                </p>
                <p className="text-sm text-[#A09880]">{ep.title}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-[#5a5040]">
                {ep.status}
              </span>
            </Link>
          ))}
          {(episodes ?? []).length === 0 && (
            <p className="text-sm text-[#A09880]">
              No episodes yet — create the first card on the right.
            </p>
          )}
        </div>

        <CreateEpisodeForm orgSlug={org.slug} showSlug={params.showSlug} />
      </div>

      <div className="mt-12">
        <SectionPlaceholder
          title="Episode scheduling hooks"
          description="Picture lock, delivery, and phase tagging will connect to the timeline view and AI alerts — the fields already exist on each episode row."
        />
      </div>
    </div>
  );
}
