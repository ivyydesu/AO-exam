"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

function normalizeVideoUrl(value: string) {
  if (value.includes("youtube.com/watch?v=")) {
    const url = new URL(value);
    const videoId = url.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
  }
  if (value.includes("youtu.be/")) {
    const videoId = value.split("youtu.be/")[1]?.split("?")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
  }
  return value;
}

export default function OnboardingVideoPopup() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const hiddenOn = useMemo(
    () => !(pathname?.startsWith("/demo") || pathname?.startsWith("/home")),
    [pathname]
  );

  const configuredUrl = process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_URL?.trim() ?? "";
  const videoUrl = configuredUrl ? normalizeVideoUrl(configuredUrl) : "";
  const isEmbed = videoUrl.includes("youtube.com/embed/") || videoUrl.includes("player.vimeo.com/");

  if (hiddenOn) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60]">
      <div className="pointer-events-auto w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[#D1D5DB] bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <div>
            <p className="text-sm font-bold text-[#111827]">オンボーディング動画</p>
            <p className="text-xs text-[#6B7280]">動画を見ながらそのままサイト操作できます。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]"
            >
              {collapsed ? "開く" : "最小化"}
            </button>
          </div>
        </div>

        {!collapsed ? (
          videoUrl ? (
            isEmbed ? (
              <iframe
                src={videoUrl}
                title="ユニブリ onboarding"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="aspect-video w-full bg-black"
              />
            ) : (
              <video src={videoUrl} controls playsInline className="aspect-video w-full bg-black" />
            )
          ) : (
            <div className="space-y-2 px-4 py-4 text-sm text-[#4B5563]">
              <p>まだ動画URLは未設定です。</p>
              <p className="text-xs text-[#6B7280]">`NEXT_PUBLIC_ONBOARDING_VIDEO_URL` を設定すると、ここにオンボーディング動画を固定表示できます。</p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
