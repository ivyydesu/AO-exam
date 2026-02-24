import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const mode = req.cookies.get("app_mode")?.value === "test" ? "test" : "production";
  return NextResponse.json({ ok: true, mode });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body?.mode === "test" ? "test" : "production";
    const res = NextResponse.json({ ok: true, mode });
    res.cookies.set("app_mode", mode, {
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return res;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}

