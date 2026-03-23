import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";
import Link from "next/link";

export default function VfxSheetsPage({
  params,
}: {
  params: { orgSlug: string; showSlug: string };
}) {
  return (
    <div className="px-4 py-8 md:px-8 space-y-6">
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-6">
        <h2 className="text-sm font-semibold text-[#F5F0E8]">
          VFX sheet history
        </h2>
        <p className="mt-2 text-sm text-[#A09880]">
          Deliverable rows will appear here with file links and version stacks.
          The standalone generator stays available while we connect saves.
        </p>
        <Link
          href="/tools/vfx-sheet"
          className="mt-4 inline-block text-sm font-medium text-[#D4A853] hover:underline"
        >
          Open VFX Sheet Generator
        </Link>
      </div>
      <SectionPlaceholder
        title="Episode-linked exports"
        description="Each export will increment deliverables.version, attach to the right episode, and notify the team through the activity feed."
      />
    </div>
  );
}
