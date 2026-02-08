import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_JP } from "next/font/google";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display" });
const body = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "AO Matching Platform",
  description: "高校生と大学生のAO対策マッチング"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${display.variable} ${body.variable}`}>
      <body>
        <main className="relative">
          <div className="accent-gradient h-1" />
          <div className="pointer-events-none absolute left-[-120px] top-24 h-64 w-64 rounded-full bg-[#E0F2FE]/60 blur-3xl" />
          <div className="pointer-events-none absolute right-[-120px] top-48 h-64 w-64 rounded-full bg-[#FCE7F3]/60 blur-3xl" />
          <div className="mx-auto max-w-6xl px-6 py-10 relative z-10">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
