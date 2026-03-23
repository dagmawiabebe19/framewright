"use client";

import { createEpisode } from "./actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateEpisodeForm({
  orgSlug,
  showSlug,
}: {
  orgSlug: string;
  showSlug: string;
}) {
  const router = useRouter();
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="h-fit rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage(null);
        const res = await createEpisode({
          orgSlug,
          showSlug,
          episodeNumber,
          title,
        });
        setBusy(false);
        if (!res.ok) {
          setMessage(res.error);
          return;
        }
        setEpisodeNumber("");
        setTitle("");
        setMessage("Episode added.");
        router.refresh();
      }}
    >
      <h2 className="text-sm font-semibold text-[#f1f0f0]">New episode</h2>
      <p className="mt-1 text-xs text-[#5f5e70]">
        Use your room&apos;s standard numbering (e.g. 103 for season one, episode
        three).
      </p>
      <label className="mt-4 block space-y-1 text-sm">
        <span className="text-[#9998b0]">Episode number</span>
        <input
          required
          value={episodeNumber}
          onChange={(e) => setEpisodeNumber(e.target.value)}
          className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 font-mono text-sm text-[#f1f0f0]"
          placeholder="103"
        />
      </label>
      <label className="mt-3 block space-y-1 text-sm">
        <span className="text-[#9998b0]">Working title</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-sm text-[#f1f0f0]"
          placeholder="Cold open + main arc"
        />
      </label>
      {message && (
        <p className="mt-3 text-xs text-[#9998b0]">{message}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-[#6c63ff] py-2.5 text-sm font-semibold text-white hover:bg-[#7b73ff] disabled:opacity-50"
      >
        {busy ? "Saving…" : "Create episode"}
      </button>
    </form>
  );
}
