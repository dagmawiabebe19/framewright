"use client";

import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const err = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined" || !invite) return;
    document.cookie = `fw_invite=${invite}; path=/; max-age=86400; samesite=lax`;
  }, [invite]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user) {
        router.replace("/dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const signInMagicLink = async () => {
    setMessage(null);
    if (!email.trim()) {
      setMessage("Enter your work email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Check your email for the sign-in link.");
  };

  const signInGoogle = async () => {
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
    setLoading(false);
    if (error) setMessage(error.message);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-8 shadow-xl"
      >
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[#6c63ff]">
          FRAMEWRIGHT
        </p>
        <h1 className="mt-3 text-center text-2xl font-semibold text-[#f1f0f0]">
          Sign in to FRAMEWRIGHT
        </h1>
        <p className="mt-2 text-center text-sm text-[#9998b0]">
          Post production, finally coordinated.
        </p>

        {err && (
          <p className="mt-4 rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            Sign-in did not complete. Try again.
          </p>
        )}

        <label className="mt-8 block space-y-2 text-sm">
          <span className="text-[#9998b0]">Work email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@production.com"
            className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2.5 text-[#f1f0f0] outline-none transition focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/30"
          />
        </label>

        <button
          type="button"
          disabled={loading}
          onClick={signInMagicLink}
          className="mt-4 w-full rounded-lg bg-[#6c63ff] py-3 text-sm font-semibold text-white transition hover:bg-[#7b73ff] disabled:opacity-50"
        >
          Email me a magic link
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2a2a3e]" />
          <span className="text-xs text-[#5f5e70]">or</span>
          <div className="h-px flex-1 bg-[#2a2a3e]" />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={signInGoogle}
          className="w-full rounded-lg border border-[#2a2a3e] bg-[#1a1a2e] py-3 text-sm font-medium text-[#f1f0f0] transition hover:border-[#6c63ff]/50 hover:bg-[#12121e] disabled:opacity-50"
        >
          Continue with Google
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-[#9998b0]">{message}</p>
        )}

        <p className="mt-8 text-center text-xs text-[#5f5e70]">
          <Link href="/" className="text-[#6c63ff] hover:underline">
            Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
