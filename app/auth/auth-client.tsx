"use client";

import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function CheckIcon() {
  return (
    <svg
      className="mx-auto h-14 w-14 text-emerald-400"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14 24l7 7 13-14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AuthPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const err = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
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
      if (cancelled || !user) return;

      const { data: member } = await supabase
        .from("members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (member?.org_id) router.replace("/dashboard");
      else router.replace("/onboarding");
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setSentTo(email.trim());
    setSent(true);
  };

  const signInGoogle = async () => {
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) setMessage(error.message);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-8 shadow-xl"
      >
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[#D4A853]">
          FRAMEWRIGHT
        </p>
        <h1 className="mt-3 text-center text-2xl font-semibold text-[#F5F0E8]">
          Sign in to FRAMEWRIGHT
        </h1>
        <p className="mt-2 text-center text-sm text-[#A09880]">
          Post production, finally coordinated.
        </p>

        {err === "callback_failed" && (
          <p className="mt-4 rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            Sign-in did not complete. Try requesting a new magic link.
          </p>
        )}
        {err && err !== "callback_failed" && (
          <p className="mt-4 rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            Sign-in did not complete. Try again.
          </p>
        )}

        {sent ? (
          <div className="mt-8 space-y-4 text-center">
            <CheckIcon />
            <h3 className="text-lg font-semibold text-[#F5F0E8]">
              Check your email
            </h3>
            <p className="text-sm text-[#F5F0E8]">
              We sent a magic link to{" "}
              <span className="font-medium text-[#D4A853]">{sentTo}</span>
            </p>
            <p className="text-sm text-[#5a5040]">
              Click the link in your email to sign in. Check spam if you don&apos;t
              see it.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  void signInMagicLink();
                }}
                className="w-full rounded-lg bg-[#D4A853] py-3 text-sm font-semibold text-[#080808] transition hover:bg-[#E0B86A]"
              >
                Resend login link
              </button>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setSentTo("");
                  setMessage(null);
                }}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] py-3 text-sm font-medium text-[#F5F0E8] transition hover:border-[#D4A853]/50 hover:bg-[#0f0f0f]"
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="mt-8 block space-y-2 text-sm">
              <span className="text-[#A09880]">Work email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@production.com"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-3 py-2.5 text-[#F5F0E8] outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/30"
              />
            </label>

            <button
              type="button"
              disabled={loading}
              onClick={signInMagicLink}
              className="mt-4 w-full rounded-lg bg-[#D4A853] py-3 text-sm font-semibold text-[#080808] transition hover:bg-[#E0B86A] disabled:opacity-50"
            >
              Log in with magic link
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#2a2a2a]" />
              <span className="text-xs text-[#5a5040]">or</span>
              <div className="h-px flex-1 bg-[#2a2a2a]" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={signInGoogle}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] py-3 text-sm font-medium text-[#F5F0E8] transition hover:border-[#D4A853]/50 hover:bg-[#0f0f0f] disabled:opacity-50"
            >
              Continue with Google
            </button>

            {message && (
              <p className="mt-4 text-center text-sm text-red-300">{message}</p>
            )}
          </>
        )}

        <p className="mt-8 text-center text-xs text-[#5a5040]">
          <Link href="/" className="text-[#D4A853] hover:underline">
            Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
