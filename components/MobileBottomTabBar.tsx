"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  icon: (active: boolean) => JSX.Element;
};

function HomeIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-[18px] w-[18px] ${active ? "text-[#10B981]" : "text-[#6B7280]"}`}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  );
}

function MessageIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-[18px] w-[18px] ${active ? "text-[#10B981]" : "text-[#6B7280]"}`}>
      <path d="M4 6h16v9a2 2 0 0 1-2 2H9l-5 4V8a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function SearchIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-[18px] w-[18px] ${active ? "text-[#10B981]" : "text-[#6B7280]"}`}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  );
}

function MyPageIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-[18px] w-[18px] ${active ? "text-[#10B981]" : "text-[#6B7280]"}`}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

const TABS: TabItem[] = [
  {
    href: "/home",
    label: "ホーム",
    match: (pathname) => pathname === "/home" || pathname === "/",
    icon: HomeIcon
  },
  {
    href: "/chat",
    label: "メッセージ",
    match: (pathname) => pathname.startsWith("/chat"),
    icon: MessageIcon
  },
  {
    href: "/search",
    label: "探す",
    match: (pathname) => pathname.startsWith("/search") || pathname.startsWith("/service/"),
    icon: SearchIcon
  },
  {
    href: "/profile/settings?tab=manage",
    label: "マイページ",
    match: (pathname) => pathname.startsWith("/profile/"),
    icon: MyPageIcon
  }
];

export default function MobileBottomTabBar() {
  const pathname = usePathname() || "";

  return (
    <nav
      aria-label="モバイル下部タブバー"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E5E7EB] bg-white/95 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid w-full max-w-[560px] grid-cols-4 gap-1 px-2 pb-0.5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold ${
                  active ? "bg-[#ECFDF5] text-[#10B981]" : "text-[#6B7280]"
                }`}
              >
                {tab.icon(active)}
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
