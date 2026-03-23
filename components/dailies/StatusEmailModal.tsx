"use client";

import type { DailiesRollRow } from "@/components/dailies/DailiesBoard";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

type DistLists = { dailies: string[]; cuts: string[]; deadlines: string[] };

function defaultLists(): DistLists {
  return { dailies: [], cuts: [], deadlines: [] };
}

function buildSubject(
  showName: string,
  episodeNumber: string,
  shootDay: number
) {
  return `${showName} Ep${episodeNumber} Dailies — Shoot Day ${shootDay} — ${new Date().toLocaleDateString()}`;
}

export function StatusEmailModal({
  open,
  onClose,
  rolls,
  showName,
  episodeNumber,
  episodeTitle,
  shootDay,
  orgSlug,
  showSlug,
  showId,
  episodeId,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  rolls: DailiesRollRow[];
  showName: string;
  episodeNumber: string;
  episodeTitle: string;
  shootDay: number;
  orgSlug: string;
  showSlug: string;
  showId: string;
  episodeId: string;
  onSent?: (recipientCount: number) => void;
}) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [draftEmail, setDraftEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addInput, setAddInput] = useState("");
  const openedRef = useRef(false);

  const fetchRecipients = useCallback(async () => {
    const { data: show } = await createClient()
      .from("shows")
      .select("settings, distribution_lists")
      .eq("id", showId)
      .maybeSingle();

    const lists = (show?.distribution_lists ?? defaultLists()) as DistLists;
    const legacy = (show?.settings ?? {}) as { dailies_recipients?: string[] };
    const dailies =
      lists.dailies?.length > 0
        ? lists.dailies
        : legacy.dailies_recipients ?? [];
    setRecipients(dailies);
  }, [showId]);

  const fetchBody = useCallback(async () => {
    const res = await fetch("/api/ai/dailies-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        showName,
        episodeName: episodeTitle,
        episodeNumber,
        shootDay,
        rolls: rolls.map((r) => ({
          roll_name: r.roll_name,
          camera: r.camera,
          card_count: r.card_count,
          status: r.status,
          notes: r.notes,
        })),
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "Could not draft email.");
    }
    const json = (await res.json()) as { body: string };
    setDraftEmail(json.body ?? "");
    setSubject(buildSubject(showName, episodeNumber, shootDay));
  }, [episodeNumber, episodeTitle, rolls, shootDay, showName]);

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchRecipients();
        await fetchBody();
      } catch {
        setError("Could not draft email.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, fetchRecipients, fetchBody]);

  const regenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchBody();
    } catch {
      setError("Could not draft email.");
    } finally {
      setLoading(false);
    }
  }, [fetchBody]);

  const removeRecipient = (email: string) => {
    setRecipients((r) => r.filter((x) => x !== email));
  };

  const addRecipient = () => {
    const e = addInput.trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (!recipients.includes(e)) setRecipients((r) => [...r, e]);
    setAddInput("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[#2a2a3e] bg-[#12121e] shadow-2xl">
        <div className="border-b border-[#2a2a3e] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#f1f0f0]">
            Send Dailies Status Email
          </h2>
          <p className="text-xs text-[#5f5e70]">
            AI drafts the body — edit recipients and text before sending.
          </p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4 text-sm">
          {loading && (
            <p className="text-[#9998b0]">Drafting with AI…</p>
          )}
          <div>
            <span className="text-[#9998b0]">To</span>
            <div className="mt-2 flex min-h-[40px] flex-wrap gap-2 rounded-lg border border-[#2a2a3e] bg-[#0a0a12] p-2">
              {recipients.map((e) => (
                <span
                  key={e}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1a1a2e] px-2 py-0.5 text-[11px] text-[#f1f0f0]"
                >
                  {e}
                  <button
                    type="button"
                    className="text-[#9998b0] hover:text-red-300"
                    onClick={() => removeRecipient(e)}
                    aria-label={`Remove ${e}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={addInput}
                onChange={(ev) => setAddInput(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    addRecipient();
                  }
                }}
                placeholder="add@email.com"
                className="flex-1 rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-1.5 text-[#f1f0f0]"
              />
              <button
                type="button"
                onClick={addRecipient}
                className="rounded-lg border border-[#6c63ff]/40 px-3 py-1.5 text-[#6c63ff]"
              >
                Add
              </button>
            </div>
            {recipients.length === 0 && !loading && (
              <p className="mt-2 text-xs text-amber-200">
                Add your distribution list in{" "}
                <a
                  href={`/${orgSlug}/${showSlug}/settings`}
                  className="text-[#6c63ff] underline"
                >
                  Settings → Distribution Lists
                </a>
                , or type addresses above.
              </p>
            )}
          </div>
          <label className="block space-y-1">
            <span className="text-[#9998b0]">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-[#f1f0f0]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[#9998b0]">Body</span>
            <textarea
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-[#f1f0f0]"
            />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#2a2a3e] px-6 py-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => void regenerate()}
            className="rounded-lg border border-[#2a2a3e] px-4 py-2 text-sm text-[#9998b0] disabled:opacity-40"
          >
            Regenerate ↺
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2a2a3e] px-4 py-2 text-sm text-[#9998b0]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              !subject ||
              !draftEmail ||
              !recipients.length ||
              loading ||
              sending
            }
            onClick={async () => {
              setError(null);
              setSending(true);
              try {
                const res = await fetch("/api/email/send-dailies-status", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: recipients,
                    subject,
                    body: draftEmail,
                    showId,
                    episodeId,
                    showName,
                  }),
                });
                const j = (await res.json()) as {
                  ok?: boolean;
                  error?: string;
                  sent?: number;
                };
                if (!res.ok || !j.ok) {
                  setError(j.error ?? "Send failed.");
                  return;
                }
                onSent?.(j.sent ?? recipients.length);
                onClose();
              } finally {
                setSending(false);
              }
            }}
            className="rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send →"}
          </button>
        </div>
      </div>
    </div>
  );
}
