"use client";

import { updateDailiesRollStatus, type DailiesStatus } from "@/app/actions/dailies";
import { createClient } from "@/lib/supabase/client";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { useAiStore } from "@/lib/stores/aiStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddRollModal } from "./AddRollModal";
import { StatusEmailModal } from "./StatusEmailModal";

const COLUMNS: { id: DailiesStatus; label: string; tint: string }[] = [
  { id: "expected", label: "EXPECTED", tint: "bg-[#2a2a2a]" },
  { id: "received", label: "RECEIVED", tint: "bg-[#1a2a3e]" },
  { id: "ingested", label: "INGESTED", tint: "bg-[#2a1a3e]" },
  { id: "synced", label: "SYNCED", tint: "bg-[#2a2a1a]" },
  { id: "uploaded", label: "UPLOADED", tint: "bg-[#1a2a1a]" },
  { id: "confirmed", label: "CONFIRMED", tint: "bg-[#0a1a10]" },
];

export type DailiesRollRow = {
  id: string;
  roll_name: string;
  camera: string | null;
  card_count: number | null;
  shoot_date: string | null;
  shoot_day: number | null;
  status: DailiesStatus;
  notes: string | null;
};

function RollCard({
  roll,
  accentClass,
}: {
  roll: DailiesRollRow;
  accentClass: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: roll.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const problem =
    /problem|issue/i.test(roll.notes ?? "") ||
    /problem|issue/i.test(roll.roll_name ?? "");
  const noteShort =
    roll.notes && roll.notes.length > 40
      ? `${roll.notes.slice(0, 40)}…`
      : roll.notes;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      layout
      className={`cursor-grab active:cursor-grabbing rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.4)] ${
        isDragging ? "opacity-70" : ""
      }`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-lg font-semibold text-[#F5F0E8]">
            {roll.roll_name}
          </p>
          <p className="text-xs text-[#A09880]">
            {(roll.camera || "Camera") +
              (roll.card_count != null ? ` · ${roll.card_count} cards` : "")}
          </p>
          {roll.shoot_date && (
            <p className="mt-1 text-[11px] text-[#5a5040]">{roll.shoot_date}</p>
          )}
          {roll.notes && (
            <p className="mt-2 text-xs text-[#A09880]" title={roll.notes}>
              {noteShort}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {problem && (
            <span className="h-2 w-2 rounded-full bg-red-500" title="Flagged" />
          )}
          <span className={`h-full w-1 rounded-full ${accentClass}`} />
        </div>
      </div>
    </motion.div>
  );
}

function Column({
  col,
  rolls,
  onAdd,
}: {
  col: (typeof COLUMNS)[number];
  rolls: DailiesRollRow[];
  onAdd?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div className="min-w-[240px] sm:min-w-[260px] flex-shrink-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-[#5a5040]">
            {col.label}
          </p>
          <p className="text-xs text-[#A09880]">{rolls.length}</p>
        </div>
        {col.id === "expected" && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-[#2a2a2a] px-2 py-1 text-[11px] text-[#D4A853]"
          >
            Add roll
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[320px] space-y-3 rounded-2xl border border-dashed p-2 transition ${
          isOver ? "border-[#D4A853]/60 bg-[#080808]" : "border-[#2a2a2a]/80"
        } ${col.tint}/30`}
      >
        {rolls.map((r) => (
          <RollCard key={r.id} roll={r} accentClass={col.tint} />
        ))}
      </div>
    </div>
  );
}

export function DailiesBoard({
  orgSlug,
  showSlug,
  showId,
  episodeId,
  episodeOptions,
  episodeLabel,
  showName,
  episodeNumber,
  episodeTitle,
  initialRolls,
  initialShootDay,
}: {
  orgSlug: string;
  showSlug: string;
  showId: string;
  episodeId: string;
  episodeOptions: { id: string; episode_number: string; title: string }[];
  episodeLabel: string;
  showName: string;
  episodeNumber: string;
  episodeTitle: string;
  initialRolls: DailiesRollRow[];
  initialShootDay: number;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rolls, setRolls] = useState(initialRolls);
  const [shootDay, setShootDay] = useState(initialShootDay);
  const [addOpen, setAddOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sentToast, setSentToast] = useState<string | null>(null);

  useEffect(() => {
    useAiStore.getState().setEpisodeId(episodeId);
    return () => {
      useAiStore.getState().setEpisodeId(null);
    };
  }, [episodeId]);

  useEffect(() => {
    setRolls(initialRolls);
  }, [initialRolls]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("dailies_rolls")
        .select("*")
        .eq("episode_id", episodeId)
        .eq("shoot_day", shootDay);
      if (data) setRolls(data as DailiesRollRow[]);
    })();
  }, [supabase, episodeId, shootDay]);

  useEffect(() => {
    const channel = supabase
      .channel(`dailies-${episodeId}-${shootDay}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dailies_rolls",
          filter: `episode_id=eq.${episodeId}`,
        },
        () => {
          void (async () => {
            const { data } = await supabase
              .from("dailies_rolls")
              .select("*")
              .eq("episode_id", episodeId)
              .eq("shoot_day", shootDay);
            if (data) setRolls(data as DailiesRollRow[]);
          })();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, episodeId, shootDay]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const grouped = useMemo(() => {
    const g = new Map<DailiesStatus, DailiesRollRow[]>();
    for (const c of COLUMNS) g.set(c.id, []);
    for (const r of rolls) {
      const list = g.get(r.status) ?? [];
      list.push(r);
      g.set(r.status, list);
    }
    return g;
  }, [rolls]);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const rollId = String(active.id);
    const nextStatus = over.id as DailiesStatus;
    const roll = rolls.find((r) => r.id === rollId);
    if (!roll || roll.status === nextStatus) return;
    setRolls((prev) =>
      prev.map((r) => (r.id === rollId ? { ...r, status: nextStatus } : r))
    );
    const res = await updateDailiesRollStatus({
      rollId,
      status: nextStatus,
      orgSlug,
      showSlug,
      episodeId,
      rollName: roll.roll_name,
    });
    if (!res.ok) {
      setRolls((prev) =>
        prev.map((r) => (r.id === rollId ? { ...r, status: roll.status } : r))
      );
    }
  };

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    if (!sentToast) return;
    const t = window.setTimeout(() => setSentToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [sentToast]);

  return (
    <div className="relative space-y-6 px-4 pb-12 pt-4 md:px-8">
      {sentToast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2 text-sm text-[#F5F0E8] shadow-lg"
          role="status"
        >
          {sentToast}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-[#5a5040]">
            Dailies
          </p>
          <h1 className="text-2xl font-semibold text-[#F5F0E8]">
            {episodeLabel}
          </h1>
          <p className="text-sm text-[#A09880]">{dateLabel}</p>
          {episodeOptions.length > 1 && (
            <label className="mt-3 block max-w-xs text-xs text-[#A09880]">
              <span className="mb-1 block">Episode</span>
              <select
                value={episodeId}
                onChange={(e) => {
                  const id = e.target.value;
                  router.push(
                    `/${orgSlug}/${showSlug}/editorial/dailies?episode=${encodeURIComponent(id)}`
                  );
                }}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-sm text-[#F5F0E8]"
              >
                {episodeOptions.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    Ep {ep.episode_number} — {ep.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEmailOpen(true)}
          className="rounded-lg bg-[#D4A853] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#D4A853]/20 hover:bg-[#E0B86A]"
        >
          Send status email
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-[#A09880]">
        <span>Shoot day</span>
        <button
          type="button"
          className="rounded-lg border border-[#2a2a2a] px-2 py-1"
          onClick={() => setShootDay((d) => Math.max(1, d - 1))}
        >
          ←
        </button>
        <span className="font-mono text-[#F5F0E8]">Day {shootDay}</span>
        <button
          type="button"
          className="rounded-lg border border-[#2a2a2a] px-2 py-1"
          onClick={() => setShootDay((d) => d + 1)}
        >
          →
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              col={col}
              rolls={grouped.get(col.id) ?? []}
              onAdd={col.id === "expected" ? () => setAddOpen(true) : undefined}
            />
          ))}
        </div>
      </DndContext>

      <AddRollModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        episodeId={episodeId}
        shootDay={shootDay}
        orgSlug={orgSlug}
        showSlug={showSlug}
        onCreated={(row) => setRolls((p) => [...p, row])}
      />
      <StatusEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        rolls={rolls}
        showName={showName}
        episodeNumber={episodeNumber}
        episodeTitle={episodeTitle}
        shootDay={shootDay}
        orgSlug={orgSlug}
        showSlug={showSlug}
        showId={showId}
        episodeId={episodeId}
        onSent={(n) => setSentToast(`Sent to ${n} recipient${n === 1 ? "" : "s"}`)}
      />
    </div>
  );
}
