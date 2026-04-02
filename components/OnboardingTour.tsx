"use client";

import { AnimatePresence, motion } from "framer-motion";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

const TOUR_DONE_KEY_PREFIX = "unibridgeTourDone:";
const TOUR_SKIP_KEY_PREFIX = "unibridgeTourSkipped:";

function injectTourStyles() {
  if (document.getElementById("unibridge-tour-style")) return;
  const style = document.createElement("style");
  style.id = "unibridge-tour-style";
  style.innerHTML = `
    .driver-overlay { background: rgba(2, 6, 23, 0.72) !important; }
    .driver-stage {
      border-radius: 12px !important;
      box-shadow: 0 0 0 3px rgba(73, 181, 104, 0.38) !important;
    }
    .driver-popover.unibridge-tour {
      max-width: min(92vw, 380px) !important;
      border: 1px solid #d1fae5 !important;
      border-radius: 14px !important;
      box-shadow: 0 14px 34px rgba(2, 6, 23, 0.24) !important;
      color: #1f2937 !important;
    }
    .driver-popover.unibridge-tour .driver-popover-title {
      color: #111827 !important;
      font-weight: 800 !important;
      font-size: 16px !important;
    }
    .driver-popover.unibridge-tour .driver-popover-description {
      color: #374151 !important;
      line-height: 1.65 !important;
      font-size: 14px !important;
    }
    .driver-popover.unibridge-tour .driver-popover-footer button {
      border-radius: 10px !important;
      font-weight: 700 !important;
      border: 1px solid #d1d5db !important;
      color: #374151 !important;
      background: #fff !important;
    }
    .driver-popover.unibridge-tour .driver-popover-next-btn {
      border-color: #49b568 !important;
      background: #49b568 !important;
      color: #fff !important;
    }
    .driver-popover.unibridge-tour .driver-popover-prev-btn { color: #374151 !important; background: #fff !important; }
    .driver-popover.unibridge-tour .driver-popover-close-btn { display: none !important; }
    .driver-popover.unibridge-tour .driver-popover-progress-text { color: #6b7280 !important; }
  `;
  document.head.appendChild(style);
}

function selectIfExists(selector: string, step: Omit<DriveStep, "element">): DriveStep | null {
  if (!document.querySelector(selector)) return null;
  return { element: selector, ...step };
}

type TourSession = {
  uid: string;
  refreshToken: string;
  completed: boolean;
};

