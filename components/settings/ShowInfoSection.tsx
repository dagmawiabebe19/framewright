"use client";

import {
  updateEpisodeDatesAction,
  updateShowBasicsAction,
} from "@/app/[orgSlug]/[showSlug]/settings/actions";
import { useEffect, useState } from "react";

const FRAME_RATES = [
  "23.976",
  "24",
  "25",
  "29.97",
  "29.97 DF",
  "29.97 NDF",
  "47.952",
  "48",
  "50",
  "59.94",
];

export type EpisodeDateRow = {
  id: string;
  episode_number: string;
  title: string;
  picture_lock_date: string | null;
  delivery_date: string | null;
};

function dateInputValue(d: string | null) {
  if (!d) return "";
  return d.length >= 10 ? d.slice(0, 10) : d;
}

export function ShowInfoSection({
  orgSlug,
  showSlug,
  initialName,
  initialFrameRate,
  episodes,
}: {
  orgSlug: string;
  showSlug: string;
  initialName: string;
  initialFrameRate: string;
  episodes: EpisodeDateRow[];
}) {
  const [name, setName] = useState(initialName);
  const [frameRate, setFrameRate] = useState(initialFrameRate);
  const [useCustomFrameRate, setUseCustomFrameRate] = useState(
    () => !FRAME_RATES.includes(initialFrameRate)
  );
  const [showSaving, setShowSaving] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  const [epState, setEpState] = useState<
    Record<
      string,
      { picture_lock_date: string; delivery_date: string; saving: boolean; error: string | null }
    >
  >(() => {
    const m: Record<
      string,
      { picture_lock_date: string; delivery_date: string; saving: boolean; error: string | null }
    > = {};
    for (const e of episodes) {
      m[e.id] = {
        picture_lock_date: dateInputValue(e.picture_lock_date),
        delivery_date: dateInputValue(e.delivery_date),
        saving: false,
        error: null,
      };
    }
    return m;
  });

  useEffect(() => {
    setName(initialName);
    setFrameRate(initialFrameRate);
    setUseCustomFrameRate(!FRAME_RATES.includes(initialFrameRate));
  }, [initialName, initialFrameRate]);

  useEffect(() => {
    const m: typeof epState = {};
    for (const e of episodes) {
      m[e.id] = {
        picture_lock_date: dateInputValue(e.picture_lock_date),
        delivery_date: dateInputValue(e.delivery_date),
        saving: false,
        error: null,
      };
    }
    setEpState(m);
  }, [episodes]);

  async function saveShow() {
    setShowSaving(true);
    setShowError(null);
    const resolvedRate = frameRate.trim() || "23.976";
    const res = await updateShowBasicsAction(orgSlug, showSlug, {
      name,
      frame_rate: resolvedRate,
    });
    setShowSaving(false);
    if (!res.ok) setShowError(res.error);
  }

  async function saveEpisode(epId: string) {
    const row = epState[epId];
    if (!row) return;
    setEpState((p) => ({
      ...p,
      [epId]: { ...p[epId], saving: true, error: null },
    }));
    const res = await updateEpisodeDatesAction(orgSlug, showSlug, epId, {
      picture_lock_date: row.picture_lock_date.trim() || null,
      delivery_date: row.delivery_date.trim() || null,
    });
    setEpState((p) => ({
      ...p,
      [epId]: { ...p[epId], saving: false, error: res.ok ? null : res.error },
    }));
  }

  const customRate =
    frameRate && !FRAME_RATES.includes(frameRate) ? frameRate : "";

  return (
    <section className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6">
      <h2 className="text-lg font-semibold text-[#f1f0f0]">Show info</h2>
      <p className="mt-1 text-sm text-[#5f5e70]">
        Show identity, frame rate, and milestone dates by episode. Save each
        section when you are done editing.
      </p>

      <div className="mt-6 space-y-4 border-b border-[#2a2a3e] pb-8">
        <h3 className="text-sm font-medium text-[#f1f0f0]">Show details</h3>
        <label className="block space-y-1">
          <span className="text-xs text-[#9998b0]">Show name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-sm text-[#f1f0f0]"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-[#9998b0]">Frame rate</span>
          <select
            value={useCustomFrameRate ? "__custom__" : frameRate}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__custom__") {
                setUseCustomFrameRate(true);
              } else {
                setUseCustomFrameRate(false);
                setFrameRate(v);
              }
            }}
            className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-sm text-[#f1f0f0]"
          >
            {FRAME_RATES.map((r) => (
              <option key={r} value={r}>
                {r} fps
              </option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
        </label>
        {useCustomFrameRate && (
          <label className="block space-y-1">
            <span className="text-xs text-[#9998b0]">Custom frame rate</span>
            <input
              value={frameRate}
              onChange={(e) => setFrameRate(e.target.value)}
              placeholder="e.g. 23.976"
              className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-sm text-[#f1f0f0]"
            />
          </label>
        )}
        {showError && (
          <p className="text-sm text-red-300" role="alert">
            {showError}
          </p>
        )}
        <button
          type="button"
          disabled={showSaving}
          onClick={() => void saveShow()}
          className="rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {showSaving ? "Saving…" : "Save show details"}
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-[#f1f0f0]">
          Episode milestone dates
        </h3>
        <p className="mt-1 text-xs text-[#5f5e70]">
          Picture lock and delivery targets per episode.
        </p>
        <p className="mt-1 text-xs text-[#5f5e70]">
          Dates apply to each episode independently.
        </p>
        {episodes.length === 0 ? (
          <p className="mt-4 text-sm text-[#9998b0]">
            No episodes yet. Add episodes from the Episodes hub.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {episodes.map((ep) => {
              const row = epState[ep.id];
              if (!row) return null;
              return (
                <li
                  key={ep.id}
                  className="rounded-xl border border-[#2a2a3e] bg-[#0a0a12] p-4"
                >
                  <p className="text-sm font-medium text-[#f1f0f0]">
                    Ep {ep.episode_number}
                    <span className="ml-2 font-normal text-[#9998b0]">
                      {ep.title}
                    </span>
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="text-[11px] text-[#5f5e70]">
                        Picture lock
                      </span>
                      <input
                        type="date"
                        value={row.picture_lock_date}
                        onChange={(e) =>
                          setEpState((p) => ({
                            ...p,
                            [ep.id]: {
                              ...p[ep.id],
                              picture_lock_date: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-[#2a2a3e] bg-[#12121e] px-3 py-2 text-sm text-[#f1f0f0]"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-[#5f5e70]">
                        Delivery
                      </span>
                      <input
                        type="date"
                        value={row.delivery_date}
                        onChange={(e) =>
                          setEpState((p) => ({
                            ...p,
                            [ep.id]: {
                              ...p[ep.id],
                              delivery_date: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-[#2a2a3e] bg-[#12121e] px-3 py-2 text-sm text-[#f1f0f0]"
                      />
                    </label>
                  </div>
                  {row.error && (
                    <p className="mt-2 text-xs text-red-300">{row.error}</p>
                  )}
                  <button
                    type="button"
                    disabled={row.saving}
                    onClick={() => void saveEpisode(ep.id)}
                    className="mt-3 rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-xs font-medium text-[#6c63ff] disabled:opacity-40"
                  >
                    {row.saving ? "Saving…" : "Save episode dates"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
