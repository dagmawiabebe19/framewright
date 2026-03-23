import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json()) as {
    helpful?: boolean;
    showId?: string;
  };

  if (body.showId) {
    const { data: show } = await supabase
      .from("shows")
      .select("org_id")
      .eq("id", body.showId)
      .maybeSingle();
    if (show?.org_id) {
      await supabase.from("activity_log").insert({
        org_id: show.org_id,
        show_id: body.showId,
        user_id: user.id,
        action: "ai_feedback",
        entity_type: "ai_assistant",
        metadata: { helpful: body.helpful === true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
