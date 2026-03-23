import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";

export default function TeamPage() {
  return (
    <div className="px-4 py-8 md:px-8">
      <SectionPlaceholder
        title="Team"
        description="Members, roles, and invite status — backed by Supabase Auth and the members table today."
      />
    </div>
  );
}
