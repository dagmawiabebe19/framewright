"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const TOUR_KEY = "framewright_tour_completed";
const BANNER_KEY = "fw_tour_banner_dismissed";

export function DashboardTourBanner({
  firstShowHref,
}: {
  firstShowHref: string | null;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!firstShowHref || typeof window === "undefined") return;
    if (localStorage.getItem(TOUR_KEY)) return;
    if (sessionStorage.getItem(BANNER_KEY)) return;
    setVisible(true);
  }, [firstShowHref]);

  if (!visible || !firstShowHref) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(calc(100%-2rem),440px)] -translate-x-1/2 rounded-2xl border border-[#6c63ff]/40 bg-[#12121e] p-4 shadow-xl">
      <p className="text-sm leading-relaxed text-[#f1f0f0]">
        <span className="font-medium text-[#6c63ff]">First time?</span> Open a
        show to run the 2-minute guided tour (sidebar, matrix, VFX, and AI).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={firstShowHref}
          className="rounded-lg bg-[#6c63ff] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#7b73ff]"
        >
          Open show →
        </Link>
        <Link
          href="/help"
          className="rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-sm text-[#9998b0] hover:border-[#6c63ff]/40 hover:text-[#f1f0f0]"
        >
          Help center
        </Link>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(BANNER_KEY, "1");
            setVisible(false);
          }}
          className="ml-auto text-xs text-[#5f5e70] hover:text-[#9998b0]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
