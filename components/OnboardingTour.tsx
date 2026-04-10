"use client";

import { AnimatePresence, motion } from "framer-motion";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

type TourStepDef = {
  id: string;
  path: "/profile/settings";
  tab: "profile" | "notifications";
  selector?: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left" | "over";
  align?: "start" | "center" | "end";
};

const TOUR_PROGRESS_KEY_PREFIX = "uniBridgeTourProgress:";

const TOUR_STEPS: TourStepDef[] = [
  {
    id: "profile-form",
    path: "/profile/settings",
    tab: "profile",
    selector: "#profile-form-container",
    title: "① プロフィール設定のやり方",
    description: "まずはプロフィールを入力しましょう。氏名・ニックネーム（表示名）・学校名・学部学科など、基本情報を埋めると信頼されやすくなります。",
    side: "bottom",
    align: "start"
  },
  {
    id: "line-connect",
    path: "/profile/settings",
    tab: "notifications",
    selector: "#line-connect-button",
    title: "② LINE連携のやり方",
    description: "次にLINEを連携しましょう。通知をLINEで受け取れるようになるので、依頼の見逃しを防げます。",
    side: "top",
    align: "start"
  },
  {
    id: "student-verification",
    path: "/profile/settings",
    tab: "profile",
    selector: "#student-verification-link",
    title: "③ 学生証認証のやり方",
    description: "学生証認証ページから、学生証の表裏と入学/卒業予定年度を提出してください。承認後に公開範囲を広げられます。",
    side: "top",
    align: "start"
  },
  {
    id: "tour-complete",
    path: "/profile/settings",
    tab: "profile",
    selector: "#save-profile-button",
    title: "④ これで完璧です！",
    description: "最後に「保存する」を押して設定を反映すれば準備完了です。高校生からの相談を待ちましょう！",
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
  const [role, setRole] = useState<"student" | "tutor" | "admin" | null>(null);
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

  const resetProgress = (userId: string) => {
    localStorage.removeItem(`${TOUR_PROGRESS_KEY_PREFIX}${userId}`);
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
    resetProgress(uid);
    setRunning(false);
    setCurrentIndex(0);
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
        setRole(null);
        setRunning(false);
        return;
      }

      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const resolvedRole = (me?.role as "student" | "tutor" | "admin" | null) ?? null;
      setRole(resolvedRole);
      // オンボーディングは大学生（tutor）だけ実行する
      if (resolvedRole !== "tutor") {
        setUid(null);
        setRunning(false);
        return;
      }

      setUid(user.id);
      setCurrentIndex(0);
    };

    void boot();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!uid || role !== "tutor") return;
    if (currentIndex >= TOUR_STEPS.length) {
      resetProgress(uid);
      setRunning(false);
      return;
    }

    let cancelled = false;

    const startStep = async () => {
      const step = TOUR_STEPS[currentIndex];

      // 別ページへ強制遷移させず、対象ページに来た時だけ開始する
      if (step.path !== currentPath) {
        setRunning(false);
        return;
      }

      if (step.path === "/profile/settings") {
        const tab = getQueryParam("tab");
        if (tab !== step.tab) {
          setRunning(false);
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
          resetProgress(uid);
          return;
        }

        saveProgress(uid, nextIndex);
        setCurrentIndex(nextIndex);

        const nextStep = TOUR_STEPS[nextIndex];
        if (nextStep.path !== currentPath || getQueryParam("tab") !== nextStep.tab) {
          // 設定ページ内タブ遷移のみ許可（ページ外へ戻す挙動はしない）
          if (currentPath === "/profile/settings") {
            router.push(`/profile/settings?tab=${nextStep.tab}`);
          }
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
  }, [uid, role, currentPath, currentIndex, router]);

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
