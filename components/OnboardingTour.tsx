"use client";

import { AnimatePresence, motion } from "framer-motion";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";
import { normalizeUserRole } from "../lib/userRole";

type TourRole = "student" | "tutor";
type TourTab = "manage" | "profile" | "notifications";

type TourStepDef = {
  id: string;
  path: "/home" | "/profile/settings";
  tab?: TourTab;
  selector?: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left" | "over";
  align?: "start" | "center" | "end";
};

const TOUR_PROGRESS_KEY_PREFIX = "uniBridgeTourProgress:v2:";
const TOUR_DONE_SENTINEL = -1;
const TOUR_SEEN_KEY_PREFIX = "has_seen_tour_";

const TUTOR_TOUR_STEPS: TourStepDef[] = [
  {
    id: "welcome",
    path: "/home",
    selector: "#welcome-card",
    title: "ようこそ、ユニブリへ",
    description: "公開まで最短で進めるようにご案内します。まずはアカウント設定へ進みましょう。",
    side: "bottom",
    align: "center"
  },
  {
    id: "account-settings",
    path: "/home",
    selector: "#topbar-profile-menu-button",
    title: "① アカウント設定を開く",
    description: "このメニューから「アカウント設定」に進めます。まずは設定画面を開きましょう。",
    side: "bottom",
    align: "end"
  },
  {
    id: "profile-menu",
    path: "/profile/settings",
    tab: "manage",
    selector: "#manage-profile-settings-row",
    title: "② プロフィール設定へ",
    description: "次にプロフィール設定を開いて、公開に必要な情報を入力します。",
    side: "left",
    align: "start"
  },
  {
    id: "tutor-full-name",
    path: "/profile/settings",
    tab: "profile",
    selector: "#tutor-full-name-input",
    title: "氏名",
    description: "運営確認用の氏名です。正確な情報を入力してください。",
    side: "bottom",
    align: "start"
  },
  {
    id: "tutor-nickname",
    path: "/profile/settings",
    tab: "profile",
    selector: "#tutor-nickname-input",
    title: "ニックネーム",
    description: "高校生に公開される表示名です。呼ばれたい名前を設定しましょう。",
    side: "bottom",
    align: "start"
  },
  {
    id: "tutor-school",
    path: "/profile/settings",
    tab: "profile",
    selector: "#tutor-school-input",
    title: "学校名",
    description: "在籍校を入力します。信頼性の高いプロフィール作成に重要です。",
    side: "bottom",
    align: "start"
  },
  {
    id: "tutor-research-theme",
    path: "/profile/settings",
    tab: "profile",
    selector: "#tutor-research-theme-input",
    title: "探究テーマ",
    description: "高校生が相談内容をイメージできるよう、扱っているテーマを具体的に書きましょう。",
    side: "top",
    align: "start"
  },
  {
    id: "notifications-menu",
    path: "/profile/settings",
    tab: "manage",
    selector: "#manage-notifications-row",
    title: "③ 通知設定へ",
    description: "次は通知設定です。相談対応の見逃しを防ぐため、LINE連携を推奨します。",
    side: "left",
    align: "start"
  },
  {
    id: "line-connect",
    path: "/profile/settings",
    tab: "notifications",
    selector: "#line-connect-button",
    title: "LINE連携を推奨",
    description: "新規相談を見逃さないために、ここでLINE連携を済ませておくのがおすすめです。",
    side: "top",
    align: "start"
  },
  {
    id: "verification-menu",
    path: "/profile/settings",
    tab: "manage",
    selector: "#manage-student-verification-row",
    title: "④ 学生証認証へ",
    description: "最後に学生証認証を提出しましょう。提出後は審査待ちになります。",
    side: "left",
    align: "start"
  },
  {
    id: "complete",
    path: "/profile/settings",
    tab: "manage",
    selector: "#profile-tab",
    title: "完了です！",
    description: "審査が終わればプロフィールが公開できます！",
    side: "bottom",
    align: "start"
  }
];

