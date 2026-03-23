import Link from "next/link";

const tools = (vfxHref: string) =>
  [
  {
    name: "VFX Sheet Generator",
    desc: "EDL / XML / FCPXML / ALE in — Excel with thumbnails out. Runs offline in the browser.",
    href: vfxHref,
    ready: true,
  },
  {
    name: "Sound Turnover Builder",
    desc: "Facility spec validation plus turnover package.",
    href: "",
    ready: false,
  },
  {
    name: "ADR List Generator",
    desc: "Script and marker cross-reference with supervisor approvals.",
    href: "",
    ready: false,
  },
  {
    name: "Music Cue Sheet",
    desc: "Broadcast-ready cue rows from sequence metadata.",
    href: "",
    ready: false,
  },
  {
    name: "Change List",
    desc: "Diff two cuts; notify downstream departments automatically.",
    href: "",
    ready: false,
  },
  {
    name: "Pull List",
    desc: "Reel-grouped pulls for online and color.",
    href: "",
    ready: false,
  },
  {
    name: "Delivery Manifest",
    desc: "Master pack list for network delivery.",
    href: "",
    ready: false,
  },
  {
    name: "EDL Analyzer",
    desc: "Structural readouts before turnover.",
    href: "",
    ready: false,
  },
  {
    name: "Cut Timing Report",
    desc: "Runtime analytics and pacing notes.",
    href: "",
    ready: false,
  },
] as const;

export default function ToolsLauncherPage({
  params,
}: {
  params: { orgSlug: string; showSlug: string };
}) {
  const list = tools(
    `/${params.orgSlug}/${params.showSlug}/tools/vfx-sheet`
  );
  return (
    <div className="px-4 py-8 md:px-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-[#5f5e70]">
          Tool suite
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#f1f0f0]">
          Generators and analyzers
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#9998b0]">
          Launching from an episode will pre-fill show metadata, auto-version
          deliverables, and log exports to the activity feed — wiring lands in
          Phase 2.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((t) =>
          t.ready ? (
            <Link
              key={t.name}
              href={t.href}
              className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-5 transition duration-150 ease-out hover:border-[#6c63ff]/40"
            >
              <h2 className="text-sm font-semibold text-[#f1f0f0]">{t.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#9998b0]">
                {t.desc}
              </p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-[#6c63ff]">
                Open tool
              </p>
            </Link>
          ) : (
            <div
              key={t.name}
              className="rounded-2xl border border-[#2a2a3e] bg-[#12121e]/80 p-5 opacity-80"
            >
              <h2 className="text-sm font-semibold text-[#f1f0f0]">{t.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#9998b0]">
                {t.desc}
              </p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-[#5f5e70]">
                Build in progress
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
