import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { admin2faCookieName } from "../../lib/auth/admin2faCookie";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(admin2faCookieName())?.value;

  // 管理者2FA通過済みCookieがないアクセスは、存在自体を隠す
  if (!adminCookie) {
    notFound();
  }

  return <>{children}</>;
}

