"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const STORAGE_KEY = "framewright_tour_completed";

type Step = {
  id: string;
  title: string;
  body: string;
  selector?: string;
  primaryLabel?: string;
  showPrev?: boolean;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to FRAMEWRIGHT",
    body: "The operating system for your post production. Let's take about two minutes to show you how it works.",
    primaryLabel: "Let's go →",
  },
  {
    id: "show-select",
    title: "Your show lives here",
    body: "Everything in FRAMEWRIGHT is organized by show. Switch between shows or open another production from this dropdown.",
    selector: '[data-tour="tour-show-select"]',
    showPrev: true,
  },
  {
    id: "episodes",
    title: "Episode overview",
    body: "Each card is an episode. See status, days until picture lock, and deliverable progress at a glance.",
    selector: '[data-tour="tour-episode-strip"]',
    showPrev: true,
  },
  {
    id: "editorial",
    title: "Editorial tools",
    body: "Track dailies, log every cut version, and manage VFX shots — all linked to the same episode.",
    selector: '[data-tour="tour-nav-editorial"]',
    showPrev: true,
  },
  {
    id: "episode-hub",
    title: "The episode hub",
    body: "Open Episodes in the sidebar, then click any episode for its hub — your command center for that episode's entire post journey.",
    selector: '[data-tour="tour-nav-episodes"]',
    showPrev: true,
  },
  {
    id: "matrix",
    title: "Deliverable status at a glance",
    body: "Every deliverable for every episode, in one grid. Green means approved, amber in progress, gray not started.",
    selector: '[data-tour="tour-deliverables-matrix"]',
    showPrev: true,
  },
  {
    id: "vfx-sheets",
    title: "Generate documents instantly",
    body: "Upload an EDL or XML from your NLE and FRAMEWRIGHT builds a production-ready VFX sheet — with thumbnails, standard IDs, and technical columns when you add reference video.",
    selector: '[data-tour="tour-nav-vfx-sheets"]',
    showPrev: true,
  },
  {
    id: "ai",
    title: "Your AI production assistant",
    body: "Press ⌘K (Ctrl+K on Windows) anytime to ask anything about your show — pending VFX shots, dailies status, or a draft email to the producer. It uses live show data.",
    selector: '[data-tour="tour-ai-assistant"]',
    showPrev: true,
  },
  {
    id: "done",
    title: "You're ready",
    body: "FRAMEWRIGHT works best when the whole team is in the room. Invite your AEs, post coordinator, and post supervisor from Settings → Team.",
    primaryLabel: "Go to my show →",
    showPrev: true,
  },
];

function readCompleted() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function OnboardingTour({
  orgSlug,
  showSlug,
}: {
  orgSlug: string;
  showSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [hole, setHole] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [cardPos, setCardPos] = useState({ top: 120, left: 24 });

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }, []);

  useEffect(() => {
    if (readCompleted()) return;
    const t = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(t);
  }, []);

  const layout = useCallback(() => {
    const s = STEPS[step];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!s.selector) {
      setHole(null);
      setCardPos({ top: vh / 2 - 120, left: Math.max(16, vw / 2 - 160) });
      return;
    }
    const el = document.querySelector(s.selector);
    if (!el) {
      setHole(null);
      setCardPos({ top: vh / 2 - 120, left: Math.max(16, vw / 2 - 160) });
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 6;
    setHole({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
    let top = r.bottom + 14;
    if (top > vh - 280) top = Math.max(80, r.top - 260);
    let left = r.left;
    left = Math.min(Math.max(16, left), vw - 320 - 16);
    top = Math.min(Math.max(16, top), vh - 200);
    setCardPos({ top, left });
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    layout();
    const on = () => layout();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [open, step, layout]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[200] font-sans">
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden
        onClick={(e) => e.stopPropagation()}
      />

      {hole && (
        <div
          className="pointer-events-none fixed z-[201] rounded-lg ring-2 ring-[#6c63ff] shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      )}

      <div
        className="fixed z-[202] w-[min(calc(100vw-32px),320px)] rounded-xl border border-[#6c63ff] bg-[#1a1a2e] p-5 shadow-[0_24px_48px_rgba(0,0,0,0.85)]"
        style={{ top: cardPos.top, left: cardPos.left }}
        role="dialog"
        aria-labelledby="fw-tour-title"
        aria-modal="true"
      >
        <h2
          id="fw-tour-title"
          className="text-base font-medium leading-snug text-[#f1f0f0]"
        >
          {s.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#9998b0]">{s.body}</p>

        <div className="mt-5 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={_.id}
              className={`h-2 w-2 rounded-full ${
                i === step ? "bg-[#6c63ff]" : "bg-[#2a2a3e]"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="text-sm text-[#5f5e70] hover:text-[#9998b0]"
          >
            Skip tour
          </button>
          <div className="flex flex-wrap gap-2">
            {s.showPrev && !isFirst && (
              <button
                type="button"
                onClick={() => setStep((x) => Math.max(0, x - 1))}
                className="rounded-lg border border-[#2a2a3e] px-3 py-2 text-sm text-[#f1f0f0] hover:border-[#6c63ff]/50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  finish();
                  router.push(`/${orgSlug}/${showSlug}`);
                } else {
                  setStep((x) => x + 1);
                }
              }}
              className="rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7b73ff]"
            >
              {isLast
                ? s.primaryLabel ?? "Done"
                : s.primaryLabel ?? (isFirst ? "Next" : "Next →")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function resetOnboardingTourForReplay() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
