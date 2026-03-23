export function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-8">
      <h2 className="text-lg font-semibold text-[#F5F0E8]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#A09880]">{description}</p>
      <p className="mt-6 text-xs text-[#5a5040]">
        This module ships in the next FRAMEWRIGHT build — the database and shell
        are already wired.
      </p>
    </div>
  );
}
