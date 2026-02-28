"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../../lib/supabase/client";

export default function SettingsPage() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [lineConnected, setLineConnected] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lineDetail, setLineDetail] = useState<string | null>(null);
  const [lineTesting, setLineTesting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("line_user_id")
        .eq("id", sessionData.session.user.id)
        .single();
      if (profile?.line_user_id) setLineConnected(true);
      const lineStatus = new URLSearchParams(window.location.search).get("line");
      if (lineStatus === "connected") {
        setNotice("LINE連携が完了しました。");
        setLineDetail(null);
      }
      if (lineStatus?.startsWith("error")) {
        const detailMap: Record<string, string> = {
          error_missing_params: "callbackに code/state がありません。LINE側の遷移不整合です。",
          error_invalid_state: "state不一致です。古いタブを閉じて、連携を最初からやり直してください。",
          error_state_expired: "stateの有効期限(10分)が切れました。再度連携してください。",
          error_exchange_failed: "LINEのcode交換に失敗しました。CHANNEL_ID/SECRET/REDIRECT_URIを再確認してください。",
          error_save_failed: "DB保存に失敗しました。line_user_id重複の可能性があります。"
        };
        setError("LINE連携に失敗しました。");
        setLineDetail(`${lineStatus}: ${detailMap[lineStatus] ?? "不明なエラーです。サーバーログを確認してください。"}`);
      }
    };
    load();
  }, []);

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatar(url);
  };

  const connectLine = async () => {
    setError(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Supabaseが初期化されていません");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("ログインが必要です");
        return;
      }
      const res = await fetch("/api/line/connect/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });
      const payload = await res.json();
      if (!res.ok || !payload.authUrl) {
        setError(payload.error ?? "LINE連携の開始に失敗しました");
        return;
      }
      window.location.href = payload.authUrl;
    } catch (e) {
      setError("Failed to fetch: サーバー未起動 or ネットワークエラーです");
    }
  };

  const sendLineTest = async () => {
    setError(null);
    setNotice(null);
    setLineTesting(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Supabaseが初期化されていません");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("ログインが必要です");
        return;
      }
      const res = await fetch("/api/line/notify/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "LINEテスト通知の送信に失敗しました");
        return;
      }
      setNotice("LINEにテスト通知を送信しました。");
    } catch {
      setError("Failed to fetch: サーバー未起動 or ネットワークエラーです");
    } finally {
      setLineTesting(false);
    }
  };

  return (
    <div className="grid gap-8">

      <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="card p-6 text-sm text-sea/70">
          <div className="flex flex-col items-center gap-3">
            <div className="h-20 w-20 rounded-full bg-sand/70" />
            <p className="text-base font-semibold text-ink">kota0507</p>
            <button className="text-xs text-accent">プロフィール編集</button>
            <button className="text-xs text-accent">スケジュール編集</button>
          </div>
          <div className="mt-6 grid gap-2">
            {[
              "購入者ダッシュボード",
              "購入取引（トークルーム）/ 見積り",
              "募集管理",
              "購入ブログ",
              "お気に入り",
              "ポイント / クーポン"
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-cloud">
                <span>{item}</span>
                <span>›</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="card p-6 grid gap-6">
          <h1 className="text-2xl font-semibold text-ink">設定</h1>
          {notice && <p className="text-sm text-sea">{notice}</p>}
          {error && <p className="text-sm text-accent">{error}</p>}
          {lineDetail && (
            <p className="rounded-lg border border-sand bg-cloud px-3 py-2 text-xs text-sea/85">
              LINE詳細: {lineDetail}
            </p>
          )}

          <div className="grid gap-4">
            <h2 className="text-lg font-semibold text-sea">アカウント情報</h2>
            <div className="grid gap-3 text-sm text-sea/70">
              {[
                { label: "ユーザー情報", action: "変更する" },
                { label: "ユーザーID", value: "5694087" },
                { label: "メールアドレス", action: "変更する" },
                { label: "電話番号", action: "登録する" },
                { label: "クレジットカード", action: "変更する" },
                { label: "言語設定", action: "変更する" }
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-sand pb-2">
                  <span>{row.label}</span>
                  <span className="text-accent">{row.action ?? row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <h2 className="text-lg font-semibold text-sea">アイコン設定</h2>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-sand/70 overflow-hidden">
                {avatar && <img src={avatar} alt="avatar" className="h-full w-full object-cover" />}
              </div>
              <label className="btn btn-secondary cursor-pointer">
                画像をアップロード
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              </label>
            </div>
          </div>

          <div className="grid gap-4">
            <h2 className="text-lg font-semibold text-sea">発注者設定</h2>
            <div className="grid gap-3 text-sm text-sea/70">
              {[
                { label: "興味のあるカテゴリ", action: "変更する" },
                { label: "法人機能利用", action: "登録する" },
                { label: "請求書払い/源泉徴収", action: "申請する" }
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-sand pb-2">
                  <span>{row.label}</span>
                  <span className="text-accent">{row.action}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <h2 className="text-lg font-semibold text-sea">LINE連携（通知用）</h2>
            <p className="text-sm text-sea/70">
              大学生: 依頼通知 / 高校生: 許可通知 を受け取れます。
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-sea/80">状態: {lineConnected ? "連携済み" : "未連携"}</span>
              {!lineConnected && (
                <button className="btn btn-primary" type="button" onClick={connectLine}>
                  LINEを連携する
                </button>
              )}
              {lineConnected && (
                <button className="btn btn-secondary" type="button" onClick={sendLineTest} disabled={lineTesting}>
                  {lineTesting ? "送信中..." : "テスト通知を送る"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
