"use client";

import { activityActionLabel } from "@/lib/activity-copy";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const DELIVERABLE_TYPES = [
  "vfx_sheet",
  "sound_turnover",
  "color_turnover",
  "music_cue_sheet",
  "adr_list",
  "change_list",
  "pull_list",
  "delivery_manifest",
  "cut_log",
] as const;

const EP_STATUS_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  prep: {
    label: "Prep",
    className: "bg-[#1e1e3a] text-[#9998b0] border-[#3a3a5e]",
  },
  shooting: {
    label: "Shooting",
    className: "bg-[#1a1a2a] text-[#3b82f6] border-[#2a3a5e]",
  },
  editorial: {
    label: "Editorial",
    className: "bg-[#2a2418] text-[#f59e0b] border-[#4a3a1a]",
  },
  locked: {
    label: "Locked",
    className: "bg-[#1a0a2a] text-[#a855f7] border-[#3a1a4a]",
  },
  delivered: {
    label: "Delivered",
    className: "bg-[#0a1a0a] text-[#22c55e] border-[#1a3a1a]",
  },
};

function shortType(t: string) {
  return t
    .split("_")
    .map((w) => w.slice(0, 3).toUpperCase())
    .join("");
}

function cellDot(status: string | undefined) {
  if (!status) return { color: "bg-[#5f5e70]", label: "—" };
  if (status === "approved")
    return { color: "bg-emerald-500", label: "Approved" };
  if (status === "draft" || status === "sent" || status === "received")
    return { color: "bg-amber-400", label: "Active" };
  if (status === "rejected") return { color: "bg-red-500", label: "Rejected" };
  return { color: "bg-[#5f5e70]", label: status };
}

