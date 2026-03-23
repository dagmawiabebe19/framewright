"use client";

import {
  derivePhaseCompletion,
  firstIncompleteIndex,
  PHASE_ORDER,
  type CutLite,
  type DeliverableLite,
  type PhaseKey,
} from "@/lib/episode-phases";
import { useEffect, useMemo, useRef, useState } from "react";

const CUT_PHASE_MAP: Partial<Record<PhaseKey, string>> = {
  assembly: "assembly",
  editors: "editors_cut",
  directors: "directors_cut",
  producers: "producers_cut",
  network: "network_cut",
  picture_lock: "picture_lock",
};

function latestCutForType(
  cuts: { cut_type: string; version_name: string; created_at: string }[],
  cutType: string
) {
  const hits = cuts.filter((c) => c.cut_type === cutType);
  if (!hits.length) return null;
  return hits.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
}

export function PhaseTimeline({
  episodeStatus,
  pictureLockDate,
  deliveryDate,
  cuts,
  deliverables,
  vfxTotal,
  vfxApproved,
}: {
  episodeStatus: string;
  pictureLockDate: string | null;
  deliveryDate: string | null;
  cuts: { cut_type: string; version_name: string; created_at: string }[];
  deliverables: DeliverableLite[];
  vfxTotal: number;
  vfxApproved: number;
}) {
  const [open, setOpen] = useState<PhaseKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const completion = useMemo(
    () =>
      derivePhaseCompletion({
        episodeStatus,
        cuts: cuts as CutLite[],
        deliverables,
        vfxTotal,
        vfxApproved,
      }),
    [episodeStatus, cuts, deliverables, vfxTotal, vfxApproved]
  );

  const currentIdx = useMemo(() => {
    const idx = firstIncompleteIndex(completion);
    return idx;
  }, [completion]);

  const popoverBody = (key: PhaseKey) => {
    const done = completion[key];
    const isCurrent =
      currentIdx >= 0 && PHASE_ORDER[currentIdx]?.key === key && !done;

    const statusLabel = done
      ? "Complete"
      : isCurrent
        ? "In progress"
        : "Upcoming";

    const cutType = CUT_PHASE_MAP[key];
    if (cutType) {
      const c = latestCutForType(cuts, cutType);
      return (
        <div className="space-y-1 text-[11px] text-[#c4c4d4]">
          <p className="font-medium text-[#f1f0f0]">{statusLabel}</p>
          {c ? (
            <p>
              {c.version_name} ·{" "}
              {new Date(c.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          ) : (
            <p>No cut logged for this phase yet.</p>
          )}
          {!done && !c && (
            <p className="text-[#5f5e70]">Expected: Not scheduled</p>
          )}
        </div>
      );
    }

    if (key === "color") {
      const d = deliverables.find((x) => x.type === "color_turnover");
      return (
        <div className="space-y-1 text-[11px] text-[#c4c4d4]">
          <p className="font-medium text-[#f1f0f0]">{statusLabel}</p>
          {d ? (
            <p>
              Latest turnover · {d.status} (version tracked in deliverables)
            </p>
          ) : (
            <p>No color turnover yet.</p>
          )}
          {!done && <p className="text-[#5f5e70]">Expected: Not scheduled</p>}
        </div>
      );
    }

    if (key === "sound") {
      const d = deliverables.find((x) => x.type === "sound_turnover");
      return (
        <div className="space-y-1 text-[11px] text-[#c4c4d4]">
          <p className="font-medium text-[#f1f0f0]">{statusLabel}</p>
          {d ? (
            <p>
              Latest turnover · {d.status} (version tracked in deliverables)
            </p>
          ) : (
            <p>No sound turnover yet.</p>
          )}
          {!done && <p className="text-[#5f5e70]">Expected: Not scheduled</p>}
        </div>
      );
    }

    if (key === "vfx_finals") {
      return (
        <div className="space-y-1 text-[11px] text-[#c4c4d4]">
          <p className="font-medium text-[#f1f0f0]">{statusLabel}</p>
          <p>
            Approved {vfxApproved} / {vfxTotal || "0"} shots
          </p>
          {vfxTotal === 0 && (
            <p className="text-[#5f5e70]">
              No VFX shots yet — generate a VFX sheet or add shots to track
              finals here.
            </p>
          )}
        </div>
      );
    }

    if (key === "shooting") {
      return (
        <div className="space-y-1 text-[11px] text-[#c4c4d4]">
          <p className="font-medium text-[#f1f0f0]">{statusLabel}</p>
          <p>Episode status: {episodeStatus}</p>
        </div>
      );
    }

    if (key === "delivery") {
      return (
        <div className="space-y-1 text-[11px] text-[#c4c4d4]">
          <p className="font-medium text-[#f1f0f0]">{statusLabel}</p>
          {deliveryDate && <p>Target: {deliveryDate}</p>}
          {!deliveryDate && (
            <p className="text-[#5f5e70]">Expected: Not scheduled</p>
          )}
        </div>
      );
    }

    if (key === "picture_lock") {
      return (
        <div className="space-y-1 text-[11px] text-[#c4c4d4]">
          <p className="font-medium text-[#f1f0f0]">{statusLabel}</p>
          {pictureLockDate && <p>Date: {pictureLockDate}</p>}
          {!pictureLockDate && (
            <p className="text-[#5f5e70]">Expected: Not scheduled</p>
          )}
        </div>
      );
    }

    return (
      <p className="text-[11px] text-[#c4c4d4]">
        {statusLabel}
      </p>
    );
  };

  return (
    <div ref={rootRef} className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-5">
      <h2 className="text-sm font-semibold text-[#f1f0f0]">Phase timeline</h2>
      <ol className="relative mt-4 space-y-3">
        {PHASE_ORDER.map(({ key, label }, idx) => {
          const done = completion[key];
          const showCurrent =
            currentIdx >= 0 && idx === currentIdx && !done;

          return (
            <li key={key} className="relative flex items-start gap-3 text-sm">
              <button
                type="button"
                onClick={() => setOpen((p) => (p === key ? null : key))}
                className="group flex flex-1 items-start gap-3 text-left"
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    done
                      ? "bg-emerald-500"
                      : showCurrent
                        ? "bg-[#6c63ff] shadow-[0_0_0_6px_rgba(108,99,255,0.15)]"
                        : "bg-[#2a2a3e]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[#f1f0f0]">{label}</p>
                  {key === "picture_lock" && pictureLockDate && (
                    <p className="text-xs text-[#5f5e70]">{pictureLockDate}</p>
                  )}
                  {key === "delivery" && deliveryDate && (
                    <p className="text-xs text-[#5f5e70]">{deliveryDate}</p>
                  )}
                </div>
              </button>
              {open === key && (
                <div className="absolute left-0 top-full z-20 mt-1 w-[min(100%,280px)] rounded-lg border border-[#2a2a3e] bg-[#0a0a12] p-3 shadow-xl">
                  <p className="text-xs font-semibold text-[#f1f0f0]">{label}</p>
                  <div className="mt-2">{popoverBody(key)}</div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
