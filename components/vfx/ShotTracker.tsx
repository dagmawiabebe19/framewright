"use client";

import { createClient } from "@/lib/supabase/client";
import { buildDownloadFileName, buildVfxExcel } from "@/lib/excelBuilder";
import type { ShowMeta, VfxShot } from "@/lib/types";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ShotRow = {
  id: string;
  deliverable_id: string;
  shot_id: string | null;
  standard_id: string | null;
  scene: string | null;
  reel: string | null;
  tc_in: string | null;
  tc_out: string | null;
  src_tc_in: string | null;
  src_tc_out: string | null;
  frames: number | null;
  handles: number | null;
  description: string | null;
  priority: string | null;
  status: string;
  vendor: string | null;
  notes: string | null;
  thumbnail_url: string | null;
  episode_number: string;
  episode_id: string;
};

const STATUS_OPTIONS = [
  "pending",
  "in_progress",
  "delivered",
  "approved",
  "needs_revision",
] as const;

const PRI_OPTIONS = ["High", "Medium", "Low"];

function toVfxDbUpdate(patch: Partial<ShotRow>) {
  const keys = [
    "shot_id",
    "standard_id",
    "scene",
    "reel",
    "tc_in",
    "tc_out",
    "src_tc_in",
    "src_tc_out",
    "frames",
    "handles",
    "description",
    "priority",
    "status",
    "thumbnail_url",
    "vendor",
    "notes",
  ] as const;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in patch && (patch as Record<string, unknown>)[k] !== undefined) {
      out[k] = (patch as Record<string, unknown>)[k];
    }
  }
  return out;
}

