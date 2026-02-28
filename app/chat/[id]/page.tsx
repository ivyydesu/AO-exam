"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ChatRedirectPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      router.replace(`/chat?requestId=${id}`);
    }
  }, [params, router]);

  return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-500">読み込み中...</div>;
}