const STUDENT_TOUR_STEPS: TourStepDef[] = [
  {
    id: "welcome",
    path: "/home",
    selector: "#welcome-card",
    title: "ようこそ、ユニブリへ",
    description: "最初にアカウント設定を済ませると、先輩探しがスムーズに進みます。",
    side: "bottom",
    align: "center"
  },
  {
    id: "account-settings",
    path: "/home",
    selector: "#topbar-profile-menu-button",
    title: "① アカウント設定へ",
    description: "このメニューからアカウント設定を開けます。",
    side: "bottom",
    align: "end"
  },
  {
    id: "profile-menu",
    path: "/profile/settings",
    tab: "manage",
    selector: "#manage-profile-settings-row",
    title: "② プロフィール設定へ",
    description: "プロフィール設定を開いて、高校名と名前を登録しましょう。",
    side: "left",
    align: "start"
  },
  {
    id: "student-name",
    path: "/profile/settings",
    tab: "profile",
    selector: "#student-full-name-input",
    title: "名前を入力",
    description: "本名を入力してください。相談時の本人確認に使われます。",
    side: "bottom",
    align: "start"
  },
  {
    id: "student-school",
    path: "/profile/settings",
    tab: "profile",
    selector: "#student-school-input",
    title: "高校名を入力",
    description: "在籍高校を入力すると、先輩とのマッチング精度が上がります。",
    side: "bottom",
    align: "start"
  },
  {
    id: "search-highlight",
    path: "/home",
    selector: "#home-ai-search-input",
    title: "③ 先輩検索機能を使う",
    description: "ここから探究テーマで先輩を検索できます。気になる先輩に相談を申し込みましょう。",
    side: "bottom",
    align: "start"
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForElement(selector: string, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (document.querySelector(selector)) return true;
    await sleep(120);
  }
  return Boolean(document.querySelector(selector));
}

function parseProgress(raw: string | null, stepCount: number) {
  const value = Number(raw);
  if (value === TOUR_DONE_SENTINEL) return TOUR_DONE_SENTINEL;
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(stepCount - 1, Math.floor(value));
}

function hasSeenTour(userId: string) {
  const raw = localStorage.getItem(`${TOUR_SEEN_KEY_PREFIX}${userId}`);
  return raw === "1" || raw === "true";
}

function stepHref(step: TourStepDef) {
  if (step.path !== "/profile/settings") return step.path;
  const tab = step.tab ?? "manage";
  return `/profile/settings?tab=${tab}`;
}

export default function OnboardingTour() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<TourRole | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  const driverRef = useRef<Driver | null>(null);
  const internalDestroyRef = useRef(false);
  const startGuardRef = useRef<string | null>(null);

  const currentPath = normalizePath(pathname);
  const currentTab = searchParams.get("tab") ?? "";

  const tourSteps = useMemo(() => {
    if (role === "tutor") return TUTOR_TOUR_STEPS;
    if (role === "student") return STUDENT_TOUR_STEPS;
    return [] as TourStepDef[];
  }, [role]);

  const progressKey = useMemo(() => {
    if (!uid || !role) return null;
    return `${TOUR_PROGRESS_KEY_PREFIX}${uid}:${role}`;
  }, [uid, role]);

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

  const saveProgress = (idx: number) => {
    if (!progressKey) return;
    localStorage.setItem(progressKey, String(idx));
  };

  const completeTour = () => {
    if (uid) {
      localStorage.setItem(`${TOUR_SEEN_KEY_PREFIX}${uid}`, "true");
    }
    if (!progressKey) return;
    localStorage.setItem(progressKey, String(TOUR_DONE_SENTINEL));
    cleanupDriver();
    setRunning(false);
    setCurrentIndex(TOUR_DONE_SENTINEL);
    startGuardRef.current = null;
  };

  const handleSkip = async () => {
    completeTour();
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
        setCurrentIndex(null);
        setRunning(false);
        return;
      }

      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      const resolvedRole = normalizeUserRole(
        me?.role ?? user.user_metadata?.role ?? user.app_metadata?.role,
        "student"
      );
      if (resolvedRole !== "tutor" && resolvedRole !== "student") {
        setUid(null);
        setRole(null);
        setCurrentIndex(null);
        setRunning(false);
        return;
      }

      const steps = resolvedRole === "tutor" ? TUTOR_TOUR_STEPS : STUDENT_TOUR_STEPS;
      const key = `${TOUR_PROGRESS_KEY_PREFIX}${user.id}:${resolvedRole}`;
      const saved = hasSeenTour(user.id)
        ? TOUR_DONE_SENTINEL
        : parseProgress(localStorage.getItem(key), steps.length);

      setUid(user.id);
      setRole(resolvedRole);
      setCurrentIndex(saved);
      setRunning(false);
      startGuardRef.current = null;
    };

    void boot();
    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!uid || !role || currentIndex === null || currentIndex === TOUR_DONE_SENTINEL) return;
    if (currentIndex >= tourSteps.length) {
      completeTour();
      return;
    }

    const step = tourSteps[currentIndex];
    const guardKey = `${uid}:${role}:${currentIndex}:${currentPath}:${currentTab}`;
    if (startGuardRef.current === guardKey) return;
    startGuardRef.current = guardKey;

    let cancelled = false;

    const moveTo = async (nextIndex: number) => {
      cleanupDriver();
      setRunning(false);

      if (nextIndex < 0) {
        saveProgress(0);
        startGuardRef.current = null;
        setCurrentIndex(0);
        return;
      }
      if (nextIndex >= tourSteps.length) {
        completeTour();
        return;
      }

      saveProgress(nextIndex);
      startGuardRef.current = null;
      setCurrentIndex(nextIndex);

      const nextStep = tourSteps[nextIndex];
      const href = stepHref(nextStep);
      const shouldMovePath = nextStep.path !== currentPath;
      const shouldMoveTab =
        nextStep.path === "/profile/settings" &&
        (nextStep.tab ?? "manage") !== currentTab;

      if (shouldMovePath || shouldMoveTab) {
        router.push(href);
      }
    };

    const startStep = async () => {
      const expectedHref = stepHref(step);
      const pathMismatch = step.path !== currentPath;
      const tabMismatch =
        step.path === "/profile/settings" &&
        (step.tab ?? "manage") !== currentTab;

      if (pathMismatch || tabMismatch) {
        setRunning(false);
        router.push(expectedHref);
        return;
      }

      if (step.selector) {
        const exists = await waitForElement(step.selector, 8000);
        if (!exists && !cancelled) {
          await moveTo(currentIndex + 1);
          return;
        }
      }
      if (cancelled) return;

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
            void moveTo(currentIndex - 1);
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
      startGuardRef.current = null;
    };
  }, [uid, role, currentIndex, currentPath, currentTab, router, tourSteps]);

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