function formatFeedTime(iso: string) {
  const d = new Date(iso);
  if (Date.now() - d.getTime() < 60_000) return "just now";
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true });
  if (isYesterday(d)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type EpisodeRow = {
  id: string;
  episode_number: string;
  title: string;
  status: string;
  picture_lock_date: string | null;
  delivery_date: string | null;
};

type DeliverableRow = {
  episode_id: string;
  type: string;
  status: string;
  version: number;
};

type FeedRow = {
  id: string;
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  user_id: string | null;
};

function buildDeliverableMap(rows: DeliverableRow[]) {
  const byEpType = new Map<
    string,
    Map<string, { status: string; version: number }>
  >();
  for (const row of rows) {
    if (!byEpType.has(row.episode_id)) {
      byEpType.set(row.episode_id, new Map());
    }
    const m = byEpType.get(row.episode_id)!;
    const prev = m.get(row.type);
    if (!prev || row.version >= prev.version) {
      m.set(row.type, { status: row.status, version: row.version });
    }
  }
  return byEpType;
}

export function ShowOverviewBody({
  orgSlug,
  showSlug,
  showId,
  orgId,
  initialEpisodes,
  initialDeliverables,
  initialFeed,
}: {
  orgSlug: string;
  showSlug: string;
  showId: string;
  orgId: string;
  initialEpisodes: EpisodeRow[];
  initialDeliverables: DeliverableRow[];
  initialFeed: FeedRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [deliverableRows, setDeliverableRows] = useState(initialDeliverables);
  const [feed, setFeed] = useState(initialFeed);

  const byEpType = useMemo(
    () => buildDeliverableMap(deliverableRows),
    [deliverableRows]
  );

  const episodeLabel = useCallback(
    (episodeId: string | undefined) => {
      if (!episodeId) return undefined;
      const ep = episodes.find((e) => e.id === episodeId);
      return ep ? `Ep ${ep.episode_number}` : undefined;
    },
    [episodes]
  );

  useEffect(() => {
    const channel = supabase.channel(`show-overview-${showId}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "activity_log",
        filter: `show_id=eq.${showId}`,
      },
      (payload) => {
        const row = payload.new as FeedRow;
        setFeed((prev) => {
          const next = [row, ...prev.filter((r) => r.id !== row.id)];
          return next.slice(0, 50);
        });
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "episodes",
        filter: `show_id=eq.${showId}`,
      },
      (payload) => {
        const next = payload.new as EpisodeRow;
        setEpisodes((prev) =>
          prev.map((e) => (e.id === next.id ? { ...e, ...next } : e))
        );
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "deliverables",
      },
      (payload) => {
        const epId =
          (payload.new as { episode_id?: string } | null)?.episode_id ??
          (payload.old as { episode_id?: string } | null)?.episode_id;
        if (!epId) return;
        void (async () => {
          const { data: ep } = await supabase
            .from("episodes")
            .select("id")
            .eq("id", epId)
            .eq("show_id", showId)
            .maybeSingle();
          if (!ep) return;
          const { data: eps } = await supabase
            .from("episodes")
            .select("id")
            .eq("show_id", showId);
          const epsIds = eps?.map((e) => e.id) ?? [];
          if (!epsIds.length) return;
          const { data } = await supabase
            .from("deliverables")
            .select("episode_id, type, status, version")
            .in("episode_id", epsIds);
          if (data) setDeliverableRows(data);
        })();
      }
    );

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, showId]);

  return (
    <div className="grid gap-8 px-4 py-6 lg:grid-cols-[1fr_320px] lg:px-8">
      <div className="min-w-0 space-y-10">
        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5f5e70]">
              Episode status
            </h2>
            <Link
              href={`/${orgSlug}/${showSlug}/episodes`}
              className="text-xs font-medium text-[#6c63ff] hover:underline"
            >
              Manage episodes
            </Link>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {episodes.map((ep) => {
              const st = EP_STATUS_STYLES[ep.status] ?? EP_STATUS_STYLES.prep;
              const map = byEpType.get(ep.id);
              let done = 0;
              if (map) {
                for (const t of DELIVERABLE_TYPES) {
                  const cell = map.get(t);
                  if (cell?.status === "approved") done += 1;
                }
              }
              const pct = Math.round((done / DELIVERABLE_TYPES.length) * 100);
              let lockLabel = "Picture lock TBD";
              if (ep.picture_lock_date) {
                const d = new Date(ep.picture_lock_date + "T12:00:00");
                const days = Math.ceil(
                  (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                lockLabel =
                  days > 0
                    ? `${days}d to picture lock`
                    : days === 0
                      ? "Picture lock today"
                      : `${Math.abs(days)}d past picture lock`;
              }
              return (
                <Link
                  key={ep.id}
                  href={`/${orgSlug}/${showSlug}/episodes/${ep.id}`}
                  className="min-w-[220px] max-w-[260px] flex-shrink-0 rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-4 transition duration-150 hover:border-[#6c63ff]/35"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-sm text-[#f1f0f0]">
                      {ep.episode_number}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[#9998b0]">
                    {ep.title}
                  </p>
                  <p className="mt-3 text-xs text-[#5f5e70]">{lockLabel}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#0a0a12]">
                    <div
                      className="h-full rounded-full bg-[#6c63ff]/80 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-[#5f5e70]">
                    Deliverables cleared: {done}/{DELIVERABLE_TYPES.length}
                  </p>
                </Link>
              );
            })}
            {episodes.length === 0 && (
              <p className="text-sm text-[#9998b0]">
                No episodes yet — add one from the Episodes screen.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5f5e70]">
            Active alerts
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#9998b0]">
            When editorial logs cuts, dailies move on the tracker, and VFX shots
            carry real status, FRAMEWRIGHT AI will rank what needs attention and
            attach one-click actions — sound turnover requests, vendor nudges, ADR
            coverage checks.
          </p>
          <div className="mt-5 rounded-xl border border-dashed border-[#2a2a3e] bg-[#0a0a12]/60 px-4 py-6 text-center text-sm text-[#5f5e70]">
            No blocking alerts yet — feed production data to wake this panel up.
          </div>
        </section>

        <section className="overflow-x-auto">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5f5e70]">
            Deliverables matrix
          </h2>
          <p className="mt-2 text-xs text-[#5f5e70]">
            Rows are episodes; columns are deliverable types. Dots reflect the
            latest version in the room.
          </p>
          <table className="mt-4 w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#2a2a3e] text-[#5f5e70]">
                <th className="py-2 pr-3 font-medium">Episode</th>
                {DELIVERABLE_TYPES.map((t) => (
                  <th key={t} className="px-1 py-2 font-mono text-[10px]">
                    {shortType(t)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {episodes.map((ep) => (
                <tr key={ep.id} className="border-b border-[#2a2a3e]/60">
                  <td className="py-2 pr-3 font-mono text-[#f1f0f0]">
                    {ep.episode_number}
                  </td>
                  {DELIVERABLE_TYPES.map((t) => {
                    const cell = byEpType.get(ep.id)?.get(t);
                    const dot = cellDot(cell?.status);
                    return (
                      <td key={t} className="px-1 py-2">
                        <motion.div
                          layout
                          className="flex items-center gap-1"
                          key={`${ep.id}-${t}-${cell?.version}-${cell?.status}`}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${dot.color}`}
                            title={dot.label}
                          />
                          <span className="font-mono text-[10px] text-[#5f5e70]">
                            {cell ? `v${cell.version}` : "—"}
                          </span>
                        </motion.div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {episodes.length === 0 && (
            <p className="mt-4 text-sm text-[#9998b0]">
              Create an episode to start tracking turnover packages.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:border-l lg:border-[#2a2a3e] lg:pl-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5f5e70]">
          Activity
        </h2>
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {feed.map((row) => {
              const meta = (row.metadata ?? {}) as Record<string, unknown>;
              const epId = meta.episodeId as string | undefined;
              const label = activityActionLabel(
                row.action,
                row.metadata as Record<string, unknown> | null,
                episodeLabel(epId)
              );
              return (
                <motion.li
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl border border-[#2a2a3e] bg-[#12121e] px-3 py-3"
                >
                  <p className="text-sm text-[#f1f0f0]">
                    <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a2e] text-[10px] font-semibold text-[#6c63ff]">
                      FW
                    </span>
                    {label}
                  </p>
                  <p className="mt-1 pl-9 text-[11px] text-[#5f5e70]">
                    {formatFeedTime(row.created_at)}
                  </p>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {feed.length === 0 && (
            <li className="text-sm text-[#9998b0]">
              The feed fills as soon as someone exports a turnover, moves
              dailies, or posts a cut note.
            </li>
          )}
        </ul>
      </aside>
    </div>
  );
}
