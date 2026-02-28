import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // NOTE:
  // Supabase browser auth in this app is localStorage-based.
  // Server middleware cannot reliably read that session, so
  // redirecting here causes false logouts. Route-level guards
  // are handled client-side/API-side.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)"]
};
