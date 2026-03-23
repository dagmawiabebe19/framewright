"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type ShowOption = {
  id: string;
  name: string;
  show_code: string;
  org_slug: string;
};

type NavItem = {
  href: string;
  label: string;
  /** Spotlight target for onboarding tour */
  tour?: string;
};

type NavSection = {
  label: string;
  /** Wrap section nav in tour spotlight */
  sectionTour?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Home",
    items: [{ href: "", label: "Overview" }],
  },
  {
    label: "Production",
    items: [{ href: "/episodes", label: "Episodes", tour: "tour-nav-episodes" }],
  },
  {
    label: "Editorial",
    sectionTour: "tour-nav-editorial",
    items: [
      { href: "/editorial/cuts", label: "Cut log" },
      { href: "/editorial/dailies", label: "Dailies tracker" },
    ],
  },
  {
    label: "VFX",
    items: [
      { href: "/vfx/shots", label: "Shot tracker" },
      { href: "/tools/vfx-sheet", label: "VFX sheets", tour: "tour-nav-vfx-sheets" },
    ],
  },
  {
    label: "Sound",
    items: [
      { href: "/sound/turnovers", label: "Turnovers" },
      { href: "/sound/adr", label: "ADR tracker" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/deliverables", label: "Deliverables" },
      { href: "/timeline", label: "Season timeline" },
      { href: "/tools", label: "Tool suite" },
      { href: "/team", label: "Team" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function ShowSidebar({
  orgSlug,
  showSlug,
  showName,
  shows,
}: {
  orgSlug: string;
  showSlug: string;
  showName: string;
  shows: ShowOption[];
}) {
  const pathname = usePathname();
  const base = `/${orgSlug}/${showSlug}`;
  const [mobileOpen, setMobileOpen] = useState(false);

  const activePath = useMemo(
    () => normalizePath(pathname || ""),
    [pathname]
  );

  const isActive = (href: string) => {
    const full = normalizePath(`${base}${href}`);
    if (href === "") return activePath === normalizePath(base);
    return activePath === full || activePath.startsWith(`${full}/`);
  };

  const inner = (
    <>
      <div className="border-b border-[#2a2a2a] px-4 py-5">
        <Link
          href="/dashboard"
          className="text-xs font-medium uppercase tracking-[0.2em] text-[#D4A853]"
        >
          FRAMEWRIGHT
        </Link>
        <div className="mt-4" data-tour="tour-show-select">
          <label className="text-[10px] uppercase tracking-wider text-[#5a5040]">
            Show
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#080808] px-2 py-2 text-sm text-[#F5F0E8] outline-none focus:border-[#D4A853]"
            value={`${orgSlug}/${showSlug}`}
            onChange={(e) => {
              const [o, s] = e.target.value.split("/");
              window.location.href = `/${o}/${s}`;
            }}
          >
            {shows.map((s) => (
              <option
                key={s.id}
                value={`${s.org_slug}/${s.show_code.toLowerCase()}`}
              >
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs leading-snug text-[#5a5040]">
          Current: <span className="text-[#A09880]">{showName}</span>
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#5a5040]">
              {section.label}
            </p>
            <div data-tour={section.sectionTour}>
              <ul className="mt-2 space-y-0.5">
                {section.items.map((item) => {
                  const href = `${base}${item.href}`;
                  const active = isActive(item.href);
                  return (
                    <li key={item.label}>
                      <Link
                        href={href}
                        data-tour={item.tour}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-lg px-3 py-2 text-sm transition duration-150 ease-out ${
                          active
                            ? "border border-[#3d2e00] border-l-2 border-l-[#D4A853] bg-[#1a1200] text-[#D4A853]"
                            : "text-[#A09880] hover:bg-[#111111] hover:text-[#F5F0E8]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#2a2a2a] px-2 py-3">
        <Link
          href="/help"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#A09880] transition hover:bg-[#0f0f0f] hover:text-[#F5F0E8]"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#2a2a2a] text-xs text-[#D4A853]"
            aria-hidden
          >
            ?
          </span>
          Help &amp; tutorials
        </Link>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#2a2a2a] bg-[#080808]/95 px-4 py-3 backdrop-blur lg:hidden">
        <span className="text-sm font-medium text-[#F5F0E8]">{showName}</span>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#F5F0E8] transition duration-150 hover:bg-[#0f0f0f]"
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#2a2a2a] bg-[#0f0f0f] transition-transform duration-300 ease-out lg:static lg:z-0 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {inner}
      </aside>
    </>
  );
}
