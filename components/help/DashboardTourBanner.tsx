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
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(calc(100%-2rem),440px)] -translate-x-1/2 rounded-2xl border border-[#D4A853]/40 bg-[#0f0f0f] p-4 shadow-xl">
      <p className="text-sm leading-relaxed text-[#F5F0E8]">
        <span className="font-medium text-[#D4A853]">First time?</span> Open a
        show to run the 2-minute guided tour (sidebar, matrix, VFX, and AI).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={firstShowHref}
          className="rounded-lg bg-[#D4A853] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#E0B86A]"
        >
          Open show →
        </Link>
        <Link
          href="/help"
          className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-sm text-[#A09880] hover:border-[#D4A853]/40 hover:text-[#F5F0E8]"
        >
          Help center
        </Link>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(BANNER_KEY, "1");
            setVisible(false);
          }}
          className="ml-auto text-xs text-[#5a5040] hover:text-[#A09880]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
