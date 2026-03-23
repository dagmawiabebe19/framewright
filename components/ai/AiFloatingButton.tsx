"use client";

import { createClient } from "@/lib/supabase/client";
import { useAiStore } from "@/lib/stores/aiStore";
import { useEffect, useMemo, useState } from "react";

const ALERT_ACTIONS = [
  "vfx_sheet_generated",
  "cut_version_logged",
  "deadline_warning_sent",
  "digest_sent",
  "dailies_email_sent",
];

export function AiFloatingButton() {
  const toggle = useAiStore((s) => s.toggle);
  const showId = useAiStore((s) => s.showId);
  const [pulse, setPulse] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!showId) {
      setPulse(false);
      return;
    }
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    void (async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("action")
        .eq("show_id", showId)
        .gte("created_at", since)
        .limit(50);
      const hit = data?.some((r) => ALERT_ACTIONS.includes(r.action));
      setPulse(!!hit);
    })();
  }, [showId, supabase]);

  return (
    <button
      type="button"
      title="Ask AI  ⌘K"
      onClick={() => toggle()}
      className={`fixed bottom-6 right-6 z-[90] flex h-12 w-12 items-center justify-center rounded-full bg-[#6c63ff] text-white shadow-[0_4px_12px_rgba(108,99,255,0.4)] transition hover:scale-105 hover:shadow-[0_6px_16px_rgba(108,99,255,0.55)] active:scale-[0.97] ${
        pulse ? "animate-pulse" : ""
      }`}
      aria-label="Open AI assistant"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 2l1.09 3.36L16.5 4.5l-1.86 2.86L19 9l-3.36.64L16.5 13 14 10.5 10.5 13l.86-3.36L8 9l3.36-.64L9.5 4.5 12 2zM6 14l.82 2.5 2.5-.68-1.36 2.09 2.54 1.09-2.5.82.68 2.5-2.09-1.36-1.09 2.54L6 19.5l-.82-2.5-2.5.68 1.36-2.09L1.41 14l2.5-.82L3.23 11l2.09 1.36L6 14z" />
      </svg>
    </button>
  );
}
