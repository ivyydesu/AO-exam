import { randomBytes } from "crypto";

type DailyRoomResponse = {
  id: string;
  name: string;
  url: string;
  privacy?: string;
  config?: Record<string, unknown>;
};

type DailyTokenResponse = {
  token: string;
};

function getDailyApiKey() {
  const key = process.env.DAILY_API_KEY?.trim();
  if (!key) throw new Error("DAILY_API_KEY is missing");
  return key;
}

export function getDailyDomain() {
  const domain = process.env.NEXT_PUBLIC_DAILY_DOMAIN?.trim();
  if (!domain) throw new Error("NEXT_PUBLIC_DAILY_DOMAIN is missing");
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function dailyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.daily.co/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getDailyApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Daily API error (${res.status}): ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export function generateDailyRoomName(requestId: string) {
  return `ao-match-${requestId}-${randomBytes(4).toString("hex")}`.replace(/[^a-zA-Z0-9-_]/g, "-");
}

export async function ensureDailyRoom(roomName: string) {
  try {
    return await dailyFetch<DailyRoomResponse>(`/rooms/${roomName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("404")) throw error;
  }

  return await dailyFetch<DailyRoomResponse>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
        enable_chat: false,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false
      }
    })
  });
}

export async function createDailyMeetingToken(options: {
  roomName: string;
  userName: string;
  userId: string;
  isOwner: boolean;
}) {
  const payload = {
    properties: {
      room_name: options.roomName,
      user_name: options.userName,
      is_owner: options.isOwner,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
      start_video_off: false,
      start_audio_off: false,
      enable_recording: options.isOwner ? "cloud" : false
    }
  };

  return await dailyFetch<DailyTokenResponse>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function buildDailyRoomUrl(roomName: string) {
  return `https://${getDailyDomain()}/${roomName}`;
}
