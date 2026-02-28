import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_JP } from "next/font/google";
import GlobalTopBar from "../components/GlobalTopBar";
import SessionIdleGuard from "../components/SessionIdleGuard";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display" });
const body = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "AO Matching Platform",
  description: "高校生と大学生のAO対策マッチング"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${display.variable} ${body.variable}`}>
      <body className="bg-[#F9FAFB] text-[#111827]">
        <div className="accent-gradient h-1" />
        <SessionIdleGuard />
        <GlobalTopBar />
        <main className="relative min-h-[calc(100vh-81px)]">
          <div className="pointer-events-none absolute left-[-120px] top-24 h-64 w-64 rounded-full bg-[#E0F2FE]/60 blur-3xl" />
          <div className="pointer-events-none absolute right-[-120px] top-48 h-64 w-64 rounded-full bg-[#FCE7F3]/60 blur-3xl" />
          <div className="relative z-10 mx-auto w-full max-w-[1220px] px-6 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
