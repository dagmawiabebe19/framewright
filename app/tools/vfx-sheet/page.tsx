import VfxSheetGenerator from "@/components/vfx/VfxSheetGenerator";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function StandaloneVfxSheetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-fw-bg px-4 py-16 text-center">
        <p className="text-lg text-[#F5F0E8]">Select a show first</p>
        <p className="mt-2 text-sm text-[#A09880]">
          Sign in to save VFX sheets to a production workspace.
        </p>
        <Link
          href="/auth"
          className="mt-6 inline-block rounded-lg bg-[#D4A853] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
        <p className="mt-8 text-sm text-[#5a5040]">
          <Link href="/dashboard" className="text-[#D4A853] hover:underline">
            Dashboard
          </Link>
        </p>
      </div>
    );
  }

  const { data: members } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id);
  const orgIds = members?.map((m) => m.org_id) ?? [];

  if (!orgIds.length) {
    return (
      <div className="min-h-screen bg-fw-bg px-4 py-16 text-center">
        <p className="text-lg text-[#F5F0E8]">No workspace yet</p>
        <p className="mt-2 text-sm text-[#A09880]">
          Complete onboarding to attach a show.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-block text-[#D4A853] hover:underline"
        >
          Go to onboarding
        </Link>
      </div>
    );
  }

  const { data: shows } = await supabase
    .from("shows")
    .select("id, show_code, org_id")
    .in("org_id", orgIds);

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, slug")
    .in("id", orgIds);

  const orgSlug = new Map(orgs?.map((o) => [o.id, o.slug]));

  const showIds = shows?.map((s) => s.id) ?? [];
  const { data: episodes } =
    showIds.length > 0
      ? await supabase
          .from("episodes")
          .select("id, episode_number, title, show_id")
          .in("show_id", showIds)
      : { data: [] as { id: string; episode_number: string; title: string; show_id: string }[] };

  const typed =
    episodes
      ?.map((ep) => {
        const show = shows?.find((s) => s.id === ep.show_id);
        if (!show) return null;
        const slug = orgSlug.get(show.org_id);
        if (!slug) return null;
        return {
          id: ep.id,
          episode_number: ep.episode_number,
          title: ep.title,
          orgId: show.org_id,
          showId: show.id,
          orgSlug: slug,
          showSlug: show.show_code.toLowerCase(),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null) ?? [];

  return (
    <div className="min-h-screen bg-fw-bg">
      <div className="border-b border-fw-border bg-[#0f0f0f]/80 px-4 py-3 text-sm text-[#A09880] md:px-8">
        <Link href="/dashboard" className="text-[#D4A853] hover:underline">
          Dashboard
        </Link>
        <span className="mx-2 text-[#5a5040]">/</span>
        <span className="text-[#F5F0E8]">VFX Sheet Generator</span>
      </div>
      <VfxSheetGenerator
        saveContext={{ episodes: typed }}
      />
    </div>
  );
}
