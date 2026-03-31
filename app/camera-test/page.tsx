"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export default function CameraTestPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [microphoneGranted, setMicrophoneGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = cameraStream;
      if (videoRef.current) {
        videoRef.current.srcObject = cameraStream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraGranted(true);

      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        micStream.getTracks().forEach((track) => track.stop());
        setMicrophoneGranted(true);
        setMessage("カメラとマイクの両方が許可されました。通話ページに戻って確認してください。");
      } catch (micError) {
        setMicrophoneGranted(false);
        setError(micError instanceof Error ? `カメラは許可済みですが、マイクが拒否されています。(${micError.message})` : "カメラは許可済みですが、マイクが拒否されています。");
      }
    } catch (cameraError) {
      setCameraGranted(false);
      setMicrophoneGranted(false);
      setError(cameraError instanceof Error ? `カメラが拒否されています。(${cameraError.message})` : "カメラが拒否されています。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-[calc(100dvh-81px)] w-screen bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <h1 className="text-3xl font-bold text-[#111827]">カメラ・マイク最小テスト</h1>
          <p className="mt-2 text-sm text-[#6B7280]">このページは ユニブリ ドメイン上でブラウザの権限ダイアログが出るかを確認する専用ページです。</p>

          {error ? <p className="mt-6 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p> : null}
          {message ? <p className="mt-6 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#047857]">{message}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runTest}
              disabled={loading}
              className="rounded-lg bg-[#10B981] px-5 py-3 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-60"
            >
              {loading ? "確認中..." : cameraGranted && !microphoneGranted ? "マイクを再確認" : "カメラ・マイクを許可"}
            </button>
            <Link href="/call/test" className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]">
              通話ページに戻る
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className={`rounded-full px-3 py-2 ${cameraGranted ? "bg-[#ECFDF5] text-[#047857]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>カメラ: {cameraGranted ? "許可済み" : "未許可"}</span>
            <span className={`rounded-full px-3 py-2 ${microphoneGranted ? "bg-[#ECFDF5] text-[#047857]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>マイク: {microphoneGranted ? "許可済み" : "未許可"}</span>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}
