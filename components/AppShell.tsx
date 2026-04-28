"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import GlobalTopBar from "./GlobalTopBar";
import MobileBottomTabBar from "./MobileBottomTabBar";
import AccountSuspensionOverlay from "./AccountSuspensionOverlay";
import OnboardingTour from "./OnboardingTour";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isAuthPage = pathname.startsWith("/auth/");
  const isCallPage = pathname.startsWith("/call/");

  return (
    <>
      {!isAuthPage ? <GlobalTopBar /> : null}
      {!isAuthPage ? (
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      ) : null}
      <main
        data-app-shell="true"
        className={
          isAuthPage
            ? "app-shell relative min-h-screen"
            : isCallPage
              ? "app-shell relative h-[calc(100vh-65px)] overflow-hidden bg-[#F9FAFB] sm:h-[calc(100vh-81px)]"
              : "app-shell relative min-h-[calc(100vh-65px)] bg-[#F9FAFB] sm:min-h-[calc(100vh-81px)]"
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
          <div className="app-shell__content relative z-10 mx-auto w-full max-w-[1220px] px-4 pb-24 pt-5 sm:px-6 sm:pb-28 sm:pt-8 md:pb-8">{children}</div>
        )}
      </main>
      {!isAuthPage && !isCallPage ? <MobileBottomTabBar /> : null}
      <AccountSuspensionOverlay />
    </>
  );
}
