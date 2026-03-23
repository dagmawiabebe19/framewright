import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    to?: string;
    orgName?: string;
    inviteToken?: string;
    role?: string;
  };

  const to = body.to?.trim();
  if (!to || !body.orgName || !body.inviteToken) {
    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const link = `${site}/auth?invite=${encodeURIComponent(body.inviteToken)}`;

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from:
      process.env.RESEND_FROM ||
      "FRAMEWRIGHT <onboarding@resend.dev>",
    to,
    subject: `You are invited to ${body.orgName} on FRAMEWRIGHT`,
    text: [
      `${body.orgName} invited you to collaborate on FRAMEWRIGHT.`,
      body.role ? `Role: ${body.role}` : "",
      "",
      `Open this link on the same email address to accept:`,
      link,
      "",
      "Post production, finally coordinated.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
