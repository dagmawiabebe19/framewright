"use client";

import {
  completeOnboarding,
  type InviteRow,
  type OnboardingInput,
} from "./actions";
import { createClient } from "@/lib/supabase/client";
import { showCodeFromName, slugify } from "@/lib/slug";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const ROLES: { value: string; label: string }[] = [
  { value: "ae", label: "Assistant Editor" },
  { value: "editor", label: "Editor" },
  { value: "post_coordinator", label: "Post Coordinator" },
  { value: "post_supervisor", label: "Post Supervisor" },
  { value: "director", label: "Director" },
  { value: "producer", label: "Producer" },
  { value: "vfx_supervisor", label: "VFX Supervisor" },
  { value: "colorist", label: "Colorist" },
  { value: "sound_mixer", label: "Sound Mixer / Designer" },
  { value: "music_supervisor", label: "Music Supervisor" },
];

const FRAME_RATES = [
  "23.976",
  "24",
  "25",
  "29.97",
  "29.97 DF",
  "30",
  "59.94",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [memberRole, setMemberRole] = useState("ae");

  const [showName, setShowName] = useState("");
  const [projectType, setProjectType] = useState<"feature" | "episodic">(
    "episodic"
  );
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [totalEpisodes, setTotalEpisodes] = useState(8);
  const [frameRate, setFrameRate] = useState("23.976");

  const [invites, setInvites] = useState<InviteRow[]>([
    { email: "", role: "editor" },
  ]);

  const orgSlugPreview = useMemo(() => slugify(orgName || "your-studio"), [orgName]);
  const showCodePreview = useMemo(
    () => (showName.trim() ? showCodeFromName(showName) : "SHOW"),
    [showName]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) {
        if (!cancelled && !user) router.replace("/auth");
        return;
      }
      const { data: m } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (m) router.replace("/dashboard");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const goNext = () => {
    setError(null);
    if (step === 1) {
      if (!orgName.trim()) {
        setError("Enter your organization name.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!showName.trim()) {
        setError("Enter the show title.");
        return;
      }
      setStep(3);
    }
  };

  const submit = async (skipInvites: boolean) => {
    setError(null);
    setSubmitting(true);
    const payload: OnboardingInput = {
      orgName,
      memberRole,
      showName,
      projectType,
      seasonNumber,
      totalEpisodes: projectType === "episodic" ? totalEpisodes : null,
      frameRate,
      invites: skipInvites ? [] : invites.filter((i) => i.email.trim()),
      skipInvites,
    };

    const res = await completeOnboarding(payload);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    router.push(`/dashboard`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] px-4 py-12">
      <div className="mx-auto max-w-xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[#6c63ff]">
          FRAMEWRIGHT
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-[#f1f0f0]">
          Welcome — let us set up your production
        </h1>
        <p className="mt-2 text-center text-sm text-[#9998b0]">
          Three steps. You can invite the room after this.
        </p>

        <div className="mt-8 flex justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 w-10 rounded-full transition ${
                step >= n ? "bg-[#6c63ff]" : "bg-[#2a2a3e]"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section
              key="s1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="mt-10 space-y-6 rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6"
            >
              <h2 className="text-lg font-semibold text-[#f1f0f0]">
                Create your organization
              </h2>
              <label className="block space-y-2 text-sm">
                <span className="text-[#9998b0]">Company or production entity</span>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Walia Studios"
                  className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2.5 text-[#f1f0f0] outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/25"
                />
              </label>
              <p className="text-xs text-[#5f5e70]">
                URL slug:{" "}
                <span className="font-mono text-[#9998b0]">{orgSlugPreview}</span>
              </p>
              <label className="block space-y-2 text-sm">
                <span className="text-[#9998b0]">Your role</span>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2.5 text-[#f1f0f0] outline-none focus:border-[#6c63ff]"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="s2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="mt-10 space-y-6 rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6"
            >
              <h2 className="text-lg font-semibold text-[#f1f0f0]">
                Create your first show
              </h2>
              <label className="block space-y-2 text-sm">
                <span className="text-[#9998b0]">Show title</span>
                <input
                  value={showName}
                  onChange={(e) => setShowName(e.target.value)}
                  placeholder="The Bear S03"
                  className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2.5 text-[#f1f0f0] outline-none focus:border-[#6c63ff]"
                />
              </label>
              <p className="text-xs text-[#5f5e70]">
                Four-character show code:{" "}
                <span className="font-mono text-[#9998b0]">{showCodePreview}</span>
              </p>

              <div className="space-y-2 text-sm">
                <span className="text-[#9998b0]">Format</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[#f1f0f0]">
                    <input
                      type="radio"
                      name="pt"
                      checked={projectType === "episodic"}
                      onChange={() => setProjectType("episodic")}
                      className="accent-[#6c63ff]"
                    />
                    Episodic television
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[#f1f0f0]">
                    <input
                      type="radio"
                      name="pt"
                      checked={projectType === "feature"}
                      onChange={() => setProjectType("feature")}
                      className="accent-[#6c63ff]"
                    />
                    Feature film
                  </label>
                </div>
              </div>

              {projectType === "episodic" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm">
                    <span className="text-[#9998b0]">Season number</span>
                    <input
                      type="number"
                      min={1}
                      value={seasonNumber}
                      onChange={(e) =>
                        setSeasonNumber(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2.5 text-[#f1f0f0]"
                    />
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span className="text-[#9998b0]">Episode count (season order)</span>
                    <input
                      type="number"
                      min={1}
                      value={totalEpisodes}
                      onChange={(e) =>
                        setTotalEpisodes(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2.5 text-[#f1f0f0]"
                    />
                  </label>
                </div>
              )}

              <label className="block space-y-2 text-sm">
                <span className="text-[#9998b0]">Master frame rate</span>
                <select
                  value={frameRate}
                  onChange={(e) => setFrameRate(e.target.value)}
                  className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2.5 text-[#f1f0f0]"
                >
                  {FRAME_RATES.map((f) => (
                    <option key={f} value={f}>
                      {f} fps
                    </option>
                  ))}
                </select>
              </label>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="s3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="mt-10 space-y-6 rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6"
            >
              <h2 className="text-lg font-semibold text-[#f1f0f0]">
                Invite your team
              </h2>
              <p className="text-sm text-[#9998b0]">
                We will email a magic link. They sign in with the same address you
                enter here.
              </p>

              <div className="space-y-3">
                {invites.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end"
                  >
                    <label className="block space-y-1 text-sm">
                      <span className="text-[#9998b0]">Email</span>
                      <input
                        value={row.email}
                        onChange={(e) => {
                          const next = [...invites];
                          next[idx] = { ...next[idx], email: e.target.value };
                          setInvites(next);
                        }}
                        placeholder="editor@facility.com"
                        className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-[#f1f0f0]"
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-[#9998b0]">Role</span>
                      <select
                        value={row.role}
                        onChange={(e) => {
                          const next = [...invites];
                          next[idx] = { ...next[idx], role: e.target.value };
                          setInvites(next);
                        }}
                        className="w-full rounded-lg border border-[#2a2a3e] bg-[#0a0a12] px-3 py-2 text-[#f1f0f0]"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setInvites((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="rounded-lg border border-[#2a2a3e] px-3 py-2 text-sm text-[#9998b0] hover:bg-[#1a1a2e]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setInvites((prev) => [...prev, { email: "", role: "editor" }])
                }
                className="text-sm font-medium text-[#6c63ff] hover:underline"
              >
                Add another person
              </button>
            </motion.section>
          )}
        </AnimatePresence>

        {error && (
          <p className="mt-6 rounded-lg border border-red-500/35 bg-red-950/25 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="rounded-lg border border-[#2a2a3e] px-4 py-2 text-sm text-[#f1f0f0] hover:bg-[#1a1a2e]"
            >
              Back
            </button>
          ) : (
            <Link
              href="/auth"
              className="text-sm text-[#5f5e70] hover:text-[#9998b0]"
            >
              Cancel
            </Link>
          )}

          <div className="flex flex-wrap gap-2">
            {step < 3 && (
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-[#6c63ff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#7b73ff]"
              >
                Continue
              </button>
            )}
            {step === 3 && (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submit(true)}
                  className="rounded-lg border border-[#2a2a3e] px-4 py-2 text-sm font-medium text-[#f1f0f0] hover:bg-[#1a1a2e] disabled:opacity-50"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submit(false)}
                  className="rounded-lg bg-[#6c63ff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#7b73ff] disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Finish and open dashboard"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
