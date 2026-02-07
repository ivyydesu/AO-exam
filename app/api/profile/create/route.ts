import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  const { id, full_name, role, school } = await req.json();

  if (!id || !full_name || !role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("profiles").insert({
    id,
    full_name,
    role,
    school
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
