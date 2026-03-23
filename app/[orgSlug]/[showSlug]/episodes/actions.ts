"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createEpisode(input: {
  orgSlug: string;
  showSlug: string;
  episodeNumber: string;
  title: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Not signed in." };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", input.orgSlug)
    .maybeSingle();

  if (!org) return { ok: false as const, error: "Organization not found." };

  const code = input.showSlug.toUpperCase();
  const { data: show } = await supabase
    .from("shows")
    .select("id")
    .eq("org_id", org.id)
    .eq("show_code", code)
    .maybeSingle();

  if (!show) return { ok: false as const, error: "Show not found." };

  const epNum = input.episodeNumber.trim();
  const title = input.title.trim();
  if (!epNum || !title) {
    return { ok: false as const, error: "Episode number and title are required." };
  }

  const { data: created, error } = await supabase
    .from("episodes")
    .insert({
      show_id: show.id,
      episode_number: epNum,
      title,
      status: "prep",
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false as const, error: error?.message ?? "Could not create episode." };
  }

  await supabase.from("activity_log").insert({
    org_id: org.id,
    show_id: show.id,
    episode_id: created.id,
    user_id: user.id,
    action: "episode_created",
    entity_type: "episode",
    entity_id: created.id,
    metadata: { episode_number: epNum, title },
  });

  revalidatePath(`/${input.orgSlug}/${input.showSlug}`);
  revalidatePath(`/${input.orgSlug}/${input.showSlug}/episodes`);

  return { ok: true as const, id: created.id };
}
