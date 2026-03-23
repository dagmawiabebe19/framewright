"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { DeliverableCard, type DeliverableRow } from "./DeliverableCard";

type TabId = "vfx" | "sound" | "color" | "music" | "other";

const OTHER_TYPES = [
  "adr_list",
  "change_list",
  "pull_list",
  "delivery_manifest",
  "cut_log",
] as const;

function otherLabel(type: string): string {
  const map: Record<string, string> = {
    adr_list: "ADR List",
    change_list: "Change List",
    pull_list: "Pull List",
    delivery_manifest: "Delivery Manifest",
    cut_log: "Cut log",
  };
  return map[type] ?? type;
}

function EmptyIcon() {
  return (
    <svg
      className="mx-auto h-10 w-10 text-[#3a3a48]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function DeliverablesTabs({
  episodeId,
  orgSlug,
  showSlug,
  deliverables,
  setDeliverables,
  currentUserId,
}: {
  episodeId: string;
  orgSlug: string;
  showSlug: string;
  deliverables: DeliverableRow[];
  setDeliverables: Dispatch<SetStateAction<DeliverableRow[]>>;
  currentUserId: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<TabId>("vfx");

  useEffect(() => {
    const channel = supabase
      .channel(`deliverables-ep-${episodeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deliverables",
          filter: `episode_id=eq.${episodeId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const n = payload.new as DeliverableRow;
            setDeliverables((prev) => [n, ...prev.filter((r) => r.id !== n.id)]);
          } else if (payload.eventType === "UPDATE" && payload.new) {
            const n = payload.new as DeliverableRow;
            setDeliverables((prev) =>
              prev.map((r) => (r.id === n.id ? { ...r, ...n } : r))
            );
          } else if (payload.eventType === "DELETE" && payload.old) {
            const id = (payload.old as { id: string }).id;
            setDeliverables((prev) => prev.filter((r) => r.id !== id));
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, episodeId, setDeliverables]);

  const byTab = useMemo(() => {
    const vfx = deliverables.filter((r) => r.type === "vfx_sheet");
    const sound = deliverables.filter((r) => r.type === "sound_turnover");
    const color = deliverables.filter((r) => r.type === "color_turnover");
    const music = deliverables.filter((r) => r.type === "music_cue_sheet");
    const other = deliverables.filter((r) =>
      OTHER_TYPES.includes(r.type as (typeof OTHER_TYPES)[number])
    );
    return { vfx, sound, color, music, other };
  }, [deliverables]);

  const patchStatus = (id: string, status: string) => {
    setDeliverables((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "vfx", label: "VFX", count: byTab.vfx.length },
    { id: "sound", label: "Sound", count: byTab.sound.length },
    { id: "color", label: "Color", count: byTab.color.length },
    { id: "music", label: "Music", count: byTab.music.length },
    { id: "other", label: "Other", count: byTab.other.length },
  ];

  const base = `/${orgSlug}/${showSlug}`;

  const renderList = (list: DeliverableRow[], kind: TabId) => {
    if (!list.length) {
      const copy =
        kind === "vfx"
          ? "No VFX sheets yet for this episode"
          : kind === "sound"
            ? "No sound turnovers yet"
            : kind === "color"
              ? "No color turnovers yet"
              : kind === "music"
                ? "No music cue sheets yet"
                : "No other deliverables yet";
      return (
        <div className="rounded-xl border border-dashed border-[#2a2a2a] bg-[#080808] px-4 py-10 text-center">
          <EmptyIcon />
          <p className="mt-3 text-sm text-[#A09880]">{copy}</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {list.map((d) => (
          <DeliverableCard
            key={d.id}
            d={d}
            orgSlug={orgSlug}
            showSlug={showSlug}
            title={
              d.type === "vfx_sheet"
                ? "VFX Sheet"
                : d.type === "sound_turnover"
                  ? "Sound turnover"
                  : d.type === "color_turnover"
                    ? "Color turnover"
                    : d.type === "music_cue_sheet"
                      ? "Music cue sheet"
                      : otherLabel(d.type)
            }
            subtitle={
              d.type === "vfx_sheet"
                ? `${(d.metadata as { shotCount?: number }).shotCount ?? "—"} shots`
                : undefined
            }
            showViewShots={d.type === "vfx_sheet"}
            currentUserId={currentUserId}
            onStatusUpdated={patchStatus}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-5">
      <h2 className="text-sm font-semibold text-[#F5F0E8]">Deliverables</h2>
      <div className="mt-3 flex flex-wrap gap-1 border-b border-[#2a2a2a] pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              tab === t.id
                ? "bg-[#D4A853] text-white"
                : "text-[#A09880] hover:text-[#F5F0E8]"
            }`}
          >
            {t.label}
            {t.count > 0 ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "vfx" && (
          <>
            <div className="mb-3">
              <Link
                href={`${base}/tools/vfx-sheet?episode=${episodeId}`}
                className="inline-block rounded-full border border-[#D4A853]/40 px-3 py-1.5 text-[11px] font-semibold text-[#D4A853] hover:bg-[#D4A853]/10"
              >
                Generate new VFX sheet
              </Link>
            </div>
            {renderList(byTab.vfx, "vfx")}
          </>
        )}
        {tab === "sound" && (
          <>
            <div className="mb-3">
              <span
                title="Coming soon"
                className="inline-block cursor-not-allowed rounded-full border border-[#2a2a2a] px-3 py-1.5 text-[11px] text-[#5a5040]"
              >
                Generate sound turnover
              </span>
            </div>
            {renderList(byTab.sound, "sound")}
          </>
        )}
        {tab === "color" && (
          <>
            <div className="mb-3">
              <span
                title="Coming soon"
                className="inline-block cursor-not-allowed rounded-full border border-[#2a2a2a] px-3 py-1.5 text-[11px] text-[#5a5040]"
              >
                Generate color turnover
              </span>
            </div>
            {renderList(byTab.color, "color")}
          </>
        )}
        {tab === "music" && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <span
                title="Coming soon"
                className="inline-block cursor-not-allowed rounded-full border border-[#2a2a2a] px-3 py-1.5 text-[11px] text-[#5a5040]"
              >
                Generate music cue sheet
              </span>
            </div>
            {renderList(byTab.music, "music")}
          </>
        )}
        {tab === "other" && (
          <>
            <div className="mb-3 flex flex-col gap-2 text-[11px] text-[#5a5040]">
              <span title="Coming soon">
                ADR / pull / manifest —{" "}
                <span className="text-[#A09880]">coming soon</span>
              </span>
              <span title="Coming soon">
                Change list →{" "}
                <span className="text-[#A09880]">tool coming soon</span>
              </span>
            </div>
            {renderList(byTab.other, "other")}
          </>
        )}
      </div>
    </div>
  );
}
