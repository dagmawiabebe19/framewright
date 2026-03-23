"use client";

import { formatAiResponseToNodes } from "@/lib/ai/format-ai-response";
import { useAiStore } from "@/lib/stores/aiStore";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiQuickActions } from "./AiQuickActions";

export function AiAssistant() {
  const isOpen = useAiStore((s) => s.isOpen);
  const setOpen = useAiStore((s) => s.setOpen);
  const showId = useAiStore((s) => s.showId);
  const showName = useAiStore((s) => s.showName);
  const episodeId = useAiStore((s) => s.episodeId);
  const context = useAiStore((s) => s.context);

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const prefetch = useCallback(async () => {
    if (!showId) return;
    await fetch("/api/ai/prefetch-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        showId,
        episodeId,
        context,
      }),
    });
  }, [showId, episodeId, context]);

  useEffect(() => {
    if (isOpen && showId) void prefetch();
  }, [isOpen, showId, prefetch]);

  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setOutput("");
      setStreaming(false);
      setThinking(false);
      setDone(false);
      abortRef.current?.abort();
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setOpen]);

  const runPrompt = async (message: string) => {
    if (!showId || !message.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStreaming(true);
    setDone(false);
    setOutput("");
    setThinking(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          showId,
          episodeId,
          context,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const t = await res.text();
        setOutput(t || "Something went wrong.");
        setThinking(false);
        setStreaming(false);
        setDone(true);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setOutput("No response stream.");
        setThinking(false);
        setStreaming(false);
        setDone(true);
        return;
      }

      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done: d, value } = await reader.read();
        if (d) break;
        acc += decoder.decode(value, { stream: true });
        if (acc.length > 0) setThinking(false);
        setOutput(acc);
      }
      setStreaming(false);
      setDone(true);
    } catch {
      if (abortRef.current?.signal.aborted) return;
      setOutput("Could not reach the assistant. Check your connection.");
      setThinking(false);
      setStreaming(false);
      setDone(true);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runPrompt(input);
    setInput("");
  };

  const feedback = async (helpful: boolean) => {
    if (!showId) return;
    await fetch("/api/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpful, showId }),
    });
  };

  const placeholder = showName
    ? `Ask anything about ${showName}…`
    : "Open a show from the sidebar to use the assistant…";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal
            className="w-full max-w-[640px] overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#080808] shadow-[0_24px_48px_rgba(0,0,0,0.8)]"
            style={{ maxHeight: 480 }}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={onSubmit}>
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={!showId}
                className="h-[52px] w-full border-0 border-b border-[#2a2a2a] bg-[#0f0f0f] px-4 text-base text-[#F5F0E8] outline-none placeholder:text-[#5a5040] disabled:opacity-50"
              />
            </form>

            <div className="max-h-[320px] overflow-y-auto p-4">
              {!output && !streaming && !thinking && showId && (
                <div className="space-y-3">
                  <p className="text-[11px] uppercase tracking-wider text-[#5a5040]">
                    Quick actions
                  </p>
                  <AiQuickActions
                    context={context}
                    onPick={(p) => void runPrompt(p)}
                  />
                </div>
              )}

              {(thinking || output || streaming) && (
                <div className="text-[14px] leading-[1.7] text-[#d4d4e0]">
                  {thinking && !output ? (
                    <span className="text-[#5a5040]">thinking…</span>
                  ) : (
                    <>
                      {formatAiResponseToNodes(output)}
                      {streaming && (
                        <span className="ml-0.5 inline-block w-2 animate-pulse text-[#D4A853]">
                          |
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}

              {!showId && (
                <p className="text-sm text-[#A09880]">
                  Navigate to a show workspace to unlock production context.
                </p>
              )}

              {done && output && !streaming && (
                <div className="mt-4 flex items-center gap-2 border-t border-[#2a2a2a] pt-3 text-[12px] text-[#5a5040]">
                  <span>Was this helpful?</span>
                  <button
                    type="button"
                    className="rounded border border-[#2a2a2a] px-2 py-0.5 hover:border-[#D4A853]"
                    onClick={() => void feedback(true)}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    className="rounded border border-[#2a2a2a] px-2 py-0.5 hover:border-[#D4A853]"
                    onClick={() => void feedback(false)}
                  >
                    👎
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
