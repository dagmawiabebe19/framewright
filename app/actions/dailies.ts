"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DailiesStatus =
  | "expected"
  | "received"
  | "ingested"
  | "synced"
  | "uploaded"
  | "confirmed";

export async function updateDailiesRollStatus(input: {
  rollId: string;
  status: DailiesStatus;
  orgSlug: string;
  showSlug: string;
  episodeId: string;
  rollName: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const { error } = await supabase
    .from("dailies_rolls")
    .update({ status: input.status })
    .eq("id", input.rollId);

  if (error) return { ok: false as const, error: error.message };

  const { data: ep } = await supabase
    .from("episodes")
    .select("show_id")
    .eq("id", input.episodeId)
    .maybeSingle();
  const { data: show } = await supabase
    .from("shows")
    .select("org_id")
    .eq("id", ep?.show_id ?? "")
    .maybeSingle();
  if (show?.org_id && ep?.show_id) {
    await supabase.from("activity_log").insert({
      org_id: show.org_id,
      show_id: ep.show_id,
      episode_id: input.episodeId,
      user_id: user.id,
      action: "dailies_roll_updated",
      entity_type: "dailies_roll",
      entity_id: input.rollId,
      metadata: {
        roll_name: input.rollName,
        status: input.status,
      },
    });
  }

  revalidatePath(`/${input.orgSlug}/${input.showSlug}/editorial/dailies`);
  return { ok: true as const };
}

export async function createDailiesRoll(input: {
  episodeId: string;
  rollName: string;
  camera: string;
  cardCount: number;
  shootDate: string;
  shootDay: number;
  notes?: string;
  orgSlug: string;
  showSlug: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const { data: created, error } = await supabase
    .from("dailies_rolls")
    .insert({
      episode_id: input.episodeId,
      roll_name: input.rollName,
      camera: input.camera,
      card_count: input.cardCount,
      shoot_date: input.shootDate,
      shoot_day: input.shootDay,
      status: "expected",
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false as const, error: error?.message ?? "Insert failed" };
  }

  const { data: ep } = await supabase
    .from("episodes")
    .select("show_id")
    .eq("id", input.episodeId)
    .maybeSingle();
  const { data: show } = await supabase
    .from("shows")
    .select("org_id")
    .eq("id", ep?.show_id ?? "")
    .maybeSingle();
  if (show?.org_id && ep?.show_id) {
    await supabase.from("activity_log").insert({
      org_id: show.org_id,
      show_id: ep.show_id,
      episode_id: input.episodeId,
      user_id: user.id,
      action: "dailies_roll_created",
      entity_type: "dailies_roll",
      entity_id: created.id,
      metadata: { roll_name: input.rollName },
    });
  }

  revalidatePath(`/${input.orgSlug}/${input.showSlug}/editorial/dailies`);
  return { ok: true as const, id: created.id };
}
