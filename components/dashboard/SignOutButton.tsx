"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/auth");
        router.refresh();
      }}
      className="rounded-lg border border-[#2a2a3e] px-3 py-1.5 text-xs text-[#9998b0] transition hover:bg-[#12121e] disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
