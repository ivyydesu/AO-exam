"use client";

import { AnimatePresence, motion } from "framer-motion";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

type TourStepDef = {
  id: string;
  path: "/home" | "/profile/settings";
  selector?: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left" | "over";
  align?: "start" | "center" | "end";
};

const TOUR_DONE_KEY_PREFIX = "unibridgeTourDone:";
const TOUR_PROGRESS_KEY_PREFIX = "uniBridgeTourProgress:";

const TOUR_STEPS: TourStepDef[] = [
  {
    id: "signup-button",
    path: "/home",
    selector: "#signup-button",
    title: "ステップ1：アカウント登録（まずはここから！）",
    description: "UniBridgeのトップページです。まずは『新規登録』ボタンを押して始めましょう。",
    side: "bottom",
    align: "start"
  },
  {
    id: "home-to-profile",
    path: "/home",
    selector: "#signup-button",
    title: "次のステップへ",
    description: "『次へ』を押すとプロフィール設定画面に移動し、チュートリアルが自動で続きます。",
    side: "bottom",
    align: "start"
  },
  {
    id: "profile-form",
    path: "/profile/settings",
    selector: "#profile-form-container",
    title: "ステップ2：プロフィール登録（あなたの魅力を伝えよう！）",
    description: "大学名、学部、自己紹介を入力しましょう。情報が具体的なほど高校生に信頼されます。",
    side: "top",
    align: "start"
  },
  {
    id: "save-profile",
    path: "/profile/settings",
    selector: "#save-profile-button",
    title: "保存して完了！",
    description: "入力が終わったら『保存する』を押して準備完了です。",
    side: "top",
    align: "center"
  }
];

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") return "/home";
  return pathname;
}

function injectTourStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("unibridge-driver-styles")) return;

  const style = document.createElement("style");
  style.id = "unibridge-driver-styles";
  style.textContent = `
    .driver-overlay { background: rgba(2, 6, 23, 0.72) !important; }
    .driver-stage {
      border-radius: 14px !important;
      box-shadow: 0 0 0 3px rgba(73, 181, 104, 0.38) !important;
    }
    .driver-popover.unibridge-driver-popover {
      border-radius: 16px !important;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04) !important;
      padding: 20px !important;
      border: 1px solid #d1fae5 !important;
      font-family: inherit !important;
    }
    .driver-popover.unibridge-driver-popover .driver-popover-title {
      font-size: 18px !important;
      font-weight: 700 !important;
      color: #111827 !important;
      margin-bottom: 8px !important;
    }
    .driver-popover.unibridge-driver-popover .driver-popover-description {
      font-size: 14px !important;
      color: #4B5563 !important;
      line-height: 1.5 !important;
    }
    .driver-popover.unibridge-driver-popover .driver-popover-next-btn,
    .driver-popover.unibridge-driver-popover .driver-popover-done-btn {
      background-color: #49B568 !important;
      color: #fff !important;
      border-radius: 8px !important;
      padding: 8px 16px !important;
      font-weight: 600 !important;
      border: none !important;
      text-shadow: none !important;
    }
    .driver-popover.unibridge-driver-popover .driver-popover-prev-btn {
      border-radius: 8px !important;
      padding: 8px 16px !important;
      border: 1px solid #d1d5db !important;
      color: #374151 !important;
      background: #fff !important;
      text-shadow: none !important;
    }
    .driver-popover.unibridge-driver-popover .driver-popover-close-btn {
      color: #6b7280 !important;
    }
    .driver-popover.unibridge-driver-popover .driver-popover-progress-text {
      color: #6b7280 !important;
      font-weight: 600 !important;
    }
  `;
  document.head.appendChild(style);
}

function getQueryParam(name: string) {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get(name) ?? "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForElement(selector: string, timeoutMs = 7000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (document.querySelector(selector)) return true;
    await sleep(120);
  }
  return Boolean(document.querySelector(selector));
}

