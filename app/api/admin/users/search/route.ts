import { NextRequest, NextResponse } from "next/server";
import { requireStrictAdminFromBearer } from "../../../../../lib/auth/requireStrictAdmin";

type SearchUserRow = {
  id: string;
  full_name: string;
  role: "student" | "tutor" | "admin";
};

export async function GET(req: NextRequest) {
  try {
    const { supabaseAdmin } = await requireStrictAdminFromBearer(req);
    const keyword = (req.nextUrl.searchParams.get("q") ?? "").trim();

    if (!keyword) {
      return NextResponse.json({ items: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role")
      .ilike("full_name", `%${keyword}%`)
      .limit(20)
      .order("full_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: (data ?? []) as SearchUserRow[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Admin") ? 403 : 401 }
    );
  }
}
