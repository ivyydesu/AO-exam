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
        <main className="bg-[radial-gradient(circle_at_top,_#fef9f0,_#f7f4ef,_#e8dfc9)]">
          <div className="mx-auto max-w-6xl px-6 py-10">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
