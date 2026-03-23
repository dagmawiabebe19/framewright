import { HelpArticle, HelpTip } from "@/components/help/HelpArticle";

export default function VfxSheetsHelpPage() {
  return (
    <HelpArticle
      title="Generating a VFX sheet"
      readMinutes={6}
      related={[
        { href: "/help/shot-tracker", title: "Using the shot tracker" },
        { href: "/help/episode-hub", title: "Understanding the episode hub" },
      ]}
    >
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          Open <strong className="text-[#F5F0E8]">VFX → VFX sheets</strong> from
          the sidebar, or use{" "}
          <strong className="text-[#F5F0E8]">Generate new VFX sheet</strong>{" "}
          from the episode hub deliverables tab.
        </li>
        <li>
          Upload a sequence file: EDL (.edl), Premiere XML (.xml), FCPXML
          (.fcpxml), or ALE (.ale).
        </li>
        <li>
          Optionally add reference video (.mov, .mp4, …) so FRAMEWRIGHT can
          extract thumbnails at each shot&apos;s record timecode (Chrome or Edge
          recommended for WASM).
        </li>
        <li>
          Fill <strong className="text-[#F5F0E8]">Show info</strong> — many
          fields sync from the show you opened. Pick the target episode when
          saving to deliverables.
        </li>
        <li>
          Run <strong className="text-[#F5F0E8]">Generate</strong>. An Excel
          workbook downloads with shots, timecodes, handles, and priority
          columns ready for your vendors.
        </li>
        <li>
          With a show context, the sheet is stored as a versioned{" "}
          <strong className="text-[#F5F0E8]">vfx_sheet</strong> deliverable and
          shots appear under the episode&apos;s VFX tab for tracking.
        </li>
      </ol>
      <HelpTip>
        NLE markers named with a <code className="font-mono text-[#c4b5fd]">VFX_</code>{" "}
        prefix (e.g. VFX_001) produce the cleanest standard shot IDs when you
        export.
      </HelpTip>
    </HelpArticle>
  );
}
