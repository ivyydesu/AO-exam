"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RequestsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/status");
  }, [router]);

  return null;
}
