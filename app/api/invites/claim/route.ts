import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { token } = (await request.json()) as { token?: string };
  if (!token?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }

  const { data: invite, error: invErr } = await supabase
    .from("invitations")
    .select("id, org_id, email, role, accepted_at")
    .eq("token", token.trim())
    .maybeSingle();

  if (invErr || !invite) {
    return NextResponse.json({ ok: false, error: "Invalid invitation" }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ ok: true, already: true });
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { ok: false, error: "Sign in with the invited email address." },
      { status: 403 }
    );
  }

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  const { error: memErr } = await supabase.from("members").insert({
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role,
  });

  if (memErr) {
    return NextResponse.json({ ok: false, error: memErr.message }, { status: 500 });
  }

  await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  await supabase.from("activity_log").insert({
    org_id: invite.org_id,
    user_id: user.id,
    action: "invitation_accepted",
    entity_type: "invitation",
    entity_id: invite.id,
    metadata: { email: user.email },
  });

  return NextResponse.json({ ok: true });
}
