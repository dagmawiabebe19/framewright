import { HelpArticle, HelpTip } from "@/components/help/HelpArticle";

export default function CutLogHelpPage() {
  return (
    <HelpArticle
      title="Logging cut versions"
      readMinutes={4}
      related={[
        { href: "/help/dailies-tracker", title: "Using the dailies tracker" },
        { href: "/help/phase-timeline", title: "Understanding the phase timeline" },
      ]}
    >
      <p>
        From the episode hub, open the cut log to record each version you turn
        over — assembly through picture lock.
      </p>
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          Choose the <strong className="text-[#F5F0E8]">cut type</strong> that
          matches your milestone (e.g. Director&apos;s cut, Picture lock).
        </li>
        <li>
          Confirm the <strong className="text-[#F5F0E8]">version name</strong>{" "}
          (FRAMEWRIGHT suggests the next version for that type).
        </li>
        <li>
          Enter <strong className="text-[#F5F0E8]">duration timecode</strong>{" "}
          as <code className="font-mono text-[#c4b5fd]">HH:MM:SS:FF</code> with
          two digits in each field (example:{" "}
          <code className="font-mono text-[#c4b5fd]">01:42:18:00</code>). Leave
          blank if you are only attaching a reference file.
        </li>
        <li>
          Add optional notes and a reference file; the file uploads to secure
          storage and links to the cut row.
        </li>
      </ol>
      <HelpTip>
        If submit is blocked, check the duration line: the form expects strict
        HH:MM:SS:FF so exports and reports stay frame-accurate.
      </HelpTip>
    </HelpArticle>
  );
}