export default function OnboardingTour() {
  const pathname = usePathname() || "";
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const driverRef = useRef<Driver | null>(null);
  const internalDestroyRef = useRef(false);

  const currentPath = normalizePath(pathname);

  const getProgress = (userId: string) => {
    const raw = localStorage.getItem(`${TOUR_PROGRESS_KEY_PREFIX}${userId}`);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const saveProgress = (userId: string, idx: number) => {
    localStorage.setItem(`${TOUR_PROGRESS_KEY_PREFIX}${userId}`, String(idx));
  };

  const markDone = async (userId: string) => {
    localStorage.setItem(`${TOUR_DONE_KEY_PREFIX}${userId}`, "true");
    localStorage.removeItem(`${TOUR_PROGRESS_KEY_PREFIX}${userId}`);

    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    await fetch("/api/onboarding/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ completed: true })
    }).catch(() => undefined);
  };

  const cleanupDriver = () => {
    if (!driverRef.current) return;
    internalDestroyRef.current = true;
    try {
      driverRef.current.destroy();
    } catch {
      // noop
    }
    driverRef.current = null;
  };

  const handleSkip = async () => {
    if (!uid) return;
    cleanupDriver();
    await markDone(uid);
    setRunning(false);
    setCurrentIndex(TOUR_STEPS.length);
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      injectTourStyles();

      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!mounted) return;
      if (!user?.id) {
        setUid(null);
        setRunning(false);
        return;
      }

      const localDone = localStorage.getItem(`${TOUR_DONE_KEY_PREFIX}${user.id}`) === "true";
      if (localDone) {
        setUid(null);
        setRunning(false);
        return;
      }

      const token = data.session?.access_token;
      if (token) {
        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        }).catch(() => null);
        const payload = await res?.json().catch(() => ({}));
        if (payload?.completed) {
          localStorage.setItem(`${TOUR_DONE_KEY_PREFIX}${user.id}`, "true");
          setUid(null);
          setRunning(false);
          return;
        }
      }

      setUid(user.id);
      setCurrentIndex(getProgress(user.id));
    };

    void boot();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!uid) return;
    if (currentIndex >= TOUR_STEPS.length) {
      void markDone(uid);
      setRunning(false);
      return;
    }

    let cancelled = false;

    const startStep = async () => {
      const step = TOUR_STEPS[currentIndex];

      if (step.path !== currentPath) {
        if (step.path === "/profile/settings" && currentPath === "/profile/settings") {
          const tab = getQueryParam("tab");
          if (tab !== "profile") router.replace("/profile/settings?tab=profile");
        }
        return;
      }

      if (step.path === "/profile/settings") {
        const tab = getQueryParam("tab");
        if (tab !== "profile") {
          router.replace("/profile/settings?tab=profile");
          return;
        }
      }

      if (step.selector) {
        const ok = await waitForElement(step.selector, 7000);
        if (!ok && !cancelled) {
          const next = currentIndex + 1;
          saveProgress(uid, next);
          setCurrentIndex(next);
          return;
        }
      }
      if (cancelled) return;

      const moveTo = async (nextIndex: number) => {
        cleanupDriver();
        setRunning(false);

        if (nextIndex >= TOUR_STEPS.length) {
          await markDone(uid);
          return;
        }

        saveProgress(uid, nextIndex);
        setCurrentIndex(nextIndex);

        const nextStep = TOUR_STEPS[nextIndex];
        if (nextStep.path !== currentPath) {
          router.push(nextStep.path === "/profile/settings" ? "/profile/settings?tab=profile" : "/home");
        }
      };

      const oneStep: DriveStep = {
        element: step.selector ?? "body",
        popover: {
          title: step.title,
          description: step.description,
          side: step.side ?? (step.selector ? "bottom" : "over"),
          align: step.align ?? "center",
          onNextClick: () => {
            void moveTo(currentIndex + 1);
          },
          onPrevClick: () => {
            void moveTo(Math.max(0, currentIndex - 1));
          },
          onCloseClick: () => {
            if (window.confirm("チュートリアルをスキップしますか？")) {
              void handleSkip();
            }
          }
        }
      };

      const driverObj = driver({
        showProgress: true,
        nextBtnText: "次へ →",
        prevBtnText: "← 戻る",
        doneBtnText: "完了！",
        allowClose: true,
        animate: true,
        stagePadding: 8,
        popoverClass: "unibridge-driver-popover",
        onDestroyStarted: () => {
          if (internalDestroyRef.current) {
            internalDestroyRef.current = false;
            driverObj.destroy();
            return;
          }
          if (window.confirm("チュートリアルをスキップしますか？")) {
            void handleSkip();
          }
        },
        onDestroyed: () => {
          setRunning(false);
        },
        steps: [oneStep]
      });

      driverRef.current = driverObj;
      setRunning(true);
      driverObj.drive(0);
    };

    void startStep();

    return () => {
      cancelled = true;
      cleanupDriver();
      setRunning(false);
    };
  }, [uid, currentPath, currentIndex, router]);

  return (
    <AnimatePresence>
      {running ? (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          type="button"
          onClick={() => void handleSkip()}
          className="fixed right-4 top-4 z-[99999] rounded-xl border border-white/60 bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-lg hover:bg-white"
        >
          スキップ
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
