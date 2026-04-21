# ユニブリ リリース前チェックリスト（Security / RLS / 監査ログ）

## 1. 環境変数
- [ ] `NEXT_PUBLIC_SUPABASE_URL` が Production 用
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` が Production 用
- [ ] `SUPABASE_SERVICE_ROLE_KEY` が漏洩していない（Vercel のみ）
- [ ] `STRIPE_SECRET_KEY` が本番鍵 (`sk_live_...`)
- [ ] `NEXT_PUBLIC_APP_URL` が本番ドメイン
- [ ] LINE Developers の Login channel に `https://<本番ドメイン>/api/line/connect/callback` を Callback URL として登録
- [ ] `PLATFORM_FEE_PERCENT` を運用値で固定
- [ ] 通話系: `VIDEO_CALLS_ENABLED`, `NEXT_PUBLIC_VIDEO_CALLS_ENABLED`, `DAILY_API_KEY`, `NEXT_PUBLIC_DAILY_DOMAIN`
- [ ] `INTERNAL_API_SECRET` を設定（内部API保護）

## 2. 認証・認可
- [ ] 未ログイン時に保護ページが `/auth/login` へ遷移
- [ ] 管理APIは admin ロール以外 403
- [ ] 大学生/高校生ロール別の導線・禁止操作が機能
- [ ] 大学生→大学生依頼は禁止（UI非表示 + API側でも拒否）
- [ ] 2FA 有効化/検証/無効化 API が動作
- [ ] パスワード再設定メール導線が動作

## 3. Supabase RLS
- [ ] `profiles`, `requests`, `messages`, `reviews`, `tutor_profiles`, `tutor_verifications`, `request_details` で RLS 有効
- [ ] `messages` は当事者のみ `select/insert` できる
- [ ] `requests` は当事者以外更新不可
- [ ] `tutor_verifications` 更新は admin のみ
- [ ] `line_link_states` は service role 専用
- [ ] ストレージ `student-ids` は private, `avatars` は public 設計どおり

## 4. 決済（Stripe Auth/Capture）
- [ ] `accepted` → 与信開始（Checkout）
- [ ] 与信後 `escrow_pending/escrowed` へ遷移
- [ ] Capture API で売上確定できる
- [ ] Cancel API で与信解放できる
- [ ] 本番は tutor `stripe_account_id` 未設定時ブロック
- [ ] Webhook 署名検証ON
- [ ] 失敗時に重複課金しない（idempotency / statusチェック）

## 5. チャット
- [ ] 1対1の当事者のみ閲覧可能
- [ ] メッセージ送受信（テキスト）
- [ ] ファイル送信（20MB制限）
- [ ] 添付表示（画像サムネ・PDF/ファイル）
- [ ] 添付URLは期限付きURL（署名付き）
- [ ] XSS対策（HTML埋め込みをレンダリングしない）
- [ ] 送信/取得エラー時にUIで復旧可能

## 6. 通話
- [ ] 参加前チェック（カメラ・マイク）
- [ ] 当事者のみルームトークン発行
- [ ] 通話終了で退室処理・ログ記録
- [ ] Daily障害時は「通話機能は現在利用できません」を表示
- [ ] ルームURLの外部漏洩対策（署名トークン短命）

## 7. 通報・運営
- [ ] 通報ボタン（ユーザー/通話）から送信できる
- [ ] 管理画面で通報一覧・詳細・対応ステータス更新可能
- [ ] 通報テーブルに `reporter_id`, `target_id`, `reason`, `created_at`, `status` が保存

## 8. 監査ログ
- [ ] 最低イベントを保存: `login`, `role_change`, `request_created`, `request_decision`, `payment_authorized`, `payment_captured`, `payment_canceled`, `message_sent`, `call_started`, `call_ended`, `report_created`
- [ ] 監査ログに `actor_id`, `resource_id`, `ip`, `user_agent`, `created_at` を保存
- [ ] 管理者以外は監査ログ閲覧不可
- [ ] 保持期間（例: 180日）を定義

## 9. レート制限・悪用対策
- [ ] ログイン/登録/OTP/メール送信にレート制限
- [ ] 連続失敗で一時ロック
- [ ] APIごとに基本レート制限（IP + user）
- [ ] CSRF/Originチェック（POST系）

## 10. 品質ゲート
- [ ] `npm run build` 成功
- [ ] `npx tsc --noEmit` 成功
- [ ] 主要ページ手動テスト: `/demo`, `/search`, `/service/[id]`, `/requests/new`, `/demo/request`, `/chat`, `/call/[id]`, `/profile/settings`
- [ ] Chrome/Safari で通話・決済・チャット確認

## 11. 運用準備
- [ ] エラー監視（Vercel logs + Supabase logs + Stripe dashboard）
- [ ] 障害時の切替手順（通話OFFフラグ）
- [ ] バックアップ手順（DB）
- [ ] 問い合わせ窓口情報（利用規約/プライバシーポリシー）記載完了
