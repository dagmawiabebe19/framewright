"use client";

import { useAiStore } from "@/lib/stores/aiStore";
import { useEffect } from "react";

export function AiShowBootstrap({
  showId,
  showName,
  orgSlug,
  showSlug,
}: {
  showId: string;
  showName: string;
  orgSlug: string;
  showSlug: string;
}) {
  useEffect(() => {
    useAiStore.getState().setShow({ showId, showName, orgSlug, showSlug });
  }, [showId, showName, orgSlug, showSlug]);

  return null;
}
