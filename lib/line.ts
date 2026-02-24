const LINE_AUTH_BASE = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

export function buildLineLoginUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requiredEnv("LINE_LOGIN_CHANNEL_ID"),
    redirect_uri: requiredEnv("LINE_LOGIN_REDIRECT_URI"),
    state,
    scope: "profile openid"
  });
  return `${LINE_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeLineCodeForProfile(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: requiredEnv("LINE_LOGIN_REDIRECT_URI"),
    client_id: requiredEnv("LINE_LOGIN_CHANNEL_ID"),
    client_secret: requiredEnv("LINE_LOGIN_CHANNEL_SECRET")
  });

  const tokenRes = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`LINE token exchange failed: ${text}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token as string | undefined;
  if (!accessToken) throw new Error("LINE access token is missing");

  const profileRes = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!profileRes.ok) {
    const text = await profileRes.text();
    throw new Error(`LINE profile fetch failed: ${text}`);
  }

  const profile = await profileRes.json();
  return {
    lineUserId: profile.userId as string,
    displayName: profile.displayName as string
  };
}

export async function sendLinePushMessage(lineUserId: string, text: string) {
  const token = requiredEnv("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN");
  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text }]
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE push failed: ${body}`);
  }
}
