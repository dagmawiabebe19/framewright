"use client";

import { createDailiesRoll } from "@/app/actions/dailies";
import type { DailiesRollRow } from "./DailiesBoard";
import { useState } from "react";

export function AddRollModal({
  open,
  onClose,
  episodeId,
  shootDay,
  orgSlug,
  showSlug,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  episodeId: string;
  shootDay: number;
  orgSlug: string;
  showSlug: string;
  onCreated: (row: DailiesRollRow) => void;
}) {
  const [rollName, setRollName] = useState("");
  const [camera, setCamera] = useState("");
  const [cardCount, setCardCount] = useState(1);
  const [shootDate, setShootDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-[#F5F0E8]">Add roll</h2>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-[#A09880]">Roll name</span>
            <input
              value={rollName}
              onChange={(e) => setRollName(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 font-mono text-[#F5F0E8]"
              placeholder="A012"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[#A09880]">Camera</span>
            <input
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-[#F5F0E8]"
              placeholder="ARRI LF A"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[#A09880]">Card count</span>
            <input
              type="number"
              min={1}
              value={cardCount}
              onChange={(e) =>
                setCardCount(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-[#F5F0E8]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[#A09880]">Shoot date</span>
            <input
              type="date"
              value={shootDate}
              onChange={(e) => setShootDate(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-[#F5F0E8]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[#A09880]">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-[#F5F0E8]"
            />
          </label>
          {err && <p className="text-sm text-red-300">{err}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#A09880]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setErr(null);
              if (!rollName.trim() || !camera.trim()) {
                setErr("Roll name and camera are required.");
                return;
              }
              setBusy(true);
              const res = await createDailiesRoll({
                episodeId,
                rollName: rollName.trim(),
                camera: camera.trim(),
                cardCount,
                shootDate,
                shootDay,
                notes: notes.trim() || undefined,
                orgSlug,
                showSlug,
              });
              setBusy(false);
              if (!res.ok) {
                setErr((res as { error?: string }).error ?? "Failed");
                return;
              }
              onCreated({
                id: res.id,
                roll_name: rollName.trim(),
                camera: camera.trim(),
                card_count: cardCount,
                shoot_date: shootDate,
                shoot_day: shootDay,
                status: "expected",
                notes: notes.trim() || null,
              });
              onClose();
            }}
            className="rounded-lg bg-[#D4A853] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
