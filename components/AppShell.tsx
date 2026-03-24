"use client";

import { usePathname } from "next/navigation";
import GlobalTopBar from "./GlobalTopBar";
import AccountSuspensionOverlay from "./AccountSuspensionOverlay";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isAuthPage = pathname.startsWith("/auth/");
  const isCallPage = pathname.startsWith("/call/");

  return (
    <>
      {!isAuthPage ? <GlobalTopBar /> : null}
      <main
        data-app-shell="true"
        className={
          isAuthPage
            ? "app-shell relative min-h-screen"
            : isCallPage
              ? "app-shell relative h-[calc(100vh-81px)] overflow-hidden bg-[#F9FAFB]"
              : "app-shell relative min-h-[calc(100vh-81px)] bg-[#F9FAFB]"
        }
      >
        {!isAuthPage && !isCallPage ? (
          <>
            <div className="pointer-events-none absolute left-[-120px] top-24 h-64 w-64 rounded-full bg-[#E0F2FE]/60 blur-3xl" />
            <div className="pointer-events-none absolute right-[-120px] top-48 h-64 w-64 rounded-full bg-[#FCE7F3]/60 blur-3xl" />
          </>
        ) : null}

        {isCallPage ? (
          <div className="app-shell__content relative z-10 h-full w-full">{children}</div>
        ) : (
          <div className="app-shell__content relative z-10 mx-auto w-full max-w-[1220px] px-6 py-8">{children}</div>
        )}
      </main>
      <AccountSuspensionOverlay />
    </>
  );
}
