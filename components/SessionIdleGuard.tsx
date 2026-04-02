"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabase/client";

const HIDDEN_IDLE_MS = 30 * 60 * 1000;

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
        router.replace("/auth/login?autoLoggedOut=1");
      }, HIDDEN_IDLE_MS);
    };

    const onVisibility = () => {
      if (document.hidden) {
        startTimer();
      } else {
        clearTimer();
      }
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimer();
    };
  }, [pathname, router]);

  return null;
}
