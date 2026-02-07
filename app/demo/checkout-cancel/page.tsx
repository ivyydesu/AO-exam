"use client";

import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="card p-8 grid gap-4">
      <h1 className="text-2xl font-semibold text-sea">決済がキャンセルされました</h1>
      <p className="text-sea/80">もう一度支払いを試す場合はデモ画面に戻ってください。</p>
      <Link className="btn btn-secondary" href="/demo">デモ画面へ戻る</Link>
    </div>
  );
}
