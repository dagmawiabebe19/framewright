import { dailiesStatusEmailHtml } from "@/lib/email/templates/dailies-status";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
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
    to?: string[];
    subject?: string;
    body?: string;
    showId?: string;
    episodeId?: string;
    showName?: string;
  };

  const to = (body.to ?? []).map((e) => e.trim()).filter(Boolean);
  if (!to.length || !body.subject || !body.body) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY not configured" },
      { status: 503 }
    );
  }

  const resend = new Resend(key);
  const html = dailiesStatusEmailHtml({
    showName: body.showName ?? "Show",
    bodyText: body.body,
  });

  const { error } = await resend.emails.send({
    from:
      process.env.RESEND_FROM ||
      "FRAMEWRIGHT <onboarding@resend.dev>",
    to,
    subject: body.subject,
    html,
    text: body.body,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

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
        episode_id: body.episodeId ?? null,
        user_id: user.id,
        action: "dailies_email_sent",
        entity_type: "email",
        metadata: { recipients: to.join(", "), count: to.length },
      });
    }
  }

  return NextResponse.json({ ok: true, sent: to.length });
}
