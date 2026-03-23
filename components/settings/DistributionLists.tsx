"use client";

import {
  type DistributionListsState,
  updateDistributionListsAction,
} from "@/app/[orgSlug]/[showSlug]/settings/actions";
import { useEffect, useState } from "react";

function EmailListEditor({
  label,
  description,
  emails,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  emails: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const e = input.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (!emails.includes(e)) onChange([...emails, e]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-[#f1f0f0]">{label}</p>
        <p className="text-xs text-[#5f5e70]">{description}</p>
      </div>
      <div className="flex min-h-[40px] flex-wrap gap-2 rounded-lg border border-[#2a2a3e] bg-[#0a0a12] p-2">
        {emails.map((e) => (
          <span
            key={e}
            className="inline-flex items-center gap-1 rounded-full bg-[#1a1a2e] px-2 py-0.5 text-[11px] text-[#f1f0f0]"
          >
            {e}
            <button
              type="button"
              disabled={disabled}
              className="text-[#9998b0] hover:text-red-300 disabled:opacity-40"
              onClick={() => onChange(emails.filter((x) => x !== e))}
              aria-label={`Remove ${e}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          disabled={disabled}
          onChange={(ev) => setInput(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              add();
            }
          }}
          placeholder="email@company.com"
          className="flex-1 rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-1.5 text-sm text-[#f1f0f0] disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={add}
          className="rounded-lg border border-[#6c63ff]/40 px-3 py-1.5 text-sm text-[#6c63ff] disabled:opacity-40"
        >
          Add email
        </button>
      </div>
    </div>
  );
}

export function DistributionLists({
  orgSlug,
  showSlug,
  initial,
}: {
  orgSlug: string;
  showSlug: string;
  initial: DistributionListsState;
}) {
  const [lists, setLists] = useState<DistributionListsState>(initial);
  const [savingKey, setSavingKey] = useState<
    keyof DistributionListsState | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLists(initial);
  }, [initial]);

  async function save(key: keyof DistributionListsState) {
    const snapshot = { ...lists };
    setSavingKey(key);
    setError(null);
    const res = await updateDistributionListsAction(orgSlug, showSlug, lists);
    setSavingKey(null);
    if (!res.ok) {
      setLists(snapshot);
      setError(res.error);
    }
  }

  return (
    <section className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6">
      <h2 className="text-lg font-semibold text-[#f1f0f0]">
        Distribution lists
      </h2>
      <p className="mt-1 text-sm text-[#5f5e70]">
        Who receives automated emails for this show.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="mt-6 space-y-8">
        <div className="space-y-3">
          <EmailListEditor
            label="Dailies recipients"
            description="Receives the daily status email from the dailies board."
            emails={lists.dailies}
            disabled={savingKey !== null}
            onChange={(dailies) => setLists((p) => ({ ...p, dailies }))}
          />
          <button
            type="button"
            disabled={savingKey !== null}
            onClick={() => void save("dailies")}
            className="rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {savingKey === "dailies" ? "Saving…" : "Save dailies list"}
          </button>
        </div>
        <div className="space-y-3 border-t border-[#2a2a3e] pt-8">
          <EmailListEditor
            label="Cut distribution"
            description="Notified when a new cut is logged (future automation)."
            emails={lists.cuts}
            disabled={savingKey !== null}
            onChange={(cuts) => setLists((p) => ({ ...p, cuts }))}
          />
          <button
            type="button"
            disabled={savingKey !== null}
            onClick={() => void save("cuts")}
            className="rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {savingKey === "cuts" ? "Saving…" : "Save cut list"}
          </button>
        </div>
        <div className="space-y-3 border-t border-[#2a2a3e] pt-8">
          <EmailListEditor
            label="Deadline alerts"
            description="Receives picture lock and delivery warning emails."
            emails={lists.deadlines}
            disabled={savingKey !== null}
            onChange={(deadlines) => setLists((p) => ({ ...p, deadlines }))}
          />
          <button
            type="button"
            disabled={savingKey !== null}
            onClick={() => void save("deadlines")}
            className="rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {savingKey === "deadlines" ? "Saving…" : "Save deadline list"}
          </button>
        </div>
      </div>
    </section>
  );
}