export default function OnboardingTour() {
  const pathname = usePathname() || "";
  const [session, setSession] = useState<TourSession | null>(null);
  const [running, setRunning] = useState(false);
  const driverRef = useRef<Driver | null>(null);
  const skippedRef = useRef(false);

  const isEligiblePage = useMemo(() => pathname === "/" || pathname === "/home" || pathname === "/profile/settings", [pathname]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data: authData } = await supabase.auth.getSession();
        const authSession = authData.session;
        if (!authSession || !authSession.user?.id) {
          if (mounted) setSession(null);
          return;
        }

        const uid = authSession.user.id;
        const refreshToken = authSession.refresh_token || "";

        const localDone = localStorage.getItem(`${TOUR_DONE_KEY_PREFIX}${uid}`) === "true";
        if (localDone) {
          if (mounted) setSession({ uid, refreshToken, completed: true });
          return;
        }

        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${authSession.access_token}` },
          cache: "no-store"
        });
        const payload = await res.json().catch(() => ({}));
        const completed = Boolean(payload?.completed);

        if (completed) {
          localStorage.setItem(`${TOUR_DONE_KEY_PREFIX}${uid}`, "true");
        }

        if (mounted) setSession({ uid, refreshToken, completed });
      } catch {
        if (mounted) setSession(null);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!session || session.completed || !isEligiblePage) return;

    injectTourStyles();

    const loginKey = `${session.uid}:${session.refreshToken}`;
    const skipKey = `${TOUR_SKIP_KEY_PREFIX}${session.uid}`;
    if (sessionStorage.getItem(skipKey) === loginKey) return;

    const steps: DriveStep[] = [];

    if (pathname === "/" || pathname === "/home") {
      const s1 = selectIfExists("#welcome-card", {
        popover: {
          title: "Step 1: ようこそ",
          description: "ここからユニブリの使い方を30秒で案内します。",
          side: "bottom",
          align: "center"
        }
      });
      if (s1) steps.push(s1);

      const s2 = selectIfExists("#register-button", {
        popover: {
          title: "Step 2: まずは探す",
          description: "この検索から、相性の良い先輩を見つけられます。",
          side: "bottom",
          align: "start"
        }
      });
      if (s2) steps.push(s2);
    }

    if (pathname === "/profile/settings") {
      const p1 = selectIfExists("#profile-tab", {
        popover: {
          title: "Step 1: プロフィール",
          description: "まずはプロフィールを整えると、マッチ率が上がります。",
          side: "bottom",
          align: "start"
        }
      });
      if (p1) steps.push(p1);

      const p2 = selectIfExists("#interest-tags", {
        popover: {
          title: "Step 2: 探究テーマ",
          description: "探究テーマを入れると、推薦精度が上がります。",
          side: "top",
          align: "start"
        }
      });
      if (p2) steps.push(p2);

      const p3 = selectIfExists("#status-toggle", {
        popover: {
          title: "Step 3: 公開設定",
          description: "公開ONで、高校生から見つけてもらえる状態になります。",
          side: "left",
          align: "center"
        }
      });
      if (p3) steps.push(p3);

      const p4 = selectIfExists("#save-profile-button", {
        popover: {
          title: "Step 4: 完了",
          description: "最後に保存して準備完了です。",
          side: "top",
          align: "center"
        }
      });
      if (p4) steps.push(p4);
    }

    if (steps.length === 0) return;

    skippedRef.current = false;
    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 8,
      allowClose: false,
      popoverClass: "unibridge-tour",
      nextBtnText: "Next",
      prevBtnText: "Previous",
      doneBtnText: "Done",
      onDestroyed: () => {
        setRunning(false);
      }
    });

    driverRef.current = driverObj;
    driverObj.setSteps(steps);
    setRunning(true);
    driverObj.drive();

    const doneBtn = () => {
      if (skippedRef.current) return;
      localStorage.setItem(`${TOUR_DONE_KEY_PREFIX}${session.uid}`, "true");

      const supabase = getSupabaseClient();
      if (!supabase) return;

      void supabase.auth.getSession().then(({ data }) => {
        const accessToken = data.session?.access_token;
        if (!accessToken) return;
        void fetch("/api/onboarding/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ completed: true })
        });
      });
    };

    const observer = new MutationObserver(() => {
      const done = document.querySelector<HTMLButtonElement>(".driver-popover-next-btn");
      if (!done) return;
      if (done.dataset.unibridgeDoneBound === "1") return;
      const progress = document.querySelector(".driver-popover-progress-text")?.textContent || "";
      const parts = progress.split("/").map((v) => Number(v.trim()));
      const isLast = parts.length === 2 && parts[0] === parts[1] && parts[0] > 0;
      if (!isLast) return;

      done.dataset.unibridgeDoneBound = "1";
      done.addEventListener(
        "click",
        () => {
          doneBtn();
        },
        { once: true }
      );
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      try {
        driverObj.destroy();
      } catch {
        // noop
      }
      driverRef.current = null;
    };
  }, [isEligiblePage, pathname, session]);

  const onSkip = () => {
    if (!session) return;
    skippedRef.current = true;
    sessionStorage.setItem(`${TOUR_SKIP_KEY_PREFIX}${session.uid}`, `${session.uid}:${session.refreshToken}`);
    if (driverRef.current) {
      try {
        driverRef.current.destroy();
      } catch {
        // noop
      }
    }
    setRunning(false);
  };

  return (
    <AnimatePresence>
      {running ? (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          onClick={onSkip}
          className="fixed right-4 top-4 z-[99999] rounded-xl border border-white/50 bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-lg hover:bg-white"
          type="button"
        >
          Skip
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
