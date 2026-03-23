"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

export function HelpTip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#D4A853]/30 bg-[#D4A853]/10 p-4 text-sm leading-relaxed text-[#e8e6ff]">
      <span className="font-semibold text-[#c4b5fd]">Tip: </span>
      {children}
    </div>
  );
}

export function HelpArticle({
  title,
  readMinutes,
  children,
  related = [],
}: {
  title: string;
  readMinutes: number;
  children: ReactNode;
  related?: { href: string; title: string }[];
}) {
  const [fb, setFb] = useState<"up" | "down" | null>(null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
      <Link
        href="/help"
        className="text-sm font-medium text-[#D4A853] hover:underline"
      >
        ← Help center
      </Link>
      <h1 className="mt-6 text-3xl font-semibold leading-tight text-[#F5F0E8]">
        {title}
      </h1>
      <p className="mt-2 text-sm text-[#5a5040]">{readMinutes} min read</p>

      <div className="mt-10 space-y-6 text-sm leading-[1.8] text-[#c4c4d4]">
        {children}
      </div>

      <div className="mt-12 rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-5">
        <p className="text-sm text-[#A09880]">Was this helpful?</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setFb("up")}
            disabled={fb !== null}
            className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-sm text-[#F5F0E8] hover:border-[#D4A853]/50 disabled:opacity-50"
          >
            👍 Yes
          </button>
          <button
            type="button"
            onClick={() => setFb("down")}
            disabled={fb !== null}
            className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-sm text-[#F5F0E8] hover:border-[#D4A853]/50 disabled:opacity-50"
          >
            👎 Not really
          </button>
        </div>
        {fb && (
          <p className="mt-3 text-xs text-[#5a5040]">Thanks for the feedback.</p>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-[#F5F0E8]">Related</h2>
          <ul className="mt-3 space-y-2">
            {related.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.href}
                  className="text-sm text-[#D4A853] hover:underline"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
