"use client";

import { useEffect } from "react";

export default function ProfilePublicationsRedirect() {
  useEffect(() => {
    window.location.replace("/profile/settings");
  }, []);

  return <div className="grid min-h-[40vh] place-items-center text-sm text-slate-500">移動中...</div>;
}
