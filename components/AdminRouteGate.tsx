"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabase/client";

type Props = {
  children: React.ReactNode;
};

export default function AdminRouteGate({ children }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          if (!mounted) return;
          setBlocked(true);
          return;
        }

        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          if (!mounted) return;
          setBlocked(true);
          return;
        }

        const res = await fetch("/api/auth/admin-2fa/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store"
        });
        const payload = await res.json().catch(() => ({}));

        const isAdmin = Boolean(payload?.ok && payload?.admin);
        const passed = Boolean(payload?.passed);
        if (!mounted) return;

        // 管理者本人だが2FA未完了の場合は404ではなく2FA導線へ。
        if (isAdmin && !passed) {
          router.replace("/auth/2fa?mode=admin&returnTo=/admin");
          return;
        }

        setBlocked(!(isAdmin && passed));
      } catch {
        if (!mounted) return;
        setBlocked(true);
      } finally {
        if (mounted) setReady(true);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (!ready) return null;

  if (blocked) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-6">
        <div className="text-center">
          <p className="text-4xl font-bold text-[#111827]">404</p>
          <p className="mt-2 text-sm text-[#6B7280]">This page could not be found.</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
