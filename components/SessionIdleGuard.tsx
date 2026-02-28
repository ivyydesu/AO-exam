"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabase/client";

const IDLE_MS = 15 * 60 * 1000;

export default function SessionIdleGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/auth/")) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const startTimer = () => {
      clearTimer();
      timerRef.current = window.setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        await supabase.auth.signOut();
        router.replace("/auth/login?expired=1");
      }, IDLE_MS);
    };

    const onActivity = () => {
      startTimer();
    };

    startTimer();
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart"
    ];
    events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      clearTimer();
    };
  }, [pathname, router]);

  return null;
}

