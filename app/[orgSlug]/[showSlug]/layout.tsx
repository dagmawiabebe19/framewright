import { AiShowBootstrap } from "@/components/ai/AiShowBootstrap";
import { ShowSidebar } from "@/components/layout/ShowSidebar";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function ShowLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string; showSlug: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", params.orgSlug)
    .maybeSingle();

  if (!org) {
    notFound();
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    notFound();
  }

  const code = params.showSlug.toUpperCase();
  const { data: show } = await supabase
    .from("shows")
    .select("id, name, show_code, frame_rate, project_type")
    .eq("org_id", org.id)
    .eq("show_code", code)
    .maybeSingle();

  if (!show) {
    notFound();
  }

  const { data: siblingShows } = await supabase
    .from("shows")
    .select("id, name, show_code")
    .eq("org_id", org.id);

  const showsForSelect =
    siblingShows?.map((s) => ({
      id: s.id,
      name: s.name,
      show_code: s.show_code,
      org_slug: org.slug,
    })) ?? [];

  return (
    <div className="flex min-h-screen bg-[#080808]">
      <ShowSidebar
        orgSlug={org.slug}
        showSlug={params.showSlug}
        showName={show.name}
        shows={showsForSelect}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AiShowBootstrap
          showId={show.id}
          showName={show.name}
          orgSlug={org.slug}
          showSlug={params.showSlug}
        />
        {children}
      </div>
    </div>
  );
}
