import "./globals.css";
import type { Metadata } from "next";
import OnboardingVideoPopup from "../components/OnboardingVideoPopup";
import SessionIdleGuard from "../components/SessionIdleGuard";
import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://unibridge.website"),
  title: {
    default: "UniBridge（ユニブリ）",
    template: "%s | UniBridge（ユニブリ）"
  },
  description: "",
  applicationName: "UniBridge（ユニブリ）",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "UniBridge（ユニブリ）",
    description: "",
    url: "https://unibridge.website",
    siteName: "UniBridge（ユニブリ）",
    locale: "ja_JP",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "UniBridge（ユニブリ）",
    description: ""
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-snippet": 0
    }
  }
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
