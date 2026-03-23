"use client";

import { getDeliverableSignedUrl } from "@/app/actions/vfx-sheet";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STATUS_ORDER = [
  "draft",
  "sent",
  "received",
  "approved",
  "rejected",
] as const;

function nextDeliverableStatus(current: string): string {
  const i = STATUS_ORDER.indexOf(current as (typeof STATUS_ORDER)[number]);
  if (i < 0) return "draft";
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

function statusPillClass(status: string): string {
  switch (status) {
    case "approved":
      return "border-emerald-500/50 bg-emerald-950/40 text-emerald-200";
    case "sent":
      return "border-blue-500/50 bg-blue-950/40 text-blue-200";
    case "received":
      return "border-amber-500/50 bg-amber-950/40 text-amber-200";
    case "rejected":
      return "border-red-500/50 bg-red-950/40 text-red-200";
    default:
      return "border-[#3a3a48] bg-[#1a1a24] text-[#A09880]";
  }
}

export type DeliverableRow = {
  id: string;
  episode_id: string;
  type: string;
  version: number;
  status: string;
  file_url: string | null;
  created_by: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export function DeliverableCard({
  d,
  orgSlug,
  showSlug,
  title,
  subtitle,
  showViewShots,
  currentUserId,
  onStatusUpdated,
}: {
  d: DeliverableRow;
  orgSlug: string;
  showSlug: string;
  title: string;
  subtitle?: string;
  showViewShots?: boolean;
  currentUserId: string | null;
  onStatusUpdated: (id: string, status: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState(d.status);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(d.status);
  }, [d.status]);

  const who =
    d.created_by && d.created_by === currentUserId
      ? "You"
      : d.created_by
        ? `…${d.created_by.slice(-6)}`
        : "Member";

  const cycle = async () => {
    const n = nextDeliverableStatus(status);
    setBusy(true);
    setStatus(n);
    const { error } = await supabase
      .from("deliverables")
      .update({ status: n })
      .eq("id", d.id);
    setBusy(false);
    if (error) {
      setStatus(d.status);
      return;
    }
    onStatusUpdated(d.id, n);
  };

  const download = async () => {
    const path = (d.metadata as { storage_path?: string })?.storage_path;
    if (path) {
      const r = await getDeliverableSignedUrl(path);
      if (r.ok && r.url) window.open(r.url, "_blank");
      return;
    }
    if (d.file_url?.startsWith("http")) {
      window.open(d.file_url, "_blank");
    }
  };

  return (
    <motion.div
      layout
      className="rounded-xl border border-[#2a2a2a] bg-[#080808] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[#F5F0E8]">
            {title}{" "}
            <span className="font-mono text-[#A09880]">v{d.version}</span>
          </p>
          {subtitle && (
            <p className="mt-1 text-[11px] text-[#A09880]">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void cycle()}
          className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wide transition-colors ${statusPillClass(status)}`}
        >
          {status}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-[#5a5040]">
        {new Date(d.created_at).toLocaleString()} · {who}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(d.metadata as { storage_path?: string })?.storage_path ||
        d.file_url ? (
          <button
            type="button"
            onClick={() => void download()}
            className="text-xs font-semibold text-[#D4A853] hover:underline"
          >
            Download
          </button>
        ) : null}
        {showViewShots && (
          <Link
            href={`/${orgSlug}/${showSlug}/vfx/shots?deliverable=${d.id}`}
            className="text-xs font-semibold text-[#D4A853] hover:underline"
          >
            View shots
          </Link>
        )}
      </div>
    </motion.div>
  );
}
