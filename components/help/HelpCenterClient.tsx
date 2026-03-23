"use client";

import { resetOnboardingTourForReplay } from "@/components/help/OnboardingTour";
import { HELP_ARTICLES, searchHelpArticles } from "@/lib/help/registry";
import Link from "next/link";
import { useMemo, useState } from "react";

export function HelpCenterClient() {
  const [q, setQ] = useState("");
  const results = useMemo(() => searchHelpArticles(q), [q]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#6c63ff]">
        FRAMEWRIGHT
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[#f1f0f0]">
        Help Center
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#9998b0]">
        Guides for shows, editorial, VFX, and deliverables. Search below or
        browse by topic.
      </p>

      <div className="mt-8">
        <label className="block text-xs font-medium text-[#5f5e70]">
          Search articles
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="dailies, VFX sheet, invites…"
          className="mt-2 w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-4 py-3 text-[#f1f0f0] outline-none transition focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/25"
        />
      </div>

      <section className="mt-10 rounded-2xl border border-[#6c63ff]/35 bg-[#6c63ff]/10 p-6">
        <h2 className="text-sm font-semibold text-[#f1f0f0]">
          New to FRAMEWRIGHT? Start here
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#9998b0]">
          Take the interactive tour the first time you open a show, or replay it
          anytime.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/help/getting-started"
            className="rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7b73ff]"
          >
            Read quick start →
          </Link>
          <button
            type="button"
            onClick={() => {
              resetOnboardingTourForReplay();
              window.location.href = "/dashboard";
            }}
            className="rounded-lg border border-[#2a2a3e] px-4 py-2 text-sm text-[#9998b0] hover:border-[#6c63ff]/50 hover:text-[#f1f0f0]"
          >
            Replay onboarding tour
          </button>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5f5e70]">
          {q.trim() ? "Matching articles" : "All articles"}
        </h2>
        {results.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-8 text-center">
            <p className="text-sm text-[#9998b0]">No articles match that search.</p>
            <p className="mt-3 text-sm text-[#5f5e70]">
              Try asking the AI assistant on any show page (⌘K) with your
              production question.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {results.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="block rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-5 transition hover:-translate-y-0.5 hover:border-[#6c63ff]/40"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6c63ff]">
                    {a.section}
                  </p>
                  <p className="mt-2 text-lg font-medium text-[#f1f0f0]">
                    {a.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#9998b0]">
                    {a.summary}
                  </p>
                  <p className="mt-3 text-xs text-[#5f5e70]">
                    {a.readMinutes} min read
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14 border-t border-[#2a2a3e] pt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5f5e70]">
          Deliverables
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#9998b0]">
          Sound turnovers, music cue sheets, and change lists are on the roadmap.
          Use the deliverables matrix on your show overview to track what exists
          today.
        </p>
        <Link
          href="/help/deliverables-overview"
          className="mt-4 inline-block text-sm font-medium text-[#6c63ff] hover:underline"
        >
          Deliverables overview →
        </Link>
      </section>
    </div>
  );
}
