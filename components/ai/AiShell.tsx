"use client";

import { useAiStore } from "@/lib/stores/aiStore";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AiAssistant } from "./AiAssistant";
import { AiFloatingButton } from "./AiFloatingButton";
import { useAiPathSync } from "./useAiPathSync";

export function AiShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setOpen = useAiStore((s) => s.setOpen);
  useAiPathSync(pathname);

  const hidden =
    pathname?.startsWith("/auth") || pathname?.startsWith("/onboarding");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!hidden) setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden, setOpen]);

  return (
    <>
      {children}
      {!hidden && (
        <>
          <AiFloatingButton />
          <AiAssistant />
        </>
      )}
    </>
  );
}
