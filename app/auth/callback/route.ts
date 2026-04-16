import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function getBaseUrl(req: NextRequest) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/home";
  const baseUrl = getBaseUrl(req);

  try {
    if (!code) {
      return NextResponse.redirect(`${baseUrl}/?error=missing_code`);
    }

    const response = NextResponse.redirect(`${baseUrl}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(
            name: string,
            value: string,
            options: {
              path?: string;
              domain?: string;
              maxAge?: number;
              expires?: Date;
              sameSite?: "lax" | "strict" | "none";
              secure?: boolean;
              httpOnly?: boolean;
            }
          ) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: { path?: string; domain?: string }) {
            response.cookies.set({ name, value: "", ...options, maxAge: 0 });
          }
        }
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(`${baseUrl}/?error=auth_callback_failed`);
    }

    return response;
  } catch {
    return NextResponse.redirect(`${baseUrl}/?error=auth_callback_failed`);
  }
}
