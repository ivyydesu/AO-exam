import "./globals.css";
import type { Metadata } from "next";
import OnboardingVideoPopup from "../components/OnboardingVideoPopup";
import SessionIdleGuard from "../components/SessionIdleGuard";
import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  title: "ユニブリ",
  description: "高校生と大学生のAO対策マッチング"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="stylesheet" href="/fallback.css" />
      </head>
      <body className="bg-[#F9FAFB] text-[#111827]">
        <div className="accent-gradient h-1" />
        <SessionIdleGuard />
        <OnboardingVideoPopup />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
