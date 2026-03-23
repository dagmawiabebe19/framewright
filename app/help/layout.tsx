export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8]">{children}</div>
  );
}
