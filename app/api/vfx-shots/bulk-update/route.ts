import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json()) as {
    shotIds?: string[];
    updates?: { status?: string; vendor?: string | null; priority?: string | null };
  };

  const shotIds = body.shotIds ?? [];
  const updates = body.updates ?? {};
  if (!shotIds.length) {
    return NextResponse.json({ ok: false, error: "No shots" }, { status: 400 });
  }

  const { error } = await supabase.from("vfx_shots").update(updates).in("id", shotIds);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: shotIds.length });
}
