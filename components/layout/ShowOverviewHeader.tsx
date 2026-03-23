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
    <header className="sticky top-0 z-20 border-b border-[#2a2a2a] bg-[#080808]/90 px-4 py-4 backdrop-blur md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-[#F5F0E8] md:text-xl">
            {showName}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-xs text-[#5a5040]">Episode</label>
            <select
              className="max-w-[min(100%,280px)] rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-2 py-1.5 text-sm text-[#F5F0E8] outline-none focus:border-[#D4A853]"
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
              className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs font-medium text-[#D4A853] transition hover:bg-[#0f0f0f]"
            >
              New episode
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[200px] truncate text-xs text-[#5a5040] sm:inline">
            {userEmail}
          </span>
          <Link
            href="/dashboard"
            className="text-xs text-[#A09880] hover:text-[#F5F0E8]"
          >
            All shows
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
