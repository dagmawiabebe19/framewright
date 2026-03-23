import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";

export default function CutsPage() {
  return (
    <div className="px-4 py-8 md:px-8">
      <SectionPlaceholder
        title="Cut log"
        description="Version stack with duration, uploader, and threaded cut notes — ties into the episode hub column."
      />
    </div>
  );
}
