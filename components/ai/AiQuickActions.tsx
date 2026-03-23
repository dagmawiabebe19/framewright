"use client";

import type { AiContextType } from "@/lib/stores/aiStore";

const ACTIONS: Record<
  AiContextType,
  { label: string; prompt: string }[]
> = {
  episode: [
    {
      label: "What needs attention before picture lock?",
      prompt:
        "What needs attention before picture lock on this episode? Be specific and prioritize by urgency.",
    },
    {
      label: "How many VFX shots are still pending?",
      prompt: "How many VFX shots are still pending, and what stands out?",
    },
    {
      label: "Draft a status update for the producer",
      prompt:
        "Draft a short status update email for the producer about this episode — what's on track and what needs decisions.",
    },
    {
      label: "What changed in the last cut?",
      prompt:
        "Based on the cut log data you have, what changed in the most recent cut and what should the team know?",
    },
  ],
  dailies: [
    {
      label: "Draft today's status email",
      prompt:
        "Draft today's dailies status email to post — rolls, problems, what's still moving.",
    },
    {
      label: "Which rolls still need to be confirmed?",
      prompt: "Which rolls are not confirmed yet and what should the AE chase?",
    },
    {
      label: "Summarize today's shoot",
      prompt: "Summarize today's shoot from the dailies data — concise for a post supervisor.",
    },
  ],
  vfx: [
    {
      label: "Which shots are high priority and unassigned?",
      prompt:
        "List high priority VFX shots that are still unassigned or stuck — include shot IDs if you have them.",
    },
    {
      label: "How many shots does each vendor have?",
      prompt: "Break down VFX shots by vendor from the data — counts only, no fluff.",
    },
    {
      label: "Which shots have been waiting longest?",
      prompt:
        "Which shots look like they've been waiting longest in pending / in progress? What should we push on?",
    },
  ],
  dashboard: [
    {
      label: "What should we focus on this week?",
      prompt:
        "Given the episode dates and activity, what should this show focus on this week?",
    },
    {
      label: "Any deadlines coming up?",
      prompt:
        "Surface any picture lock or delivery deadlines in the next two weeks and what's at risk.",
    },
  ],
  general: [
    {
      label: "Summarize show health",
      prompt: "Give a tight read on overall show health from the data you have.",
    },
  ],
};

export function AiQuickActions({
  context,
  onPick,
}: {
  context: AiContextType;
  onPick: (prompt: string) => void;
}) {
  const list = ACTIONS[context] ?? ACTIONS.general;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => onPick(a.prompt)}
          className="rounded-full border border-[#2a2a3e] bg-[#1a1a2e] px-3 py-1.5 text-left text-[12px] text-[#c4c4d4] transition hover:border-[#6c63ff] hover:text-[#6c63ff]"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
