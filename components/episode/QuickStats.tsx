"use client";

import { updateEpisodeDates } from "@/app/actions/cuts";
import { createClient } from "@/lib/supabase/client";
import { differenceInCalendarDays } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type QuickStatsSnapshot = {
  vfxTotal: number;
  vfxApproved: number;
  vfxPending: number;
  rollsTotal: number;
  rollsConfirmed: number;
  rollsPending: number;
  problemRolls: number;
  openNotes: number;
  cutVersionsWithOpenNotes: number;
};

export function QuickStats({
  episodeId,
  showId,
  orgSlug,
  showSlug,
  deliverableIds,
  cutVersionIds,
  initialEpisode,
  snapshot,
  onEpisodeDatesChange,
  onStatsChange,
}: {
  episodeId: string;
  showId: string;
  orgSlug: string;
  showSlug: string;
  deliverableIds: string[];
  cutVersionIds: string[];
  initialEpisode: {
    picture_lock_date: string | null;
    delivery_date: string | null;
  };
  snapshot: QuickStatsSnapshot;
  onEpisodeDatesChange?: (d: {
    picture_lock_date: string | null;
    delivery_date: string | null;
  }) => void;
  onStatsChange?: (s: QuickStatsSnapshot) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const statsCb = useRef(onStatsChange);
  statsCb.current = onStatsChange;
  const [s, setS] = useState(snapshot);
  const [episodeDates, setEpisodeDates] = useState(initialEpisode);
  const [editingDates, setEditingDates] = useState(false);
  const [draftLock, setDraftLock] = useState(
    initialEpisode.picture_lock_date ?? ""
  );
  const [draftDelivery, setDraftDelivery] = useState(
    initialEpisode.delivery_date ?? ""
  );
  const [savingDates, setSavingDates] = useState(false);

  useEffect(() => {
    setS(snapshot);
  }, [snapshot]);

  useEffect(() => {
    setEpisodeDates(initialEpisode);
    setDraftLock(initialEpisode.picture_lock_date ?? "");
    setDraftDelivery(initialEpisode.delivery_date ?? "");
  }, [initialEpisode]);

  const refresh = useCallback(async () => {
    let vfxTotal = 0;
    let vfxApproved = 0;
    let vfxPending = 0;
    if (deliverableIds.length) {
      const { data: shots } = await supabase
        .from("vfx_shots")
        .select("status")
        .in("deliverable_id", deliverableIds);
      const rows = shots ?? [];
      vfxTotal = rows.length;
      vfxApproved = rows.filter((x) => x.status === "approved").length;
      vfxPending = rows.filter((x) => x.status === "pending").length;
    }

    const { count: rollsTotal } = await supabase
      .from("dailies_rolls")
      .select("id", { count: "exact", head: true })
      .eq("episode_id", episodeId);

    const { count: rollsConfirmed } = await supabase
      .from("dailies_rolls")
      .select("id", { count: "exact", head: true })
      .eq("episode_id", episodeId)
      .eq("status", "confirmed");

    const { data: rollNotes } = await supabase
      .from("dailies_rolls")
      .select("id,notes")
      .eq("episode_id", episodeId);
    const problemRolls =
      rollNotes?.filter(
        (r) => r.notes && /problem|issue/i.test(String(r.notes))
      ).length ?? 0;

    let openNotes = 0;
    let cutVersionsWithOpenNotes = 0;
    if (cutVersionIds.length) {
      const { data: openRows } = await supabase
        .from("cut_notes")
        .select("cut_version_id")
        .in("cut_version_id", cutVersionIds)
        .eq("status", "open");
      openNotes = openRows?.length ?? 0;
      cutVersionsWithOpenNotes = new Set(
        openRows?.map((r) => r.cut_version_id) ?? []
      ).size;
    }

    const rt = rollsTotal ?? 0;
    const rc = rollsConfirmed ?? 0;

    const next: QuickStatsSnapshot = {
      vfxTotal,
      vfxApproved,
      vfxPending,
      rollsTotal: rt,
      rollsConfirmed: rc,
      rollsPending: Math.max(0, rt - rc),
      problemRolls,
      openNotes,
      cutVersionsWithOpenNotes,
    };
    setS(next);
    statsCb.current?.(next);
  }, [supabase, deliverableIds, cutVersionIds, episodeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (deliverableIds.length) {
      const f = `deliverable_id=in.(${deliverableIds.join(",")})`;
      const ch = supabase
        .channel(`qs-vfx-${episodeId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "vfx_shots",
            filter: f,
          },
          () => void refresh()
        )
        .subscribe();
      channels.push(ch);
    }

    const chD = supabase
      .channel(`qs-dailies-${episodeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dailies_rolls",
          filter: `episode_id=eq.${episodeId}`,
        },
        () => void refresh()
      )
      .subscribe();
    channels.push(chD);

    if (cutVersionIds.length) {
      const fn = `cut_version_id=in.(${cutVersionIds.join(",")})`;
      const chN = supabase
        .channel(`qs-notes-${episodeId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cut_notes",
            filter: fn,
          },
          () => void refresh()
        )
        .subscribe();
      channels.push(chN);
    }

    return () => {
      for (const c of channels) void supabase.removeChannel(c);
    };
  }, [supabase, episodeId, deliverableIds, cutVersionIds, refresh]);

  const pct =
    s.vfxTotal > 0 ? Math.round((s.vfxApproved / s.vfxTotal) * 100) : 0;

  let lockLine: { text: string; tone: string } = {
    text: "No picture lock date set",
    tone: "text-[#9998b0]",
  };
  if (episodeDates.picture_lock_date) {
    const d = new Date(episodeDates.picture_lock_date + "T12:00:00");
    const days = differenceInCalendarDays(d, new Date());
    if (days < 0) {
      lockLine = { text: "DATE PASSED", tone: "text-red-400" };
    } else {
      lockLine = {
        text: `${days} days`,
        tone:
          days < 7
            ? "text-red-400"
            : days < 14
              ? "text-amber-300"
              : "text-emerald-400",
      };
    }
  }

  const saveDates = async () => {
    setSavingDates(true);
    const res = await updateEpisodeDates({
      episodeId,
      showId,
      orgSlug,
      showSlug,
      pictureLockDate: draftLock.trim() || null,
      deliveryDate: draftDelivery.trim() || null,
    });
    setSavingDates(false);
    if (res.ok) {
      const next = {
        picture_lock_date: draftLock.trim() || null,
        delivery_date: draftDelivery.trim() || null,
      };
      setEpisodeDates(next);
      onEpisodeDatesChange?.(next);
      setEditingDates(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-5">
      <h2 className="text-sm font-semibold text-[#f1f0f0]">Quick stats</h2>

      <div className="mt-4 space-y-4 text-sm text-[#9998b0]">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#5f5e70]">
            VFX
          </p>
          <p className="mt-1">
            <span className="font-mono text-[#f1f0f0]">{s.vfxTotal}</span>{" "}
            shots total ·{" "}
            <span className="font-mono text-emerald-400">{s.vfxApproved}</span>{" "}
            approved ({pct}%)
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a24]">
            <div
              className="h-full rounded-full bg-[#6c63ff] transition-[width] duration-[400ms] ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2">
            <span className="font-mono text-amber-300">{s.vfxPending}</span>{" "}
            pending
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-[#5f5e70]">
            Dailies
          </p>
          <p className="mt-1">
            <span className="font-mono text-[#f1f0f0]">{s.rollsTotal}</span>{" "}
            rolls ·{" "}
            <span className="font-mono text-emerald-400">
              {s.rollsConfirmed}
            </span>{" "}
            confirmed ·{" "}
            <span className="font-mono text-amber-300">{s.rollsPending}</span>{" "}
            still pending
          </p>
          {s.problemRolls > 0 && (
            <p className="mt-2 text-xs text-amber-400">
              {s.problemRolls} rolls need attention
            </p>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-[#5f5e70]">
            Notes
          </p>
          {s.openNotes > 0 ? (
            <p className="mt-1 text-amber-300">
              Open notes:{" "}
              <span className="font-mono text-[#f1f0f0]">{s.openNotes}</span>{" "}
              across{" "}
              <span className="font-mono text-[#f1f0f0]">
                {s.cutVersionsWithOpenNotes}
              </span>{" "}
              cut versions
            </p>
          ) : (
            <p className="mt-1 text-emerald-400">All notes resolved</p>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-[#5f5e70]">
            Picture lock
          </p>
          <p className={`mt-1 font-mono ${lockLine.tone}`}>{lockLine.text}</p>
          {!episodeDates.picture_lock_date && !editingDates && (
            <button
              type="button"
              onClick={() => setEditingDates(true)}
              className="mt-1 text-[11px] text-[#6c63ff] hover:underline"
            >
              Set date
            </button>
          )}
          {editingDates && (
            <div className="mt-2 space-y-2 rounded-lg border border-[#2a2a3e] bg-[#0a0a12] p-3 text-[11px]">
              <label className="block text-[#9998b0]">
                Picture lock
                <input
                  type="date"
                  value={draftLock}
                  onChange={(e) => setDraftLock(e.target.value)}
                  className="mt-1 w-full rounded border border-[#2a2a3e] bg-[#12121e] px-2 py-1 text-[#f1f0f0]"
                />
              </label>
              <label className="block text-[#9998b0]">
                Delivery
                <input
                  type="date"
                  value={draftDelivery}
                  onChange={(e) => setDraftDelivery(e.target.value)}
                  className="mt-1 w-full rounded border border-[#2a2a3e] bg-[#12121e] px-2 py-1 text-[#f1f0f0]"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingDates}
                  onClick={() => void saveDates()}
                  className="rounded bg-[#6c63ff] px-3 py-1 text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDates(false);
                    setDraftLock(episodeDates.picture_lock_date ?? "");
                    setDraftDelivery(episodeDates.delivery_date ?? "");
                  }}
                  className="rounded border border-[#2a2a3e] px-3 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-[#5f5e70]">
        ADR line counts arrive with the ADR module — markers flow in from
        session exports.
      </p>
    </div>
  );
}
