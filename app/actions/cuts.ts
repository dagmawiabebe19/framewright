"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function logCutVersion(input: {
  orgId: string;
  showId: string;
  episodeId: string;
  orgSlug: string;
  showSlug: string;
  cutType: string;
  versionName: string;
  durationTc: string | null;
  notes: string | null;
  fileUrl: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const { data: row, error } = await supabase
    .from("cut_versions")
    .insert({
      episode_id: input.episodeId,
      version_name: input.versionName,
      cut_type: input.cutType,
      duration_tc: input.durationTc,
      notes: input.notes,
      file_url: input.fileUrl,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false as const, error: error?.message ?? "Insert failed" };
  }

  await supabase.from("activity_log").insert({
    org_id: input.orgId,
    show_id: input.showId,
    episode_id: input.episodeId,
    user_id: user.id,
    action: "cut_version_logged",
    entity_type: "cut_version",
    entity_id: row.id,
    metadata: {
      cutType: input.cutType,
      versionName: input.versionName,
      cut_name: input.versionName,
      duration: input.durationTc,
      episodeId: input.episodeId,
    },
  });

  revalidatePath(
    `/${input.orgSlug}/${input.showSlug}/episodes/${input.episodeId}`
  );
  revalidatePath(`/${input.orgSlug}/${input.showSlug}`);

  return { ok: true as const, id: row.id };
}

export async function updateEpisodeDates(input: {
  episodeId: string;
  showId: string;
  orgSlug: string;
  showSlug: string;
  pictureLockDate: string | null;
  deliveryDate: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const { error } = await supabase
    .from("episodes")
    .update({
      picture_lock_date: input.pictureLockDate,
      delivery_date: input.deliveryDate,
    })
    .eq("id", input.episodeId)
    .eq("show_id", input.showId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(
    `/${input.orgSlug}/${input.showSlug}/episodes/${input.episodeId}`
  );
  revalidatePath(`/${input.orgSlug}/${input.showSlug}`);

  return { ok: true as const };
}
