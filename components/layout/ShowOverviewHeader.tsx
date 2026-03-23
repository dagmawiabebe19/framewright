"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export type EpisodeOption = {
  id: string;
  episode_number: string;
  title: string;
};

export function ShowOverviewHeader({
  showName,
  orgSlug,
  showSlug,
  episodes,
  userEmail,
}: {
  showName: string;
  orgSlug: string;
  showSlug: string;
  episodes: EpisodeOption[];
  userEmail?: string | null;
}) {
  const router = useRouter();
  const base = `/${orgSlug}/${showSlug}`;

  return (
    <header className="sticky top-0 z-20 border-b border-[#2a2a3e] bg-[#0a0a12]/90 px-4 py-4 backdrop-blur md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-[#f1f0f0] md:text-xl">
            {showName}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-xs text-[#5f5e70]">Episode</label>
            <select
              className="max-w-[min(100%,280px)] rounded-lg border border-[#2a2a3e] bg-[#12121e] px-2 py-1.5 text-sm text-[#f1f0f0] outline-none focus:border-[#6c63ff]"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id) router.push(`${base}/episodes/${id}`);
              }}
            >
              <option value="">Jump to episode hub…</option>
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.episode_number} — {ep.title}
                </option>
              ))}
            </select>
            <Link
              href={`${base}/episodes`}
              className="rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-xs font-medium text-[#6c63ff] transition hover:bg-[#12121e]"
            >
              New episode
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[200px] truncate text-xs text-[#5f5e70] sm:inline">
            {userEmail}
          </span>
          <Link
            href="/dashboard"
            className="text-xs text-[#9998b0] hover:text-[#f1f0f0]"
          >
            All shows
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
