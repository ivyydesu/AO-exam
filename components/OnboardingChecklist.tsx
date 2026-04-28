"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, useDragControls, useMotionValue } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";
import { normalizeUserRole, type UserRole } from "../lib/userRole";

type ChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
  href: string;
  required?: boolean;
};

function isFilled(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

type DragPosition = {
  x: number;
  y: number;
};

type DragBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type PersistedChecklistState = DragPosition & {
  isMinimized: boolean;
};

const STORAGE_KEY = "onboarding-checklist:ui-state:v1";
const COMPLETED_STORAGE_KEY_PREFIX = "onboarding-checklist:completed:v1";
const CARD_WIDTH = 360;
const DEFAULT_CARD_HEIGHT = 280;
const WINDOW_MARGIN = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFallbackPosition(): DragPosition {
  if (typeof window === "undefined") return { x: WINDOW_MARGIN, y: WINDOW_MARGIN };
  const width = Math.min(CARD_WIDTH, window.innerWidth - WINDOW_MARGIN * 2);
  return {
    x: Math.max(WINDOW_MARGIN, window.innerWidth - width - WINDOW_MARGIN),
    y: Math.max(WINDOW_MARGIN, window.innerHeight - DEFAULT_CARD_HEIGHT - WINDOW_MARGIN)
  };
}

async function fetchStripeTaskStatus(accessToken: string): Promise<boolean> {
  const response = await fetch("/api/stripe/connect/status", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Stripe口座状態の取得に失敗しました");
  }
  return Boolean(payload.connected && payload.chargesEnabled && payload.payoutsEnabled);
}

export default function OnboardingChecklist() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideByCompletedFlag, setHideByCompletedFlag] = useState(false);
  const [completedStorageKey, setCompletedStorageKey] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<DragPosition | null>(null);
  const [dragBounds, setDragBounds] = useState<DragBounds>({ left: 0, top: 0, right: 0, bottom: 0 });
  const [hydrated, setHydrated] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();
  const x = useMotionValue(WINDOW_MARGIN);
  const y = useMotionValue(WINDOW_MARGIN);

  const hiddenOn = useMemo(() => pathname.startsWith("/auth/") || pathname.startsWith("/call/"), [pathname]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          if (mounted) {
            setRole(null);
            setItems([]);
          }
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const user = sessionData.session?.user;
        const accessToken = sessionData.session?.access_token;
        if (!user?.id) {
          if (mounted) {
            setRole(null);
            setItems([]);
            setHideByCompletedFlag(false);
            setCompletedStorageKey(null);
          }
          return;
        }

        const nextCompletedStorageKey = `${COMPLETED_STORAGE_KEY_PREFIX}:${user.id}`;
        const completedFlag =
          typeof window !== "undefined" && window.localStorage.getItem(nextCompletedStorageKey) === "1";
        if (mounted) {
          setCompletedStorageKey(nextCompletedStorageKey);
          setHideByCompletedFlag(completedFlag);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name, school, line_user_id, stripe_account_id")
          .eq("id", user.id)
          .maybeSingle();

        const resolvedRole = normalizeUserRole(
          profile?.role ?? user.user_metadata?.role ?? user.app_metadata?.role,
          "student"
        );

        if (!mounted) return;

        if (resolvedRole === "admin") {
          setRole("admin");
          setItems([]);
          return;
        }

        if (completedFlag) {
          setRole(resolvedRole);
          setItems([]);
          return;
        }

        if (resolvedRole === "student") {
          const profileDone = isFilled(profile?.full_name) && isFilled(profile?.school);
          setRole("student");
          setItems([
            {
              id: "student-profile",
              label: "プロフィール設定（高校・名前）の完了",
              completed: profileDone,
              href: "/profile/settings?tab=profile"
            }
          ]);
          return;
        }

        const [{ data: tutorProfile, error: tutorProfileError }, { data: verification, error: verificationError }] =
          await Promise.all([
            supabase
              .from("tutor_profiles")
              .select("nickname, department, grade, research_theme, bio")
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("tutor_verifications")
              .select("status")
              .eq("user_id", user.id)
              .maybeSingle()
          ]);

        if (tutorProfileError) throw tutorProfileError;
        if (verificationError) throw verificationError;

        if (!mounted) return;

        const profileDone =
          isFilled(profile?.full_name) &&
          isFilled(profile?.school) &&
          isFilled(tutorProfile?.nickname) &&
          isFilled(tutorProfile?.department) &&
          isFilled(tutorProfile?.grade) &&
          isFilled(tutorProfile?.research_theme) &&
          isFilled(tutorProfile?.bio);

        const lineDone = isFilled(profile?.line_user_id);
        const verificationDone = verification?.status === "pending" || verification?.status === "approved";
        let stripeDone = false;
        if (accessToken) {
          try {
            stripeDone = await fetchStripeTaskStatus(accessToken);
          } catch (error) {
            console.error("[OnboardingChecklist] failed to fetch Stripe task status", error);
            stripeDone = isFilled(profile?.stripe_account_id);
          }
        } else {
          stripeDone = isFilled(profile?.stripe_account_id);
        }

        setRole("tutor");
        setItems([
          {
            id: "tutor-profile",
            label: "プロフィール設定の完了",
            completed: profileDone,
            href: "/profile/settings?tab=profile",
            required: true
          },
          {
            id: "line-connect",
            label: "LINE連携の完了",
            completed: lineDone,
            href: "/profile/settings?tab=notifications",
            required: false
          },
          {
            id: "student-verification",
            label: "学生証認証の登録",
            completed: verificationDone,
            href: "/verification/student-id",
            required: true
          },
          {
            id: "stripe-connect",
            label: "Stripe口座登録の完了",
            completed: stripeDone,
            href: "/profile/payouts",
            required: true
          }
        ]);
      } catch (error) {
        console.error("[OnboardingChecklist] failed to load checklist", error);
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (loading || hideByCompletedFlag || !completedStorageKey) return;
    const requiredItems = items.filter((item) => item.required !== false);
    if (requiredItems.length === 0) return;
    const allRequiredCompleted = requiredItems.every((item) => item.completed);
    if (!allRequiredCompleted) return;

    setHideByCompletedFlag(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(completedStorageKey, "1");
    }
  }, [loading, hideByCompletedFlag, completedStorageKey, items]);

  const recalculateBounds = useCallback(
    (basePosition?: DragPosition) => {
      if (typeof window === "undefined" || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const width = rect.width || Math.min(CARD_WIDTH, window.innerWidth - WINDOW_MARGIN * 2);
      const height = rect.height || DEFAULT_CARD_HEIGHT;

      const nextBounds: DragBounds = {
        left: WINDOW_MARGIN,
        top: WINDOW_MARGIN,
        right: Math.max(WINDOW_MARGIN, window.innerWidth - width - WINDOW_MARGIN),
        bottom: Math.max(WINDOW_MARGIN, window.innerHeight - height - WINDOW_MARGIN)
      };

      setDragBounds(nextBounds);
      setPosition((prev) => {
        const source = basePosition ?? prev;
        if (!source) return source;

        const clamped = {
          x: clamp(source.x, nextBounds.left, nextBounds.right),
          y: clamp(source.y, nextBounds.top, nextBounds.bottom)
        };
        return clamped.x === source.x && clamped.y === source.y ? source : clamped;
      });
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let nextPosition = getFallbackPosition();
    let nextMinimized = false;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedChecklistState>;
        if (typeof parsed.x === "number" && Number.isFinite(parsed.x)) nextPosition.x = parsed.x;
        if (typeof parsed.y === "number" && Number.isFinite(parsed.y)) nextPosition.y = parsed.y;
        if (typeof parsed.isMinimized === "boolean") nextMinimized = parsed.isMinimized;
      }
    } catch {
      // Ignore malformed persisted state and continue with defaults.
    }

    setIsMinimized(nextMinimized);
    setPosition(nextPosition);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !position) return;
    x.set(position.x);
    y.set(position.y);
  }, [hydrated, position, x, y]);

  useEffect(() => {
    if (!hydrated || !position) return;
    recalculateBounds(position);
  }, [hydrated, position, isMinimized, loading, items.length, recalculateBounds]);

  useEffect(() => {
    if (!hydrated) return;

    const handleResize = () => {
      recalculateBounds();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [hydrated, recalculateBounds]);

  useEffect(() => {
    if (!hydrated || !position || typeof window === "undefined") return;
    const payload: PersistedChecklistState = {
      x: position.x,
      y: position.y,
      isMinimized
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, isMinimized, position]);

  if (hiddenOn || role === "admin" || role === null) return null;
  if (hideByCompletedFlag) return null;
  if (!hydrated || !position) return null;

  const requiredItems = items.filter((item) => item.required !== false);
  const allRequiredCompleted = !loading && requiredItems.length > 0 && requiredItems.every((item) => item.completed);
  if (allRequiredCompleted) return null;

  const doneCount = items.filter((item) => item.completed).length;

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={dragBounds}
      onDragEnd={() => {
        setPosition({ x: x.get(), y: y.get() });
      }}
      style={{ x, y }}
      className="fixed left-0 top-0 z-[60]"
    >
      <div
        ref={cardRef}
        className="w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[#D1D5DB] bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur"
      >
        <div className={`flex items-start justify-between gap-3 px-4 py-3 ${isMinimized ? "" : "border-b border-[#E5E7EB]"}`}>
          <div
            className="min-w-0 flex-1 cursor-move select-none"
            onPointerDown={(event) => {
              dragControls.start(event);
            }}
          >
            <p className="text-sm font-bold text-[#111827]">チェックリスト</p>
            <p className="text-xs text-[#6B7280]">
              {loading ? "判定中..." : `${doneCount}/${items.length} 完了`}
            </p>
          </div>
          <button
            type="button"
            aria-label={isMinimized ? "チェックリストを展開" : "チェックリストを最小化"}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={() => {
              setIsMinimized((prev) => !prev);
            }}
            className="rounded-md border border-[#D1D5DB] px-2 py-0.5 text-sm font-semibold text-[#4B5563] transition hover:bg-[#F3F4F6]"
          >
            {isMinimized ? "+" : "-"}
          </button>
        </div>

        {!isMinimized && (
          <div className="divide-y divide-[#F3F4F6]">
            {items.map((item) => {
              const disabled = item.completed || loading;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => router.push(item.href)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                    disabled ? "cursor-default" : "hover:bg-[#F9FAFB]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    readOnly
                    className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] text-[#10B981] focus:ring-[#10B981]"
                  />
                  <span className={`text-sm ${item.completed ? "text-[#6B7280]" : "font-medium text-[#111827]"}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