function rowFromDb(
  row: Record<string, unknown>,
  episodeId: string,
  episodeNumber: string
): ShotRow {
  return {
    id: String(row.id),
    deliverable_id: String(row.deliverable_id),
    shot_id: (row.shot_id as string | null) ?? null,
    standard_id: (row.standard_id as string | null) ?? null,
    scene: (row.scene as string | null) ?? null,
    reel: (row.reel as string | null) ?? null,
    tc_in: (row.tc_in as string | null) ?? null,
    tc_out: (row.tc_out as string | null) ?? null,
    src_tc_in: (row.src_tc_in as string | null) ?? null,
    src_tc_out: (row.src_tc_out as string | null) ?? null,
    frames: (row.frames as number | null) ?? null,
    handles: (row.handles as number | null) ?? null,
    description: (row.description as string | null) ?? null,
    priority: (row.priority as string | null) ?? null,
    status: String(row.status ?? "pending"),
    vendor: (row.vendor as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    episode_id: episodeId,
    episode_number: episodeNumber,
  };
}

export function ShotTracker({
  showId,
  showName,
  frameRate,
  metaDefaults,
  initialShots,
  deliverableIds,
  initialDeliverableId,
}: {
  showId: string;
  showName: string;
  frameRate: string;
  metaDefaults: Partial<ShowMeta>;
  initialShots: ShotRow[];
  deliverableIds: string[];
  initialDeliverableId?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [shots, setShots] = useState(initialShots);
  const [episodeFilter, setEpisodeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [deliverableFilter, setDeliverableFilter] = useState<string | null>(
    initialDeliverableId ?? null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [flashId, setFlashId] = useState<string | null>(null);

  const shotsRef = useRef(shots);
  shotsRef.current = shots;

  useEffect(() => {
    setShots(initialShots);
  }, [initialShots]);

  useEffect(() => {
    setDeliverableFilter(initialDeliverableId ?? null);
  }, [initialDeliverableId]);

  const filtered = useMemo(() => {
    return shots.filter((s) => {
      if (
        deliverableFilter &&
        s.deliverable_id !== deliverableFilter
      )
        return false;
      if (episodeFilter !== "all" && s.episode_id !== episodeFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (priorityFilter !== "all" && (s.priority || "") !== priorityFilter)
        return false;
      return true;
    });
  }, [
    shots,
    deliverableFilter,
    episodeFilter,
    statusFilter,
    priorityFilter,
  ]);

  useEffect(() => {
    if (!deliverableIds.length) return;
    const filter = `deliverable_id=in.(${deliverableIds.join(",")})`;
    const channel = supabase
      .channel(`vfx-shots-${showId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vfx_shots",
          filter,
        },
        (payload) => {
          const resolveEp = (delId: string) => {
            const hit = shotsRef.current.find((s) => s.deliverable_id === delId);
            return hit
              ? { episodeId: hit.episode_id, episodeNumber: hit.episode_number }
              : null;
          };

          if (payload.eventType === "UPDATE") {
            const row = payload.new as Record<string, unknown>;
            const id = String(row.id);
            const delId = String(row.deliverable_id);
            const ep = resolveEp(delId);
            const mapped = rowFromDb(
              row,
              ep?.episodeId ?? "",
              ep?.episodeNumber ?? ""
            );
            setShots((prev) =>
              prev.map((s) => (s.id === id ? { ...s, ...mapped } : s))
            );
            setFlashId(id);
            window.setTimeout(() => setFlashId(null), 650);
          } else if (payload.eventType === "INSERT") {
            const row = payload.new as Record<string, unknown>;
            const delId = String(row.deliverable_id);
            const ep = resolveEp(delId);
            if (!ep?.episodeId) return;
            setShots((prev) => {
              if (prev.some((s) => s.id === String(row.id))) return prev;
              return [
                ...prev,
                rowFromDb(row, ep.episodeId, ep.episodeNumber),
              ];
            });
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string };
            if (old?.id) {
              setShots((prev) => prev.filter((s) => s.id !== old.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, showId, deliverableIds]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const approved = filtered.filter((s) => s.status === "approved").length;
    const pending = filtered.filter((s) => s.status === "pending").length;
    const high = filtered.filter((s) => s.priority === "High").length;
    return { total, approved, pending, high };
  }, [filtered]);

  const patchShot = useCallback(
    async (id: string, patch: Partial<ShotRow>) => {
      const dbPatch = toVfxDbUpdate(patch);
      let snapshot: ShotRow | undefined;
      setShots((prev) => {
        snapshot = prev.find((s) => s.id === id);
        return prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      });
      const { error } = await supabase
        .from("vfx_shots")
        .update(dbPatch)
        .eq("id", id);
      if (error && snapshot) {
        setShots((prev) => prev.map((s) => (s.id === id ? snapshot! : s)));
      }
    },
    [supabase]
  );

  const exportSelected = async () => {
    const rows = shots.filter((s) => selected.has(s.id));
    if (!rows.length) return;
    const meta: ShowMeta = {
      showName: metaDefaults.showName ?? showName,
      episode: metaDefaults.episode ?? rows[0]?.episode_number ?? "",
      cutVersion: metaDefaults.cutVersion ?? "",
      date: metaDefaults.date ?? new Date().toISOString().slice(0, 10),
      vfxSupervisor: metaDefaults.vfxSupervisor ?? "",
      editor: metaDefaults.editor ?? "",
      projectType: metaDefaults.projectType ?? "episodic",
      seasonNumber: metaDefaults.seasonNumber ?? 1,
      vfxSequenceCode: metaDefaults.vfxSequenceCode ?? "sc",
      imageType: metaDefaults.imageType ?? "mp",
      vendorCode: metaDefaults.vendorCode ?? "xx",
      revision: metaDefaults.revision ?? 1,
    };
    const vfx: VfxShot[] = rows.map((r) => ({
      reel: r.reel ?? "",
      tcInRec: r.tc_in ?? "",
      tcOutRec: r.tc_out ?? "",
      tcInSrc: r.src_tc_in ?? "",
      tcOutSrc: r.src_tc_out ?? "",
      framesDuration: r.frames ?? 0,
      vfxDescription: r.description ?? "",
      shotId: r.shot_id ?? undefined,
      scene: r.scene ?? undefined,
      standardId: r.standard_id ?? undefined,
      handleFrames: r.handles ?? 8,
    }));
    const buf = await buildVfxExcel(meta, vfx, vfx.map(() => null));
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildDownloadFileName(meta);
    a.click();
    URL.revokeObjectURL(url);
  };

  const episodes = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of shots) m.set(s.episode_id, s.episode_number);
    return Array.from(m.entries());
  }, [shots]);

  return (
    <div className="space-y-6 px-4 pb-12 pt-4 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#5f5e70]">VFX</p>
          <h1 className="text-2xl font-semibold text-[#f1f0f0]">VFX Shots</h1>
          <p className="text-sm text-[#9998b0]">{showName}</p>
        </div>
        <div className="text-sm text-[#9998b0]">{stats.total} shots</div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {deliverableFilter && (
          <button
            type="button"
            onClick={() => setDeliverableFilter(null)}
            className="rounded-full border border-[#6c63ff]/40 bg-[#1a1a2e] px-3 py-1 text-[11px] text-[#6c63ff]"
          >
            Clear deliverable filter
          </button>
        )}
        <select
          value={episodeFilter}
          onChange={(e) => setEpisodeFilter(e.target.value)}
          className="rounded-full border border-[#2a2a3e] bg-[#12121e] px-3 py-1 text-[#f1f0f0]"
        >
          <option value="all">All episodes</option>
          {episodes.map(([id, num]) => (
            <option key={id} value={id}>
              Ep {num}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-[#2a2a3e] bg-[#12121e] px-3 py-1 text-[#f1f0f0]"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-full border border-[#2a2a3e] bg-[#12121e] px-3 py-1 text-[#f1f0f0]"
        >
          <option value="all">All priorities</option>
          {PRI_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportSelected}
          className="rounded-full border border-[#2a2a3e] px-3 py-1 text-[#6c63ff]"
        >
          Export selected
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total", stats.total, "text-[#f1f0f0]"],
          ["Approved", stats.approved, "text-emerald-400"],
          ["Pending", stats.pending, "text-amber-300"],
          ["High priority", stats.high, "text-red-300"],
        ].map(([label, val, cls]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-4"
          >
            <p className="text-xs uppercase tracking-wider text-[#5f5e70]">
              {label}
            </p>
            <p className={`mt-2 text-2xl font-semibold ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#2a2a3e]">
        <table className="min-w-[1100px] w-full border-collapse text-left text-xs">
          <thead className="bg-[#0f0f1a] text-[#5f5e70]">
            <tr>
              <th className="px-2 py-2"> </th>
              <th className="px-2 py-2">Shot</th>
              <th className="px-2 py-2">Ep</th>
              <th className="px-2 py-2">Scene</th>
              <th className="px-2 py-2 font-mono">TC In</th>
              <th className="px-2 py-2 font-mono">TC Out</th>
              <th className="px-2 py-2">Frames</th>
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2">Priority</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Vendor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <motion.tr
                key={s.id}
                className="border-t border-[#2a2a3e]/60 hover:bg-[#14142a]"
                layout
                animate={
                  flashId === s.id
                    ? { backgroundColor: ["#2a2a1a", "transparent"] }
                    : false
                }
                transition={{ duration: 0.6 }}
              >
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const n = new Set(prev);
                        if (e.target.checked) n.add(s.id);
                        else n.delete(s.id);
                        return n;
                      });
                    }}
                  />
                </td>
                <td className="px-2 py-2 font-mono text-[11px] font-semibold text-[#f1f0f0]">
                  {s.shot_id}
                </td>
                <td className="px-2 py-2">
                  <span className="rounded-full border border-[#2a2a3e] px-2 py-0.5 text-[10px] text-[#9998b0]">
                    {s.episode_number}
                  </span>
                </td>
                <td className="px-2 py-2">{s.scene}</td>
                <td className="px-2 py-2 font-mono text-[11px]">{s.tc_in}</td>
                <td className="px-2 py-2 font-mono text-[11px]">{s.tc_out}</td>
                <td className="px-2 py-2 text-right">{s.frames}</td>
                <td className="px-2 py-2 max-w-[220px] truncate" title={s.description ?? ""}>
                  {s.description}
                </td>
                <td className="px-2 py-2">
                  <select
                    value={s.priority ?? ""}
                    onChange={(e) =>
                      void patchShot(s.id, { priority: e.target.value || null })
                    }
                    className="rounded-full border border-[#2a2a3e] bg-[#12121e] px-2 py-1 text-[11px]"
                  >
                    <option value="">—</option>
                    {PRI_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={s.status}
                    onChange={(e) =>
                      void patchShot(s.id, { status: e.target.value })
                    }
                    className="rounded-full border border-[#2a2a3e] bg-[#12121e] px-2 py-1 text-[11px]"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    value={s.vendor ?? ""}
                    onChange={(e) =>
                      void patchShot(s.id, { vendor: e.target.value || null })
                    }
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] focus:border-[#6c63ff] focus:bg-[#1a1a2e]"
                  />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[#5f5e70]">
        Frame rate: {frameRate}. Updates sync live across the team.
      </p>
    </div>
  );
}
