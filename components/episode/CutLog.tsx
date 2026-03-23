"use client";

import { getDeliverableSignedUrl } from "@/app/actions/vfx-sheet";
import { cutTypeLabel } from "@/lib/cut-types";
import { createClient } from "@/lib/supabase/client";
import { validateTcFormat } from "@/lib/tc";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddCutModal, type CutVersionRow } from "./AddCutModal";
import { CutNoteItem, type CutNoteRow } from "./CutNoteItem";

function badgeClass(cutType: string): string {
  switch (cutType) {
    case "assembly":
      return "border-[#3a3a48] bg-[#1e1e2a] text-[#b8b8c8]";
    case "editors_cut":
      return "border-blue-500/40 bg-blue-950/30 text-blue-200";
    case "directors_cut":
      return "border-[#D4A853]/50 bg-[#1a1a1a] text-[#c4b5fd]";
    case "producers_cut":
      return "border-amber-500/40 bg-amber-950/30 text-amber-200";
    case "network_cut":
      return "border-teal-500/40 bg-teal-950/30 text-teal-200";
    case "picture_lock":
      return "border-emerald-500/60 bg-emerald-950/20 text-emerald-200 font-semibold ring-2 ring-emerald-500/30";
    default:
      return "border-[#2a2a2a] text-[#A09880]";
  }
}

const DEPS = [
  "Editorial",
  "VFX",
  "Sound",
  "Color",
  "Music",
  "Producer",
] as const;

function shortCreator(
  createdBy: string | null,
  currentUserId: string | null
): string {
  if (!createdBy) return "Member";
  if (currentUserId && createdBy === currentUserId) return "You";
  return `…${createdBy.slice(-6)}`;
}

