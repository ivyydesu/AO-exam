"use client";

import { AnimatePresence, motion } from "framer-motion";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TOUR_DONE_KEY = "hasCompletedTour";
const TOUR_STEP_KEY = "uniBridgeTourStep";
const TOUR_ACTIVE_KEY = "uniBridgeTourActive";

function injectTourStyles() {
  if (document.getElementById("unibridge-tour-style")) return;
  const style = document.createElement("style");
  style.id = "unibridge-tour-style";
  style.innerHTML = `
    .driver-overlay {
      background: rgba(2, 6, 23, 0.68) !important;
    }
    .driver-stage {
      border-radius: 12px !important;
      box-shadow: 0 0 0 3px rgba(73, 181, 104, 0.35) !important;
    }
    .driver-popover.unibridge-tour {
      max-width: min(92vw, 360px) !important;
      border: 1px solid #d1fae5 !important;
      border-radius: 14px !important;
      box-shadow: 0 14px 34px rgba(2, 6, 23, 0.2) !important;
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
    .driver-popover.unibridge-tour .driver-popover-prev-btn {
      color: #374151 !important;
      background: #fff !important;
    }
    .driver-popover.unibridge-tour .driver-popover-close-btn {
      color: #6b7280 !important;
    }
    .driver-popover.unibridge-tour .driver-popover-progress-text {
      color: #6b7280 !important;
    }
  `;
  document.head.appendChild(style);
}

function step(index: number) {
  localStorage.setItem(TOUR_STEP_KEY, String(index));
}

function isDone() {
  return localStorage.getItem(TOUR_DONE_KEY) === "true";
}

function completeTour() {
  localStorage.setItem(TOUR_DONE_KEY, "true");
  localStorage.removeItem(TOUR_STEP_KEY);
  localStorage.removeItem(TOUR_ACTIVE_KEY);
}

export default function OnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isDone()) return;

    injectTourStyles();

    const active = localStorage.getItem(TOUR_ACTIVE_KEY) === "true";
    const savedStep = Number(localStorage.getItem(TOUR_STEP_KEY) ?? "0");
    const canStartHome = pathname === "/home" || pathname === "/";
    const canStartSettings = pathname === "/profile/settings";

    // 開始条件:
    // - 初回 /home で自動開始
    // - または前ステップ継続中で /profile/settings に来た時
    if (!canStartHome && !canStartSettings) return;
    if (!active && !canStartHome) return;

    // ドライバ生成
    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 8,
      allowClose: true,
      popoverClass: "unibridge-tour",
      nextBtnText: "Next",
      prevBtnText: "Previous",
      doneBtnText: "Done",
      onDestroyed: () => {
        setRunning(false);
      }
    });

    driverRef.current = driverObj;

    const startHomeFlow = () => {
      localStorage.setItem(TOUR_ACTIVE_KEY, "true");
      setRunning(true);
      driverObj.setSteps([
        {
          element: "#register-button",
          popover: {
            title: "Step 1: 冒険の始まり",
            description: "まずはここからアカウント登録！SNS連携なら10秒で終わります。",
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "body",
          popover: {
            title: "メールを確認してね",
            description: "届いた認証メールのURLをポチッとするのを忘れずに！",
            side: "over",
            align: "center"
          }
        }
      ]);

      driverObj.drive(0);

      // 2ステップ目完了後に設定ページへ誘導
      const originalDestroy = driverObj.destroy.bind(driverObj);
      driverObj.destroy = () => {
        step(2);
        originalDestroy();
        router.push("/profile/settings");
      };
    };

    const startSettingsFlow = () => {
      setRunning(true);
      driverObj.setSteps([
        {
          element: "#profile-tab",
          popover: {
            title: "Step 2: あなたの武器を登録",
            description:
              "大学名や学部を入力しましょう。ここが詳しいほど高校生に信頼されます。",
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#interest-tags",
          popover: {
            title: "探究テーマを選択",
            description:
              "あなたがアドバイスできる分野を選んでください。AIが相性の良い高校生をマッチングします。",
            side: "bottom",
            align: "start"
          }
        },
        {
          element: "#save-profile-button",
          popover: {
            title: "準備完了！",
            description: "最後に保存ボタンを押して、高校生からの依頼を待ちましょう！",
            side: "top",
            align: "center"
          }
        }
      ]);

      driverObj.drive(0);

      const complete = () => {
        completeTour();
        setRunning(false);
      };

      const originalDestroy = driverObj.destroy.bind(driverObj);
      driverObj.destroy = () => {
        originalDestroy();
        complete();
      };
    };

    if (pathname === "/profile/settings" && (active || savedStep >= 2)) {
      startSettingsFlow();
    } else if (pathname === "/home" || pathname === "/") {
      startHomeFlow();
    }

    return () => {
      try {
        driverObj.destroy();
      } catch {
        // noop
      }
      driverRef.current = null;
    };
  }, [pathname, router]);

  const onSkip = () => {
    completeTour();
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
