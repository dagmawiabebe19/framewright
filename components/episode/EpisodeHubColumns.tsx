"use client";

import { createClient } from "@/lib/supabase/client";
import type { DeliverableRow } from "@/components/episode/DeliverableCard";
import type { QuickStatsSnapshot } from "@/components/episode/QuickStats";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CutVersionRow } from "./AddCutModal";
import { CutLog } from "./CutLog";
import { DeliverablesTabs } from "./DeliverablesTabs";
import { PhaseTimeline } from "./PhaseTimeline";
import { QuickStats } from "./QuickStats";

export function EpisodeHubColumns({
  orgId,
  showId,
  orgSlug,
  showSlug,
  episodeId,
  episodeStatus,
  frameRate,
  initialCuts,
  initialDeliverables,
  initialStats,
  initialEpisodeDates,
  currentUserId,
}: {
  orgId: string;
  showId: string;
  orgSlug: string;
  showSlug: string;
  episodeId: string;
  episodeStatus: string;
  frameRate: string;
  initialCuts: CutVersionRow[];
  initialDeliverables: DeliverableRow[];
  initialStats: QuickStatsSnapshot;
  initialEpisodeDates: {
    picture_lock_date: string | null;
    delivery_date: string | null;
  };
  currentUserId: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const mobile = useMediaQuery("(max-width: 767px)");
  const [mopen, setMopen] = useState({
    stats: true,
    phase: false,
    cut: false,
    del: false,
  });

  const [cuts, setCuts] = useState(initialCuts);
  const [deliverables, setDeliverables] = useState(initialDeliverableRows(initialDeliverables));
  const [stats, setStats] = useState(initialStats);
  const [episodeDates, setEpisodeDates] = useState(initialEpisodeDates);

  useEffect(() => {
    setCuts(initialCuts);
  }, [initialCuts]);

  useEffect(() => {
    setDeliverables(initialDeliverableRows(initialDeliverables));
  }, [initialDeliverables]);

  const deliverableIds = useMemo(
    () => deliverables.map((d) => d.id),
    [deliverables]
  );
  const cutVersionIds = useMemo(() => cuts.map((c) => c.id), [cuts]);

  useEffect(() => {
    const channel = supabase
      .channel(`episode-cuts-${episodeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cut_versions",
          filter: `episode_id=eq.${episodeId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const row = payload.new as CutVersionRow;
            setCuts((prev) => {
              if (prev.some((c) => c.id === row.id)) return prev;
              return [row, ...prev];
            });
          } else if (payload.eventType === "UPDATE" && payload.new) {
            const row = payload.new as CutVersionRow;
            setCuts((prev) =>
              prev.map((c) => (c.id === row.id ? { ...c, ...row } : c))
            );
          } else if (payload.eventType === "DELETE" && payload.old) {
            const id = (payload.old as { id: string }).id;
            setCuts((prev) => prev.filter((c) => c.id !== id));
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, episodeId]);

  const deliverablesLite = useMemo(
    () =>
      deliverables.map((d) => ({
        type: d.type,
        status: d.status,
      })),
    [deliverables]
  );

  const onStatsChange = useCallback((s: QuickStatsSnapshot) => {
    setStats(s);
  }, []);

  const phaseCuts = useMemo(
    () =>
      cuts.map((c) => ({
        cut_type: c.cut_type,
        version_name: c.version_name,
        created_at: c.created_at,
      })),
    [cuts]
  );

  const section = (
    key: keyof typeof mopen,
    title: string,
    node: ReactNode
  ) => (
    <div className="min-w-0">
      {mobile && (
        <button
          type="button"
          onClick={() =>
            setMopen((p) => ({
              ...p,
              [key]: !p[key],
            }))
          }
          className="mb-2 flex w-full items-center justify-between rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-left text-sm font-semibold text-[#F5F0E8] md:hidden"
        >
          {title}
          <span className="text-[#A09880]">{mopen[key] ? "▾" : "▸"}</span>
        </button>
      )}
      <div className={mobile && !mopen[key] ? "hidden md:block" : ""}>
        {node}
      </div>
    </div>
  );

  return (
    <div className="mt-10 grid gap-4 max-md:flex max-md:flex-col md:grid-cols-2 xl:grid-cols-4">
      <div className="order-2 min-w-0 xl:order-1">
        {section(
          "phase",
          "Phase timeline",
          <PhaseTimeline
            episodeStatus={episodeStatus}
            pictureLockDate={episodeDates.picture_lock_date}
            deliveryDate={episodeDates.delivery_date}
            cuts={phaseCuts}
            deliverables={deliverablesLite}
            vfxTotal={stats.vfxTotal}
            vfxApproved={stats.vfxApproved}
          />
        )}
      </div>

      <div className="order-3 min-w-0 xl:order-2">
        {section(
          "cut",
          "Cut log",
          <CutLog
            episodeId={episodeId}
            orgId={orgId}
            showId={showId}
            orgSlug={orgSlug}
            showSlug={showSlug}
            frameRate={frameRate}
            cuts={cuts}
            currentUserId={currentUserId}
            onCutsChange={setCuts}
          />
        )}
      </div>

      <div className="order-4 min-w-0 xl:order-3">
        {section(
          "del",
          "Deliverables",
          <DeliverablesTabs
            episodeId={episodeId}
            orgSlug={orgSlug}
            showSlug={showSlug}
            deliverables={deliverables}
            setDeliverables={setDeliverables}
            currentUserId={currentUserId}
          />
        )}
      </div>

      <div className="order-1 min-w-0 xl:order-4">
        {section(
          "stats",
          "Quick stats",
          <QuickStats
            episodeId={episodeId}
            showId={showId}
            orgSlug={orgSlug}
            showSlug={showSlug}
            deliverableIds={deliverableIds}
            cutVersionIds={cutVersionIds}
            initialEpisode={episodeDates}
            snapshot={stats}
            onEpisodeDatesChange={setEpisodeDates}
            onStatsChange={onStatsChange}
          />
        )}
      </div>
    </div>
  );
}

function initialDeliverableRows(rows: DeliverableRow[]): DeliverableRow[] {
  return rows.map((r) => ({
    ...r,
    metadata:
      r.metadata && typeof r.metadata === "object"
        ? (r.metadata as Record<string, unknown>)
        : {},
  }));
}
