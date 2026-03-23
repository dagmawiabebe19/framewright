"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

const STATUS_CYCLE = [
  "open",
  "implemented",
  "deferred",
  "rejected",
] as const;

export type CutNoteRow = {
  id: string;
  cut_version_id: string;
  tc: string | null;
  department: string | null;
  note: string;
  status: string;
  created_by: string | null;
  created_at: string;
};

function nextStatus(current: string): string {
  const i = STATUS_CYCLE.indexOf(current as (typeof STATUS_CYCLE)[number]);
  if (i < 0) return "open";
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

function statusPillClass(status: string): string {
  switch (status) {
    case "open":
      return "border-red-500/50 bg-red-950/40 text-red-200";
    case "implemented":
      return "border-emerald-500/50 bg-emerald-950/40 text-emerald-200";
    case "deferred":
      return "border-[#3a3a48] bg-[#1a1a24] text-[#A09880]";
    case "rejected":
      return "border-[#3a3a48] bg-[#1a1a24] text-[#5a5040] line-through";
    default:
      return "border-[#2a2a2a] text-[#A09880]";
  }
}

export function CutNoteItem({
  note,
  currentUserId,
  onUpdated,
}: {
  note: CutNoteRow;
  currentUserId: string | null;
  onUpdated?: (row: CutNoteRow) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState(note.status);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(note.status);
  }, [note.status]);

  const who =
    note.created_by && note.created_by === currentUserId
      ? "You"
      : note.created_by
        ? `…${note.created_by.slice(-6)}`
        : "Member";

  const cycle = async () => {
    const n = nextStatus(status);
    setBusy(true);
    setStatus(n);
    const { data, error } = await supabase
      .from("cut_notes")
      .update({ status: n })
      .eq("id", note.id)
      .select()
      .single();
    setBusy(false);
    if (error) {
      setStatus(note.status);
      return;
    }
    if (data) onUpdated?.(data as CutNoteRow);
  };

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-[11px] text-[#c4c4d4]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[#D4A853]">{note.tc ?? "—"}</span>
        <span className="text-[#5a5040]">·</span>
        <span>{note.department ?? "—"}</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void cycle()}
          className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusPillClass(status)}`}
        >
          {status}
        </button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[#F5F0E8]">{note.note}</p>
      <p className="mt-2 text-[10px] text-[#5a5040]">
        {who} · {new Date(note.created_at).toLocaleString()}
      </p>
    </div>
  );
}
