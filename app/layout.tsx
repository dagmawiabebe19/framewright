import { AiShell } from "@/components/ai/AiShell";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FRAMEWRIGHT — Post production, finally coordinated.",
  description:
    "The post production operating system for film and television. Dailies, cuts, turnovers, and delivery — one URL, every department.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans min-h-screen bg-fw-bg text-[#f1f0f0] antialiased">
        <AiShell>{children}</AiShell>
      </body>
    </html>
  );
}
