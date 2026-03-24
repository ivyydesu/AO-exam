"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase/client";
import { isAllowedAdminEmail } from "../../lib/auth/adminAllowlist";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          router.replace("/auth/login");
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          router.replace("/auth/login");
          return;
        }
        if (!isAllowedAdminEmail(session.user.email)) {
          router.replace("/home");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile || profile.role !== "admin") {
          router.replace("/home");
          return;
        }

        const statusRes = await fetch("/api/auth/admin-2fa/status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const status = await statusRes.json().catch(() => ({ passed: false }));
        if (!statusRes.ok || !status.passed) {
          const email = session.user.email ?? "";
          const returnTo = pathname || "/admin";
          router.replace(`/auth/2fa?mode=admin&email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        setReady(true);
      } catch {
        router.replace("/auth/login");
      }
    };

    void check();
  }, [pathname, router]);

  if (!ready) {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">管理画面を確認中...</div>;
  }

  return <>{children}</>;
}
