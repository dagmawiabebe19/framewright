import type { createClient } from "@/lib/supabase/server";
import {
  derivePhaseCompletion,
  firstIncompleteIndex,
  PHASE_ORDER,
  type DeliverableLite,
} from "@/lib/episode-phases";
import { differenceInCalendarDays } from "date-fns";

type SB = Awaited<ReturnType<typeof createClient>>;

export type AiRouteContext = "dashboard" | "episode" | "dailies" | "vfx" | "general";

export async function buildShowContextBlock(
  supabase: SB,
  opts: {
    showId: string;
    episodeId?: string | null;
    context: AiRouteContext;
  }
): Promise<string> {
  const { showId, episodeId, context } = opts;

  const { data: show } = await supabase
    .from("shows")
    .select("id, name, show_code, frame_rate, project_type, org_id")
    .eq("id", showId)
    .maybeSingle();

  if (!show) return "ERROR: Show not found or access denied.";

  const { data: episodes } = await supabase
    .from("episodes")
    .select(
      "id, episode_number, title, status, picture_lock_date, delivery_date"
    )
    .eq("show_id", showId)
    .order("episode_number", { ascending: true });

  const epList = episodes ?? [];

  const { data: activity } = await supabase
    .from("activity_log")
    .select("action, metadata, created_at, episode_id")
    .eq("show_id", showId)
    .order("created_at", { ascending: false })
    .limit(30);

  const now = new Date();
  const lines: string[] = [];

  lines.push("SHOW OVERVIEW:");
  lines.push(
    `${show.name} (${show.show_code}), ${show.project_type}, ${show.frame_rate} fps`
  );
  lines.push(`${epList.length} episode(s) total`);
  lines.push("");

  lines.push("EPISODE STATUS SUMMARY:");
  for (const e of epList) {
    const lock = e.picture_lock_date
      ? e.picture_lock_date
      : "not set";
    const del = e.delivery_date ? e.delivery_date : "not set";
    lines.push(
      `Ep ${e.episode_number} "${e.title}": ${e.status} — Picture lock: ${lock} — Delivery: ${del}`
    );
    if (e.picture_lock_date) {
      const d = new Date(e.picture_lock_date + "T12:00:00");
      const days = differenceInCalendarDays(d, now);
      if (days >= 0 && days <= 14) {
        lines.push(`  ⚠ Picture lock in ${days} day(s)`);
      }
    }
  }
  lines.push("");

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const recent = (activity ?? []).filter((a) => a.created_at >= dayAgo);
  lines.push("RECENT ACTIVITY (last 24 hours):");
  if (!recent.length) lines.push("(none)");
  else {
    for (const a of recent.slice(0, 20)) {
      const meta = (a.metadata ?? {}) as Record<string, unknown>;
      lines.push(
        `- ${a.action} ${JSON.stringify(meta).slice(0, 120)} @ ${a.created_at}`
      );
    }
  }
  lines.push("");

  const ep =
    episodeId && epList.some((e) => e.id === episodeId)
      ? epList.find((e) => e.id === episodeId)!
      : null;

  if (ep) {
    const { data: cuts } = await supabase
      .from("cut_versions")
      .select("id, version_name, cut_type, duration_tc, created_at")
      .eq("episode_id", ep.id)
      .order("created_at", { ascending: false });

    const { data: dels } = await supabase
      .from("deliverables")
      .select("id, type, version, status")
      .eq("episode_id", ep.id);

    const delIds = dels?.map((d) => d.id) ?? [];
    let vfxTotal = 0;
    let vfxApproved = 0;
    let vfxPending = 0;
    let vfxHigh = 0;
    if (delIds.length) {
      const { data: shots } = await supabase
        .from("vfx_shots")
        .select("status, priority")
        .in("deliverable_id", delIds);
      for (const s of shots ?? []) {
        vfxTotal++;
        if (s.status === "approved") vfxApproved++;
        if (s.status === "pending") vfxPending++;
        if (s.priority === "High" && s.status !== "approved") vfxHigh++;
      }
    }

    const { data: rolls } = await supabase
      .from("dailies_rolls")
      .select("status")
      .eq("episode_id", ep.id);
    const rollByStatus = new Map<string, number>();
    for (const r of rolls ?? []) {
      rollByStatus.set(r.status, (rollByStatus.get(r.status) ?? 0) + 1);
    }
    const rollsConfirmed = rollByStatus.get("confirmed") ?? 0;
    const rollsTotal = rolls?.length ?? 0;

    let openNotes = 0;
    let cutsWithOpen = 0;
    const cvIds = (cuts ?? []).map((c) => c.id);
    if (cvIds.length) {
      const { data: notes } = await supabase
        .from("cut_notes")
        .select("cut_version_id")
        .in("cut_version_id", cvIds)
        .eq("status", "open");
      openNotes = notes?.length ?? 0;
      cutsWithOpen = new Set(notes?.map((n) => n.cut_version_id) ?? []).size;
    }

    const deliverablesLite: DeliverableLite[] =
      dels?.map((d) => ({ type: d.type, status: d.status })) ?? [];
    const complete = derivePhaseCompletion({
      episodeStatus: ep.status,
      cuts: (cuts ?? []).map((c) => ({ cut_type: c.cut_type })),
      deliverables: deliverablesLite,
      vfxTotal,
      vfxApproved,
    });
    const cur = firstIncompleteIndex(complete);
    const phaseLabel =
      cur >= 0 ? PHASE_ORDER[cur]?.label ?? "unknown" : "all phases complete";

    lines.push(`ACTIVE EPISODE: Ep ${ep.episode_number} "${ep.title}"`);
    lines.push(`Current phase (derived): ${phaseLabel}`);
    lines.push(
      `VFX: ${vfxTotal} shots — ${vfxApproved} approved, ${vfxPending} pending, ${vfxHigh} high priority not approved`
    );
    lines.push(
      `Dailies: ${rollsTotal} rolls — ${rollsConfirmed} confirmed; by status: ${[...rollByStatus.entries()].map(([k, v]) => `${k}:${v}`).join(", ")}`
    );
    lines.push(`Open cut notes: ${openNotes} across ${cutsWithOpen} cut(s)`);
    const latest = cuts?.[0];
    if (latest) {
      lines.push(
        `Latest cut: ${latest.version_name} (${latest.duration_tc ?? "no duration"}) logged ${latest.created_at}`
      );
    }
    lines.push("");
    lines.push("DELIVERABLES (this episode):");
    for (const d of dels ?? []) {
      lines.push(`- ${d.type} v${d.version} [${d.status}]`);
    }
    lines.push("");
  }

  if (context === "vfx") {
    const { data: allDels } = await supabase
      .from("deliverables")
      .select("id, episode_id")
      .eq("type", "vfx_sheet")
      .in(
        "episode_id",
        epList.map((e) => e.id)
      );
    const ids = allDels?.map((d) => d.id) ?? [];
    if (ids.length) {
      const { data: shots } = await supabase
        .from("vfx_shots")
        .select("status, priority, vendor, shot_id, deliverable_id")
        .in("deliverable_id", ids);
      const byStatus = new Map<string, number>();
      const byVendor = new Map<string, number>();
      let highUnassigned = 0;
      const rows = shots ?? [];
      for (const s of rows) {
        byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
        const v = s.vendor?.trim() || "—";
        byVendor.set(v, (byVendor.get(v) ?? 0) + 1);
        if (s.priority === "High" && (!s.vendor || !s.vendor.trim())) {
          if (s.status !== "approved") highUnassigned++;
        }
      }
      lines.push("VFX CONTEXT (all episodes in show):");
      lines.push(`Total shots: ${rows.length}`);
      lines.push(
        `By status: ${[...byStatus.entries()].map(([k, v]) => `${k}:${v}`).join(", ")}`
      );
      lines.push(
        `By vendor: ${[...byVendor.entries()].map(([k, v]) => `${k}:${v}`).join(", ")}`
      );
      lines.push(`High priority and unassigned (not approved): ${highUnassigned}`);
      lines.push("");
    } else {
      lines.push("VFX: No VFX sheet deliverables yet.");
      lines.push("");
    }
  }

  if (context === "dailies" && episodeId && ep) {
    const { data: allRolls } = await supabase
      .from("dailies_rolls")
      .select("roll_name, camera, card_count, status, notes, shoot_day")
      .eq("episode_id", episodeId);
    const byStatus = new Map<string, number>();
    const problems: string[] = [];
    for (const r of allRolls ?? []) {
      byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
      if (r.notes && /problem|issue/i.test(r.notes)) {
        problems.push(`${r.roll_name}: ${r.notes}`);
      }
    }
    lines.push("DAILIES CONTEXT (current episode, all shoot days on this episode):");
    lines.push(
      `Rolls by status: ${[...byStatus.entries()].map(([k, v]) => `${k}:${v}`).join(", ")}`
    );
    lines.push(`Problem-flagged notes: ${problems.length}`);
    if (problems.length) {
      for (const p of problems.slice(0, 8)) lines.push(`  - ${p}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
