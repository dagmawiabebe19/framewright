"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function InviteClaim() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (typeof document === "undefined") return;
    const m = document.cookie.match(/(?:^|; )fw_invite=([^;]*)/);
    if (!m?.[1]) return;
    const token = decodeURIComponent(m[1]);
    fetch("/api/invites/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).finally(() => {
      document.cookie = "fw_invite=; path=/; max-age=0";
      router.refresh();
    });
  }, [router]);

  return null;
}
