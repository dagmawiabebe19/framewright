import { DashboardTourBanner } from "@/components/help/DashboardTourBanner";
import { InviteClaim } from "@/components/dashboard/InviteClaim";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: memberships } = await supabase
    .from("members")
    .select("org_id")
    .eq("user_id", user.id);

  if (!memberships?.length) {
    redirect("/onboarding");
  }

  const orgIds = memberships.map((m) => m.org_id);

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .in("id", orgIds);

  const { data: shows } = await supabase
    .from("shows")
    .select("id, name, show_code, project_type, season_number, frame_rate, org_id")
    .in("org_id", orgIds);

  const orgById = new Map(orgs?.map((o) => [o.id, o]) ?? []);

  const firstShowEntry =
    shows?.find((s) => orgById.get(s.org_id)) ?? null;
  const firstOrg = firstShowEntry
    ? orgById.get(firstShowEntry.org_id)
    : undefined;
  const firstShowHref =
    firstShowEntry && firstOrg
      ? `/${firstOrg.slug}/${firstShowEntry.show_code.toLowerCase()}`
      : null;

  return (
    <div className="min-h-screen bg-[#0a0a12] px-4 py-10">
      <InviteClaim />
      <DashboardTourBanner firstShowHref={firstShowHref} />
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#6c63ff]">
              FRAMEWRIGHT
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#f1f0f0]">
              Your productions
            </h1>
            <p className="mt-1 text-sm text-[#9998b0]">
              Pick a show to open the overview. Everything lives under one URL per
              series.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/help"
              className="text-xs font-medium text-[#6c63ff] hover:underline"
            >
              Help
            </Link>
            <span className="max-w-[200px] truncate text-xs text-[#5f5e70]">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {shows?.map((s) => {
            const org = orgById.get(s.org_id);
            if (!org) return null;
            const href = `/${org.slug}/${s.show_code.toLowerCase()}`;
            return (
              <Link
                key={s.id}
                href={href}
                className="group rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-5 transition hover:border-[#6c63ff]/40"
              >
                <p className="text-xs uppercase tracking-wider text-[#5f5e70]">
                  {org.name}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-[#f1f0f0] group-hover:text-white">
                  {s.name}
                </h2>
                <p className="mt-2 text-sm text-[#9998b0]">
                  {s.project_type === "feature" ? "Feature" : "Episodic"} ·{" "}
                  {s.frame_rate} fps
                  {s.project_type === "episodic"
                    ? ` · Season ${s.season_number}`
                    : ""}
                </p>
                <p className="mt-4 font-mono text-xs text-[#6c63ff]">{href}</p>
              </Link>
            );
          })}
        </div>

        <section className="mt-12 rounded-2xl border border-dashed border-[#2a2a3e] bg-[#0f0f1a]/50 p-6">
          <h3 className="text-sm font-semibold text-[#f1f0f0]">
            Standalone VFX sheet tool
          </h3>
          <p className="mt-2 text-sm text-[#9998b0]">
            The original client-side generator (ffmpeg.wasm + Excel) stays
            available while we wire it into episode deliverables.
          </p>
          <Link
            href="/tools/vfx-sheet"
            className="mt-4 inline-block text-sm font-medium text-[#6c63ff] hover:underline"
          >
            Open VFX Sheet Generator
          </Link>
        </section>
      </div>
    </div>
  );
}
