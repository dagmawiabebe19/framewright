import Link from "next/link";

function DemoFeed() {
  const lines = [
    { t: "VFX sheet v3 exported — Ep 103", who: "Assistant editor", ago: "2m" },
    { t: "Director approved cut — Ep 102", who: "Post supervisor", ago: "18m" },
    { t: "Roll B009 confirmed — Ep 103", who: "Dailies", ago: "1h" },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-[#5f5e70]">
        <span>Live activity</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Realtime
        </span>
      </div>
      <ul className="space-y-3">
        {lines.map((l, i) => (
          <li
            key={l.t}
            className="fw-feed-line rounded-lg border border-[#2a2a3e]/80 bg-[#0a0a12] px-3 py-2 text-left text-xs text-[#9998b0]"
            style={{ animationDelay: `${i * 0.5}s` }}
          >
            <p className="text-[#f1f0f0]">{l.t}</p>
            <p className="mt-1 text-[10px] text-[#5f5e70]">
              {l.who} · {l.ago}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-[#f1f0f0]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 md:px-8">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6c63ff]">
          FRAMEWRIGHT
        </span>
        <div className="flex items-center gap-4 text-sm">
          <a href="#pricing" className="text-[#9998b0] hover:text-[#f1f0f0]">
            Pricing
          </a>
          <Link
            href="/auth"
            className="rounded-lg bg-[#6c63ff] px-4 py-2 font-medium text-white transition hover:bg-[#7b73ff]"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-8 md:grid-cols-2 md:px-8 md:pb-28 md:pt-12">
        <div>
          <h1 className="text-4xl font-medium leading-tight tracking-tight md:text-6xl md:leading-[1.05]">
            Post production, finally coordinated.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[#9998b0] md:text-2xl md:leading-relaxed">
            The operating system for episodic TV editorial. From dailies to
            delivery — every department, one platform.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/auth"
              className="rounded-lg bg-[#6c63ff] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6c63ff]/20 transition hover:bg-[#7b73ff]"
            >
              Start free
            </Link>
            <a
              href="#how"
              className="rounded-lg border border-[#2a2a3e] px-6 py-3 text-sm font-semibold text-[#f1f0f0] transition hover:bg-[#12121e]"
            >
              See how it works
            </a>
          </div>
        </div>
        <DemoFeed />
      </section>

      <section id="how" className="border-t border-[#2a2a3e] bg-[#0f0f1a]/60 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-[#5f5e70]">
            Why teams switch
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6">
              <h3 className="text-lg font-semibold">One show. Every department.</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#9998b0]">
                Editorial, VFX, sound, color, and delivery share the same spine —
                no more parallel spreadsheets that disagree.
              </p>
            </div>
            <div className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6">
              <h3 className="text-lg font-semibold">
                Documents that generate themselves.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#9998b0]">
                Turnovers, cue sheets, and VFX sheets pull from the same cuts and
                rolls — versioned automatically with audit trails.
              </p>
            </div>
            <div className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6">
              <h3 className="text-lg font-semibold">AI that knows your production.</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#9998b0]">
                Alerts, digests, and the assistant read real show state — not
                generic chat history.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="text-center text-3xl font-medium">Pricing</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6">
              <h3 className="text-lg font-semibold">Free</h3>
              <p className="mt-2 text-3xl font-medium">$0</p>
              <ul className="mt-4 space-y-2 text-sm text-[#9998b0]">
                <li>1 show</li>
                <li>2 team members</li>
                <li>All tool generators</li>
                <li>1GB storage</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#6c63ff]/40 bg-[#12121e] p-6 shadow-lg shadow-[#6c63ff]/10">
              <h3 className="text-lg font-semibold text-[#6c63ff]">Production</h3>
              <p className="mt-2 text-3xl font-medium">$49</p>
              <p className="text-xs text-[#5f5e70]">per month / show</p>
              <ul className="mt-4 space-y-2 text-sm text-[#9998b0]">
                <li>Unlimited team members</li>
                <li>Realtime collaboration</li>
                <li>AI assistant + vendor portals</li>
                <li>Email notifications</li>
                <li>50GB storage</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-6">
              <h3 className="text-lg font-semibold">Studio</h3>
              <p className="mt-2 text-3xl font-medium">$199</p>
              <p className="text-xs text-[#5f5e70]">per month</p>
              <ul className="mt-4 space-y-2 text-sm text-[#9998b0]">
                <li>Unlimited shows</li>
                <li>Everything in Production</li>
                <li>Priority support</li>
                <li>Custom delivery spec library</li>
                <li>API access</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2a2a3e] py-10 text-center text-sm text-[#5f5e70]">
        Built by editors, for editors. Walia Studios, Los Angeles.
      </footer>
    </div>
  );
}
