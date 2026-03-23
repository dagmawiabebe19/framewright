"use client";

import { logCutVersion } from "@/app/actions/cuts";
import type { CutType } from "@/lib/cut-types";
import { CUT_TYPE_OPTIONS } from "@/lib/cut-types";
import { isStrictTimecodeFf, parseFps, tcToTotalFrames } from "@/lib/tc";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

export type CutVersionRow = {
  id: string;
  episode_id: string;
  version_name: string;
  cut_type: string;
  duration_tc: string | null;
  file_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

const SUGGEST_PREFIX: Record<CutType, string> = {
  assembly: "Assembly",
  editors_cut: "Editor's Cut",
  directors_cut: "Director's Cut",
  producers_cut: "Producer's Cut",
  network_cut: "Network Cut",
  picture_lock: "Picture Lock",
};

function suggestVersionName(type: CutType, existing: CutVersionRow[]): string {
  const n =
    existing.filter((c) => c.cut_type === type).length + 1;
  return `${SUGGEST_PREFIX[type]} v${n}`;
}

export function AddCutModal({
  open,
  onClose,
  onCreated,
  episodeId,
  orgId,
  showId,
  orgSlug,
  showSlug,
  frameRate,
  existingCuts,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (row: CutVersionRow) => void;
  episodeId: string;
  orgId: string;
  showId: string;
  orgSlug: string;
  showSlug: string;
  frameRate: string;
  existingCuts: CutVersionRow[];
}) {
  const fps = useMemo(() => parseFps(frameRate), [frameRate]);
  const [cutType, setCutType] = useState<CutType>("directors_cut");
  const [versionName, setVersionName] = useState("");
  const [durationTc, setDurationTc] = useState("");
  const [tcError, setTcError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCutType("directors_cut");
      setVersionName(suggestVersionName("directors_cut", existingCuts));
      setDurationTc("");
      setTcError(null);
      setNotes("");
      setFile(null);
      setSubmitting(false);
    }
  }, [open, existingCuts]);

  useEffect(() => {
    if (!open) return;
    setVersionName(suggestVersionName(cutType, existingCuts));
  }, [cutType, existingCuts, open]);

  const totalFrames =
    durationTc.trim() && isStrictTimecodeFf(durationTc)
      ? tcToTotalFrames(durationTc, fps)
      : null;

  const onBlurTc = () => {
    if (!durationTc.trim()) {
      setTcError(null);
      return;
    }
    if (!isStrictTimecodeFf(durationTc)) {
      setTcError(
        "Please enter a valid timecode (HH:MM:SS:FF), e.g. 01:42:18:00"
      );
    } else {
      setTcError(null);
    }
  };

  const submit = async () => {
    if (durationTc.trim()) {
      if (!isStrictTimecodeFf(durationTc)) {
        setTcError(
          "Please enter a valid timecode (HH:MM:SS:FF), e.g. 01:42:18:00"
        );
        return;
      }
    }
    setSubmitting(true);
    let storagePath: string | null = null;
    if (file) {
      const safe = versionName.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80);
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${orgId}/${showId}/${episodeId}/cuts/${safe}.${ext}`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("path", path);
      const res = await fetch("/api/storage/upload-deliverable", {
        method: "POST",
        body: fd,
      });
      const j = (await res.json()) as { ok?: boolean; path?: string };
      if (!res.ok || !j.path) {
        setSubmitting(false);
        return;
      }
      storagePath = j.path;
    }

    const cutRes = await logCutVersion({
      orgId,
      showId,
      episodeId,
      orgSlug,
      showSlug,
      cutType,
      versionName: versionName.trim() || suggestVersionName(cutType, existingCuts),
      durationTc: durationTc.trim() || null,
      notes: notes.trim() || null,
      fileUrl: storagePath,
    });

    setSubmitting(false);
    if (!cutRes.ok || !("id" in cutRes)) return;

    onCreated({
      id: cutRes.id,
      episode_id: episodeId,
      version_name: versionName.trim() || suggestVersionName(cutType, existingCuts),
      cut_type: cutType,
      duration_tc: durationTc.trim() || null,
      file_url: storagePath,
      notes: notes.trim() || null,
      created_by: null,
      created_at: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-6 shadow-xl"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
          >
            <h2 className="text-lg font-semibold text-[#F5F0E8]">Log new cut</h2>
            <div className="mt-4 space-y-4 text-sm">
              <label className="block">
                <span className="text-[#A09880]">Cut type</span>
                <select
                  value={cutType}
                  onChange={(e) => setCutType(e.target.value as CutType)}
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-[#F5F0E8]"
                >
                  {CUT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[#A09880]">Version name</span>
                <input
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-[#F5F0E8]"
                />
              </label>
              <label className="block">
                <span className="text-[#A09880]">Duration (TC)</span>
                <input
                  value={durationTc}
                  onChange={(e) => setDurationTc(e.target.value)}
                  onBlur={onBlurTc}
                  placeholder="01:42:18:00"
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 font-mono text-[#F5F0E8]"
                />
                {tcError && (
                  <p className="mt-1 text-xs text-red-400">{tcError}</p>
                )}
                {totalFrames != null && !tcError && (
                  <p className="mt-1 text-xs text-[#5a5040]">
                    ≈ {totalFrames.toFixed(2)} frames @ {fps} fps
                  </p>
                )}
              </label>
              <label className="block">
                <span className="text-[#A09880]">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2 text-[#F5F0E8]"
                />
              </label>
              <label className="block">
                <span className="text-[#A09880]">Reference file (optional)</span>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full text-xs text-[#A09880]"
                />
              </label>
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
                disabled={submitting}
                onClick={() => void submit()}
                className="rounded-lg bg-[#D4A853] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save cut"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
