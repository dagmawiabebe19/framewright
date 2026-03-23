export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-[#f1f0f0]">{children}</div>
  );
}