export function CutLog({
  episodeId,
  orgId,
  showId,
  orgSlug,
  showSlug,
  frameRate,
  cuts: cutsProp,
  currentUserId,
  onCutsChange,
}: {
  episodeId: string;
  orgId: string;
  showId: string;
  orgSlug: string;
  showSlug: string;
  frameRate: string;
  cuts: CutVersionRow[];
  currentUserId: string | null;
  onCutsChange: (next: CutVersionRow[]) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [notesByCut, setNotesByCut] = useState<Record<string, CutNoteRow[]>>({});
  const [loadingNotes, setLoadingNotes] = useState<Record<string, boolean>>({});
  const [addNoteOpen, setAddNoteOpen] = useState<Record<string, boolean>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, { tc: string; dep: string; body: string }>>({});

  const cutIds = useMemo(() => cutsProp.map((c) => c.id), [cutsProp]);
  const loadNotes = useCallback(
    async (cutVersionId: string) => {
      setLoadingNotes((p) => ({ ...p, [cutVersionId]: true }));
      const { data } = await supabase
        .from("cut_notes")
        .select("*")
        .eq("cut_version_id", cutVersionId)
        .order("created_at", { ascending: true });
      setLoadingNotes((p) => ({ ...p, [cutVersionId]: false }));
      if (data) {
        setNotesByCut((p) => ({
          ...p,
          [cutVersionId]: data as CutNoteRow[],
        }));
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!cutIds.length) return;
    const filter = `cut_version_id=in.(${cutIds.join(",")})`;
    const channel = supabase
      .channel(`cut-notes-${episodeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cut_notes",
          filter,
        },
        (payload) => {
          const cv =
            (payload.new as { cut_version_id?: string } | null)?.cut_version_id ??
            (payload.old as { cut_version_id?: string } | null)?.cut_version_id;
          if (cv) void loadNotes(cv);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, episodeId, cutIds, loadNotes]);

  const toggleExpand = async (id: string) => {
    const next = !expanded[id];
    setExpanded((p) => ({ ...p, [id]: next }));
    if (next && !notesByCut[id]) await loadNotes(id);
  };

  const downloadRef = async (fileUrl: string | null) => {
    if (!fileUrl) return;
    if (fileUrl.startsWith("http")) {
      window.open(fileUrl, "_blank");
      return;
    }
    const r = await getDeliverableSignedUrl(fileUrl);
    if (r.ok && r.url) window.open(r.url, "_blank");
  };

  const submitNote = async (cutVersionId: string) => {
    const d = noteDraft[cutVersionId] ?? { tc: "", dep: "Editorial", body: "" };
    if (!d.body.trim()) return;
    if (d.tc.trim() && !validateTcFormat(d.tc)) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("cut_notes")
      .insert({
        cut_version_id: cutVersionId,
        tc: d.tc.trim() || null,
        department: d.dep,
        note: d.body.trim(),
        status: "open",
        created_by: user.id,
      })
      .select()
      .single();
    if (!error && data) {
      setNotesByCut((p) => ({
        ...p,
        [cutVersionId]: [...(p[cutVersionId] ?? []), data as CutNoteRow],
      }));
      setNoteDraft((p) => ({
        ...p,
        [cutVersionId]: { tc: "", dep: d.dep, body: "" },
      }));
      setAddNoteOpen((p) => ({ ...p, [cutVersionId]: false }));
    }
  };

  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#F5F0E8]">Cut log</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full bg-[#D4A853] px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          Log new cut
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {cutsProp.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#2a2a2a] bg-[#080808] px-4 py-8 text-center">
            <p className="text-sm text-[#A09880]">No cuts logged yet</p>
            <p className="mt-1 text-xs text-[#5a5040]">
              Log your first cut when the assembly is ready
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-full border border-[#D4A853] px-4 py-2 text-xs font-semibold text-[#D4A853]"
            >
              Log first cut
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {cutsProp.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-[#2a2a2a] bg-[#080808] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${badgeClass(c.cut_type)}`}
                  >
                    {cutTypeLabel(c.cut_type)}
                  </span>
                  <span className="font-medium text-[#F5F0E8]">
                    {c.version_name}
                  </span>
                </div>
                {c.file_url && (
                  <button
                    type="button"
                    onClick={() => void downloadRef(c.file_url)}
                    className="text-[11px] font-semibold text-[#D4A853] hover:underline"
                  >
                    Reference
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-[#A09880]">
                <span className="font-mono text-[#F5F0E8]">
                  {c.duration_tc ?? "—"}
                </span>
                <span className="text-[#5a5040]"> · </span>
                {new Date(c.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                <span className="text-[#5a5040]"> · </span>
                {shortCreator(c.created_by, currentUserId)}
              </p>
              {c.notes && (
                <p className="mt-2 line-clamp-2 text-xs text-[#b8b8c8]">
                  Notes: {c.notes}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void toggleExpand(c.id)}
                  className="text-[11px] font-semibold text-[#D4A853] hover:underline"
                >
                  {expanded[c.id] ? "Hide notes ↑" : "View notes ↓"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAddNoteOpen((p) => ({ ...p, [c.id]: !p[c.id] }))
                  }
                  className="text-[11px] text-[#A09880] hover:text-[#F5F0E8]"
                >
                  Add note to this cut
                </button>
              </div>

              {addNoteOpen[c.id] && (
                <div className="mt-3 space-y-2 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] p-3">
                  <input
                    placeholder="TC HH:MM:SS:FF"
                    value={noteDraft[c.id]?.tc ?? ""}
                    onChange={(e) =>
                      setNoteDraft((p) => ({
                        ...p,
                        [c.id]: {
                          tc: e.target.value,
                          dep: p[c.id]?.dep ?? "Editorial",
                          body: p[c.id]?.body ?? "",
                        },
                      }))
                    }
                    className="w-full rounded border border-[#2a2a2a] bg-[#080808] px-2 py-1 font-mono text-[11px] text-[#F5F0E8]"
                  />
                  <select
                    value={noteDraft[c.id]?.dep ?? "Editorial"}
                    onChange={(e) =>
                      setNoteDraft((p) => ({
                        ...p,
                        [c.id]: {
                          tc: p[c.id]?.tc ?? "",
                          dep: e.target.value,
                          body: p[c.id]?.body ?? "",
                        },
                      }))
                    }
                    className="w-full rounded border border-[#2a2a2a] bg-[#080808] px-2 py-1 text-[11px] text-[#F5F0E8]"
                  >
                    {DEPS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Note"
                    rows={2}
                    value={noteDraft[c.id]?.body ?? ""}
                    onChange={(e) =>
                      setNoteDraft((p) => ({
                        ...p,
                        [c.id]: {
                          tc: p[c.id]?.tc ?? "",
                          dep: p[c.id]?.dep ?? "Editorial",
                          body: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded border border-[#2a2a2a] bg-[#080808] px-2 py-1 text-[11px] text-[#F5F0E8]"
                  />
                  <button
                    type="button"
                    onClick={() => void submitNote(c.id)}
                    className="rounded bg-[#D4A853] px-3 py-1 text-[11px] font-semibold text-white"
                  >
                    Save note
                  </button>
                </div>
              )}

              {expanded[c.id] && (
                <div className="mt-3 space-y-2 border-t border-[#2a2a2a] pt-3">
                  {loadingNotes[c.id] && (
                    <p className="text-[11px] text-[#5a5040]">Loading…</p>
                  )}
                  {(notesByCut[c.id] ?? []).map((n) => (
                    <CutNoteItem
                      key={n.id}
                      note={n}
                      currentUserId={currentUserId}
                      onUpdated={(row) =>
                        setNotesByCut((p) => ({
                          ...p,
                          [c.id]: (p[c.id] ?? []).map((x) =>
                            x.id === row.id ? row : x
                          ),
                        }))
                      }
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AddCutModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        episodeId={episodeId}
        orgId={orgId}
        showId={showId}
        orgSlug={orgSlug}
        showSlug={showSlug}
        frameRate={frameRate}
        existingCuts={cutsProp}
        onCreated={(row) => onCutsChange([row, ...cutsProp])}
      />
    </div>
  );
}
