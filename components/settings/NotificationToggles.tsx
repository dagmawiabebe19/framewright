"use client";

import {
  type NotificationPrefsState,
  updateNotificationPrefsAction,
} from "@/app/[orgSlug]/[showSlug]/settings/actions";
import { useEffect, useState } from "react";

const DEFAULTS: NotificationPrefsState = {
  digest: true,
  deadlines: true,
  vfx_updates: false,
  cut_versions: true,
};

function mergePrefs(raw: unknown): NotificationPrefsState {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const o = raw as Record<string, unknown>;
  return {
    digest: typeof o.digest === "boolean" ? o.digest : DEFAULTS.digest,
    deadlines: typeof o.deadlines === "boolean" ? o.deadlines : DEFAULTS.deadlines,
    vfx_updates:
      typeof o.vfx_updates === "boolean" ? o.vfx_updates : DEFAULTS.vfx_updates,
    cut_versions:
      typeof o.cut_versions === "boolean"
        ? o.cut_versions
        : DEFAULTS.cut_versions,
  };
}

function ToggleRow({
  label,
  description,
  on,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#F5F0E8]">{label}</p>
        <p className="text-xs text-[#5a5040]">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          on ? "bg-[#D4A853]" : "bg-[#2a2a2a]"
        } disabled:opacity-40`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
            on ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function NotificationToggles({
  orgSlug,
  showSlug,
  initial,
}: {
  orgSlug: string;
  showSlug: string;
  initial: unknown;
}) {
  const [prefs, setPrefs] = useState<NotificationPrefsState>(() =>
    mergePrefs(initial)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(mergePrefs(initial));
  }, [initial]);

  async function save() {
    const snapshot = { ...prefs };
    setSaving(true);
    setError(null);
    const res = await updateNotificationPrefsAction(orgSlug, showSlug, prefs);
    setSaving(false);
    if (!res.ok) {
      setPrefs(snapshot);
      setError(res.error);
    }
  }

  return (
    <section className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-6">
      <h2 className="text-lg font-semibold text-[#F5F0E8]">Notifications</h2>
      <p className="mt-1 text-sm text-[#5a5040]">
        Email preferences for your account on this organization.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 divide-y divide-[#2a2a2a]">
        <ToggleRow
          label="Daily digest"
          description="Morning summary of what needs attention."
          on={prefs.digest}
          disabled={saving}
          onChange={(digest) => setPrefs((p) => ({ ...p, digest }))}
        />
        <ToggleRow
          label="Deadline warnings"
          description="Alerts when picture lock or delivery is a few days out."
          on={prefs.deadlines}
          disabled={saving}
          onChange={(deadlines) => setPrefs((p) => ({ ...p, deadlines }))}
        />
        <ToggleRow
          label="New cut versions"
          description="When someone logs a new cut (when wired)."
          on={prefs.cut_versions}
          disabled={saving}
          onChange={(cut_versions) => setPrefs((p) => ({ ...p, cut_versions }))}
        />
        <ToggleRow
          label="VFX shot status changes"
          description="Per-shot updates from the VFX board (when wired)."
          on={prefs.vfx_updates}
          disabled={saving}
          onChange={(vfx_updates) => setPrefs((p) => ({ ...p, vfx_updates }))}
        />
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-6 rounded-lg bg-[#D4A853] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save notification preferences"}
      </button>
    </section>
  );
}
