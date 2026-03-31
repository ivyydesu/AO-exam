import { NextRequest, NextResponse } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../lib/auth/requireStrictAdmin";

function isModeSwitchAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_MODE === "true";
}

export async function GET(req: NextRequest) {
  if (!isModeSwitchAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await requireStrictAdminFromBearer(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mode = req.cookies.get("app_mode")?.value === "test" ? "test" : "production";
  return NextResponse.json({ ok: true, mode });
}

export async function POST(req: NextRequest) {
  if (!isModeSwitchAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await requireStrictAdminFromBearer(req);
    const body = await req.json();
    const mode = body?.mode === "test" ? "test" : "production";
    const res = NextResponse.json({ ok: true, mode });
    res.cookies.set("app_mode", mode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return res;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
