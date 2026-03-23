export function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#2a2a3e] bg-[#12121e] p-8">
      <h2 className="text-lg font-semibold text-[#f1f0f0]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#9998b0]">{description}</p>
      <p className="mt-6 text-xs text-[#5f5e70]">
        This module ships in the next FRAMEWRIGHT build — the database and shell
        are already wired.
      </p>
    </div>
  );
}
