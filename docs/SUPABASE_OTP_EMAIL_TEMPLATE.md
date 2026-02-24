# Supabase OTP Email Template

Supabase Dashboard:
`Authentication -> Email Templates -> Magic Link`

Use the templates below (copy/paste).

## Subject

```txt
【AO Match】ログイン認証コードのお知らせ
```

## HTML

```html
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; background:#f6f8fb; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e6ebf2;">
    <div style="background:linear-gradient(180deg,#0E4FA8 0%,#1C82F2 100%); color:#fff; padding:20px 24px;">
      <div style="font-size:14px; opacity:.9;">Welcome to</div>
      <div style="font-size:30px; font-weight:700; margin-top:6px;">AO Match</div>
      <div style="font-size:14px; margin-top:8px; opacity:.95;">ログイン認証コードをお送りします。</div>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 10px; font-size:14px; color:#334155;">以下の認証コードをログイン画面に貼り付けてください。</p>
      <div style="font-size:30px; letter-spacing:4px; font-weight:700; color:#0E4FA8; background:#f1f7ff; border:1px solid #d7e8ff; border-radius:10px; padding:14px 18px; text-align:center;">
        {{ .Token }}
      </div>
      <p style="margin:14px 0 0; font-size:12px; color:#64748b;">
        有効期限は短時間です。心当たりがない場合はこのメールを破棄してください。
      </p>
      <div style="margin-top:16px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:#18b390; color:#fff; text-decoration:none; border-radius:999px; padding:10px 18px; font-size:14px;">
          メールリンクでログイン
        </a>
      </div>
    </div>
  </div>
</div>
```

## Plain Text

```txt
AO Match ログイン認証コード: {{ .Token }}
コードをログイン画面に貼り付けてください。
または次のリンクからログインできます: {{ .ConfirmationURL }}
```
