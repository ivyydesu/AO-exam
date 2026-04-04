import { NextResponse } from "next/server";
import { admin2faCookieName } from "../../../../../lib/auth/admin2faCookie";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(admin2faCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return res;
}
