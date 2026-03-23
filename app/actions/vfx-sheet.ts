"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FinalizeShotPayload = {
  shot_id: string;
  standard_id: string;
  scene: string | null;
  reel: string;
  tc_in: string;
  tc_out: string;
  src_tc_in: string;
  src_tc_out: string;
  frames: number;
  handles: number;
  description: string | null;
  thumbnail_storage_path: string | null;
};

export async function getNextVfxSheetVersion(episodeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const { data: row } = await supabase
    .from("deliverables")
    .select("version")
    .eq("episode_id", episodeId)
    .eq("type", "vfx_sheet")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const next = (row?.version ?? 0) + 1;
  return { ok: true as const, version: next };
}

export async function finalizeVfxSheetDeliverable(input: {
  orgId: string;
  showId: string;
  episodeId: string;
  orgSlug: string;
  showSlug: string;
  xlsxStoragePath: string;
  shots: FinalizeShotPayload[];
  sheetMeta: {
    shotCount: number;
    showName: string;
    episodeNumber: string;
    cutVersion: string;
    generatedAt: string;
  };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const { data: ep } = await supabase
    .from("episodes")
    .select("id, show_id")
    .eq("id", input.episodeId)
    .eq("show_id", input.showId)
    .maybeSingle();

  if (!ep) {
    return { ok: false as const, error: "Episode not found." };
  }

  const { data: showRow } = await supabase
    .from("shows")
    .select("org_id")
    .eq("id", input.showId)
    .maybeSingle();

  if (!showRow || showRow.org_id !== input.orgId) {
    return { ok: false as const, error: "Show not found." };
  }

  const { data: verRow } = await supabase
    .from("deliverables")
    .select("version")
    .eq("episode_id", input.episodeId)
    .eq("type", "vfx_sheet")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (verRow?.version ?? 0) + 1;

  const { data: signed } = await supabase.storage
    .from("deliverables")
    .createSignedUrl(input.xlsxStoragePath, 60 * 60);

  const { data: del, error: delErr } = await supabase
    .from("deliverables")
    .insert({
      episode_id: input.episodeId,
      type: "vfx_sheet",
      version,
      status: "draft",
      file_url: signed?.signedUrl ?? null,
      created_by: user.id,
      metadata: {
        ...input.sheetMeta,
        storage_path: input.xlsxStoragePath,
      },
    })
    .select("id")
    .single();

  if (delErr || !del) {
    return { ok: false as const, error: delErr?.message ?? "Could not save deliverable." };
  }

  const shotRows = input.shots.map((s) => ({
    deliverable_id: del.id,
    shot_id: s.shot_id,
    standard_id: s.standard_id,
    scene: s.scene,
    reel: s.reel,
    tc_in: s.tc_in,
    tc_out: s.tc_out,
    src_tc_in: s.src_tc_in,
    src_tc_out: s.src_tc_out,
    frames: s.frames,
    handles: s.handles,
    description: s.description,
    priority: null,
    status: "pending",
    thumbnail_url: s.thumbnail_storage_path,
    vendor: null,
    notes: null,
  }));

  const { error: shotErr } = await supabase.from("vfx_shots").insert(shotRows);
  if (shotErr) {
    return { ok: false as const, error: shotErr.message };
  }

  await supabase.from("activity_log").insert({
    org_id: input.orgId,
    show_id: input.showId,
    episode_id: input.episodeId,
    user_id: user.id,
    action: "vfx_sheet_generated",
    entity_type: "deliverable",
    entity_id: del.id,
    metadata: {
      version,
      shotCount: input.sheetMeta.shotCount,
      episodeId: input.episodeId,
    },
  });

  revalidatePath(`/${input.orgSlug}/${input.showSlug}`);
  revalidatePath(`/${input.orgSlug}/${input.showSlug}/episodes/${input.episodeId}`);
  revalidatePath(`/${input.orgSlug}/${input.showSlug}/vfx/shots`);

  return {
    ok: true as const,
    deliverableId: del.id,
    version,
    signedUrl: signed?.signedUrl ?? null,
  };
}

export async function getDeliverableSignedUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("deliverables")
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return { ok: false as const, error: error?.message };
  return { ok: true as const, url: data.signedUrl };
}

export async function getThumbnailSignedUrl(path: string | null) {
  if (!path) return { ok: true as const, url: null as string | null };
  return getDeliverableSignedUrl(path);
}
