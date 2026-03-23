import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json()) as {
    shotId?: string;
    vendorEmail?: string;
    vendorName?: string;
  };

  if (!body.shotId || !body.vendorEmail) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "Email not configured" }, { status: 503 });
  }

  const { data: shot } = await supabase
    .from("vfx_shots")
    .select("shot_id, description, tc_in, tc_out")
    .eq("id", body.shotId)
    .maybeSingle();

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "FRAMEWRIGHT <onboarding@resend.dev>",
    to: body.vendorEmail,
    subject: `VFX assignment: ${shot?.shot_id ?? "shot"}`,
    text: [
      `Hi ${body.vendorName ?? "team"},`,
      "",
      `Shot: ${shot?.shot_id ?? ""}`,
      `Record TC: ${shot?.tc_in ?? ""} — ${shot?.tc_out ?? ""}`,
      shot?.description ? `Notes: ${shot.description}` : "",
      "",
      "— FRAMEWRIGHT",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: true });
}
